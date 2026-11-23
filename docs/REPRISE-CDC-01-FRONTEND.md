# Reprise — frontend CDC-01

État au 23 novembre 2026. Ce document facilite la reprise ; le [CDC-01](./cdc/CDC-01-identite-acces.md) reste la référence fonctionnelle et [ADR-002](./architecture/ADR-002-applications-frontend-et-routage-mutualise.md) la référence architecturale.

## État actuel

- **[DÉCISION]** Deux applications : `customer-portal` d'abord, puis `staff-portal`. Les schémas Yup et types de transport sont dans `@kgpay/contracts/transport` ; le backend reste responsable de la validation et des autorisations.
- `apps/customer-portal` implémente les parcours client d'identité : inscription, vérification e-mail, connexion avec OTP, récupération et changement de mot de passe, changement d'e-mail et de téléphone avec step-up, gestion des sessions et déconnexion. FR/EN, thème clair/sombre et responsive sont prévus.
- `apps/staff-portal` implémente connexion OTP, acceptation d'invitation, récupération de mot de passe, gestion des identités/rôles, récupération d'e-mail STAFF par step-up, revue/journal des accès et sessions propres. Chaque membre du personnel authentifié accède à ses sessions ; l'administration est présentée aux comptes `GLOBAL_SUPER_ADMIN` ; le backend reste l'autorité.
- La structure et l'expérience d'authentification de `staff-portal` sont maintenant réalignées sur `customer-portal` : bootstrap léger, routes, layouts/gardes, pages séparées, composants UI, panneaux admin, composable Yup, locales FR/EN et styles basés sur les mêmes tokens. Les parcours et appels propres au STAFF sont conservés.
- Les maquettes `docs/finetuning/` sont intégrées aux deux portails : layouts d'authentification et d'espace connecté, thèmes A/B pour l'authentification et Clair/Sombre dans l'espace connecté (préférence système par défaut, choix explicite mémorisé), page 404 et états hors ligne/rétabli. Le shell connecté adapte sa navigation au bureau et au mobile tout en conservant les routes et permissions propres à chaque portail ; les données et actions financières fictives de la référence ne sont pas reprises. Les Service Workers mettent en cache le shell et les ressources statiques seulement ; aucune donnée API, d'identité ou financière n'est conservée ni rejouée.
- Branche de travail actuelle : `feat/shared-auth-connected-offline`, créée depuis `origin/dev`. Les fichiers fournis sous `docs/finetuning/` restent des références locales et ne sont pas modifiés.
- Vérifications du portail staff : lint, typecheck, 2 tests et build réussis. Le chunk JavaScript du build fait 521,72 kB et dépasse l'avertissement de 500 kB. Le portail client se construit également. La page login staff a été vérifiée à 320, 360, 600, 840 et 1120 px sans débordement ; l'API locale `localhost:3000` étant indisponible, la recette authentifiée et la vérification visuelle de l'administration restent à faire.

## Prochaines étapes

1. **Recetter les deux portails de bout en bout** avec `auth-service`, PostgreSQL et Maildev : OTP et renvoi, acceptation d'invitation, récupération, step-up, gestion d'accès/rôles, sessions, erreurs et refresh multi-onglets. Vérifier visuellement les écrans authentifiés STAFF une fois l'API disponible.
2. **Terminer la revue d'accessibilité et du responsive** sur les pages authentifiées : clavier, focus, annonces, contraste, cibles tactiles, thèmes et états erreur/chargement/succès. Le contrôle de débordement de la page login staff est ciblé et ne vaut pas audit complet.
3. **Valider les courriels d'identité** (OTP et invitation) : les gabarits HTML/texte bilingues selon l'identité KG Pay sont implémentés en proposition. Valider les copies FR/EN et la recette SMTP ; le lien d'invitation STAFF est optionnel et piloté par `STAFF_PORTAL_URL__AUTH_SERVICE`.
4. **Compléter la recette globale du CDC-01**, y compris les scénarios d'administration et de sécurité backend encore non couverts. Ne pas déclarer la clôture sur la seule base des tests unitaires.
5. **Actualiser la documentation** après recette et décision des courriels. Ouvrir une PR vers `dev` seulement sur demande, avec les sections « Résumé » et « Validation ».
6. Vérifier la portée et l'installation des Service Workers en HTTPS lorsque l'hébergement cible est disponible ; l'application hors ligne complète et l'installation PWA ne sont pas implémentées.

## Configuration et commandes

- La configuration locale est dans le `.env` racine, à ne pas lire ni versionner. Utiliser le modèle [.env.example](../.env.example). `VITE_AUTH_API_URL__CUSTOMER_PORTAL` et `VITE_AUTH_API_URL__STAFF_PORTAL` sont requises ; aligner les valeurs frontend de longueur du mot de passe et de délai de renvoi OTP avec celles du backend.
- Pour le développement, autoriser `http://localhost:5173` et `http://localhost:5174` dans `AUTH_CORS_ORIGINS__AUTH_SERVICE`. Vérifier séparément cookies, CSRF, HTTPS et origines pour l'environnement réel.
- Commandes : `pnpm dev:customer-portal`, `pnpm dev:staff-portal`, `pnpm test:customer-portal`, `pnpm test:staff-portal`, `pnpm lint:customer-portal`, `pnpm lint:staff-portal`, `pnpm typecheck:customer-portal`, `pnpm typecheck:staff-portal`, `pnpm build:customer-portal`, `pnpm build:staff-portal`. Configuration et lancement backend : [README auth-service](../services/auth-service/README.md).
- Contrat : [collection Postman](../services/auth-service/collections/auth-service.postman_collection.json) et `/docs-json` en développement/test. Comparer les contrats au code effectif en cas d'évolution.

## Points ouverts et limites

- **[POINT OUVERT]** Validation finale des copies de courriels FR/EN et recette de livraison ; récupération CUSTOMER après perte d'accès à l'e-mail ; SMTP et politique cookies/CSRF/origines en production ; compatibilité de l'hébergement mutualisé. `STAFF_PORTAL_URL__AUTH_SERVICE` reste vide tant que l'URL publique n'est pas définie ; l'e-mail fonctionne sans lien.
- Pas de `GET /auth/me` actuellement : l'e-mail courant n'est pas affiché. Ne pas inventer d'endpoint.
- `GET /admin/identities` ne fournit pas le statut de verrouillage ; aucune route ne liste les sessions d'une autre identité.
- Le catalogue de permissions publié ne permet pas de permissions de cœur métier aux rôles personnalisés ; ne pas contourner la règle dans l'interface.
- Le changement de mot de passe révoque toutes les sessions ; le client revient à la connexion. L'access token est en mémoire ; le refresh est rotatif et nécessite une attention particulière lors de la recette multi-onglets.
- IAM-F-25 : aucune action du cœur 1 n'a été déclarée annulable ; la fenêtre de deux secondes n'est pas branchée. ADR-002 reste globalement proposée ; ses décisions D2/D3 sont documentées.
- Le build frontend a signalé un chunk supérieur à 500 kB ; évaluer son optimisation après les vérifications fonctionnelles.

Pour le détail des travaux et validations déjà réalisés, voir le [journal CDC-01 du 23 novembre](./journal/2026-11-23/CDC-01-identite-acces.md). Avant toute nouvelle tâche, suivre l'ordre de lecture et les restrictions d'[AGENTS.md](../AGENTS.md).
