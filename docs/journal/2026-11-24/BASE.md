# Journal — BASE — 2026-11-24

## Versionnement du monorepo

- **Objectif :** ajouter le bump automatique de version sur `dev` et `main`, ainsi qu'un bump majeur manuel sur `main`.
- **Statut :** terminé pour le script et le workflow ; activation GitHub et règles de protection à vérifier après publication de la branche.
- **Résumé :** la version racine de KG Pay est la version commune du monorepo. Un push sur `dev` propose un bump patch, un push sur `main` un bump minor ; le déclenchement manuel confirmé sur `main` propose un bump major. Chaque exécution ouvre ou met à jour une PR, et les pushes ne contenant qu'un changement du champ de version sont ignorés pour éviter les boucles. Les tests Node couvrent les calculs, les entrées invalides, la modification ciblée du manifeste et la détection des commits de version seule.
- **Chemins modifiés :** `.github/workflows/version-bump.yml`, `scripts/bump-version.cjs`, `scripts/bump-version.test.cjs`, `package.json`, `README.md`.
- **Exigences/sections concernées :** conventions Git et versionnement du monorepo ; workflow de publication automatisée.
- **Validations :** `node --test scripts/bump-version.test.cjs` — réussi, 4 tests ; `pnpm exec prettier --check package.json README.md scripts/bump-version.cjs scripts/bump-version.test.cjs .github/workflows/version-bump.yml docs/journal/2026-11-24/BASE.md` — réussi ; `git diff --check` — réussi. Le workflow GitHub lui-même n'a pas été déclenché depuis cette session.
- **Points ouverts :** le dépôt est actuellement à la version racine `0.0.0`, donc le premier bump patch sur `dev` produira `0.0.1`. Il n'existe pas encore de CI générale. La création de PR par Actions requiert l'autorisation « Allow GitHub Actions to create and approve pull requests » ou équivalent dans les paramètres du dépôt. Les versions des workspaces restent à `0.1.0` et indépendantes de la version commune.
- **Suite attendue :** exécuter les validations, publier cette branche selon demande, puis tester le workflow GitHub sur `dev` et vérifier la configuration de permissions avant d'activer les bumps sur `main`.

## Préparer les builds et migrations PlanetHoster

- **Objectif :** construire les workspaces dans GitHub Actions, déposer des artefacts par révision sur PlanetHoster et isoler les migrations de production dans une action manuelle compatible npm.
- **Statut :** implémentation du dépôt et des outils terminée ; recette GitHub/PlanetHoster en attente de configuration de l'hôte et des environnements GitHub.
- **Résumé :** ajout des workflows de build/dépôt sur `dev` et `main` et de migration manuelle de `auth-service` depuis un SHA `main`. Les artefacts préservent les chemins des workspaces ; aucun site public n'est remplacé et aucun service n'est redémarré. Ajout d'un migrateur autonome npm qui n'exécute que `prisma migrate deploy`, lit uniquement `DATABASE_URL__AUTH_SERVICE` du profil explicitement sélectionné et ne copie pas de `.env`. Le générateur d'environnements et le wrapper Prisma local acceptent désormais `--source-file`/`--env-file`, avec sorties temporaires pour les migrations profilées. Les profils `.env.test`/`.env.prod` ne sont pas transférés.
- **Chemins modifiés :** `.github/workflows/build-artifacts.yml`, `.github/workflows/migrate-auth-service.yml`, `deploy-tools/prisma-migrator/`, `scripts/generate-env.cjs`, `scripts/generate-env.test.cjs`, `scripts/run-prisma.cjs`, `scripts/run-prisma.test.cjs`, `package.json`, `README.md`, `docs/README.md`, `docs/architecture/ADR-002-applications-frontend-et-routage-mutualise.md`.
- **Exigences/sections concernées :** ADR-002 D13 et §14 ; configuration des environnements ; builds des portails/services ; migration Prisma en production ; absence de copie de secrets vers `.env`.
- **Validations :** `node --test scripts/generate-env.test.cjs scripts/run-prisma.test.cjs scripts/bump-version.test.cjs deploy-tools/prisma-migrator/migrate.test.cjs` — réussi, 16 tests ; `npm ci --omit=dev` dans `deploy-tools/prisma-migrator/` — réussi ; `npm test` du migrateur — 4 tests réussis ; `prisma validate --schema ..\..\services\auth-service\prisma\schema.prisma` avec URL PostgreSQL synthétique — réussi ; `npm audit --omit=dev` — 0 vulnérabilité ; Prettier et `git diff --check` — réussis. Le build workspace et les workflows GitHub/PlanetHoster ne sont pas exécutés depuis cette session.
- **Points ouverts :** définir les variables d'URL API des environnements `test`/`production`, les secrets SSH et empreintes d'hôtes, le répertoire absolu privé, le chemin du Node `deploy` et celui du fichier de production hors racines publiques ; vérifier Node/npm, accès réseau à npm et PostgreSQL depuis PH ; configurer les approbateurs GitHub et effectuer une migration de test avec sauvegarde.
- **Suite attendue :** configurer les environnements GitHub et les chemins PH, déposer un build de test, vérifier sa structure, puis exécuter la migration sur une base de test avant toute utilisation en production.

## Correction du hook pre-commit

- **Objectif :** corriger l'échec du contrôle `git diff --cached --check` sur le workflow de bump de version.
- **Statut :** terminé.
- **Résumé :** suppression de l'espace final sur la permission `pull-requests`.
- **Chemins modifiés :** `.github/workflows/version-bump.yml`.
- **Validation :** `git diff --cached --check` — réussi après mise à jour de l'index.
- **Points ouverts :** aucun.
- **Suite attendue :** relancer le commit.

## Répétition locale étape par étape du build central

- **Objectif :** reproduire le build et l'empaquetage prévus par GitHub Actions sans utiliser `dev` comme branche de travail, toucher au `.env` local ou contacter PlanetHoster.
- **Statut :** build et archive locaux réussis sur `chore/local-build-rehearsal-20261124` ; GitHub Actions et PlanetHoster non exécutés.
- **Résumé :** une copie isolée du commit a été créée sous `%TEMP%`; elle n'incluait pas les fichiers ignorés du dépôt. Après `pnpm install --frozen-lockfile` et les tests du migrateur npm, la copie temporaire de `.env.example` vers `.env` a révélé que `STAFF_PORTAL_URL` vide, pourtant déclarée `allowEmpty`, échouait à sa validation de format. Le générateur retourne désormais pour une valeur vide autorisée; un test confirme qu'une URL invalide non vide reste rejetée. Le build a ensuite réussi, les sorties des quatre workspaces ont été regroupées en conservant leurs chemins, et l'archive a été vérifiée sans `.env`, `.env.example` ni `node_modules`. La copie temporaire a été supprimée; l'artefact local ignoré est conservé.
- **Chemins modifiés :** `scripts/generate-env.cjs`, `scripts/generate-env.test.cjs`, `docs/journal/2026-11-24/BASE.md`.
- **Exigences/sections concernées :** ADR-002 D13 ; génération des environnements de build ; interprétation de `allowEmpty`.
- **Validations :** `pnpm install --frozen-lockfile` dans la copie temporaire — réussi ; `npm ci --omit=dev --prefix deploy-tools/prisma-migrator` — réussi, 0 vulnérabilité ; `npm test --prefix deploy-tools/prisma-migrator` — 4 tests réussis ; `node --test scripts/generate-env.test.cjs` — 7 tests réussis ; `pnpm run build` dans la copie isolée — 5 tâches réussies ; archive tar.gz — 212 entrées, index des deux portails et fichiers attendus présents, aucun `.env` ou `node_modules`.
- **Points ouverts :** les URL locales sont des valeurs de démonstration ; les variables GitHub réelles, les environnements GitHub et le dépôt SSH PH restent à configurer et tester. Les chunks Vite des deux portails dépassent 500 kB et produisent un avertissement non bloquant.
- **Suite attendue :** examiner les modifications de cette branche dédiée puis décider séparément de leur commit/publication ; ne pas fusionner ni travailler directement sur `dev`.

## Refonte — releases datées et déploiement PlanetHoster

- **Objectif :** remplacer le dépôt par SHA et l'action de migration automatisée par deux entrées de déploiement sur `main`, une procédure manuelle de migration et une release courante centralisée.
- **Statut :** implémentation locale terminée ; GitHub Actions et PlanetHoster non exécutés.
- **Résumé :** `first-deployment.yml` initialise le clone et déploie la première release; `build-artifacts.yml` appelle le même workflow réutilisable sur push `main` ou dispatch depuis `main`. Le build pnpm inclut les portails statiques et un paquet runtime autonome d'`auth-service`, avec dépendances de production et client Prisma généré par une URL synthétique. Le gestionnaire, placé directement dans `deploy-tools/`, vérifie commit/manifeste, stocke des releases UTC datées, en conserve cinq et remplace `dist/`. Le service est publié atomiquement dans `runtime/` d'un APP_ROOT CloudLinux séparé avant redémarrage; sa racine/configuration privée n'est pas remplacée. L'action et l'outil migrateur npm ont été retirés; la procédure SSH est documentée et aucune variable `.env` n'est transférée.
- **Chemins modifiés :** `.github/workflows/build-artifacts.yml`, `.github/workflows/first-deployment.yml`, `.github/workflows/deploy-planet-host.yml`, suppression de `.github/workflows/migrate-auth-service.yml`, `deploy-tools/release-manager.cjs`, `deploy-tools/release-manager.test.cjs`, suppression de `deploy-tools/prisma-migrator/` (quatre fichiers suivis), `README.md`, `docs/README.md`, `docs/architecture/ADR-002-applications-frontend-et-routage-mutualise.md`, `docs/deployment/planethoster-manual-migrations.md`, `services/auth-service/README.md`.
- **Exigences/sections concernées :** ADR-002 D13 et §14; construction centralisée; conservation des releases; démarrage CloudLinux; migrations Prisma manuelles; séparation des secrets et artefacts.
- **Validations :** `node --test scripts/generate-env.test.cjs scripts/run-prisma.test.cjs scripts/bump-version.test.cjs deploy-tools/release-manager.test.cjs` — 17 tests réussis; `pnpm --filter auth-service deploy --prod --legacy` en dossier temporaire — réussi; génération Prisma avec une URL synthétique et chargement de `@kgpay/contracts`, NestJS et Prisma dans le paquet temporaire — réussis; Prettier et `git diff --check` — réussis; recherche des références actives à l'ancien migrateur/workflow — aucune. `actionlint` indisponible. Aucun `.env` local n'a été lu et aucun accès PH/GitHub n'a été exécuté.
- **Points ouverts :** renseigner les variables/secrets de l'environnement GitHub `production`; confirmer accès de lecture GitHub depuis PH; créer le Node app CloudLinux avec APP_ROOT séparé et startup `runtime/dist/main.js`; fournir ses variables runtime; confirmer compatibilité Linux des dépendances natives, espace disque, racines web des portails, réseau npm/PostgreSQL et sauvegarde restaurable.
- **Suite attendue :** faire la recette locale de la structure d'archive si nécessaire, vérifier les prérequis PH puis lancer manuellement `First KG Pay deployment` depuis `main`; n'exécuter aucune migration sans sauvegarde et revue de compatibilité.
