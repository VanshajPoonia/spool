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
| `GITHUB_TOKEN` | Raises the rate limit for the server's GitHub searches: the landing page's live repo search (`/api/discover`) and guests' good first issues (`/api/first-issues`). Without it the server searches unauthenticated, 10 a minute for the whole site, and a busy minute shows "rate-limiting, try again in a minute". |

## Deploy

Live at https://spool.vanshajpoonia.com. Vercel project `spool` under vanshaj-poonias-projects, connected to this repo: every push to `main` deploys production, and other branches get preview URLs. The domain is a DNS-only CNAME `spool` to `cdb23d5017e94c42.vercel-dns-017.com` in the Cloudflare zone for vanshajpoonia.com.

Production responses carry a content security policy (`next.config.ts`) whose `connect-src` allows only Spool and api.github.com, so the browser itself stops a token going anywhere else.

**Still to do: the server token.** Production runs without `GITHUB_TOKEN` for now. To add it:

1. Create a classic token with no scopes: https://github.com/settings/tokens/new?description=Spool%20server%20(no%20scopes). No scopes is enough to search public data.
2. In this folder, run `vercel env add GITHUB_TOKEN production` and paste it when asked.
3. Push to `main`, or run `vercel redeploy <production deployment URL> --target production`, so the new value is picked up.

## What's where

| Route | What it does |
| --- | --- |
| `/` | Landing page: a live sample bay in the hero, a 3D airfield where sample PRs hold in review and land on main when they merge, a strip printed field by field as you scroll, a sample day you can scrub and open strip by strip, the stalled limit, callsigns, live repo discovery, the live GSoC/YC/Product Hunt schedule, the GSoC season drawn as you scroll with a filterable list of this year's organisations, the sign-on form |
| `/board` | Your move and Their move bays, then Watching, Snoozed and Landed. Pin, snooze, priorities, notes, detail drawer with the GitHub timeline |
| `/board/repos` | Every repo you've contributed to: opened, merged, closed, merge rate, median time to merge, your own repos |
| `/board/repos/[owner]/[name]` | One repo's timetable |
| `/board/discover` | Young repos and unclaimed good first issues for your interests, plus a shortlist |
| `/board/programs` | GSoC timeline and orgs matching your interests, YC deadline, your October PRs (from a username as a guest), Product Hunt launches |
| `/board/settings` | Token, board rules, interests, light theme, motion and sound, export/import/erase |

Keyboard on the board: `j`/`k` move, `Enter` opens details, `o` opens on GitHub, `p` pins, `s` snoozes a day, `/` filters, `Shift E` marks everything seen, `?` lists shortcuts.

## How "who moves next" is decided

`src/lib/classify.ts` reads the latest human event on each thread (comments, reviews, the last commit). Bots are ignored, including user accounts like CLA Assistant, except for the bot review rule below.

- Your PR is **on you**, in this order, when it's a draft; a CLA or DCO check waits on you (with a link to sign); it conflicts with the base branch; checks are failing (named, when Spool could read them); changes were requested; someone else spoke last; a review thread on the current code waits on your reply; or a bot reviewed it with comments after your last push. Approved means waiting on a merge. Otherwise it's **on them**: `CI on hold` when a maintainer has to approve the workflow runs first, and `STALLED nD` past your stalled limit (default 14 days).
- Your issue: someone else spoke last means on you; otherwise on them.
- Review requested from you, a PR opened on your repo, an issue assigned to you, or a mention answered by someone else: on you.
- Threads you only commented on: watching.

## Data sources

- GitHub GraphQL and REST, from the browser with your token (`src/lib/github.ts`). Three searches load the board in parallel. Then one lookup by id reads your own open PRs' branch state, review threads, bot reviews, workflow approvals and check names. It's kept apart because searching your PRs alone uses about 8 of the 10 seconds GitHub allows a request.
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
