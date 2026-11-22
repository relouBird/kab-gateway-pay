# Journal — CDC-01 — 2026-11-23

## Mise à jour — Correction du scan GitGuardian

- **Objectif :** éliminer les mots de passe statiques de la recette SMTP Maildev signalés par GitGuardian sur la PR #7.
- **Statut :** correction et validations locales effectuées ; publication sur une PR de remplacement en cours.
- **Résumé :** les mots de passe synthétiques des scénarios CUSTOMER, récupération, super-admin et STAFF sont générés aléatoirement à chaque exécution, au lieu d'être inscrits en clair dans le test. Aucun secret de service ou de production n'était concerné. L'historique Git n'a pas été réécrit.
- **Chemins modifiés :** `services/auth-service/test/maildev.e2e-spec.ts`.
- **Exigences/sections concernées :** CDC-01 §8.7 et §8.9 ; hygiène des secrets pour la recette SMTP.
- **Validations :**
  - `pnpm test:e2e:auth-service:maildev` — réussi, 2 scénarios avec SMTP réel (après génération des mots de passe à l'exécution).
  - `pnpm lint:auth-service` — réussi, aucune erreur ni warning.
  - `pnpm typecheck:auth-service` — réussi.
  - `pnpm exec prettier --check services/auth-service/test/maildev.e2e-spec.ts docs/journal/2026-11-23/CDC-01-identite-acces.md` — réussi.
  - Recherche d'affectations littérales `password: "..."` / `password = "..."` dans le test — aucune trouvée.
  - `git diff --check` — réussi.
- **Points ouverts :** le statut GitGuardian de la PR n'a pas encore été revérifié. Le scan peut encore signaler le commit historique qui contenait les anciennes valeurs.
- **Suite attendue :** publier la correction sur une PR de remplacement, puis vérifier le résultat du scan GitGuardian ; ne pas réécrire l'historique sans autorisation explicite.
