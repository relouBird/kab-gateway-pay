# Journal — ADR-002 — 2026-11-23

## Mise en œuvre — `staff-portal`

- **Objectif :** réaliser la deuxième application frontend, surface dédiée au personnel prévue par D2.
- **Statut :** terminé pour l'implémentation et la documentation ; les propositions d'architecture restantes gardent leur statut.
- **Résumé :** nouveau workspace `apps/staff-portal`, configurations Vite/Turbo/env propres, réutilisation des polices et logos fournis, schémas/types de transport administration dans `@kgpay/contracts/transport`, client HTTP Axios local et routes d'administration existantes. L'access token reste en mémoire ; les actions administratives exigent le step-up de l'API.
- **Chemins modifiés :** `apps/staff-portal/**`, `packages/contracts/src/transport.ts`, `package.json`, `pnpm-lock.yaml`, `.env.example`, `docs/architecture/ADR-002-applications-frontend-et-routage-mutualise.md`.
- **Exigences/sections concernées :** ADR-002 D2/D3/D11, §3.1, §4 et §11-12 ; CDC-01 §8.10-8.11.
- **Validations :** typecheck, lint, 2 tests et build du workspace réussis ; contrôle navigateur à 320-1120 px sans débordement. Le build signale un chunk de 511,76 kB.
- **Points ouverts :** `@kgpay/contracts` partage les nouveaux contrats d'administration ; les permissions métier futures et le routage/hébergement prod ne sont pas inventés. Les courriels et URL d'invitation restent à arbitrer.
- **Suite attendue :** finaliser les courriels après validation de leur conception, puis recette des deux applications contre les services locaux.

## Suite — accès aux sessions propres pour STAFF

- **Objectif :** séparer l'accès self-service aux sessions des fonctions d'administration globales.
- **Statut :** terminé pour l'interface et la documentation ; les propositions d'architecture restantes gardent leur statut.
- **Résumé :** tout STAFF authentifié peut atteindre `/my-sessions`. La console `/admin` reste réservée visuellement à `GLOBAL_SUPER_ADMIN`; `auth-service` continue de vérifier les accès.
- **Chemins modifiés :** `apps/staff-portal/src/App.tsx`, `docs/architecture/ADR-002-applications-frontend-et-routage-mutualise.md`, `docs/cdc/CDC-01-identite-acces.md`, README et reprise frontend.
- **Exigences/sections concernées :** ADR-002 §12 ; CDC-01 §4.4 et §8.11 ; décision D2.
- **Validations :** typecheck, lint, 2 tests, build et `git diff --check` réussis. Le build signale le chunk JavaScript à 515,70 kB. La vérification Prettier complète échoue sur les documents CDC/ADR ; la recette browser authentifiée reste non exécutée.
- **Points ouverts :** le comportement en environnement réel doit être recetté avec les rôles et les sessions du backend.
- **Suite attendue :** vérifier les accès self-service dans la recette des parcours STAFF.

## Suite — notifications d'identité configurables

- **Objectif :** ajouter une présentation HTML accessible avec repli texte simple aux courriels du cœur 1, sans rendre le portail requis pour leur livraison.
- **Statut :** implémentation terminée en proposition ; contenu final et recette fournisseur à valider.
- **Résumé :** création de gabarits KG Pay bilingues pour OTP et invitation STAFF. Le lien d'invitation est optionnel, porté par `STAFF_PORTAL_URL__AUTH_SERVICE`, sans token dans l'URL ; le code reste copiable si l'URL est absente. La direction graphique du projet est appliquée sans reprendre le template ou la palette NexusGate.
- **Chemins modifiés :** `services/auth-service/src/email-otp/**`, configuration `auth-service`, `.env.example`, README et documentation CDC/ADR/reprise/journal.
- **Exigences/sections concernées :** ADR-002 §12 ; CDC-01 §8.11 et §10.16 ; aucun nouvel endpoint ni décision de routage.
- **Validations :** `pnpm env:build`, typecheck, lint, build et `pnpm test:auth-service` (10 suites/29 tests) réussis ; Prettier et `git diff --check` réussis sur les fichiers ciblés.
- **Points ouverts :** la copie FR/EN reste une proposition ; la destination publique exacte et le rendu sur SMTP/Maildev doivent être vérifiés.
- **Suite attendue :** valider les copies, fournir l'URL publique, puis réaliser la recette SMTP et clients mail.

## Mise à jour — Décisions D2/D3 et mise en œuvre de customer-portal

- **Objectif :** consigner les arbitrages du porteur sur les applications frontend et les contrats partagés, et décrire leur mise en œuvre.
- **Statut :** terminé pour la documentation ; D2/D3 passent en [DÉCISION], le statut global de l'ADR reste « Proposé, à valider ».
- **Résumé :** D2 = deux applications (`customer-portal` livrée, `staff-portal` à faire). D3 = Yup et types de transport dans `@kgpay/contracts/transport`. §8 : points 2, 3 (Yup) et 5 (langue navigateur, repli français, mémorisation `localStorage`) tranchés. Nouvelle §11 décrivant l'application, le client HTTP, la session en mémoire, les variables d'environnement et les points ouverts.
- **Chemins modifiés :** `docs/architecture/ADR-002-applications-frontend-et-routage-mutualise.md`.
- **Exigences/sections concernées :** ADR-002 D2, D3, D11, §8, §11 ; CDC-01 §8.10-8.11.
- **Validations :** documentation uniquement ; contrôle de format voir le journal CDC-01 du même jour.
- **Points ouverts :** `staff-portal`, hébergement mutualisé (D5), origines/cookies/CSRF en production, package partagé de composants UI.
- **Suite attendue :** valider ou ajuster D4-D11 ; démarrer `staff-portal` après arbitrage.

## Mise à jour — Transfert du backend auth-service au frontend

- **Objectif :** rendre visibles dans l'ADR-002 les ressources backend du cœur 1 disponibles pour démarrer le frontend.
- **Statut :** terminé.
- **Résumé :** ajout d'une section d'information de mise en œuvre référençant le CDC-01, `/docs-json`, Swagger et la collection Postman de 38 opérations. La section décrit les parcours MFA et la portée réelle de la recette, sans promouvoir les orientations encore marquées [PROPOSITION] au rang de décision. Elle signale le point ouvert CDC-01 §10.16 : la conception visuelle des courriels d'authentification/invitation ; le code backend envoie actuellement du texte simple.
- **Chemins modifiés :** `docs/architecture/ADR-002-applications-frontend-et-routage-mutualise.md`.
- **Exigences/sections concernées :** ADR-002 §9-10 ; CDC-01 §4.6, IAM-F-22 à IAM-F-25, §8.10 et §10.16.
- **Validations :** `git diff --check` — réussi. Tests et build non exécutés — changements documentaires uniquement.
- **Points ouverts :** les propositions D2-D11 de l'ADR-002 gardent leur statut ; la conception et la validation visuelles des courriels restent à faire.
- **Suite attendue :** démarrer les interfaces du cœur 1 depuis le CDC-01 ; confronter la collection Postman au `/docs-json` courant si l'API évolue.

## Suite — alignement architecture du portail personnel

- **Objectif :** réaligner l'architecture et l'expérience du portail STAFF sur `customer-portal`, sans modifier les contrats ni les fonctionnalités propres au personnel.
- **Statut :** terminé pour la structure et les écrans publics ; recette visuelle authentifiée du back-office bloquée par l'indisponibilité de l'API locale.
- **Résumé :** bootstrap `App.tsx` allégé ; ajout de routes dédiées, layouts et gardes, pages d'authentification séparées, page sessions, composants de panneaux/dialogues admin séparés, composable Yup, locales FR/EN et styles utilisant les tokens et composants de référence du portail client. Les appels, rôles, step-up et parcours métier STAFF sont conservés.
- **Chemins modifiés :** `apps/staff-portal/src/**`, `docs/architecture/ADR-002-applications-frontend-et-routage-mutualise.md`, `docs/REPRISE-CDC-01-FRONTEND.md`.
- **Exigences/sections concernées :** ADR-002 §3, §4 et §12 ; CDC-01 §8.10-8.11 pour la préservation des parcours d'authentification et d'administration.
- **Validations :** `pnpm typecheck:staff-portal`, `pnpm lint:staff-portal`, `pnpm test:staff-portal` (2 tests), `pnpm build:staff-portal` et `pnpm build:customer-portal` réussis ; Prettier ciblé exécuté. La page login STAFF a été vérifiée à 320, 360, 600, 840 et 1120 px sans débordement. `localhost:3000/auth/csrf` a refusé la connexion ; les vues STAFF authentifiées n'ont pas pu être recettées.
- **Points ouverts :** le chunk STAFF de 521,72 kB dépasse le seuil d'avertissement de 500 kB ; l'administration authentifiée doit être vérifiée contre `auth-service`.
- **Suite attendue :** démarrer les services locaux, vérifier les parcours d'administration et sessions sur desktop/mobile, puis réévaluer le découpage du bundle dans une tâche dédiée si le seuil reste problématique.

## Suite — alignement visuel et shell hors ligne

- **Objectif :** appliquer les maquettes d'authentification, d'espace connecté et d'état réseau aux deux portails, sans fusionner leurs parcours ni leur navigation.
- **Statut :** implémentation ciblée terminée ; la stratégie d'offline limitée est documentée ; la vérification HTTPS en hébergement reste ouverte.
- **Résumé :** layouts correspondants dans les deux applications, thème A sombre/B clair avec préférence de système par défaut et stockage `kgpay.theme`, page 404 dédiée et vues hors ligne/rétabli. Les Service Workers mettent en cache le seul shell statique, sans appels API ni données privées/financières ; aucune opération n'est mise en attente ou rejouée. Le comportement ne constitue pas une PWA installable.
- **Chemins modifiés :** `apps/customer-portal/**`, `apps/staff-portal/**`, `docs/architecture/ADR-002-applications-frontend-et-routage-mutualise.md`, `docs/cdc/CDC-01-identite-acces.md`, `docs/REPRISE-CDC-01-FRONTEND.md`.
- **Exigences/sections concernées :** ADR-002 D7, §6 et §13 ; CDC-01 IAM-F-22/23/26, §4.6 et §8.11.
- **Validations :** typecheck, lint, tests et builds des deux portails réussis ; contrôles navigateur responsive 320–1120 px, choix du thème et transitions des états réseau réussis. En prévisualisation de production, les Service Workers sont actifs et le cache statique sert le CSS pendant une coupure simulée ; aucune API n'est en cache. La navigation complète hors ligne reste à recetter, l'outil de navigateur rétablissant `navigator.onLine` après une navigation.
- **Points ouverts :** HTTPS et base path de l'hébergement cible pour la portée du Service Worker ; navigation/rechargement hors ligne et recette authentifiée du shell connecté.
- **Suite attendue :** déployer/servir chaque portail sous le chemin prévu, vérifier navigation hors ligne après chargement en ligne, puis compléter la recette connectée.
