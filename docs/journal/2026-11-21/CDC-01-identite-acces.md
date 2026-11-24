# Journal — 21 novembre 2026 — CDC-01 Identité et accès

**Statut :** base V1 validée ; points ouverts conservés.
**Objectif :** consigner la validation du CDC-01, les arbitrages du porteur et le bootstrap autorisé du cœur 1.

## Décisions intégrées

- Trois rôles maximum en V1 : `CUSTOMER`, `OPERATIONS_ADMIN` et `SECURITY_ADMIN`.
- `OPERATIONS_ADMIN` contrôle/valide les dossiers clients et prend en charge les opérations courantes.
- `SECURITY_ADMIN` administre les identités et la sécurité ; il reçoit aussi explicitement les permissions de configuration des intégrations partenaires, sans héritage de droits opérationnels ou financiers.
- E-mail et téléphone sont tous deux des identifiants de connexion.
- L'access token reste en mémoire côté navigateur ; le refresh token passe par un cookie `Secure`, `HttpOnly`.
- Le MFA reste obligatoire pour les clients, mais le facteur et la récupération sont différés ; le modèle devra permettre l'ajout ou le changement de facteur. Aucun accès client complet ne sera ouvert avant cet arbitrage.
- Le premier `SECURITY_ADMIN` sera créé par une commande CLI ponctuelle, sans mot de passe par défaut.
- Stack backend confirmée : NestJS/Express, PostgreSQL dédiée et Prisma.
- `SECURITY_ADMIN` et `OPERATIONS_ADMIN` peuvent être cumulés ; seule l'union des permissions explicitement attribuées s'applique.
- Le porteur valide le CDC-01 v0.1 comme base de travail V1 le 21 novembre 2026 ; les points ouverts restent visibles et ne sont pas transformés en décisions.
- Le premier incrément établit le socle backend et prépare TOTP pour `STAFF`. Le porteur confirme TOTP le 21 novembre 2026 ; paramètres, chiffrement des secrets et récupération restent ouverts.
- Aucun endpoint HTTP privilégié ne sera ajouté avant validation de la matrice des permissions ; le facteur et la récupération MFA client restent également ouverts.
- Le bootstrap crée `services/auth-service` avec NestJS/Express et un endpoint de liveness `GET /health` ; aucune logique d'identité ou d'autorisation n'est encore livrée.

## Fichiers et exigences concernés

- `docs/cdc/CDC-01-identite-acces.md` : §§3.2–3.3, 8.1, 8.10, 10–10.1, 12.2 et 12.4 ; exigences IAM-F-20 et IAM-F-22.
- `AGENTS.md` : invariants actuels MFA et rôles.
- `README.md` : état des décisions du cœur 1.
- `docs/README.md` : commandes réellement disponibles.
- `services/auth-service/` : squelette, sonde de liveness, scripts et tests ciblés.
- `package.json`, `pnpm-lock.yaml`, `turbo.json`, `.husky/pre-commit` : workspace, dépendances et validations locales effectives.

## Validation

- `pnpm install` : terminé ; workspace de deux projets installé et lockfile mis à jour.
- `pnpm exec turbo run build lint typecheck test` : réussi (build, lint, typecheck et test unitaire).
- `pnpm --filter auth-service test:e2e` : réussi (requête HTTP `GET /health`).
- `git hook run pre-commit` : réussi ; lint, typecheck et test unitaire exécutés par le hook.
- `pnpm exec prettier --check ...` et `git diff --check` : réussis après les derniers arbitrages documentaires.
- Tests applicatifs non relancés après cette mise à jour : aucun fichier de code n'a été modifié.

## Points ouverts et suite

- Matrice détaillée des permissions, cumul des rôles et délégation de l'invitation/attribution.
- Paramètres et chiffrement TOTP avant activation, récupération `STAFF`, et facteur/récupération client.
- Matrice détaillée des permissions avant tout endpoint privilégié ; aucun n'est prévu dans le premier périmètre.
- Attributs du cookie, origines, CSRF/XSS et fournisseur OTP de production.
- Modalités de secrets et d'exécution de la commande d'initialisation du premier administrateur.
- Matrice détaillée des permissions et modalités de délégation avant d'implémenter les gardes et endpoints d'administration.
- Attributs du cookie, origines, CSRF/XSS et fournisseur OTP de production.
- Modalités de secrets et d'exécution de la commande d'initialisation du premier administrateur.
- Prochaine étape : arbitrer le profil TOTP et le chiffrement de ses secrets ; continuer sans endpoint privilégié.

---

# Journal — 21 novembre 2026 — Révision des décisions CDC-01

**Statut :** arbitrages métier consignés ; implémentation backend non terminée.
**Objectif :** intégrer les nouvelles décisions du porteur et préparer la réalisation de `auth-service`.

## Décisions intégrées

- Remplacement de TOTP par OTP envoyé par e-mail après le mot de passe, à chaque nouvelle connexion, pour `CUSTOMER` et `STAFF`.
- SMTP générique configurable retenu ; Maildev destiné au développement local. Aucun secret SMTP n'est versionné.
- Quatre rôles intégrés : `CUSTOMER`, `GLOBAL_SUPER_ADMIN`, `OPERATIONS_ADMIN`, `CONFIGURATION_ADMIN`.
- Le super-admin détient toutes les permissions du catalogue fermé et administre seul les identités/rôles ; les rôles personnalisés ne pourront pas recevoir les permissions d'administration globale.
- RP-10 reste sans exception, y compris pour le super-admin.
- Le porteur a demandé de rester sur `feature/cdc01-auth-decisions` ; aucune nouvelle branche n'a été créée.
- Le porteur demande une tranche backend ; les interfaces restent au CDC-01 mais sont exclues de ce travail.
- Le téléphone est conservé comme contact non vérifié uniquement ; il n'est pas identifiant, facteur MFA ou moyen de récupération.
- Après perte d'accès à l'e-mail, récupération CUSTOMER par le support uniquement ; le téléphone ne sert pas au déblocage. La procédure détaillée du support reste à valider avant production.
- Ajout du transport SMTP injectable avec modèles e-mail FR/EN par finalité d'OTP, configuration TLS obligatoire en production, exemple sans secret et compose local Maildev.
- Aucun flux d'authentification ne consomme encore ce transport ; génération/stockage du code, API, persistance, rôles et sessions restent à implémenter.

## Fichiers et exigences concernés

- `docs/cdc/CDC-01-identite-acces.md` : §§1–5, 8.5–8.7, 9–12.4 ; IAM-F-03/04/09/10/12/13/20, RP-10.
- `AGENTS.md`, `services/auth-service/AGENTS.md` : règles MFA et rôles.
- `README.md` : état et ordre des incréments.

## Validation

- Lecture du CDC-01, du référentiel v0.3 (§§2, 3, 5.1, 7.1, B.1), d'ADR-001/002, des consignes et du squelette backend.
- `pnpm add --filter auth-service nodemailer` — réussi ; la résolution a subi des délais réseau et un téléchargement a été relancé.
- `pnpm --filter auth-service typecheck` — réussi.
- `pnpm --filter auth-service lint` — réussi après correction de l'avertissement de méthode non liée.
- `pnpm --filter auth-service test` — réussi : 3 suites, 7 tests.
- `pnpm --filter auth-service build` — réussi.
- `pnpm exec prettier --check ...` — réussi. Le premier `--write` a échoué uniquement parce que Prettier ne déduit pas de parseur pour `.env.example`; ce fichier texte a été exclu de la commande de formatage.
- `pnpm --filter auth-service test:e2e` — réussi : 1 suite, 1 test de liveness.
- Backend/MFA, persistance OTP, rôles et parcours d'authentification : non livrés à cette étape.

## Points ouverts et suite

- Définir la récupération après perte de la boîte e-mail MFA et les exigences de sécurité applicables en production.
- Choisir le fournisseur SMTP de production ; Maildev reste exclusivement local.
- Définir les permissions métier futures dans les CDC propriétaires ; ne pas inventer les permissions finance/opérations/configuration.
- Implémenter le stockage et la validation OTP (hash, expiration, essais, rejeu), puis connecter l'envoi au parcours de connexion ; aucune session avant vérification.
