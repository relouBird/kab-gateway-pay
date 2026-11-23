# Reprise — frontend CDC-01

État au 23 novembre 2026. Ce document facilite la reprise ; le [CDC-01](./cdc/CDC-01-identite-acces.md) reste la référence fonctionnelle et [ADR-002](./architecture/ADR-002-applications-frontend-et-routage-mutualise.md) la référence architecturale.

## État actuel

- **[DÉCISION]** Deux applications : `customer-portal` d'abord, puis `staff-portal`. Les schémas Yup et types de transport sont dans `@kgpay/contracts/transport` ; le backend reste responsable de la validation et des autorisations.
- `apps/customer-portal` implémente les parcours client d'identité : inscription, vérification e-mail, connexion avec OTP, récupération et changement de mot de passe, changement d'e-mail et de téléphone avec step-up, gestion des sessions et déconnexion. FR/EN, thème clair/sombre et responsive sont prévus.
- `apps/staff-portal` n'est pas encore implémentée. Le frontend et la recette globale du CDC-01 ne sont donc pas terminés.
- Branche locale : `feat/cdc-01-frontend-customer-portal`. Le socle client figure dans le commit `d8ce25a` ; consulter `git status` et l'historique avant toute modification.
- Hooks du commit `d8ce25a` : lint, typecheck et tests réussis, dont 25 tests frontend et 25 tests backend. Build frontend réussi auparavant. La recette navigateur contre le backend et Maildev n'a pas été exécutée.

## Prochaines étapes

1. **Recetter l'espace client de bout en bout** avec `auth-service`, PostgreSQL et Maildev : inscription et vérification, login puis OTP, renvoi et expiration des codes, récupération, step-up, modifications du compte, sessions et déconnexions. Tester aussi les erreurs, le refresh et plusieurs onglets. Corriger les écarts constatés par rapport au CDC et au contrat backend.
2. **Vérifier l'accessibilité et le responsive** : clavier, focus, annonces, contrastes et cibles tactiles ; revue visuelle des pages authentifiées et des états d'erreur, chargement et succès. Un contrôle de débordement horizontal a déjà été effectué sur les pages publiques à 320, 360, 600, 840 et 1120 px en clair et sombre ; ce n'est pas un audit complet.
3. **Construire `staff-portal`** conformément au CDC-01 : connexion avec OTP, invitation et parcours personnel, gestion des identités, rôles et permissions selon les droits backend. Préciser le périmètre et les points ouverts avant de coder ; ne pas recopier les contrats de `nexus-gate-web`. Ajouter tests et recette.
4. **Compléter la recette globale du CDC-01**, y compris les scénarios d'administration et de sécurité backend encore non couverts. Ne pas déclarer la clôture sur la seule base des tests unitaires.
5. **Actualiser la documentation** après recette : CDC, journaux et tableau d'état de [docs/README.md](./README.md), qui indique encore que les interfaces sont à construire. Ouvrir une PR vers `dev` seulement sur demande, avec les sections « Résumé » et « Validation ».

## Configuration et commandes

- La configuration locale est dans le `.env` racine, à ne pas lire ni versionner. Utiliser le modèle [.env.example](../.env.example). `VITE_AUTH_API_URL__CUSTOMER_PORTAL` est requise ; aligner les valeurs frontend de longueur du mot de passe et de délai de renvoi OTP avec celles du backend.
- Pour le développement, autoriser l'origine du portail dans `AUTH_CORS_ORIGINS__AUTH_SERVICE`. Vérifier séparément cookies, CSRF, HTTPS et origines pour l'environnement réel.
- Commandes : `pnpm dev:customer-portal`, `pnpm test:customer-portal`, `pnpm lint:customer-portal`, `pnpm typecheck:customer-portal`, `pnpm build:customer-portal`. Configuration et lancement backend : [README auth-service](../services/auth-service/README.md).
- Contrat : [collection Postman](../services/auth-service/collections/auth-service.postman_collection.json) et `/docs-json` en développement/test. Comparer les contrats au code effectif en cas d'évolution.

## Points ouverts et limites

- **[POINT OUVERT]** Conception et contenu FR/EN des e-mails d'identité ; récupération CUSTOMER après perte d'accès à l'e-mail ; SMTP et politique cookies/CSRF/origines en production ; compatibilité de l'hébergement mutualisé.
- Pas de `GET /auth/me` actuellement : l'e-mail courant n'est pas affiché. Ne pas inventer d'endpoint.
- Le changement de mot de passe révoque toutes les sessions ; le client revient à la connexion. L'access token est en mémoire ; le refresh est rotatif et nécessite une attention particulière lors de la recette multi-onglets.
- IAM-F-25 : aucune action du cœur 1 n'a été déclarée annulable ; la fenêtre de deux secondes n'est pas branchée. ADR-002 reste globalement proposée ; ses décisions D2/D3 sont documentées.
- Le build frontend a signalé un chunk supérieur à 500 kB ; évaluer son optimisation après les vérifications fonctionnelles.

Pour le détail des travaux et validations déjà réalisés, voir le [journal CDC-01 du 23 novembre](./journal/2026-11-23/CDC-01-identite-acces.md). Avant toute nouvelle tâche, suivre l'ordre de lecture et les restrictions d'[AGENTS.md](../AGENTS.md).
