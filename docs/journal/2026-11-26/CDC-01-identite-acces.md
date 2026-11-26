# Journal — CDC-01 — Identité et contrôle des accès

## Entrée du 26 novembre 2026

- **Objectif :** corriger l’asset manquant du portail STAFF et fiabiliser la préparation du premier démarrage de `auth-service`.
- **Statut :** changements locaux terminés ; recette réelle sur PlanetHoster et clôture du CDC bloquées par les validations restantes.
- **Résumé :**
  - Ajout du favicon STAFF et incrément du cache du Service Worker pour renouveler les ressources déjà installées.
  - Contrôle de la présence des favicons des deux portails et de la CLI compilée de bootstrap dans les releases.
  - Le premier déploiement installe la release sans démarrer `auth-service` avant les migrations et le bootstrap manuel du premier `GLOBAL_SUPER_ADMIN`.
  - Mise à jour du guide opératoire pour utiliser le manifeste de la release conservée et décrire la procédure de bootstrap.
- **Fichiers modifiés :** `.github/workflows/deploy-planet-host.yml`, `apps/staff-portal/public/favicon.svg`, `apps/staff-portal/public/service-worker.js`, `deploy-tools/planet-host-deploy.sh`, `deploy-tools/release-manager.cjs`, `deploy-tools/release-manager.test.cjs`, `docs/README.md`, `docs/REPRISE-CDC-01-FRONTEND.md`, `docs/cdc/CDC-01-identite-acces.md`, `docs/deployment/planethoster-manual-migrations.md`, `README.md`, `services/auth-service/README.md`.
- **Exigences/sections concernées :** CDC-01, interfaces et parcours STAFF ; procédure du premier administrateur ; critères d’acceptation et points ouverts.
- **Validations exécutées :**
  - `node --test deploy-tools/release-manager.test.cjs deploy-tools/publish-portals.test.cjs` — 8 tests réussis.
  - `pnpm exec prettier --check ...` sur les fichiers pris en charge — réussi.
  - `bash -n` sur les trois scripts de déploiement — réussi.
  - Builds Vite isolés des deux portails — réussis ; `favicon.svg` présent dans les deux sorties.
  - `git diff --check` — réussi.
  - Recette de déploiement, migration et bootstrap sur PlanetHoster — non exécutée, car elle requiert l’environnement de production et l’opérateur.
- **Points ouverts :** la procédure de bootstrap doit encore être exécutée sur PH avec la configuration SMTP réelle ; les autres points ouverts et critères de recette du CDC-01 restent à traiter. Le CDC n’est donc pas déclaré terminé.
- **Suite attendue :** choisir l’isolation et le déclencheur de l’environnement de test, exécuter la procédure de première mise en service sur PH et terminer la recette CDC-01.
