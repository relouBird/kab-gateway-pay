# Journal — ADR-002 — 2026-11-23

## Mise à jour — Transfert du backend auth-service au frontend

- **Objectif :** rendre visibles dans l'ADR-002 les ressources backend du cœur 1 disponibles pour démarrer le frontend.
- **Statut :** terminé.
- **Résumé :** ajout d'une section d'information de mise en œuvre référençant le CDC-01, `/docs-json`, Swagger et la collection Postman de 38 opérations. La section décrit les parcours MFA et la portée réelle de la recette, sans promouvoir les orientations encore marquées [PROPOSITION] au rang de décision. Elle signale le point ouvert CDC-01 §10.16 : la conception visuelle des courriels d'authentification/invitation ; le code backend envoie actuellement du texte simple.
- **Chemins modifiés :** `docs/architecture/ADR-002-applications-frontend-et-routage-mutualise.md`.
- **Exigences/sections concernées :** ADR-002 §9-10 ; CDC-01 §4.6, IAM-F-22 à IAM-F-25, §8.10 et §10.16.
- **Validations :** `git diff --check` — réussi. Tests et build non exécutés — changements documentaires uniquement.
- **Points ouverts :** les propositions D2-D11 de l'ADR-002 gardent leur statut ; la conception et la validation visuelles des courriels restent à faire.
- **Suite attendue :** démarrer les interfaces du cœur 1 depuis le CDC-01 ; confronter la collection Postman au `/docs-json` courant si l'API évolue.
