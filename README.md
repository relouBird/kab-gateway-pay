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
pnpm auth:keygen
pnpm db:auth-service:generate
pnpm db:auth-service:migrate:dev
pnpm db:auth-service:migrate:deploy
```

La configuration racine déclare Node.js `>=22.20.0` et pnpm `10.28.2` ; les versions résolues sont verrouillées dans `pnpm-lock.yaml`. Les commandes locales, migrations et essais Swagger d'`auth-service` sont documentés dans [son README](./services/auth-service/README.md).

En développement/test, Swagger est accessible sur `/docs` et son contrat OpenAPI JSON sur `/docs-json`. La collection Postman du service est versionnée dans [`services/auth-service/collections/auth-service.postman_collection.json`](./services/auth-service/collections/auth-service.postman_collection.json).

Les scripts racine sont les commandes d'entrée pour les opérations courantes ciblées par workspace (`build:auth-service`, `start:auth-service`, `db:auth-service:*`, `test:*:auth-service`). Les scripts `build`, `dev`, `lint`, `typecheck` et `test` restent déclarés dans chaque workspace pour l'orchestration Turbo.

La configuration locale a une seule source éditable à la racine (`.env`, ignoré par Git). `.env.example` est un modèle sans secrets. Les fichiers par workspace sont générés sous `.generated/env/` ; leur rôle, leur contenu et leur cycle de vie sont décrits dans [docs/README.md](./docs/README.md) et [ADR-001](./docs/architecture/ADR-001-monorepo-microservices.md).

## Git, hooks et validation

- Le dépôt Git local est initialisé à la racine. `main` est la branche principale et `dev` la branche d'intégration ; les branches de travail partent de `dev`.
- `origin` est configuré. Créer une branche de travail depuis `dev` ; pousser et ouvrir une PR suivent la demande du porteur du projet.
- Husky exécute avant chaque commit `lint-staged`, puis les scripts racine de lint, typecheck et tests, et enfin `git diff --cached --check`.
- La CI doit compléter les hooks locaux ; un hook ne remplace pas les suites de tests ou la revue.
- Ne pas ajouter des hooks, scripts ou fichiers de configuration qui prétendent valider sans lancer de vérification effective.

## Versionnement

La version racine de `package.json` est la version commune du monorepo KG Pay ; les versions de workspace ne sont pas modifiées par ce mécanisme. Le workflow `Bump monorepo version` propose une PR de bump après un push sur `dev` (patch) ou `main` (minor). Un lancement manuel depuis `main`, avec confirmation, propose un major bump. Les merges de PR de version seule ne déclenchent pas un nouveau bump.

Le script `node scripts/bump-version.cjs <patch|minor|major>` modifie uniquement le champ `version` du `package.json` racine. Le workflow exécute ses tests ciblés avant de proposer la PR. Le workflow de dépôt effectue un build, mais il n'existe pas encore de CI générale lint/typecheck/tests ; ces validations ciblées ne remplacent pas une CI complète.

## Builds et déploiements PlanetHoster

Le déploiement de production part uniquement de `main`. Deux entrées GitHub Actions sont disponibles :

- [First KG Pay deployment](./.github/workflows/first-deployment.yml), à lancer manuellement une seule fois sur `main`. Elle clone le dépôt sur PH puis installe la première release. Elle refuse de remplacer un dépôt, un `dist/` ou un historique déjà présent.
- [Deploy main to PlanetHoster](./.github/workflows/build-artifacts.yml), déclenchée automatiquement sur chaque push à `main`, et relançable manuellement depuis `main`. Elle refuse de fonctionner si l'initialisation n'a pas été faite.

Les deux entrées appellent le workflow interne [Build and deploy KG Pay to PlanetHoster](./.github/workflows/deploy-planet-host.yml), afin de partager le même build et le même processus de déploiement.

GitHub construit avec pnpm sur le runner, puis envoie une archive contenant les builds statiques des portails, les packages compilés, les migrations Prisma et un paquet runtime autonome pour `auth-service`. Ce paquet est produit par `pnpm deploy --prod --legacy` et contient ses dépendances de production, `@kgpay/contracts` et le client Prisma généré. PlanetHoster n'a pas besoin de pnpm ni d'exécuter `npm ci` pour ce déploiement. Les `node_modules` présents dans l'archive sont limités au paquet runtime d'`auth-service`; les portails Vite restent des fichiers statiques.

Sur PH, le workflow garde le clone dans `repository/`, les cinq releases datées les plus récentes dans `local-builds/<YYYYMMDDTHHMMSSZ>/`, et une copie de la release courante dans `dist/`. Le manifeste de chaque release enregistre la branche, le commit complet et la version; le SHA n'est pas le nom du dossier. Les portails ne nécessitent pas de redémarrage. `auth-service` est redémarré via `cloudlinux-selector` avec son environnement Node dédié.

### Où vont les fichiers d'environnement ?

**Build sur GitHub Actions :** le secret d'environnement `KG_PAY_APP_ENV` contient le contenu complet du `.env.prod` applicatif. Pour le définir depuis PowerShell, utiliser `Get-Content -Raw .env.prod | gh secret set KG_PAY_APP_ENV --env production`. Le workflow recrée temporairement `.env` à la racine du runner à partir de ce secret, puis les tâches génèrent `.generated/env/<workspace>.build.env`. Les clés de configuration du projet gardent leurs suffixes `__AUTH_SERVICE`, `__CUSTOMER_PORTAL` et `__STAFF_PORTAL`; elles ne sont pas mélangées aux paramètres de serveur `SERVER_*`. Le workflow retire `.env` et `.generated/env/` à la fin de l'étape.

Les valeurs `VITE_*` sont publiques et intégrées aux bundles Vite. Le générateur exclut du fichier de build les clés `runtimeOnly` (base de données, clés et credentials SMTP), et l'archive n'inclut aucun `.env`. Cependant, le fichier `.env` complet est momentanément présent sur le runner pendant `pnpm run build`; le workflow de production et le secret doivent donc rester protégés. `.env.example` reste le modèle local sans secrets; le build de production n'utilise pas ses valeurs par défaut.

La génération Prisma pendant l'empaquetage utilise une URL PostgreSQL synthétique uniquement pour créer le client; elle ne se connecte à aucune base réelle. Les secrets tels que `DATABASE_URL`, les clés JWT/HMAC et les credentials SMTP ne sont pas nécessaires au build.

**Runtime d'`auth-service` sur PlanetHoster :** déposer manuellement le profil de production sous `"$SERVER_AUTH_SERVICE_APP_ROOT/.env"`; conserver les noms source suffixés comme `DATABASE_URL__AUTH_SERVICE` et `JWT_PRIVATE_KEY_FILE__AUTH_SERVICE`. Le workflow utilise `scripts/generate-env.cjs` depuis le clone privé sur PH pour produire `"$SERVER_AUTH_SERVICE_APP_ROOT/.generated/env/auth-service.runtime.env"` avec les noms runtime attendus par [`env.schema.json`](./services/auth-service/env.schema.json). Configurer `KG_PAY_RUNTIME_ENV_FILE` dans l'application Node CloudLinux avec le chemin absolu du fichier généré, pas celui du `.env` source. Cette variable doit être disponible avant le démarrage et ne se met pas dans le fichier qu'elle désigne. `JWT_PRIVATE_KEY_FILE__AUTH_SERVICE` doit référencer par chemin absolu la clé privée stockée hors de `runtime/`. Le `.env`, le fichier généré et les clés restent dans l'APP_ROOT privé; ne pas les mettre dans `SERVER_DEPLOY_ROOT`, `repository/`, une release, `dist/` ou le dépôt Git. Restreindre leurs permissions à l'utilisateur de l'application.

Le workflow vérifie que le `.env` source existe avant de publier et régénère le fichier runtime sur PH; il ne transfère aucun secret vers le serveur. Le `.env` source reste en place, tandis que seul `runtime/` est remplacé à chaque release. Le code d'`auth-service` charge le fichier généré indiqué par `KG_PAY_RUNTIME_ENV_FILE`. `SERVER_AUTH_SERVICE_NODE_ENV_ACTIVATE` active l'environnement Node pour la commande de redémarrage; ce n'est pas le fichier de configuration applicatif. Le build GitHub et le runtime PH utilisent chacun leur propre copie privée du profil de production.

Dans l'environnement GitHub `production`, configurer le secret applicatif `KG_PAY_APP_ENV` avec le contenu complet de `.env.prod`. `gh secret set -f .env.prod` crée des secrets séparés par variable et ne fournit pas le fichier que le workflow reconstruit; utiliser la commande ci-dessus pour le secret fichier. Les anciens secrets individuels créés au niveau dépôt ne sont pas utilisés par le workflow et peuvent être supprimés après vérification du secret d'environnement.

Configurer également les secrets de déploiement dans l'environnement `production` :

- `SERVER_DEPLOY_ROOT` (chemin absolu privé, hors de toute racine web publique) ;
- `SERVER_NODE_ENV_ACTIVATE` (environnement Node qui exécute l'outil de release sur PH) ;
- `SERVER_AUTH_SERVICE_NODE_ENV_ACTIVATE` (environnement Node propre à `auth-service`, distinct du précédent) ;
- `SERVER_AUTH_SERVICE_APP_ROOT` (racine CloudLinux privée d'`auth-service`, distincte et non imbriquée dans `SERVER_DEPLOY_ROOT`).

Configurer les secrets SSH `SERVER_HOST`, `SERVER_USER` et `SERVER_SSH_KEY`. `SERVER_SSH_PORT` est un secret facultatif (défaut `5022`). Le workflow n'exige pas `SERVER_SSH_KNOWN_HOSTS` et désactive la vérification de la clé d'hôte (`StrictHostKeyChecking=no`, `UserKnownHostsFile=/dev/null`) ; il se connecte avec la clé privée fournie, mais ne confirme pas l'identité du serveur. Cela expose la connexion à un risque d'interception ou d'usurpation d'hôte. Tous les paramètres `SERVER_*` sont des secrets de l'environnement GitHub `production`, distincts du profil applicatif, et ne sont jamais écrits dans le `.env` applicatif. Les chemins doivent être des chemins Linux absolus littéraux sans espace ni `..` (ne pas saisir `$HOME`); le workflow indique le nom du paramètre invalide sans afficher sa valeur et rapporte le numéro de ligne pour une erreur de commande distante. `SERVER_DEPLOY_ROOT` doit rester privé et ne pas être publié directement comme racine web : un `index.html` seul ne protège pas les archives ni les dépendances du service. L'hôte doit pouvoir cloner le dépôt GitHub par HTTPS ou disposer d'une clé de lecture configurée localement.

L'application Node CloudLinux doit être créée avant le premier déploiement, hors d'une racine web. Son startup file doit être `runtime/dist/main.js`; le workflow publie le paquet sous `runtime/` dans `SERVER_AUTH_SERVICE_APP_ROOT`, sans remplacer le `.env` source de l'application. Déposer manuellement le profil `.env.prod` sous le nom `.env` dans cet APP_ROOT et configurer `KG_PAY_RUNTIME_ENV_FILE` pour pointer vers le fichier runtime généré. Garder le `.env` et ses clés hors de `runtime/`. Le workflow ne migre pas la base de données. La procédure manuelle, avec sélection d'une release précise et saisie masquée de `DATABASE_URL`, est décrite dans [Migrations Prisma manuelles sur PlanetHoster](./docs/deployment/planethoster-manual-migrations.md).

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
