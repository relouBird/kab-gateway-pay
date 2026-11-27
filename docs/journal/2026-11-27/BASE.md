# Journal — 27 novembre 2026 — BASE

## Procédure de bootstrap sur PlanetHoster

- **Objectif :** clarifier l'exécution interactive du bootstrap du premier `GLOBAL_SUPER_ADMIN` après les migrations.
- **Statut :** terminé localement; exécution réelle sur PlanetHoster non effectuée.
- **Résumé :** la procédure canonique reste dans le guide de déploiement des migrations. Elle précise le virtualenv Node propre à l'application, vérifie explicitement le fichier d'environnement privé et la CLI compilée, refuse une session non interactive, puis décrit les invites mot de passe/OTP.
- **Chemins modifiés :** `docs/deployment/planethoster-manual-migrations.md`, `docs/journal/2026-11-27/BASE.md`.
- **Exigences/sections concernées :** initialisation du premier `GLOBAL_SUPER_ADMIN` (CDC-01); procédure opérationnelle PlanetHoster.
- **Validations :** revue documentaire du chemin CLI (`services/auth-service/src/cli/bootstrap-super-admin.ts`) — réalisée; tests ou commandes serveur — non exécutés, car changement documentaire et aucune session serveur utilisée.
- **Points ouverts :** le bootstrap réel nécessite que les migrations soient appliquées, que le fichier d'environnement privé existe, que PostgreSQL et SMTP soient accessibles et que la session SSH soit interactive.
- **Suite attendue :** après confirmation de la base test et des migrations, lancer la CLI une seule fois pour l'environnement concerné, vérifier l'OTP e-mail, puis redémarrer l'application CloudLinux.
