# Journal — ADR-002 — Applications frontend et routage mutualisé — 2026-11-24

## Objectif

Consigner la décision et l'implémentation de l'isolation des sessions navigateur CUSTOMER et STAFF.

## Statut

Terminé pour la décision D12 et son implémentation locale. Les origines de production, `SameSite` et la vérification manuelle RC1-608 restent ouvertes.

## Résumé des changements

- Ajout de D12 : cookies refresh/CSRF séparés et sélectionnés par `X-KGPay-Portal`; une action dans un portail ne doit pas affecter la session de l'autre.
- Mise à jour des sections de transport et de session pour refléter les cookies réellement utilisés par `customer-portal` et `staff-portal`.
- Conservation des anciens noms de cookies quand l'en-tête est absent, afin de préserver les appels API/collection Postman existants.

## Chemins modifiés

- `docs/architecture/ADR-002-applications-frontend-et-routage-mutualise.md`
- `docs/cdc/CDC-01-identite-acces.md`
- `docs/recipe/RECETTE-01-identite-acces.md`
- `services/auth-service/src/auth/auth.controller.ts`
- `services/auth-service/src/auth/auth.service.ts`
- `services/auth-service/src/main.ts`
- `services/auth-service/test/auth.e2e-spec.ts`
- `apps/customer-portal/src/services/http/createHttpClient.ts`
- `apps/customer-portal/src/services/http/authApi.ts`
- `apps/customer-portal/src/services/sessionManager.ts`
- `apps/customer-portal/src/services/sessionManager.test.ts`
- `apps/customer-portal/src/services/http/createHttpClient.test.ts`
- `apps/staff-portal/src/services/http.ts`

## Exigences et décisions concernées

- ADR-002 D12 : indépendance des cookies et sessions CUSTOMER/STAFF.
- CDC-01 §4.6 et §10 point 10 : parcours et cookies des interfaces navigateur.
- RC1-608 : vérification manuelle des deux portails sur une même origine.

## Validations

- Tests CUSTOMER ciblés : 10 tests réussis ; typecheck et lint réussis.
- Tests STAFF : 10 tests réussis ; typecheck et lint réussis.
- Tests unitaires `auth-service` : 29 tests réussis ; lint et typecheck direct réussis.
- `pnpm test:e2e:auth-service:isolated` : 3 tests réussis dans un schéma temporaire supprimé après exécution.
- `pnpm typecheck:auth-service` a rencontré `EPERM` durant la régénération du client Prisma car le moteur Windows est utilisé par le processus local. Le typecheck direct a passé sans remplacer le moteur.

## Points ouverts et suite attendue

- Le backend et les deux portails ont été relancés ; `/health`, `/login` CUSTOMER et `/login` STAFF répondent HTTP 200. L'utilisateur doit se reconnecter ; les anciens cookies ne restaurent pas les nouvelles sessions.
- Exécuter RC1-608 dans les deux sens, puis reprendre la recette à RC1-102.
- Valider en production les origines, `SameSite`, `Secure`, CSRF/XSS et le routage d'hébergement.

## Mise à jour — états réseau et OTP des portails (24 novembre 2026)

### Objectif et statut

Consigner l'implémentation des états de connectivité et de saisie OTP dans les applications CUSTOMER et STAFF. **Terminé** pour les interfaces ; aucun changement à D12 ni aux contrats d'API.

### Résumé des changements

- Les pages URL inconnue, hors ligne et réseau rétabli sont désormais distinctes dans chaque portail et partagent un layout de statut. Le rechargement après rétablissement est explicite et aucune requête n'est rejouée.
- Les codes à six chiffres utilisent un composant OTP accessible à six cases avec collage, autofill, navigation clavier et erreurs associées.
- Le CDC et la présente décision décrivent les comportements livrés.

### Chemins modifiés

- `apps/customer-portal/src/App.tsx`, `src/components/account/ChangeEmailCard.tsx`, `src/components/account/StepUpPanel.tsx`, `src/components/auth/OtpChallengeView.tsx`, `src/composables/useYupForm.ts`, `src/i18n/locales/en.ts`, `src/i18n/locales/fr.ts`, `src/pages/ConnectionPage.tsx` (supprimé), `src/pages/NotFoundPage.tsx`, `src/pages/ResetPasswordPage.tsx`, `src/styles/components.css` et nouveaux composants/tests sous `src/components/layout`, `src/components/ui` et `src/pages`.
- `apps/staff-portal/src/App.tsx`, `src/composables/useYupForm.ts`, `src/features/admin/components/RecoveryDialog.tsx`, `src/features/admin/components/StepUpDialog.tsx`, `src/i18n/locales/en.ts`, `src/i18n/locales/fr.ts`, `src/pages/ConnectionPage.tsx` (supprimé), `src/pages/NotFoundPage.tsx`, `src/pages/auth/ForgotPasswordPage.tsx`, `src/pages/auth/ForgotPasswordPage.test.tsx`, `src/pages/auth/MfaPage.tsx`, `src/styles/components.css` et nouveaux composants/tests sous `src/components/layout`, `src/components/ui` et `src/pages`.
- `docs/architecture/ADR-002-applications-frontend-et-routage-mutualise.md`, `docs/cdc/CDC-01-identite-acces.md`.

### Validations

- Tests CUSTOMER : 38 réussis ; STAFF : 13 réussis.
- Typecheck et lint des deux portails : réussis.
- Builds des deux portails : réussis ; avertissement Vite existant d'un chunk JS minifié supérieur à 500 kB.
- Simulation navigateur `offline`/`online` vérifiée dans les deux applications. Aucun débordement horizontal constaté sur CUSTOMER aux largeurs 320, 360, 600, 840 et 1120 px, ni sur STAFF à 600 px.

### Points ouverts et suite attendue

- La longueur OTP frontend est six ; conserver `OTP_LENGTH=6` côté backend ou aligner les portails avant tout changement de configuration.
- La recette utilisateur et les autres validations de production listées ci-dessus restent indépendantes de cette livraison.

## Mise à jour — builds centralisés et utilitaires PlanetHoster

### Objectif et statut

Consigner le processus de build centralisé, le dépôt privé d'artefacts par SHA et la migration manuelle via Node/npm sur le sous-domaine `deploy`. **Implémentation locale terminée ; compatibilité réelle de l'hébergement mutualisé à valider.**

### Résumé des changements

- D13 confirme que GitHub Actions construit avec pnpm et dépose les artefacts hors de la racine publique ; les portails statiques ne requièrent pas Node à l'exécution.
- Le dépôt d'artefacts et les migrations sont deux workflows distincts. La migration exige un SHA `main`, une confirmation de sauvegarde et l'environnement GitHub `production`, et n'exécute que `prisma migrate deploy`.
- Le profil de production reste sur l'hôte, hors dépôt et répertoire de déploiement. La sélection est explicite ; aucun `.env.prod` n'est copié vers `.env`.
- Les artefacts n'incluent ni `.env`, ni `node_modules`, ni toutes les dépendances runtime d'`auth-service`; le démarrage/rechargement du service et la publication des portails ne sont pas encore automatisés.

### Chemins modifiés

- `.github/workflows/build-artifacts.yml`, `.github/workflows/migrate-auth-service.yml`
- `deploy-tools/prisma-migrator/`
- `scripts/generate-env.cjs`, `scripts/generate-env.test.cjs`, `scripts/run-prisma.cjs`, `scripts/run-prisma.test.cjs`, `package.json`
- `README.md`, `docs/README.md`, `docs/architecture/ADR-002-applications-frontend-et-routage-mutualise.md`

### Validations

- Tests ciblés des scripts et du migrateur : 16 réussis.
- Installation npm du migrateur et tests ciblés : réussis ; `npm audit --omit=dev` : 0 vulnérabilité.
- `prisma validate` du schéma `auth-service` avec une URL synthétique : réussi.
- Prettier et `git diff --check` : réussis.
- Les workflows distants et le build complet des workspaces n'ont pas été exécutés dans cette session.

### Points ouverts et suite attendue

- Configurer les variables d'URL API, les secrets SSH et empreintes d'hôtes, le répertoire privé, l'environnement Node `deploy` et le chemin du fichier d'environnement de production.
- Vérifier sur PH la version Node, l'accès réseau à npm et PostgreSQL, et la sauvegarde/restauration d'une base de test.
- Déposer un build `dev`, vérifier sa structure, puis exécuter une migration sur une base isolée avant toute action de production.

## Mise à jour — releases datées et runtime isolé

- **Objectif :** remplacer le dépôt par SHA par des releases datées conservées par cinq, maintenir `dist/` courant et déployer l'API avec ses dépendances.
- **Statut :** implémentation locale terminée; recette PlanetHoster en attente de configuration.
- **Résumé :** le workflow commun est appelé par une action manuelle d'initialisation et une action automatique sur `main`. Le paquet auth est assemblé par pnpm dans GitHub Actions; le Node environment de PH n'a pas besoin de pnpm. La copie du service est publiée sous `runtime/` d'un APP_ROOT CloudLinux distinct afin de conserver la configuration à sa racine. Les migrations sont opérées manuellement depuis une release datée.
- **Chemins modifiés :** `.github/workflows/build-artifacts.yml`, `.github/workflows/first-deployment.yml`, `.github/workflows/deploy-planet-host.yml`, `deploy-tools/release-manager.cjs`, `deploy-tools/release-manager.test.cjs`, `docs/deployment/planethoster-manual-migrations.md`, `README.md`, `docs/architecture/ADR-002-applications-frontend-et-routage-mutualise.md`.
- **Validations :** 17 tests Node ciblés réussis; empaquetage runtime pnpm et smoke test local des dépendances/Prisma réussis avec une URL synthétique; Prettier et `git diff --check` réussis. `actionlint` indisponible; workflow GitHub et serveur PH non exécutés.
- **Points ouverts :** définir secrets/variables production, vérifier l'accès GitHub et npm depuis PH, les chemins CloudLinux, variables runtime, compatibilité des dépendances natives et l'espace disque.
- **Suite attendue :** recette contrôlée du premier workflow sur PH, puis vérification séparée de la migration avec sauvegarde; ne pas lancer de déploiement réel avant la configuration.

## Mise à jour — commentaires des workflows et emplacements d'environnement

- **Objectif :** commenter les blocs du workflow PlanetHoster et rendre explicites les emplacements et responsabilités des environnements build/runtime.
- **Statut :** terminé localement; recette CloudLinux restant à effectuer.
- **Résumé :** le workflow précise désormais les étapes runner, création/suppression du `.env` temporaire, URLs Vite publiques, URL Prisma synthétique, archive sans `.env`, transfert SSH, publication de release et redémarrage. `auth-service` accepte `RUNTIME_ENV_FILE` pour charger sa configuration persistante hors de `runtime/`; le déploiement vérifie avant publication que ce fichier existe. La documentation distingue le `.env` temporaire GitHub du fichier runtime privé sur PH et interdit la copie de `.env.prod`.
- **Chemins modifiés :** `.github/workflows/deploy-planet-host.yml`, `services/auth-service/src/config/runtime-env.ts`, `services/auth-service/src/config/runtime-env.spec.ts`, `services/auth-service/README.md`, `README.md`, `docs/architecture/ADR-002-applications-frontend-et-routage-mutualise.md`.
- **Décisions et exigences concernées :** ADR-001 §5 (séparation build/runtime); ADR-002 D13 et §14 (déploiement PlanetHoster); CDC-01 §11.12 (démarrage depuis les seules variables runtime et refus d'une configuration invalide).
- **Validations :** `pnpm --filter auth-service test -- --runInBand src/config/runtime-env.spec.ts` — 1 test réussi; `node --test scripts/generate-env.test.cjs scripts/run-prisma.test.cjs scripts/bump-version.test.cjs deploy-tools/release-manager.test.cjs` — 17 tests réussis; Prettier sur le workflow, le code et la documentation — réussi; `git diff --check` — réussi. GitHub Actions et PlanetHoster non exécutés; `actionlint` indisponible.
- **Points ouverts :** créer le fichier runtime privé et la clé référencée, définir `RUNTIME_ENV_FILE` dans CloudLinux, puis confirmer sur PH que la configuration est conservée au redémarrage.
- **Suite attendue :** terminer les validations locales; avant toute release, configurer l'application CloudLinux et tester son redémarrage sans exposer de secrets.

## Mise à jour — reconstruction contrôlée du profil production

- **Objectif :** reconstruire le profil applicatif `.env.prod` uniquement pendant le build GitHub et documenter sa préparation distinctement des paramètres SSH `SERVER_*`.
- **Statut :** implémentation locale terminée; configuration GitHub et recette PH non exécutées.
- **Résumé :** le workflow consomme le secret d'environnement `KG_PAY_APP_ENV` (contenu complet de `.env.prod`), écrit un `.env` temporaire protégé sur le runner, retire la variable secrète avant le build, puis supprime `.env` et les sorties générées. Les clés `runtimeOnly` ne sont pas incluses dans les sorties build. Sur PH, l'opérateur dépose séparément `.env.prod` sous le nom `.env` dans l'APP_ROOT privé; le workflow appelle le générateur du clone pour créer la sortie runtime non suffixée attendue par `auth-service`. Les secrets SSH et chemins de déploiement restent identifiés par `SERVER_*` et ne sont pas écrits dans le profil applicatif.
- **Chemins modifiés :** `.github/workflows/deploy-planet-host.yml`, `README.md`, `docs/README.md`, `docs/architecture/ADR-002-applications-frontend-et-routage-mutualise.md`, `services/auth-service/README.md`.
- **Décisions et exigences concernées :** ADR-001 §5 (source et filtrage des environnements); ADR-002 D13 et §14 (build GitHub, configuration PH et dépôt); CDC-01 §11.12 (configuration runtime obligatoire).
- **Validations :** Prettier sur les workflows, sources et documents modifiés — réussi; `pnpm --filter auth-service test -- --runInBand src/config/runtime-env.spec.ts` — 1 test réussi; `node --test scripts/generate-env.test.cjs scripts/run-prisma.test.cjs scripts/bump-version.test.cjs deploy-tools/release-manager.test.cjs` — 17 tests réussis; `git diff --check` — réussi. GitHub Actions et PlanetHoster non exécutés; `actionlint` indisponible. `.env.prod` n'a pas été lu.
- **Points ouverts :** définir `KG_PAY_APP_ENV` au niveau de l'environnement GitHub `production` (contenu complet de `.env.prod`) et retirer éventuellement les anciennes clés applicatives importées au niveau dépôt; déposer le profil source sur PH et confirmer que `RUNTIME_ENV_FILE` pointe vers la sortie générée. Le profil complet est accessible au runner durant le build; maintenir l'environnement GitHub protégé et le workflow limité à `main`.
- **Suite attendue :** valider localement le workflow, puis exécuter l'initialisation manuelle seulement après configuration des secrets et prérequis PH.

## Mise à jour — secrets SSH limités aux trois identifiants

- **Objectif :** réduire les secrets SSH requis à l'hôte, l'utilisateur et la clé privée sans désactiver la vérification d'identité du serveur.
- **Statut :** terminé localement; variables GitHub et connexion SSH réelles à configurer/vérifier.
- **Résumé :** `SERVER_SSH_KNOWN_HOSTS` est désormais lu depuis les variables de l'environnement GitHub `production`, et le port facultatif depuis `vars.SERVER_SSH_PORT` (défaut `5022`). Le contrôle `StrictHostKeyChecking=yes` reste activé. Les trois secrets sont `SERVER_HOST`, `SERVER_USER` et `SERVER_SSH_KEY`.
- **Chemins modifiés :** `.github/workflows/deploy-planet-host.yml`, `README.md`, `docs/architecture/ADR-002-applications-frontend-et-routage-mutualise.md`.
- **Décision concernée :** ADR-002 §14, configuration de l'accès SSH PlanetHoster.
- **Validations :** Prettier sur le workflow, le README, l'ADR et le journal — réussi; `git diff --check` — réussi. Connexion réelle à PlanetHoster non exécutée.
- **Points ouverts :** ajouter la clé d'hôte publique et vérifier son empreinte hors bande avant de lancer le workflow; ne pas désactiver la vérification SSH.
- **Suite attendue :** configurer les trois secrets et les variables `SERVER_SSH_KNOWN_HOSTS` / `SERVER_SSH_PORT` dans GitHub Environment `production`, puis tester la connexion.

## Mise à jour — connexion sans épinglage de clé d'hôte

- **Objectif :** supprimer l'exigence `SERVER_SSH_KNOWN_HOSTS` du workflow PlanetHoster, à la demande du porteur du projet.
- **Statut :** terminé localement; connexion réelle à PlanetHoster non testée.
- **Résumé :** les commandes `ssh` et `scp` continuent d'utiliser `SERVER_HOST`, `SERVER_USER` et `SERVER_SSH_KEY`, mais OpenSSH ne vérifie ni ne conserve désormais la clé d'hôte (`StrictHostKeyChecking=no`, `UserKnownHostsFile=/dev/null`). Cette simplification signifie que l'identité du serveur n'est pas authentifiée et expose le trafic à un risque d'interception ou d'usurpation.
- **Chemins modifiés :** `.github/workflows/deploy-planet-host.yml`, `README.md`, `docs/architecture/ADR-002-applications-frontend-et-routage-mutualise.md`.
- **Décision concernée :** ADR-002 §14, configuration de l'accès SSH PlanetHoster.
- **Validations :** Prettier sur le workflow, le README, l'ADR et le journal — réussi; `git diff --check` — réussi. Validation du workflow et connexion PlanetHoster — non exécutées.
- **Points ouverts :** aucun paramètre `SERVER_SSH_KNOWN_HOSTS` n'est requis; le timeout TCP observé auparavant reste indépendant de cette vérification.
- **Suite attendue :** relancer la connexion une fois que l'accès SSH PlanetHoster répond sur le port configuré.

## Mise à jour — diagnostics du workflow PlanetHoster

- **Objectif :** rendre les échecs de validation et de commandes SSH distantes compréhensibles sans exposer les valeurs des secrets.
- **Statut :** terminé localement; nouveau workflow à pousser et à relancer pour confirmer le diagnostic sur PH.
- **Résumé :** les paramètres d'hôte, d'utilisateur, de port et de chemins produisent maintenant un message d'erreur explicite si leur format est invalide. Les commandes Bash/SSH signalent la ligne distante en échec; les fichiers et répertoires prérequis ont également des messages ciblés. Mise à jour de la documentation pour refléter que la configuration `SERVER_*` est fournie par les secrets GitHub `production`.
- **Chemins modifiés :** `.github/workflows/deploy-planet-host.yml`, `README.md`, `docs/architecture/ADR-002-applications-frontend-et-routage-mutualise.md`.
- **Décision concernée :** ADR-002 §14, déploiement PlanetHoster et configuration de l'environnement GitHub.
- **Validations :** Prettier sur le workflow, le README, l'ADR et le journal — réussi; `git diff --check` — réussi; validation `bash -n` des 6 blocs `run` avec Git Bash — réussie. `actionlint` indisponible; aucun déploiement distant lancé.
- **Points ouverts :** les logs du run précédent masquent toutes les valeurs `SERVER_*` et ne donnent pas l'erreur précise; la prochaine exécution devra confirmer si un paramètre invalide ou une commande distante échoue.
- **Suite attendue :** valider le workflow localement, pousser la correction puis relancer le déploiement. Ne pas partager les valeurs des secrets.

## Mise à jour — génération du runtime sur GitHub et clone source PH

- **Objectif :** supprimer l'exigence d'une deuxième copie du `.env` de production sur PlanetHoster, générer les environnements runtime depuis le profil central et garder le clone source pour les opérations Prisma manuelles.
- **Statut :** modifications locales terminées et validations ciblées réussies; exécution GitHub Actions et recette PlanetHoster à faire.
- **Résumé :** le workflow génère sur le runner les environnements runtime depuis `KG_PAY_APP_ENV`, transfère séparément le runtime filtré d'`auth-service` et l'installe avec des permissions privées dans l'APP_ROOT CloudLinux. Le runtime secret n'est pas ajouté à l'archive GitHub et le profil `.env` complet n'est plus requis sur PH. Le clone synchronisé dans `SERVER_DEPLOY_ROOT/repository/` est conservé comme source pour les opérations manuelles; la procédure Prisma vérifie qu'il correspond au commit déployé et utilise Node/npm sans pnpm.
- **Chemins modifiés :** `.github/workflows/deploy-planet-host.yml`, `README.md`, `docs/README.md`, `docs/architecture/ADR-002-applications-frontend-et-routage-mutualise.md`, `docs/deployment/planethoster-manual-migrations.md`, `services/auth-service/README.md`.
- **Décisions et exigences concernées :** ADR-001 §5 (source centrale et sorties build/runtime séparées); ADR-002 D13 et §14 (build GitHub, release et déploiement PlanetHoster); CDC-01 §11.12 (démarrage avec les seules variables runtime générées depuis la source centrale).
- **Validations :** `node --test scripts/generate-env.test.cjs scripts/run-prisma.test.cjs scripts/bump-version.test.cjs deploy-tools/release-manager.test.cjs` — 17 tests réussis; Prettier `--check` sur les sept fichiers modifiés — réussi; `bash -n` sur les six blocs shell multilignes du workflow via Git Bash — réussi; `git diff --check` — réussi. `actionlint` non exécuté car non installé.
- **Points ouverts :** confirmer `KG_PAY_APP_ENV` dans l'environnement GitHub `production`, configurer `RUNTIME_ENV_FILE` et la clé privée dans CloudLinux, puis vérifier le transfert et le redémarrage sur PH. Un ancien `.env` éventuellement déposé manuellement dans l'APP_ROOT n'est plus utilisé; le retirer après validation du nouveau déploiement.
- **Suite attendue :** pousser le workflow, exécuter l'initialisation ou le déploiement selon l'état de PH, vérifier que le runtime reçu correspond à la production, puis tester séparément la procédure Prisma manuelle. Aucun déploiement distant n'a été exécuté pendant cette tâche.

## Mise à jour — provisionnement de la clé JWT sur PlanetHoster

- **Objectif :** résoudre l'absence de `JWT_KEY_ID` dans le profil runtime et gérer la clé privée de signature sans l'envoyer sur GitHub.
- **Statut :** modifications locales terminées et tests ciblés réussis; le profil `KG_PAY_APP_ENV` doit être complété avant la prochaine exécution.
- **Résumé :** `JWT_KEY_ID` est maintenant validé comme identifiant stable non secret. Pendant `initialize`, le serveur crée une paire RSA 3072 bits dans `SERVER_AUTH_SERVICE_APP_ROOT/.secrets/` à l'aide du clone source; les redéploiements vérifient l'existence, le format, les permissions et l'identifiant associé sans générer ni remplacer la clé. Le runtime généré sur GitHub contient les paramètres nécessaires au service, dont le chemin et le key ID, jamais la clé privée.
- **Chemins modifiés :** `.github/workflows/deploy-planet-host.yml`, `.env.example`, `package.json`, `scripts/generate-signing-keys.cjs`, `scripts/generate-signing-keys.test.cjs`, `services/auth-service/env.schema.json`, `README.md`, `docs/README.md`, `docs/architecture/ADR-002-applications-frontend-et-routage-mutualise.md`, `services/auth-service/README.md`.
- **Décisions et exigences concernées :** ADR-001 §5 (source centrale et secrets runtime); ADR-002 D13/§14 (génération runtime sur GitHub et runtime privé PH); CDC-01 §11.12 (variables runtime obligatoires au démarrage).
- **Validations :** `node --test scripts/generate-env.test.cjs scripts/generate-signing-keys.test.cjs scripts/run-prisma.test.cjs scripts/bump-version.test.cjs deploy-tools/release-manager.test.cjs` — 20 tests réussis; `bash -n` sur les six blocs shell multilignes — réussi; Prettier sur les fichiers compatibles — réussi; `git diff --check` — réussi. `actionlint` non exécuté car non installé.
- **Points ouverts :** renseigner dans `.env.prod` un `JWT_KEY_ID__AUTH_SERVICE` stable et le chemin absolu réel `.../.secrets/auth-private.pem`, puis mettre à jour le secret GitHub `KG_PAY_APP_ENV`. Vérifier `RUNTIME_ENV_FILE` dans CloudLinux et le démarrage effectif sur PH. Aucun déploiement réel n'a été exécuté.
- **Suite attendue :** après ajout des deux paramètres au profil, relancer l'initialisation si le clone PH n'existe pas encore; le premier lancement créera la clé et les suivants la vérifieront. Ne jamais transférer la clé privée ni la renouveler lors d'un déploiement normal.
