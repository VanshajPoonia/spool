# Spool roadmap

What's next for Spool, in build order. Tick an item when it ships, and add a line under it naming where it lives.

Ground rules every item has to keep:

- The token is optional. Without one, Spool runs as a guest on public data.
- The token stays in the browser and goes only to api.github.com. Nothing here needs a Spool server or an account.
- Spool stays read-only toward GitHub.
- Every number comes from a source. Sample data is labelled as sample data.
- Dates come from the program's own page or API. When there's no reliable source, show a link and "check the site", never a guessed date.
- Keep it uncluttered. No new tabs: a new feature joins a place that exists, or stays hidden until it has something to show.

Reference points: Ossium (ossium.in), GitHub's own issue and PR dashboards, OSS Insight.

---

## Next

Planned 2026-11-16. First take things away, then make it fast and safe, then ready it for people who aren't the owner.

### Phase 8: Simplify
Lives in `components/app/nav.ts` and `SubNav.tsx` (the switch at the top of Find and Repos), `FilterMenu` in `BoardView.tsx`, `Today.tsx` with the lists from `Changes.tsx` and `ComingUp.tsx`, and the More programs and News panels in `ProgramsView.tsx`.

- [x] Eight tabs become six: Bay, Plan, Find (Discover and Following), Repos (with Orgs), Programs, Settings. Old addresses keep working, and Cmd+K still finds every page by name
- [x] The board's toolbar keeps search, Stalled and New; type and goal move into one Filter menu, which shows how many filters are on
- [x] One Today strip above the bays for Coming up and Since you last looked, down to a single line when you fold it (remembered with your display settings)
- [x] Programs: one News panel for program news and Product Hunt; More programs shows names until you open one

### Phase 9: Speed and safety
Lives in `fetchBoard()` in `lib/github.ts` (`onPartial` and `previous`), the "Still reading" line on the board, `tests/`, `tsconfig.test.json` and `.github/workflows/ci.yml`. The feed parsers moved to `lib/feeds.ts` so they can be tested.

- [x] The board paints each search as it lands, then fills in PR details and claims. On the owner's account the first threads show after about 4 seconds instead of 13. A returning visit keeps its saved board until the full one lands, and only full loads count for Since you last looked
- [x] Refreshes skip the detail lookups for threads that haven't changed, for up to 30 minutes: 3 requests instead of 6, and the detail step drops from about 3 seconds to none
- [x] Tests for the rules (classifier, changes, claims, follows, outsider report, deadlines, logbook, calendar file, feeds, claim phrases), built with the repo's own TypeScript and run with Node's test runner, so no new dependency; CI runs them with lint and typecheck on every push

### Phase 10: Ready for new users
Lives in `components/app/FirstRun.tsx`, the phone styles of `today.module.css` and `following.module.css`, the Search button in the phone bar (`AppShell.tsx`) and `FEEDBACK_URL` in `CommandPalette.tsx`.

- [x] A first-run tour on the board: three steps, closed for good with Got it or the X (remembered with your display settings)
- [x] Phone pass at 390px: no page scrolls sideways; Today's header fits one line with icon-only tools; follow rows sit in two lines; the phone bar has a Search button for Cmd+K
- [x] A feedback link that opens a new issue on the repo, in Settings and in Cmd+K

### Phase 11: The landing page catches up
Lives in `components/landing/Pickup.tsx` (the new section after Stalled), `Tour.tsx` (the toolbar, the first load and the first-run card), the News panel in `Programs.tsx`, `Phone.tsx` (the new section before the close), and the footer links, which now come from `NAV`. The first-run steps moved to `components/app/firstRunSteps.ts` and `FEEDBACK_URL` to `lib/site.ts`, so the landing shares them with the app.

- [x] "From a free issue to a merged PR": Follow, Check, Claim and Count beside a window drawn in the app's tab names. The follow's rule filters its issues, the outsider report switches between a repo outsiders land work in and one they don't, Claims show every state, and the logbook's bars read out on hover
- [x] The tour's fourth chapter is Catch up: two days later the Today strip lists what changed. The Plan chapter opens through Cmd+K
- [x] Old tab names gone: the hero's guest line says Find, and the footer lists the six tabs
- [x] The tour's bay has the one-row toolbar: Triage opens Filter and picks PRs, and Catch up turns on Stalled so only the quiet thread is left
- [x] Sign on paints the bay part by part with the Still reading line, and the first-run card shows with the first threads; the pointer clicks through its three steps
- [x] The Programs section has the app's News panel: program news and Product Hunt behind one switch
- [x] "The same bay on your phone": a phone drawn at 390 pixels with Today folded to a line, follows on two lines and Search in the top bar. Today folds and the search filters as you type. Send feedback sits under it

## Waiting on you

- **Launch:** decided 2026-11-18, Spool launches as your own project: your accounts, your byline, and spool.vanshajpoonia.com stays. The six launch posts moved in Postroom from the Spool brand to Personal, rewritten in first person (three for X, three for Instagram). The DEV post on keeping the token in the browser is in `docs/launch/dev-post.md` and the Product Hunt listing in `docs/launch/product-hunt.md`, both under your name. Launch day set on 2026-11-20: Thursday 26 November, with Product Hunt live at 1:31 PM IST. Product Hunt was scheduled for that day on 2026-11-21 (producthunt.com/posts/spool-5). The bracketed lines are filled from real counts (recount them that morning). spool.vanshajpoonia.com went into the Instagram bio links on 2026-11-21, and the captions write the address out too. On 2026-11-21 you said go. The X launch post goes out through Postroom's poster at 9 PM IST on 26 November and the X thread at 9 PM on 27 November, both with the Product Hunt link. The three Instagram posts are scheduled on Instagram itself for 9 PM on 26, 27 and 28 November. The DEV post waits until DEV is signed in again.
- **Page-view counts:** Vercel's analytics is cookieless and reports to Spool's own address, but it's a new dependency.

## After launch, only if users ask

Each lives in a place that already exists.

- **Saved board views:** named filters like "reviews only", inside the Filter menu.
- **Plan follow-ups:** a shortlisted repo or saved GSoC organisation as a plan card; due dates on your own tasks, feeding the Today strip.
- **A polite ping:** copy-ready text for a stalled thread, in its drawer. Template text, not AI; Spool still never posts.
- **Installable app:** a manifest and offline shell, and in Chrome a once-a-day background check that runs in the browser with the token already there. Switched on in Settings.
- **Maintainer mode:** a bay for new issues and PRs on your own repos and outsiders waiting on a first answer, shown only when you have some.
- **GitLab.com:** its public GraphQL API reads merge requests, approvals and pipelines without a login. Same board, switched on in Settings.

## Later, or only if it fits the rules

- **Bounties:** first check whether Algora or another platform has a stable public API.
- **GSoC past projects per organisation:** the program API's projects list is about 14 MB, so this needs a slimmer source or a server-side digest first.
- **A terminal companion:** something like `spool today` in a shell, reading the token `gh` already has.
- **A morning email, or push to a closed browser:** both need a server holding a token, which means accounts. A decision first, then a phase.

## Not planned

- **Leaderboards, public profiles, a forum:** these need accounts and a server, which breaks "your token stays in this browser".
- **AI assistant:** not part of the basics.

## Known limits
- "Someone asked for it" skips comments from owners, members and collaborators, but GitHub reports org members whose membership is private as plain contributors. A maintainer writing "I'll take this" can still trip it.
- Notifications only fire while a Spool tab is open, because there's no server or service worker. Push to a closed browser would need a service worker plus a push service, which is a bigger decision.
- Years in GSoC go back only as far as the program API publishes org lists (2022 today).
- A guest's 60 calls an hour are per network, not per person: people behind one office or campus address share them.
- Guest searches on the server use the `GITHUB_TOKEN` owner's GraphQL allowance, 5,000 points an hour at a point a search. Results are cached for an hour, and a failed search isn't cached. Without the token they fall back to REST search, where the whole site shares 10 searches a minute and a busy cold start can show "rate-limiting, try again in a minute".
- Good first issues, for guests and tokens alike, are sorted by activity before the 30-star filter, because sorting by age let one repo filing issues in bulk fill the list. Busy issues may already have someone asking for them; watch one to find out.
- A guest's October count sees public PRs only, and GitHub allows 10 searches a minute without a token, shared by everyone on the same network.
- The plan only sees what the board loads: a thread that drops off the board (say, merged more than 21 days ago) leaves the plan too, though its placement and priority stay saved.
- Watched-issue cards show what Discover last checked; the Plan tab never asks GitHub itself.
- Following needs a token. A guest could check one or two follows within GitHub's 10 searches a minute, which isn't worth the confusion yet.
- "Filed by maintainers" trusts GitHub's author association, so maintainers who hide their org membership look like outsiders and their issues drop out. Every new issue is the safer rule for such projects (Headlamp, for one).

---

## Done

### Phases 0 to 7, and what came between (2026-11-16)

Drawn up on 2026-11-16, partly from the owner's own open source setup: the `oss` CLI, its tracker app, its watcher and its playbook. Those run on a server with a token; Spool keeps every idea that works without one. Suggested order: 0, 1, 2, then 3 and 4.

#### Phase 0: Ship it
Started 2026-11-16. Details in the README under Deploy.

- [x] Deploy on Vercel: project `spool`, connected to the repo, so `main` deploys production
- [x] `GITHUB_TOKEN` (no scopes) on the server since 2026-11-21. Guest searches go through GraphQL with it, because REST search hit GitHub's secondary limit after about 8 quick calls
- [x] spool.vanshajpoonia.com: a DNS-only CNAME in Cloudflare to the Vercel project, live since 2026-11-16, and set as the repo's homepage
- [x] Open Graph and Twitter metadata, with a generated share card (`app/opengraph-image.tsx`)
- [x] A content security policy whose `connect-src` allows only Spool itself and api.github.com, so the browser enforces "your token goes only to GitHub"
- [x] robots.txt and a sitemap for the landing page

#### Phase 1: Sharper reasons on the board
From the tracker's board sweep. The PR signals live in `addPrDetail()` in `lib/github.ts` (a lookup by id after the searches, since adding them to the search made GitHub time out), `prSignals()` in `lib/classify.ts` and the facts in `ThreadDetail.tsx`.

- [x] Merge conflicts: your move, it needs a rebase
- [x] Unresolved review threads, counted in the detail drawer; threads on current code where someone else spoke last make it your move
- [x] A bot review with comments after your last push (CodeRabbit and the like) is your move; other bot noise stays ignored
- [x] A failing CLA or DCO check says so, with a link to sign; other failing checks are named
- [x] Checks waiting for a maintainer to approve the run are their move, not yours ("CI on hold")
- [x] CLA Assistant's comments no longer count as a person having the last word
- [x] GitHub Discussions you started, commented on or were mentioned in: a third kind of thread with its own label, filter, plan card and timeline. Lives in the `discussions` search and `fromDiscussion()` in `lib/github.ts`

#### Phase 2: Since you last looked
The watcher's inbox, without a server: compare the saved board with a fresh load. Lives in `lib/changes.ts`, `recordBoard()` and `changesStore` in `lib/store.ts`, `components/app/Changes.tsx` and `Alerts.tsx`.

- [x] What changed since your last visit: new replies, merges, closes, CI turning red or green, new statuses (review requests, conflicts, approvals and the rest), threads that arrived or left
- [x] Mark items handled, one at a time or all at once, and they fold away
- [x] Browser notifications, when on, come from the same list
- [x] The sample board has an invented list that lasts only for the page

#### Phase 3: Claims
From the tracker's claimed and in-progress cards and its claim check. Lives in `addIssueDetail()` in `lib/github.ts`, `claimOf()` in `lib/classify.ts`, `ASKS` in `lib/watch.ts` and the Claims bay in `BoardView.tsx`.

- [x] Issues you asked to take, found from your own "can I work on this" comments, in a group of their own. The phrases now also catch "claim", "can I please" and bot commands like `@openwisp-companion assign`, and "are you still working on this?" no longer counts as your claim
- [x] Waiting for assignment, with the days counted; a reply after your ask makes it your move
- [x] Assigned with no PR yet, with a warning from day 10 (Layer5 unassigns after two weeks idle)
- [x] A loud row when someone else is assigned, or opens a PR that references your issue
- [x] Claims feed the plan: Inbox until assigned, then Working on
- [x] An issue your own PR links to drops out of claims and is just watched

#### Phase 4: Follow repos, orgs and maintainers
From the watch rules in `repos.tsv`, the free-issue scan and the tracker's Skipped list. Lives in `lib/follow.ts`, `fetchFollowing()` and `resolveFollowTarget()` in `lib/github.ts`, `meta.follows` and `meta.skipped` in the store, and `components/app/FollowingView.tsx` (the Following tab).

- [x] Follow a repo or an org with a rule: issues with chosen labels, issues filed by maintainers, or every new issue
- [x] Follow a maintainer: new issues they file anywhere
- [x] A free-issue scan of anything you follow: any age, any label, no assignee, no linked PR, no claim comment in the last 21 days
- [x] Skip an issue with a reason, so it never comes back (and bring it back from the Skipped list)
- [x] One person filing the same issue in many repos shows once, as "(+N repos)"
- [x] Checks run only while Spool is open and stay inside GitHub's search allowance: 20 follows at most, eight searches to a request, results reused for 15 minutes
- [x] New since you last marked them seen, counted per follow; Watch sends an issue to Discover's watched list

#### Phase 5: Can an outsider land work here?
From the playbook's per-org table. Replaces "Is this repo worth contributing to?". Read from public data, for any repo you discover, shortlist or follow.

Lives in `lib/outsider.ts`, `fetchRepoCheck()` in `lib/github.ts`, `components/app/RepoCheck.tsx` (top of every repo page) and the `orgPrLimit` setting.

- [x] Outside PRs merged in the last 90 days, from how many people, and the median time to a first answer on outside PRs (last 20 merged or closed). Members who hide their membership look like outsiders, so this says so, and PRs titled with an internal ticket like [WEB-123] count as staff
- [x] How to take an issue: workflows named for assigning, and what CONTRIBUTING says about assignment
- [x] CLA or DCO required, read from the checks on recent PRs
- [x] An AI policy, if the repo has one (AI_POLICY.md, or AI lines in CONTRIBUTING)
- [x] Last push, CONTRIBUTING and code of conduct present, licence, unassigned good first issues
- [x] Your open PRs per org against a limit you set (3 by default), on the repo page and in the board's summary
- [x] Linked from Discover's repos and shortlist and from repo follows

#### Phase 6: Goals and orgs
From the tracker's orgs and its separate Jobs and Open Source boards. Takes in "Deadline reminders". Lives in `lib/orgs.ts`, `lib/deadlines.ts`, `components/app/OrgsView.tsx` (the Orgs tab), `ComingUp.tsx`, `useDeadlines.ts` and the deadline part of `Alerts.tsx`.

- [x] An Orgs page for the places you're investing in: goal (job, GSoC, a program, or for fun), status (active, waiting, watching, later, on hold), next step, next date, notes and links, with counts from the board and suggestions from it
- [x] Filter the board and the plan by goal (the plan fades other cards, so dragging keeps their places)
- [x] Follow programs (YC, each GSoC milestone, Hacktoberfest) in Settings
- [x] A strip on the board when a followed deadline or an org's next date is within 14 days
- [x] Browser notification at 7 days and 1 day, if notifications are on, once each

#### Phase 7: More programs, with their news
Takes in "More programs". Each one links to its own site, and shows dates only where that site publishes them in a form we can read reliably. Lives in `lib/catalog.ts`, `getLfxTerms()` and `getProgramNews()` in `lib/programs.ts`, `lib/ics.ts`, and the More programs and Program news panels on the Programs tab.

- [x] Outreachy, LFX Mentorship (terms from the timeline tables in `cncf/mentoring`), MLH Fellowship, Google Season of Docs, Summer of Bitcoin, C4GT, GSSoC, KWoC and SWoC. Only LFX publishes dates Spool can read; the rest say "check the site"
- [x] LFX proposals, applications and term starts can be followed like the other deadlines
- [x] New posts from program blogs as news: the Google Open Source blog's GSoC and Season of Docs posts, Outreachy, CNCF mentorship, Summer of Bitcoin
- [x] Download an `.ics` calendar of the deadlines you follow, built in the browser

#### Past participants (2026-11-16)
Asked for while GSoC 2026 has ended and YC's deadline has passed: who took part before.

- [x] GSoC organisations from earlier years that aren't in the latest program, with the last year each took part and how many years, in the GSoC browser's "Earlier years" view; linked from Programs
- [x] YC's open source companies from past batches, from YC's directory via the yc-oss API (rebuilt daily), at `/board/programs/yc` with hiring, active and tag filters; the newest five on Programs

#### Between phases: your logbook
Lives in `lib/logbook.ts`, `fetchLogPrs()` in `lib/github.ts` and `components/app/Logbook.tsx`, at the top of the Repos tab. PRs on your own repos are left out; GitHub's search returns your newest 500 at most, kept six hours.

- [x] Merged PRs over time (per month, last two years, with a readout per bar and a table for screen readers), repos contributed to, first and latest contribution
- [x] A streak measured in weeks, not days, so a quiet weekend doesn't break it: a week counts when you open or land a PR, and this week only breaks the streak once it's over
- [x] A downloadable image card of your year, drawn on a canvas so the preview is the PNG

#### Between phases: jump anywhere (Cmd+K)
Lives in `components/app/CommandPalette.tsx`, mounted in the app shell; threads open through `/board#thread=<id>`.

- [x] Search threads, repos, saved orgs and pages from anywhere in the app, plus your orgs, follows and own plan tasks
- [x] Shortcut-key hints for the actions that already have keys

### Follow-ups

#### Guest follow-ups
Lives in `fetchOctoberPublic()` and `parseLogin()` in `lib/github.ts`, the guest form in `components/app/ProgramsView.tsx`, `guestLogin` in the settings store, and `pickFirstIssues()` in `lib/first-issues.ts`.

- [x] October count for guests from a GitHub username (one public search, no token). The name is kept in this browser and counted again on the next visit
- [x] Same "sort by activity" fix for the signed-in good first issue search. Both searches now share one picker: 30+ stars, two issues per repo at most

#### Plan follow-ups
- [x] Plan cards in Cmd+K: your own tasks are searchable, and threads and watched issues come up as threads

### The first round (October 2026)

#### 1. GSoC organisation browser
Lives in `src/app/board/programs/gsoc`, `components/app/GsocView.tsx` and `getGsocBrowser()` in `lib/programs.ts`.

The Programs tab already lists organisations that match your interests (search, ideas link, capped at 40). This turns it into a full browser.

- [x] Its own page at `/board/programs/gsoc`, linked from the Programs tab
- [x] Every organisation, with no cap; "show more" paging
- [x] Filters: matches your interests, tech, topic, category, free-text search
- [x] Years in GSoC, counted from the program API's yearly organisation lists (2022 onward)
- [x] Richer cards: logo, tagline, tech, licence, and links to the ideas list, contributor guide, source code and chat
- [x] Save organisations to a list kept in this browser
- [x] The Programs tab keeps a short "best matches" list that links to the full browser

#### 2. Watched issues
Lives in `lib/watch.ts` (status rules), `fetchWatched()` in `lib/github.ts`, `components/app/WatchPanel.tsx` (top of the Discover tab) and `meta.watch` in the store.

Watch any issue you might want to take, not just threads you're already in.

- [x] Watch from a pasted issue URL, or with one click on a good first issue in Discover
- [x] Status for each one: free, someone asked to take it, assigned, PR linked, or closed
- [x] A "someone asked to take it" check that reads comments for phrases like "can I work on this" and "assign me"
- [x] New comments since you last looked
- [x] Sample data for the sample board, labelled
- [x] Part of export, import and wipe

#### 3. Alerts, without a server
Lives in `components/app/Alerts.tsx`, mounted in the app shell; the switch is under Settings, Board rules.

- [x] Count of threads waiting on you in the tab title, e.g. "(3) Board · Spool"
- [x] Optional browser notifications while Spool is open, when a thread becomes your move (off by default, switched on in Settings)

#### 4. Guest mode: the token is optional
Lives in `GitHubOnly` and `ConnectPanel` (`components/app/ConnectPanel.tsx`), the guest calls in `lib/github.ts` (`fetchWatchedPublic`), `/api/first-issues` with `firstIssues()` in `lib/programs.ts`, and the usage and watch-cache stores in `lib/store.ts`.

- [x] Every tab opens without a token; Board and Repos show what a token adds, with "Browse as a guest" and sample data
- [x] Guest chip in the header with GitHub's hourly allowance left
- [x] Discover for guests: new repos and good first issues through Spool's server, cached for an hour, so they don't spend the guest's own allowance
- [x] Watched issues for guests, read from GitHub's public REST API (2 calls per issue), refused up front when the allowance can't cover a check
- [x] Watched-issue results kept in the browser and reused for 15 minutes as a guest (2 with a token), so a revisit costs nothing
- [x] Settings: a "GitHub usage" panel with each allowance GitHub reported, and "What Spool remembers" with counts of everything saved
- [x] Everything a guest saves stays when they connect a token later
- [x] Landing: "Browse as guest" in the nav, the hero and the connect section

#### 5. Plan: a kanban of your open source work, with priorities
Lives in `lib/plan.ts` (cards, columns, suggestion), the plan store in `lib/store.ts`, `components/app/PlanView.tsx` (the Plan tab) and `components/app/Priority.tsx`. Dragging uses dnd-kit (`@dnd-kit/core` and `@dnd-kit/sortable`, MIT), chosen over ready-made kanban components (react-trello, @caldwell619/react-kanban) because those are stale and bring their own look, and over @hello-pangea/dnd because it pulls in Redux.

- [x] A Plan tab with five columns: Inbox, Up next, Working on, Waiting, Done
- [x] Cards from your open PRs and issues on the board, issues you watch, and tasks you write yourself (with an optional link)
- [x] Cards you haven't placed follow GitHub: your move goes to Inbox, their move to Waiting; merged and closed work moves to Done on its own
- [x] Drag with a mouse or a long press; arrow keys on a card's grip; or "Move to" in the card's menu
- [x] Priority P1, P2, P3 on any card, and on every board row and the thread drawer; keys 1, 2, 3 and 0 on the board
- [x] The board sorts by pin, then priority, then each group's own order
- [x] "Work on next": finish what's in Working on, then the most important card in Up next
- [x] Sort by priority, Clear done, take cards off the plan and bring them back
- [x] Works for guests (watched issues and tasks), with no GitHub calls of its own; sample board has a sample plan that lasts only for the page
- [x] Part of export, import, wipe and "What Spool remembers"

#### 6. Homepage: a thread becomes a row as you scroll
Replaced by the redesign in item 7; kept here as the record of what shipped then. Lived in `components/landing/BuildRow.tsx` and `build.module.css`, with `SignSway.tsx` and the hero light in `Hero.tsx`. Inspired by the scroll-built cabinet on virostl.vercel.app; Spool's version builds one row of its own departures board, with no 3D library (CSS 3D boxes driven by scroll).

- [x] "How a thread becomes a row": the parts of one sample row lie flat on a sign-yellow mat and lift into place in five steps, one for each thing Spool works out (thread, carrier, title, who moves next, status)
- [x] Each flap tile clatters to its letter as it lands, through the real flap engine (with sound when it's on)
- [x] A lettered parts list follows the build; click a letter to glide to that step. The camera circles while the row goes together and leans in at the end
- [x] Reduced motion, or the motion switch, shows the finished row with every step written out and no pinned scroll
- [x] Section signs swing on their rods when the page scrolls fast, then settle
- [x] The hero's painted housing catches a soft light under the mouse
- [x] "How it works" in the nav now opens the build
- [x] Smooth scrolling: native scroll in place of Lenis; idle flap tiles no longer hold GPU layers (about 3,460 layers down to about 300); sections stop re-rendering when the nav face changes; the sample day's rows re-render only when they change; the build's 3D scene is skipped while off screen
- [x] The hero sits side by side: what Spool does and both actions on the left, the WHO MOVES / NEXT? board on the right, in a band that takes only the height it needs; they stack on narrow screens
- [x] The hero leads with a headline that says what Spool is ("The open source manager that knows whose move it is."), then what it tracks: PRs, issues, review requests and mentions

#### 7. Redesign: the flight strip bay
Chosen with impeccable's direction round (seed 04a12bd9) after "too dark and heavy, hard to scan, the theme overdone". Every thread is a printed strip in a black holder; bays say whose move it is. Landing and app share one world, documented in `DESIGN.md`.

- [x] New kit: `Strip` (callsign, title, last move, silence), `Bay` with designator plates, `Callsign`, grease-pencil `StateMark` and ring, strip-shaped actions
- [x] The print engine replaces the flap engine: fields retype left to right from one shared loop; condensed Martian Mono for anything printed, Archivo for anything read
- [x] Night shift by default, light day shift as an option (nav, footer, Settings), set before first paint
- [x] Hero: headline and actions beside a live sample bay that hands strips between Your move and Their move, one event at a time
- [x] "How a thread becomes a strip": one strip prints field by field as you scroll, then lands in the stalled bay
- [x] The sample day, stalled limit, callsigns, fresh repos, programs schedule and sign-on form rebuilt as bays and strips
- [x] App: the board's groups are bays of strips; pin, snooze, priority and open ride on the holder; pinned strips are cocked; new strips get a corner dot; every other screen moved to the new palette, print face and strip-shaped actions
- [x] The "delayed" status reads "stalled" everywhere

#### 8. The field: every PR is a flight
A 3D airfield under the hero, so the strips have a world to stand for. Built with three.js, loaded only as the section comes near.

- [x] PRs fly under their repo's callsign and number, in low-poly planes folded from strip paper with the repo's livery on the tail; radar tags print their status
- [x] Review is a stacked hold; the bottom of the stack is cleared, flies an amber branch down to the runway called MAIN and lands: the merge. The branch folds back into main and the centreline flashes
- [x] "Clear #N to land" brings the next one in at once; a phase rail maps Holding, Cleared, Final, Landed to In review, Approved, Merge queue, Merged; landed strips slide into a Landed rack
- [x] A stalled PR circles alone with a pencil ring; drafts wait at the stand; new PRs arrive out of the haze
- [x] Night and day shifts, a closer camera on phones, pause, and a steppable still for reduced motion; without WebGL the deck still walks through a landing

#### 9. Google Summer of Code, stop by stop
GSoC moved out of the Programs card into a section of its own, interactive and drawn by scroll.

- [x] The season on one line, on a true time scale: the line draws up to today as you scroll, passed stops fill in and print their dates as it reaches them, and the you-are-here marker drops on last
- [x] Every stop is pickable and shows below as a strip with its date and days to go or days ago; the next stop is picked by default
- [x] Small, Medium and Large place that project size's midterm, final week and completion on the line, and slide them when you switch
- [x] The ten most common tech tags are bars that grow on scroll; picking one filters this year's organisations, which you can also search by name, tech or topic, with links to each org's GSoC page and ideas list
- [x] Phones get a vertical line that draws downward; reduced motion shows it drawn

#### 10. Restyle in the manner of Linear
Asked for "subtle colours, heavily inspired by the Linear website". The strip bay's paper and holders give way to a quiet dark workspace; every feature and all copy stay.

- [x] New tokens: near-black ground, grey surface steps, 1px rules, one indigo accent; status colours only as marks; Inter and Geist Mono; a light theme to match
- [x] Threads are rows with Linear-style status circles, IDs like QR-2417, kind dots on label pills and a red-tinted silence count once stalled; groups have a header band
- [x] Light primary buttons, outlined quiet ones, a translucent nav with the face chip and a Connect pill; section heads split title and lede with a hairline above
- [x] The hero's bay is an app window with a breadcrumb, a clock and an activity line, lit from behind; empty "0 days" boxes are gone
- [x] The stalled section is a view with a draggable limit in its toolbar and a silence meter on every row: the limit is a tick down the list and the bar past it turns red
- [x] The board app follows: unread dots on the left, quiet statuses, pinned rows washed in accent; the field's planes go neutral with kind-coloured tails

---

### Landing

- Landing redesign: page width capped at 1360px, one face (in the nav), carrier record, fresh-repo cards, countdown tickets (Oct 2026).
- Landing in motion, led by Stripe's pacing (Oct 2026): everything after the hero moves with the scroll and rewinds when scrolled back. The plates draw on and act out their idea; a pinned product tour plays a morning in the app with a pointer, keys and five chapter bars; "How a thread becomes a row" pops out full screen and walks one evidence card per part sideways while the row builds; the field's planes fly as the page scrolls; a route diagram in the close shows reads going out to api.github.com and the write lane closed. The hero's sample day keeps its own clock, waits a second of rest before following a hovered row, and ignores fingers that are only scrolling. Reduced motion pins nothing.
