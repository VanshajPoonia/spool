---
version: 1
slug: "src-app-board-layout-tsx"
primary_target: "src/app/board/layout.tsx"
related_targets: ["src/components/app","src/app/board"]
---

Scope: the app (/board and its places: Bay, Plan, Repos and a repo's page, Discover, Programs and GSoC organisations, Settings). Visitor mode: Operate.

Audience and task: a contributor checking several times a day what waits on them versus what they wait on, then acting on GitHub. Scanability and familiar affordances outrank expression.

Frame: Linear's app frame. A 236px sidebar on the console (face chip and name, sync, the six places with the Bay's on-you count in your-move yellow, the busiest repos under their callsigns, sync status and account at the foot); every page sits in one inset panel. Inside the panel nothing is boxed again: sections lie flat, opened by their own head and a hairline. On phones the sidebar folds into a sticky bar with the places in a scrolling strip that keeps the current place in view.

Patterns: a page head with a 20px title and one line of context or live counts; view bars of 32px controls (search, segmented control, toggles with a mark and count, pill filters with callsigns); lists as Linear rows with a fixed priority slot (three bars, dim when unset) and a fixed ID column; figures as inline count lines or tabs with counts, never stat cards; menus that scale in from their trigger; pills for every action; sample data labelled by one quiet band across the panel's top.

Constraints: read-only toward GitHub; keyboard paths on the Bay (j, k, o, p, s, 1 to 3); retyping numerals stay on counts that change live; reduced motion honoured; dark default, light kept.
