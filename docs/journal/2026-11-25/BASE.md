# Journal — 25 novembre 2026 — Base

- **Objectif :** simplifier la configuration des secrets de signature et retirer les scripts/fichiers RSA du processus.
- **Statut :** terminé localement.
- **Résumé :** `.env.example` documente la génération indépendante du secret HS256 et de la clé OTP ; suppression du générateur de paire RSA et de son test ; mise à jour du script de tests racine ; le schéma runtime exige `JWT_SIGNING_SECRET` et permet une liste optionnelle de secrets précédents. Le workflow n'exécute plus les tests ni le provisionnement RSA supprimés.
- **Chemins modifiés :** `.env.example`, `package.json`, `services/auth-service/env.schema.json`, suppression de `scripts/generate-signing-keys.cjs` et `scripts/generate-signing-keys.test.cjs`.
- **Exigences/sections :** configuration runtime filtrée et séparation entre secrets JWT, OTP et IP.
- **Validations :** tests racine des scripts — 13 réussis ; validation JSON — réussie ; Prettier sur JSON/manifests — réussi ; `git diff --check` — réussi.
- **Points ouverts :** supprimer les anciennes clés du profil local/secret GitHub et générer un secret JWT aléatoire distinct.
- **Suite attendue :** mettre à jour `.env.prod` et `KG_PAY_APP_ENV` avant d'exécuter le workflow de déploiement.
