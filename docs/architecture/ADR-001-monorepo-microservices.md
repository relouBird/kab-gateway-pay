# ADR-001 — Monorepo, microservices NestJS autonomes, sans API Gateway

**Projet :** KG Pay (Kab Gateway Payment)
**Date :** 20 novembre 2026
**Statut :** Proposé, pour validation
**Portée :** transverse à tous les cœurs métier. Ce document est mis à jour cœur après cœur (voir §8).

**Légende des marqueurs**

- **[DÉCISION]** : choix exprimé par le porteur du projet.
- **[PROPOSITION]** : choix proposé pour cadrer le travail, à valider ou à amender.
- **[RÉFÉRENTIEL]** : issu du référentiel fonctionnel v0.3 (`docs/`).

---

## 1. Contexte

Le référentiel v0.3 définit 14 cœurs métier et suggère un regroupement applicatif indicatif (§8.1), sans décision d'architecture. Le développement sera accéléré par des modèles IA : l'architecture doit donc être **simple à expliquer, à contraindre et à vérifier** (frontières nettes, règles d'import explicites).

Enseignement tiré d'un projet précédent (NexusGate) : plusieurs services partageant un même schéma de base et un même client ORM produisent du couplage caché, et une architecture décrite de deux façons (reverse proxy vs `api-gateway` applicatif) crée de l'ambiguïté. Cet ADR tranche ces deux points dès le départ.

## 2. Décisions

| # | Décision | Statut |
| --- | --- | --- |
| D1 | **Un seul dépôt (monorepo)**, géré par pnpm workspaces. Turborepo pour orchestrer build, lint et tests. | [DÉCISION] monorepo, pnpm workspaces et Turborepo |
| D2 | **Microservices NestJS autonomes.** Chaque service se build, se teste, se déploie et démarre seul. | [DÉCISION] |
| D3 | **Pas d'`api-gateway` applicatif.** Chaque service expose sa propre API HTTP. Un reverse proxy (Nginx ou Traefik) peut router les chemins vers les services, mais c'est de l'infrastructure : aucun code métier n'y réside. | [DÉCISION] pas de gateway · [PROPOSITION] reverse proxy infra optionnel |
| D4 | **Une base par service** (instance ou base logique distincte). Un schéma Prisma **par service**, aucun package Prisma partagé. Aucune requête SQL d'un service vers la base d'un autre. | [PROPOSITION] |
| D5 | **Packages partagés strictement techniques** (voir §4). Aucun modèle de domaine, aucun accès base, aucune règle métier dans un package partagé. | [DÉCISION] packages partagés · [PROPOSITION] périmètre |
| D6 | **Une source locale `.env` à la racine**, filtrée et transformée par workspace selon son schéma ; les sorties de build et runtime sont distinctes et générées. À l'exécution, un service ne lit que ses propres variables (voir §5). | [DÉCISION] |
| D7 | **Communication entre services : événements asynchrones** avec Transactional Outbox. Les appels HTTP synchrones inter-services sont l'exception et doivent être justifiés dans le CDC du cœur concerné. Broker recommandé : RabbitMQ, à confirmer au premier événement inter-services réel. | [PROPOSITION] |
| D8 | **Authentification inter-services stateless** : JWT HS256 vérifiés localement avec un secret runtime partagé par `auth-service` et les services consommateurs. Rotation par chevauchement de secrets ; aucun JWKS ni `kid`. | [DÉCISION] porteur, 25 nov. 2026 |
| D9 | **Création progressive** : un service n'est créé dans `services/` que lorsque le CDC de son cœur est validé. | [PROPOSITION] |
| D10 | **Conventions communes** : TypeScript strict, identifiants UUIDv7, horodatages en UTC, montants en entiers (unité mineure) accompagnés du code devise, erreurs normalisées, `correlationId` propagé. | [PROPOSITION] |

## 3. Structure du dépôt

```text
kgpay/
├── README.md                     # guide d'entrée pour humains et IA
├── docs/
│   ├── (référentiels v0.1, v0.2, v0.3 ; template à créer)
│   ├── architecture/
│   │   ├── ADR-001-monorepo-microservices.md
│   │   └── ADR-002-applications-frontend-et-routage-mutualise.md
│   └── cdc/
│       └── CDC-01-identite-acces.md
├── apps/                         # interfaces web (proposition ADR-002)
├── .env                          # source unique locale, ignorée par Git
├── .env.example                  # modèle sans secrets
├── .generated/
│   └── env/
│       ├── auth-service.build.env
│       └── auth-service.runtime.env
├── packages/                     # packages partagés (techniques)
│   ├── config/                   # @kgpay/config
│   ├── contracts/                # @kgpay/contracts
│   ├── common/                   # @kgpay/common
│   ├── auth-guard/               # @kgpay/auth-guard
│   └── testing/                  # @kgpay/testing
├── services/
│   └── auth-service/             # cœur 1 (premier service)
│       ├── src/
│       ├── prisma/schema.prisma  # propre à ce service
│       ├── env.schema.json       # contrat des variables attendues et partagées
│       └── Dockerfile
├── scripts/
│   └── generate-env.cjs         # génération filtrée par workspace et usage
├── pnpm-workspace.yaml
└── turbo.json
```

## 4. Packages partagés : périmètre autorisé

| Package | Contenu autorisé | Contenu interdit |
| --- | --- | --- |
| `@kgpay/config` | Chargement et validation des variables d'environnement (schéma zod), helpers de configuration. | Valeurs de secrets, valeurs spécifiques à un service. |
| `@kgpay/contracts` | **Contrats backend/frontend et interservices** : schémas d'événements (nom, version, payload), schémas/types de transport HTTP (requêtes/réponses), codes d'erreur, catalogue des permissions et des rôles, types d'états normalisés. Les schémas Yup et leurs types inférés sont une proposition d'ADR-002. | Entités de base de données, logique métier ou décisions d'autorisation prises côté interface. |
| `@kgpay/common` | Logger structuré, gestion du `correlationId`, filtre d'exceptions, pagination, helpers d'idempotence, gestion des montants, horloge injectable. | Règles métier d'un cœur. |
| `@kgpay/auth-guard` | Vérification HS256 via le secret partagé runtime et les secrets précédents pendant une rotation ; décorateurs `@RequirePermission`, `@RequireStepUp`. | Création de tokens, accès à la base d'`auth-service`, publication du secret. |
| `@kgpay/testing` | Fabriques de données de test, helpers e2e, faux broker. | Code utilisé en production. |

**Règle de dépendance** : `services/*` et `apps/*` peuvent dépendre de `packages/*`. `packages/*` ne dépend jamais de `services/*` ni de `apps/*`. `services/*` ne dépend jamais d'un autre `services/*` ou d'une application. Ces règles sont vérifiées automatiquement (dependency-cruiser ou règle ESLint équivalente) dans la CI.

## 5. Source unique et génération des environnements

**Objectif :** maintenir un seul fichier d'environnement éditable, tout en ne donnant à chaque service, application ou package que les variables qu'il déclare. Les fichiers générés sont des sorties par cible, pas des configurations supplémentaires à maintenir.

**Fichiers et emplacement**

- `.env` à la racine : source locale unique, ignorée par Git. Elle peut contenir des secrets runtime ; elle ne doit jamais être committée.
- `.env.example` à la racine : modèle versionné, sans credentials ni vraies clés. Il documente les noms de variables et les valeurs locales non secrètes.
- `services/<service>/env.schema.json`, `apps/<app>/env.schema.json` ou `packages/<package>/env.schema.json` : contrat de variables du workspace. Le schéma conserve `properties`, `requiredKeys`, `sharedKeys`, `forbiddenKeys` et `forbiddenKeyPatterns`, et peut déclarer `targetPrefix`, `runtimeOnlyKeys` et `runtimeRequiredKeys`.
- `.generated/env/<workspace>.build.env` : sortie temporaire au build, contenant uniquement les variables autorisées au build.
- `.generated/env/<workspace>.runtime.env` : sortie temporaire au lancement/migration, contenant les variables nécessaires à ce workspace, y compris les secrets runtime autorisés.

Exemple pour le dépôt actuel :

```text
kgpay/
├── .env
├── .env.example
├── .generated/env/
│   ├── auth-service.build.env
│   └── auth-service.runtime.env
└── services/auth-service/env.schema.json
```

Le `.env` racine est la seule source modifiée à la main. Les noms `GLOBAL__<KEY>` alimentent les clés marquées `sharedKeys` ; les autres clés utilisent le suffixe de cible, par exemple `DATABASE_URL__AUTH_SERVICE`. Le générateur valide les clés, les types, les valeurs requises et les clés non reconnues, puis retire le suffixe de source pour produire les clés que le code cible attend (`DATABASE_URL`, `PORT`, etc.). Une valeur présente dans l'environnement du processus a priorité sur celle du fichier racine.

**Séparation build/runtime**

1. `pnpm env:build` génère un fichier `.build.env` par workspace qui déclare un schéma. Les tâches Turbo `build` déclenchent cette génération avant de lancer les builds ; le build direct d'un workspace fait de même.
2. `runtimeOnlyKeys` exclut explicitement les credentials et clés privées de toute sortie de build. Une URL de base contenant un mot de passe, les clés HMAC/JWT, les credentials SMTP et les secrets de clients internes ne sont donc pas copiés dans `dist`, les caches de build ou les bundles frontend.
3. `pnpm env:runtime` génère les `.runtime.env` par workspace. Turbo le lance avant `dev` ; un démarrage ou une migration ciblée génère aussi la sortie propre au service concerné.
4. `auth-service` charge uniquement `.generated/env/auth-service.runtime.env` au démarrage. `run-prisma.cjs` génère puis charge ce même fichier avant la commande Prisma. En production, la même source unique peut être injectée de manière sécurisée avant génération ; elle n'est jamais incluse dans l'artefact compilé.
5. Les deux sorties résident sous `.generated/env/` à la racine du dépôt, sont ignorées par Git et ne sont pas copiées dans `dist`. Elles peuvent être régénérées à tout moment depuis `.env`.

Les noms suffixés permettent de stocker dans un seul `.env` les valeurs de services ou d'applications ayant le même nom de variable sans collision. Les packages partagés n'ont pas d'environnement par défaut : une librairie reçoit sa configuration par le service ou l'application qui l'utilise ; une cible dédiée ne sera ajoutée que si un besoin de build réel l'exige.

## 6. Découpage des cœurs en services [PROPOSITION]

Basé sur l'hypothèse du référentiel v0.3 §8.1, précisé pour des services autonomes. « Création » = moment où le dossier du service apparaît dans `services/`.

| Service | Cœurs hébergés | Remarque | Création |
| --- | --- | --- | --- |
| `auth-service` | 1 Identité et accès | Frontière autonome. Émet les jetons HS256 ; le secret de vérification est fourni par configuration runtime aux services autorisés. | Premier |
| `audit-service` | 13 Audit et traçabilité | Stockage en ajout seul. Peu de logique, très transversal : tôt dans la séquence. | Proche du premier |
| `customer-service` | 2 Cycle de vie client | Dossier, activation, liens client-partenaire, comptes bancaires bénéficiaires. | Étape 1 |
| `partner-service` | 3 Référentiel partenaires, 4 Configuration des intégrations | Deux modules internes distincts (catalogue / secrets et mappings). | Étape 1 |
| `payment-service` | 5 Orchestration des paiements | Opérations, tentatives, callbacks, idempotence. | Étape 1 |
| `ledger-service` | 6 Comptes et comptabilité, 8 Tarification | Le ledger est l'autorité comptable : base isolée, écritures immuables. Tarification en module séparé. | Étape 1 |
| `payout-service` | 7 Versements | Peut démarrer comme module de `payment-service` puis être extrait. | Étape 2 |
| `risk-service` | 9 Risque et conformité | Contrôles de base dès le pilote. | Étape 1 (minimal) |
| `ops-service` | 10 Opérations internes, 11 Rapprochement, 14 Litiges | Back-office : dossiers, approbations, écarts, contestations. | Étape 1 (minimal) |
| `notification-service` | 12 Notifications et reporting | Consomme les événements, ne décide d'aucun état métier. | Étape 1 |

**Principe d'évolution :** un cœur peut être hébergé par un service existant s'il partage sa frontière de données. La séparation en service distinct se décide cœur par cœur, à l'étape du CDC, et se consigne en §8.

## 7. Conséquences et points ouverts

**Bénéfices**

- Frontières explicites, vérifiables par la CI, bien adaptées à la génération de code par IA (un service = un contexte borné).
- Aucun point central de panne applicatif (pas de gateway) ; chaque service évolue et se déploie seul.
- Le ledger et `auth-service` peuvent être durcis indépendamment.

**Coûts assumés**

- Plus d'infrastructure (une base par service, un broker) et de la cohérence à terme entre services : certaines vues (ex. client + solde) se composent côté client ou par lecture dérivée d'événements.
- Sans gateway, chaque service doit appliquer lui-même authentification, limitation de débit et CORS : c'est le rôle de `@kgpay/auth-guard` et de `@kgpay/common`.
- Le secret HS256 permet à tout service vérificateur de fabriquer aussi des jetons. Son partage élargit l'impact d'une compromission ; il doit être limité aux services de confiance, protégé comme un secret de signature et ne jamais être publié comme JWKS.
- Le frontend appelle plusieurs bases d'URL (une par service) ou passe par un reverse proxy d'infrastructure.

**Points ouverts**

1. Choix définitif du broker et de la stratégie de livraison (au moins une fois + consommateurs idempotents).
2. Reverse proxy en production : oui/non, et qui gère TLS et limites globales.
3. Hébergement cible (support des processus persistants, bases séparées, broker) : à confirmer avant la première mise en production.
4. Politique de versionnement des événements et des contrats (compatibilité ascendante, durée de coexistence de deux versions).

## 8. Journal des mises à jour par cœur

| Cœur | Date | Impact sur cet ADR |
| --- | --- | --- |
| 1 — Identité et accès | 20 nov. 2026 | Création de l'ADR. Choix D8 (JWT asymétrique + JWKS) induit par l'absence de gateway. |
| Bootstrap du dépôt | 21 nov. 2026 | Le porteur valide pnpm workspaces et Turborepo ; le dépôt Git local est initialisé sur `main` avec `dev` comme branche d'intégration. |
| Cœur 1 — backend | 22 nov. 2026 | Une source locale unique `.env` à la racine, filtrée selon les schémas de workspace vers `.generated/env/<workspace>.build.env` et `.runtime.env`. Les secrets restent runtime-only ; les démarrages PostgreSQL et Maildev locaux ou Docker sont documentés. Le relay local d'outbox n'impose pas de broker. |
| Cœur 1 — signature des jetons | 25 nov. 2026 | D8 est remplacée par la décision HS256 avec secret runtime partagé et vérification/rotation par chevauchement ; aucun JWKS, `kid` ni fichier de clé RSA. Le risque de fabrication de jetons par un vérificateur compromis est documenté. |
