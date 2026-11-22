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
| D6 | **`global.env` partagé uniquement au build** (voir §5). À l'exécution, un service ne lit que ses propres variables. | [DÉCISION] |
| D7 | **Communication entre services : événements asynchrones** avec Transactional Outbox. Les appels HTTP synchrones inter-services sont l'exception et doivent être justifiés dans le CDC du cœur concerné. Broker recommandé : RabbitMQ, à confirmer au premier événement inter-services réel. | [PROPOSITION] |
| D8 | **Authentification inter-services stateless** : JWT signés en asymétrique, clé publique exposée par JWKS par `auth-service`, vérification locale par un guard partagé. | [PROPOSITION] |
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
├── env/
│   └── global.env                # variables NON secrètes partagées au build
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
│       ├── service.env           # variables propres non secrètes
│       ├── env.schema.json       # variables attendues et clés partagées autorisées
│       └── Dockerfile
├── scripts/
│   └── build-env.cjs             # fusion global.env + service.env au build
├── pnpm-workspace.yaml
└── turbo.json
```

## 4. Packages partagés : périmètre autorisé

| Package | Contenu autorisé | Contenu interdit |
| --- | --- | --- |
| `@kgpay/config` | Chargement et validation des variables d'environnement (schéma zod), helpers de configuration. | Valeurs de secrets, valeurs spécifiques à un service. |
| `@kgpay/contracts` | **Contrats backend/frontend et interservices** : schémas d'événements (nom, version, payload), schémas/types de transport HTTP (requêtes/réponses), codes d'erreur, catalogue des permissions et des rôles, types d'états normalisés. Les schémas Yup et leurs types inférés sont une proposition d'ADR-002. | Entités de base de données, logique métier ou décisions d'autorisation prises côté interface. |
| `@kgpay/common` | Logger structuré, gestion du `correlationId`, filtre d'exceptions, pagination, helpers d'idempotence, gestion des montants, horloge injectable. | Règles métier d'un cœur. |
| `@kgpay/auth-guard` | Vérification JWT via JWKS, décorateurs `@RequirePermission`, `@RequireStepUp`. | Création de tokens, accès à la base d'`auth-service`. |
| `@kgpay/testing` | Fabriques de données de test, helpers e2e, faux broker. | Code utilisé en production. |

**Règle de dépendance** : `services/*` et `apps/*` peuvent dépendre de `packages/*`. `packages/*` ne dépend jamais de `services/*` ni de `apps/*`. `services/*` ne dépend jamais d'un autre `services/*` ou d'une application. Ces règles sont vérifiées automatiquement (dependency-cruiser ou règle ESLint équivalente) dans la CI.

## 5. Mécanisme `global.env` (partage au build uniquement)

**Objectif :** définir une fois les valeurs communes, sans qu'un service les lise ensuite depuis un fichier partagé.

**Fichiers**

- `env/global.env` : variables **non secrètes** communes (versionné). Pour `auth-service`, `NODE_ENV`, `LOG_LEVEL`, `AUTH_ISSUER` et `AUTH_AUDIENCE` sont partagées.
- `services/<service>/service.env` : variables propres non secrètes (versionné).
- `services/<service>/env.schema.json` : schéma déclarant les clés autorisées et `sharedKeys`.
- Secrets (clés JWT, `DATABASE_URL`, identifiants SMTP, mots de passe de base, `BROKER_URL` avec identifiants) : **jamais dans ces fichiers ni lus par le générateur**. Ils sont injectés par l'orchestrateur ou le gestionnaire de secrets au déploiement, et par un `.env.local` ignoré par Git en développement.

**Déroulé**

1. Chaque service déclare dans `env.schema.json` la liste de ses variables et, parmi elles, celles qu'il accepte d'hériter de `global.env` (`sharedKeys`).
2. `node scripts/build-env.cjs` fusionne `global.env` (limité aux `sharedKeys`) et `service.env` (prioritaire), valide les clés et leur format, puis écrit un `build.env` généré et ignoré dans le dossier du service.
3. Le script racine `pnpm env:build` valide et génère `services/auth-service/build.env`. Le build de `auth-service` copie automatiquement ce fichier vers `dist/build.env` après la compilation Nest (`deleteOutDir`).
4. Au démarrage, `auth-service` charge les secrets locaux de `.env.local` puis `build.env`; les variables déjà fournies par l'environnement d'exécution gardent la priorité. Il valide la configuration et **refuse de démarrer** si une variable manque ou est invalide.
5. Après le build, plus rien ne lit `env/global.env`.

**Règles**

- Une variable absente de `sharedKeys` n'est jamais copiée dans un service.
- Une valeur de `service.env` l'emporte sur `global.env` ; une variable d'environnement réelle l'emporte sur les deux.
- Toute nouvelle variable est ajoutée au schéma, au fichier non secret `service.env` et au README du service dans la même modification.
- Les clés `OTP_HASH_KEY`, `IP_HASH_KEY`, les clés JWT, `DATABASE_URL`, les credentials SMTP et les secrets de clients internes sont exclusivement runtime et sont refusés par le générateur.

## 6. Découpage des cœurs en services [PROPOSITION]

Basé sur l'hypothèse du référentiel v0.3 §8.1, précisé pour des services autonomes. « Création » = moment où le dossier du service apparaît dans `services/`.

| Service | Cœurs hébergés | Remarque | Création |
| --- | --- | --- | --- |
| `auth-service` | 1 Identité et accès | Frontière autonome. Émet les jetons et publie les clés. | Premier |
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
| Cœur 1 — backend | 22 nov. 2026 | Générateur racine `pnpm env:build`, chargement runtime du `build.env`, secrets hors des fichiers de build et relay local d'outbox sans choix de broker. |
