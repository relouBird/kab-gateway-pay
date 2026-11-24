# Journal — 25 novembre 2026 — CDC-01

- **Objectif :** simplifier le runtime JWT d'`auth-service` après la décision du porteur d'utiliser HS256 avec un secret partagé.
- **Statut :** terminé localement ; déploiement PlanetHoster non exécuté.
- **Résumé :** émission et vérification des access tokens et preuves step-up en HS256 ; validation d'un secret base64url d'au moins 64 caractères ; prise en charge facultative des secrets précédents pour le chevauchement de rotation. Retrait de l'endpoint JWKS et de `kid`. Mise à jour du contrat fonctionnel, de la recette, du contrat d'authentification consommé par le cœur 2 et de la collection Postman (37 opérations).
- **Chemins modifiés :** `services/auth-service/src/security/token.service.ts`, `services/auth-service/src/security/token.service.spec.ts`, `services/auth-service/src/auth/auth.controller.ts`, `services/auth-service/src/auth/auth.module.ts`, `services/auth-service/env.schema.json`, `services/auth-service/collections/auth-service.postman_collection.json`, `services/auth-service/README.md`, `docs/cdc/CDC-01-identite-acces.md`, `docs/cdc/CDC-02-cycle-de-vie-client.md`, `docs/recipe/RECETTE-01-identite-acces.md`.
- **Exigences/sections :** IAM-F-05 et IAM-F-06 ; CDC-01 §2, §4, §8.2, §8.4, §8.7, §8.9 et §11 ; CDC-02 contrat d'authentification et recette.
- **Validations :**
  - `pnpm test:auth-service` — réussi, 11 suites et 32 tests.
  - `pnpm --filter auth-service typecheck` — réussi.
  - `pnpm --filter auth-service exec oxlint --type-aware ...` — réussi sur les fichiers source modifiés.
  - `node --test scripts/generate-env.test.cjs scripts/run-prisma.test.cjs scripts/bump-version.test.cjs` — réussi, 13 tests.
  - Prettier sur les fichiers source, JSON et workflow modifiés — réussi ; les documents Markdown n'ont pas été reformattés globalement.
  - Validation JSON du schéma et de la collection Postman — réussie ; 37 requêtes.
  - `git diff --check` — réussi.
  - Déploiement PlanetHoster — non exécuté ; validation GitHub Actions/`actionlint` — non exécutée.
- **Points ouverts :** remplacer les anciennes variables RSA/JWKS dans `.env.prod`, renseigner le nouveau `JWT_SIGNING_SECRET__AUTH_SERVICE`, puis actualiser le secret GitHub `KG_PAY_APP_ENV`. Les services vérificateurs futurs devront recevoir ce secret et pourront eux aussi fabriquer des JWT ; `@kgpay/auth-guard` n'est pas encore implémenté.
- **Suite attendue :** mettre à jour le profil de production, valider la génération runtime sur GitHub puis effectuer la recette de déploiement sur PlanetHoster. Les JWT RS256 existants devront être renouvelés.
