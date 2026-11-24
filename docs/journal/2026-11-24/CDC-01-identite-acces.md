# Journal — CDC-01 Identité et accès — 2026-11-24

## Objectif

Contrôler le verrouillage signalé du `GLOBAL_SUPER_ADMIN` et vérifier les transitions d'interface après inscription et réinitialisation du mot de passe.

## Statut

Diagnostic du verrou et correction de redirection terminés. La recette interactive du CDC-01 continue ; l'isolation des sessions CUSTOMER/STAFF est implémentée et validée en tests, sa vérification manuelle reste à faire.

## Résumé des changements

- Vérification PostgreSQL en lecture seule : compte `STAFF` `ACTIVE`, avec un verrou d'identité temporaire; aucune limitation active par IP au moment du contrôle. Configuration runtime observée : 5 échecs avant verrouillage, durée initiale de 900 secondes, plafond de 86 400 secondes.
- Le portail client conduit vers la vérification OTP après inscription puis vers la connexion après vérification réussie.
- Le portail client renvoie déjà vers la connexion après réinitialisation du mot de passe. Le portail STAFF restait sur le formulaire de récupération après succès; il renvoie désormais vers la connexion avec une confirmation.
- Clarification ajoutée à CDC-01 §4.6 et au scénario RC1-113.

## Chemins modifiés

- `apps/staff-portal/src/pages/auth/ForgotPasswordPage.tsx`
- `apps/staff-portal/src/pages/auth/LoginPage.tsx`
- `apps/staff-portal/src/pages/auth/ForgotPasswordPage.test.tsx`
- `docs/cdc/CDC-01-identite-acces.md`
- `docs/recipe/RECETTE-01-identite-acces.md`

## Exigences concernées

- IAM-F-01 : vérification d'adresse e-mail avant activation.
- IAM-F-08 : verrouillage progressif de connexion.
- IAM-F-09 : réinitialisation et révocation des sessions.
- IAM-F-22 : parcours web d'authentification.
- RC1-101, RC1-104, RC1-113 et RC1-117.

## Validations

- Contrôle PostgreSQL en lecture seule du compte super-admin et des limitations IP : compte actif, verrou temporaire présent, aucune IP actuellement verrouillée.
- `pnpm test:staff-portal -- src/pages/auth/ForgotPasswordPage.test.tsx` : réussi (1 test).
- `pnpm typecheck:staff-portal` : réussi.
- `pnpm lint:staff-portal` : réussi, 0 avertissement et 0 erreur après correction d'un import inutilisé.

## Points ouverts et suite attendue

- Attendre la fin du verrou d'identité avant toute nouvelle tentative de connexion; ne pas multiplier les essais, car des échecs supplémentaires peuvent augmenter la durée progressive.
- Le flux backend actuel de réinitialisation ne supprime pas `lockedUntil`; la récupération du mot de passe ne raccourcit donc pas le verrou en cours. Toute modification de cette règle nécessite un arbitrage sécurité.

## Mise à jour — reprise de recette manuelle

- **RC1-201 :** l'utilisateur confirme être connecté en super-admin après mot de passe et OTP.
- **RC1-204 :** réussi. Avec `OPERATIONS_ADMIN`, l'entrée « Administration » est absente, l'accès direct à `/admin` est refusé et `GET /admin/identities` renvoie HTTP 403 via Postman.
- **RC1-101/104 :** l'utilisateur confirme l'inscription CUSTOMER, la vérification OTP reçue via Maildev, puis le retour à `/login`.
- **Suite de recette :** reprendre à RC1-102 (inscription avec une adresse e-mail déjà utilisée), puis poursuivre les scénarios restants.
- **Constat transversal initial :** les deux portails partageaient `kgpay_refresh` et `kgpay_csrf` sur `localhost`; une connexion pouvait remplacer le cookie de l'autre portail. Cette décision a été arbitrée puis corrigée ci-dessous.

## Mise à jour — isolation des sessions (24 novembre 2026)

- **Décision appliquée :** sessions navigateur CUSTOMER et STAFF indépendantes, selon CDC-01 §4.6/§10 point 10 et ADR-002 D12. Le backend sélectionne des cookies refresh/CSRF distincts via `X-KGPay-Portal`, vérifie le type de sujet pour login/MFA/refresh/logout et conserve les noms historiques pour les clients API sans en-tête. Le CORS et OpenAPI déclarent l'en-tête ; chaque portail le transmet et CUSTOMER refuse un sujet STAFF restauré.
- **Test e2e ajouté :** couvre la connexion CUSTOMER sous le mauvais portail, les cookies scoped, le rejet d'un refresh/logout STAFF présenté comme CUSTOMER, la poursuite du refresh STAFF, la déconnexion STAFF sans révocation de CUSTOMER, puis la déconnexion CUSTOMER.
- **Chemins modifiés pour cette mise à jour :** `services/auth-service/src/auth/auth.controller.ts`, `services/auth-service/src/auth/auth.service.ts`, `services/auth-service/src/main.ts`, `services/auth-service/test/auth.e2e-spec.ts`, `apps/customer-portal/src/services/http/createHttpClient.ts`, `apps/customer-portal/src/services/http/authApi.ts`, `apps/customer-portal/src/services/http/createHttpClient.test.ts`, `apps/customer-portal/src/services/sessionManager.ts`, `apps/customer-portal/src/services/sessionManager.test.ts`, `apps/staff-portal/src/services/http.ts`, `docs/cdc/CDC-01-identite-acces.md`, `docs/recipe/RECETTE-01-identite-acces.md`, `docs/architecture/ADR-002-applications-frontend-et-routage-mutualise.md`.
- **Validations :**
  - `pnpm test:customer-portal -- src/services/http/createHttpClient.test.ts src/services/sessionManager.test.ts` : réussi, 10 tests.
  - `pnpm typecheck:customer-portal`, `pnpm lint:customer-portal` : réussis.
  - `pnpm test:staff-portal` : réussi, 10 tests ; `pnpm typecheck:staff-portal`, `pnpm lint:staff-portal` : réussis.
  - `node --experimental-vm-modules .\node_modules\jest\bin\jest.js --runInBand` depuis `services/auth-service` : réussi, 29 tests.
  - `services\auth-service\node_modules\.bin\tsc.cmd --noEmit -p services\auth-service\tsconfig.json` : réussi ; `pnpm lint:auth-service` : réussi.
  - `pnpm test:e2e:auth-service:isolated` : réussi, 3 tests ; le schéma PostgreSQL temporaire a été supprimé par le runner.
  - La commande `pnpm typecheck:auth-service` n'a pas pu régénérer Prisma sous Windows (`EPERM` lors du remplacement du moteur utilisé par le processus local). Le typecheck direct ci-dessus a passé sans régénérer le client ; aucun processus n'a été arrêté.
- **Services relancés :** `pnpm start:auth-service`, `pnpm dev:customer-portal` et `pnpm dev:staff-portal`. `http://localhost:3000/health`, `http://localhost:5173/login` et `http://localhost:5174/login` répondent HTTP 200.
- **Étape prévue après redémarrage :** reconnexion dans les deux portails et vérification de RC1-608, puis reprise à RC1-102 ; les résultats sont consignés ci-dessous.

## Mise à jour — recette manuelle RC1-608 et RC1-102

- **RC1-608 :** l'utilisateur confirme que le scénario d'isolation est bon après reconnexion.
- **RC1-102 :** réussi. Le compte existant et l'adresse neuve reçoivent le même statut HTTP 200 et le même message générique; les durées sont jugées approximativement comparables. Aucun courriel n'est envoyé pour l'adresse déjà utilisée; l'adresse neuve reçoit le courriel de vérification. Les identifiants de défi ne sont pas consignés.
- **RC1-103 :** réussi. Le formulaire refuse le mot de passe trop court sans requête; le mot de passe courant est refusé par le backend avec HTTP 400. Aucun OTP n'est envoyé. Aucun mot de passe ni identifiant de corrélation n'est consigné.
- **RC1-104 :** réussi sur l'identité de test créée à RC1-102; le code a été accepté, l'identité activée et le portail est revenu à `/login`.
- **RC1-105/107 :** réussis. Après mot de passe, le portail affiche le défi OTP et la réponse login ne contient que le défi et son expiration; l'espace client s'ouvre après OTP. Aucun jeton ni code n'est consigné.
- **RC1-106 :** l'utilisateur confirme que le scénario est bon; les statuts HTTP et mesures de durée détaillés n'ont pas été consignés.
- **Pause de recette :** à la demande de l'utilisateur, arrêt après RC1-106 pour passer au CDC-02. La recette CDC-01 reste incomplète; le document contient 74 scénarios au total.
- **Point de reprise CDC-01 :** RC1-108 (cas OTP faux/expiré/rejoué), si la recette est reprise ultérieurement.
- **Observation OTP :** l'utilisateur a attendu 5 minutes avant de saisir le code et l'a trouvé expiré; le code renvoyé a également expiré après une nouvelle attente de 5 minutes. Ces refus sont conformes à la durée configurée. Après rechargement, la page revient à `/register`; une nouvelle soumission pour l'identité encore `PENDING_VERIFICATION` émet un nouveau défi/e-mail plutôt que de créer un second compte.

## Mise à jour — pages d'état et saisie OTP (24 novembre 2026)

### Objectif et statut

Séparer les états introuvable, hors ligne et réseau rétabli dans les deux portails, et remplacer les champs OTP peu lisibles par une saisie à six cases réutilisable. **Terminé** ; aucune modification des contrats backend ou de gestion de session.

### Résumé des changements

- Pages 404, hors ligne et connexion rétablie distinctes, partageant un layout. Le retour réseau propose un rechargement explicite ; aucune requête n'est rejouée. Le texte hors ligne n'implique pas qu'un paiement était en cours.
- Saisie OTP accessible à six cases dans les deux portails, utilisée dans les parcours de vérification, connexion MFA, récupération, changement d'adresse et step-up. Collage, auto-remplissage, navigation clavier, gestion d'erreur et tests ciblés ; le jeton d'invitation reste un champ texte.
- Mise à jour des traductions et des descriptions du CDC/ADR.

### Chemins modifiés

- `apps/customer-portal/src/App.tsx`, `src/components/account/ChangeEmailCard.tsx`, `src/components/account/StepUpPanel.tsx`, `src/components/auth/OtpChallengeView.tsx`, `src/composables/useYupForm.ts`, `src/i18n/locales/en.ts`, `src/i18n/locales/fr.ts`, `src/pages/ConnectionPage.tsx` (supprimé), `src/pages/NotFoundPage.tsx`, `src/pages/ResetPasswordPage.tsx`, `src/styles/components.css`.
- Nouveaux fichiers client : `apps/customer-portal/src/components/layout/StatusPageLayout.tsx`, `src/components/ui/OtpInput.tsx`, `src/components/ui/OtpInput.test.tsx`, `src/components/ui/StatusRosette.tsx`, `src/pages/ConnectionRestoredPage.tsx`, `src/pages/NotFoundPage.test.tsx`, `src/pages/OfflinePage.tsx`.
- `apps/staff-portal/src/App.tsx`, `src/composables/useYupForm.ts`, `src/features/admin/components/RecoveryDialog.tsx`, `src/features/admin/components/StepUpDialog.tsx`, `src/i18n/locales/en.ts`, `src/i18n/locales/fr.ts`, `src/pages/ConnectionPage.tsx` (supprimé), `src/pages/NotFoundPage.tsx`, `src/pages/auth/ForgotPasswordPage.tsx`, `src/pages/auth/ForgotPasswordPage.test.tsx`, `src/pages/auth/MfaPage.tsx`, `src/styles/components.css`.
- Nouveaux fichiers staff : `apps/staff-portal/src/components/layout/StatusPageLayout.tsx`, `src/components/ui/OtpInput.tsx`, `src/components/ui/OtpInput.test.tsx`, `src/components/ui/StatusRosette.tsx`, `src/pages/ConnectionRestoredPage.tsx`, `src/pages/NotFoundPage.test.tsx`, `src/pages/OfflinePage.tsx`.
- `docs/cdc/CDC-01-identite-acces.md`, `docs/architecture/ADR-002-applications-frontend-et-routage-mutualise.md`.

### Exigences concernées

- IAM-F-26 et CDC-01 §8.11 : états web de navigation et de connectivité.
- Parcours OTP du CDC-01 : vérification d'adresse, MFA, récupération, changement d'adresse et step-up.

### Validations

- `pnpm test:customer-portal` : 38 tests réussis (13 fichiers).
- `pnpm test:staff-portal` : 13 tests réussis (8 fichiers).
- `pnpm typecheck:customer-portal`, `pnpm typecheck:staff-portal` : réussis.
- `pnpm lint:customer-portal`, `pnpm lint:staff-portal` : réussis, zéro avertissement/erreur.
- `pnpm build:customer-portal`, `pnpm build:staff-portal` : réussis ; Vite signale toujours un chunk JS minifié supérieur à 500 kB.
- Vérification navigateur par simulation des événements `offline`/`online` sur les deux portails : les vues hors ligne puis rétablie sont distinctes ; aucun texte paiement dans l'écran hors ligne client. Aucun débordement horizontal constaté sur le portail client aux largeurs 320, 360, 600, 840 et 1120 px, ni sur le portail staff à 600 px.

### Points ouverts et suite attendue

- La saisie frontend est fixée à six chiffres tandis que le backend permet `OTP_LENGTH` de 1 à 10 (défaut 6). Garder la configuration à six, ou aligner les deux portails avant de modifier cette valeur.
- La recette manuelle CDC-01 reste à poursuivre à RC1-108 ; l'implémentation des pages ne vaut pas validation utilisateur ni recette complète.
