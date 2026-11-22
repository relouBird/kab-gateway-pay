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

## Mise à jour — Recette intégrée, contrat OpenAPI et collection

- **Objectif :** tester les parcours backend principaux sur PostgreSQL isolé, corriger les défauts révélés, et fournir un contrat/collection utilisables par l'agent frontend.
- **Statut :** terminé pour les parcours fonctionnels intégrés CUSTOMER, récupération et STAFF ; la recette complète du CDC-01 reste à poursuivre.
- **Résumé :** ajout d'un runner e2e qui refuse les bases distantes, crée un schéma PostgreSQL au nom aléatoire, applique la migration et le supprime en fin de test. Les transports OTP et invitation sont remplacés par des boîtes mémoire afin de récupérer les codes/jetons sans dépendre de l'API Maildev. Trois scénarios vérifient l'inscription CUSTOMER, l'absence de session avant OTP, la vérification d'adresse, le login MFA, les sessions, le step-up de changement de téléphone, CSRF, rotation refresh et logout ; la récupération du mot de passe avec réponses non énumérables et révocation de sessions ; l'amorçage du super-admin, l'invitation STAFF à usage unique, le MFA STAFF et le refus d'une permission d'administration non attribuée. La recette a révélé que Prisma ne peut pas décoder le retour `void` de `pg_advisory_xact_lock` via `$queryRaw` ; les 23 appels renvoient désormais une valeur texte décodable. Le filtre d'exception journalise uniquement les codes d'erreur Prisma/PostgreSQL non sensibles. Les correctifs antérieurs de cette tâche acceptent la configuration de clés publiques facultative vide, fiabilisent l'appel Prisma sous Windows et décrivent correctement les combinaisons de sécurité OpenAPI. La collection Postman a été générée depuis `/docs-json` et vérifiée contre ses opérations.
- **Chemins modifiés :** `package.json`, `scripts/run-prisma.cjs`, `scripts/run-auth-service-e2e.cjs`, `services/auth-service/src/auth/auth.service.ts`, `services/auth-service/src/auth/otp.service.ts`, `services/auth-service/src/auth/access-review.scheduler.ts`, `services/auth-service/src/common/api-exception.filter.ts`, `services/auth-service/src/common/openapi-security.ts`, `services/auth-service/src/common/openapi-security.spec.ts`, `services/auth-service/src/main.ts`, `services/auth-service/src/security/token.service.ts`, `services/auth-service/src/security/token.service.spec.ts`, `services/auth-service/test/auth.e2e-spec.ts`, `services/auth-service/collections/auth-service.postman_collection.json`, `services/auth-service/README.md`, `README.md`, `docs/README.md`.
- **Exigences/sections concernées :** CDC-01 IAM-F-01, IAM-F-04, IAM-F-10, IAM-F-11 et IAM-F-14 ; §8.4, §8.9 et §11 ; découverte des contrats API et préparation du frontend. La recette ne couvre pas encore toutes les exigences du §11.
- **Validations :**
  - `pnpm test:auth-service` — réussi, 9 suites et 25 tests.
  - `pnpm lint:auth-service` — réussi, aucune erreur ni warning.
  - `pnpm typecheck:auth-service` — réussi.
  - `pnpm build:auth-service` — réussi.
  - `pnpm test:e2e:auth-service` — réussi, 1 test de liveness ; les 3 scénarios d'intégration sont ignorés dans cette commande lorsqu'aucun schéma isolé n'est transmis.
  - `pnpm test:e2e:auth-service:isolated` — réussi, 3 scénarios métier ; migration appliquée puis schéma temporaire supprimé.
  - `/docs-json` — 38 opérations observées ; la collection Postman contient exactement ces 38 couples méthode/route, sans opération manquante ou supplémentaire, et ses corps JSON/variables ont été vérifiés.
  - Un premier lancement des validations a échoué car le serveur temporaire gardait verrouillé le moteur Prisma Windows ; seuls le serveur de test et l'instance Maildev temporaire sur `1026/1081` ont été arrêtés avant le nouveau lancement réussi. L'instance Maildev préexistante sur `1025/1080` n'a pas été arrêtée.
- **Limites et points ouverts :** l'e-mail est simulé en mémoire ; ni livraison SMTP réelle ni récupération du message dans Maildev n'ont été validées. Les parcours STAFF/invitation, récupération/changement de mot de passe, verrouillages, administration des rôles et scénarios de sécurité du CDC restent à tester. L'outbox/broker n'a pas été éprouvé en panne. La CLI `auth:bootstrap` après déploiement n'est pas testée ; son usage exige un terminal interactif, l'artefact compilé et l'environnement runtime attendu. Swagger et `/docs-json` sont destinés au développement/test et sont désactivés en production. Le frontend reste à construire ; les points ouverts du CDC sur la récupération CUSTOMER, le SMTP de production, les paramètres OTP et les cookies/CSRF restent inchangés.
- **Suite attendue :** importer la collection Postman, exécuter les parcours restant via la boîte Maildev réelle, puis transmettre au frontend le contrat `/docs-json` et les points ouverts du CDC-01. Ne pas déclarer la recette CDC-01 complète avant ces scénarios supplémentaires.
