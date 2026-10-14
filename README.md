# Spool

The open source manager that knows whose move it is. Spool puts every PR, issue, review request and mention you have open on GitHub in one bay of printed strips, sorted by who owes the next reply: **your move** when someone answered, **their move** when you're waiting, **stalled** when nobody has spoken for too long. It also tracks repo-by-repo progress, finds young repos and good first issues in your interests, and puts GSoC, YC, Hacktoberfest and Product Hunt dates on the same wall.

## Run it

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

Open `/board?demo=1` to explore with sample data, or paste a GitHub token on the landing page (`#connect`) or at `/board`.

### The token

- A **classic** token with no scopes reads public repos. Add `repo` if you want private repos on the board. Fine-grained tokens with public read access also work.
- It is stored in this browser's `localStorage` and sent only to `api.github.com`. Spool never writes to GitHub.
- Create one: https://github.com/settings/tokens/new?description=Spool%20board%20(read-only)

### Optional server env

| Variable | Used for |
| --- | --- |
| `GITHUB_TOKEN` | Raises the rate limit for the landing page's live repo search (`/api/discover`). Without it the server searches unauthenticated (10 requests/min, cached for hours). |

## What's where

| Route | What it does |
| --- | --- |
| `/` | Landing page: a live sample bay in the hero, a 3D airfield where sample PRs hold in review and land on main when they merge, a strip printed field by field as you scroll, a sample day you can scrub and open strip by strip, the stalled limit, callsigns, live repo discovery, the live GSoC/YC/Product Hunt schedule, the GSoC season drawn as you scroll with a filterable list of this year's organisations, the sign-on form |
| `/board` | Your move and Their move bays, then Watching, Snoozed and Landed. Pin, snooze, priorities, notes, detail drawer with the GitHub timeline |
| `/board/repos` | Every repo you've contributed to: opened, merged, closed, merge rate, median time to merge, your own repos |
| `/board/repos/[owner]/[name]` | One repo's timetable |
| `/board/discover` | Young repos and unclaimed good first issues for your interests, plus a shortlist |
| `/board/programs` | GSoC timeline and orgs matching your interests, YC deadline, your October PRs, Product Hunt launches |
| `/board/settings` | Token, board rules, interests, light theme, motion and sound, export/import/erase |

Keyboard on the board: `j`/`k` move, `Enter` opens details, `o` opens on GitHub, `p` pins, `s` snoozes a day, `/` filters, `Shift E` marks everything seen, `?` lists shortcuts.

## How "who moves next" is decided

`src/lib/classify.ts` reads the latest human event on each thread (comments, reviews, the last commit; bots ignored):

- Your PR: draft, failing CI, changes requested, or someone else spoke last means it's **on you**. Approved means waiting on a merge. Otherwise it's **on them**, and past your stalled limit (default 14 days) it's `DELAYED nD`.
- Your issue: someone else spoke last means on you; otherwise on them.
- Review requested from you, a PR opened on your repo, an issue assigned to you, or a mention answered by someone else: on you.
- Threads you only commented on: watching.

## Data sources

- GitHub GraphQL and REST, from the browser with your token (`src/lib/github.ts`). One GraphQL request loads the whole board.
- GSoC: `summerofcode.withgoogle.com/api/program/` and `/api/program/<year>/organizations/`
- YC: the batch and deadline fields on `ycombinator.com/apply`
- Product Hunt: `producthunt.com/feed` (Atom)

Public feeds are fetched on the server and cached for hours (`src/lib/programs.ts`, Next.js `use cache`).

## Notes

- Built single-user first. All persistence goes through `src/lib/store.ts`, so moving to server-side accounts later means replacing that module.
- Sample data (landing sections and `?demo=1`) is invented and labelled as such on the page. Files: `src/lib/sample-*.ts`.
- The strip printer is `src/components/print/engine.ts`: one shared animation loop types every printed field left to right when it changes, with a synthesized printer tick (off by default). Strips and bays are `src/components/kit/Strip.tsx`; the design system is in `DESIGN.md`.
- Dark (the night shift) is the default; the light day shift is a switch in the nav, footer and Settings, stored in this browser.
- Motion respects `prefers-reduced-motion`, and the footer and Settings both have a reduce-motion toggle.
