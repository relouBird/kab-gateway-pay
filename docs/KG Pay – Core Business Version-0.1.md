# KG Pay – Modélisation by Core Business Version-0.1

## Plateforme d’agrégation et d’orchestration des paiements

Vue d’ensemble du produit et responsabilités des cœurs métier

| Nature | Référentiel d’analyse fonctionnelle |
| --- | --- |
| Version | 0.1 - Document de travail |
| Statut | Base de discussion et de consolidation |
| Périmètre initial | Clients particuliers, partenaires de paiement, collecte et versement |

| Positionnement du document / Ce document n’est pas un cahier des charges ni une spécification technique. Il décrit le produit du point de vue métier : ses domaines de responsabilité, les notions qu’ils manipulent, leurs interactions et une trajectoire de réalisation progressive. |
| --- |

Novembre 2026

## Comment lire et utiliser cette documentation

Cette documentation rassemble les responsabilités fonctionnelles de la future plateforme dans une même vue. Elle sert de référentiel commun pour discuter du produit cœur métier par cœur métier, sans décider prématurément de son implémentation.

| Ce document décrit | Ce document ne cherche pas encore à figer |
| --- | --- |
| Les acteurs, les capacités métier et les processus principaux. | Les écrans détaillés, les règles exhaustives de validation ou les contrats API finaux. |
| Les concepts métier et les relations entre eux. | Le schéma physique des bases de données ou les technologies. |
| Les frontières de responsabilité et les dépendances entre domaines. | Le nombre définitif de microservices, de bases ou de déploiements. |
| Une proposition de périmètre progressif. | Un engagement de livraison, un SLA contractuel ou une conformité réglementaire déjà acquise. |

### Sommaire

- 1. Vision et positionnement du produit

- 2. Principes fonctionnels structurants

- 3. Acteurs et vocabulaire commun

- 4. Carte globale des cœurs métier

- 5. Étude des cœurs métier

- 6. Modèle conceptuel transversal

- 7. Parcours métier de bout en bout

- 8. Progression fonctionnelle par étapes

- 9. Décisions à consolider

- 10. Glossaire

| Convention de lecture / Les noms en majuscules (CUSTOMER, PAYMENT_OPERATION, LEDGER_ENTRY, etc.) sont des noms conceptuels proposés pour faciliter les échanges. Ils ne constituent pas encore un schéma de données définitif. |
| --- |

## 1. Vision et positionnement du produit

### 1.1. Vision

Construire une plateforme qui centralise les relations avec plusieurs partenaires financiers et rend leurs moyens de paiement accessibles à travers un modèle fonctionnel cohérent. La plateforme doit permettre d’enregistrer les partenaires, de décrire les moyens de paiement qu’ils proposent, d’orchestrer les opérations et d’en assurer le suivi opérationnel et financier.

Le premier modèle de clientèle envisagé est constitué de particuliers inscrits et accompagnés par l’entreprise. Après leur enregistrement et leur activation auprès des partenaires nécessaires, ces clients peuvent bénéficier de capacités de collecte et demander le versement de fonds sur un compte bancaire éligible.

### 1.2. Proposition de valeur

- Uniformiser l’accès à des partenaires dont les API, les méthodes de paiement et les règles diffèrent.

- Réduire le coût d’intégration d’un nouveau partenaire ou d’une nouvelle méthode de paiement.

- Assurer une traçabilité de bout en bout des opérations, depuis la demande jusqu’à la confirmation financière.

- Encadrer l’activation des clients et les opérations sensibles par des processus internes.

- Connaître les montants collectés, les frais, les montants dus aux clients et les versements réalisés.

- Permettre une évolution progressive vers davantage de partenaires, de pays, de devises et, éventuellement, une API B2B.

### 1.3. Périmètre de départ

| Dans le périmètre fonctionnel visé | Hors périmètre initial / à confirmer |
| --- | --- |
| Gestion de partenaires et de leurs méthodes de paiement. | Marketplace ouverte permettant à tout commerçant de s’inscrire sans accompagnement. |
| Gestion des clients particuliers, de leur dossier et de leur activation. | Gestion de plusieurs utilisateurs rattachés à une même entreprise cliente. |
| Collecte, suivi des opérations, demandes de remboursement ou d’annulation selon capacités partenaires. | Crédit, épargne, prêt ou autres produits bancaires. |
| Demande de versement du client vers un compte bancaire et circuit de validation. | Réseau bancaire propriétaire ou tenue de comptes bancaires. |
| Suivi comptable interne des sommes et des frais. | Émission autonome de monnaie électronique ou conservation réglementée de fonds sans cadre validé. |
| Intégration successive de Mobile Money et de cartes bancaires. | Routage intelligent complexe et bascule automatique multi-prestataires dès la première version. |

### 1.4. Canaux d’accès au produit

| Canal | Responsabilité fonctionnelle |
| --- | --- |
| Espace client | Inscription, consultation des opérations, initiation des collectes selon le parcours retenu, ajout de coordonnées bancaires et demande de versement. |
| Back-office interne | Gestion des clients, activation, traitement des dossiers, approbations, suivi des opérations et rapprochement. |
| Connecteurs partenaires | Échanges sortants avec les prestataires et réception des callbacks ou notifications de statut. |
| API tierce publique | Éventuelle ouverture à des entreprises ou plateformes externes. Cette exposition B2B est une piste future et ne constitue pas une hypothèse de départ. |

Les canaux sont des points d’accès aux capacités métier. Ils ne constituent pas, à eux seuls, des cœurs métier supplémentaires : un même parcours peut être initié depuis un espace client, traité dans le back-office et exécuté via un partenaire.

| Point de vigilance sur le rôle financier / Le produit doit distinguer le suivi comptable d’un montant dû au client de la détention juridique et matérielle des fonds. La plateforme peut suivre un solde sans être elle-même le dépositaire des fonds. Le modèle de conservation, de cantonnement et de règlement doit être validé séparément avant de figer les parcours financiers. |
| --- |

## 2. Principes fonctionnels structurants

| Principe | Conséquence fonctionnelle |
| --- | --- |
| Le partenaire n’est pas le moyen de paiement. | Un partenaire peut proposer plusieurs méthodes. Une méthode peut exposer plusieurs capacités : collecte, remboursement, consultation de statut ou versement. |
| Une capacité métier n’est pas une URL. | COLLECTION ou REFUND sont des opérations métier. Leur chemin HTTP, leur payload et leur mode d’authentification ne sont que la manière dont un partenaire expose cette capacité. |
| Une opération n’est pas une tentative technique. | Une même opération métier peut donner lieu à plusieurs échanges ou vérifications techniques. Ces tentatives doivent rester historisées. |
| Un statut technique ne vaut pas confirmation financière. | Un timeout ou une rupture réseau peut laisser une opération dans un état inconnu. La plateforme doit vérifier son résultat avant toute nouvelle exécution risquée. |
| Annulation, remboursement et extourne sont distincts. | L’annulation vise à empêcher une opération non finalisée. Le remboursement restitue des fonds déjà collectés. L’extourne corrige une écriture comptable. |
| Les mouvements financiers doivent être traçables. | Chaque changement important doit avoir une référence, une origine, un horodatage, un auteur ou un système initiateur et une justification lorsque nécessaire. |
| Les règles doivent être configurables, mais gouvernées. | Les frais, limites, mappings et paramètres partenaires peuvent être configurables, avec validation, versionnement et historique. |
| La séparation des responsabilités est une règle métier. | Une personne qui prépare une opération sensible ne doit pas nécessairement pouvoir l’approuver seule. Les seuils et exceptions restent à définir. |
| Le produit doit fonctionner même si un partenaire est indisponible. | Les opérations doivent avoir des états d’attente, de vérification et de reprise contrôlée. Une indisponibilité ne doit pas produire une fausse confirmation ou une double collecte. |

## 3. Acteurs et vocabulaire commun

| Acteur / notion | Définition et rôle |
| --- | --- |
| CUSTOMER | Particulier titulaire de la relation avec la plateforme. Il dispose d’une identité de connexion et d’un dossier client. Un seul utilisateur principal par client est envisagé au départ. |
| PAYER | Personne qui fournit les fonds lors d’une collecte. Elle peut être différente du CUSTOMER et ne doit pas être automatiquement assimilée au titulaire du compte plateforme. |
| OPERATIONS_AGENT | Collaborateur interne chargé de traiter un dossier, vérifier des informations, suivre une activation ou instruire une demande. |
| OPERATIONS_SUPERVISOR | Collaborateur habilité à approuver, rejeter ou arbitrer certaines opérations, selon des règles de délégation. |
| CONFIGURATION_ADMIN | Collaborateur autorisé à gérer le catalogue des partenaires, les méthodes, les paramètres d’intégration et leur mise en production. |
| FINANCE / RECONCILIATION | Fonction interne qui contrôle les mouvements, les frais, les écarts, les règlements et les soldes. |
| PARTNER | Prestataire ou agrégateur externe donnant accès à un ou plusieurs moyens de paiement. |
| PAYMENT_METHOD | Moyen ou produit de paiement exposé par un partenaire : OM, MoMo, OM Merchant, carte, etc. |
| BANK / BENEFICIARY ACCOUNT | Établissement bancaire et coordonnées du compte destinataire d’un versement. Les règles de format et de routage dépendent du pays et de la banque. |

| Distinction à ne pas perdre / Le CUSTOMER est le client de notre plateforme. Le PAYER est l’émetteur des fonds d’une collecte. Le bénéficiaire d’une collecte peut être le CUSTOMER, mais cette relation doit être explicitement portée par l’opération. Cette distinction évite de mélanger identité, initiateur du paiement et bénéficiaire économique. |
| --- |

## 4. Carte globale des cœurs métier

La plateforme peut être comprise comme un ensemble de capacités métier spécialisées. Les domaines sont liés, mais chacun possède une responsabilité principale et des règles propres.

| Cœur métier | Question à laquelle il répond | Résultat attendu |
| --- | --- | --- |
| 1. Identité et accès | Qui utilise la plateforme et que peut-il faire ? | Accès sécurisé, rôles et permissions. |
| 2. Cycle de vie client | Qui est le client et où en est son activation ? | Dossier client fiable et statut opérationnel. |
| 3. Référentiel partenaires et méthodes | Quels prestataires et moyens sont disponibles ? | Catalogue des options de paiement activables. |
| 4. Configuration des intégrations | Comment chaque capacité métier est-elle traduite vers un partenaire ? | Contrats d’endpoint, mappings et paramètres maîtrisés. |
| 5. Orchestration des paiements | Quelle opération doit être exécutée et quel est son résultat ? | Opération métier suivie de bout en bout. |
| 6. Comptes et comptabilité interne | Quels montants sont dus, réservés, reçus ou payés ? | Soldes explicables et écritures équilibrées. |
| 7. Versements | Comment un montant est-il payé au client ? | Demande contrôlée, approuvée et exécutée. |
| 8. Tarification | Quels frais s’appliquent et à qui ? | Calcul explicite des frais et commissions. |
| 9. Risque et conformité | L’opération et le client sont-ils éligibles ? | Contrôles, limites et alertes. |
| 10. Opérations internes | Qui traite les dossiers et exceptions ? | File de travail, validation et résolution. |
| 11. Rapprochement financier | Nos données concordent-elles avec celles des partenaires ? | Écarts identifiés et résolus. |
| 12. Notifications et reporting | Qui doit être informé et que faut-il piloter ? | Information des acteurs et indicateurs fiables. |

## 5. Étude des cœurs métier

Les sections suivantes décrivent chaque cœur à un niveau fonctionnel approfondi. Elles précisent sa mission, ses responsabilités, les objets qu’il porte, ses frontières et ses interactions. Les règles détaillées seront consolidées lors des ateliers consacrés à chaque domaine.

### 5.1. Identité et contrôle des accès

**Mission. **Gérer les identités qui accèdent à la plateforme et appliquer les droits associés à chaque profil.

**Responsabilités. **

- Enregistrer et authentifier les clients particuliers et les collaborateurs internes.

- Gérer les identifiants, les moyens de récupération, les sessions et les mécanismes de sécurité.

- Associer une identité à un CUSTOMER ou à un collaborateur interne.

- Définir des rôles et permissions distincts : client, agent, superviseur, administrateur de configuration, finance.

- Appliquer des contrôles renforcés aux actions sensibles : approbation d’un versement, modification de coordonnées bancaires, publication d’une configuration partenaire.

- Tracer les connexions et les changements sensibles.

**Éléments métier principalement portés. **USER_IDENTITY, ROLE, PERMISSION, USER_SESSION, ACCESS_EVENT.

**Frontières : ce que ce cœur ne fait pas. **Ce cœur ne porte pas le dossier KYC complet, le solde financier ni les règles d’exécution des paiements. Il décide de l’identité et des droits, pas de l’éligibilité financière d’une opération.

**Interactions principales. **Customer Management pour le lien identité-client ; Operations Management pour les agents et approbateurs ; Audit pour la traçabilité.

**Progression indicative. **Indispensable dès la première version. La granularité des rôles peut rester simple au départ, tout en prévoyant la séparation agent/superviseur.

### 5.2. Gestion du cycle de vie client

**Mission. **Gérer la relation avec un particulier depuis son inscription jusqu’à son activation, sa suspension ou sa clôture.

**Responsabilités. **

- Collecter les informations d’identité, les coordonnées et les pièces justificatives nécessaires.

- Créer un dossier client unique et éviter les doublons d’identité.

- Gérer les états du dossier : brouillon, soumis, à vérifier, incomplet, validé, rejeté, suspendu, clôturé.

- Créer et suivre une demande d’activation auprès des partenaires concernés.

- Affecter le dossier à un agent et enregistrer les démarches, retours, références externes et dates.

- Conserver les informations propres au client : méthodes autorisées, limites particulières, paramètres et données de rattachement fournies par les partenaires.

- Gérer les changements de coordonnées et les réexamens périodiques lorsque requis.

**Éléments métier principalement portés. **CUSTOMER, CUSTOMER_PROFILE, CUSTOMER_DOCUMENT, CUSTOMER_ACTIVATION_REQUEST, CUSTOMER_PROVIDER_LINK, CUSTOMER_CONFIGURATION.

**Frontières : ce que ce cœur ne fait pas. **Ce cœur ne crée pas arbitrairement les comptes chez les partenaires : il pilote le dossier et enregistre le résultat des démarches. Il ne réalise pas non plus les transactions.

**Interactions principales. **Identity & Access pour les identifiants ; Partner Registry pour les prestataires concernés ; Operations pour le traitement manuel ; Risk & Compliance pour les contrôles requis.

**Progression indicative. **Prioritaire. L’activation peut être manuelle au départ, avec un délai opérationnel cible indicatif de 1 à 2 jours après soumission complète. Ce délai doit être confirmé avec les partenaires et ne constitue pas automatiquement un engagement contractuel.

### 5.3. Référentiel des partenaires et des moyens de paiement

**Mission. **Décrire les prestataires connectés à la plateforme et les méthodes qu’ils mettent à disposition.

**Responsabilités. **

- Créer et maintenir la fiche d’un PARTNER : identité, type, pays, statut, contacts opérationnels et cadre contractuel.

- Enregistrer les PAYMENT_METHODS proposés par chaque partenaire : Orange Money, MTN MoMo, Orange Merchant, cartes, etc.

- Associer chaque méthode aux pays, devises, profils clients et canaux qu’elle supporte.

- Décrire les capacités métier supportées par chaque méthode : collecte, remboursement, consultation de statut, annulation, versement ou transfert.

- Activer, désactiver ou suspendre une méthode sans supprimer l’historique des opérations.

- Indiquer les environnements disponibles et les restrictions connues.

**Éléments métier principalement portés. **PARTNER, PAYMENT_METHOD, METHOD_CAPABILITY, COUNTRY, CURRENCY, PARTNER_CONTRACT_REFERENCE.

**Frontières : ce que ce cœur ne fait pas. **Ce cœur ne contient pas les détails de mapping HTTP ou les secrets techniques. Il indique ce qui existe et ce qui est fonctionnellement proposé ; la configuration d’appel relève du cœur d’intégration.

**Interactions principales. **Partner Integration Configuration pour les contrats techniques ; Payment Orchestration pour sélectionner une méthode disponible ; Customer Management pour les méthodes autorisées à un client.

**Progression indicative. **Prioritaire. Commencer par le partenaire X et ses méthodes OM / MoMo disponibles contractuellement. Ajouter les cartes lorsque le second partenaire est effectivement acquis et qualifié.

### 5.4. Configuration des intégrations partenaires

**Mission. **Décrire de manière maîtrisée comment les capacités de la plateforme sont traduites en appels vers les API de chaque partenaire.

**Responsabilités. **

- Définir, pour une méthode donnée, les endpoints associés à chaque capacité métier.

- Enregistrer le chemin relatif, la méthode HTTP, les paramètres, les en-têtes, les règles d’authentification et les délais d’attente.

- Décrire les schémas de requête et de réponse, les champs obligatoires, optionnels, statiques, mappés ou générés.

- Mapper les champs internes vers les noms attendus par le partenaire et inversement.

- Définir la correspondance entre les statuts et codes d’erreur du partenaire et les états normalisés de la plateforme.

- Gérer les callbacks/webhooks et, lorsque nécessaire, la consultation périodique de statut.

- Versionner les configurations, tester en sandbox, faire valider leur publication et pouvoir revenir à une version précédente.

- Référencer les secrets sans les afficher en clair dans les fiches de configuration ni les dupliquer endpoint par endpoint.

**Éléments métier principalement portés. **ENDPOINT_DEFINITION, REQUEST_SCHEMA, RESPONSE_SCHEMA, FIELD_MAPPING, ERROR_MAPPING, AUTH_PROFILE, PARTNER_ENVIRONMENT, CONFIGURATION_VERSION.

**Frontières : ce que ce cœur ne fait pas. **Ce cœur ne décide pas du sens métier de COLLECTION ou REFUND. Il ne comptabilise pas les opérations et ne doit pas devenir un moteur d’exécution de scripts arbitraires non contrôlés.

**Interactions principales. **Partner Registry pour les capacités disponibles ; Payment Orchestration pour l’exécution ; Operations pour les tests et la publication ; Security pour la protection des secrets.

**Progression indicative. **La structure conceptuelle peut être pensée dès maintenant. En V1, seuls les endpoints nécessaires au premier partenaire doivent être configurables. La génération automatique de documentation et de collections API peut venir ensuite.

### 5.5. Orchestration des opérations de paiement

**Mission. **Piloter les opérations financières demandées à la plateforme et coordonner leur exécution auprès d’un partenaire.

**Responsabilités. **

- Recevoir une intention métier : collecte, remboursement, annulation, transfert ou consultation d’état.

- Valider les paramètres de l’opération : client, montant, devise, moyen choisi, bénéficiaire, référence et règles d’éligibilité.

- Créer une opération unique avec une référence interne et une clé d’idempotence.

- Sélectionner un partenaire et une méthode autorisés selon la configuration et les règles de disponibilité.

- Créer une ou plusieurs tentatives techniques et conserver leurs requêtes, réponses, références externes et erreurs utiles.

- Gérer les réponses synchrones, les notifications asynchrones et les vérifications de statut.

- Normaliser le résultat sans confondre rejet, échec certain, attente et résultat inconnu.

- Permettre la consultation de l’historique et relier les remboursements ou annulations à l’opération d’origine.

**Éléments métier principalement portés. **PAYMENT_OPERATION, PAYMENT_ATTEMPT, OPERATION_EVENT, PROVIDER_REFERENCE, IDEMPOTENCY_RECORD, REFUND_LINK, CANCELLATION_REQUEST.

**Frontières : ce que ce cœur ne fait pas. **Ce cœur n’est pas le grand livre comptable et ne décide pas seul de la disponibilité réelle des fonds. Il ne doit pas marquer une opération comme réussie sur la seule base d’un timeout ou d’une réponse ambiguë.

**Interactions principales. **Partner Registry et Integration Configuration pour l’exécution ; Risk & Pricing pour les validations et frais ; Ledger pour les écritures ; Notifications pour les confirmations ; Reconciliation pour le contrôle a posteriori.

**Progression indicative. **Le suivi des opérations et des tentatives est fondamental dès le départ. Commencer avec un partenaire et un nombre limité de méthodes/capacités. Les stratégies multi-partenaire et de routage avancé sont ultérieures.

### 5.6. Comptes clients et comptabilité interne

**Mission. **Conserver une représentation financière fiable des montants reçus, dus, réservés, payés et prélevés.

**Responsabilités. **

- Distinguer le compte fonctionnel du client, les comptes comptables internes et les comptes bancaires réels.

- Tenir un sous-grand-livre par client lorsque la plateforme doit calculer les montants qui lui sont dus.

- Enregistrer les mouvements en partie double : chaque journal doit être équilibré entre débits et crédits.

- Suivre les montants en attente, disponibles, réservés, payables, remboursés et réglés.

- Conserver le détail du montant brut, des frais partenaire, des frais plateforme et du montant net attribuable au client.

- Produire un solde explicable à partir des écritures ; le solde affiché ne doit pas être la seule source de vérité.

- Corriger une erreur par une écriture compensatrice tracée plutôt que par la modification ou la suppression d’une écriture validée.

- Gérer les suspens et comptes de transit lorsque les fonds sont en attente de confirmation ou de règlement.

**Éléments métier principalement portés. **CUSTOMER_ACCOUNT, LEDGER_ACCOUNT, JOURNAL, LEDGER_ENTRY, BALANCE_SNAPSHOT, FUNDS_RESERVATION, FINANCIAL_PERIOD.

**Frontières : ce que ce cœur ne fait pas. **Ce cœur ne détient pas physiquement l’argent et ne détermine pas, à lui seul, le statut réglementaire du dispositif. Le registre comptable interne ne remplace pas les relevés bancaires ou les états du partenaire.

**Interactions principales. **Payment Orchestration pour les opérations confirmées ; Pricing pour les frais ; Payout pour les réservations et débits ; Reconciliation pour les écarts ; Finance pour la supervision.

**Progression indicative. **Le socle comptable minimal doit être conçu avant les premières opérations réelles. Les règles détaillées de reconnaissance des fonds et de disponibilité dépendent du modèle de détention et de règlement qui reste à confirmer.

### 5.7. Gestion des versements et décaissements

**Mission. **Permettre à un client de demander le versement d’un montant vers un compte bancaire et encadrer son traitement jusqu’à la confirmation.

**Responsabilités. **

- Permettre au client de choisir ou d’enregistrer un compte bancaire bénéficiaire.

- Gérer un référentiel de banques par pays et les informations de routage disponibles.

- Créer une PAYOUT_REQUEST avec montant, devise, bénéficiaire, frais estimés et motif.

- Vérifier l’éligibilité du client, le solde disponible, les limites, le statut du compte bénéficiaire et les contrôles de risque.

- Soumettre la demande à une file de traitement interne.

- Appliquer une séparation entre instruction et approbation selon le montant et les règles de délégation.

- Réserver le montant approprié pendant le traitement afin d’éviter les demandes concurrentes dépassant le solde disponible.

- Transmettre l’ordre au partenaire habilité, suivre les tentatives et gérer les résultats différés.

- Libérer la réservation en cas d’échec confirmé ou comptabiliser le versement en cas de succès confirmé.

**Éléments métier principalement portés. **PAYOUT_REQUEST, BANK, CUSTOMER_BANK_ACCOUNT, BENEFICIARY, PAYOUT_APPROVAL, PAYOUT_ATTEMPT, PAYOUT_EVENT.

**Frontières : ce que ce cœur ne fait pas. **Ce cœur ne gère pas le catalogue global des endpoints et ne doit pas considérer la simple approbation interne comme la preuve que le bénéficiaire a reçu les fonds.

**Interactions principales. **Customer Management pour le bénéficiaire ; Ledger pour la disponibilité et les écritures ; Operations pour l’instruction ; Payment Orchestration / Integration pour l’exécution ; Reconciliation pour la confirmation.

**Progression indicative. **La création et l’approbation des demandes peuvent être introduites avant l’automatisation complète du transfert. L’exécution automatique dépend de la capacité réelle du partenaire et du cadre de conservation des fonds.

### 5.8. Tarification, frais et commissions

**Mission. **Définir les règles de calcul des frais et rendre le coût de chaque mouvement explicable.

**Responsabilités. **

- Définir les frais facturés au client selon le type d’opération, la méthode, le partenaire, le montant, la devise et éventuellement le profil.

- Enregistrer les frais facturés par le partenaire et les commissions ou marges de la plateforme.

- Gérer les frais fixes, proportionnels, minimums, maximums et les règles d’arrondi.

- Distinguer frais estimés avant exécution et frais réellement constatés après retour ou rapprochement.

- Appliquer une version de tarif datée à une opération afin de conserver la règle utilisée au moment de son initiation.

- Gérer les exceptions et tarifs négociés pour certains clients lorsque cela est autorisé.

**Éléments métier principalement portés. **FEE_POLICY, FEE_RULE, PARTNER_FEE, CUSTOMER_FEE, PRICING_VERSION, FEE_CALCULATION.

**Frontières : ce que ce cœur ne fait pas. **Ce cœur ne comptabilise pas les frais dans le grand livre : il calcule et explique les montants. Le Ledger matérialise les écritures associées.

**Interactions principales. **Partner Registry pour les coûts connus du prestataire ; Customer Configuration pour les exceptions ; Payment et Payout pour l’application ; Ledger et Reconciliation pour les montants réellement comptabilisés.

**Progression indicative. **Un modèle simple et transparent est suffisant au départ. Les règles complexes par segment, palier ou négociation peuvent être introduites lorsque le modèle commercial est stabilisé.

### 5.9. Risque, conformité et éligibilité

**Mission. **Appliquer les contrôles qui déterminent si un client ou une opération peut être accepté, limité, différé ou refusé.

**Responsabilités. **

- Définir les informations et justificatifs nécessaires à la connaissance du client.

- Appliquer des limites par client, opération, période, méthode et pays.

- Contrôler les statuts du client, les méthodes activées et les restrictions applicables.

- Détecter des situations nécessitant une vérification : répétitions inhabituelles, incohérences, bénéficiaire modifié récemment ou opération atypique.

- Déclencher une revue manuelle et conserver le motif de blocage, d’acceptation ou de rejet.

- Gérer les contrôles et listes requis par les obligations applicables, après validation juridique et conformité.

**Éléments métier principalement portés. **ELIGIBILITY_RULE, TRANSACTION_LIMIT, RISK_ALERT, COMPLIANCE_REVIEW, KYC_CHECK, RESTRICTION.

**Frontières : ce que ce cœur ne fait pas. **Ce cœur ne remplace pas l’avis juridique ou conformité et ne doit pas inventer des obligations réglementaires. Les contrôles effectifs dépendront des contrats, du pays et du rôle exact de la plateforme.

**Interactions principales. **Customer Management pour les dossiers ; Payment et Payout pour les décisions d’éligibilité ; Operations pour les revues ; Audit pour les preuves de décision.

**Progression indicative. **Les contrôles de base sont nécessaires dès le pilote. Les moteurs de détection avancée et les règles automatisées évoluent avec les volumes et les risques observés.

### 5.10. Opérations internes et gestion des dossiers

**Mission. **Organiser le travail des équipes internes, les validations et la résolution des cas qui nécessitent une intervention humaine.

**Responsabilités. **

- Centraliser les tâches liées à l’activation des clients, aux demandes de versement, aux opérations en anomalie et aux contestations.

- Affecter chaque dossier à une personne ou une équipe, avec priorité, échéance et statut de traitement.

- Enregistrer les notes internes, pièces complémentaires, décisions et motifs.

- Mettre en place des circuits de validation avec séparation des rôles.

- Permettre l’escalade d’un dossier, la réaffectation et le suivi des délais.

- Conserver le journal des actions manuelles sans écraser l’historique des décisions.

**Éléments métier principalement portés. **WORK_ITEM, CASE, CASE_ASSIGNMENT, APPROVAL, REVIEW_COMMENT, DECISION_RECORD, SLA_TARGET.

**Frontières : ce que ce cœur ne fait pas. **Ce cœur ne possède pas les données financières de référence et ne réalise pas directement les appels de paiement. Il orchestre le travail humain autour des autres domaines.

**Interactions principales. **Customer, Payout, Risk, Reconciliation et Support pour les dossiers ; Identity & Access pour les droits ; Audit pour les traces.

**Progression indicative. **Indispensable dès la première version, même sous une forme simple : listes de dossiers, affectation, décision, commentaire et horodatage.

### 5.11. Rapprochement et règlement financier

**Mission. **Vérifier que les opérations internes correspondent aux informations et mouvements communiqués par les partenaires et les établissements financiers.

**Responsabilités. **

- Importer ou recevoir les rapports de transactions, règlements, commissions et remboursements des partenaires.

- Comparer les références, montants, devises, dates et statuts avec les opérations internes.

- Identifier les opérations manquantes, dupliquées, retardées ou présentant un montant différent.

- Suivre les fonds en transit et les montants effectivement réglés sur les comptes convenus.

- Créer des dossiers d’écart, affecter leur résolution et conserver les preuves.

- Valider les commissions et frais réellement prélevés par les partenaires.

- Produire une situation de rapprochement par partenaire, période et devise.

**Éléments métier principalement portés. **RECONCILIATION_BATCH, PROVIDER_STATEMENT, SETTLEMENT, MATCH_RESULT, RECONCILIATION_CASE, SETTLEMENT_REFERENCE.

**Frontières : ce que ce cœur ne fait pas. **Ce cœur ne réexécute pas automatiquement une opération pour corriger un écart. Il constate, qualifie et suit l’écart ; toute correction passe par une opération ou une écriture autorisée.

**Interactions principales. **Payment Operations et Ledger pour les données internes ; Partner Integration pour récupérer les relevés ; Finance et Operations pour résoudre les écarts.

**Progression indicative. **Un rapprochement manuel assisté peut suffire au pilote, mais la capacité de rapprochement ne doit pas être oubliée dans la conception initiale.

### 5.12. Notifications, webhooks et reporting

**Mission. **Informer les acteurs concernés et fournir une visibilité opérationnelle sur l’activité de la plateforme.

**Responsabilités. **

- Informer le client des événements importants : inscription, activation, collecte, remboursement, demande de versement et résultat.

- Notifier les agents des nouveaux dossiers, opérations à examiner et anomalies.

- Gérer les préférences et canaux autorisés : email, SMS, notification applicative ou autre canal retenu.

- Conserver l’état d’envoi, les échecs et les tentatives de notification.

- Prévoir des webhooks sortants si une API destinée à des systèmes tiers est ouverte ultérieurement.

- Produire des indicateurs cohérents : volumes, taux de succès, montants, frais, versements en attente et écarts de rapprochement.

**Éléments métier principalement portés. **NOTIFICATION, NOTIFICATION_TEMPLATE, DELIVERY_ATTEMPT, WEBHOOK_SUBSCRIPTION, REPORT_DEFINITION, KPI_SNAPSHOT.

**Frontières : ce que ce cœur ne fait pas. **Ce cœur ne détermine pas l’état métier d’une transaction. Il communique un événement déjà établi par le domaine responsable.

**Interactions principales. **Tous les domaines producteurs d’événements ; Identity & Access pour les préférences et autorisations ; Finance et Operations pour les tableaux de bord.

**Progression indicative. **Les notifications client et agent sont utiles dès le lancement. Les webhooks publics et les rapports analytiques avancés peuvent attendre une exposition B2B ou une montée en volume.

## 6. Modèle conceptuel transversal

Le modèle ci-dessous n’est pas un diagramme de base de données. Il met en évidence les relations métier à préserver entre les concepts.

| Relation conceptuelle | Cardinalité indicative | Sens métier |
| --- | --- | --- |
| PARTNER → PAYMENT_METHOD | 1 à N | Un partenaire propose plusieurs méthodes ou produits de paiement. |
| PAYMENT_METHOD → METHOD_CAPABILITY / ENDPOINT_DEFINITION | 1 à N | Une méthode expose plusieurs capacités, chacune étant mise en œuvre par une ou plusieurs définitions d’endpoint selon le contexte. |
| PARTNER → PARTNER_ENVIRONMENT / AUTH_PROFILE | 1 à N | Un partenaire peut disposer d’environnements et de profils d’accès distincts. |
| CUSTOMER → CUSTOMER_DOCUMENT | 1 à N | Un client peut fournir plusieurs documents. |
| CUSTOMER → CUSTOMER_PROVIDER_LINK | 1 à N | Un client peut être activé auprès de plusieurs partenaires ou méthodes. |
| CUSTOMER → CUSTOMER_ACCOUNT | 1 à N selon devise / modèle | Le modèle initial peut présenter un compte principal, mais la devise et les règles comptables peuvent nécessiter plusieurs sous-comptes. |
| CUSTOMER → CUSTOMER_BANK_ACCOUNT | 1 à N | Un client peut enregistrer plusieurs comptes bancaires bénéficiaires. |
| FINANCIAL_OPERATION → PAYMENT_ATTEMPT | 1 à N | Une opération métier peut avoir plusieurs tentatives ou vérifications techniques. |
| FINANCIAL_OPERATION → OPERATION_EVENT | 1 à N | Chaque événement significatif est historisé. |
| FINANCIAL_OPERATION → LEDGER_JOURNAL | 0 à N selon statut et type | Une opération peut produire des écritures lorsque les conditions comptables sont réunies. |
| PAYOUT_REQUEST → CUSTOMER_BANK_ACCOUNT | N à 1 | Une demande de versement désigne un compte bénéficiaire vérifié. |
| PAYOUT_REQUEST → APPROVAL / PAYOUT_ATTEMPT | 1 à N | Une demande est instruite, approuvée et exécutée selon son workflow. |
| FINANCIAL_OPERATION → REFUND / REVERSAL | 1 à N | Les remboursements et corrections restent liés à l’opération d’origine. |

### 6.1. Quelques objets à ne pas fusionner

| Ne pas confondre | Pourquoi |
| --- | --- |
| PARTNER / PAYMENT_METHOD | Le partenaire est l’organisation intégrée ; la méthode est le produit de paiement qu’elle expose. |
| PAYMENT_METHOD / PAYMENT_ENDPOINT | La méthode est fonctionnelle ; l’endpoint est une interface technique permettant d’exécuter une capacité. |
| CUSTOMER / PAYER | Le client est titulaire de la relation plateforme ; le payeur est la personne qui initie une collecte. |
| CUSTOMER_ACCOUNT / BANK_ACCOUNT | Le compte fonctionnel ou comptable du client n’est pas son compte bancaire bénéficiaire. |
| FINANCIAL_OPERATION / PAYMENT_ATTEMPT | L’opération est l’intention métier ; la tentative décrit un échange technique avec le prestataire. |
| PAYMENT_STATUS / LEDGER_STATUS | Le succès d’un appel externe et la comptabilisation d’un mouvement sont deux faits distincts. |
| CANCEL / REFUND / REVERSAL | Annuler empêche une exécution ; rembourser restitue des fonds ; extourner corrige les écritures. |

## 7. Parcours métier de bout en bout

### 7.1. Inscription et activation du client

1. Le particulier soumet ses informations et les pièces demandées.

2. La plateforme crée le CUSTOMER et son identité de connexion, puis place le dossier dans un état à vérifier.

3. Un agent examine le dossier, demande éventuellement un complément ou le valide.

4. Après validation, une demande d’activation est créée pour les partenaires nécessaires.

5. Les démarches sont réalisées manuellement ou par API selon les capacités du partenaire.

6. Les références et informations attribuées par le partenaire sont enregistrées dans le lien client-partenaire.

7. Lorsque les prérequis sont satisfaits, le client passe à l’état ACTIVE pour les méthodes concernées.

| Important / L’activation globale du client et l’activation d’une méthode particulière doivent pouvoir être distinguées. Un client peut être actif sur OM et encore en attente sur une autre méthode. |
| --- |

### 7.2. Collecte

1. Le client ou un canal autorisé initie une collecte avec un montant, une devise, un payeur et un bénéficiaire clairement identifiés.

2. La plateforme vérifie le statut du client, la méthode autorisée, les limites et les frais applicables.

3. Une FINANCIAL_OPERATION est créée avec une référence unique et une clé d’idempotence.

4. Une PAYMENT_ATTEMPT est créée et transmise au partenaire via la définition d’endpoint active.

5. La réponse immédiate peut être un succès, un rejet ou une opération en attente.

6. Le résultat final est établi à partir de la réponse fiable, d’un callback authentifié ou d’une consultation de statut.

7. Après confirmation, les écritures comptables correspondantes sont générées ; sinon l’opération reste en attente, échoue ou passe en revue manuelle selon le cas.

8. Le client reçoit une notification et l’opération devient disponible pour le rapprochement.

### 7.3. Annulation et remboursement

Une demande d’annulation doit d’abord vérifier si le partenaire accepte l’annulation et si l’opération est encore annulable. Une opération déjà exécutée ne doit pas être marquée simplement CANCELLED : elle peut nécessiter un remboursement total ou partiel, qui constitue une nouvelle opération liée à l’originale. Une correction comptable indépendante passe par une écriture compensatrice tracée.

### 7.4. Demande de versement

1. Le client choisit un compte bancaire bénéficiaire vérifié et saisit un montant.

2. La plateforme calcule les frais, vérifie le montant disponible et les limites, puis crée une demande.

3. Le montant à verser est réservé afin d’éviter qu’il soit utilisé par une autre demande.

4. Un agent instruit le dossier ; un superviseur approuve si la règle de délégation l’exige.

5. La demande approuvée est transmise au partenaire ou au canal de versement autorisé.

6. La plateforme suit le statut jusqu’à une confirmation fiable du transfert.

7. En cas de succès, le mouvement est comptabilisé ; en cas d’échec confirmé, la réservation est libérée et l’échec est tracé.

8. Le client et les équipes internes sont informés du résultat.

### 7.5. Rapprochement

À intervalles définis, les opérations et écritures internes sont comparées aux relevés ou rapports partenaires. Les correspondances sont validées ; les écarts sont classés (manquant, montant différent, statut divergent, doublon, frais non conformes, règlement incomplet) puis affectés à une équipe. Une correction doit être explicitement autorisée et traçable.

## 8. Cœurs métier, bounded contexts et services

Un cœur métier est une responsabilité durable du produit. Il peut être traduit en bounded context pour fixer le vocabulaire, les règles et les données qui lui appartiennent. Un service est une unité de logiciel et de déploiement. Le découpage métier doit guider le découpage technique, mais les deux ne sont pas automatiquement identiques.

| Niveau | Ce qu’il représente | Question de conception |
| --- | --- | --- |
| Cœur métier | Une capacité et une responsabilité fonctionnelles. | Quelle responsabilité le produit doit-il assumer ? |
| Bounded context | Une frontière de langage, de règles et de modèle cohérent. | Où un concept possède-t-il une définition unique et maîtrisée ? |
| Service applicatif | Une unité logicielle qui expose des fonctions et applique des règles. | Quelles responsabilités doivent évoluer ou être exploitées séparément ? |
| Microservice déployable | Un processus indépendant, avec ses contraintes de disponibilité, de données et d’exploitation. | La séparation apporte-t-elle un bénéfice suffisant par rapport à son coût ? |

| Conséquence pratique / Il est cohérent de concevoir maintenant les domaines Customer, Partner Configuration, Payment, Ledger et Payout séparément, puis de décider qu’au démarrage certains résident dans un même service applicatif. Le modèle métier reste propre sans imposer immédiatement un grand nombre de déploiements, de bases et de communications interservices. |
| --- |

### 8.1. Regroupement technique possible à titre indicatif

| Regroupement applicatif possible | Cœurs métier associés | Observation |
| --- | --- | --- |
| Identity Service | Identité et contrôle des accès | Frontière assez naturellement autonome. |
| Customer Service | Cycle de vie client | Peut inclure le dossier, l’activation et les liens client-prestataire. |
| Partner Configuration Service | Référentiel partenaires + configuration des intégrations | Séparer catalogue métier et secrets/configurations à l’intérieur du même périmètre fonctionnel reste possible. |
| Payment Service | Orchestration des paiements | Responsable des opérations et tentatives de collecte/remboursement. |
| Financial Service | Comptes, ledger, tarification | À concevoir avec beaucoup de rigueur ; le ledger doit rester l’autorité comptable. |
| Payout Service | Demandes et exécution des versements | Peut être regroupé avec Payment au début si le volume et le cycle de vie le justifient. |
| Operations & Reconciliation | Traitement interne, rapprochement et suivi | Ces capacités peuvent être un module interne avant d’être autonomisées. |
| Notification / Reporting | Notifications et indicateurs | Peut commencer comme capacité partagée simple. |

Ce tableau constitue une hypothèse de regroupement, pas une décision d’architecture. Les frontières seront affinées après l’étude détaillée des flux, des volumes, des besoins d’isolation et des contraintes d’exploitation.

## 9. Progression fonctionnelle par étapes

La conception couvre l’ensemble du produit, mais la réalisation doit être progressive. L’objectif est de livrer un premier flux financier maîtrisé, pas de reproduire dès le départ toutes les capacités possibles des partenaires.

| Étape | Capacités à rendre opérationnelles | Ce qui peut attendre |
| --- | --- | --- |
| Étape 0 - Cadrage des règles | Clarifier le rôle de la plateforme, la propriété/détention des fonds, les flux payeur-bénéficiaire, les pays/devises, les contrats partenaires, les règles d’approbation et la responsabilité réglementaire. | Automatisation, routage avancé, documentation générée. |
| Étape 1 - Socle exploitable | Identités et rôles simples ; inscription et validation manuelle ; référentiel X ; méthodes OM/MoMo effectivement disponibles ; configuration des endpoints requis ; collecte ; suivi des opérations et tentatives ; comptabilité minimale ; suivi interne ; rapprochement assisté. | Cartes bancaires ; multi-routage ; onboarding entièrement automatique ; moteur de règles complexe. |
| Étape 2 - Versements et enrichissement | Demandes de versement ; bénéficiaires bancaires ; approbation séparée ; exécution de versements si le partenaire le permet ; frais et commissions ; remboursements pris en charge par le partenaire ; rapprochement plus complet. | Payout universel sur toutes les banques ; tarification dynamique avancée. |
| Étape 3 - Extension partenaires | Intégration du partenaire carte ; nouvelles méthodes ; nouveaux pays ou devises ; versionnement des configurations ; supervision des intégrations ; tableaux de bord financiers plus avancés. | Routage sophistiqué et automatisation de toutes les exceptions. |
| Étape 4 - Industrialisation / ouverture | Automatisation de certaines activations ; règles de risque avancées ; génération de documentation/collections API ; webhooks et API tierces ; routage multi-partenaire maîtrisé. | Fonctions dépendantes d’une stratégie B2B validée. |

### 9.1. Ce que le premier incrément doit prouver

- Un client peut être enregistré, vérifié et activé avec une traçabilité complète.

- Une collecte OM ou MoMo peut être initiée auprès de X et suivie jusqu’à son résultat fiable.

- Une opération incertaine ne provoque ni double exécution incontrôlée ni faux succès.

- Le montant brut, les frais et le montant net dû peuvent être expliqués.

- Les équipes internes peuvent retrouver une opération, comprendre son état et intervenir sans effacer l’historique.

- Les écarts avec le partenaire peuvent être détectés et traités.

## 10. Décisions à consolider

Les points suivants ne bloquent pas la compréhension globale, mais ils doivent être tranchés avant de figer les règles détaillées et les contrats d’intégration.

| Décision | Pourquoi elle est structurante | Statut |
| --- | --- | --- |
| Détention et conservation des fonds | Détermine le modèle de compte, le ledger, les responsabilités et les parcours de versement. | À décider avec validation juridique et partenaire. |
| Nature du compte client | Compte de suivi d’un montant dû, sous-compte chez un partenaire ou portefeuille réglementé : les implications sont différentes. | À confirmer. |
| Rôle exact du CUSTOMER dans une collecte | Le client est-il le bénéficiaire des collectes, l’initiateur, ou les deux selon les cas ? Qui est le PAYER ? | À préciser. |
| Modèle de clientèle | Particuliers uniquement au départ ou API future pour entreprises/commerçants ? | Particuliers au départ ; extension non engagée. |
| Canal de collecte | Qui initie la collecte : client, payeur via un lien, opérateur interne ou système tiers ? | À détailler. |
| Partenaire de versement bancaire | Le partenaire X ou Y peut-il payer le compte bancaire du client, dans quels pays et sous quelles conditions ? | À vérifier contractuellement. |
| Partenaire carte et modèle d’encaissement | Le fournisseur permet-il l’encaissement pour compte de tiers, les sous-comptes ou les reversements vers des bénéficiaires distincts ? | En cours d’acquisition. |
| Devises et pays initiaux | Influe sur les comptes, frais, plafonds, formats bancaires et reporting. | CEMAC envisagée ; couverture exacte à fixer. |
| Validation des versements | Un agent et un superviseur, ou des règles automatiques selon le montant ? | Hypothèse : séparation agent / superviseur. |
| Frais et commissions | Qui supporte les frais partenaire, quand sont-ils prélevés et comment le client est-il informé ? | À définir. |
| Capacité de remboursement / annulation | Chaque méthode ne supporte pas nécessairement les mêmes opérations. | À inventorier partenaire par partenaire. |
| Délai d’activation | Le délai cible de 1 à 2 jours est-il un objectif interne ou une promesse client ? | À valider selon dépendances externes. |

## 11. Glossaire

| Terme | Sens retenu dans ce document |
| --- | --- |
| Agrégateur / partenaire | Prestataire externe donnant accès à des moyens ou rails de paiement. |
| Payment Gateway | Plateforme qui centralise et orchestre les paiements au travers de plusieurs partenaires. |
| Payment Method | Moyen ou produit de paiement : OM, MoMo, carte, etc. |
| Capability | Opération métier qu’un moyen de paiement sait réaliser : collecte, remboursement, payout, statut… |
| Payment Endpoint | Interface technique par laquelle une capacité est invoquée chez un partenaire. |
| Mapping | Règles de traduction entre le modèle interne et le format attendu ou retourné par le partenaire. |
| Idempotence | Capacité à reconnaître une même demande répétée et à éviter de produire plusieurs effets financiers involontaires. |
| Ledger | Grand livre ou journal comptable interne retraçant les mouvements par des écritures équilibrées. |
| Payout | Versement de fonds vers un bénéficiaire, par exemple le compte bancaire du client. |
| Refund | Remboursement de fonds précédemment collectés. |
| Reversal | Écriture compensatrice qui corrige un mouvement comptable antérieur. |
| Settlement | Règlement de fonds entre acteurs ou vers un compte convenu, selon le modèle contractuel. |
| Reconciliation | Comparaison entre les enregistrements internes et les données financières du partenaire ou de la banque. |
| Bounded context | Frontière fonctionnelle dans laquelle un modèle et un vocabulaire métier sont définis de manière cohérente. |

## Conclusion et méthode de travail proposée

La plateforme doit être pensée comme un produit financier composé de responsabilités métier distinctes, et non comme une simple collection de connecteurs API. La valeur se trouve autant dans l’orchestration des partenaires que dans la maîtrise du cycle de vie client, des demandes de versement, de la comptabilité, des contrôles et du rapprochement.

La prochaine étape consiste à reprendre ce référentiel domaine par domaine. Pour chaque cœur métier, nous pourrons préciser les acteurs, les cas d’usage, les règles, les états, les exceptions, les données métier et les interactions avec les autres domaines. Ce travail servira ensuite de base aux schémas entité-association, aux contrats fonctionnels et au découpage technique.

| Ordre de discussion recommandé / 1) Cycle de vie client et activation ; 2) Partenaires, méthodes et capacités ; 3) Configuration des endpoints ; 4) Collecte et cycle de vie transactionnel ; 5) Comptabilité et soldes ; 6) Versements ; 7) Frais, rapprochement, conformité et opérations avancées. |
| --- |
