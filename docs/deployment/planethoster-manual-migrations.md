# Migrations Prisma manuelles sur PlanetHoster

Les workflows de build/déploiement ne modifient jamais la base. L'opérateur applique les migrations d'une release précise via SSH, après avoir confirmé une sauvegarde restaurable et la compatibilité de la migration avec le code déjà déployé. Les environnements `production` et `test` utilisent chacun leur propre `SERVER_AUTH_SERVICE_APP_ROOT`, `SERVER_KGAPPS_ROOT` et base de données. Le workflow ajoute `/test` à la valeur de base de `SERVER_DEPLOY_ROOT` pour le test ; utiliser ce sous-répertoire pour les opérations SSH sur les releases de test et ne jamais exécuter une procédure test avec les chemins ou l'URL de base de production.

## Vérifier le code source déployé

Le workflow conserve le clone source dans `"$SERVER_DEPLOY_ROOT/repository"` et le synchronise avec le commit de la release déployée. Vérifier ce commit avant toute migration :

```bash
set -e
DEPLOY_ROOT="/chemin/absolu/privé/kgpay"
REPOSITORY="$DEPLOY_ROOT/repository"
RELEASE_ID="20261125T010203Z"
if [[ ! "$RELEASE_ID" =~ ^[0-9]{8}T[0-9]{6}Z$ ]]; then
  echo "Invalid release identifier."
  exit 1
fi
RELEASE_DIR="$DEPLOY_ROOT/local-builds/$RELEASE_ID"
test -f "$RELEASE_DIR/manifest.json"
DEPLOYED_COMMIT="$(node -e 'process.stdout.write(JSON.parse(require("node:fs").readFileSync(process.argv[1], "utf8")).commit)' "$RELEASE_DIR/manifest.json")"
SOURCE_COMMIT="$(git -C "$REPOSITORY" rev-parse HEAD)"
test "$SOURCE_COMMIT" = "$DEPLOYED_COMMIT"

PRISMA_CONFIG="$REPOSITORY/services/auth-service/prisma.config.ts"
SCHEMA="$REPOSITORY/services/auth-service/prisma/schema.prisma"
test -f "$PRISMA_CONFIG"
test -f "$SCHEMA"
test -f "$REPOSITORY/services/auth-service/prisma/migrations/migration_lock.toml"
```

Le `dist/` de déploiement est supprimé après succès. Sélectionner l'identifiant de la dernière release appliquée dans `local-builds/` (format UTC `YYYYMMDDTHHMMSSZ`) et le remplacer dans l'exemple. En cas d'échec de la comparaison, arrêter la procédure : le clone source et la release retenue ne correspondent pas. Le clone fournit le schéma et les migrations versionnés; il n'a pas besoin de `node_modules` ni de pnpm.

## Exécuter la migration

Ouvrir une session SSH interactive. Remplacer les deux exemples par le chemin réel et l'identifiant daté retenu :

```bash
set -e
source "$HOME/nodevenv/<application-deploy>/22/bin/activate"

DEPLOY_ROOT="/chemin/absolu/privé/kgpay"
REPOSITORY="$DEPLOY_ROOT/repository"
AUTH_APP_ROOT="/chemin/absolu/privé/auth-service"
PRISMA_CONFIG="$REPOSITORY/services/auth-service/prisma.config.ts"
SCHEMA="$REPOSITORY/services/auth-service/prisma/schema.prisma"
SERVICE_ENV_FILE="$AUTH_APP_ROOT/.generated/env/auth-service.env"
test -f "$PRISMA_CONFIG"
test -f "$SCHEMA"
test -s "$SERVICE_ENV_FILE"
```

Après vérification de la sauvegarde et de la release, exporter le chemin du fichier privé. Prisma Config utilise le loader partagé avec `auth-service` et charge les variables de ce fichier dans le processus Prisma :

```bash
export KG_PAY_ENV_FILE="$SERVICE_ENV_FILE"

npx --yes prisma@7.8.0 migrate status --config="$PRISMA_CONFIG"
```

Relire le résultat et confirmer qu'il s'agit bien de la base de l'environnement ciblé. Utiliser une base de test distincte pour l'environnement `test`; ne pas remplacer son URL par celle de production. Seulement après cette confirmation, appliquer les migrations en attente :

```bash
npx --yes prisma@7.8.0 migrate deploy --config="$PRISMA_CONFIG"

npx --yes prisma@7.8.0 migrate status --config="$PRISMA_CONFIG"
unset KG_PAY_ENV_FILE
```

`migrate deploy` applique les migrations versionnées en attente; il ne crée pas de sauvegarde et ne fournit pas de rollback. Ne pas remplacer cette commande par `migrate dev`, `migrate reset` ou `db push`. En cas d'échec, arrêter la procédure, conserver le message d'erreur non sensible et faire analyser l'état de la base avant toute nouvelle tentative.

## Sécurité et limites

- Utiliser le Node environment de déploiement configuré sur PH; Prisma 7.8.0 est lancé temporairement avec npm depuis les sources clonées, sans pnpm ni installation dans le dépôt.
- Le fichier d'environnement privé reste dans l'APP_ROOT et n'est pas copié dans le clone. Prisma Config et l'application utilisent le même loader; ne pas afficher, copier dans une commande, committer ou journaliser les valeurs de configuration.
- Ne pas copier `.env.prod` sur `.env` et ne pas transférer un fichier `.env` dans l'archive.
- La configuration locale utilise le fichier généré depuis le `.env` racine; sur PH, `KG_PAY_ENV_FILE` désigne le fichier privé `auth-service.env`.
- L'accès réseau de PH au registre npm et à PostgreSQL doit être vérifié avant la première opération.
- Choisir l'ordre migration/déploiement selon la compatibilité de la migration et du code; le workflow ne le devine pas et ne coordonne pas cette décision.

## Initialiser le premier administrateur

Lors du premier déploiement de chaque environnement, le workflow installe le runtime mais ne redémarre pas `auth-service`. Il faut d'abord créer le schéma avec les migrations de la base correspondante, puis amorcer le premier `GLOBAL_SUPER_ADMIN` avec la CLI compilée et enfin démarrer l'application.

Depuis une session SSH interactive, après la migration :

```bash
set -e
AUTH_APP_ROOT="/chemin/absolu/privé/auth-service"
NODE_ENV_ACTIVATE="/chemin/absolu/nodevenv/<application>/22/bin/activate"
source "$NODE_ENV_ACTIVATE"
set -u
export KG_PAY_ENV_FILE="$AUTH_APP_ROOT/.generated/env/auth-service.env"
if [[ ! -s "$KG_PAY_ENV_FILE" ]]; then
  echo "Le fichier d'environnement privé auth-service est absent."
  exit 1
fi
cd "$AUTH_APP_ROOT/runtime"
if [[ ! -s dist/cli/bootstrap-super-admin.js ]]; then
  echo "La CLI bootstrap-super-admin est absente de la release."
  exit 1
fi
if [[ ! -t 0 ]]; then
  echo "Le bootstrap exige une session SSH interactive."
  exit 1
fi
node dist/cli/bootstrap-super-admin.js
```

Utiliser l'`AUTH_APP_ROOT` et l'environnement Node de l'environnement ciblé (`test` ou `production`), jamais ceux d'un autre environnement. Le nom `<application>` dans le chemin d'activation est celui du virtualenv Node créé dans CloudLinux.

La CLI charge le runtime privé, demande l'e-mail, le téléphone de contact, puis le mot de passe deux fois sans l'afficher. Elle envoie un OTP via le SMTP configuré et demande le code reçu pour vérifier l'adresse et terminer la création du premier `GLOBAL_SUPER_ADMIN`. Aucun mot de passe par défaut n'est créé. Le téléphone reste non vérifié. La base et le SMTP doivent être accessibles depuis le serveur. Cette initialisation ne se fait qu'une fois ; le backend refuse de recréer un administrateur initial après validation.

Après la confirmation de la CLI, démarrer l'application CloudLinux :

```bash
/usr/sbin/cloudlinux-selector restart \
  --json \
  --interpreter=nodejs \
  --app-root="$AUTH_APP_ROOT"
```

Vérifier ensuite le démarrage du service et se connecter depuis le portail STAFF avec le mot de passe puis l'OTP e-mail. La commande de migration et le bootstrap n'impriment pas les secrets runtime.
