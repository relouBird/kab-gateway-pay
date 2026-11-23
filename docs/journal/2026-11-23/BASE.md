# Journal — BASE — 2026-11-23

## Création du skill local Claude pour le design frontend KG Pay

- **Objectif :** fusionner la philosophie visuelle KG Pay fournie avec la méthode générale de création de philosophies visuelles et de canevas.
- **Statut :** terminé localement.
- **Résumé :** création du skill `kgpay-frontend-design` dans `.agents/skills/`. Il distingue le travail d'interface des demandes de philosophie/canevas, rappelle les exigences documentaires et API KG Pay, résume les tokens et l'accessibilité, et référence les variantes de logo disponibles. Les assets existants n'ont pas été modifiés.
- **Chemins concernés :** `.agents/skills/kgpay-frontend-design/SKILL.md`, `apps/assets/` (lecture seule).
- **Sections concernées :** conventions transversales de design et d'implémentation frontend ; aucune règle métier ou décision d'architecture modifiée.
- **Validations :** vérification du frontmatter (`name` égal au nom du skill) et de la présence des sept SVG référencés — réussie. `git check-ignore -v .agents/skills/kgpay-frontend-design/SKILL.md` confirme que `.agents/` est ignoré par Git. Tests/build non exécutés — skill et documentation uniquement.
- **Points ouverts :** le skill et les assets de `apps/` sont locaux/non suivis par Git ; ils ne seront pas transmis par une PR sans décision explicite de suivi. Aucun répertoire `.claude/` ni `CLAUDE.md` n'existe à la racine.
- **Suite attendue :** utiliser le skill lors de l'implémentation frontend avec Claude ; si le mécanisme de Claude ne découvre pas `.agents/skills`, décider s'il faut ajouter un point d'entrée propre à Claude ou conserver le chargement actuel.
