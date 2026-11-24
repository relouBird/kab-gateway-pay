# Journal — 25 novembre 2026 — CDC-02

- **Objectif :** garder le contrat d'authentification du futur `customer-service` cohérent avec le choix HS256 de CDC-01.
- **Statut :** terminé (mise à jour documentaire ; aucun `customer-service` n'est implémenté).
- **Résumé :** remplacement de la vérification JWKS par la vérification locale HS256 avec le secret runtime partagé et les secrets précédents pendant une rotation.
- **Chemins modifiés :** `docs/cdc/CDC-02-cycle-de-vie-client.md`.
- **Exigences/sections :** tableau d'architecture de travail et critères de contrat d'intégration.
- **Validations :** `git diff --check` — réussi ; revue des références actives JWKS — aucune référence restante dans le contrat courant.
- **Points ouverts :** fournir le même secret aux services autorisés et implémenter cette vérification dans `@kgpay/auth-guard` avant la création du premier service consommateur.
- **Suite attendue :** créer et tester le guard avec le premier service qui consommera des JWT.
