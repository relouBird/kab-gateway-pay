# Journal — 21 novembre 2026 — Base projet

**Statut :** terminé (préparation documentaire)
**Portée :** consignes agents et point d'entrée développeur.

## Actions

- Rédaction de `docs/AGENTS.md`, destiné à être déplacé à la racine avant les travaux de code.
- Création du README développeur à la racine (`README.md`) ; il indique que le monorepo, ses manifests, dépendances, scripts, Git et hooks ne sont pas encore initialisés, et n'invente aucune commande exécutable.
- Mise à jour de `docs/README.md` : suppression d'une référence d'analyse temporaire devenue obsolète et ajout de la convention de journal par date, CDC et ADR.
- Consignes explicites : lire les documents métier lors du bootstrap, ignorer `master/`, ne pas ouvrir secrets, `node_modules` ou artefacts générés, distinguer décisions et propositions, respecter les invariants financiers et de sécurité.
- Documentation du besoin Husky : l'installer après création des vrais manifests/scripts et faire échouer les hooks lorsque les validations réelles échouent.

## Fichiers

- `README.md`
- `docs/AGENTS.md`
- `docs/README.md`

## Validation

- Vérification manuelle de cohérence avec ADR-001, ADR-002, CDC-01 et le README documentaire.
- Aucun build ou test applicatif exécuté : il n'existe pas encore de code ni de manifest KG Pay.

## Suite

1. Déplacer `docs/AGENTS.md` à la racine du projet.
2. Initialiser le dépôt Git et le squelette applicatif à la racine après validation des outils et de l'hébergement cible.
3. Créer les manifests/scripts, puis mettre à jour le README avec les commandes réelles et configurer Husky/CI.

---

# Journal — 21 novembre 2026 — Initialisation locale du dépôt

**Statut :** terminé pour le socle local ; code applicatif et CI non démarrés.
**Objectif :** initialiser Git avec `main` et `dev`, le workspace pnpm/Turborepo, les exclusions locales et une validation Husky réelle.

## Actions

- Initialisation du dépôt local à sa racine ; `main` est la branche principale et `dev` a été créée depuis le commit initial.
- Validation du choix pnpm workspaces + Turborepo et enregistrement dans ADR-001.
- Création du workspace pnpm, de sa configuration Turbo, du lockfile et installation des outils racine : Husky, lint-staged, Prettier et Turbo.
- Ajout de `.gitignore` pour `.agents/`, `master/`, les dépendances, sorties générées et fichiers d'environnement locaux ; `AGENTS.md` à la racine reste versionné.
- Configuration du hook `pre-commit` : formatage des fichiers JavaScript/TypeScript/JSON indexés et contrôle `git diff --cached --check`.
- Mise à jour des README développeur/documentaire sur l'état réel et les commandes disponibles.
- Aucun remote GitHub configuré ; aucun push effectué.

## Fichiers

- `.gitignore`, `.gitattributes`, `.husky/pre-commit`, `.lintstagedrc.json`
- `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `turbo.json`
- `README.md`, `docs/README.md`, `docs/architecture/ADR-001-monorepo-microservices.md`, `docs/architecture/ADR-002-applications-frontend-et-routage-mutualise.md`
- `docs/journal/2026-11-21/BASE.md`

## Validation

- `pnpm add -Dw husky lint-staged prettier turbo` — réussi.
- `lint-staged` 16.4.0 — retenu après vérification de sa compatibilité avec Node.js 22.20.0.
- `pnpm run prepare` — réussi, Husky configuré sur `.husky/_`.
- `pnpm install --frozen-lockfile` — réussi, lockfile à jour.
- `pnpm exec turbo run build --dry=json` — réussi ; configuration reconnue, aucun package ni tâche applicative n'existe encore.
- `git check-ignore -v .agents/skills master/` — réussi ; les deux dossiers sont ignorés.
- `git hook run pre-commit` et hook du commit initial — réussis après suppression des espaces finaux signalés dans ADR-002 et le journal.
- Commit initial `3827c55` créé sur `main` ; `dev` pointe dessus. `git status` propre après création de `dev`, aucun remote configuré.
- Build, lint, typecheck et tests applicatifs : non exécutés, car aucun package applicatif n'existe encore.

## Points ouverts et suite

- Le remote GitHub et toute publication restent en attente d'une URL et d'une demande explicite.
- Compléter lint/typecheck/tests dans Husky lorsque les premiers packages et scripts réels seront définis.
- Arbitrer les points bloquants du CDC-01 avant de figer les contrats d'authentification et de commencer le code applicatif.
