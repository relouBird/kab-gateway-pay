# Journal — BASE — 2026-11-23

## Synchronisation des guides développeur

- **Objectif :** aligner les README sur l'état réel du workspace et les commandes nommées des deux portails.
- **Statut :** terminé.
- **Résumé :** retrait de l'affirmation périmée indiquant que le portail du personnel restait à construire ; ajout de son périmètre et distinction entre administration super-admin et gestion des sessions propres par STAFF. Les contrats Yup/types sont décrits conformément à ADR-002 D3 et les exemples de scripts utilisent leurs noms réellement déclarés.
- **Chemins modifiés :** `README.md`, `docs/README.md`, `docs/REPRISE-CDC-01-FRONTEND.md`.
- **Sections concernées :** état applicatif, architecture des packages partagés, commandes de workspace et reprise frontend.
- **Validations :** Prettier passé sur les README et la reprise ; `git diff --check` réussi. Le contrôle Prettier groupé signale aussi des écarts dans CDC/ADR non formatés intégralement pour éviter une réécriture hors périmètre.
- **Points ouverts :** aucun point d'architecture nouveau ; les courriels restent ouverts au CDC-01 §10.16.
- **Suite attendue :** maintenir ces états documentaires lors de la recette frontend et de l'arbitrage des courriels.

## Configuration du lien des invitations STAFF

- **Objectif :** rendre l'accès depuis le courriel d'invitation configurable et facultatif.
- **Statut :** terminé.
- **Résumé :** ajout de `STAFF_PORTAL_URL__AUTH_SERVICE` au modèle et au schéma d'environnement. La valeur est facultative; si elle est absente, le gabarit conserve le jeton et omet le bouton. Une valeur fournie doit être une URL HTTP(S) sûre et HTTPS en production.
- **Chemins modifiés :** `services/auth-service/src/config/auth.config.ts`, son test, `services/auth-service/env.schema.json`, `.env.example`, `services/auth-service/src/auth/auth.service.ts`, services et tests e-mail.
- **Sections concernées :** configuration `auth-service`, variables du modèle développeur et notification d'invitation du CDC-01.
- **Validations :** `pnpm env:build`, typecheck, lint, build et 10 suites/29 tests réussis ; Prettier vérifié sur code/README ciblés et `git diff --check` réussi.
- **Points ouverts :** valeur publique à fournir au déploiement ; vide par défaut pour éviter une URL locale/non confirmée.
- **Suite attendue :** renseigner l'URL publique lorsqu'elle est confirmée et recetter l'invitation via SMTP.

## Ajout du workspace `staff-portal`

- **Objectif :** intégrer l'application personnelle comme workspace standard pnpm/Turborepo, sans nouvelle dépendance externe.
- **Statut :** terminé.
- **Résumé :** scripts racine ciblés build/dev/lint/typecheck/test et schéma de variables `STAFF_PORTAL` ajoutés. Le lockfile inclut le nouveau workspace ; `.env.example` documente son URL d'API et le port Vite 5174. L'origine CORS doit être ajoutée à la configuration locale avant d'appeler `auth-service`.
- **Chemins modifiés :** `package.json`, `pnpm-lock.yaml`, `.env.example`, `apps/staff-portal/package.json`, `apps/staff-portal/env.schema.json`, configuration Vite/TypeScript et documentation racine.
- **Sections concernées :** workspace pnpm/Turborepo, génération d'environnement, commandes développeur et configuration CORS locale ; aucune règle métier ou décision d'hébergement modifiée.
- **Validations :** `pnpm install --lockfile-only` — réussi ; `pnpm install --offline --frozen-lockfile` — réussi ; build/lint/typecheck/tests du workspace — réussis. L'alias Turbo a besoin de `VITE_AUTH_API_URL__STAFF_PORTAL` présent dans le `.env` local.
- **Points ouverts :** configuration `.env` locale non modifiée ; compatibilité CORS/cookies en production à confirmer.
- **Suite attendue :** ajouter les valeurs publiques staff au `.env` local et autoriser l'origine 5174 avant recette avec le backend.

## Création du skill local Claude pour le design frontend KG Pay

- **Objectif :** fusionner la philosophie visuelle KG Pay fournie avec la méthode générale de création de philosophies visuelles et de canevas.
- **Statut :** terminé localement.
- **Résumé :** création du skill `kgpay-frontend-design` dans `.agents/skills/`. Il distingue le travail d'interface des demandes de philosophie/canevas, rappelle les exigences documentaires et API KG Pay, résume les tokens et l'accessibilité, et référence les variantes de logo disponibles. Les assets existants n'ont pas été modifiés.
- **Chemins concernés :** `.agents/skills/kgpay-frontend-design/SKILL.md`, `apps/assets/` (lecture seule).
- **Sections concernées :** conventions transversales de design et d'implémentation frontend ; aucune règle métier ou décision d'architecture modifiée.
- **Validations :** vérification du frontmatter (`name` égal au nom du skill) et de la présence des sept SVG référencés — réussie. `git check-ignore -v .agents/skills/kgpay-frontend-design/SKILL.md` confirme que `.agents/` est ignoré par Git. Tests/build non exécutés — skill et documentation uniquement.
- **Points ouverts :** le skill et les assets de `apps/` sont locaux/non suivis par Git ; ils ne seront pas transmis par une PR sans décision explicite de suivi. Aucun répertoire `.claude/` ni `CLAUDE.md` n'existe à la racine.
- **Suite attendue :** utiliser le skill lors de l'implémentation frontend avec Claude ; si le mécanisme de Claude ne découvre pas `.agents/skills`, décider s'il faut ajouter un point d'entrée propre à Claude ou conserver le chargement actuel.
