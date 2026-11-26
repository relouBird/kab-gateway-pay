# KG Pay — Guide développeur

> **État au 23 novembre 2026 :** le workspace pnpm/Turborepo, `auth-service`, `apps/customer-portal` et `apps/staff-portal` sont présents. Les deux portails couvrent les parcours frontend du CDC-01 ; les gabarits HTML bilingues OTP/invitation sont implémentés en proposition, leur copie et la recette de livraison restent à valider. Le remote `origin` pointe vers GitHub et `dev` suit `origin/dev`.

## Démarrage d'une nouvelle tâche

1. Avant tout travail de code, lire ensuite `AGENTS.md`.
2. Lire [`docs/README.md`](./docs/README.md) pour les sources de vérité, l'état des cœurs et les invariants.
3. Lire [`docs/architecture/ADR-001-monorepo-microservices.md`](./docs/architecture/ADR-001-monorepo-microservices.md).
4. Pour toute tâche frontend, routage ou déploiement, lire aussi [`docs/architecture/ADR-002-applications-frontend-et-routage-mutualise.md`](./docs/architecture/ADR-002-applications-frontend-et-routage-mutualise.md).
5. Lire le référentiel v0.3 et le CDC du cœur concerné. Le premier est CDC-01 — Identité et accès : [`docs/cdc/CDC-01-identite-acces.md`](./docs/cdc/CDC-01-identite-acces.md).
6. Ignorer `master/` (références PDF/Word administratives) sauf demande explicite du porteur du projet. Ne pas lire `node_modules`, les secrets `.env` ni les sorties générées.

Le CDC d'un cœur couvre ses exigences frontend **et** backend. Ne pas créer un cahier des charges global distinct pour le frontend.

## État de la base applicative

- `services/auth-service` implémente les parcours backend du CDC-01 : OTP e-mail obligatoire, rôles, sessions, administration, audit, outbox, Swagger et persistance PostgreSQL/Prisma. Les parcours CUSTOMER et STAFF sont testés sur un schéma PostgreSQL temporaire isolé ; une recette complémentaire vérifie la livraison SMTP réelle via Maildev/MCP pour les OTP de contact, connexion, récupération et step-up, ainsi que l'invitation STAFF. Les autres exigences et scénarios de sécurité du CDC-01 restent à couvrir avant de déclarer la recette complète.
- `apps/customer-portal` est l'espace client du CDC-01 (React/Vite) : inscription, OTP e-mail, connexion, récupération/changement de mot de passe, changement d'e-mail/téléphone avec step-up, sessions. Il consomme `auth-service` et les schémas Yup de `@kgpay/contracts/transport`. Pour l'utiliser en développement, ajouter l'origine `http://localhost:5173` à `AUTH_CORS_ORIGINS__AUTH_SERVICE` et les clés `VITE_*__CUSTOMER_PORTAL` de `.env.example` au `.env` racine.
- `apps/staff-portal` est l'espace personnel du CDC-01 (React/Vite) : connexion OTP, invitation, administration des identités/rôles réservée à `GLOBAL_SUPER_ADMIN`, récupération d'e-mail staff, audit d'accès et sessions propres pour tout STAFF authentifié. Ajouter également `http://localhost:5174` à `AUTH_CORS_ORIGINS__AUTH_SERVICE` et les clés `VITE_*__STAFF_PORTAL` au `.env` racine. Le lien du courriel d'invitation est optionnel via `STAFF_PORTAL_URL__AUTH_SERVICE`.
- `nexus-gate-web` est un exemple séparé de frontend avec des pages d'authentification, Yup, Zustand et Axios. Il sert de référence de conventions, pas de backend, de contrat API ou de modèle d'identité à recopier.
- Le CDC-01 exige un OTP par e-mail après le mot de passe, à chaque nouvelle connexion, pour `CUSTOMER` comme pour `STAFF`. La boîte e-mail devient un facteur de sécurité critique ; cette solution est moins indépendante qu'un authenticator.
- Seul l'e-mail est un identifiant vérifié. Le téléphone est conservé comme moyen de contact non vérifié, sans login, OTP SMS ni récupération de compte.
- Les rôles intégrés V1 sont `GLOBAL_SUPER_ADMIN`, `OPERATIONS_ADMIN`, `CONFIGURATION_ADMIN` et `CUSTOMER`. Le super-admin crée les comptes STAFF et les rôles personnalisés à partir d'un catalogue fermé de permissions ; RP-10 reste obligatoire.
- Le routage par chemin et l'hébergement mutualisé doivent être vérifiés avant le déploiement backend.
- La progression demandée est cœur par cœur, en commençant par le cœur 1. Ne pas générer les autres services avant validation de leurs CDC.

## Architecture cible de travail

L'architecture ci-dessous est cadrée par ADR-001/ADR-002 ; les éléments explicitement marqués « proposition » nécessitent validation avant d'être considérés comme décisions.

- Monorepo pnpm/Turborepo initialisé ; les choix d'architecture encore marqués « proposition » restent à valider.
- Frontends responsive en français et en anglais ; espace client et back-office distincts fonctionnellement.
- Services déployables de manière autonome, avec une base isolée par service. Aucun accès croisé à une base.
- `@kgpay/contracts` partage les schémas Yup et types de transport frontend/backend (ADR-002 D3) ; le serveur reste toujours responsable de valider et d'autoriser.
- Une fabrique Axios réutilisable doit créer/configurer une instance par service, avec `baseURL` par service et environnement. Pas de secrets dans les variables `VITE_*`.
- Routage par chemin sous un domaine commun préféré si l'hébergeur peut fournir un reverse proxy compatible. API publique d'intégration sur domaine distinct : piste future, hors premier incrément.
- PWA et cache hors ligne ultérieurs ; aucune donnée privée/financière authentifiée ne doit être mise en cache hors ligne.

## Dépendances et installation

Le workspace racine utilise pnpm 10.28.2 et Turborepo. Chaque service et application déclare ses dépendances et scripts de vérification dans son propre manifest.

Commandes de validation disponibles :

```bash
pnpm install
pnpm env:build
pnpm env:runtime
pnpm dev
pnpm run build
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm test:e2e:auth-service
pnpm test:e2e:auth-service:isolated
pnpm test:e2e:auth-service:maildev
pnpm build:auth-service
pnpm dev:customer-portal
pnpm dev:staff-portal
pnpm build:customer-portal
pnpm build:staff-portal
pnpm lint:customer-portal
pnpm lint:staff-portal
pnpm typecheck:customer-portal
pnpm typecheck:staff-portal
pnpm test:customer-portal
pnpm test:staff-portal
pnpm start:auth-service
pnpm db:auth-service:generate
pnpm db:auth-service:migrate:dev
pnpm db:auth-service:migrate:deploy
```

La configuration racine déclare Node.js `>=22.20.0` et pnpm `10.28.2` ; les versions résolues sont verrouillées dans `pnpm-lock.yaml`. Les commandes locales, migrations et essais Swagger d'`auth-service` sont documentés dans [son README](./services/auth-service/README.md).

En développement/test, Swagger est accessible sur `/docs` et son contrat OpenAPI JSON sur `/docs-json`. La collection Postman du service est versionnée dans [`services/auth-service/collections/auth-service.postman_collection.json`](./services/auth-service/collections/auth-service.postman_collection.json).

Les scripts racine sont les commandes d'entrée pour les opérations courantes ciblées par workspace (`build:auth-service`, `start:auth-service`, `db:auth-service:*`, `test:*:auth-service`). Les scripts `build`, `dev`, `lint`, `typecheck` et `test` restent déclarés dans chaque workspace pour l'orchestration Turbo.

La configuration locale a une seule source éditable à la racine (`.env`, ignoré par Git). `.env.example` est un modèle sans secrets. Les fichiers par workspace sont générés sous `.generated/env/` ; leur rôle, leur contenu et leur cycle de vie sont décrits dans [docs/README.md](./docs/README.md) et [ADR-001](./docs/architecture/ADR-001-monorepo-microservices.md).

## Git, hooks et validation

- Le dépôt Git local est initialisé à la racine. `main` est la branche principale et `dev` la branche d'intégration ; les branches de travail partent de `dev`. La branche `test` est réservée au déploiement de test et ne remplace pas `dev`.
- `origin` est configuré. Créer une branche de travail depuis `dev` ; pousser et ouvrir une PR suivent la demande du porteur du projet.
- Husky exécute avant chaque commit `lint-staged`, puis les scripts racine de lint, typecheck et tests, et enfin `git diff --cached --check`.
- La CI doit compléter les hooks locaux ; un hook ne remplace pas les suites de tests ou la revue.
- Ne pas ajouter des hooks, scripts ou fichiers de configuration qui prétendent valider sans lancer de vérification effective.

## Versionnement

La version racine de `package.json` est la version commune du monorepo KG Pay ; les versions de workspace ne sont pas modifiées par ce mécanisme. Le workflow `Bump monorepo version` propose une PR de bump après un push sur `dev` (patch) ou `main` (minor). Un lancement manuel depuis `main`, avec confirmation, propose un major bump. Les merges de PR de version seule ne déclenchent pas un nouveau bump.

Le script `node scripts/bump-version.cjs <patch|minor|major>` modifie uniquement le champ `version` du `package.json` racine. Le workflow exécute ses tests ciblés avant de proposer la PR. Le workflow de dépôt effectue un build, mais il n'existe pas encore de CI générale lint/typecheck/tests ; ces validations ciblées ne remplacent pas une CI complète.

## Builds et déploiements PlanetHoster

La production part uniquement de `main`; l'environnement de test part uniquement de la branche `test`. Les entrées GitHub Actions sont :

- [First KG Pay deployment](./.github/workflows/first-deployment.yml), à lancer manuellement une seule fois sur `main`. Elle clone le dépôt sur PH puis installe la première release sans démarrer `auth-service`; après les migrations manuelles et l'amorçage du premier super-admin, l'opérateur démarre l'application. Elle refuse de remplacer un dépôt, un `dist/` ou un historique déjà présent.
- [Deploy main to PlanetHoster](./.github/workflows/build-artifacts.yml), déclenchée automatiquement sur chaque push à `main`; elle peut aussi être lancée manuellement en choisissant `production` ou `test`. La branche doit correspondre à l'environnement choisi.
- [Deploy test to PlanetHoster](./.github/workflows/deploy-test.yml), déclenchée sur chaque push à `test` ou manuellement. Pour son premier lancement, choisir `initialize`; les suivants utilisent `deploy`.

Ces entrées appellent le workflow réutilisable [Build and deploy KG Pay to PlanetHoster](./.github/workflows/deploy-planet-host.yml), qui sélectionne l'environnement GitHub `production` ou `test` et partage les mêmes étapes de build. La publication est séparée en deux étapes GitHub Actions : **Upload release to PlanetHoster** transfère l'archive et les fichiers runtime vers `incoming/`; **Apply release on PlanetHoster** installe la release, publie les portails et redémarre `auth-service`.

GitHub construit avec pnpm sur le runner, puis envoie une archive contenant les builds statiques des portails, les packages compilés, les migrations Prisma et un paquet runtime autonome pour `auth-service`. Ce paquet est produit par `pnpm deploy --prod --legacy` et contient ses dépendances de production, `@kgpay/contracts` et le client Prisma généré pour le moteur natif du runner ainsi que `debian-openssl-1.1.x` utilisé sur PH. Le workflow vérifie la présence de ce dernier moteur avant l'archivage. Avant archivage, le workflow remplace le binaire précompilé d'`argon2` par une compilation depuis les sources, dans une image AlmaLinux 8.10 AMD64 (GLIBC 2.28), avec Node 22.23.5 comme sur PH. Un test de chargement, de hachage et de vérification s'exécute dans cette image cible. Les outils de compilation restent sur le runner/conteneur et ne sont pas requis sur PlanetHoster. PlanetHoster n'a pas besoin de pnpm ni d'exécuter `npm ci` pour ce déploiement. Les `node_modules` présents dans l'archive sont limités au paquet runtime d'`auth-service`; les portails Vite restent des fichiers statiques.

Sur PH, le workflow garde le clone dans `repository/` et les cinq releases datées les plus récentes dans `local-builds/<YYYYMMDDTHHMMSSZ>/`. Après copie des builds web vers `$SERVER_KGAPPS_ROOT/customer-app` et `$SERVER_KGAPPS_ROOT/staff-app`, puis promotion du runtime, le dossier temporaire `SERVER_DEPLOY_ROOT/dist/` est supprimé après succès. En cas d'échec, il reste disponible pour diagnostiquer la release partiellement préparée. `local-builds/` reste l'historique et conserve les artefacts versionnés. Le workflow règle les permissions des dossiers statiques à `755` et des fichiers à `644` pour qu'Apache puisse les lire. Les portails ne nécessitent pas de redémarrage. `auth-service` est redémarré via `cloudlinux-selector` avec son environnement Node dédié.

### Environnement de test

Créer les environnements GitHub `production` et `test` et y configurer les secrets avec les mêmes noms ; les valeurs sont résolues dans l'environnement choisi par le workflow, sans suffixe `_TEST`. Le secret `KG_PAY_APP_ENV` de `test` doit pointer vers une **base de données distincte**, avec ses propres identifiants, secrets runtime et variables `VITE_*` visant l'API/les URLs de test. Il ne faut ni réutiliser l'URL de production ni modifier le schéma `public` de production pour le test.

Les racines d'application doivent aussi être propres à chaque environnement : `SERVER_AUTH_SERVICE_APP_ROOT`, `SERVER_AUTH_SERVICE_NODE_ENV_ACTIVATE` et `SERVER_KGAPPS_ROOT` pointent vers les cibles de test dans l'environnement `test`. `SERVER_DEPLOY_ROOT` garde sa valeur de base ; le workflow ajoute automatiquement `/test` pour le déploiement de test. Cela isole le clone Git, `incoming/`, les releases, le `dist/` temporaire et le verrou sans changer le nom ni la valeur de base du secret. Les secrets SSH et `SERVER_NODE_ENV_ACTIVATE` peuvent garder la même valeur si l'hébergement le permet.

Dans l'environnement GitHub `test`, ajouter aussi la variable non secrète `KG_PAY_DEPLOY_TARGET=test`. Le workflow échoue si cette confirmation manque, si bien qu'un environnement test non configuré ne peut pas commencer le déploiement.

Le déploiement ne lance toujours pas les migrations : appliquer manuellement celles de la base ciblée selon [la procédure Prisma](./docs/deployment/planethoster-manual-migrations.md), en vérifiant le commit de la release du bon environnement.

### Où vont les fichiers d'environnement ?

**Build sur GitHub Actions :** le secret d'environnement `KG_PAY_APP_ENV` contient le profil applicatif complet de l'environnement sélectionné (par exemple `.env.prod` en production et un profil de test distinct en test). Pour le définir depuis PowerShell, utiliser `Get-Content -Raw .env.prod | gh secret set KG_PAY_APP_ENV --env production`, puis configurer séparément la valeur dans l'environnement GitHub `test`. Le workflow recrée temporairement `.env` à la racine du runner à partir du secret, puis les tâches génèrent `.generated/env/<workspace>.build.env`. Les clés de configuration du projet gardent leurs suffixes `__AUTH_SERVICE`, `__CUSTOMER_PORTAL` et `__STAFF_PORTAL`; elles ne sont pas mélangées aux paramètres de serveur `SERVER_*`. Le workflow retire `.env` et `.generated/env/` à la fin de l'étape.

Les valeurs `VITE_*` sont publiques et intégrées aux bundles Vite. Le générateur exclut du fichier de build les clés `runtimeOnly` (base de données, clés et credentials SMTP), et l'archive n'inclut aucun `.env`. Cependant, le fichier `.env` complet est momentanément présent sur le runner pendant `pnpm run build`; le workflow de production et le secret doivent donc rester protégés. `.env.example` reste le modèle local sans secrets; le build de production n'utilise pas ses valeurs par défaut.

La génération Prisma pendant l'empaquetage utilise une URL PostgreSQL synthétique uniquement pour créer le client; elle ne se connecte à aucune base réelle. Les secrets tels que `DATABASE_URL`, les clés JWT/HMAC et les credentials SMTP ne sont pas nécessaires à la compilation, mais les valeurs runtime requises (dont `JWT_SIGNING_SECRET__AUTH_SERVICE`) doivent être présentes dans `KG_PAY_APP_ENV` pour la génération runtime qui suit.

**Runtime d'`auth-service` sur PlanetHoster :** le workflow génère sur GitHub les fichiers runtime depuis le `KG_PAY_APP_ENV` de l'environnement sélectionné, en validant `DATABASE_URL__AUTH_SERVICE` et `JWT_SIGNING_SECRET__AUTH_SERVICE`. Chaque environnement doit avoir sa propre configuration de base de données et ses propres secrets runtime. Le secret HS256 est une chaîne base64url aléatoire d'au moins 64 caractères générée une fois (par exemple `node -p "require('node:crypto').randomBytes(64).toString('base64url')"`), conservée dans le profil correspondant et fournie au runtime; aucun fichier de clé RSA, `JWT_KEY_ID` ou provisionnement spécial sur PH n'est nécessaire. Le workflow transfère séparément de l'archive le runtime filtré d'`auth-service` vers `"$SERVER_AUTH_SERVICE_APP_ROOT/.generated/env/auth-service.runtime.env"`; aucun `.env` source ni runtime secret n'est inclus dans l'artefact GitHub. Le service retrouve ce chemin dans le runtime empaqueté; `RUNTIME_ENV_FILE` peut aussi être défini dans l'application Node CloudLinux comme chemin absolu, mais une valeur placée uniquement dans un `.env` séparé ou dans `KG_PAY_APP_ENV` ne configure pas l'environnement de Passenger avant le chargement. Le runtime généré reste dans l'APP_ROOT privé, avec des permissions limitées à l'utilisateur de l'application. Les clés `OTP_HASH_KEY` et `IP_HASH_KEY`, lorsqu'elles sont utilisées, restent distinctes du secret JWT.

Avant le prochain déploiement, remplacer dans `.env.prod` les anciennes variables `JWT_PRIVATE_KEY_FILE__AUTH_SERVICE`, `JWT_KEY_ID__AUTH_SERVICE` et `AUTH_SIGNING_PUBLIC_KEYS_JSON__AUTH_SERVICE` par `JWT_SIGNING_SECRET__AUTH_SERVICE`, puis actualiser le secret GitHub `KG_PAY_APP_ENV`. Les JWT RS256 déjà émis ne seront pas acceptés après ce changement; les clients devront renouveler leur access token avec leur refresh token (et refaire un step-up si une preuve RS256 est encore en cours de validité).

Le workflow valide puis transfère séparément le runtime généré sur GitHub; ce fichier contient les secrets nécessaires au service et reste dans l'APP_ROOT privé, jamais dans l'archive de release. Le clone source sous `SERVER_DEPLOY_ROOT/repository/` reste disponible pour les opérations Prisma manuelles. Le code d'`auth-service` charge le fichier généré indiqué par `RUNTIME_ENV_FILE`. `SERVER_AUTH_SERVICE_NODE_ENV_ACTIVATE` active l'environnement Node pour la commande de redémarrage; ce n'est pas le fichier de configuration applicatif.

Dans chacun des environnements GitHub `production` et `test`, configurer le secret applicatif `KG_PAY_APP_ENV` avec le contenu du profil correspondant. `gh secret set -f .env.prod` crée des secrets séparés par variable et ne fournit pas le fichier que le workflow reconstruit; utiliser la commande avec l'entrée standard pour le secret fichier. Les anciens secrets individuels créés au niveau dépôt ne sont pas utilisés par le workflow et peuvent être supprimés après vérification.

Configurer également, dans chacun des deux environnements, les secrets de déploiement portant ces mêmes noms :

- `SERVER_DEPLOY_ROOT` (chemin absolu privé, hors de toute racine web publique) ;
- `SERVER_NODE_ENV_ACTIVATE` (environnement Node qui exécute l'outil de release sur PH) ;
- `SERVER_AUTH_SERVICE_NODE_ENV_ACTIVATE` (environnement Node propre à `auth-service`, distinct du précédent) ;
- `SERVER_AUTH_SERVICE_APP_ROOT` (racine CloudLinux privée d'`auth-service`, distincte et non imbriquée dans `SERVER_DEPLOY_ROOT`).
- `SERVER_KGAPPS_ROOT` (racine destinée aux fichiers web des portails ; le workflow y publie `customer-app/` et `staff-app/`, et exige qu'elle soit distincte des racines privées de release et d'`auth-service`, y compris après résolution des liens symboliques).

Configurer aussi les secrets SSH `SERVER_HOST`, `SERVER_USER` et `SERVER_SSH_KEY`. `SERVER_SSH_PORT` est facultatif (défaut `5022`). Le workflow n'exige pas `SERVER_SSH_KNOWN_HOSTS` et désactive la vérification de la clé d'hôte (`StrictHostKeyChecking=no`, `UserKnownHostsFile=/dev/null`) ; il se connecte avec la clé privée fournie, mais ne confirme pas l'identité du serveur. Cela expose la connexion à un risque d'interception ou d'usurpation d'hôte. Les paramètres `SERVER_*` sont des secrets de l'environnement choisi, distincts du profil applicatif, et ne sont jamais écrits dans le `.env` applicatif. Les chemins doivent être des chemins Linux absolus littéraux sans espace ni `..` (ne pas saisir `$HOME`); le workflow indique le nom du paramètre invalide sans afficher sa valeur et rapporte le numéro de ligne pour une erreur de commande distante. La racine effective de test est `$SERVER_DEPLOY_ROOT/test`; ne pas la publier directement comme racine web : un `index.html` seul ne protège pas les archives ni les dépendances du service. Supprimer les anciennes copies dépôt des secrets `KG_PAY_APP_ENV` et des racines `SERVER_*` afin qu'elles ne puissent pas servir de repli si un secret d'environnement manque. L'hôte doit pouvoir cloner le dépôt GitHub par HTTPS ou disposer d'une clé de lecture configurée localement.

L'application Node CloudLinux doit être créée avant le premier déploiement de chaque environnement, hors d'une racine web. Son startup file doit être `runtime/dist/main.js`; le workflow publie le paquet sous `runtime/` dans le `SERVER_AUTH_SERVICE_APP_ROOT` de l'environnement et met à jour séparément son fichier runtime généré. Le clone source reste dans son `SERVER_DEPLOY_ROOT/repository/` pour les opérations manuelles, notamment Prisma; il ne contient aucun `.env`. Le workflow ne migre pas la base de données. La procédure manuelle, avec vérification de la révision retenue dans `local-builds/`, saisie masquée de `DATABASE_URL`, amorçage initial de `GLOBAL_SUPER_ADMIN` et démarrage CloudLinux, est décrite dans [Migrations Prisma manuelles sur PlanetHoster](./docs/deployment/planethoster-manual-migrations.md).

Les chemins réels, la compatibilité des dépendances natives avec le Linux de PH, la connexion de l'application Node et le routage des deux portails vers leurs répertoires `dist` restent à valider sur l'hébergement. Aucun workflow ne doit être lancé en production avant cette recette.

## Documentation et journal de travail

- Les référentiels métier vivent dans `docs/`, les décisions d'architecture dans `docs/architecture/`, les cahiers des charges par cœur dans `docs/cdc/`.
- Toute évolution doit respecter le statut des éléments : `[RÉFÉRENTIEL]`, `[DÉCISION]`, `[PROPOSITION]`, `[POINT OUVERT]`.
- Tracer chaque journée de travail dans `docs/journal/YYYY-MM-DD/`, avec des fichiers distincts par CDC et ADR modifiés ; utiliser `BASE.md` pour les changements transversaux.
- Chaque entrée indique les changements/fichiers, exigences concernées, vérifications réellement effectuées, questions ouvertes et suite.

## Séquence de création recommandée

1. Initialiser Git, `main`/`dev`, le workspace pnpm/Turborepo et le hook local.
2. Terminer l'implémentation et la recette du backend `auth-service` conformément au CDC-01, en gardant visibles ses points ouverts.
3. Finaliser les interfaces client/personnel du CDC-01 : les applications `apps/customer-portal` et `apps/staff-portal` sont présentes ; compléter la recette de bout en bout et valider les copies des gabarits de courriels d'identité.
4. Construire les cœurs suivants après validation de leurs CDC ; ne pas assimiler l'identité authentifiée au statut du dossier client.
5. Vérifier la compatibilité réelle de l'hébergement cible avant d'établir les instructions de déploiement.

Les points ouverts bloquent les fonctionnalités qui en dépendent, mais pas le socle extensible. Aucun parcours authentifié ne sera implémenté sans MFA vérifié.
