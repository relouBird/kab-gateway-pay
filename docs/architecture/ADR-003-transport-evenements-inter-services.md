# ADR-003 — Transport des événements entre services

**Projet :** KG Pay (Kab Gateway Payment)
**Date :** 23 novembre 2026
**Statut :** Proposé, à valider **avant le code du CDC-02**
**Portée :** backend, tous les cœurs. Précise ADR-001 D7 (événements asynchrones + Transactional Outbox, broker « à confirmer au premier événement inter-services réel »).
**Déclencheur :** le CDC-02 est le premier cœur qui **consomme** un événement d'un autre service (`IdentityRegistered`, produit par `auth-service`).

**Légende :** **[DÉCISION]** du porteur · **[PROPOSITION]** à valider · **[POINT OUVERT]**.

---

## 1. Contexte

- `auth-service` écrit déjà ses événements dans une outbox ; son relay local se contente de journaliser noms et identifiants (CDC-01 §8.1). Rien n'est encore livré à un consommateur.
- ADR-001 D7 recommande RabbitMQ sans l'imposer. ADR-002 §5 laisse **ouverte** la capacité de l'hébergement mutualisé à faire tourner des processus persistants, et rien ne garantit qu'un broker y soit disponible.
- Contrainte constante : chaque service reste autonome (ADR-001 D2) ; aucun service ne lit la base d'un autre (D4).

## 2. Options étudiées

| Option | Principe | Avantages | Limites |
| --- | --- | --- | --- |
| A. Broker (RabbitMQ) | L'outbox publie vers un broker ; les consommateurs s'abonnent. | Standard, découplage fort, files durables, rejeu. | Infrastructure supplémentaire à héberger, superviser, sauvegarder ; incertain sur hébergement mutualisé. |
| B. Livraison HTTP signée depuis l'outbox | Le relay du producteur envoie chaque événement à un endpoint interne du consommateur, avec réessais. | Aucune infrastructure en plus ; fonctionne partout où deux services Node se parlent ; simple à tester localement. | Le producteur connaît les URL des consommateurs ; la montée à beaucoup de consommateurs coûte plus qu'avec un broker. |
| C. Redis Streams | Redis sert de bus. | Léger. | Reste une dépendance d'infrastructure ; durabilité à configurer. |
| D. Base partagée | Lecture directe. | — | **Écartée** : contraire à ADR-001 D4. |

## 3. Décision proposée

| # | Décision | Statut |
| --- | --- | --- |
| E1 | Le **contrat d'événement** est indépendant du transport : enveloppe unique, schémas versionnés dans `@kgpay/contracts`, livraison **au moins une fois**, consommateurs **idempotents**. | [PROPOSITION] |
| E2 | Un port `EventTransport` (dans `@kgpay/common`) isole le transport. Deux adaptateurs sont prévus : `HttpSignedTransport` (V1) et `AmqpTransport` (cible quand l'hébergement le permet). Passer de l'un à l'autre ne modifie ni les producteurs, ni les consommateurs. | [PROPOSITION] |
| E3 | **V1 : option B.** C'est le choix à plus faible regret tant que l'hébergement n'est pas confirmé. RabbitMQ reste la cible si l'hébergement offre un broker ; le contrat (E1) rend la migration mécanique. | [PROPOSITION] — à confirmer par le porteur |
| E4 | Chaque consommateur expose `POST /internal/events`, **jamais** routé publiquement (le reverse proxy d'infrastructure bloque `/internal/*`). | [PROPOSITION] |
| E5 | Authentification service-à-service : signature HMAC-SHA-256 du corps et d'un horodatage, un secret par couple producteur/consommateur, chargé depuis le fichier d'environnement propre au service (ADR-001 §5). Fenêtre de tolérance d'horloge configurable ; rejeu neutralisé par la déduplication sur `eventId`. | [PROPOSITION] |
| E6 | Le consommateur tient une table `inbox_event` (`eventId` unique) : un événement déjà traité répond succès sans nouvel effet. | [PROPOSITION] |
| E7 | Ordre : le relay livre **séquentiellement par agrégat** (`aggregateId`, `sequence` croissante). Un consommateur qui reçoit une séquence manquante répond « différé » ; le producteur réessaie. Aucun ordre global n'est garanti ni requis. | [PROPOSITION] |
| E8 | Réessais avec délai exponentiel plafonné ; au-delà d'un nombre d'essais configurable, l'événement passe en `DEAD` dans l'outbox, une alerte est émise et une commande d'exploitation permet le rejeu manuel. Aucun événement n'est supprimé. | [PROPOSITION] |
| E9 | Le registre « type d'événement → consommateurs » est déclaré dans `@kgpay/contracts` ; les URL internes des consommateurs sont de la configuration non secrète (clés partagées déclarées dans `sharedKeys`). | [PROPOSITION] |

## 4. Enveloppe d'événement

```json
{
  "eventId": "<uuidv7>",
  "type": "IdentityRegistered",
  "version": 1,
  "occurredAt": "2026-11-23T10:00:00.000Z",
  "producer": "auth-service",
  "aggregateType": "Identity",
  "aggregateId": "<identityId>",
  "sequence": 3,
  "correlationId": "<id>",
  "payload": { }
}
```

**Règles de contenu** (hérite de CDC-01 §8.7) : aucun secret, aucun OTP, aucun jeton ; les données personnelles sont limitées au strict nécessaire déclaré dans le schéma du `payload`, et chaque ajout de donnée personnelle dans un payload est justifié dans le CDC du cœur producteur.

**Cycle de vie dans l'outbox :** `PENDING` → `DELIVERED` | `DEAD`. Un événement n'est écrit qu'avec le changement d'état qu'il décrit, dans la même transaction (RP-14).

## 5. Conséquences

**Positives**

- Le premier flux réel (`IdentityRegistered` → `customer-service`) se fait sans nouvelle infrastructure.
- Les tests de contrat peuvent rejouer l'enveloppe sans broker (`@kgpay/testing`).
- Aucun changement de code métier si un broker est adopté plus tard.

**Coûts assumés**

- Les producteurs connaissent leurs consommateurs (via le registre) : à surveiller quand le nombre de consommateurs d'un même événement augmente.
- Il faut gérer des secrets HMAC par couple de services.
- Il faut exposer et protéger `/internal/*` (règle de routage à ajouter à l'infrastructure).

## 6. Points ouverts

1. Confirmation de E3 par le porteur, puis confirmation de l'hébergement (ADR-002 §5).
2. Valeurs par défaut des réessais, du nombre d'essais avant `DEAD` et de la tolérance d'horloge.
3. Supervision : où lire les événements `DEAD` avant l'existence d'un tableau de bord (cœur 12).
4. Politique de versionnement des événements : durée de coexistence de deux versions (ADR-001 §7 point 4).

## 7. Mises à jour induites sur d'autres documents

| Document | Mise à jour |
| --- | --- |
| ADR-001 | D7 : renvoyer vers cet ADR pour le transport ; journal §8. |
| CDC-01 §8.1 | « Événements » : le relay local journalisant devient l'adaptateur de développement ; ajouter `HttpSignedTransport`. |
| `@kgpay/contracts` | Ajouter enveloppe, registre des consommateurs et schémas des événements existants. |
