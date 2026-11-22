# Journal — CDC-01 — 2026-11-23

## Mise à jour — Correction du scan GitGuardian

- **Objectif :** éliminer les mots de passe statiques de la recette SMTP Maildev signalés par GitGuardian sur la PR #7.
- **Statut :** terminé ; PR #9 ouverte et GitGuardian réussi.
- **Résumé :** les mots de passe synthétiques des scénarios CUSTOMER, récupération, super-admin et STAFF sont générés aléatoirement à chaque exécution, au lieu d'être inscrits en clair dans le test. La correction est reprise sur une branche neuve dérivée de `dev`, sans le commit historique signalé ; l'historique de la branche précédente n'a pas été réécrit. Aucun secret de service ou de production n'était concerné.
- **Chemins modifiés :** `services/auth-service/test/maildev.e2e-spec.ts`.
- **Exigences/sections concernées :** CDC-01 §8.7 et §8.9 ; hygiène des secrets pour la recette SMTP.
- **Validations :**
  - `pnpm test:e2e:auth-service:maildev` — réussi, 2 scénarios avec SMTP réel (après génération des mots de passe à l'exécution).
  - `pnpm test:e2e:auth-service:maildev` — réussi à nouveau sur la branche neuve, 2 scénarios ; le schéma PostgreSQL temporaire a été supprimé.
  - `pnpm lint:auth-service` — réussi, aucune erreur ni warning.
  - `pnpm typecheck:auth-service` — réussi.
  - `pnpm exec prettier --check services/auth-service/test/maildev.e2e-spec.ts docs/journal/2026-11-23/CDC-01-identite-acces.md` — réussi.
  - `pnpm exec prettier --check` sur les autres fichiers modifiés — réussi ; `docs/README.md` échoue aussi sur la version de `dev`, donc son formatage préexistant n'a pas été réécrit en bloc.
  - Recherche d'affectations littérales `password: "..."` / `password = "..."` dans le test — aucune trouvée.
  - `git diff --check` — réussi.
  - GitGuardian sur la PR #9 — réussi.
- **Points ouverts :** la recette complète du CDC-01 reste à poursuivre selon les points ouverts du journal du 2026-11-22.
- **Suite attendue :** poursuivre les scénarios d'administration et de sécurité non couverts par cette correction.

## Mise à jour — Transfert frontend et conception des courriels

- **Objectif :** préparer le transfert du cœur 1 à l'agent frontend et consigner le point ouvert de conception des courriels envoyés par le backend.
- **Statut :** terminé pour la documentation ; les interfaces et le design des courriels restent à réaliser.
- **Résumé :** le CDC-01 §10 comporte un nouveau point ouvert sur la présentation/contenu des courriels d'identité. Le code actuel envoie ces messages en texte simple, sans gabarit visuel HTML. L'ADR-002 référence le CDC-01, le contrat `/docs-json`, Swagger, la collection Postman et les limites de recette sans changer le statut de ses propositions.
- **Chemins modifiés :** `docs/cdc/CDC-01-identite-acces.md`, `docs/architecture/ADR-002-applications-frontend-et-routage-mutualise.md`.
- **Exigences/sections concernées :** CDC-01 §4.6, IAM-F-22 à IAM-F-25, §8.10 et §10 point 16 ; ADR-002 §9 et §10.
- **Validations :** `git diff --check` — réussi. Tests et build non exécutés — changements documentaires uniquement.
- **Points ouverts :** le choix de l'identité visuelle, du contenu final et du format des courriels reste à effectuer pendant l'implémentation frontend ; la recette complète du CDC-01 reste partielle.
- **Suite attendue :** l'agent frontend peut démarrer à partir du CDC-01 et de la collection versionnée ; décider le design des courriels avec le porteur du projet avant de finaliser leur présentation.
