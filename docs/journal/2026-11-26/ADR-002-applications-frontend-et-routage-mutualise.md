# Journal — ADR-002 — Applications frontend et routage mutualisé

## Entrée du 26 novembre 2026

- **Objectif :** garantir que chaque portail publié séparément embarque ses assets requis et que la publication PlanetHoster place les deux builds dans leurs répertoires propres.
- **Statut :** changements locaux terminés ; publication réelle sur PlanetHoster non rejouée.
- **Résumé :**
  - Maintien des portails CUSTOMER et STAFF comme builds statiques autonomes ; ajout du favicon manquant au build STAFF et renouvellement de son cache Service Worker.
  - Vérification automatisée des favicons avant promotion d’une release.
  - Validation par le publisher des deux builds avant copie vers leurs destinations respectives ; la sortie temporaire de déploiement peut ensuite être supprimée sans supprimer les portails publiés.
  - Au premier déploiement, le service backend n’est pas redémarré avant les migrations et le bootstrap initial.
- **Fichiers modifiés :** `.github/workflows/deploy-planet-host.yml`, `apps/staff-portal/public/favicon.svg`, `apps/staff-portal/public/service-worker.js`, `deploy-tools/planet-host-deploy.sh`, `deploy-tools/release-manager.cjs`, `deploy-tools/release-manager.test.cjs`, `docs/architecture/ADR-002-applications-frontend-et-routage-mutualise.md`, `docs/REPRISE-CDC-01-FRONTEND.md`, `docs/deployment/planethoster-manual-migrations.md`, `README.md`, `docs/README.md`.
- **Décisions/sections concernées :** ADR-002, séparation des applications frontend et publication/routage des portails.
- **Validations exécutées :**
  - `node --test deploy-tools/release-manager.test.cjs deploy-tools/publish-portals.test.cjs` — 8 tests réussis, notamment publication lisible et rejet des builds incomplets.
  - Builds Vite isolés de CUSTOMER et STAFF — réussis ; favicon inclus dans chaque sortie.
  - `bash -n` sur les trois scripts de déploiement — réussi.
  - `pnpm exec prettier --check ...` sur les fichiers pris en charge — réussi.
  - `git diff --check` — réussi.
  - Workflow GitHub Actions et publication PlanetHoster — non exécutés dans cette validation locale.
- **Points ouverts :** confirmer sur l’hébergement les permissions et chemins finaux des deux portails ainsi que le comportement de leur routage ; valider en production les migrations et le démarrage initial.
- **Suite attendue :** exécuter le workflow sur l’environnement autorisé, vérifier les deux URLs publiques et terminer la recette avant de déclarer les parcours concernés clôturés.
