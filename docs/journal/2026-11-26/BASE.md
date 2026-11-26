# Journal — Base transversale

## Entrée du 26 novembre 2026

- **Objectif :** ajouter un déploiement PlanetHoster de test réutilisant le même processus que la production sans partager leurs clones, releases, paramètres runtime ou données.
- **Statut :** changements locaux terminés ; mise en place GitHub et recette sur PlanetHoster en attente.
- **Résumé :**
  - Le workflow réutilisable accepte `production` ou `test`, choisit l'environnement GitHub correspondant et refuse toute combinaison branche/environnement autre que `main`/`production` ou `test`/`test`.
  - Le workflow de production permet de choisir l'environnement lors d'un lancement manuel ; un nouveau workflow déploie automatiquement sur push à `test` et fixe sa cible sur l'environnement `test`.
  - Le déploiement distant clone et synchronise la branche réellement ciblée. Le mode `initialize` est disponible manuellement pour initialiser le test.
  - Les environnements GitHub utilisent les mêmes noms de secrets avec des valeurs propres à chaque environnement. La cible test doit utiliser une base distincte et des racines d'application séparées ; le workflow ajoute `/test` à la racine de déploiement de base et exige la variable de confirmation `KG_PAY_DEPLOY_TARGET=test`.
  - Documentation complétée pour les secrets, les valeurs frontend/runtime, les migrations et le bootstrap du premier administrateur par environnement.
- **Fichiers modifiés :** `.github/workflows/build-artifacts.yml`, `.github/workflows/deploy-planet-host.yml`, `.github/workflows/deploy-test.yml`, `.github/workflows/first-deployment.yml`, `deploy-tools/deploy-release.sh`, `deploy-tools/planet-host-deploy.sh`, `README.md`, `docs/README.md`, `docs/deployment/planethoster-manual-migrations.md`.
- **Conventions concernées :** séparation des environnements de déploiement, sélection par GitHub Environments et isolation des chemins/runtimes.
- **Validations exécutées :**
  - Tests ciblés Node (`release-manager`, `publish-portals`, génération d'environnement, Prisma et versionnement) — 21 tests réussis.
  - `bash -n` sur les scripts upload, deploy et remote deploy — réussi.
  - Test direct de la validation de branche du script — `main` et `test` acceptés ; autre branche rejetée.
  - `pnpm exec prettier --check ...` sur workflows et documentation pris en charge — réussi.
  - `git diff --check` — réussi.
  - Exécution du workflow GitHub Actions et déploiement PlanetHoster — non exécutés ; les secrets/environnements et ressources du serveur ne sont pas configurés par ces changements locaux.
- **Points ouverts :** créer/publier la branche `test`, créer l'environnement GitHub `test` et ses secrets de mêmes noms, provisionner la base distincte et les racines CloudLinux/web, puis lancer une première initialisation manuelle avant les déploiements automatiques.
- **Suite attendue :** après configuration, exécuter `Deploy test to PlanetHoster` avec `initialize`, appliquer manuellement les migrations sur la base de test, amorcer son premier super-admin, démarrer l'application et vérifier les portails avant le premier push normal sur `test`.

## Entrée du 26 novembre 2026 — Compatibilité native d'argon2

- **Objectif :** éviter l'échec de chargement d'`argon2` sur PlanetHoster (GLIBC 2.28) causé par le binaire précompilé qui exige GLIBC 2.34.
- **Statut :** changements locaux terminés ; compilation dans GitHub Actions et recette sur PH en attente.
- **Résumé :**
  - Ajout d'un script de build qui utilise une image AlmaLinux 8.10 AMD64 épinglée, Node 22.23.5 et la version d'`argon2` présente dans le paquet runtime.
  - Le binaire fourni par le paquet npm est remplacé par une compilation depuis les sources; un test de chargement, hachage et vérification s'exécute dans l'environnement GLIBC 2.28 avant l'archivage.
  - Le workflow vérifie aussi le chargement du paquet dans le runtime assemblé. Aucun compilateur ni changement de version Node n'est demandé sur PH.
  - L'analyse du run GitHub Actions `45803798812` a révélé un faux succès : `docker run` n'avait pas `--interactive`, donc le script envoyé à `bash -s` par heredoc n'était pas transmis. Le `require('argon2')` sur Ubuntu ne vérifiait que le binaire précompilé compatible avec le runner.
  - Ajout de `--interactive` et d'un marqueur écrit uniquement après les smoke tests GLIBC 2.28 puis exigé par le runner avant la création de l'archive.
- **Fichiers modifiés :** `.github/workflows/deploy-planet-host.yml`, `deploy-tools/build-argon2-for-planethoster.sh`, `README.md`, `docs/README.md`, `docs/architecture/ADR-002-applications-frontend-et-routage-mutualise.md`, `docs/journal/2026-11-26/BASE.md`.
- **Exigences/sections concernées :** CDC-01 `IAM-F-07` (hachage argon2id inchangé) ; ADR-002 §14, construction et dépendances natives de la release.
- **Validations exécutées :**
  - `git diff --check` — réussi.
  - `pnpm exec prettier --check` sur le workflow, README et documents modifiés — réussi.
  - `node --test deploy-tools/release-manager.test.cjs deploy-tools/publish-portals.test.cjs` — 8 tests réussis.
  - `bash -n` via Git Bash sur les scripts de déploiement — réussi.
  - Node-gyp 13.1.0 vérifié : il accepte Python 3.9 et Node 22.23.5.
  - Le run GitHub Actions `45803798812` a réussi, mais ne constitue pas une validation du build natif : le contenu du heredoc n'a pas été exécuté.
  - Compilation dans AlmaLinux 8.10 — non vérifiée localement : Docker Desktop n'a pas de daemon disponible.
  - Exécution du workflow et démarrage sur PlanetHoster — en attente.
- **Points ouverts :** exécuter une nouvelle release et vérifier que le marqueur confirme les smoke tests dans le conteneur, puis que le runtime publié charge `argon2` sur PH.
- **Suite attendue :** relancer le déploiement avec cette correction; ne pas considérer le run précédent comme preuve de compatibilité GLIBC.

## Entrée du 26 novembre 2026 — Racine cohérente pour le déploiement test

- **Objectif :** corriger l'échec de l'initialisation test où le runtime d'`auth-service` était absent du répertoire `incoming`.
- **Statut :** correction locale terminée ; workflow test à relancer.
- **Résumé :**
  - Le run `45815027390` était en mode `initialize` sur la branche/environnement `test`. L'étape Upload ajoutait `/test` à `SERVER_DEPLOY_ROOT`, mais cette transformation était commentée dans Apply.
  - Le fichier runtime était donc envoyé sous `<SERVER_DEPLOY_ROOT>/test/incoming/`, tandis que le script distant le cherchait dans `<SERVER_DEPLOY_ROOT>/incoming/`.
  - La transformation `/test` est rétablie dans Apply pour garder les deux phases sur la même racine et séparer les fichiers de test de la production.
- **Fichiers modifiés :** `.github/workflows/deploy-planet-host.yml`, `docs/journal/2026-11-26/BASE.md`.
- **Conventions concernées :** isolement des racines `production` et `test`; transfert et application d'une même release.
- **Validations exécutées :**
  - `bash -n` sur les scripts upload, deploy et remote deploy — réussi.
  - `pnpm exec prettier --check .github/workflows/deploy-planet-host.yml docs/journal/2026-11-26/BASE.md` — réussi.
  - `git diff --check` — réussi.
  - `node --test deploy-tools/release-manager.test.cjs deploy-tools/publish-portals.test.cjs` — 8 tests réussis.
  - Run GitHub Actions et initialisation PlanetHoster — en attente.
- **Points ouverts :** vérifier qu'aucun clone/release n'existe déjà sous `<SERVER_DEPLOY_ROOT>/test`; l'initialisation ne doit jamais réutiliser la racine de production.
- **Suite attendue :** vérifier la syntaxe et les tests ciblés, puis relancer le workflow test avec `initialize`.

## Entrée du 26 novembre 2026 — Promotion contrôlée des releases test

- **Objectif :** permettre la promotion d'une release construite depuis `test` vers sa racine PlanetHoster isolée sans autoriser son déploiement en production.
- **Statut :** correction locale terminée ; publication sur la branche test et nouvelle initialisation en attente.
- **Résumé :**
  - Le run `45817105429` a atteint l'initialisation de la racine test mais le gestionnaire de releases refusait tout manifeste dont `ref` n'était pas `main`.
  - L'erreur était cohérente avec l'ancien garde-fou de production, mais ce garde-fou ne distinguait pas la racine/environnement ciblé.
  - Le déploiement transmet désormais la branche attendue au gestionnaire; celui-ci accepte seulement `main` ou `test` et exige que `manifest.ref` égale la branche cible, en plus de vérifier le commit complet.
- **Fichiers modifiés :** `deploy-tools/release-manager.cjs`, `deploy-tools/release-manager.test.cjs`, `deploy-tools/planet-host-deploy.sh`, `docs/architecture/ADR-002-applications-frontend-et-routage-mutualise.md`, `docs/journal/2026-11-26/BASE.md`.
- **Conventions concernées :** séparation production/test; validation de la branche et du commit avant promotion d'une release.
- **Validations exécutées :**
  - `node --test deploy-tools/release-manager.test.cjs` — 7 tests réussis, dont acceptation de `test` et rejet d'un manifeste sur la mauvaise branche.
  - `bash -n deploy-tools/planet-host-deploy.sh` — réussi.
  - `pnpm exec prettier --check` sur les scripts et documents modifiés — réussi.
  - `git diff --check` — réussi.
  - Initialisation PlanetHoster depuis `test` — en attente.
- **Points ouverts :** publier la correction sur `test` et confirmer la première initialisation sans toucher aux répertoires de production.
- **Suite attendue :** valider les tests/syntaxes, puis relancer l'initialisation de l'environnement test.
