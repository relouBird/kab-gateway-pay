# ADR-002 — Applications frontend, contrats partagés et routage mutualisé

**Projet :** KG Pay (Kab Gateway Payment)
**Date :** 20 novembre 2026
**Statut :** Proposé, à valider
**Portée :** Organisation des interfaces web et de leur accès aux services backend. Les exigences fonctionnelles détaillées restent dans le CDC de chaque cœur métier.

**Légende**

- **[DÉCISION]** : choix exprimé par le porteur du projet.
- **[PROPOSITION]** : approche recommandée, à confirmer.
- **[POINT OUVERT]** : dépend d'une décision ou d'une contrainte encore inconnue.

## 1. Contexte

Le référentiel v0.3 décrit un espace client et un back-office interne. L'ADR-001 organise les microservices backend, mais ne définit pas les applications frontend, leur structure de dépôt, leur mode de déploiement ni leur routage public.

Le porteur du projet souhaite des interfaces distinctes pour les publics différents, tout en évitant de dupliquer les contrats et les composants réellement communs. Le projet React/Vite `nexus-gate-web` est la référence frontend/auth : il contient des dossiers `components`, `composables`, `services`, `stores`, `routes` et `types`, ainsi que des pages d'authentification, Yup, Zustand et des clients HTTP. C'est une référence de conventions, pas le dépôt KG Pay ni une source de contrats backend à recopier.

Le parcours d'inscription de `nexus-gate-web` crée une équipe et un compte `CREATOR` : il ne correspond pas au parcours KG Pay de particulier `CUSTOMER` et d'employé `STAFF` invité. Son code client ne fournit pas l'implémentation backend ni un contrat OpenAPI validé. Ne pas reprendre sans correction son stockage d'access token en `sessionStorage`, sa journalisation/interception Axios ou son état de vérification OTP.

La cible de déploiement envisagée est un hébergement mutualisé. Sa capacité à héberger les processus backend et à router les chemins vers plusieurs services reste à vérifier.

## 2. Orientations proposées

| # | Orientation | Statut |
| --- | --- | --- |
| D1 | Ajouter les applications frontend au monorepo lorsque le dépôt applicatif sera initialisé ; les CDC décrivent les exigences frontend et backend d'un même cœur. Ne pas créer un CDC autonome pour le frontend. | [DÉCISION] sur la méthode documentaire |
| D2 | Séparer les surfaces selon leurs publics (espace client et back-office) en deux applications distinctes : `apps/customer-portal` (livrée en premier) et `apps/staff-portal`. | [DÉCISION] confirmée par le porteur le 23 novembre 2026 |
| D3 | Partager les contrats HTTP (schémas de requête/réponse et types TypeScript) dans `@kgpay/contracts`, avec Yup pour les schémas validés et leurs types inférés (export `@kgpay/contracts/transport`). Les règles métier et la validation serveur restent sous l'autorité du backend ; le navigateur ne constitue jamais une frontière de sécurité. | [DÉCISION] confirmée par le porteur le 23 novembre 2026 |
| D4 | Ne partager un composant visuel frontend qu'après avoir identifié un usage commun réel. Les packages partagés restent techniques ou de présentation, sans modèle de domaine ni décision métier. | [PROPOSITION] |
| D5 | Privilégier des URLs sous un même domaine et un routage par chemin pour les services (ex. `/auth/*`, `/payments/*`) si l'hébergeur permet un reverse proxy ou mécanisme équivalent. Le routage reste une fonction d'infrastructure, pas une API Gateway applicative, conformément à ADR-001 D3. | [PROPOSITION] |
| D6 | Réserver un domaine API distinct, par exemple `api.<domaine>`, à une éventuelle API publique destinée aux intégrateurs. Cette exposition est hors du premier incrément et nécessitera ses propres contrôles et contrats. | [PROPOSITION] |
| D7 | Concevoir d'abord des interfaces web responsive pour mobile et desktop. Une PWA est une extension ultérieure ; elle ne doit pas conserver de secrets ou de données financières privées hors ligne. | [PROPOSITION] |
| D8 | Prévoir les interfaces en français et en anglais pour le Cameroun. Le backend/configuration gouverne les devises réellement disponibles ; l'interface affiche et formate les montants à partir du code devise et des unités mineures fournis, sans calcul financier en nombres flottants. | [DÉCISION] langues et devises envisagées ; [PROPOSITION] responsabilités d'affichage |
| D9 | Pour une action UI déclarée annulable, différer l'envoi de la requête de deux secondes et permettre l'annulation côté client pendant ce délai. Après envoi, seule la réponse serveur confirme le succès ou l'échec. | [DÉCISION] délai et comportement frontend |
| D10 | Utiliser un marqueur de suppression logique (ex. `deletedAt`) seulement pour les domaines qui l'exigent ; les écritures ledger, événements d'audit et traces financières ne sont jamais supprimés physiquement. | [PROPOSITION] |
| D11 | Créer un client Axios réutilisable qui expose une instance configurée par service backend, avec un `baseURL` indépendant. Chaque service reste déployable et configurable séparément. | [DÉCISION] besoin fonctionnel ; [PROPOSITION] structure technique |

## 3. Partage des contrats sans partager les responsabilités métier

`@kgpay/contracts` peut exposer, pour chaque API, un schéma Yup de transport et le type TypeScript dérivé de ce schéma. L'application frontend peut ainsi valider une saisie et typer les appels, tandis que le backend valide à nouveau toutes les entrées reçues.

La validation partagée couvre la forme du contrat (champs, types, format et contraintes de transport). Elle ne remplace pas les contrôles backend dépendant de l'identité, de l'état des données, des permissions, de la propriété d'une ressource, de l'éligibilité ou d'une règle financière. Les entités Prisma et les modèles internes des services ne sont pas publiés dans ce package.

Le package est compilé et intégré aux artefacts frontend/backend pendant le build ; il n'est pas déployé comme un serveur ou un composant runtime séparé.

Les composants React partagés éventuellement extraits dans un package distinct doivent rester de présentation et d'accessibilité. L'espace client et le back-office conservent leurs parcours, leur navigation, leurs permissions et leur logique de présentation propres.

Le délai d'annulation de deux secondes est une fenêtre locale avant l'envoi HTTP ; il ne signifie pas que le backend attend deux secondes avant d'exécuter une suppression. En cas d'annulation, aucune requête n'est envoyée. En cas d'erreur serveur, l'interface conserve ou restaure l'état et affiche l'erreur ; une notification de réussite n'est affichée qu'après confirmation serveur.

### 3.1 Client HTTP Axios par service

- Une fabrique technique reçoit une configuration de services et crée une instance Axios par service (par exemple `authApi`, `customerApi`, `paymentApi`), chacune avec son `baseURL`.
- Les instances sont créées une fois par application/configuration, puis injectées ou importées par les services frontend. Ne pas recréer une instance Axios à chaque appel HTTP.
- Le même mécanisme accepte une URL relative sous un domaine commun (par exemple `/auth`, `/payments`) ou une URL absolue si un service est déployé sur un domaine distinct. Les valeurs sont de la configuration publique non secrète ; aucune clé ou secret ne va dans une variable `VITE_*`.
- Les intercepteurs partagés peuvent propager `correlationId`, gérer les en-têtes communs et normaliser les erreurs. L'ajout d'identifiants d'authentification doit suivre une politique explicite (client public/privé ou option de requête typée), jamais une déduction fragile par recherche de sous-chaîne dans l'URL.
- Aucun intercepteur ne journalise l'objet Axios complet, le corps de requête/réponse, le mot de passe, le code MFA/OTP ou les jetons. Les réponses d'erreur réseau sans `response` doivent rester traitées explicitement.
- Le choix de transport d'authentification (cookie sécurisé ou jeton) et de stockage frontend reste un point ouvert du CDC-01 ; la fabrique ne doit pas figer ce choix implicitement.

## 4. Structure applicative indicative

Cette arborescence illustre la proposition ; elle n'est pas créée ni figée par cet ADR.

```text
kgpay/
├── apps/
│   ├── customer-portal/       # espace client
│   └── staff-portal/          # interface du personnel
├── packages/
│   ├── contracts/             # contrats HTTP/événements et schémas partagés
│   └── ui/                    # composants visuels réellement communs, si nécessaire
├── services/
│   └── auth-service/
└── docs/
```

Le découpage en deux applications est à confirmer. Une première livraison peut limiter les interfaces réellement développées au seul périmètre du CDC-01, sans construire les écrans métier des cœurs suivants.

Le projet de référence présente les conventions suivantes, à reprendre seulement si elles sont confirmées dans le dépôt cible :

- `components/` pour les composants React, regroupés par usage ou domaine d'interface ;
- `composables/` pour les hooks React réutilisables (`use...`) et quelques fabriques techniques telles que le client Axios ;
- `services/` pour les appels HTTP d'un domaine ;
- `stores/` pour l'état partagé côté interface ;
- `routes/` pour les pages et points d'entrée de navigation ;
- `types/` pour les types locaux qui ne font pas partie des contrats partagés.

## 5. Routage et hébergement

Le modèle envisagé est un domaine commun avec des préfixes de chemin, par exemple :

```text
https://<domaine>/auth/*       -> auth-service
https://<domaine>/payments/*   -> payment-service
https://<domaine>/             -> interface web
https://api.<domaine>/*        -> éventuelle API d'intégration publique
```

Les chemins d'exemple ne constituent pas encore des routes HTTP contractuelles. Le proxy doit acheminer les requêtes vers les services sans fusionner leurs responsabilités ni leurs bases de données.

**[POINT OUVERT] Vérification indispensable avant validation de D5 :** confirmer que l'offre mutualisée autorise les processus Node.js persistants nécessaires, le routage/reverse proxy par chemin, TLS, la configuration de variables secrètes, les connexions aux bases requises et les redémarrages/health checks. Si elle ne le permet pas, le déploiement backend devra être adapté ; servir les fichiers statiques frontend sur l'hébergement mutualisé ne suffit pas à héberger les microservices.

## 6. Internationalisation, devises et PWA

- L'interface doit pouvoir présenter le français et l'anglais ; les textes utilisateur ne doivent pas être dispersés en chaînes non traduisibles dans les pages.
- Les devises envisagées au lancement sont EUR, USD et XAF (FCFA). Leur disponibilité opérationnelle et les capacités pays/devise doivent être confirmées par le backend et les contrats partenaires.
- Les montants arrivent avec un code devise et une représentation entière en unité mineure. L'interface les formate pour l'affichage ; elle ne détermine ni le taux de conversion ni l'éligibilité d'une devise.
- La conception doit être responsive dès le web initial. Le manifeste, l'installation PWA, les stratégies de cache et les notifications push sont à cadrer séparément avant activation.
- **[PROPOSITION]** Ne pas mettre en cache hors ligne les réponses authentifiées, tokens, informations d'identité, soldes ou opérations financières.

## 7. Sécurité frontend et limites de confiance

- Le navigateur ne décide jamais de l'autorisation : chaque service protège ses endpoints et vérifie identité, permission et propriété de la ressource.
- Les données personnelles ou financières ne sont pas écrites dans les journaux navigateur ou les traces de requêtes.
- Le choix de stockage web des sessions/jetons, la protection CSRF/XSS, le renouvellement, la déconnexion et le step-up doit être documenté dans le CDC du cœur 1 avant mise en production.
- La fenêtre UI de deux secondes ne retarde pas une action de sécurité urgente. La désactivation d'une identité compromise et les autres actions sensibles doivent suivre leur règle métier explicite, sans devenir réversibles par simple annulation d'une notification.
- Une suppression backend peut être logique (`deletedAt`) lorsque les règles du domaine, l'audit et la conservation l'exigent. Ce choix se fait dans le CDC du domaine concerné ; les données comptables/audit immuables ne sont pas supprimées.
- Aucune interface ne doit présenter comme définitif un état de paiement ou d'activation que le backend n'a pas confirmé.

## 8. Points à confirmer

1. Offre mutualisée exacte et support du reverse proxy, des processus Node.js et des bases.
2. ~~Deux applications déployables ou deux zones d'une même application.~~ Tranché : deux applications (D2).
3. ~~Contrat et version de Yup dans `@kgpay/contracts`~~ (tranché, D3 ; Yup `^1.7.1`) ; critères justifiant un package partagé de composants UI restent à définir.
4. Stratégie de session dans les navigateurs et origines exactes des interfaces et API.
5. ~~Langue initiale par défaut et manière de mémoriser le choix français/anglais.~~ Tranché : langue du navigateur avec repli sur le français, choix mémorisé en `localStorage` (`kgpay.locale`).
6. Devise par défaut, unités mineures et source de la liste des devises autorisées.
7. Ressources auxquelles s'applique la fenêtre annulable de deux secondes ; exclusions nécessaires pour les actions financières, sensibles et de sécurité urgente.
8. Périmètre exact réalisable dans le premier incrément d'une journée.
9. Liste des services frontend à configurer et leurs `baseURL` par environnement ; les noms de services ne figent pas encore leurs routes publiques.

## 9. Conséquences

- Le README et le CDC-01 doivent préciser que le frontend est cadré dans le même CDC que le cœur backend.
- Les CDC doivent définir les états et messages UI correspondant aux états métier ; les détails propres au produit ne sont pas déplacés dans un « CDC frontend » global.
- Les contrats partagés doivent rester compatibles avec le build des services autonomes et être consommés par les interfaces sans accès aux bases des services.
- La compatibilité de l'hébergement mutualisé n'est pas présumée et constitue une condition d'architecture à vérifier.

## 10. Transmission au frontend — cœur 1 (23 novembre 2026)

> **Information de mise en œuvre, sans changement du statut de cet ADR :** les orientations marquées [PROPOSITION] restent à confirmer. Cette section décrit l'état vérifié du backend et les ressources disponibles pour démarrer les interfaces du CDC-01.

- **Exigences d'interface :** suivre les parcours et critères du [CDC-01](../cdc/CDC-01-identite-acces.md), notamment §4.6, IAM-F-22 à IAM-F-25 et §8.10. Le backend reste l'autorité pour l'identité, le MFA, les permissions et la propriété des ressources.
- **Contrat publié :** en développement/test, `GET /docs-json` expose le document OpenAPI courant et `/docs` son interface Swagger. Ces routes sont désactivées en production. La [collection Postman `auth-service`](../../services/auth-service/collections/auth-service.postman_collection.json) est fournie comme aide d'intégration et contient 38 opérations au 23 novembre 2026 ; son import et ses variables locales sont décrits dans le [README d'auth-service](../../services/auth-service/README.md). À chaque évolution de l'API, confronter la collection au `/docs-json` courant et maintenir les deux artefacts synchronisés.
- **Parcours d'authentification à respecter :** `CUSTOMER` et `STAFF` se connectent par e-mail et mot de passe, puis valident un OTP e-mail à chaque nouvelle connexion. Aucune session complète n'est disponible avant cette validation. Le CDC-01 précise le stockage navigateur du jeton d'accès et le cookie de refresh ; les appels CSRF/refresh/logout sont illustrés dans la collection.
- **État de recette :** les parcours principaux CUSTOMER/STAFF, l'intégration SMTP réelle via Maildev, le lint, le typecheck, les tests unitaires et le build ont été validés. Cela ne vaut pas recette complète du CDC-01 ; ses critères et points ouverts restent la référence. Le détail de la recette est tracé dans le [journal CDC-01 du 22 novembre](../journal/2026-11-22/CDC-01-identite-acces.md).
- **[POINT OUVERT — CDC-01 §10, point 16] Courriels backend :** les messages d'OTP et d'invitation sont actuellement envoyés en texte simple, sans gabarit visuel HTML. Leur conception et validation visuelles restent à faire en coordination avec l'implémentation frontend ; aucune identité visuelle ni format final n'est décidé ici.

## 11. Mise en œuvre — `customer-portal` (23 novembre 2026)

> **Information de mise en œuvre, sans changement du statut global de cet ADR.** Seules D2 et D3 sont passées en [DÉCISION] ; les autres orientations restent des [PROPOSITION].

- **Application :** `apps/customer-portal` (React 19, Vite, React Router, Zustand, react-i18next, Axios, Vitest + Testing Library). Les dépendances sont déclarées dans son manifest ; les polices Inter, Inter Tight et IBM Plex Mono sont servies localement via Fontsource.
- **Contrats partagés :** `@kgpay/contracts/transport` expose les schémas Yup (messages = clés i18n) et les types de transport. L'application le consomme par alias vers les sources (Vite et `paths` TypeScript), car le package compile en CommonJS. Aucune entité Prisma ni règle métier n'y figure.
- **Client HTTP (D11) :** fabrique `createHttpClient` ; une instance `authApi` pour `auth-service`, `baseURL` issu de `VITE_AUTH_API_URL__CUSTOMER_PORTAL`. L'authentification est demandée explicitement par appel (`authentication: "access-token"`), jamais déduite de l'URL ; un seul rejeu après refresh sur 401. Aucune journalisation de payload ni de jeton.
- **Session :** access token et état de session en mémoire uniquement. Le refresh passe par `GET /auth/csrf` (le cookie `kgpay_csrf` est limité au chemin `/auth`) puis `POST /auth/refresh`, sérialisé (single-flight + `navigator.locks`) car la rotation révoque la famille de sessions en cas de réutilisation.
- **Variables d'environnement :** `VITE_AUTH_API_URL` (requise), `VITE_PASSWORD_MIN_LENGTH` et `VITE_OTP_RESEND_COOLDOWN_SECONDS` (optionnelles) sous le préfixe `__CUSTOMER_PORTAL`. Ces deux valeurs dupliquent la configuration backend (`PASSWORD_MIN_LENGTH`, `OTP_RESEND_COOLDOWN_SECONDS`) : le backend reste l'autorité.
- **[POINT OUVERT]** Origines/cookies/CSRF en production, absence de `GET /auth/me` (l'e-mail courant n'est pas affichable), compatibilité de l'hébergement mutualisé.

## 12. Mise en œuvre — `staff-portal` (23 novembre 2026)

> **Information de mise en œuvre, sans changement du statut global de cet ADR.** D2 et D3 restent [DÉCISION] ; les autres orientations demeurent [PROPOSITION] ou [POINT OUVERT].

- **Application :** `apps/staff-portal` est un workspace React 19/Vite distinct, aligné sur l'espace client pour React Router, Zustand, react-i18next, Axios, Yup, Vitest/Testing Library, polices locales et identité visuelle KG Pay.
- **Architecture UI :** `App.tsx` reste limité au bootstrap ; les routes, layouts/gardes, pages, composants UI, composantes d'administration, composables, traductions FR/EN et feuilles `tokens/base/components` suivent désormais l'organisation de `customer-portal`. Les parcours STAFF et les contrats d'API restent propres à cette application.
- **Parcours :** connexion personnel avec OTP obligatoire, acceptation d'invitation, récupération/réinitialisation de mot de passe, gestion des identités/rôles, récupération d'e-mail STAFF avec step-up, journal/revue des accès et sessions propres accessibles à tout STAFF authentifié. L'interface masque les fonctions d'administration aux comptes sans `GLOBAL_SUPER_ADMIN` uniquement pour l'ergonomie ; `auth-service` conserve l'autorité d'accès.
- **Transport :** les types et schémas de validation de l'administration sont ajoutés à `@kgpay/contracts/transport`. L'application utilise les routes existantes, les preuves step-up et les clients Axios authentifiés explicitement. L'access token reste en mémoire ; le refresh utilise le cookie sécurisé et les appels CSRF/refresh/logout.
- **Configuration :** `VITE_AUTH_API_URL__STAFF_PORTAL` et l'origine locale `http://localhost:5174` sont ajoutées au modèle `.env.example`/CORS.
- **Limites / points ouverts :** le catalogue d'autorisations publié ne permet aucune permission non-super-admin aux rôles personnalisés ; `GET /admin/identities` ne fournit pas `lockedUntil` ; aucune route ne liste les sessions d'une autre identité. Les gabarits HTML bilingues OTP/invitation sont une proposition ; la copie finale et la recette de livraison restent ouvertes (CDC-01 §10.16). Le lien d'invitation STAFF est optionnel via `STAFF_PORTAL_URL__AUTH_SERVICE`.
