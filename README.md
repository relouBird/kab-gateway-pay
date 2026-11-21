# KG Pay — Guide développeur

> **État au 21 novembre 2026 :** le dépôt Git local et le socle pnpm/Turborepo sont initialisés sur `main`, avec une branche `dev`. Le dépôt distant GitHub n'est pas configuré. Le code applicatif, les services, les applications, leurs dépendances et la CI restent à créer.

## Démarrage d'une nouvelle tâche

1. Avant tout travail de code, lire ensuite `AGENTS.md`.
2. Lire [`docs/README.md`](./docs/README.md) pour les sources de vérité, l'état des cœurs et les invariants.
3. Lire [`docs/architecture/ADR-001-monorepo-microservices.md`](./docs/architecture/ADR-001-monorepo-microservices.md).
4. Pour toute tâche frontend, routage ou déploiement, lire aussi [`docs/architecture/ADR-002-applications-frontend-et-routage-mutualise.md`](./docs/architecture/ADR-002-applications-frontend-et-routage-mutualise.md).
5. Lire le référentiel v0.3 et le CDC du cœur concerné. Le premier est CDC-01 — Identité et accès : [`docs/cdc/CDC-01-identite-acces.md`](./docs/cdc/CDC-01-identite-acces.md).
6. Ignorer `master/` (références PDF/Word administratives) sauf demande explicite du porteur du projet. Ne pas lire `node_modules`, les secrets `.env` ni les sorties générées.

Le CDC d'un cœur couvre ses exigences frontend **et** backend. Ne pas créer un cahier des charges global distinct pour le frontend.

## État de la base applicative

- Il n'y a pas encore de backend KG Pay ni de frontend KG Pay. Les workspaces `apps/`, `packages/` et `services/` sont des emplacements cibles, pas des applications implémentées.
- `nexus-gate-web` est un exemple séparé de frontend avec des pages d'authentification, Yup, Zustand et Axios. Il sert de référence de conventions, pas de backend, de contrat API ou de modèle d'identité à recopier.
- Le CDC-01 exige le MFA pour tous les sujets. La méthode du second facteur pour les clients n'est pas arbitrée.
- Les rôles internes et leurs permissions sont encore proposés, pas validés en détail.
- Le routage par chemin et l'hébergement mutualisé doivent être vérifiés avant le déploiement backend.
- La progression demandée est cœur par cœur, en commençant par le cœur 1. Ne pas générer les autres services avant validation de leurs CDC.

## Architecture cible de travail

L'architecture ci-dessous est cadrée par ADR-001/ADR-002 ; les éléments explicitement marqués « proposition » nécessitent validation avant d'être considérés comme décisions.

- Monorepo pnpm/Turborepo initialisé ; les choix d'architecture encore marqués « proposition » restent à valider.
- Frontends responsive en français et en anglais ; espace client et back-office distincts fonctionnellement.
- Services déployables de manière autonome, avec une base isolée par service. Aucun accès croisé à une base.
- `@kgpay/contracts` pourrait partager schémas Yup et types de transport frontend/backend ; le serveur reste toujours responsable de valider et d'autoriser.
- Une fabrique Axios réutilisable doit créer/configurer une instance par service, avec `baseURL` par service et environnement. Pas de secrets dans les variables `VITE_*`.
- Routage par chemin sous un domaine commun préféré si l'hébergeur peut fournir un reverse proxy compatible. API publique d'intégration sur domaine distinct : piste future, hors premier incrément.
- PWA et cache hors ligne ultérieurs ; aucune donnée privée/financière authentifiée ne doit être mise en cache hors ligne.

## Dépendances et installation

Le workspace racine utilise pnpm 10.28.2 et Turborepo. Husky et les outils de formatage du hook sont déclarés dans le manifest racine ; les dépendances des applications, services et packages restent à déclarer dans leurs propres manifests.

Commandes disponibles au bootstrap :

```bash
pnpm install
```

Les tâches `build`, `lint`, `typecheck` et `test` seront exécutables avec Turborepo lorsque les packages concernés déclareront ces scripts. Ne pas annoncer une validation comme passée si aucun script correspondant n'existe.

Quand le squelette applicatif sera créé :

- La configuration racine déclare Node.js `>=22.20.0` et pnpm `10.28.2` ; les versions résolues des dépendances sont verrouillées dans `pnpm-lock.yaml`.
- Les dépendances seront déclarées dans le manifest de chaque app, service et package ; le lockfile racine sera versionné.
- Les commandes de démarrage, build, format, lint, typecheck, tests, génération de contrat, migration et déploiement seront ajoutées ici à partir des scripts réellement configurés.
- Les versions non secrètes de configuration seront documentées dans des `.env.example`. Les secrets seront injectés hors Git ; jamais dans `env/global.env`, les manifests, les logs ou la documentation.

## Git, hooks et validation

- Le dépôt Git local est initialisé à la racine. `main` est la branche principale et `dev` la branche d'intégration ; les branches de travail partent de `dev`.
- Aucun remote n'est configuré et aucune branche n'est publiée. Ajouter un remote ou pousser requiert l'URL et l'accord du porteur du projet.
- Husky exécute avant chaque commit `lint-staged` sur les fichiers JavaScript/TypeScript/JSON concernés, puis `git diff --cached --check` sur les changements indexés.
- Les hooks seront complétés avec les scripts réels de lint, typecheck et tests quand les premiers packages applicatifs seront créés.
- La CI doit compléter les hooks locaux ; un hook ne remplace pas les suites de tests ou la revue.
- Ne pas ajouter des hooks, scripts ou fichiers de configuration qui prétendent valider sans lancer de vérification effective.

## Documentation et journal de travail

- Les référentiels métier vivent dans `docs/`, les décisions d'architecture dans `docs/architecture/`, les cahiers des charges par cœur dans `docs/cdc/`.
- Toute évolution doit respecter le statut des éléments : `[RÉFÉRENTIEL]`, `[DÉCISION]`, `[PROPOSITION]`, `[POINT OUVERT]`.
- Tracer chaque journée de travail dans `docs/journal/YYYY-MM-DD/`, avec des fichiers distincts par CDC et ADR modifiés ; utiliser `BASE.md` pour les changements transversaux.
- Chaque entrée indique les changements/fichiers, exigences concernées, vérifications réellement effectuées, questions ouvertes et suite.

## Séquence de création recommandée

1. Initialiser Git, `main`/`dev`, le workspace pnpm/Turborepo et le hook local.
2. Arbitrer les points bloquants du CDC-01 et de la stratégie de session avant de figer les contrats.
3. Créer les manifests et scripts des premiers packages ; compléter les validations réelles de lint/typecheck/tests.
4. Implémenter les contrats du cœur 1 et `auth-service` selon le CDC-01.
5. Implémenter les interfaces d'authentification du même cœur en consommant ces contrats.
6. Vérifier la compatibilité réelle de l'hébergement cible avant d'établir les instructions de déploiement.

Ne pas considérer cette séquence comme un plan autorisant l'implémentation tant que les choix bloquants du CDC-01 ne sont pas arbitrés.
