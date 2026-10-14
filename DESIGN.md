---
name: Spool
description: A flight strip bay for a contributor's open source threads, sorted by whose move it is.
colors:
  console: "#14181d"
  bay: "#1a1f26"
  bay-2: "#212831"
  bay-3: "#2a323c"
  rule: "#2b333d"
  rule-2: "#3b4551"
  ink: "#eef1f3"
  ink-2: "#b3bcc6"
  ink-3: "#8b96a2"
  holder: "#0c0f12"
  holder-lip: "#303843"
  holder-ink: "#c3ccd5"
  strip-pr: "#f1dfa6"
  strip-issue: "#b6d3f0"
  strip-review: "#f3c1cd"
  strip-talk: "#c5e5c4"
  strip-plain: "#e6eaee"
  strip-ink: "#15181c"
  strip-ink-2: "#45474a"
  move: "#ffb21e"
  move-ink: "#1d1404"
  pencil: "#d0352a"
  alert: "#ff7c6d"
  landed: "#6fd59a"
  console-day: "#e3e7eb"
  bay-day: "#f3f5f7"
  ink-day: "#13171c"
  ink-2-day: "#434d58"
  ink-3-day: "#5a6571"
  holder-day: "#283039"
typography:
  display:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(38px, 4.4vw, 66px)"
    fontWeight: 760
    lineHeight: 1.02
    letterSpacing: "-0.02em"
    fontVariation: "'wdth' 90"
  headline:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(30px, 3.5vw, 52px)"
    fontWeight: 760
    lineHeight: 1.04
    letterSpacing: "-0.018em"
    fontVariation: "'wdth' 90"
  title:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.006em"
  body:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "0.12em"
    fontVariation: "'wdth' 78"
  print:
    fontFamily: "Martian Mono, ui-monospace, monospace"
    fontSize: "13px"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "0.06em"
    fontVariation: "'wdth' 78"
rounded:
  strip: "3px"
  control: "4px"
  holder: "5px"
  bay: "8px"
  panel: "12px"
spacing:
  rack: "6px"
  bay: "12px"
  panel: "clamp(14px, 1.6vw, 22px)"
  gutter: "clamp(20px, 4vw, 64px)"
  section: "clamp(96px, 11vw, 168px)"
  page: "1320px"
components:
  strip-pr:
    backgroundColor: "{colors.strip-pr}"
    textColor: "{colors.strip-ink}"
    typography: "{typography.title}"
    rounded: "{rounded.strip}"
    height: "50px"
  strip-issue:
    backgroundColor: "{colors.strip-issue}"
    textColor: "{colors.strip-ink}"
    rounded: "{rounded.strip}"
    height: "50px"
  strip-review:
    backgroundColor: "{colors.strip-review}"
    textColor: "{colors.strip-ink}"
    rounded: "{rounded.strip}"
    height: "50px"
  holder:
    backgroundColor: "{colors.holder}"
    rounded: "{rounded.holder}"
    padding: "3px 3px 3px 9px"
  strip-link-primary:
    backgroundColor: "{colors.strip-pr}"
    textColor: "{colors.strip-ink}"
    rounded: "{rounded.strip}"
    height: "52px"
    padding: "0 8px 0 18px"
  strip-link-quiet:
    textColor: "{colors.ink}"
    rounded: "{rounded.holder}"
    height: "58px"
  bay-plate-you:
    backgroundColor: "{colors.move}"
    textColor: "{colors.move-ink}"
    typography: "{typography.label}"
    rounded: "3px"
    padding: "4px 9px 3px"
  bay-plate-stalled:
    backgroundColor: "{colors.pencil}"
    textColor: "#ffffff"
    typography: "{typography.label}"
    rounded: "3px"
    padding: "4px 9px 3px"
  callsign:
    textColor: "{colors.ink}"
    typography: "{typography.print}"
    rounded: "3px"
    height: "1.9em"
    padding: "0 0.45em"
---

# Design System: Spool

## Overview

**Creative North Star: "The Flight Strip Bay"**

Spool is the bay an air traffic controller works from. Every open thread a contributor has on GitHub is a printed paper strip in a black plastic holder, and the strips sit in bays that answer one question: whose move is it. When the move passes, the strip slides out of one bay and into the other. The paper's colour says what kind of thread it carries, the holder's tab says its state, and the last box on every strip counts the days of silence, ringed in red grease pencil once it stalls.

The register is a working console, not a costume. The ground is a flat blue-grey night console with no texture, screws or gradients; the strips are the bright things on it, so the eye goes to the work and the room recedes. Type splits into two voices: Archivo for everything a person reads or acts on, and condensed Martian Mono for everything the strip printer sets (callsigns, numbers, times, statuses, counts, the faces). Motion is physical and sparse: strips slide between bays, fields print left to right, pencil marks draw on once. The night shift is the default; a day shift (light) is one switch away and keeps the same strips and holders.

Letter-built faces, (^_^) and its family, are the one signature carried over from the earlier world. They are printed by the strip printer in a holder, react to the pointer and to each section, and live in the nav, the app header and the hero's position panel.

One scene is allowed to show the airfield the strips stand for. Directly under the hero, **the field** renders a small 3D airfield where every PR is a flight under its repo's callsign and its own number: PRs in review circle in a stacked hold, clearance draws an amber branch from the plane down to the runway called MAIN, and the touchdown is the merge. The branch then folds back into main and the strip below prints MERGED. The planes are folded from strip paper (buff, pink, plain) with the repo's livery on the tail, so the field reads as the bay's world made solid, not as a new costume.

Confirmed rejections: the dark dev-tool hero with a lit dashboard screenshot, the bento grid of feature cards, and the airport costume of the previous world (screws, bezels, hanging sign plates, departure-board signage, plane pictograms in UI chrome).

**Key Characteristics:**
- Paper strips in black holders, coloured by thread kind, read left to right: callsign, title, last move, silence.
- Bays with a designator plate; amber lights only the bay that is your move.
- Red grease pencil marks silence past the limit: a ring round the count and a red holder tab.
- Flat blue-grey console in two shifts, night by default.
- Condensed Martian Mono for anything printed; Archivo for anything read.
- Strips slide between bays; fields print in; nothing else animates by default, except the one 3D field where PRs fly and a merge lands.

## Colors

A flat console palette with a full set of paper colours on top: neutrals own the room, the strips carry the colour, amber means "your move" and red pencil means "stalled".

### Primary
- **Move Amber** (move): the one bright signal on the console. The "Your move" bay plate, the count of threads on you (the Bay tab badge), the "new since you looked" dot, the you-are-here marker on a timeline, focus rings and text selection on the night shift. Never a fill for buttons or panels.
- **Move Ink** (move-ink): text set on Move Amber.

### Secondary
- **PR Buff** (strip-pr): a pull request strip, and the paper of every primary action (Connect GitHub, Check token and sign on, Open on GitHub).
- **Issue Blue** (strip-issue): an issue strip, and the active step letters in "How it works".
- **Review Pink** (strip-review): a review asked of you.
- **Talk Green** (strip-talk): a thread you only comment on (Watching).
- **Plain Paper** (strip-plain): schedule strips, repo strips, picked chips, the token input, the current tab.
- **Strip Ink / Strip Ink 2** (strip-ink, strip-ink-2): print and secondary text on any paper. Strip Ink 2 holds at least 5:1 on every paper colour.

### Tertiary
- **Grease Pencil** (pencil): stalled. The ring round a silence count past the limit, the stalled holder tab, the Stalled bay plate, a struck-through closed title.
- **Alert Coral** (alert): problem text and the cross mark on the console (CI failed, changes requested, a refused token).
- **Landed Green** (landed): merged or approved; the tick mark, the done holder tab, live-source dots.

### Neutral
- **Console** (console): the page and app canvas. Day shift: console-day.
- **Bay / Bay 2 / Bay 3** (bay, bay-2, bay-3): bays and panels, raised controls, hover fills. Day shift: bay-day and lighter steps.
- **Rule / Rule 2** (rule, rule-2): hairlines, inset control outlines, quiet button frames.
- **Ink / Ink 2 / Ink 3** (ink, ink-2, ink-3): text on the console; ledes and hints; meta and timestamps. Ink 3 holds at least 4.5:1 on console and bay in both shifts.
- **Holder / Holder Lip / Holder Ink** (holder, holder-lip, holder-ink): the black plastic every strip, face and wordmark sits in, its top lip highlight, and the controls that ride on it. The holder stays dark in the day shift (holder-day).

### Named Rules
**The Paper Carries The Colour Rule.** Saturated colour lives on strips, not on the room. Panels, bays and the console stay neutral in both shifts; if a surface that is not a strip, a plate or a mark turns colourful, it is wrong.

**The One Amber Rule.** Amber means the move is yours, or where you are. It never fills a button, a card or a panel. On the field it marks only the flight being brought in: its data block and its branch. Taxi lines, the tower and the hold stay neutral.

**The Pencil Means Stalled Rule.** Red pencil appears only for silence past the limit and for closed-and-struck. Errors use Alert Coral text, not pencil.

## Typography

**Body Font:** Archivo (variable, with a width axis), falling back to system-ui
**Print Font:** Martian Mono (variable, run at width 78), falling back to ui-monospace

**Character:** Archivo is a sturdy grotesque that can tighten into a technical headline (width 90) or a condensed designator (width 78); Martian Mono run condensed reads like a thermal strip printer and keeps its punctuation centred, so times and decimals print cleanly (08:00, 4.2d, api.github.com).

### Hierarchy
- **Display** (760, clamp(38px, 4.4vw, 66px), 1.02, width 90): the landing H1 only, 15ch measure.
- **Headline** (760, clamp(30px, 3.5vw, 52px), 1.04, width 90): section H2s and app page titles.
- **Title** (600, 15px; 14px small strips; 17px large; up to 26px on the printed hero strip): strip titles, panel and record headings.
- **Body** (400, 16px, 1.5): app copy; landing ledes run 17 to 19px in Ink 2 at a 64ch measure.
- **Label** (800, 13px, 0.12em, uppercase, width 78): bay designator plates; 10px at 0.12em for the kind label and box units on a strip.
- **Print** (Martian Mono 700, 13px, width 78): callsigns, numbers, ages, times, statuses, counts, printed tags (SAMPLE DATA, LIVE) and the faces. Sizes run from 11px tags to 40px callsigns at reading distance.

### Named Rules
**The Printer Sets Data Rule.** Martian Mono is for what the strip printer would print: codes, numbers, times, statuses, counts and faces. Prose, buttons and headings are Archivo.

**The Pin The Width Rule.** Every element set in the print font also sets the width axis (`font-variation-settings: var(--print-wdth)`); width is not inherited from the family.

## Layout

The landing is a single column of sections on the console, held to a 1320px measure (`spacing.page`) centred on wide screens with a fluid gutter (`spacing.gutter`), each opening with generous space above (`spacing.section`). Section heads are an H2 and a lede, nothing above the heading. The hero is a band, not a full screen: copy on the left (0.86fr), a live console panel on the right (1.14fr) with the sample position's bays stacked; it stacks below 1080px. "How it works" pins a stage for 340vh (300vh on phones) with the steps on the left and the printer on the right; with motion off it is static.

The field sits between the hero and "How it works": full bleed, 46vw tall (clamped 420 to 720px; 124vw on phones), masked to transparent on every edge so the airfield dissolves into the console. Its deck (the four-phase rail, the strip being landed with its action, and the Landed rack) is a panel that overlaps the scene's bottom fade by up to 36px. Portrait screens get a steeper, closer camera that crops the ends of the field.

Programs is the schedule bay beside the Product Hunt list. Google Summer of Code follows as its own section: a season panel (phase, project-size switch, the route, the picked stop as a strip) above an explorer (tech bars on the left, a searchable rack of org strips on the right); the explorer stacks under 980px.

Bays stack their strips in a rack with a 6px gap (`spacing.rack`) inside 12px of bay padding. On the app board, Your move and Their move sit side by side above 1180px and stack below; Watching, Snoozed and Landed run full width underneath. Strips are container queries: under 540px of holder width the last-move box folds away, the callsign box shrinks to its print, and titles wrap to two lines. Bay hints drop under 460px of bay width.

## Elevation & Depth

Flat by default. Depth comes from the holder, not from shadows: every strip, face, wordmark and primary action sits inside a black holder, drawn as padding or a solid spread ring (`0 0 0 3px` to `4px` of holder) with a 1px lip highlight on top. The only blurred shadows are the hero's console panel (`0 30px 60px -36px`, a long soft drop), menus (`0 18px 40px`) and a strip in flight between bays, which lifts with `0 18px 30px -12px` for the middle of its slide.

The field is the one exception: a scene, not UI. It has a sun, a sky light and real cast shadows, because a plane's shadow on the ground is what tells you how high it is. Its ground is invisible except for those shadows and a fogged grid, so the scene never paints a box on the console.

### Named Rules
**The Holder Is The Depth Rule.** Lift a thing by putting it in a holder, never by floating it on a shadow. No glows, no zero-offset coloured halos. The field's light and shadow stay inside the field.

## Shapes

Small, square-shouldered corners: 3px on paper (`rounded.strip`), 4px on controls, 5px on holders, 8px on bays, 12px on panels and the console. Strips are long horizontal rectangles split into boxes by printed 1px hairlines (strip-rule) in a fixed order. State shows as a 4px tab inside the holder's left edge (amber your move, red stalled, green done, holder-lip theirs). Marks are hand-drawn SVG strokes with round caps: tick, ring, cross, dash.

## Components

### Strip (signature)
- **Anatomy:** callsign and number box (print), body box (title and a note line), last-move box (who, age in print), any extra box (status, stars, days left), silence box (whole days, unit label). Boxes split by hairlines.
- **Paper:** PR Buff, Issue Blue, Review Pink, Talk Green or Plain Paper by kind; the kind label prints under the callsign, with "· SAMPLE" on synthetic data.
- **Holder:** black, 3px around the paper, 9px on the left for the state tab.
- **States:** hover slides the paper 4px along its holder; selected rings the holder in amber; dimmed strips drop to 0.6; new strips get an amber dot on the holder's corner; pinned strips are cocked, pushed 14px along the holder the way a controller flags one; a closed title is struck in red pencil.
- **Controls:** pin, snooze, priority and open ride on the holder's right end, sliding in over the paper on hover or focus; on touch they live in the detail sheet.
- **Sizes:** small (40px), default (50px), large (60px, two-line titles), and the printed hero strip (88 to 116px).

### Bay
- **Plate:** a designator plate in Label type: amber for Your move, pencil red for Stalled, Bay 3 otherwise; the count prints beside it, then a hint in Ink 3.
- **Rack:** strips stacked 6px apart; an empty bay says so in a plain sentence.

### Buttons
- **Primary:** a strip in its holder: PR Buff paper, Strip Ink label at 700, an arrow in its own printed box on the right; hover pulls the paper 6px along the holder. Shape: 3px paper in a 5px holder.
- **Quiet:** an empty holder outline (1px Rule 2) with Ink label; hover fills with Bay 2.
- **Plain:** Bay 3 fill with a 1px rule, Ink label, for secondary actions in the app.
- **Icon:** 32 to 40px square, transparent, Ink 2; on a holder they use Holder Ink.

### Chips
- **Unpicked:** Bay 2 with a Rule 2 outline and a plus.
- **Picked:** a strip of Plain Paper in a 2 to 3px holder ring with a tick; interests print in Martian Mono capitals.

### Inputs / Fields
- **Style:** the token field is a blank strip: Plain Paper inside a holder, Strip Ink print, Strip Ink caret. App search fields sit on Bay 2 with a 1px rule.
- **Focus:** a 2px focus ring (Move Amber at night, a darker amber in the day shift).
- **Error:** a 2px pencil inset on the field and Alert Coral text under it.

### Navigation
- **Landing nav:** fixed 64px; the wordmark is SPOOL printed in buff in a holder and turns into the page's face as you scroll; links in Ink 2 at 600; theme and sound toggles on the right; a compact Connect strip appears once the hero's own buttons scroll away.
- **App header:** wordmark and face in holders on the left; tabs on a Bay 2 rail where the current tab is Plain Paper in a holder; the Bay tab carries the amber count on you.

### The field (3D)
- **What it is:** a three.js scene (`src/components/landing/field/`), loaded as its own chunk once the section is within 700px of the viewport. One WebGL context; it renders only while on screen, the tab is visible and it is not paused.
- **Flights:** low-poly airliners built in code, flat shaded and matte: the body is the strip's paper colour (PR Buff for your PRs, Review Pink for one you reviewed, Plain Paper for drafts), the fin wears the repo's livery, engines and gear are holder black. Red and green nav lights, a red beacon and white strobes blink at real-world rates.
- **Data blocks:** each plane carries a radar tag on a 1px leader: callsign and number on the first line (QR2417), status on the second (OPENED, IN REVIEW, APPROVED, MERGING, MERGED, DRAFT, STALLED 31D), in print type, retyped by the printer when it changes. The flight being brought in has an amber tag; the stalled one has Alert Coral status text and a pencil ring. Tags that would hang off the scene's edge are hidden, not cut.
- **The landing:** the bottom of the stack is cleared after a few seconds, or at once from the deck's action. Clearance draws the branch ahead of the plane in 0.9s; on final the gear drops and the nose flares; at touchdown tyre smoke puffs, the centreline dashes flash amber away from the touchdown point, and 0.35s later the branch folds back into main over 1.25s. Everything above it in the stack steps down a level, and a new PR arrives out of the haze at the top.
- **Deck:** a four-plate rail maps the tower's words to Git's (Holding is In review, Cleared is Approved, Final is Merge queue, Landed is Merged); the current plate is amber, Landed turns green. The strip being landed sits beside a strip action; when the next flight takes over, the landed strip slides down into the Landed rack.
- **Honesty:** every flight is labelled sample data, and the copy says Spool never merges anything; it records a landing when GitHub reports one.
- **Motion off:** reduced motion or the motion switch renders single still frames (the default still is a plane on short final with its branch drawn), and the action steps the still to the next moment. Without WebGL the deck still walks through the four phases by hand.

### Season route (GSoC)
- **Line:** the year from announcement to program end on a true time scale, months printed above it. The season still to come is dashed; what has happened is drawn solid over it by scroll (one `--p` variable per panel, CSS does the rest), and each passed stop fills in and prints its date as the line reaches it. The amber you-are-here marker drops on once the line arrives at today.
- **Stops:** labels alternate above and below the line; every stop is a button, and the picked one is underlined with an ink ring on its dot and shows below as a Plain Paper strip with days to go or days ago.
- **Project size:** Small, Medium and Large place that size's midterm, final week and completion on the line as slips of Plain Paper in a holder ring; they slide to their new dates when the size changes.
- **Tech bars:** the ten most common tech tags as bars that grow in one after another on scroll; a picked bar becomes paper in its holder and filters the org rack, which slides its strips in a beat apart.
- **Phones:** the line runs down the left and every stop is a row; it draws downward.
- **Motion off:** the line is drawn to today and every bar is full.

### Printed field
Text the printer sets retypes itself left to right when it changes (26ms a character by default), driven by one shared animation loop; fixed width so nothing shifts. Reduced motion or the motion switch sets it instantly.

## Do's and Don'ts

### Do:
- **Do** put every thread on a strip: callsign first, silence last, coloured by kind.
- **Do** say whose move it is with the bay, and the state with the holder tab and a pencil mark.
- **Do** keep the console flat and neutral in both shifts; let the strips carry the colour.
- **Do** set codes, numbers, times and statuses in condensed Martian Mono, and pin its width axis.
- **Do** make primary actions strips in holders that slide when pulled.
- **Do** label synthetic strips SAMPLE and live data LIVE, in printed tags.
- **Do** keep planes inside the field, where each one is a PR with a real state; the landing is the merge.

### Don't:
- **Don't** bring back the airport costume: no screws, bezels, hanging sign plates, flap tiles, and no plane pictograms or decorative planes outside the field.
- **Don't** add a second 3D scene or let the field's lights and shadows leak into UI chrome.
- **Don't** fill buttons, cards or panels with amber; amber is for your move only.
- **Don't** use red pencil for anything but stalled silence and struck-through closed titles.
- **Don't** float things on glows or coloured halos; depth comes from holders.
- **Don't** put a kicker or eyebrow label above a heading.
- **Don't** set prose or buttons in the print font.
