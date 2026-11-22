# KG Pay (Kab Gateway Payment)

Plateforme d'agrégation et d'orchestration de paiements : elle centralise plusieurs partenaires financiers (Mobile Money, puis cartes), orchestre les opérations de collecte et de versement, tient une comptabilité interne et assure traçabilité et rapprochement. Premier public visé : des clients **particuliers** accompagnés par l'entreprise. Zone envisagée : CEMAC (couverture exacte à fixer).

> **Ce fichier est le point d'entrée pour toute IA ou tout développeur.** Lis-le en entier avant de produire du code ou de la documentation.

---

## 1. État d'avancement

| Cœur | Intitulé                            | Service                | CDC                                                                             | Code                                                                |
| ---- | ----------------------------------- | ---------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 1    | Identité et accès                   | `auth-service`         | Base V1 validée, points ouverts conservés (`docs/cdc/CDC-01-identite-acces.md`) | Squelette avec liveness `GET /health` ; aucun parcours métier livré |
| 2    | Cycle de vie client                 | `customer-service`     | À faire                                                                         | —                                                                   |
| 3    | Référentiel partenaires et méthodes | `partner-service`      | À faire                                                                         | —                                                                   |
| 4    | Configuration des intégrations      | `partner-service`      | À faire                                                                         | —                                                                   |
| 5    | Orchestration des paiements         | `payment-service`      | À faire                                                                         | —                                                                   |
| 6    | Comptes et comptabilité interne     | `ledger-service`       | À faire                                                                         | —                                                                   |
| 7    | Versements                          | `payout-service`       | À faire                                                                         | —                                                                   |
| 8    | Tarification                        | `ledger-service`       | À faire                                                                         | —                                                                   |
| 9    | Risque et conformité                | `risk-service`         | À faire                                                                         | —                                                                   |
| 10   | Opérations internes                 | `ops-service`          | À faire                                                                         | —                                                                   |
| 11   | Rapprochement                       | `ops-service`          | À faire                                                                         | —                                                                   |
| 12   | Notifications et reporting          | `notification-service` | À faire                                                                         | —                                                                   |
| 13   | Audit et traçabilité                | `audit-service`        | À faire                                                                         | —                                                                   |
| 14   | Litiges et contestations            | `ops-service`          | À faire                                                                         | —                                                                   |

Mettre à jour ce tableau à chaque validation de CDC et à chaque livraison de code.

## 2. Sources de vérité et ordre de lecture

Les documents sont dans `docs/`. En cas de conflit, l'ordre de priorité est le suivant :

1. **Le code et les tests**, pour ce qui est effectivement implémenté.
2. **Le CDC du cœur concerné** (`docs/cdc/CDC-XX-*.md`), pour ce qui doit être construit.
3. **Les ADR** (`docs/architecture/`), pour les décisions d'architecture, dont le cadrage frontend et le routage proposés dans ADR-002.
4. **Le référentiel v0.3** (`docs/KG Pay – Core Business Version-0.3.md`), pour la vision, le vocabulaire, les règles RP et les diagrammes.
5. Les versions v0.1 et v0.2 : **historique uniquement**, ne pas les utiliser pour décider.

Le dépôt Git local est initialisé à sa racine sur `main`, avec une branche `dev` pour l'intégration et des branches de travail dérivées de `dev`. Le workspace pnpm/Turborepo est en place. `auth-service` est en cours de bootstrap ; aucun parcours métier d'identité ni frontend applicatif n'est encore livré. Aucun remote GitHub n'est configuré.

Le template de dossier est mentionné dans des documents existants, mais aucun fichier de template n'est présent dans `docs/` à la date de cette revue. Ne pas supposer qu'il existe ; le créer ou corriger les références avant de l'utiliser.

**Ordre de lecture pour une nouvelle tâche :** ce README → ADR-001 → ADR-002 si la tâche touche au frontend ou au déploiement → référentiel v0.3 (§2 principes, §6.1 objets à ne pas fusionner) → CDC du cœur concerné → code existant.

**Pour une tâche frontend :** lire l'ADR-002 puis le CDC du cœur concerné. Le frontend et le backend d'un même cœur sont décrits dans le même CDC ; ne pas créer un CDC global séparé pour le frontend.

Un document distingue toujours ce qui est **[RÉFÉRENTIEL]**, **[DÉCISION]** (du porteur du projet) et **[PROPOSITION]** (à valider). Ne jamais présenter une proposition comme une décision, ni un point ouvert comme déjà implémenté.

## 3. Architecture en bref

Détails et justifications : `docs/architecture/ADR-001-monorepo-microservices.md`.

- **Monorepo pnpm workspaces + Turborepo** (outillage validé au bootstrap), **microservices NestJS autonomes**, **aucune API Gateway applicative**.
- **Une base par service.** Aucun accès à la base d'un autre service. Un schéma Prisma par service, aucun package Prisma partagé.
- **Communication** : événements asynchrones avec Transactional Outbox ; appels HTTP inter-services seulement s'ils sont justifiés dans un CDC.
- **Authentification** : `auth-service` émet des JWT asymétriques ; les autres services les vérifient localement via JWKS avec `@kgpay/auth-guard`.
- **Packages partagés** (`packages/`) : strictement techniques (`config`, `contracts`, `common`, `auth-guard`, `testing`). `contracts` peut fournir les schémas/types de transport communs au frontend et au backend ; jamais de modèle de persistance ni de décision métier côté interface.
- **Frontend** : interfaces cadrées cœur par cœur dans les CDC correspondants ; voir [ADR-002](./architecture/ADR-002-applications-frontend-et-routage-mutualise.md) pour les propositions d'organisation, de contrats partagés et de routage.
- **Un service n'est créé que lorsque le CDC de son cœur est validé.**

```text
kgpay/
├── docs/            # référentiels, ADR, CDC (template à créer)
├── apps/            # applications web (cible proposée dans ADR-002)
├── env/global.env   # variables non secrètes partagées AU BUILD
├── packages/        # @kgpay/config, contracts, common, auth-guard, testing
├── services/        # un dossier par microservice
└── scripts/         # build-env.ts, etc.
```

## 4. Règles impératives pour l'IA

**À faire**

- Lire le CDC du cœur avant de coder, et citer les identifiants (`IAM-F-05`, `RP-10`…) dans les commits, tests et commentaires pertinents.
- Respecter les frontières : un cœur ne réalise pas ce que le référentiel lui interdit (section « Frontières » de chaque cœur).
- Écrire les tests **en même temps** que le code, en partant des critères d'acceptation du CDC.
- Signaler toute ambiguïté, contradiction ou point manquant au lieu de le résoudre en silence.
- Mettre à jour le CDC et son « delta » quand l'implémentation révèle un écart.
- Écrire les identifiants de code, routes, noms d'événements et de tables en **anglais** ; la documentation en **français**.

**À ne pas faire**

- Ne pas inventer d'endpoint, de règle, de valeur chiffrée ou de décision absents des documents. Les valeurs par défaut des CDC sont des propositions configurables.
- Ne pas créer d'`api-gateway`, de base partagée entre services, ni d'import d'un service vers un autre.
- Ne pas mettre de secret dans `global.env`, `service.env`, les journaux, les événements ou les messages d'erreur.
- Ne pas contourner les invariants métier de la section 5, même « temporairement ».
- Ne pas supposer qu'une fonctionnalité décrite est implémentée : vérifier le code.

## 5. Invariants métier à ne jamais violer

Issus du référentiel v0.3 (§2, §6.1, règles RP) :

1. **Opération ≠ tentative.** Une `FINANCIAL_OPERATION` est l'intention métier ; chaque échange technique avec un partenaire est une `PAYMENT_ATTEMPT` historisée.
2. **Un timeout n'est ni un succès ni un échec.** L'état est `INCONNUE` ; toute nouvelle exécution équivalente est bloquée tant que le résultat n'est pas établi (RP-02).
3. **Statut partenaire ≠ statut comptable.** Le succès d'un appel externe et la comptabilisation sont deux faits distincts.
4. **Idempotence partout** : une requête rejouée ou un callback rejoué ne produit aucun nouvel effet financier (RP-01).
5. **Écritures comptables immuables** : on corrige par contre-passation tracée, jamais par modification ou suppression (RP-13) ; chaque journal est équilibré (partie double).
6. **Annuler ≠ rembourser ≠ extourner.** Trois notions distinctes (référentiel §2).
7. **Séparation des responsabilités** : l'approbateur est différent du demandeur et de l'instructeur (RP-10).
8. **Un événement n'est publié qu'après persistance** par le domaine propriétaire (RP-14).
9. **Toute action sensible est auditée** (RP-17).
10. **Le rapprochement constate, il ne réexécute jamais** une opération.
11. **CUSTOMER ≠ PAYER ≠ bénéficiaire** ; la relation est portée par l'opération.
12. **Partenaire ≠ méthode de paiement ≠ endpoint technique.**

## 6. Conventions

- TypeScript en mode strict ; NestJS ; Prisma par service.
- Identifiants UUIDv7. Dates et heures en UTC (ISO 8601).
- **Montants** : entiers dans l'unité mineure de la devise, toujours accompagnés du code devise. Jamais de nombres flottants pour de l'argent.
- Erreurs normalisées (code stable + message), `correlationId` propagé de bout en bout.
- États : utiliser le vocabulaire normalisé du référentiel v0.3, sans en inventer de variantes. La v0.1 et la v0.2 restent historiques.
- Événements : nom au passé (`IdentityRegistered`), versionnés, schémas dans `@kgpay/contracts`.
- Permissions : `domaine.ressource.action`, déclarées dans `@kgpay/contracts`.

## 7. Variables d'environnement

- `env/global.env` : variables **non secrètes** communes ; copiées dans un service **uniquement au build**, et seulement celles qu'il déclare dans `sharedKeys` (`env.schema.ts`).
- `services/<service>/service.env` : variables propres non secrètes.
- **Secrets** : injectés au déploiement ou via `.env.local` (ignoré par Git).
- Au démarrage, un service valide sa configuration (`@kgpay/config`) et **refuse de démarrer** si elle est invalide.
- À l'exécution, un service ne lit jamais `env/global.env`.

## 8. Commandes disponibles et cibles

Commandes de validation actuellement disponibles :

```bash
pnpm install
pnpm run build
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm --filter auth-service test:e2e
```

`pnpm env:build` et les vérifications de dépendances inter-packages restent indisponibles : leurs scripts et packages n'existent pas encore.

## 9. Workflow d'un cœur métier

1. **CDC** rédigé à partir du référentiel et du template, avec ses points ouverts.
2. **Validation** par le porteur du projet (les propositions deviennent décisions ou sont amendées).
3. **Découpage** en tâches de développement, chacune rattachée à des identifiants d'exigences.
4. **Code + tests** par incréments, en respectant les invariants de la section 5.
5. **Recette** selon les critères globaux du CDC.
6. **Mise à jour documentaire** : delta du cœur dans le CDC suivant, mise à jour d'ADR-001 (§8), du tableau d'avancement et, si besoin, du référentiel.

## 10. Journal des travaux

Chaque journée de travail est tracée dans `docs/journal/YYYY-MM-DD/`, avec un fichier séparé par CDC ou ADR modifié et `BASE.md` pour les changements transversaux. Chaque entrée précise les fichiers touchés, exigences/sections concernées, validations réellement exécutées, points ouverts et suite attendue. Ne pas créer de journal vide pour les catégories non concernées.

## 11. Définition de « terminé »

Une tâche est terminée lorsque : les critères d'acceptation des exigences visées sont satisfaits et testés ; la CI (build, lint, tests, règles de dépendance) passe ; aucun secret ou donnée sensible n'est exposé ; les contrats (`@kgpay/contracts`) et la documentation sont à jour ; les écarts avec le CDC sont consignés.

## 12. Modèle de prompt pour une tâche de développement

```text
Contexte : projet KG Pay. Lis d'abord README.md, docs/architecture/ADR-001-*.md et
docs/cdc/CDC-<NN>-*.md. Le CDC prévaut sur le référentiel pour ce qui est à construire.

Tâche : implémenter <IDs d'exigences, ex. IAM-F-05 et IAM-F-06> dans <service>.

Contraintes : respecter les invariants (README §5) et les règles de dépendance (ADR-001 §4).
N'invente aucun endpoint, règle ou valeur. Si le CDC est ambigu ou contradictoire,
arrête-toi et pose la question.

Livrables : code, tests couvrant les critères d'acceptation, mise à jour des contrats
partagés si nécessaire, liste des écarts ou questions ouvertes.
```
