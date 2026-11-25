# Journal — 25 novembre 2026 — ADR-002

- **Objectif :** supprimer le provisionnement manuel/automatique de clés RSA du déploiement PlanetHoster.
- **Statut :** terminé localement ; déploiement PH non exécuté.
- **Résumé :** le workflow vérifie la présence d'un `JWT_SIGNING_SECRET` valide dans le runtime généré, transfère le fichier runtime protégé et ne crée plus de fichier RSA, d'identifiant `kid` ni de répertoire `.secrets/`. Le README de déploiement et le guide `auth-service` décrivent le nouveau profil et la migration des anciennes variables.
- **Chemins modifiés :** `.github/workflows/deploy-planet-host.yml`, `README.md`, `services/auth-service/README.md`, `docs/architecture/ADR-002-applications-frontend-et-routage-mutualise.md`.
- **Décisions/sections :** §14 — génération/transfert du runtime, configuration GitHub/PH, contrat Postman.
- **Validations :** Prettier sur le workflow — réussi ; JSON/formatage de configuration — réussi ; `git diff --check` — réussi. Action GitHub et connexion PlanetHoster — non exécutées.
- **Points ouverts :** la nouvelle valeur de signature doit être ajoutée au profil `.env.prod` et au secret GitHub `KG_PAY_APP_ENV`; vérifier la configuration CloudLinux et le démarrage effectif.
- **Suite attendue :** pousser la mise à jour, lancer la génération runtime puis la recette de production. Les JWT RS256 encore en circulation ne seront pas acceptés.

## Publication séparée des portails PlanetHoster

- **Objectif :** séparer l'envoi des artefacts de leur application sur PH et publier les builds web dans leurs racines dédiées avec des permissions lisibles.
- **Statut :** terminé localement ; déploiement PH non exécuté.
- **Résumé :** le workflow distingue `Upload release to PlanetHoster` et `Apply release on PlanetHoster`. Les builds Customer et Staff sont publiés sous `SERVER_KGAPPS_ROOT/customer-app/` et `staff-app/`, avec les dossiers en `755` et les fichiers en `644`; le `dist/` temporaire est supprimé après succès et l'historique daté est conservé. Le publisher rejette aussi une destination qui rejoint le snapshot temporaire via un lien symbolique. La configuration SSH du workflow utilise le secret documenté `SERVER_SSH_KEY`.
- **Chemins modifiés :** `.github/workflows/deploy-planet-host.yml`, `deploy-tools/upload-release.sh`, `deploy-tools/deploy-release.sh`, `deploy-tools/planet-host-deploy.sh`, `deploy-tools/publish-portals.cjs`, `deploy-tools/publish-portals.test.cjs`, `README.md`, `docs/README.md`, `docs/architecture/ADR-002-applications-frontend-et-routage-mutualise.md`.
- **Décisions/sections :** ADR-002, déploiement PlanetHoster et publication des portails.
- **Validations :** `bash -n` sur les trois scripts shell — réussi ; tests publication et release manager — 7 réussis ; Prettier sur workflow, scripts CJS et documentation mise à jour — réussi.
- **Points ouverts :** renseigner `SERVER_KGAPPS_ROOT` dans l'environnement GitHub `production`, confirmer les chemins et le routage sur PH, puis vérifier les permissions web en production. Le workflow n'a pas été exécuté contre PlanetHoster.
- **Suite attendue :** lancer les phases d'upload et d'application sur l'environnement de recette/production après configuration des secrets, puis confirmer l'accès HTTP aux deux portails et le redémarrage d'`auth-service`.
