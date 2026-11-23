# Journal — CDC-01 — 2026-11-23

## Mise en œuvre — `staff-portal` et contrats d'administration

- **Objectif :** couvrir les parcours frontend personnel et d'administration du cœur 1 selon le CDC-01.
- **Statut :** portail implémenté et contrôles ciblés réussis ; recette backend/browser complète et gabarits de courriel restent à faire.
- **Résumé :** création de `apps/staff-portal` (React/Vite) : connexion par mot de passe puis OTP obligatoire, renvoi OTP, acceptation d'invitation, récupération/réinitialisation de mot de passe, gestion des identités STAFF, invitations, rôles, suspension/réactivation/désactivation/déverrouillage, récupération d'e-mail STAFF avec step-up, journal/revue des accès et sessions propres. Les routes admin et preuves step-up viennent de `auth-service`; seuls les appels qui le nécessitent portent le jeton et le proof header. Access token conservé en mémoire, refresh par cookie/CSRF. FR/EN, logos/tokens fournis, états et formulaires responsive.
- **Chemins modifiés :** `apps/staff-portal/**`, `packages/contracts/src/transport.ts`, `package.json`, `pnpm-lock.yaml`, `.env.example`, `README.md`, `docs/README.md`, `docs/REPRISE-CDC-01-FRONTEND.md`, `docs/cdc/CDC-01-identite-acces.md`, `docs/architecture/ADR-002-applications-frontend-et-routage-mutualise.md`, journaux CDC/ADR/BASE.
- **Exigences/sections concernées :** CDC-01 §4.2-4.6, IAM-F-03/04/09-16/19/22-25, §8.10-8.11, §9 et §10.16 ; RP-17 ; ADR-002 D2/D3/D11.
- **Validations réellement exécutées :**
  - `pnpm install --lockfile-only` et `pnpm install --offline --frozen-lockfile` — réussis.
  - `pnpm --filter staff-portal typecheck` — réussi.
  - `pnpm --filter staff-portal lint` — réussi sans avertissement.
  - `pnpm --filter staff-portal test` — réussi, 2 tests.
  - `VITE_AUTH_API_URL__STAFF_PORTAL=http://localhost:3000 pnpm --filter staff-portal build` — réussi ; avertissement du bundle JavaScript à 511,76 kB (limite par défaut 500 kB).
  - Serveur Vite local : `/login` répond HTTP 200 ; aucun débordement horizontal constaté à 320, 360, 600, 840 et 1120 px.
  - `pnpm typecheck:staff-portal` via Turbo — non réussi lors du premier essai, la nouvelle clé `VITE_AUTH_API_URL__STAFF_PORTAL` n'étant pas encore disponible dans le `.env` local et Turbo filtrant la variable injectée ; les scripts du workspace ont ensuite été validés directement avec la configuration publique fournie au processus.
  - Parcours authentifiés contre PostgreSQL/`auth-service`/Maildev, audit complet d'accessibilité et test responsive des pages admin — non exécutés : dépendances backend/recette non démarrées.
- **Limites et points ouverts :** les courriels restent en texte simple. Ne pas finaliser leur HTML/copie ni inventer l'URL de destination avant validation du point ouvert §10.16. Le catalogue actuel ne permet pas de permissions personnalisées non-super-admin ; `GET /admin/identities` n'expose pas `lockedUntil` ; aucune route ne liste les sessions d'une autre identité.
- **Suite attendue :** confirmer la direction graphique, les copies FR/EN et la destination des invitations, puis faire les gabarits; configurer `.env` local/CORS et effectuer la recette de bout en bout et l'audit d'accessibilité.

## Suite — documentation et sessions self-service STAFF

- **Objectif :** corriger l'état documentaire obsolète et garantir l'accès aux sessions propres pour tout membre STAFF, sans exposer l'administration.
- **Statut :** terminé pour le changement ; recette authentifiée non exécutée.
- **Résumé :** `GLOBAL_SUPER_ADMIN` est redirigé vers `/admin`, les autres identités STAFF vers `/my-sessions`. Le garde d'administration redirige également vers cette page et une identité `CUSTOMER` déjà authentifiée voit un refus avec une action de déconnexion, sans boucle de redirection. CDC-01, ADR-002, README et reprise distinguent maintenant administration et sessions self-service.
- **Chemins modifiés :** `apps/staff-portal/src/App.tsx`, `README.md`, `docs/README.md`, `docs/REPRISE-CDC-01-FRONTEND.md`, `docs/cdc/CDC-01-identite-acces.md`, `docs/architecture/ADR-002-applications-frontend-et-routage-mutualise.md` et journaux CDC/ADR/BASE.
- **Exigences/sections concernées :** CDC-01 §4.4, §8.11 ; ADR-002 §12 ; accès aux sessions propres et séparation des droits d'administration.
- **Validations réellement exécutées :**
  - `pnpm --filter staff-portal run typecheck` — réussi.
  - `pnpm --filter staff-portal run lint` — réussi sans avertissement.
  - `pnpm --filter staff-portal run test` — réussi, 2 tests.
  - `pnpm --filter staff-portal run build` — réussi ; avertissement du bundle JavaScript à 515,70 kB (> 500 kB).
  - `pnpm exec prettier --check README.md docs/README.md apps/staff-portal/src/App.tsx docs/cdc/CDC-01-identite-acces.md docs/architecture/ADR-002-applications-frontend-et-routage-mutualise.md` — échec sur les deux documents CDC/ADR ; README, reprise, App et docs README vérifiés séparément lors du contrôle avant journal.
  - `git diff --check` — réussi.
- **Points ouverts :** parcours authentifiés contre `auth-service`/PostgreSQL/Maildev et audit visuel/accessibilité non exécutés ; les courriels restent bloqués par CDC-01 §10.16.
- **Suite attendue :** tester les sessions avec plusieurs rôles STAFF et exécuter la recette de bout en bout après configuration locale ; arbitrer le contenu, l'identité visuelle et l'URL des courriels.

## Suite — gabarits de courriels bilingues

- **Objectif :** produire des courriels d'identité HTML et texte simple pour les parcours OTP CUSTOMER/STAFF et l'invitation STAFF.
- **Statut :** gabarits implémentés en proposition ; copie finale et livraison réelle restent à valider.
- **Résumé :** ajout d'un layout KG Pay original aux couleurs vert/sable/jaune, d'un rendu bilingue par finalité OTP et d'un gabarit d'invitation. Le jeton d'invitation reste présent même sans lien. `STAFF_PORTAL_URL__AUTH_SERVICE` est optionnelle, validée lorsqu'elle est fournie (HTTPS en production), et génère le lien vers `/accept-invitation`; son absence n'empêche pas l'envoi. Le template OTP reste commun aux clients et au personnel et ne contient pas de lien qui abandonnerait le défi en cours.
- **Chemins modifiés :** `services/auth-service/src/email-otp/**`, `services/auth-service/src/config/auth.config.ts`, `services/auth-service/src/config/auth.config.spec.ts`, `services/auth-service/src/auth/auth.service.ts`, `services/auth-service/env.schema.json`, `.env.example`, README racine/service, `docs/README.md`, CDC-01, ADR-002, reprise frontend et journaux.
- **Exigences/sections concernées :** CDC-01 §4.1-4.4, §8.7, §8.9-8.11 et §10.16 ; OTP et invitation STAFF.
- **Validations réellement exécutées :**
  - `pnpm env:build` — réussi.
  - `pnpm --filter auth-service run typecheck` et `pnpm --filter auth-service run lint` — réussis.
  - `pnpm test:auth-service` — réussi, 10 suites et 29 tests.
  - `pnpm --filter auth-service run build` — réussi.
  - `pnpm exec prettier --check` sur les fichiers source, tests, configuration et README ciblés — réussi.
  - `git diff --check` — réussi.
  - Recette SMTP réelle via Maildev et revue finale des copies — non exécutées dans cette reprise.
- **Points ouverts :** confirmer la copie proposée ; définir la valeur de `STAFF_PORTAL_URL__AUTH_SERVICE` au déploiement ; exécuter la recette Maildev et vérifier le rendu sur clients mail.
- **Suite attendue :** faire valider les copies FR/EN, configurer l'URL publique si disponible, puis vérifier les deux formats de chaque message via Maildev.

## Mise à jour — Document de reprise frontend

- **Objectif :** transmettre les travaux restants après la mise en place du portail client.
- **Statut :** terminé pour la transmission ; recette et portail personnel restent à faire.
- **Résumé :** état du socle, validations effectuées et non effectuées, étapes prioritaires, commandes et points ouverts.
- **Chemins modifiés :** `docs/REPRISE-CDC-01-FRONTEND.md`, `docs/journal/2026-11-23/CDC-01-identite-acces.md`.
- **Exigences/sections concernées :** CDC-01 §4.6, IAM-F-22 à IAM-F-25, §8.10 et critères de recette ; ADR-002 D2/D3.
- **Validations :** tests et build non exécutés — transmission documentaire uniquement.
- **Points ouverts :** recette navigateur avec le backend et Maildev, accessibilité, portail personnel et points ouverts du CDC.
- **Suite attendue :** reprendre selon les priorités du document et actualiser l'état documentaire après recette.

## Mise à jour — Frontend client `customer-portal`

- **Objectif :** clôturer côté frontend client le CDC-01 (IAM-F-22, IAM-F-23, IAM-F-24 ; IAM-F-25 non applicable) en consommant l'`auth-service` existant.
- **Statut :** terminé pour l'espace client (branche `feat/cdc-01-frontend-customer-portal`, non committé) ; `staff-portal` non commencé.
- **Résumé :** nouvelle application `apps/customer-portal` (React 19/Vite, React Router, Zustand, react-i18next, Axios, Yup) :
  - parcours : inscription, vérification de contact, connexion + OTP e-mail, mot de passe oublié/réinitialisation, changement de mot de passe, changement d'e-mail et de téléphone avec step-up, liste des sessions, déconnexion et déconnexion globale ;
  - session : access token en mémoire, refresh par cookie HttpOnly avec `GET /auth/csrf` préalable, single-flight du refresh (la rotation révoque la famille en cas de réutilisation) ; changement de mot de passe → toutes les sessions révoquées → retour à la connexion ;
  - erreurs : messages serveur jamais affichés, traduits selon statut et contexte ; réponses uniformes (inscription, mot de passe oublié) respectées ;
  - interface : design « Convergence Silencieuse » (tokens vert/sable/ocre, thème clair/sombre automatique, FR/EN, cibles ≥ 48 px, `prefers-reduced-motion`) ;
  - `@kgpay/contracts` : ajout de `yup` et de l'export `./transport` (schémas, types de transport) ;
  - outillage : scripts racine `*:customer-portal`, `.env.example` (clés `VITE_*__CUSTOMER_PORTAL`, exemple d'origine CORS), README racine, CDC-01 §8.11.
- **Chemins modifiés :** `apps/customer-portal/**` (nouveau), `packages/contracts/{package.json,src/transport.ts}`, `pnpm-lock.yaml`, `package.json`, `.env.example`, `README.md`, `docs/cdc/CDC-01-identite-acces.md`, `docs/architecture/ADR-002-applications-frontend-et-routage-mutualise.md`.
- **Exigences/sections concernées :** CDC-01 §4.1, §4.3, §4.4, §4.6, IAM-F-22 à IAM-F-25, §8.10, §8.11 ; ADR-002 D2, D3, D11 ; RP-17 (aucune donnée sensible journalisée côté navigateur).
- **Validations réellement exécutées :**
  - `pnpm typecheck` (customer-portal et contracts) — réussi.
  - `pnpm lint` (customer-portal, contracts, auth-service) — réussi, 0 avertissement après correction.
  - `pnpm exec vitest run` (customer-portal) — 7 fichiers, 25 tests réussis : env, erreurs API, client HTTP (en-têtes, jeton explicite, un seul rejeu sur 401, `retryOnUnauthorized:false`), refresh single-flight/refus/réseau, redirection interne, masquage e-mail, schémas Yup, page de connexion.
  - `pnpm build` (customer-portal, avec `VITE_AUTH_API_URL__CUSTOMER_PORTAL` passée par l'hôte) — réussi ; avertissement de taille de chunk (521 kB) non traité.
  - `pnpm exec turbo run typecheck test --env-mode=loose` (racine, mêmes variables d'hôte) — 7 tâches réussies, dont les 25 tests auth-service.
  - `node --test scripts/generate-env.test.cjs` — 3 tests réussis.
  - Démarrage `vite dev` : HTTP 200 ; contrôle de débordement horizontal sur `/login`, `/register`, `/forgot-password`, `/mfa`, 404 à 320/360/600/840/1120 px en thèmes clair et sombre — aucun débordement.
  - Non exécuté : parcours de bout en bout contre `auth-service` + Maildev (backend non lancé) ; audit d'accessibilité automatisé ; revue visuelle écran par écran des pages authentifiées.
  - Note : `pnpm build/test/typecheck` à la racine échouent tant que `VITE_AUTH_API_URL__CUSTOMER_PORTAL` est absente du `.env` (clé requise de `env.schema.json`).
- **Points ouverts :** conception des e-mails (§10.16) ; récupération CUSTOMER après perte de l'e-mail (support) ; SMTP, cookies/CSRF/origines en production ; absence de `GET /auth/me` ; doublon de configuration front/back (`PASSWORD_MIN_LENGTH`, délai de renvoi OTP) ; `staff-portal` (administration, invitations, rôles) à construire ; recette de bout en bout navigateur à faire.
- **Suite attendue :** ajouter les clés `VITE_*__CUSTOMER_PORTAL` et l'origine CORS au `.env`, lancer `auth-service` + Maildev et dérouler le parcours complet ; puis arbitrer et démarrer `staff-portal`.

## Mise à jour — Correction du scan GitGuardian

- **Objectif :** éliminer les mots de passe statiques de la recette SMTP Maildev signalés par GitGuardian sur la PR #7.
- **Statut :** terminé ; PR #9 ouverte et GitGuardian réussi.
- **Résumé :** les mots de passe synthétiques des scénarios CUSTOMER, récupération, super-admin et STAFF sont générés aléatoirement à chaque exécution, au lieu d'être inscrits en clair dans le test. La correction est reprise sur une branche neuve dérivée de `dev`, sans le commit historique signalé ; l'historique de la branche précédente n'a pas été réécrit. Aucun secret de service ou de production n'était concerné.
- **Chemins modifiés :** `services/auth-service/test/maildev.e2e-spec.ts`.
- **Exigences/sections concernées :** CDC-01 §8.7 et §8.9 ; hygiène des secrets pour la recette SMTP.
- **Validations :**
  - `pnpm test:e2e:auth-service:maildev` — réussi, 2 scénarios avec SMTP réel (après génération des mots de passe à l'exécution).
  - `pnpm test:e2e:auth-service:maildev` — réussi à nouveau sur la branche neuve, 2 scénarios ; le schéma PostgreSQL temporaire a été supprimé.
  - `pnpm lint:auth-service` — réussi, aucune erreur ni warning.
  - `pnpm typecheck:auth-service` — réussi.
  - `pnpm exec prettier --check services/auth-service/test/maildev.e2e-spec.ts docs/journal/2026-11-23/CDC-01-identite-acces.md` — réussi.
  - `pnpm exec prettier --check` sur les autres fichiers modifiés — réussi ; `docs/README.md` échoue aussi sur la version de `dev`, donc son formatage préexistant n'a pas été réécrit en bloc.
  - Recherche d'affectations littérales `password: "..."` / `password = "..."` dans le test — aucune trouvée.
  - `git diff --check` — réussi.
  - GitGuardian sur la PR #9 — réussi.
- **Points ouverts :** la recette complète du CDC-01 reste à poursuivre selon les points ouverts du journal du 2026-11-22.
- **Suite attendue :** poursuivre les scénarios d'administration et de sécurité non couverts par cette correction.

## Mise à jour — Transfert frontend et conception des courriels

- **Objectif :** préparer le transfert du cœur 1 à l'agent frontend et consigner le point ouvert de conception des courriels envoyés par le backend.
- **Statut :** terminé pour la documentation ; les interfaces et le design des courriels restent à réaliser.
- **Résumé :** le CDC-01 §10 comporte un nouveau point ouvert sur la présentation/contenu des courriels d'identité. Le code actuel envoie ces messages en texte simple, sans gabarit visuel HTML. L'ADR-002 référence le CDC-01, le contrat `/docs-json`, Swagger, la collection Postman et les limites de recette sans changer le statut de ses propositions.
- **Chemins modifiés :** `docs/cdc/CDC-01-identite-acces.md`, `docs/architecture/ADR-002-applications-frontend-et-routage-mutualise.md`.
- **Exigences/sections concernées :** CDC-01 §4.6, IAM-F-22 à IAM-F-25, §8.10 et §10 point 16 ; ADR-002 §9 et §10.
- **Validations :** `git diff --check` — réussi. Tests et build non exécutés — changements documentaires uniquement.
- **Points ouverts :** le choix de l'identité visuelle, du contenu final et du format des courriels reste à effectuer pendant l'implémentation frontend ; la recette complète du CDC-01 reste partielle.
- **Suite attendue :** l'agent frontend peut démarrer à partir du CDC-01 et de la collection versionnée ; décider le design des courriels avec le porteur du projet avant de finaliser leur présentation.
