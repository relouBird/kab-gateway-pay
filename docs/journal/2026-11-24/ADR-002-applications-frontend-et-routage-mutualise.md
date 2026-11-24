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
