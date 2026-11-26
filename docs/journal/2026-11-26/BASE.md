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
