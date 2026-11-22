# Journal — CDC-01 — 2026-11-23

## Mise à jour — Correction du scan GitGuardian

- **Objectif :** éliminer les mots de passe statiques de la recette SMTP Maildev signalés par GitGuardian sur la PR #7.
- **Statut :** correction et validations locales effectuées ; PR de remplacement en préparation.
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
- **Points ouverts :** le statut GitGuardian de la PR de remplacement reste à vérifier.
- **Suite attendue :** ouvrir la PR de remplacement depuis la branche propre, puis vérifier le résultat du scan GitGuardian.
