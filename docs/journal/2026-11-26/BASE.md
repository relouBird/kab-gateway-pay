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
- **Fichiers modifiés :** `.github/workflows/deploy-planet-host.yml`, `deploy-tools/build-argon2-for-planethoster.sh`, `README.md`, `docs/README.md`, `docs/architecture/ADR-002-applications-frontend-et-routage-mutualise.md`.
- **Exigences/sections concernées :** CDC-01 `IAM-F-07` (hachage argon2id inchangé) ; ADR-002 §14, construction et dépendances natives de la release.
- **Validations exécutées :**
  - `git diff --check` — réussi.
  - `pnpm exec prettier --check` sur le workflow, README et documents modifiés — réussi.
  - `node --test deploy-tools/release-manager.test.cjs deploy-tools/publish-portals.test.cjs` — 8 tests réussis.
  - `bash -n` — non exécuté : Bash est indisponible dans l'environnement de validation local.
  - Node-gyp 13.1.0 vérifié : il accepte Python 3.9 et Node 22.23.5.
  - Compilation dans AlmaLinux 8.10 — non exécutée localement : Docker Desktop n'a pas de daemon disponible.
  - Exécution du workflow et démarrage sur PlanetHoster — en attente.
- **Points ouverts :** exécuter le workflow pour confirmer le build conteneurisé et vérifier que le runtime publié charge `argon2` sur PH.
- **Suite attendue :** valider la syntaxe shell/YAML et les contrôles de format localement, puis exécuter le workflow sur l'environnement autorisé et tester le démarrage du service sur PH.
