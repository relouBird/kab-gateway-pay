# ADR-005 — Frontend : parcours dossier client, composants partagés et état serveur

**Projet :** KG Pay (Kab Gateway Payment)
**Date :** 23 novembre 2026
**Statut :** Proposé, à valider avant le développement frontend du CDC-02
**Portée :** `apps/customer-portal`, `apps/staff-portal`, éventuel `packages/ui`. Complète ADR-002 (qui reste en vigueur) ; ne crée pas de « CDC frontend » séparé (ADR-002 D1).

**Légende :** **[DÉCISION]** du porteur · **[PROPOSITION]** à valider · **[POINT OUVERT]**.

---

## 1. Contexte

Le cœur 1 a livré deux portails (React 19, Vite, React Router, Zustand, react-i18next, Axios, Yup, Vitest) avec leurs propres layouts, thèmes, pages d'état et Service Workers. Le cœur 2 ajoute des écrans à données volumineuses et sensibles : dossier à compléter, téléversement de pièces, file de dossiers à examiner côté personnel. ADR-002 §8 laisse ouverts les **critères d'extraction d'un package de composants partagés**, et la gestion de l'état serveur n'est pas définie.

## 2. Décisions proposées

| # | Décision | Statut |
| --- | --- | --- |
| F1 | **Client HTTP** : une instance `customerApi` est ajoutée à la fabrique `createHttpClient` (ADR-002 D11) avec son propre `baseURL` (`VITE_CUSTOMER_API_URL__<PORTAL>`). Le rafraîchissement du jeton auprès d'`auth-service` reste **une seule logique sérialisée** partagée par toutes les instances ; une 401 provoque un seul rejeu après refresh. | [PROPOSITION] |
| F2 | **Critère d'extraction vers `packages/ui`** : un composant est extrait lorsqu'il est utilisé par **les deux portails** et ne contient **ni règle d'accès, ni libellé métier, ni appel HTTP**. Les textes viennent toujours du portail (clés i18n passées en propriétés). | [PROPOSITION] |
| F3 | **Premier lot de `packages/ui`** (usage commun déjà réel ou immédiat) : `ThemeProvider`, vues d'état (page introuvable, hors ligne, réseau rétabli), `StatusBadge`, `Timeline`, `ConfirmDialog`, hook `useCancelableAction`. Les layouts de navigation restent propres à chaque portail. | [PROPOSITION] |
| F4 | **État serveur** : TanStack Query pour listes, détails, pagination et invalidation (dossiers, documents, historique). Zustand reste réservé à la session et à l'état d'interface. Aucune donnée personnelle n'est persistée côté navigateur (pas de persistance du cache de requêtes). | [PROPOSITION] |
| F5 | **Trois états distincts** affichés séparément dans l'espace client : *Identité* (cœur 1), *Dossier* (cœur 2), *Activation par moyen de paiement* (cœur 2, incrément 2B). Un état n'est jamais déduit d'un autre (IAM-F-24). Chaque état a un tableau état → clé i18n → couleur sémantique → action proposée. | [PROPOSITION] |
| F6 | **Téléversement** : contrôles de type et de taille côté navigateur pour l'ergonomie seulement (le serveur décide) ; progression via Axios ; capture caméra sur mobile ; aperçu en mémoire. Aucun fichier n'est écrit en `localStorage`, `sessionStorage` ni IndexedDB. | [PROPOSITION] |
| F7 | **Affichage des pièces** : le contenu est récupéré par requête authentifiée (en-tête `Authorization`, impossible avec une balise `<img src>` simple), affiché via `URL.createObjectURL` et **révoqué** à la fermeture. Rien n'est mis en cache par le Service Worker (déjà exclu par ADR-002 §13). | [PROPOSITION] |
| F8 | **Brouillon du dossier** : sauvegarde automatique différée (debounce), indicateur « enregistré / en cours / erreur », contrôle de concurrence par `version` (réponse 409 → invitation à recharger), avertissement avant de quitter avec modifications non enregistrées. | [PROPOSITION] |
| F9 | **Actions annulables (IAM-F-25)** : seule la **suppression d'un document en brouillon** reçoit la fenêtre de 2 secondes (`useCancelableAction`). Soumission du dossier, décisions du personnel, suspension et clôture exigent une **confirmation explicite**, jamais une fenêtre annulable. | [PROPOSITION] — tranche CDC-01 §10 point 9 |
| F10 | **Step-up côté personnel** : réutiliser le dialogue de step-up existant du staff-portal avec la catégorie `customer-decision`. Aucun appel de décision n'est émis sans preuve valide. | [PROPOSITION] |
| F11 | **Routes** : espace client `/file`, `/file/profile`, `/file/documents`, `/file/review` ; personnel `/customers/files`, `/customers/files/:id`. Les gardes de route masquent selon les permissions du jeton **à titre ergonomique** ; le backend reste l'autorité. | [PROPOSITION] |
| F12 | **Rafraîchissement des statuts** : à la prise de focus de l'onglet et par intervalle sur la page de statut uniquement ; ni WebSocket ni notification push en V1. | [PROPOSITION] |
| F13 | **Tests de bout en bout** : Playwright dans un workspace `e2e/` à la racine, projets « recette » pilotant les deux portails contre les vrais services locaux, avec lecture des courriels via l'API de Maildev. Mêmes identifiants de test que les plans de recette. | [PROPOSITION] |

## 3. Conséquences

- Les composants communs sont partagés sans partager les décisions métier (ADR-002 D4 respecté).
- L'ajout de TanStack Query est une nouvelle dépendance dans les deux portails ; l'alternative (hooks maison) est écartée pour éviter de réimplémenter invalidation et pagination.
- Le package `packages/ui` crée une règle de dépendance supplémentaire à vérifier en CI : `apps/*` peut dépendre de `packages/ui` ; `packages/ui` ne dépend ni d'une application ni d'un service.
- Une retouche des deux portails est nécessaire pour migrer `ThemeProvider` et les vues d'état vers `packages/ui` : elle est planifiée **avant** les nouveaux écrans, pour ne pas créer de duplication supplémentaire.

## 4. Points ouverts

1. Confirmer TanStack Query (F4) et la création immédiate de `packages/ui` (F2, F3).
2. Seuils d'accessibilité visés (niveau WCAG) pour les écrans de dossier.
3. Contenu exact des vues d'état en cas d'erreur 409 et de perte de réseau pendant un téléversement.
4. Compatibilité du Service Worker avec les chemins de l'hébergeur (déjà ouvert, ADR-002 §13).

## 5. Mises à jour induites

| Document | Mise à jour |
| --- | --- |
| ADR-002 | §8 point 3 : renvoyer vers F2 ; §10 à §13 : ajouter une section « Mise en œuvre » pour le cœur 2. |
| CDC-01 §8.11 | Mentionner la migration de `ThemeProvider` et des vues d'état vers `packages/ui`. |
| README | Ajouter `e2e/` et `packages/ui` à l'arborescence. |
