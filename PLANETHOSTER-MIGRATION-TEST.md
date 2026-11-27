# Appliquer les migrations de la base de test sur PlanetHoster

## Pourquoi cette opération est nécessaire

Le journal Passenger montre que `auth-service` atteint PostgreSQL, puis échoue avec `P2021` : la table `test.Role` n'existe pas. Le moteur Prisma est maintenant chargé ; l'environnement de test doit recevoir ses migrations. Cette procédure ne concerne que la base de test et ne doit jamais utiliser les chemins ou l'URL de production.

Le changement récent de cible native Prisma (`debian-openssl-1.1.x`) ne modifie pas le schéma SQL. Il ne demande donc pas, à lui seul, de migration. C'est l'erreur `test.Role does not exist` qui confirme que la base test doit être initialisée/mise à jour.

## Version courte

Après avoir confirmé la sauvegarde de la base test et le dernier déploiement, ouvrir une session SSH et remplacer les deux chemins par ceux de test. Le runtime privé contient déjà le `DATABASE_URL` test; il est chargé par Node sans être affiché dans le terminal.

```bash
source "$HOME/nodevenv/<environnement-node-du-deploiement>/22/bin/activate"

DEPLOY_ROOT="/chemin/absolu/privé/kgpay_deploy/test"
AUTH_APP_ROOT="/chemin/absolu/privé/auth-service-test"
SCHEMA="$DEPLOY_ROOT/repository/services/auth-service/prisma/schema.prisma"
RUNTIME_ENV="$AUTH_APP_ROOT/.generated/env/auth-service.runtime.env"

test -f "$SCHEMA" && test -s "$RUNTIME_ENV"

node --env-file="$RUNTIME_ENV" "$(command -v npx)" \
  --yes --package=prisma@6.19.3 \
  prisma migrate deploy --schema="$SCHEMA"
```

Cette commande applique seulement les migrations versionnées en attente, sans créer de nouvelle migration ni réinitialiser la base. `npx` télécharge Prisma s'il n'est pas déjà dans le cache du compte PH; le serveur doit donc pouvoir accéder au registre npm. Si la commande échoue, arrêter et transmettre l'erreur non sensible au lieu de la relancer à l'aveugle. Après réussite, redémarrer Passenger pour l'application test.

## Précautions

1. Confirmer que le dernier déploiement de test est complet et qu'il contient le moteur Prisma compatible avec PlanetHoster.
2. Créer une sauvegarde restaurable de la base **de test** avant toute écriture.
3. Utiliser uniquement `SERVER_DEPLOY_ROOT/test`, le runtime de test et l'URL `DATABASE_URL` du secret `KG_PAY_APP_ENV` de l'environnement GitHub `test`.
4. Ne jamais afficher, coller dans une commande, envoyer dans un message ou journaliser `DATABASE_URL`.
5. Si un contrôle indique une autre base, un autre schéma ou une release incohérente, arrêter sans lancer `migrate deploy`.

Les migrations sont exécutées manuellement : le workflow de déploiement ne modifie pas la base de données.

## 1. Choisir et vérifier la release de test

Ouvrir une session SSH privée. Remplacer les chemins entre chevrons par les valeurs de test de PlanetHoster. `DEPLOY_ROOT` doit déjà désigner la racine **test** (avec son sous-dossier `/test`, ajouté par le workflow).

```bash
set -e
source "$HOME/nodevenv/kgpay_deploy/22/bin/activate"
node --version

DEPLOY_ROOT="/chemin/absolu/privé/kgpay_deploy/test"
REPOSITORY="$DEPLOY_ROOT/repository"
RELEASE_ID="20261126T124054Z"

if [[ ! "$RELEASE_ID" =~ ^[0-9]{8}T[0-9]{6}Z$ ]]; then
  echo "Identifiant de release invalide."
  exit 1
fi

RELEASE_DIR="$DEPLOY_ROOT/local-builds/$RELEASE_ID"
SCHEMA="$REPOSITORY/services/auth-service/prisma/schema.prisma"

test -f "$RELEASE_DIR/manifest.json"
test -f "$SCHEMA"
test -f "$REPOSITORY/services/auth-service/prisma/migrations/migration_lock.toml"

DEPLOYED_COMMIT="$(node -e 'process.stdout.write(JSON.parse(require("node:fs").readFileSync(process.argv[1], "utf8")).commit)' "$RELEASE_DIR/manifest.json")"
SOURCE_COMMIT="$(git -C "$REPOSITORY" rev-parse HEAD)"
if [ "$SOURCE_COMMIT" != "$DEPLOYED_COMMIT" ]; then
  echo "Le clone source et la release ne correspondent pas. Arrêt."
  exit 1
fi

echo "Release test vérifiée : $RELEASE_ID"
```

Prendre `RELEASE_ID` dans le chemin de la release du journal, au format UTC `YYYYMMDDTHHMMSSZ`. Ne pas choisir une release de production.

## 2. Vérifier la cible de migration

Après avoir vérifié la sauvegarde, saisir l'URL de **la base test** dans l'invite masquée. Utiliser la valeur de `DATABASE_URL__AUTH_SERVICE` du `KG_PAY_APP_ENV` configuré pour l'environnement GitHub `test`. Ne pas la remplacer par l'URL de production.

```bash
read -r -s -p "DATABASE_URL de la base TEST : " DATABASE_URL
printf '\n'
export DATABASE_URL
trap 'unset DATABASE_URL' EXIT

npm exec --yes --package=prisma@6.19.3 -- \
  prisma migrate status --schema "$SCHEMA"
```

Examiner le résultat. Il doit correspondre à la base de test et aux migrations présentes dans la release vérifiée. Le journal précédent mentionne le schéma PostgreSQL `test` (`test.Role`) ; si la commande indique un autre schéma, ou aucune migration alors que la table reste absente, arrêter et vérifier l'URL et le paramètre `schema` avant toute écriture.

## 3. Appliquer les migrations en attente

Seulement après confirmation de la cible test et de la sauvegarde :

```bash
npm exec --yes --package=prisma@6.19.3 -- \
  prisma migrate deploy --schema "$SCHEMA"

npm exec --yes --package=prisma@6.19.3 -- \
  prisma migrate status --schema "$SCHEMA"

unset DATABASE_URL
trap - EXIT
```

`migrate deploy` applique les migrations versionnées encore en attente. Ne pas utiliser `migrate dev`, `migrate reset` ou `db push`. En cas d'erreur, arrêter et conserver le message non sensible pour diagnostic ; ne pas relancer à l'aveugle.

## 4. Amorcer et redémarrer l'application test

Si c'est le premier démarrage de cette base et que le premier `GLOBAL_SUPER_ADMIN` n'a pas encore été créé, exécuter la CLI de bootstrap après les migrations, dans une session SSH interactive. Elle chargera le runtime privé de l'application test et demandera le mot de passe sans l'afficher. Suivre la procédure détaillée dans [`docs/deployment/planethoster-manual-migrations.md`](./docs/deployment/planethoster-manual-migrations.md).

Ensuite, redémarrer l'application Node.js CloudLinux **test** avec son APP_ROOT test :

```bash
AUTH_APP_ROOT="/chemin/absolu/privé/auth-service-test"
/usr/sbin/cloudlinux-selector restart \
  --json \
  --interpreter=nodejs \
  --app-root="$AUTH_APP_ROOT"
```

Vérifier ensuite les journaux Passenger. La table `Role` doit maintenant exister et le seeding des rôles intégrés ne doit plus échouer. Si une nouvelle erreur apparaît, la traiter séparément ; ne pas appliquer de migration supplémentaire sans vérifier son statut.
