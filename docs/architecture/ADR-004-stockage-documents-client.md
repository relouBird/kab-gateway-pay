# ADR-004 — Stockage et protection des documents client

**Projet :** KG Pay (Kab Gateway Payment)
**Date :** 23 novembre 2026
**Statut :** Proposé, à valider **avant le code du CDC-02**
**Portée :** backend de `customer-service` (cœur 2), réutilisable par d'autres cœurs qui manipuleront des pièces (litiges, cœur 14).

**Légende :** **[DÉCISION]** du porteur · **[PROPOSITION]** à valider · **[POINT OUVERT]**.

---

## 1. Contexte

Le cœur 2 collecte des justificatifs d'identité et de domicile : ce sont des **données personnelles sensibles**. Le référentiel v0.3 impose traçabilité, historique non écrasé et séparation des responsabilités ; ADR-002 D10 interdit la suppression physique des preuves financières et d'audit. L'hébergement cible (mutualisé) et les durées légales de conservation ne sont pas confirmés.

## 2. Décisions proposées

| # | Décision | Statut |
| --- | --- | --- |
| S1 | Un port `DocumentStore` isole le stockage. Adaptateurs : **système de fichiers** hors racine publique (développement et hébergement contraint) et **stockage objet compatible S3** (cible dès que disponible). Les métadonnées restent dans la base de `customer-service`. | [PROPOSITION] |
| S2 | **Chiffrement applicatif au repos** : chaque document est chiffré (AES-256-GCM) avec une clé de données propre, elle-même chiffrée par une clé maîtresse injectée à l'exécution (`runtimeOnlyKeys`). L'identifiant de clé est stocké pour permettre la rotation. Le fournisseur de stockage ne voit que du chiffré. | [PROPOSITION] |
| S3 | **Aucune URL publique.** Le contenu est servi par `customer-service` après contrôle d'identité, de permission **et** de propriété, avec `Cache-Control: no-store` et `X-Content-Type-Options: nosniff`. | [PROPOSITION] |
| S4 | **Téléversement via `customer-service`** (multipart, flux), sans URL pré-signée en V1. Limites configurables : taille maximale par fichier, nombre maximal de documents par dossier, débit par identité. | [PROPOSITION] |
| S5 | **Types acceptés** : JPEG, PNG, PDF, vérifiés par signature binaire (pas par extension ni par en-tête déclaré). Nom de fichier d'origine conservé en métadonnée seulement, assaini ; clé de stockage aléatoire. | [PROPOSITION] |
| S6 | **Intégrité et versions** : empreinte SHA-256 du contenu en clair stockée à l'ajout. Un document soumis n'est jamais écrasé : un remplacement crée une **nouvelle version**, l'ancienne reste consultable par le personnel habilité. | [PROPOSITION] |
| S7 | **Suppression** : suppression logique (`deletedAt`) autorisée **uniquement** pour un document d'un dossier encore en `BROUILLON`. Après soumission, aucune suppression physique ni logique par le client ou le personnel. Une purge éventuelle suit une procédure juridique autorisée et auditée. | [PROPOSITION] |
| S8 | **Analyse antivirus** : un port `ScanPort` existe, avec états `SCAN_PENDING` / `CLEAN` / `INFECTED` / `SCAN_SKIPPED`. En V1 l'adaptateur par défaut est un no-op (`SCAN_SKIPPED`) ; la mise en service d'un analyseur est un prérequis de production à trancher. Un document `INFECTED` n'est jamais servi. | [PROPOSITION] + [POINT OUVERT] |
| S9 | **Audit de lecture** : toute lecture de contenu par un membre du personnel émet un événement d'audit (acteur, document, dossier, horodatage). La lecture par le propriétaire est journalisée sans notification. | [PROPOSITION] |
| S10 | Les contenus de documents **ne figurent jamais** dans les journaux, les événements ou les messages d'erreur. Les événements ne portent que des identifiants et types de documents. | [PROPOSITION] |

## 3. Paramètres (valeurs par défaut proposées, configurables)

| Paramètre | Valeur par défaut |
| --- | --- |
| Taille maximale par fichier | 5 Mo |
| Documents maximum par dossier | 10 |
| Téléversements par identité | 20 par heure |
| Durée de conservation des brouillons abandonnés | À fixer (point ouvert) |
| Durée de conservation des dossiers soumis | À fixer avec le juridique (point ouvert) |

Aucune durée légale n'est présumée.

## 4. Conséquences

- La sécurité repose sur le service applicatif (contrôle d'accès, chiffrement, audit), pas sur des URL secrètes.
- La clé maîtresse devient une ressource critique : sa perte rend les documents illisibles ; sa sauvegarde et sa rotation doivent être prévues avant la production.
- Le téléversement multipart passe par le service : à surveiller en charge et sous les limites de l'hébergeur (taille de corps, délais).
- Les sauvegardes du stockage doivent être chiffrées et restaurables ; une restauration est testée avant la production.

## 5. Points ouverts

1. Durées de conservation et procédure de purge (juridique, protection des données).
2. Fournisseur de stockage objet de production et sauvegardes.
3. Analyse antivirus : outil et exigence de blocage avant lecture.
4. Limites de taille de corps de l'hébergeur et du reverse proxy.
5. Besoin d'un watermark ou d'un affichage restreint pour le personnel (consultation sans téléchargement).

## 6. Mises à jour induites

| Document | Mise à jour |
| --- | --- |
| ADR-001 §5 | Ajouter la clé maîtresse documentaire aux clés `runtimeOnlyKeys` de `customer-service`. |
| CDC-02 | Référence S1 à S10 dans les exigences documentaires (CUS-F-06 à CUS-F-09). |
| RECETTE-02 | Tests de lecture, d'accès croisé, de type de fichier et de taille. |
