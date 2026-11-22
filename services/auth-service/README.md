# auth-service

Service du cœur 1 — Identité et contrôle des accès (`CDC-01`). Cette tranche livre le backend ; les interfaces web prévues par le CDC restent à développer.

## Parcours disponibles

- Auto-inscription `CUSTOMER`, vérification d'adresse e-mail et connexion par mot de passe puis OTP e-mail à chaque nouvelle connexion.
- Invitation `STAFF`, acceptation à usage unique, connexion MFA et renvoi d'invitation par un administrateur.
- Récupération du mot de passe par OTP e-mail ; changement de mot de passe et d'adresse e-mail.
- Sessions rotatives, révocables, limitées par sujet ; verrouillage par identité/IP et contrôle d'activité `STAFF`.
- Rôles `CUSTOMER`, `GLOBAL_SUPER_ADMIN`, `OPERATIONS_ADMIN`, `CONFIGURATION_ADMIN`, rôles personnalisés, attribution et retrait protégés.
- Step-up e-mail à usage unique, journal d'accès append-only, événements Transactional Outbox, introspection interne, revue/désactivation des comptes inactifs et JWKS.

Les permissions métier des rôles `OPERATIONS_ADMIN` et `CONFIGURATION_ADMIN` seront ajoutées par les CDC propriétaires. Aucun rôle personnalisé ne peut recevoir une permission inconnue ou réservée à l'administration globale. `GLOBAL_SUPER_ADMIN` détient toutes les permissions présentes dans le catalogue versionné.

## Démarrage local

Prérequis : Node.js `>=22.20.0`, pnpm `10.28.2` et Docker.

Depuis la racine du dépôt :

```powershell
pnpm install
docker compose -f docker-compose.dev.yml up -d postgres maildev
pnpm --filter auth-service auth:keygen
```

La commande `auth:keygen` crée une paire RSA et deux clés HMAC dans `services/auth-service/.local-secrets/`. Elle n'affiche pas les secrets et ne doit être exécutée qu'une fois. Créer ensuite `services/auth-service/.env.local` (ignoré par Git) avec les paramètres runtime suivants :

```dotenv
DATABASE_URL=postgresql://kgpay@127.0.0.1:5432/kgpay_auth?schema=public
JWT_PRIVATE_KEY_FILE=.local-secrets/auth-private.pem
JWT_KEY_ID=<identifiant affiché par auth:keygen>
OTP_HASH_KEY=<contenu de .local-secrets/otp-hash.key>
IP_HASH_KEY=<contenu de .local-secrets/ip-hash.key>
```

`OTP_HASH_KEY` est obligatoire dans tous les environnements. `IP_HASH_KEY` est obligatoire en production. En production, fournir aussi les credentials SMTP si nécessaires, les secrets des clients de service et les clés publiques précédentes pendant la période de chevauchement d'une rotation JWT. Ne jamais copier ces valeurs dans `global.env`, `service.env`, `build.env`, les journaux ou les commits.

La configuration non secrète est assemblée au build :

- `env/global.env` ne fournit que les clés communes autorisées par `sharedKeys`.
- `services/auth-service/service.env` contient les valeurs non secrètes propres au service.
- `pnpm env:build` valide et écrit `services/auth-service/build.env`; le build du service copie ensuite ce fichier dans `dist`.
- Au démarrage, le service charge `.env.local` puis `build.env`; l'environnement fourni par l'orchestrateur reste prioritaire.

Appliquer la migration et lancer le service :

```powershell
pnpm --filter auth-service db:migrate:dev
pnpm --filter auth-service start:dev
```

Le service écoute sur `http://localhost:3000`. Swagger est disponible sur [`http://localhost:3000/docs`](http://localhost:3000/docs) en développement/test uniquement. La liveness `GET /health` ne nécessite ni authentification ni accès à la base une fois le service démarré.

Maildev reçoit les messages sur `127.0.0.1:1025` et expose sa boîte de réception sur [`http://127.0.0.1:1080`](http://127.0.0.1:1080). Aucune authentification SMTP n'est configurée dans les fichiers versionnés.

## Essayer les parcours dans Swagger

1. `POST /auth/register`, puis relever le code dans Maildev et appeler `POST /auth/verify-contact`.
2. `POST /auth/login`, relever le nouvel OTP envoyé par e-mail, puis appeler `POST /auth/mfa/verify`.
3. Copier `accessToken` dans **Authorize** avec le schéma bearer pour appeler les routes authentifiées.
4. Pour initialiser le premier administrateur, lancer `pnpm --filter auth-service auth:bootstrap` dans un terminal interactif. La CLI demande le mot de passe sans l'afficher, envoie un OTP à l'adresse choisie et vérifie ce code avant d'activer le premier `GLOBAL_SUPER_ADMIN`.
5. Pour une route protégée par step-up, appeler `POST /auth/step-up` avec la catégorie d'action, relever le code e-mail, puis rappeler la route avec la preuve retournée via le schéma Swagger `step_up_proof`.
6. Pour tester refresh/logout par cookie, appeler `GET /auth/csrf`, conserver le cookie et la valeur retournée, puis autoriser le schéma `csrf_token` avec cette valeur avant `POST /auth/refresh` ou `POST /auth/logout`.

Swagger conserve les cookies nécessaires au même hôte mais ne persiste pas les jetons d'autorisation dans le navigateur. Les routes internes d'introspection nécessitent une entrée runtime `AUTH_SERVICE_CLIENTS_JSON` et les schémas Swagger `service_client`/`service_secret`.

## Migrations et qualité

Les migrations Prisma sont versionnées sous `prisma/migrations/`. La migration initiale protège aussi `AccessEvent` contre les mises à jour/suppressions. Commandes disponibles :

```powershell
pnpm --filter auth-service lint
pnpm --filter auth-service typecheck
pnpm --filter auth-service test
pnpm --filter auth-service test:e2e
pnpm --filter auth-service build
```

Les valeurs numériques du CDC-01 §8.5 restent des valeurs proposées configurables, pas des décisions métier. Les interfaces client/personnel, le parcours support de récupération d'un `CUSTOMER` ayant perdu sa boîte e-mail, le fournisseur SMTP de production et le choix du broker restent ouverts. En attendant le broker, le relay local journalise uniquement les identifiants/noms d'événement ; les payloads restent dans l'outbox et ne sont pas envoyés à des consommateurs.
