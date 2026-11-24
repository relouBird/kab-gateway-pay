# Migrations Prisma manuelles sur PlanetHoster

Les workflows de build/déploiement ne modifient jamais la base. L'opérateur applique les migrations d'une release précise via SSH, après avoir confirmé une sauvegarde restaurable et la compatibilité de la migration avec le code déjà déployé.

## Choisir la release

Sur l'hôte, repérer un identifiant daté conservé :

```bash
ls -1 "$SERVER_DEPLOY_ROOT/local-builds"
```

Le répertoire contient au plus cinq releases. Vérifier `manifest.json` dans la release choisie : `ref` doit être `main` et les champs `commit` et `version` doivent correspondre à la livraison attendue. Ne pas utiliser `dist/` pour choisir les migrations si une livraison ultérieure l'a déjà remplacé.

## Exécuter la migration

Ouvrir une session SSH interactive. Remplacer les deux exemples par le chemin réel et l'identifiant daté retenu :

```bash
set -e
source "$HOME/nodevenv/<application-deploy>/22/bin/activate"

DEPLOY_ROOT="/chemin/absolu/privé/kgpay"
RELEASE_ID="20261124T170000Z"
SCHEMA="$DEPLOY_ROOT/local-builds/$RELEASE_ID/services/auth-service/prisma/schema.prisma"

test -f "$SCHEMA"
test -f "$DEPLOY_ROOT/local-builds/$RELEASE_ID/services/auth-service/prisma/migrations/migration_lock.toml"
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

- Utiliser le Node environment de déploiement configuré sur PH; Prisma est lancé temporairement avec npm et aucune installation n'est faite dans le dépôt applicatif.
- Ne pas afficher, copier dans une commande, committer ou journaliser l'URL de base. La saisie masquée ne doit être faite que dans une session SSH privée.
- Ne pas copier `.env.prod` sur `.env` et ne pas transférer un fichier `.env` dans l'archive.
- Les noms de variables de la configuration locale peuvent différer : le schéma Prisma déployé attend `DATABASE_URL`.
- L'accès réseau de PH au registre npm et à PostgreSQL doit être vérifié avant la première opération.
- Choisir l'ordre migration/déploiement selon la compatibilité de la migration et du code; le workflow ne le devine pas et ne coordonne pas cette décision.
