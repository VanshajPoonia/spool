# Spool roadmap

What's next for Spool, in build order. Tick an item when it ships, and add a line under it naming where it lives.

Ground rules every item has to keep:

- The token is optional. Without one, Spool runs as a guest on public data.
- The token stays in the browser and goes only to api.github.com. Nothing here needs a Spool server or an account.
- Spool stays read-only toward GitHub.
- Every number comes from a source. Sample data is labelled as sample data.
- Dates come from the program's own page or API. When there's no reliable source, show a link and "check the site", never a guessed date.

Reference points: Ossium (ossium.in), GitHub's own issue and PR dashboards, OSS Insight.

---

## Shipped in this round

### 1. GSoC organisation browser
Lives in `src/app/board/programs/gsoc`, `components/app/GsocView.tsx` and `getGsocBrowser()` in `lib/programs.ts`.

The Programs tab already lists organisations that match your interests (search, ideas link, capped at 40). This turns it into a full browser.

- [x] Its own page at `/board/programs/gsoc`, linked from the Programs tab
- [x] Every organisation, with no cap; "show more" paging
- [x] Filters: matches your interests, tech, topic, category, free-text search
- [x] Years in GSoC, counted from the program API's yearly organisation lists (2022 onward)
- [x] Richer cards: logo, tagline, tech, licence, and links to the ideas list, contributor guide, source code and chat
- [x] Save organisations to a list kept in this browser
- [x] The Programs tab keeps a short "best matches" list that links to the full browser

### 2. Watched issues
Lives in `lib/watch.ts` (status rules), `fetchWatched()` in `lib/github.ts`, `components/app/WatchPanel.tsx` (top of the Discover tab) and `meta.watch` in the store.

Watch any issue you might want to take, not just threads you're already in.

- [x] Watch from a pasted issue URL, or with one click on a good first issue in Discover
- [x] Status for each one: free, someone asked to take it, assigned, PR linked, or closed
- [x] A "someone asked to take it" check that reads comments for phrases like "can I work on this" and "assign me"
- [x] New comments since you last looked
- [x] Sample data for the sample board, labelled
- [x] Part of export, import and wipe

### 3. Alerts, without a server
Lives in `components/app/Alerts.tsx`, mounted in the app shell; the switch is under Settings, Board rules.

- [x] Count of threads waiting on you in the tab title, e.g. "(3) Board · Spool"
- [x] Optional browser notifications while Spool is open, when a thread becomes your move (off by default, switched on in Settings)

### 4. Guest mode: the token is optional
Lives in `GitHubOnly` and `ConnectPanel` (`components/app/ConnectPanel.tsx`), the guest calls in `lib/github.ts` (`fetchWatchedPublic`), `/api/first-issues` with `firstIssues()` in `lib/programs.ts`, and the usage and watch-cache stores in `lib/store.ts`.

- [x] Every tab opens without a token; Board and Repos show what a token adds, with "Browse as a guest" and sample data
- [x] Guest chip in the header with GitHub's hourly allowance left
- [x] Discover for guests: new repos and good first issues through Spool's server, cached for an hour, so they don't spend the guest's own allowance
- [x] Watched issues for guests, read from GitHub's public REST API (2 calls per issue), refused up front when the allowance can't cover a check
- [x] Watched-issue results kept in the browser and reused for 15 minutes as a guest (2 with a token), so a revisit costs nothing
- [x] Settings: a "GitHub usage" panel with each allowance GitHub reported, and "What Spool remembers" with counts of everything saved
- [x] Everything a guest saves stays when they connect a token later
- [x] Landing: "Browse as guest" in the nav, the hero and the connect section

### 5. Plan: a kanban of your open source work, with priorities
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

### 6. Homepage: a thread becomes a row as you scroll
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

### 7. Redesign: the flight strip bay
Chosen with impeccable's direction round (seed 04a12bd9) after "too dark and heavy, hard to scan, the theme overdone". Every thread is a printed strip in a black holder; bays say whose move it is. Landing and app share one world, documented in `DESIGN.md`.

- [x] New kit: `Strip` (callsign, title, last move, silence), `Bay` with designator plates, `Callsign`, grease-pencil `StateMark` and ring, strip-shaped actions
- [x] The print engine replaces the flap engine: fields retype left to right from one shared loop; condensed Martian Mono for anything printed, Archivo for anything read
- [x] Night shift by default, light day shift as an option (nav, footer, Settings), set before first paint
- [x] Hero: headline and actions beside a live sample bay that hands strips between Your move and Their move, one event at a time
- [x] "How a thread becomes a strip": one strip prints field by field as you scroll, then lands in the stalled bay
- [x] The sample day, stalled limit, callsigns, fresh repos, programs schedule and sign-on form rebuilt as bays and strips
- [x] App: the board's groups are bays of strips; pin, snooze, priority and open ride on the holder; pinned strips are cocked; new strips get a corner dot; every other screen moved to the new palette, print face and strip-shaped actions
- [x] The "delayed" status reads "stalled" everywhere

### 8. The field: every PR is a flight
A 3D airfield under the hero, so the strips have a world to stand for. Built with three.js, loaded only as the section comes near.

- [x] PRs fly under their repo's callsign and number, in low-poly planes folded from strip paper with the repo's livery on the tail; radar tags print their status
- [x] Review is a stacked hold; the bottom of the stack is cleared, flies an amber branch down to the runway called MAIN and lands: the merge. The branch folds back into main and the centreline flashes
- [x] "Clear #N to land" brings the next one in at once; a phase rail maps Holding, Cleared, Final, Landed to In review, Approved, Merge queue, Merged; landed strips slide into a Landed rack
- [x] A stalled PR circles alone with a pencil ring; drafts wait at the stand; new PRs arrive out of the haze
- [x] Night and day shifts, a closer camera on phones, pause, and a steppable still for reduced motion; without WebGL the deck still walks through a landing

### 9. Google Summer of Code, stop by stop
GSoC moved out of the Programs card into a section of its own, interactive and drawn by scroll.

- [x] The season on one line, on a true time scale: the line draws up to today as you scroll, passed stops fill in and print their dates as it reaches them, and the you-are-here marker drops on last
- [x] Every stop is pickable and shows below as a strip with its date and days to go or days ago; the next stop is picked by default
- [x] Small, Medium and Large place that project size's midterm, final week and completion on the line, and slide them when you switch
- [x] The ten most common tech tags are bars that grow on scroll; picking one filters this year's organisations, which you can also search by name, tech or topic, with links to each org's GSoC page and ideas list
- [x] Phones get a vertical line that draws downward; reduced motion shows it drawn

### 10. Restyle in the manner of Linear
Asked for "subtle colours, heavily inspired by the Linear website". The strip bay's paper and holders give way to a quiet dark workspace; every feature and all copy stay.

- [x] New tokens: near-black ground, grey surface steps, 1px rules, one indigo accent; status colours only as marks; Inter and Geist Mono; a light theme to match
- [x] Threads are rows with Linear-style status circles, IDs like QR-2417, kind dots on label pills and a red-tinted silence count once stalled; groups have a header band
- [x] Light primary buttons, outlined quiet ones, a translucent nav with the face chip and a Connect pill; section heads split title and lede with a hairline above
- [x] The hero's bay is an app window with a breadcrumb, a clock and an activity line, lit from behind; empty "0 days" boxes are gone
- [x] The stalled section is a view with a draggable limit in its toolbar and a silence meter on every row: the limit is a tick down the list and the bar past it turns red
- [x] The board app follows: unread dots on the left, quiet statuses, pinned rows washed in accent; the field's planes go neutral with kind-coloured tails

---

### Known limits of this round
- "Someone asked for it" skips comments from owners, members and collaborators, but GitHub reports org members whose membership is private as plain contributors. A maintainer writing "I'll take this" can still trip it.
- Notifications only fire while a Spool tab is open, because there's no server or service worker. Push to a closed browser would need a service worker plus a push service, which is a bigger decision.
- Years in GSoC go back only as far as the program API publishes org lists (2022 today).
- A guest's 60 calls an hour are per network, not per person: people behind one office or campus address share them.
- Without a `GITHUB_TOKEN` on the server, guest searches share GitHub's 10 searches a minute for the whole site. Results are cached for an hour, and a failed search isn't cached, but a busy cold start can show "rate-limiting, try again in a minute". Set `GITHUB_TOKEN` (no scopes needed) when deploying.
- Guest good first issues are sorted by activity before the 30-star filter, because sorting by age let one repo filing issues in bulk fill the list. Busy issues may already have someone asking for them; watch one to find out.
- Hacktoberfest's October count still needs a token for guests.
- The plan only sees what the board loads: a thread that drops off the board (say, merged more than 21 days ago) leaves the plan too, though its placement and priority stay saved.
- Watched-issue cards show what Discover last checked; the Plan tab never asks GitHub itself.

## Next

### Guest follow-ups
- [ ] October count for guests from a GitHub username (one public search, no token)
- [ ] Same "sort by activity" fix for the signed-in good first issue search

### Plan follow-ups
- [ ] Add a shortlisted repo or saved GSoC organisation to the plan as a card
- [ ] Due dates on your own tasks, feeding the deadline strip (item 8)
- [ ] Plan cards in Cmd+K (item 12)

### 11. Deadline reminders
- [ ] Follow programs (YC, each GSoC milestone, Hacktoberfest) in Settings
- [ ] A strip on the board when a followed deadline is within 14 days
- [ ] Browser notification at 7 days and 1 day, if notifications are on

### 12. Is this repo worth contributing to?
Signals on each discovered or shortlisted repo, read from public data:

- [ ] Median time for maintainers to answer an outside PR (last 20 merged or closed PRs from non-members)
- [ ] Last push
- [ ] Has a CONTRIBUTING file and a code of conduct
- [ ] Count of good first issues that are still unassigned
- [ ] Licence

### 13. More programs
Each one links to its own site, and shows dates only where that site publishes them in a form we can read reliably.

- [ ] Outreachy
- [ ] LFX Mentorship
- [ ] MLH Fellowship
- [ ] Google Season of Docs
- [ ] Summer of Bitcoin and other GSoC-style programs, if they publish dates

### 14. Your logbook
- [ ] Merged PRs over time, repos contributed to, first and latest contribution
- [ ] A streak measured in weeks, not days, so a quiet weekend doesn't break it
- [ ] A downloadable image card of your year

### 15. Jump anywhere (Cmd+K)
- [ ] Search threads, repos, saved orgs and pages from anywhere in the app
- [ ] Shortcut-key hints for the actions that already have keys

---

## Later, or only if it fits the rules

- **Saved board views:** named filters like "reviews only" or "quarry repos", kept locally.
- **Open source YC companies:** only with a reliable public source; nothing hand-maintained.
- **Bounties:** first check whether Algora or another platform has a stable public API.
- **GSoC past projects per organisation:** the program API's projects list is about 14 MB, so this needs a slimmer source or a server-side digest first.

## Not planned

- **Leaderboards, public profiles, a forum:** these need accounts and a server, which breaks "your token stays in this browser".
- **AI assistant:** not part of the basics.

---

## Done

- Landing redesign: page width capped at 1360px, one face (in the nav), carrier record, fresh-repo cards, countdown tickets (Oct 2026).
- Landing in motion, led by Stripe's pacing (Oct 2026): everything after the hero moves with the scroll and rewinds when scrolled back. The plates draw on and act out their idea; a pinned product tour plays a morning in the app with a pointer, keys and five chapter bars; "How a thread becomes a row" pops out full screen and walks one evidence card per part sideways while the row builds; the field's planes fly as the page scrolls; a route diagram in the close shows reads going out to api.github.com and the write lane closed. The hero's sample day keeps its own clock, waits a second of rest before following a hovered row, and ignores fingers that are only scrolling. Reduced motion pins nothing.
