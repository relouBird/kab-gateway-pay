# Journal — ADR-001 — 2026-11-22

- **Objectif :** remplacer la configuration répartie entre `env/global.env`, `service.env` et `.env.local` par une source locale unique, et faire générer une configuration limitée à chaque workspace et à son usage.
- **Statut :** terminé pour le mécanisme et la documentation ; les essais avec un PostgreSQL/Maildev réellement démarré restent à faire.
- **Résumé :** D6 et ADR-001 §3/§5/§8 décrivent désormais le `.env` racine ignoré par Git, `.env.example` sans secrets et les sorties `.generated/env/<workspace>.build.env` (non secrètes) et `.runtime.env` (secrets runtime autorisés, jamais intégrés à `dist`). Le générateur découvre les schémas de `apps/`, `packages/` et `services/`, valide les clés/valeurs, applique `GLOBAL__<KEY>` aux `sharedKeys`, et retire le suffixe `__<targetPrefix>` des clés propres. Turbo et les scripts de `auth-service` génèrent les fichiers avant les opérations concernées. Le chemin du chargeur runtime a été corrigé pour remonter jusqu'à la racine du dépôt. La documentation précise les options PostgreSQL local avec pgAdmin ou Docker, et Maildev via npm global ou Docker ; Docker Compose reste facultatif.
- **Chemins modifiés :** `.env.example`, `.gitignore`, `AGENTS.md`, `README.md`, `docs/README.md`, `docs/architecture/ADR-001-monorepo-microservices.md`, `docs/cdc/CDC-01-identite-acces.md`, `scripts/generate-env.cjs`, `scripts/generate-env.test.cjs`, `scripts/run-with-env.cjs`, `scripts/run-prisma.cjs`, `scripts/generate-signing-keys.cjs`, `services/auth-service/AGENTS.md`, `services/auth-service/README.md`, `services/auth-service/env.schema.json`, `services/auth-service/package.json`, `services/auth-service/src/config/runtime-env.ts`, `package.json`, `turbo.json`; suppression de `env/global.env`, `services/auth-service/service.env`, `scripts/build-env.cjs` et `scripts/copy-build-env.cjs`.
- **Exigences/sections concernées :** ADR-001 D6 et §§3, 5, 8 ; CDC-01 §11, critère 12 (configuration runtime propre au service).
- **Validations :**
  - `node --test scripts/generate-env.test.cjs` — réussi, 3 tests.
  - `pnpm run build` — réussi.
  - `pnpm run typecheck` — réussi.
  - `pnpm run lint` — réussi.
  - `pnpm test` — réussi, 3 tests du générateur, 8 suites et 20 tests de `auth-service`.
  - Génération build/runtime avec une copie temporaire de `.env.example` et valeurs de test — réussie ; vérification que les clés runtime ne figurent pas dans la sortie build.
  - Chargeur runtime compilé — réussi ; il a lu le fichier généré sous `.generated/env/` à la racine. Les fichiers temporaires `.env` et `.generated/env/*` ont été retirés après les essais.
  - Migration avec vraie base PostgreSQL, démarrage de Maildev et recette HTTP — non exécutés, ces dépendances n'ayant pas été démarrées dans cette tâche.
- **Points ouverts :** le porteur doit renseigner son `.env` local, choisir le démarrage natif ou Docker des dépendances, créer/configurer la base PostgreSQL et générer les clés locales. Aucun secret réel n'a été ajouté ni conservé.
- **Suite attendue :** choisir le mode local de PostgreSQL/Maildev, compléter `.env` depuis `.env.example`, appliquer la migration Prisma et exécuter la recette du CDC-01.
