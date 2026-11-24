# Journal — ADR-002 — Applications frontend et routage mutualisé — 2026-11-24

## Objectif

Consigner la décision et l'implémentation de l'isolation des sessions navigateur CUSTOMER et STAFF.

## Statut

Terminé pour la décision D12 et son implémentation locale. Les origines de production, `SameSite` et la vérification manuelle RC1-608 restent ouvertes.

## Résumé des changements

- Ajout de D12 : cookies refresh/CSRF séparés et sélectionnés par `X-KGPay-Portal`; une action dans un portail ne doit pas affecter la session de l'autre.
- Mise à jour des sections de transport et de session pour refléter les cookies réellement utilisés par `customer-portal` et `staff-portal`.
- Conservation des anciens noms de cookies quand l'en-tête est absent, afin de préserver les appels API/collection Postman existants.

## Chemins modifiés

- `docs/architecture/ADR-002-applications-frontend-et-routage-mutualise.md`
- `docs/cdc/CDC-01-identite-acces.md`
- `docs/recipe/RECETTE-01-identite-acces.md`
- `services/auth-service/src/auth/auth.controller.ts`
- `services/auth-service/src/auth/auth.service.ts`
- `services/auth-service/src/main.ts`
- `services/auth-service/test/auth.e2e-spec.ts`
- `apps/customer-portal/src/services/http/createHttpClient.ts`
- `apps/customer-portal/src/services/http/authApi.ts`
- `apps/customer-portal/src/services/sessionManager.ts`
- `apps/customer-portal/src/services/sessionManager.test.ts`
- `apps/customer-portal/src/services/http/createHttpClient.test.ts`
- `apps/staff-portal/src/services/http.ts`

## Exigences et décisions concernées

- ADR-002 D12 : indépendance des cookies et sessions CUSTOMER/STAFF.
- CDC-01 §4.6 et §10 point 10 : parcours et cookies des interfaces navigateur.
- RC1-608 : vérification manuelle des deux portails sur une même origine.

## Validations

- Tests CUSTOMER ciblés : 10 tests réussis ; typecheck et lint réussis.
- Tests STAFF : 10 tests réussis ; typecheck et lint réussis.
- Tests unitaires `auth-service` : 29 tests réussis ; lint et typecheck direct réussis.
- `pnpm test:e2e:auth-service:isolated` : 3 tests réussis dans un schéma temporaire supprimé après exécution.
- `pnpm typecheck:auth-service` a rencontré `EPERM` durant la régénération du client Prisma car le moteur Windows est utilisé par le processus local. Le typecheck direct a passé sans remplacer le moteur.

## Points ouverts et suite attendue

- Le backend et les deux portails ont été relancés ; `/health`, `/login` CUSTOMER et `/login` STAFF répondent HTTP 200. L'utilisateur doit se reconnecter ; les anciens cookies ne restaurent pas les nouvelles sessions.
- Exécuter RC1-608 dans les deux sens, puis reprendre la recette à RC1-102.
- Valider en production les origines, `SameSite`, `Secure`, CSRF/XSS et le routage d'hébergement.

## Mise à jour — états réseau et OTP des portails (24 novembre 2026)

### Objectif et statut

Consigner l'implémentation des états de connectivité et de saisie OTP dans les applications CUSTOMER et STAFF. **Terminé** pour les interfaces ; aucun changement à D12 ni aux contrats d'API.

### Résumé des changements

- Les pages URL inconnue, hors ligne et réseau rétabli sont désormais distinctes dans chaque portail et partagent un layout de statut. Le rechargement après rétablissement est explicite et aucune requête n'est rejouée.
- Les codes à six chiffres utilisent un composant OTP accessible à six cases avec collage, autofill, navigation clavier et erreurs associées.
- Le CDC et la présente décision décrivent les comportements livrés.

### Chemins modifiés

- `apps/customer-portal/src/App.tsx`, `src/components/account/ChangeEmailCard.tsx`, `src/components/account/StepUpPanel.tsx`, `src/components/auth/OtpChallengeView.tsx`, `src/composables/useYupForm.ts`, `src/i18n/locales/en.ts`, `src/i18n/locales/fr.ts`, `src/pages/ConnectionPage.tsx` (supprimé), `src/pages/NotFoundPage.tsx`, `src/pages/ResetPasswordPage.tsx`, `src/styles/components.css` et nouveaux composants/tests sous `src/components/layout`, `src/components/ui` et `src/pages`.
- `apps/staff-portal/src/App.tsx`, `src/composables/useYupForm.ts`, `src/features/admin/components/RecoveryDialog.tsx`, `src/features/admin/components/StepUpDialog.tsx`, `src/i18n/locales/en.ts`, `src/i18n/locales/fr.ts`, `src/pages/ConnectionPage.tsx` (supprimé), `src/pages/NotFoundPage.tsx`, `src/pages/auth/ForgotPasswordPage.tsx`, `src/pages/auth/ForgotPasswordPage.test.tsx`, `src/pages/auth/MfaPage.tsx`, `src/styles/components.css` et nouveaux composants/tests sous `src/components/layout`, `src/components/ui` et `src/pages`.
- `docs/architecture/ADR-002-applications-frontend-et-routage-mutualise.md`, `docs/cdc/CDC-01-identite-acces.md`.

### Validations

- Tests CUSTOMER : 38 réussis ; STAFF : 13 réussis.
- Typecheck et lint des deux portails : réussis.
- Builds des deux portails : réussis ; avertissement Vite existant d'un chunk JS minifié supérieur à 500 kB.
- Simulation navigateur `offline`/`online` vérifiée dans les deux applications. Aucun débordement horizontal constaté sur CUSTOMER aux largeurs 320, 360, 600, 840 et 1120 px, ni sur STAFF à 600 px.

### Points ouverts et suite attendue

- La longueur OTP frontend est six ; conserver `OTP_LENGTH=6` côté backend ou aligner les portails avant tout changement de configuration.
- La recette utilisateur et les autres validations de production listées ci-dessus restent indépendantes de cette livraison.

## Mise à jour — builds centralisés et utilitaires PlanetHoster

### Objectif et statut

Consigner le processus de build centralisé, le dépôt privé d'artefacts par SHA et la migration manuelle via Node/npm sur le sous-domaine `deploy`. **Implémentation locale terminée ; compatibilité réelle de l'hébergement mutualisé à valider.**

### Résumé des changements

- D13 confirme que GitHub Actions construit avec pnpm et dépose les artefacts hors de la racine publique ; les portails statiques ne requièrent pas Node à l'exécution.
- Le dépôt d'artefacts et les migrations sont deux workflows distincts. La migration exige un SHA `main`, une confirmation de sauvegarde et l'environnement GitHub `production`, et n'exécute que `prisma migrate deploy`.
- Le profil de production reste sur l'hôte, hors dépôt et répertoire de déploiement. La sélection est explicite ; aucun `.env.prod` n'est copié vers `.env`.
- Les artefacts n'incluent ni `.env`, ni `node_modules`, ni toutes les dépendances runtime d'`auth-service`; le démarrage/rechargement du service et la publication des portails ne sont pas encore automatisés.

### Chemins modifiés

- `.github/workflows/build-artifacts.yml`, `.github/workflows/migrate-auth-service.yml`
- `deploy-tools/prisma-migrator/`
- `scripts/generate-env.cjs`, `scripts/generate-env.test.cjs`, `scripts/run-prisma.cjs`, `scripts/run-prisma.test.cjs`, `package.json`
- `README.md`, `docs/README.md`, `docs/architecture/ADR-002-applications-frontend-et-routage-mutualise.md`

### Validations

- Tests ciblés des scripts et du migrateur : 16 réussis.
- Installation npm du migrateur et tests ciblés : réussis ; `npm audit --omit=dev` : 0 vulnérabilité.
- `prisma validate` du schéma `auth-service` avec une URL synthétique : réussi.
- Prettier et `git diff --check` : réussis.
- Les workflows distants et le build complet des workspaces n'ont pas été exécutés dans cette session.

### Points ouverts et suite attendue

- Configurer les variables d'URL API, les secrets SSH et empreintes d'hôtes, le répertoire privé, l'environnement Node `deploy` et le chemin du fichier d'environnement de production.
- Vérifier sur PH la version Node, l'accès réseau à npm et PostgreSQL, et la sauvegarde/restauration d'une base de test.
- Déposer un build `dev`, vérifier sa structure, puis exécuter une migration sur une base isolée avant toute action de production.
