# Journal — CDC-01 — 2026-11-22

- **Objectif :** terminer l'implémentation backend du CDC-01 sur `feature/cdc01-auth-complete` et lancer les validations après l'écriture du code.
- **Statut :** terminé pour le code et les validations locales ; recette avec base de données et Swagger bloquée par l'indisponibilité du démon Docker.
- **Résumé :** implémentation des parcours d'identité, OTP e-mail après mot de passe à chaque connexion, sessions, récupération, invitations et administration des rôles/intégrité des accès. Les contrôles finaux ont corrigé les erreurs TypeScript d'exception HTTP 429, d'import DTO, de permissions et de middleware Express. Les tests Jest ESM importent explicitement `jest` et `@jest/globals` est déclaré comme dépendance de développement. Un paramètre CSRF inutilisé a été supprimé.
- **Chemins modifiés :** `services/auth-service/src/auth/`, `services/auth-service/src/common/`, `services/auth-service/src/config/`, `services/auth-service/src/security/`, `services/auth-service/src/database/`, `services/auth-service/src/email-otp/`, `services/auth-service/src/cli/`, `services/auth-service/src/main.ts`, `services/auth-service/prisma/`, `services/auth-service/test/`, `services/auth-service/package.json`, `pnpm-lock.yaml`, `packages/contracts/`, `scripts/`, `env/`, `docker-compose.dev.yml`, `README.md`, `services/auth-service/README.md`, `docs/cdc/CDC-01-identite-acces.md`, `docs/architecture/ADR-001-monorepo-microservices.md`.
- **Exigences/sections concernées :** CDC-01 — identité, vérification e-mail, MFA par OTP e-mail, sessions, rôles/permissions, audit et Swagger ; RP-10 et RP-17 ; ADR-001 §3 et §5 pour la configuration par environnement.
- **Validations :**
  - `pnpm --filter auth-service typecheck` — réussi.
  - `pnpm --filter auth-service test --runInBand` — réussi, 8 suites et 20 tests.
  - `pnpm --filter auth-service test:e2e --runInBand` — réussi, 1 suite et 1 test de santé `/health`.
  - `pnpm --filter auth-service lint` — réussi.
  - `pnpm --filter auth-service exec prettier --check "src/**/*.ts" "test/**/*.ts"` — réussi.
  - `pnpm --filter auth-service build` — réussi.
  - `pnpm env:build` et `prisma validate` — réussis ; Prisma a généré son client.
  - `docker compose -f docker-compose.dev.yml config --quiet` — réussi.
  - Migration réelle, scénario d'authentification avec PostgreSQL/Maildev et essai Swagger — non exécutés : le démon Docker n'est pas disponible (`dockerDesktopLinuxEngine` absent).
- **Points ouverts :** la récupération d'un compte CUSTOMER après perte d'accès à son e-mail, les paramètres de récupération proposés et le SMTP de production restent à arbitrer. Le broker d'événements n'est pas choisi. L'interface frontend n'est pas incluse dans cette tranche backend.
- **Suite attendue :** démarrer Docker, appliquer les migrations, générer les clés locales, amorcer le GLOBAL_SUPER_ADMIN, puis vérifier dans Swagger l'inscription, la connexion avec OTP, les sessions et les routes protégées.

## Mise à jour — Source d'environnement unique

- **Objectif :** aligner le critère d'acceptation 12 avec la génération des environnements documentée dans ADR-001 §5.
- **Statut :** terminé pour l'alignement documentaire et la validation locale du mécanisme.
- **Résumé :** le critère précise que `auth-service` démarre avec ses variables runtime propres, générées depuis la source centrale, et échoue si sa configuration est invalide. Les détails d'implémentation et les chemins générés sont documentés dans ADR-001 et le README du service.
- **Chemins modifiés :** `docs/cdc/CDC-01-identite-acces.md`, `services/auth-service/README.md`, `services/auth-service/env.schema.json`, `services/auth-service/src/config/runtime-env.ts`, `services/auth-service/package.json`, `scripts/generate-env.cjs`, `scripts/run-with-env.cjs`, `scripts/run-prisma.cjs`, `.env.example`.
- **Exigences/sections concernées :** CDC-01 §11, critère 12 ; ADR-001 §5.
- **Validations :** `pnpm run build`, `pnpm run typecheck`, `pnpm run lint` et `pnpm test` réussis ; le chargeur runtime compilé a lu la sortie générée à la racine. Aucune migration ni recette e2e avec un serveur PostgreSQL/Maildev actif n'a été exécutée.
- **Points ouverts :** configurer localement les valeurs et clés runtime, puis vérifier la migration et les parcours du CDC-01 avec PostgreSQL et Maildev.
- **Suite attendue :** préparer `.env` depuis `.env.example`, démarrer les dépendances selon le mode choisi et reprendre la recette fonctionnelle.
