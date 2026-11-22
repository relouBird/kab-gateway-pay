# auth-service

Service du cœur 1 — Identité et contrôle des accès.

## État

Le service est en cours de bootstrap. Pour l'instant, il expose uniquement `GET /health`, une sonde de liveness indépendante de l'authentification. Aucun flux d'identité ni accès à la base de données n'est encore implémenté.

Le MFA par OTP e-mail après le mot de passe est retenu pour `CUSTOMER` et `STAFF`. Seul l'e-mail vérifié sert d'identifiant ; le téléphone reste un contact non vérifié, sans login, SMS ou récupération. Les rôles intégrés sont `GLOBAL_SUPER_ADMIN`, `OPERATIONS_ADMIN` et `CONFIGURATION_ADMIN`, en plus de `CUSTOMER`. Les rôles personnalisés sont limités au catalogue fermé de permissions. La procédure de vérification du support et le fournisseur SMTP de production restent à préciser.

## Développement

Depuis la racine du monorepo :

```bash
pnpm install
pnpm --filter auth-service start:dev
```

Le port d'écoute est `PORT` (3000 par défaut).

### SMTP local

Maildev est réservé au développement :

```powershell
docker compose -f docker-compose.dev.yml up -d maildev
```

Maildev expose son interface sur `http://127.0.0.1:1080` et SMTP sur `127.0.0.1:1025`. Les valeurs locales sont documentées dans `.env.example`; ce fichier ne contient aucun secret.

En production, définir `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM` et activer TLS avec `SMTP_SECURE=true` ou `SMTP_REQUIRE_TLS=true`. Si une authentification SMTP est utilisée, définir ensemble `SMTP_USER` et `SMTP_PASSWORD` par le mécanisme de secrets du déploiement. Ne jamais versionner ces valeurs.

`EmailOtpService` transmet les codes sans les journaliser et propage les erreurs d'envoi. À ce stade, le transport et les modèles d'e-mail sont implémentés ; génération/stockage OTP, authentification, persistance et émission de session ne sont pas encore livrés.

## Vérifications

```bash
pnpm --filter auth-service lint
pnpm --filter auth-service typecheck
pnpm --filter auth-service test
pnpm --filter auth-service test:e2e
pnpm --filter auth-service build
```
