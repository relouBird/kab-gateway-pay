# Journal — 27 novembre 2026 — ADR-001

- **Objectif :** migrer le backend `auth-service` vers Prisma 7.8.0, simplifier les commandes de base de données et vérifier l’usage de l’adapter PostgreSQL.
- **Statut :** changements locaux terminés ; branche `chore/prisma-7.8` non publiée. La recette PlanetHoster reste à exécuter.
- **Résumé :**
  - Mise à niveau vers Prisma et `@prisma/client` 7.8.0, génération du client dans `src/generated/prisma`, intégrée au build Nest.
  - Ajout de Prisma Config par service : choix du schéma et des migrations, résolution exclusive de l’URL depuis l’environnement de processus, `RUNTIME_ENV_FILE` ou `DATABASE_URL__AUTH_SERVICE` du `.env` racine.
  - Ajout de `@prisma/adapter-pg`; passage explicite du paramètre URL `schema` à l’adapter et de `connection_limit` au pool `pg`.
  - Simplification des commandes locales et documentation de l’usage de `npm exec` avec un chemin absolu de config sur PlanetHoster, sans pnpm sur l’hôte.
  - Mise à jour du workflow, des guides et de Jest pour le client généré par Prisma 7. Le runner e2e crée puis supprime un schéma local aléatoire; une assertion vérifie qu’une recherche ORM retrouve un marqueur présent uniquement dans ce schéma.
  - Les méthodes Prisma existantes (`findUnique`, `findMany`, `create`, `updateMany`, `$transaction`, etc.) restent compatibles; aucun appel métier n’a nécessité de réécriture.
- **Chemins modifiés :** `.github/workflows/deploy-planet-host.yml`, `.gitignore`, `PLANETHOSTER-MIGRATION-TEST.md`, `README.md`, `docs/README.md`, `docs/architecture/ADR-001-monorepo-microservices.md`, `docs/deployment/planethoster-manual-migrations.md`, `package.json`, `pnpm-lock.yaml`, `scripts/prisma-env.cjs`, `scripts/prisma-env.test.cjs`, `scripts/run-prisma.cjs`, `scripts/run-prisma.test.cjs`, `scripts/run-auth-service-e2e.cjs`, `services/auth-service/README.md`, `services/auth-service/package.json`, `services/auth-service/prisma.config.ts`, `services/auth-service/prisma/schema.prisma`, `services/auth-service/jest.config.ts`, `services/auth-service/test/jest-e2e.json`, `services/auth-service/test/auth.e2e-spec.ts`, `services/auth-service/src/auth/access-review.scheduler.ts`, `services/auth-service/src/auth/auth.service.ts`, `services/auth-service/src/auth/auth.service.spec.ts`, `services/auth-service/src/auth/otp.service.ts`, `services/auth-service/src/auth/otp.service.spec.ts`, `services/auth-service/src/database/event-publisher.ts`, `services/auth-service/src/database/prisma.service.ts`, `services/auth-service/src/security/audit.service.ts`, `services/auth-service/src/security/token.service.spec.ts`.
- **Décisions/sections concernées :** ADR-001, configuration isolée par service et génération/build du client; règles d’exploitation des migrations Prisma; CDC-01 inchangé, aucune règle métier ajoutée.
- **Validations exécutées :**
  - Validation Prisma 7.8.0 depuis un répertoire extérieur au dépôt avec `npx` et le chemin absolu de `prisma.config.ts` — réussie.
  - `pnpm build:auth-service`, `pnpm typecheck:auth-service`, `pnpm lint:auth-service` — réussis.
  - `pnpm test:auth-service` — 11 suites, 33 tests réussis.
  - `node --test scripts/prisma-env.test.cjs scripts/run-prisma.test.cjs` — 6 tests réussis.
  - `pnpm test:e2e:auth-service:isolated` — 3 tests réussis; migration appliquée au schéma temporaire local puis schéma supprimé.
  - `pnpm exec prettier --check` sur les sources et documents concernés (hors ADR-001, déjà non conforme dans sa version de base) — réussi; `git diff --check` — réussi.
  - Aucune migration n’a été appliquée à une base distante ou de production; le parcours Maildev n’a pas été exécuté.
- **Point ouvert :** après une première tentative e2e antérieure au correctif de sélection explicite du schéma, un contrôle en lecture seule a trouvé une identité synthétique `auth-e2e-*` dans `public` de la base locale. Aucun nettoyage n’a été fait afin de ne pas supprimer de données sans arbitrage. Confirmer si elle doit être désactivée/nettoyée; aucun secret ni détail personnel n’a été affiché.
- **Suite attendue :** après arbitrage sur ce résidu local, valider la commande manuelle sur l’environnement PlanetHoster de test avec sauvegarde préalable, puis confirmer le redémarrage Node et les limites de connexion du plan mutualisé. Ne pas exécuter de migration de production sans autorisation et sauvegarde.

## Simplification des environnements

- **Objectif :** supprimer les sorties d'environnement distinctes build/runtime et les wrappers Prisma redondants; charger le même environnement dans l'application et Prisma Config.
- **Statut :** terminé localement; recette réelle sur PlanetHoster encore à faire.
- **Résumé :**
  - Le générateur produit un seul `.generated/env/<workspace>.env`, inclut les valeurs requises par le schéma et nettoie les anciens fichiers `.build.env`/`.runtime.env` après génération réussie. `--mode`, `env:build` et `env:runtime` ont disparu.
  - `src/config/environment.ts` charge le fichier pour l'application, le bootstrap et Prisma Config. `KG_PAY_ENV_FILE` est l'unique surcharge générique pour un fichier privé externe.
  - Les wrappers `prisma-env.cjs` et `run-prisma.cjs` et leurs tests sont supprimés; les commandes Prisma du workspace utilisent directement `prisma.config.ts`. Le guide serveur utilise `npx prisma@7.8.0`, vérifié depuis un répertoire extérieur avec le chemin absolu de la config.
  - Le workflow transfère `auth-service.env` séparément de l'archive et, sur une release, retire les deux anciens fichiers de mode côté serveur. Les trois bundles de build ne contiennent aucun fichier `.env`.
  - `pg` est déclaré comme dépendance de production, car l'adapter PostgreSQL est utilisé par `PrismaService` au runtime.
  - Le mapping Jest e2e a été aligné sur `src/generated/prisma`; le délai de démarrage DB est augmenté et le runner isolé force l'arrêt de Jest après les assertions afin que son `finally` supprime le schéma temporaire.
- **Chemins modifiés pour cette simplification :** `.env.example`, `.github/workflows/deploy-planet-host.yml`, `.gitignore`, `PLANETHOSTER-MIGRATION-TEST.md`, `README.md`, `apps/customer-portal/env.schema.json`, `apps/customer-portal/package.json`, `apps/staff-portal/env.schema.json`, `apps/staff-portal/package.json`, `deploy-tools/deploy-release.sh`, `deploy-tools/planet-host-deploy.sh`, `deploy-tools/upload-release.sh`, `docs/README.md`, `docs/architecture/ADR-001-monorepo-microservices.md`, `docs/architecture/ADR-002-applications-frontend-et-routage-mutualise.md`, `docs/architecture/ADR-003-transport-evenements-inter-services.md`, `docs/architecture/ADR-004-stockage-documents-client.md`, `docs/deployment/planethoster-manual-migrations.md`, `docs/recipe/RECETTE-01-identite-acces.md`, `package.json`, `pnpm-lock.yaml`, `scripts/generate-env.cjs`, `scripts/generate-env.test.cjs`, `scripts/run-auth-service-e2e.cjs`, `scripts/run-with-env.cjs`, `scripts/prisma-env.cjs` (suppression), `scripts/prisma-env.test.cjs` (suppression), `scripts/run-prisma.cjs` (suppression), `scripts/run-prisma.test.cjs` (suppression), `services/auth-service/AGENTS.md`, `services/auth-service/README.md`, `services/auth-service/env.schema.json`, `services/auth-service/package.json`, `services/auth-service/prisma.config.ts`, `services/auth-service/src/config/runtime-env.ts` et `runtime-env.spec.ts` (renommés), `services/auth-service/src/config/environment.ts` et `environment.spec.ts`, `services/auth-service/src/main.ts`, `services/auth-service/src/cli/bootstrap-super-admin.ts`, `services/auth-service/test/jest-e2e.json`, `turbo.json`.
- **Exigences/sections :** ADR-001 §5; ADR-002 §14; recette CDC-01 RC1-003. Aucune exigence fonctionnelle du CDC-01 n'a changé.
- **Validations :**
  - `pnpm env:generate` et `pnpm env:generate --target auth-service` — réussis; un fichier par workspace, seuls les trois noms canoniques présents.
  - `node --test scripts/generate-env.test.cjs scripts/bump-version.test.cjs` — 11 tests réussis.
  - `pnpm build:auth-service`, `pnpm run build`, `pnpm typecheck:auth-service`, `pnpm lint:auth-service`, `pnpm test:auth-service` — réussis; tests auth-service : 11 suites/33 tests.
  - `pnpm --filter auth-service exec prisma validate --config=prisma.config.ts` — schéma valide.
  - `npx --yes prisma@7.8.0 validate --config=<chemin absolu>` depuis `$TEMP`, avec `KG_PAY_ENV_FILE` pointant vers le fichier canonique — schéma valide.
  - `pnpm --filter auth-service db:migrate:status` — une migration trouvée, base locale à jour.
  - `pnpm test:e2e:auth-service:isolated` — 3 tests réussis; migration dans un schéma PostgreSQL local aléatoire, ensuite supprimé.
  - `bash -n` via Git Bash sur les trois scripts de déploiement, Prettier ciblé et `git diff --check` — réussis.
  - Vérification des noms sous `.generated/env/` et absence de `.env` dans les bundles des portails — réussies sans afficher de valeurs d'environnement.
- **Points ouverts :** le déploiement, le démarrage Passenger et les commandes `npx` restent à valider sur l'environnement PlanetHoster de test après sauvegarde. Aucune migration distante ni recette Maildev n'a été exécutée. Le résidu synthétique antérieur dans la base locale `public` est conservé conformément à la demande précédente.
- **Suite attendue :** faire la recette des migrations et du bootstrap sur PlanetHoster test; confirmer que Passenger trouve automatiquement `auth-service.env` et que `KG_PAY_ENV_FILE` suffit pour les commandes depuis le clone source.

## Correctif du contrôle du paquet dans GitHub Actions

- **Objectif :** corriger l'échec du job de déploiement après la compilation d'`argon2`.
- **Statut :** correctif local terminé; le job GitHub Actions doit être relancé pour confirmation.
- **Résumé :** Bash développait `$connect` et `$disconnect` dans le JavaScript transmis par `node -e "..."`. Avec `set -u`, `$connect` provoquait `connect: unbound variable`. Le JavaScript est maintenant transmis par un heredoc à délimiteur cité, sans expansion par le shell.
- **Chemins modifiés :** `.github/workflows/deploy-planet-host.yml`, `docs/journal/2026-11-27/ADR-001-monorepo-microservices.md`.
- **Exigences/sections concernées :** contrôle de chargement du paquet `auth-service` dans le workflow de déploiement; aucune règle métier ou exigence CDC modifiée.
- **Validations :** test Bash/Node ciblé confirmant que `prisma.$connect` reste littéral — réussi; `pnpm exec prettier --check .github/workflows/deploy-planet-host.yml` — réussi; `git diff --check` — réussi.
- **Point ouvert :** le workflow complet et la production de l'archive n'ont pas été réexécutés; l'avis npm de nouvelle version n'était pas la cause de l'échec.
- **Suite attendue :** relancer le job GitHub Actions et vérifier qu'il passe le contrôle Prisma puis la suite du packaging/déploiement.
