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

## Builds et opérations PlanetHoster

Le workflow `Build and deposit KG Pay artifacts` construit les workspaces sur un runner GitHub avec pnpm, sur `dev` et `main`. Il dépose un artefact immuable sous `builds/<SHA>` dans un répertoire privé configuré par `SERVER_DEPLOY_ROOT`. L'arborescence des workspaces est conservée (`apps/customer-portal/dist`, `apps/staff-portal/dist`, `services/auth-service/dist`, packages compilés et migrations Prisma). Ce n'est pas encore un déploiement des portails ni un paquet runtime complet pour démarrer `auth-service` : aucun domaine public n'est modifié et aucun service n'est redémarré.

Pour les portails, Vite intègre le code des packages utilisés dans les fichiers statiques ; le serveur web n'a donc pas besoin de `node_modules`. À l'inverse, `services/auth-service/dist` seul ne contient pas les dépendances NestJS/Prisma : son installation npm runtime et son mécanisme de démarrage/rechargement restent à concevoir avant de l'exécuter sur PH.

Créer les environnements GitHub `test` et `production`, chacun avec les variables publiques `CUSTOMER_AUTH_API_URL` et `STAFF_AUTH_API_URL`. Les valeurs sont incorporées aux builds Vite ; elles ne doivent contenir aucun secret. La création de `.env` dans le runner part de `.env.example`, jamais de `.env.prod`. Le dépôt PH est facultatif tant que `SERVER_DEPLOY_ROOT` n'est pas défini ; lorsqu'il l'est, ce chemin doit être absolu et hors de toute racine web publique.

Pour le dépôt SSH, configurer dans l'environnement GitHub les secrets `SERVER_HOST`, `SERVER_USER`, `SERVER_SSH_KEY`, `SERVER_SSH_KNOWN_HOSTS` et, si nécessaire, `SERVER_SSH_PORT` (défaut `5022`), ainsi que la variable `SERVER_DEPLOY_ROOT`. Les clés d'hôte doivent être vérifiées hors bande et enregistrées dans `SERVER_SSH_KNOWN_HOSTS` ; le workflow n'utilise pas `ssh-keyscan` à la volée.

Le workflow manuel `Apply auth-service production migrations` est distinct des builds et ne s'exécute jamais sur un push. Il exige un SHA complet d'un artefact `main`, une confirmation de sauvegarde restaurable, et l'environnement GitHub `production` (à configurer avec approbation obligatoire). Il active l'environnement Node de `deploy`, installe le petit outil npm autonome, puis exécute uniquement `prisma migrate deploy`. Il ne prend pas lui-même la sauvegarde et ne redémarre pas l'API.

Sur l'hôte, renseigner `SERVER_NODE_ENV_ACTIVATE` et `SERVER_PRODUCTION_ENV_FILE` dans l'environnement GitHub `production`. Ce dernier doit désigner un fichier privé, lisible par l'utilisateur de déploiement, situé hors de `SERVER_DEPLOY_ROOT` et de toute racine web, contenant au minimum `DATABASE_URL__AUTH_SERVICE`. Le migrateur lit cette clé sans afficher sa valeur et la passe au processus Prisma ; il ne copie pas le fichier et ne remplace jamais `.env`. Ne pas envoyer les fichiers locaux `.env.test` ou `.env.prod` à GitHub ou au sous-domaine.

En local, les profils peuvent être sélectionnés explicitement sans écraser `.env`, par exemple `pnpm db:auth-service:migrate:deploy -- --env-file .env.test`. Sans cette option, la commande existante continue d'utiliser `.env`. L'exécution sur PH et l'accessibilité de la base doivent être vérifiées avant une migration de production.

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
