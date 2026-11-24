# auth-service

Service du cœur 1 — Identité et contrôle des accès (`CDC-01`). Cette tranche livre le backend ; les interfaces web prévues par le CDC restent à développer.

## Parcours disponibles

- Auto-inscription `CUSTOMER`, vérification d'adresse e-mail et connexion par mot de passe puis OTP e-mail à chaque nouvelle connexion.
- Invitation `STAFF`, acceptation à usage unique, connexion MFA et renvoi d'invitation par un administrateur.
- Récupération du mot de passe par OTP e-mail ; changement de mot de passe et d'adresse e-mail.
- Sessions rotatives, révocables, limitées par sujet ; verrouillage par identité/IP et contrôle d'activité `STAFF`.
- Rôles `CUSTOMER`, `GLOBAL_SUPER_ADMIN`, `OPERATIONS_ADMIN`, `CONFIGURATION_ADMIN`, rôles personnalisés, attribution et retrait protégés.
- Step-up e-mail à usage unique, journal d'accès append-only, événements Transactional Outbox, introspection interne, revue/désactivation des comptes inactifs et JWT HS256.

Les permissions métier des rôles `OPERATIONS_ADMIN` et `CONFIGURATION_ADMIN` seront ajoutées par les CDC propriétaires. Aucun rôle personnalisé ne peut recevoir une permission inconnue ou réservée à l'administration globale. `GLOBAL_SUPER_ADMIN` détient toutes les permissions présentes dans le catalogue versionné.

## Démarrage local

Prérequis : Node.js `>=22.20.0`, pnpm `10.28.2` et un serveur PostgreSQL. pgAdmin est l'outil graphique pour administrer PostgreSQL ; il ne remplace pas le serveur PostgreSQL.

### Démarrer les dépendances

PostgreSQL peut être fourni de deux façons :

1. **Installation locale** : démarrer le service PostgreSQL installé sur la machine, ouvrir pgAdmin, créer la base `kgpay_auth`, puis utiliser dans `.env` l'utilisateur, le mot de passe, le port et le nom de base réellement configurés.
2. **Docker facultatif** : depuis la racine, lancer `docker compose -f docker-compose.dev.yml up -d postgres`. L'image crée la base `kgpay_auth` configurée par le compose. Pour l'arrêter sans supprimer son volume, lancer `docker compose -f docker-compose.dev.yml stop postgres`.

Maildev peut également être lancé de deux façons :

1. **Installation npm globale** : installer une fois avec `npm install -g maildev`, puis démarrer dans un terminal avec `maildev`.
2. **Docker facultatif** : depuis la racine, lancer `docker compose -f docker-compose.dev.yml up -d maildev`.

Les deux modes exposent SMTP sur `127.0.0.1:1025` et l'interface Maildev sur `http://127.0.0.1:1080`. Le compose est une option, pas un prérequis ; ne pas démarrer en même temps deux instances qui tentent d'utiliser les mêmes ports.
Pour exécuter le test e2e SMTP réel, l'instance doit également exposer le MCP Maildev 3 : lancer l'installation npm avec `maildev --mcp`. Le serveur MCP est alors disponible sur `http://127.0.0.1:1080/mcp`. Ne pas redémarrer une instance déjà active uniquement pour ce test ; si MCP n'est pas activé, le test échoue explicitement.

### Préparer la source d'environnement unique

Depuis la racine du dépôt, créer le `.env` local à partir du modèle :

```powershell
Copy-Item .env.example .env
```

Le `.env` racine ignoré par Git est l'unique fichier de configuration à modifier. Renseigner notamment :

- `DATABASE_URL__AUTH_SERVICE` avec l'URL PostgreSQL et les identifiants configurés sur la machine ; encoder les caractères spéciaux du mot de passe selon le format URL.
- Les paramètres `SMTP_*__AUTH_SERVICE` si Maildev n'écoute pas à l'adresse/au port par défaut du modèle.
- `STAFF_PORTAL_URL__AUTH_SERVICE` est optionnelle : si elle est renseignée, l'e-mail d'invitation inclut un lien vers `/accept-invitation`; sinon, l'e-mail conserve le jeton et le formulaire reste accessible manuellement.

Générer des secrets aléatoires distincts pour la signature JWT et le hachage OTP :

```powershell
node -p "require('node:crypto').randomBytes(64).toString('base64url')"
node -p "require('node:crypto').randomBytes(32).toString('hex')"
```

La première commande produit un secret HS256 de 64 octets encodé en base64url (86 caractères). La seconde produit une valeur distincte pour `OTP_HASH_KEY__AUTH_SERVICE`. Reporter chaque valeur dans le `.env` racine sans la committer; si `IP_HASH_KEY__AUTH_SERVICE` est utilisé, générer encore une valeur distincte. Ces commandes n'écrivent aucun fichier.

### Secret de signature de production sur PlanetHoster

Dans `.env.prod`, renseigner une fois `JWT_SIGNING_SECRET__AUTH_SERVICE` avec le résultat de la première commande ci-dessus, puis mettre à jour le secret GitHub `KG_PAY_APP_ENV`. Supprimer du profil les anciennes variables `JWT_PRIVATE_KEY_FILE__AUTH_SERVICE`, `JWT_KEY_ID__AUTH_SERVICE` et `AUTH_SIGNING_PUBLIC_KEYS_JSON__AUTH_SERVICE`. `JWT_SIGNING_PREVIOUS_SECRETS_JSON__AUTH_SERVICE` reste vide en fonctionnement normal. Aucun chemin d'APP_ROOT, identifiant `kid`, fichier RSA ou provisioning sur PH n'est nécessaire.

Le workflow génère le runtime filtré depuis `KG_PAY_APP_ENV` et le transfère vers l'APP_ROOT privé d'`auth-service`. Le secret est inclus uniquement dans ce fichier runtime protégé, jamais dans l'archive de build ni les variables publiques Vite. Tout futur service vérifiant ces JWT devra recevoir le même secret; il pourra donc aussi signer des jetons. Les JWT RS256 actuellement en circulation ne seront pas acceptés après la migration; les clients devront rafraîchir leur access token et refaire un step-up si une preuve RS256 reste active. Pour une rotation, définir le nouveau `JWT_SIGNING_SECRET__AUTH_SERVICE` et placer l'ancien secret dans `JWT_SIGNING_PREVIOUS_SECRETS_JSON__AUTH_SERVICE` (tableau JSON), puis retirer l'ancien après expiration des jetons qu'il a signés. Les secrets précédents doivent être fournis aux services vérificateurs pendant le chevauchement.

### Emplacement et cycle de vie des fichiers générés

Le générateur lit `.env` à la racine et filtre les variables avec `services/auth-service/env.schema.json`. Il ne lit pas `.env` directement dans le code métier.

- `.generated/env/auth-service.build.env` : variables non secrètes autorisées au build. Ce fichier ne contient ni `DATABASE_URL`, ni clés, ni credentials ; il n'est pas copié dans `dist`.
- `.generated/env/auth-service.runtime.env` : variables du processus `auth-service`, dont `DATABASE_URL` et les secrets nécessaires au service. `start`, `start:dev`, `start:prod`, la CLI d'initialisation et les commandes de migration le génèrent ou le chargent automatiquement.
- Les deux fichiers sont générés sous `.generated/env/` à la racine, ignorés par Git et remplaçables à tout moment. Les autres workspaces produiront des fichiers avec leur propre nom, par exemple `.generated/env/customer-portal.build.env`.

En production sur PlanetHoster, le workflow reconstruit temporairement le profil `.env.prod` depuis le secret GitHub `KG_PAY_APP_ENV`, puis génère le runtime filtré pour `auth-service` avec les noms non suffixés attendus par l'application. Ce fichier est transféré séparément de l'archive vers `"$SERVER_AUTH_SERVICE_APP_ROOT/.generated/env/auth-service.runtime.env"`; le `.env` source n'est jamais copié sur PH ni inclus dans un artefact. Configurer `KG_PAY_RUNTIME_ENV_FILE` dans l'application Node CloudLinux avec le chemin absolu du fichier généré. Aucun fichier de clé séparé n'est créé. Le clone source reste sous `SERVER_DEPLOY_ROOT/repository/` pour les opérations manuelles; seul `runtime/` est remplacé lors d'une release.

Commandes de génération explicite :

```powershell
pnpm env:build
pnpm env:runtime
```

Le build et le démarrage via Turbo déclenchent eux-mêmes la génération appropriée. Les secrets ne sont jamais injectés dans les builds ni les bundles frontend.

Appliquer la migration et lancer le service :

```powershell
pnpm db:auth-service:migrate:dev
pnpm start:auth-service
```

Le service écoute sur `http://localhost:3000`. Swagger est disponible sur [`http://localhost:3000/docs`](http://localhost:3000/docs) et son contrat OpenAPI JSON sur [`http://localhost:3000/docs-json`](http://localhost:3000/docs-json), en développement/test uniquement. La liveness `GET /health` ne nécessite ni authentification ni accès à la base une fois le service démarré.

Maildev reçoit les messages sur `127.0.0.1:1025` et expose sa boîte de réception sur [`http://127.0.0.1:1080`](http://127.0.0.1:1080). Aucune authentification SMTP n'est configurée dans les fichiers versionnés. Les OTP (vérification, connexion, récupération et step-up) et les invitations STAFF sont envoyés en HTML et texte simple, en français ou en anglais. Le lien d'invitation n'est inclus que si `STAFF_PORTAL_URL__AUTH_SERVICE` est valide ; son absence n'empêche pas l'envoi.

## Essayer les parcours dans Swagger

1. `POST /auth/register`, puis relever le code dans Maildev et appeler `POST /auth/verify-contact`.
2. `POST /auth/login`, relever le nouvel OTP envoyé par e-mail, puis appeler `POST /auth/mfa/verify`.
3. Copier `accessToken` dans **Authorize** avec le schéma bearer pour appeler les routes authentifiées.
4. Pour initialiser le premier administrateur, lancer `pnpm auth:bootstrap` dans un terminal interactif. La CLI demande le mot de passe sans l'afficher, envoie un OTP à l'adresse choisie et vérifie ce code avant d'activer le premier `GLOBAL_SUPER_ADMIN`.
5. Pour une route protégée par step-up, appeler `POST /auth/step-up` avec la catégorie d'action, relever le code e-mail, puis rappeler la route avec la preuve retournée via le schéma Swagger `step_up_proof`.
6. Pour tester refresh/logout par cookie, appeler `GET /auth/csrf`, conserver le cookie et la valeur retournée, puis autoriser le schéma `csrf_token` avec cette valeur avant `POST /auth/refresh` ou `POST /auth/logout`.

Swagger conserve les cookies nécessaires au même hôte mais ne persiste pas les jetons d'autorisation dans le navigateur. Les routes internes d'introspection nécessitent une entrée runtime `AUTH_SERVICE_CLIENTS_JSON` et les schémas Swagger `service_client`/`service_secret`.

## Contrat API et collection Postman

`GET /docs-json` est le document OpenAPI 3.0 généré depuis les contrôleurs et DTO ; il répertorie les 37 opérations HTTP de l'API et leurs schémas. Il permet à Swagger UI, Postman et aux agents de découvrir les routes sans parcourir le code. Swagger et le JSON OpenAPI sont désactivés en production.

La collection [auth-service.postman_collection.json](./collections/auth-service.postman_collection.json) reprend ces 37 opérations et leurs corps requis. Importer le fichier dans Postman, créer/sélectionner un environnement local non partagé, définir `baseUrl` et y renseigner les variables de test. Les OTP doivent être lus dans Maildev et saisis dans `otpCode` ; après une réponse, les valeurs `challengeId`, `accessToken`, `sessionId`, `proof` et `csrfToken` sont enregistrées dans l'environnement actif lorsqu'elles sont présentes. Le cookie jar Postman conserve les cookies refresh/CSRF ; appeler `GET /auth/csrf` avant les opérations refresh/logout et après chaque rotation.

Ne pas enregistrer de vrais mots de passe, OTP, preuves, jetons ou credentials de service dans la collection partagée. Les identifiants doivent être configurés comme variables locales Postman.

## Migrations et qualité

Les migrations Prisma sont versionnées sous `prisma/migrations/`. La migration initiale protège aussi `AccessEvent` contre les mises à jour/suppressions. Commandes disponibles :

```powershell
pnpm db:auth-service:generate
pnpm db:auth-service:migrate:dev
pnpm db:auth-service:migrate:deploy
pnpm lint:auth-service
pnpm typecheck:auth-service
pnpm test:auth-service
pnpm test:e2e:auth-service
pnpm test:e2e:auth-service:isolated
pnpm test:e2e:auth-service:maildev
pnpm build:auth-service
```

`pnpm test:e2e:auth-service` exécute le test e2e de liveness. `pnpm test:e2e:auth-service:isolated` exécute les parcours d'intégration HTTP sur une base PostgreSQL locale : inscription, MFA, step-up, sessions/refresh/logout, récupération de mot de passe, amorçage du super-admin et invitation/MFA STAFF avec contrôle de permission. Le runner crée un schéma au nom aléatoire, applique les migrations, remplace les transports email par des boîtes mémoire de test pour récupérer OTP et invitation, puis supprime uniquement ce schéma. Il refuse les URL de base qui ne pointent pas vers localhost. Ces tests n'exercent donc pas la livraison SMTP réelle ni l'ensemble des critères de recette CDC-01.
`pnpm test:e2e:auth-service:maildev` utilise le même schéma isolé, mais conserve le transport SMTP configuré et récupère les OTP via les outils MCP de l'instance Maildev locale. Il n'envoie des messages qu'à une adresse synthétique `example.test`, refuse un `SMTP_HOST` distant et supprime uniquement les messages reçus par cette adresse. La commande exige `maildev --mcp` ; elle n'arrête ni ne relance Maildev.

La CLI `pnpm auth:bootstrap` est une commande interactive de premier amorçage, pas un endpoint HTTP/Swagger. Son script actuel dépend du workspace pnpm, de `ts-node`, du fichier runtime généré à la racine et d'un terminal permettant la saisie masquée. Le paquet runtime construit pour PlanetHoster inclut l'API compilée et ses dépendances de production, mais pas un parcours validé pour ce CLI. Le démarrage réel sur PH, la configuration des variables runtime dans CloudLinux et l'amorçage du premier administrateur restent à vérifier séparément.

Les valeurs numériques du CDC-01 §8.5 restent des valeurs proposées configurables, pas des décisions métier. Les interfaces client/personnel, le parcours support de récupération d'un `CUSTOMER` ayant perdu sa boîte e-mail, le fournisseur SMTP de production et le choix du broker restent ouverts. En attendant le broker, le relay local journalise uniquement les identifiants/noms d'événement ; les payloads restent dans l'outbox et ne sont pas envoyés à des consommateurs.
