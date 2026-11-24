# Journal — 25 novembre 2026 — ADR-001

- **Objectif :** enregistrer le choix de signature interservices HS256 et ses conséquences de sécurité.
- **Statut :** terminé.
- **Résumé :** D8 devient une décision de vérification HS256 locale au moyen d'un secret partagé runtime, avec chevauchement des secrets en rotation et sans JWKS ni `kid`. Le risque de fabrication de JWT par tout service qui possède le secret est explicité.
- **Chemins modifiés :** `docs/architecture/ADR-001-monorepo-microservices.md`, `docs/README.md`.
- **Décisions/sections :** D8, §4 (responsabilité future de `@kgpay/auth-guard`), §6 (frontière d'`auth-service`), §7 (coût de sécurité), §8 (historique).
- **Validations :** `git diff --check` — réussi ; références actives d'architecture mises à jour.
- **Points ouverts :** les futurs consommateurs doivent utiliser un stockage runtime privé et limiter la distribution du secret aux services de confiance.
- **Suite attendue :** valider le contrat du guard lors de l'implémentation du premier service consommateur.
