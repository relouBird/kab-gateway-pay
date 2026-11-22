# Journal — BASE — 2026-11-22

- **Objectif :** rendre les commandes opérateur ciblées par workspace accessibles et ordonnées dans le `package.json` racine, sans retirer à Turbo les scripts de tâches dont il a besoin.
- **Statut :** terminé.
- **Résumé :** ajout d'alias racine pour le build/démarrage d'`auth-service`, les opérations Prisma, la génération des clés, le bootstrap, le formatage, les validations et les tests. Les commandes de génération des clés et de migration ont été retirées du manifest du service ; les tâches standard `build`, `dev`, `lint`, `typecheck`, `test` et leurs hooks restent dans le workspace. Le générateur de clés écrit maintenant toujours sous `services/auth-service/.local-secrets/`, quel que soit le répertoire courant. Aucune version ni configuration Prisma n'a été modifiée.
- **Chemins modifiés :** `package.json`, `services/auth-service/package.json`, `scripts/generate-signing-keys.cjs`, `README.md`, `AGENTS.md`, `docs/README.md`, `services/auth-service/README.md`, `services/auth-service/AGENTS.md`.
- **Sections concernées :** commandes du workspace et démarrage local d'`auth-service` ; conventions de scripts root/Turbo.
- **Validations :**
  - `pnpm exec prettier --check package.json services/auth-service/package.json scripts/generate-signing-keys.cjs` — réussi.
  - Vérification Node des alias racine et de la suppression des commandes opérateur du manifest `auth-service` — réussie.
  - `pnpm lint:auth-service` — réussi, 0 avertissement et 0 erreur.
  - `pnpm test:auth-service` — réussi, 8 suites et 20 tests.
  - `node --test scripts/generate-env.test.cjs` — réussi, 3 tests.
  - `pnpm auth:keygen`, les commandes de démarrage et les migrations — non exécutés ; ils créent des clés, démarrent un service ou modifient une base, et ne sont pas nécessaires pour valider les alias.
- **Points ouverts :** les futurs workspaces devront recevoir des alias racine ciblés quand leurs commandes opérateur seront définies.
- **Suite attendue :** utiliser les alias racine comme interface courante et garder les scripts de tâches standards dans chaque workspace pour Turbo.
