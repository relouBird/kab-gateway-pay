# Instructions pour les agents — KG Pay

> **Emplacement attendu :** racine du dépôt KG Pay, à côté du `README.md` développeur. Dans le dossier documentaire actuel, ce fichier est préparé sous `docs/` ; le déplacer à la racine avant de commencer les travaux de code. S'il s'y trouve déjà, poursuivre sans le déplacer à nouveau. Les chemins ci-dessous sont écrits relativement à son emplacement final.

## 1. Langue et mission

- Répondre et documenter en **français**, sauf demande contraire. Conserver en anglais les identifiants de code, noms d'API, événements, tables et termes techniques usuels.
- Contribuer à KG Pay comme agent logiciel backend et architecture, en tenant également compte du frontend. Un CDC métier couvre les exigences backend **et frontend** du même cœur ; ne pas créer un CDC global séparé pour le frontend.
- Travailler progressivement, cœur par cœur. Le premier cœur est **Cœur 1 — Identité et contrôle des accès** (`auth-service`, `CDC-01`).
- Lire le README développeur à la racine, puis les documents requis ci-dessous avant toute tâche. Respecter les consignes plus spécifiques éventuellement présentes dans des `AGENTS.md` imbriqués.

## 2. État réel du projet au 21 novembre 2026

- Le dossier disponible à la création de ces consignes contient la documentation ; **le monorepo applicatif KG Pay, son dépôt Git, son code source et ses manifests ne sont pas encore créés**.
- Il n'existe donc pas encore de commandes applicatives exécutables, de dépendances installables, de pipeline, de hooks Husky ni de déploiement à inspecter. Ne pas déclarer ces éléments présents.
- Le CDC-01 est le premier CDC, version 0.1, et reste un brouillon pour validation. ADR-001 et ADR-002 sont des documents proposés ; leurs propositions non validées ne sont pas des décisions acquises.
- `nexus-gate-web` est la seule référence frontend/auth fournie. C'est un projet distinct avec son propre contexte : ses appels, rôles, parcours d'équipe/`CREATOR` et choix de sécurité ne sont pas les contrats de KG Pay.
- `master/` contient des références PDF/Word administratives : **ne pas l'explorer ni s'en servir comme source** sauf demande explicite du porteur du projet.
- Ne pas ouvrir ou parcourir `node_modules`, les fichiers `.env`/secrets, ni les sorties générées telles que `dist/`, sauf demande explicite et nécessité démontrée. Préférer `.env.example` sans secrets.

## 3. Ordre de lecture et autorité documentaire

Avant une tâche :

1. Lire le `README.md` développeur à la racine.
2. Lire [`docs/README.md`](./docs/README.md) pour l'état du projet, les invariants et les conventions documentaires.
3. Lire [`docs/architecture/ADR-001-monorepo-microservices.md`](./docs/architecture/ADR-001-monorepo-microservices.md). Pour une tâche frontend, de contrat partagé, de routage ou de déploiement, lire aussi [`docs/architecture/ADR-002-applications-frontend-et-routage-mutualise.md`](./docs/architecture/ADR-002-applications-frontend-et-routage-mutualise.md).
4. Lire le référentiel fonctionnel v0.3, notamment les principes, frontières du cœur et points ouverts pertinents. Les versions v0.1/v0.2 sont du contexte historique uniquement ; ne pas leur donner priorité sur la v0.3.
5. Lire le CDC du cœur concerné, dont ses points ouverts et critères d'acceptation. Le CDC définit ce qui est à construire ; il ne valide pas automatiquement les éléments marqués proposition.
6. **Pour le premier bootstrap du dépôt ou une revue globale**, lire tous les documents sous `docs/` (dont v0.1 et v0.2 comme historique) et ignorer entièrement `master/`. Ne pas utiliser les versions historiques pour renverser une règle de v0.3 ou une décision validée.
7. Quand le dépôt applicatif existe, inspecter le code, les tests et la configuration directement concernés avant de changer quoi que ce soit.

Règles de conflit :

- Le code et les tests décrivent l'état **effectivement implémenté** ; un écart au CDC doit être signalé, pas silencieusement promu en règle voulue.
- Le CDC validé est la référence des exigences fonctionnelles.
- Les ADR validés sont la référence des décisions d'architecture.
- Le référentiel v0.3 porte le vocabulaire, les frontières et les règles métier consolidées.
- Si un document est contradictoire, incomplet ou non validé, arrêter le choix qui en dépend et demander arbitrage. Distinguer visiblement **[RÉFÉRENTIEL]**, **[DÉCISION]**, **[PROPOSITION]** et **[POINT OUVERT]**.

## 4. Invariants métier et sécurité

Respecter les invariants du README documentaire, en particulier :

- Une opération financière n'est pas une tentative technique ; conserver l'historique des tentatives.
- Un timeout n'est ni succès ni échec. `INCONNUE` reste à vérifier et ne peut pas déclencher aveuglément une nouvelle exécution équivalente.
- Un statut partenaire ne prouve pas une comptabilisation.
- Toute commande à effet financier doit être idempotente ; un callback rejoué ne produit aucun effet supplémentaire.
- Les écritures validées sont immuables et équilibrées ; corriger par écriture compensatrice, jamais par suppression ou modification.
- Annulation, remboursement et extourne sont distincts.
- Appliquer la séparation demandeur/instructeur/approbateur (RP-10).
- Publier un événement seulement après persistance par son domaine propriétaire (Transactional Outbox, RP-14).
- Auditer les actions sensibles (RP-17).
- Le rapprochement constate et ne réexécute pas.
- Ne pas confondre CUSTOMER, PAYER et bénéficiaire, ni partenaire, méthode de paiement et endpoint technique.

Sécurité générale :

- Ne jamais ajouter de secret aux fichiers versionnés, exemples, journaux, événements, captures, commits ou messages d'erreur.
- Ne jamais journaliser mots de passe, OTP/MFA, cookies, tokens, objets de requête Axios complets ou données personnelles/financières non nécessaires.
- Le frontend n'est jamais une frontière d'autorisation : le backend contrôle identité, permissions, propriété de ressource et règles métier.
- Les services n'accèdent pas aux bases des autres services ; aucun import d'un service vers un autre.
- Ne jamais inventer un endpoint, rôle, seuil, durée, état, devise activée ou comportement financier.

## 5. Règles actuelles du cœur 1

- Le cœur 1 gère identités, sessions, MFA, rôles/permissions et accès ; il ne porte pas le dossier KYC ni la décision de validation client, qui relèvent du cœur 2.
- **MFA obligatoire pour tous les sujets** est une orientation confirmée par le porteur du projet. TOTP est proposé pour le personnel ; le facteur client, son enrôlement et sa récupération restent à arbitrer. Ne pas ouvrir d'accès privilégié sans MFA, même si sa livraison est découpée.
- La liste proposée des rôles internes est `OPERATIONS_ADMIN`, `CONFIGURATION_ADMIN`, `SECURITY_ADMIN` ; elle reste à valider avec les permissions exactes. `SECURITY_ADMIN` administre les identités mais n'est pas un superutilisateur métier et ne reçoit pas des droits par héritage.
- La fenêtre UI de deux secondes est un délai avant envoi HTTP pour les actions explicitement déclarées annulables. L'annulation avant envoi signifie qu'aucune requête ne part ; après envoi, le résultat dépend de la réponse serveur. Cela ne retarde pas une désactivation urgente.
- Une suppression logique via `deletedAt` dépend du CDC du domaine ; les journaux d'audit et écritures comptables immuables ne sont pas supprimés.

## 6. Principes frontend et contrats

- Utiliser `nexus-gate-web` comme référence de conventions de dossiers (`components`, `composables`, `services`, `stores`, `routes`, `types`) et d'usage de React/Vite/Yup/Axios, non comme source de contrat métier ou de sécurité.
- Les interfaces d'authentification client et personnel sont spécifiées dans CDC-01. L'espace client et le back-office pourront être des surfaces distinctes ; le nombre d'applications n'est pas encore validé.
- Le partage de schémas Yup/types de transport via `@kgpay/contracts` est une proposition à confirmer dans ADR-002. Ne pas partager les entités Prisma ni placer de règles métier dans les packages communs. Le backend revalide toutes les données.
- Prévoir une fabrique HTTP Axios avec une instance réutilisable par service et un `baseURL` configurable par environnement. Éviter la création d'instance à chaque requête, la détection fragile d'auth par recherche dans l'URL et toute journalisation de payload/token.
- Le routage par chemin sous un domaine commun est proposé sous réserve de compatibilité de l'hébergeur et doit rester de l'infrastructure (pas d'API Gateway applicative). Une API publique d'intégration n'est pas dans le premier incrément.
- Les interfaces sont prévues responsive, en français et anglais. EUR, USD et XAF sont des devises envisagées, pas des devises garanties activées. Les montants utilisent une valeur entière en unité mineure et le code devise.
- La PWA et l'usage hors ligne sont ultérieurs ; ne pas mettre en cache données authentifiées ou financières.

## 7. Méthode de changement

1. Délimiter les exigences à traiter et citer leurs identifiants CDC/RP/ADR.
2. Examiner les fichiers ciblés et les changements déjà présents ; ne jamais écraser ou annuler un travail non produit par la tâche.
3. Pour chaque incertitude bloquante, poser une question ciblée avant d'implémenter. Ne pas combler silencieusement les points ouverts.
4. Faire des changements précis, cohérents frontend/backend si le parcours le nécessite, et mettre à jour le CDC/ADR lié lorsque l'exigence ou une décision change.
5. Ajouter des tests ciblés pour le comportement modifié ; exécuter les scripts existants les plus étroits qui couvrent la modification. Ne pas prétendre avoir testé une commande absente.
6. Ne pas installer de dépendances tant qu'un manifest n'existe pas ou qu'un outil requis ne manque pas pour une validation prévue. Les dépendances de chaque app/package résident dans son manifest ; le lockfile est généré par le gestionnaire choisi.
7. Ajouter au journal la date, le CDC ou l'ADR, les actions/fichiers, les validations réellement exécutées, les questions restantes et la prochaine étape.
8. Terminer par un résumé concis des résultats, validations et blocages.

## 8. Journal de suivi obligatoire

Tracer les travaux dans `docs/journal/YYYY-MM-DD/`, séparés par document affecté :

- `CDC-XX-nom.md` pour les modifications fonctionnelles ou les tâches d'implémentation associées au CDC ;
- `ADR-NNN-nom.md` pour les changements d'architecture ;
- `BASE.md` pour les consignes, outillage transversal, structure ou conventions ne relevant pas d'un CDC/ADR précis.

Chaque entrée indique : objectif, statut (proposé/en cours/terminé/bloqué), résumé des changements, chemins modifiés, exigences/sections concernées, commandes de validation et résultats (ou « non exécutée — raison »), points ouverts et suite attendue. Ne pas créer un journal vide pour une catégorie non concernée.

## 9. Git, Husky et qualité

- Le dépôt Git applicatif doit être initialisé à sa racine ; ne pas initialiser Git dans `docs/` ni inclure des références administratives ignorées.
- Husky est souhaité pour les contributeurs agents et humains. Le mettre en place une fois les manifests et commandes qualité établis.
- Les hooks doivent appeler les scripts effectivement déclarés (au minimum format/lint/typecheck/tests ciblés quand ils existent) et échouer si ceux-ci échouent. Ne pas créer de hook « succès » qui ne vérifie rien.
- Le hook ne remplace ni les tests complets/CI ni la revue des exigences. Ne pas contourner les hooks pour cacher une validation échouée.

## 10. Cible de fin

Une tâche n'est terminée que lorsque ses critères d'acceptation sont satisfaits, les validations réellement disponibles passent, les contrats et documents sont à jour, les points ouverts sont rapportés, et son entrée de journal est enregistrée.
