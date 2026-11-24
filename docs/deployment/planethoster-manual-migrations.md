# Migrations Prisma manuelles sur PlanetHoster

Les workflows de build/déploiement ne modifient jamais la base. L'opérateur applique les migrations d'une release précise via SSH, après avoir confirmé une sauvegarde restaurable et la compatibilité de la migration avec le code déjà déployé.

## Vérifier le code source déployé

Le workflow conserve le clone source dans `"$SERVER_DEPLOY_ROOT/repository"` et le synchronise avec le commit de la release déployée. Vérifier ce commit avant toute migration :

```bash
set -e
DEPLOY_ROOT="/chemin/absolu/privé/kgpay"
REPOSITORY="$DEPLOY_ROOT/repository"
DEPLOYED_COMMIT="$(node -e 'process.stdout.write(JSON.parse(require("node:fs").readFileSync(process.argv[1], "utf8")).commit)' "$DEPLOY_ROOT/dist/manifest.json")"
SOURCE_COMMIT="$(git -C "$REPOSITORY" rev-parse HEAD)"
test "$SOURCE_COMMIT" = "$DEPLOYED_COMMIT"

SCHEMA="$REPOSITORY/services/auth-service/prisma/schema.prisma"
test -f "$SCHEMA"
test -f "$REPOSITORY/services/auth-service/prisma/migrations/migration_lock.toml"
```

En cas d'échec de la comparaison, arrêter la procédure : le clone source et la release active ne correspondent pas. Le clone fournit le schéma et les migrations versionnés; il n'a pas besoin de `node_modules` ni de pnpm.

## Exécuter la migration

Ouvrir une session SSH interactive. Remplacer les deux exemples par le chemin réel et l'identifiant daté retenu :

```bash
set -e
source "$HOME/nodevenv/<application-deploy>/22/bin/activate"

DEPLOY_ROOT="/chemin/absolu/privé/kgpay"
REPOSITORY="$DEPLOY_ROOT/repository"
SCHEMA="$REPOSITORY/services/auth-service/prisma/schema.prisma"
test -f "$SCHEMA"
```

Après vérification de la sauvegarde et de la release, saisir `DATABASE_URL` dans l'invite masquée. La valeur n'est ni passée comme argument de processus ni écrite dans l'historique du shell :

```bash
read -r -s -p "DATABASE_URL de production : " DATABASE_URL
printf '\n'
export DATABASE_URL
trap 'unset DATABASE_URL' EXIT

npm exec --yes --package=prisma@6.19.3 -- \
  prisma migrate status --schema "$SCHEMA"
```

Relire le résultat et confirmer qu'il s'agit bien de la base de production visée. Seulement après cette confirmation, appliquer les migrations en attente :

```bash
npm exec --yes --package=prisma@6.19.3 -- \
  prisma migrate deploy --schema "$SCHEMA"
unset DATABASE_URL
trap - EXIT
```

`migrate deploy` applique les migrations versionnées en attente; il ne crée pas de sauvegarde et ne fournit pas de rollback. Ne pas remplacer cette commande par `migrate dev`, `migrate reset` ou `db push`. En cas d'échec, arrêter la procédure, conserver le message d'erreur non sensible et faire analyser l'état de la base avant toute nouvelle tentative.

## Sécurité et limites

- Utiliser le Node environment de déploiement configuré sur PH; Prisma est lancé temporairement avec npm depuis les sources clonées, sans pnpm ni installation dans le dépôt.
- Ne pas afficher, copier dans une commande, committer ou journaliser l'URL de base. La saisie masquée ne doit être faite que dans une session SSH privée.
- Ne pas copier `.env.prod` sur `.env` et ne pas transférer un fichier `.env` dans l'archive.
- Les noms de variables de la configuration locale peuvent différer : le schéma Prisma déployé attend `DATABASE_URL`.
- L'accès réseau de PH au registre npm et à PostgreSQL doit être vérifié avant la première opération.
- Choisir l'ordre migration/déploiement selon la compatibilité de la migration et du code; le workflow ne le devine pas et ne coordonne pas cette décision.
