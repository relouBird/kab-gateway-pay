# Journal — 25 novembre 2026 — ADR-002

- **Objectif :** supprimer le provisionnement manuel/automatique de clés RSA du déploiement PlanetHoster.
- **Statut :** terminé localement ; déploiement PH non exécuté.
- **Résumé :** le workflow vérifie la présence d'un `JWT_SIGNING_SECRET` valide dans le runtime généré, transfère le fichier runtime protégé et ne crée plus de fichier RSA, d'identifiant `kid` ni de répertoire `.secrets/`. Le README de déploiement et le guide `auth-service` décrivent le nouveau profil et la migration des anciennes variables.
- **Chemins modifiés :** `.github/workflows/deploy-planet-host.yml`, `README.md`, `services/auth-service/README.md`, `docs/architecture/ADR-002-applications-frontend-et-routage-mutualise.md`.
- **Décisions/sections :** §14 — génération/transfert du runtime, configuration GitHub/PH, contrat Postman.
- **Validations :** Prettier sur le workflow — réussi ; JSON/formatage de configuration — réussi ; `git diff --check` — réussi. Action GitHub et connexion PlanetHoster — non exécutées.
- **Points ouverts :** la nouvelle valeur de signature doit être ajoutée au profil `.env.prod` et au secret GitHub `KG_PAY_APP_ENV`; vérifier la configuration CloudLinux et le démarrage effectif.
- **Suite attendue :** pousser la mise à jour, lancer la génération runtime puis la recette de production. Les JWT RS256 encore en circulation ne seront pas acceptés.
