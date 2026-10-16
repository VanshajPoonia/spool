---
version: 1
slug: "src-app-page-tsx"
primary_target: "src/app/page.tsx"
related_targets: ["src/components/landing"]
---

Scope: the landing page (/). Visitor mode: Persuade.

Audience and job: open source contributors arriving cold, now that the repo is public. Within one viewport they should understand that Spool sorts their scattered GitHub threads by whose move it is, and either connect a token or open the sample board.

Proof: the hero is the app itself at full width, a three-pane Spool window (sidebar, bay, thread activity) playing a made-up contributor's day on a scrubbable clock; rows hand off between Your move and Their move and the activity pane follows the thread that moved. A mouse has to rest on a row for a second before the pane follows it, scrolling never moves it, and touch never hovers or scrubs by accident. Under the statement band, a product tour shows the app in use: the window pins and the scroll plays a pointer and the keys pressed over it, with five chapters whose Stripe-style bars fill as you scroll (sign on, triage, answer, stalls, plan). All demonstration data is labelled SAMPLE; programs and fresh repos are live and labelled LIVE. No users, metrics or logos exist and none are shown.

Direction: Linear-led, Stripe-paced, Cursor-framed (pinned by the user after a study of all three sites). Keeps the letter faces, the 3D airfield, retyping numerals with optional printer sound, and the typeable footer strip. Memorable moments: the headline rising out of a blur as the window lights up on its stage, the statement band's isometric plates drawing on and acting out their idea as you scroll (light winding onto the spool, a thread flying from their stack to yours and turning yellow, the silence slabs growing a day at a time and toppling like dominoes), the tour's pointer dragging a card into Working on, the row panel popping out to fill the screen while its cards walk sideways and the row builds part by part, a PR landing on MAIN, the stalled limit sliding down every silence meter.

Sequence (eight movements): hero (H1, lede, two pills, live next-deadline link, the window on a toned stage); statement band (one sentence, three live plates: one list, whose move, silence counted); the product in use (a scripted tour of the app on a dotted stage, chapters underneath); how a thread becomes a row (a pinned horizontal walk: the panel pops out full screen, the row builds at the top with lettered callouts, one card per part slides past with the evidence Spool reads, then the panel settles back; then each repo's record under its callsign); the field (3D airfield, phase rail, landed rack); stalled (limit slider); Beyond your threads, a raised chapter holding fresh repos (live), deadlines and Product Hunt (live) and Google Summer of Code (live); the close, a centred head, a route diagram (your browser, three lanes to api.github.com, the write lane closed, light running on the open lanes) and the token form; footer strip you can type on.

Constraints: native scroll; one authored entrance (the hero), one draw-on (the plates); everything after the hero moves with the scroll, not a clock (plates, tour, the row walk, the route's lights, the field's planes, the GSoC line), so it rewinds when scrolled back and holds when the page stops; the hero's sample day keeps its own clock because it is the first screen; reduced motion or the motion switch settles all of it at once and the sample day holds at a full moment; dark by default with a light option; the field is the only 3D and the only place planes appear.

Open: whether section heads after the field should vary their composition further (the reviewer noted the head template repeats).
