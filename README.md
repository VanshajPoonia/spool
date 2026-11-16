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
| `/board` | Since you last looked (what changed between loads, until you mark it handled), then Your move and Their move bays, Watching, Snoozed and Landed. Pin, snooze, priorities, notes, detail drawer with the GitHub timeline |
| `/board/repos` | Every repo you've contributed to: opened, merged, closed, merge rate, median time to merge, your own repos |
| `/board/repos/[owner]/[name]` | Can an outsider land work here? (any repo), then your timetable in it |
| `/board/orgs` | The orgs you're investing in, grouped by goal (job, GSoC, a program, for fun), with status, next step and date, notes and links, and live counts from your board |
| `/board/discover` | Young repos and unclaimed good first issues for your interests, plus a shortlist |
| `/board/following` | Repos, orgs and maintainers you follow, each with a rule. New issues that match, a scan for free issues of any age, skipped issues with your reasons |
| `/board/programs` | GSoC timeline and orgs matching your interests, YC deadline, your October PRs (from a username as a guest), Product Hunt launches, more programs (LFX with its term dates, Outreachy, MLH Fellowship, Summer of Bitcoin, Season of Docs, C4GT, GSSoC, KWoC, SWoC), program news, and the newest open source YC startups |
| `/board/programs/yc` | YC's open source companies from past batches, newest first, with hiring, active and tag filters |
| `/board/settings` | Token, board rules, interests, light theme, motion and sound, export/import/erase |

Keyboard on the board: `j`/`k` move, `Enter` opens details, `o` opens on GitHub, `p` pins, `s` snoozes a day, `/` filters, `Shift E` marks everything seen, `?` lists shortcuts.

## How "who moves next" is decided

`src/lib/classify.ts` reads the latest human event on each thread (comments, reviews, the last commit). Bots are ignored, including user accounts like CLA Assistant, except for the bot review rule below.

- Your PR is **on you**, in this order, when it's a draft; a CLA or DCO check waits on you (with a link to sign); it conflicts with the base branch; checks are failing (named, when Spool could read them); changes were requested; someone else spoke last; a review thread on the current code waits on your reply; or a bot reviewed it with comments after your last push. Approved means waiting on a merge. Otherwise it's **on them**: `CI on hold` when a maintainer has to approve the workflow runs first, and `STALLED nD` past your stalled limit (default 14 days).
- Your issue: someone else spoke last means on you; otherwise on them.
- A discussion you started works like your issue, and counts as done once it's answered or closed. Discussions you only joined are watching. Discussions in archived repos are left out.
- Review requested from you, a PR opened on your repo, or a mention answered by someone else: on you.
- Claims, in their own bay: an issue you asked to take ("I'd like to take this", "can I work on this", "@bot assign") or were assigned. Taken means someone else got assigned or opened a PR for it (on you). Assigned means it's yours and has no PR yet, flagged after 10 days because some repos unassign at two weeks (on you). Asked means you're waiting to be assigned (on them), unless someone replied after you asked. Once your own PR links to it, the issue just becomes watching.
- Threads you only commented on: watching.

## Since you last looked

`src/lib/changes.ts` keeps a small copy of each thread from the last board load (`spool:changes` in this browser). Each fresh load is compared with it: merged, closed, a reply from someone else, CI turning red or green, a new status, a thread arriving, or one dropping off. Each becomes one item per thread, and a later change replaces the earlier one with a "+N more" count. Then the copy is replaced, so nothing is reported twice. The first load only records, and changing the stalled limit records again instead of reporting every thread. Browser notifications, when on, come from the same list: only items that are on you, found after the tab opened.

## Orgs, goals and deadlines

- The Orgs tab keeps, per org: a goal, a status (active, waiting, watching, later, on hold), a next step with a date, notes and links. It's all in this browser (`meta.investing`), works without a token, and suggests orgs from your board.
- The board filters by goal. The plan fades cards outside the goal instead of hiding them, so dragging never shuffles a card you can't see.
- Settings, Deadlines you follow: YC's application deadline, Hacktoberfest's start and end, and each GSoC milestone, read from the same sources as Programs (`src/lib/deadlines.ts`). A program date only shows once its source publishes it.
- "Coming up" sits on top of the board when a followed deadline or an org's next date (not on hold) is within 14 days. With notifications on, each one alerts once at 7 days and once at 1 day.
- LFX terms can be followed too: proposals, mentee applications (open and close) and the start of a term.
- "Download calendar file" (Settings, and the Coming up strip) saves every future followed date as all-day events in an `.ics` file, built in the browser (`src/lib/ics.ts`). Each event keeps a stable ID, so importing a newer file updates them.

## Can an outsider land work here?

Every repo page starts with a report read from public data in one request (`fetchRepoCheck()` in `src/lib/github.ts`, shaped by `src/lib/outsider.ts`), kept for a day per repo. It's linked from Discover's repos and shortlist and from repos you follow.

- Merged PRs in the last 90 days, how many came from outside (GitHub's contributor and newcomer associations) and from how many people. PRs titled with an internal ticket like `[WEB-123]` count as staff. Staff who hide their membership still look like outsiders, which is why the number of people is shown.
- The median time to a first answer on the last 20 outside PRs, from anyone but the author and not a bot (a merge counts), and how many closed with none.
- CLA or DCO checks seen on recent PRs.
- What CONTRIBUTING says about assignment, workflows named for assigning, and any AI policy (an `AI_POLICY.md`, or AI lines in CONTRIBUTING).
- Last push, licence, code of conduct, free good first issues, and your open PRs in that org against your limit (Settings, 3 by default). The board's summary says when you're at the limit somewhere.
- A one-line reading on top (outsiders land work, get in slowly, or rarely), worded as a reading of the numbers below it.

## Following

`src/lib/follow.ts` turns each follow into one GitHub search, and `fetchFollowing()` in `src/lib/github.ts` sends them eight to a request:

- A repo (`repo:owner/name`) or an org or account (`user:owner`), with a rule. **With labels** keeps issues carrying one of your labels (good first issue and help wanted to start). **Filed by maintainers** keeps issues opened by owners, members and collaborators, as far as GitHub shows membership. **Every new issue** keeps all of them.
- A maintainer (`@login`): new issues they file anywhere.
- Every search wants open, unassigned issues with no linked PR (`no:assignee -linked:pr`), newest first. Each issue is then marked free, asked for (someone else's claim comment in the last 21 days), or covered by a PR that only mentions it.
- The free-issue scan ignores the rule: any label, recently active first, keeping only free ones.
- One person filing the same issue in three or more repos shows once, with "+N repos".
- A follow is checked against GitHub when you add it, so a typo or an archived repo says so instead of quietly finding nothing.
- Checks run when the page opens and reuse anything under 15 minutes old. Skipped issues, with your reason, never come back unless you bring them back. Following needs a token: checking even a few follows takes more searches than GitHub gives a guest.

## Data sources

- GitHub GraphQL and REST, from the browser with your token (`src/lib/github.ts`). Three requests load the board in parallel, nine searches in all, one of them for discussions. Then lookups by id read your own open PRs' branch state, review threads, bot reviews, workflow approvals and check names, and for issues you're involved in, your ask, your assignment and PRs that reference them. It's kept apart because searching your PRs alone uses about 8 of the 10 seconds GitHub allows a request.
- GSoC: `summerofcode.withgoogle.com/api/program/` and `/api/program/<year>/organizations/`
- YC: the batch and deadline fields on `ycombinator.com/apply`
- Product Hunt: `producthunt.com/feed` (Atom)
- LFX Mentorship: the timeline table on each term's page in `cncf/mentoring` (`programs/lfx-mentorship/<year>/<term>/README.md`, read from raw.githubusercontent.com), this year's and next year's terms
- GSoC organisations from earlier years: the same yearly lists, keeping orgs from 2022 on that aren't in the latest program, each from the last year it took part (the browser's "Earlier years" view)
- YC open source companies: YC's company directory, tag "Open Source", via the yc-oss API (`yc-oss.github.io/api`, rebuilt daily from YC's directory)
- Program news: the Google Open Source blog (GSoC and Season of Docs posts only), Outreachy's blog, CNCF (mentorship and LFX posts only) and Summer of Bitcoin's blog, RSS or Atom
- The other programs link to their own sites with "check the site" for dates: none publishes them in a form Spool can read reliably

Public feeds are fetched on the server and cached for hours (`src/lib/programs.ts`, Next.js `use cache`).

## Notes

- Built single-user first. All persistence goes through `src/lib/store.ts`, so moving to server-side accounts later means replacing that module.
- Sample data (landing sections and `?demo=1`) is invented and labelled as such on the page. Files: `src/lib/sample-*.ts`.
- The strip printer is `src/components/print/engine.ts`: one shared animation loop types every printed field left to right when it changes, with a synthesized printer tick (off by default). Strips and bays are `src/components/kit/Strip.tsx`; the design system is in `DESIGN.md`.
- Dark (the night shift) is the default; the light day shift is a switch in the nav, footer and Settings, stored in this browser.
- Motion respects `prefers-reduced-motion`, and the footer and Settings both have a reduce-motion toggle.
