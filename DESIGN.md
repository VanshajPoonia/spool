---
name: Spool
description: A split-flap departures board for a contributor's open source threads, sorted by who moves next.
colors:
  sign: "#ffcf00"
  sign-ink: "#111111"
  housing: "#101113"
  housing-2: "#16181b"
  housing-3: "#1d1f23"
  rail: "#2a2d32"
  rule: "#2f3238"
  panel: "#17191c"
  panel-deep: "#131416"
  bezel: "#0b0c0d"
  plate: "#060606"
  carrier-plate: "#24262a"
  chip: "#1f2125"
  ink: "#f3f0e7"
  ink-2: "#bdb9ae"
  ink-3: "#8d8a82"
  flap-top: "#2b2d32"
  flap-top-2: "#25272b"
  flap-bot: "#222428"
  flap-bot-2: "#1c1e21"
  flap-hinge: "#070708"
  flap-ink: "#f2eee3"
  flap-ink-dim: "#a09c92"
  flap-ink-go: "#7fe0a6"
  flap-ink-wait: "#ffc169"
  flap-ink-stop: "#ff8f7a"
  lamp-go: "#46c37b"
  lamp-wait: "#ffa62b"
  lamp-stop: "#ff5b41"
  lamp-idle: "#e9e5d8"
  paper: "#f4f1e8"
  paper-2: "#e9e5d9"
  paper-ink: "#16171a"
  paper-ink-2: "#55524a"
  fault-surface: "#2a1512"
  fault-edge: "#5a2a22"
  fault-ink: "#ffd2c9"
typography:
  display:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "calc(var(--flap-size) * 0.8)"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "normal"
  headline:
    fontFamily: "Atkinson Hyperlegible Next, Atkinson Hyperlegible, system-ui, sans-serif"
    fontSize: "clamp(28px, 4vw, 60px)"
    fontWeight: 700
    lineHeight: 1.04
    letterSpacing: "0.005em"
  title:
    fontFamily: "Atkinson Hyperlegible Next, Atkinson Hyperlegible, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  lede:
    fontFamily: "Atkinson Hyperlegible Next, Atkinson Hyperlegible, system-ui, sans-serif"
    fontSize: "clamp(17px, 1.35vw, 20px)"
    fontWeight: 400
    lineHeight: 1.55
  body:
    fontFamily: "Atkinson Hyperlegible Next, Atkinson Hyperlegible, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Atkinson Hyperlegible Next, Atkinson Hyperlegible, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    letterSpacing: "-0.01em"
  column-label:
    fontFamily: "Atkinson Hyperlegible Next, Atkinson Hyperlegible, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    letterSpacing: "0.06em"
  data:
    fontFamily: "Atkinson Hyperlegible Mono, ui-monospace, monospace"
    fontSize: "13px"
    fontWeight: 400
    letterSpacing: "-0.01em"
  carrier-code:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "calc(var(--h) * 0.66)"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.04em"
rounded:
  tile: "3px"
  sign: "4px"
  bezel: "6px"
  panel: "10px"
  chip: "14px"
  lamp: "50%"
spacing:
  gutter: "clamp(20px, 4vw, 64px)"
  page: "1360px"
  section: "clamp(112px, 13vw, 200px)"
  head: "clamp(36px, 4.4vw, 64px)"
  panel: "18px"
  row: "12px"
  cluster: "8px"
components:
  flap-tile:
    backgroundColor: "{colors.flap-top}"
    textColor: "{colors.flap-ink}"
    typography: "{typography.display}"
    rounded: "{rounded.tile}"
    width: "calc(var(--flap-size) * 0.66)"
    height: "var(--flap-size)"
  flap-tile-dim:
    textColor: "{colors.flap-ink-dim}"
  sign-link:
    backgroundColor: "{colors.sign}"
    textColor: "{colors.sign-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.sign}"
    height: "56px"
    padding: "0 18px 0 22px"
  sign-link-hover:
    backgroundColor: "{colors.sign-ink}"
    textColor: "{colors.sign}"
  sign-link-ink:
    backgroundColor: "{colors.sign-ink}"
    textColor: "{colors.sign}"
    typography: "{typography.label}"
    rounded: "{rounded.sign}"
    height: "64px"
    padding: "0 18px 0 22px"
  sign-link-ink-hover:
    backgroundColor: "#000000"
    textColor: "#ffffff"
  sign-link-cell:
    backgroundColor: "transparent"
    textColor: "{colors.sign-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.sign}"
    height: "64px"
    padding: "0 18px 0 22px"
  sign-link-cell-hover:
    backgroundColor: "{colors.sign-ink}"
    textColor: "{colors.sign}"
  sign-link-board:
    backgroundColor: "{colors.carrier-plate}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.sign}"
    height: "56px"
    padding: "0 18px 0 22px"
  sign-link-board-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.housing}"
  sign-plate:
    backgroundColor: "{colors.plate}"
    textColor: "{colors.ink}"
    typography: "{typography.headline}"
    rounded: "{rounded.sign}"
    padding: "clamp(12px, 1.3vw, 18px)"
  button:
    backgroundColor: "{colors.housing-3}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sign}"
    height: "40px"
    padding: "0 14px"
  button-hover:
    backgroundColor: "{colors.rail}"
  button-sign:
    backgroundColor: "{colors.sign}"
    textColor: "{colors.sign-ink}"
    rounded: "{rounded.sign}"
    height: "40px"
    padding: "0 14px"
  button-sign-hover:
    backgroundColor: "{colors.sign-ink}"
    textColor: "{colors.sign}"
  input-search:
    backgroundColor: "{colors.housing-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sign}"
    height: "40px"
    padding: "0 8px 0 12px"
  input-pass:
    backgroundColor: "#fffdf6"
    textColor: "{colors.paper-ink}"
    typography: "{typography.data}"
    rounded: "{rounded.sign}"
    height: "56px"
    padding: "0 52px 0 16px"
  tab:
    backgroundColor: "transparent"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.sign}"
    height: "36px"
    padding: "0 14px"
  tab-hover:
    backgroundColor: "{colors.housing-3}"
    textColor: "{colors.ink}"
  tab-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.housing}"
  chip:
    backgroundColor: "{colors.chip}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.chip}"
    height: "28px"
    padding: "0 10px"
  chip-on:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.housing}"
  carrier-tag:
    backgroundColor: "{colors.carrier-plate}"
    textColor: "{colors.flap-ink}"
    typography: "{typography.carrier-code}"
    rounded: "{rounded.tile}"
    height: "26px"
  lamp-go:
    backgroundColor: "{colors.lamp-go}"
    rounded: "{rounded.lamp}"
    size: "9px"
  lamp-wait:
    backgroundColor: "{colors.lamp-wait}"
    size: "9px"
  lamp-stop:
    backgroundColor: "{colors.lamp-stop}"
    size: "9px"
  fresh-lamp:
    backgroundColor: "{colors.sign}"
    rounded: "{rounded.lamp}"
    size: "8px"
  badge:
    backgroundColor: "{colors.sign}"
    textColor: "{colors.sign-ink}"
    rounded: "10px"
    height: "20px"
    padding: "0 6px"
  panel:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.panel}"
    padding: "{spacing.panel}"
  bezel:
    backgroundColor: "{colors.bezel}"
    rounded: "{rounded.bezel}"
    padding: "clamp(10px, 1.3vw, 20px)"
  boarding-pass:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.paper-ink}"
    rounded: "{rounded.panel}"
---

# Design System: Spool

## Overview

**Creative North Star: "The Departures Board"**

Spool is a station hall at night. Every surface is a piece of board hardware: painted graphite housings held by slotted screws, recessed black bezels, two-leaf split-flap tiles with a visible hinge gap, black sign plates hung from rods, and sign-yellow wayfinding that tells you where to go. The product answers one question, who moves next, and the world answers it the way a departures board does: rows that flip when something changes, lamps whose shape says the state, and a short code per carrier so a repo is recognisable at a glance.

The register is dense, legible and mechanical. Information sits recessed in bezels and flips into place; signs hang forward and point. Type splits into three voices: condensed flap characters for anything the board displays, a hyperlegible humanist sans for anything a person reads or acts on, and a hyperlegible mono for data (refs, times, ages, tokens). Motion is physical: tiles fall and land with a small overshoot, cycle forward through a real drum order, and settle instantly when reduced motion is on. Faces built from letters, set in flap cards, react to the cursor and to each section.

Confirmed rejections: the dark dev-tool hero with a lit dashboard screenshot, and a bento grid of feature cards. The product is shown as a working board, never as a picture of one.

**Key Characteristics:**
- Graphite housings, full bleed, with four slotted corner screws and a recessed black bezel for every flap module.
- Two-leaf flap tiles: top and bottom leaves, a dark hinge gap with pins, warm-white condensed characters.
- Sign yellow is wayfinding: the primary action, the pictogram square on a sign plate, the bands and wall, the next stop, focus, and what changed.
- Status lamps carry state in shape as well as colour.
- Solid-silhouette pictograms on a 32-unit grid, one fill weight.
- Two-letter carrier codes with a tail-fin livery, collision-free within any visible set.
- Letter-built faces in flap cards as the reusable signature.

## Colors

A night-hall palette: layered warm graphite, warm-white ink, one saturated sign yellow, and four lamp colours that only ever mean state.

### Primary
- **Sign Yellow** (`sign`): wayfinding and action. The primary sign link, the Connect GitHub sign beside the hero board, the pictogram square on every section plate, the full-bleed Programs wall, the boarding-pass header strip, the sample-data banner in the app, count badges, the GSoC next stop, the fresh lamp, focus rings, text selection and the text caret.
- **Sign Ink** (`sign-ink`): the near-black that sits on yellow. Text and pictograms on signs, the inverted hover state of every yellow control, and the inked sign variant placed on a yellow band.

### Neutral
- **Housing Graphite** (`housing`): the page itself and the app canvas; also the theme colour.
- **Housing Raised** (`housing-2`): inset controls on the housing: search field, segmented control, tab rail, filter tools.
- **Housing Lifted** (`housing-3`): default buttons, hover fills for quiet controls, keyboard keys.
- **Rail** (`rail`): the hover fill of a raised button and the scrollbar thumb.
- **Rule** (`rule`): 1px dividers and inset control outlines.
- **Panel / Panel Deep** (`panel` to `panel-deep`): the top-to-bottom gradient of every content panel and thread group.
- **Bezel Black** (`bezel`): the recess a flap module or board sits in.
- **Plate Black** (`plate`): hanging sign plates and the header plates of Programs modules.
- **Carrier Plate** (`carrier-plate`): the backing of carrier tags and the dark "board" sign variant.
- **Chip** (`chip`): unselected chips and tag pills.
- **Warm Ink / Ink 2 / Ink 3** (`ink`, `ink-2`, `ink-3`): primary text; secondary text and ledes; meta, column heads and timestamps. Ink 3 holds at least 5:1 on housing and panel.

### Flap
- **Flap Leaves** (`flap-top`, `flap-top-2`, `flap-bot`, `flap-bot-2`): each leaf is its own top-to-bottom gradient; the bottom leaf is a step darker than the top.
- **Hinge** (`flap-hinge`): the gap line and pins across the middle of every tile.
- **Flap Ink** (`flap-ink`): warm-white characters.
- **Flap Ink Dim** (`flap-ink-dim`): de-emphasised cards (their move, quiet days). 5.7:1 on the tile face; never go dimmer.
- **Flap Ink Go / Wait / Stop** (`flap-ink-go`, `flap-ink-wait`, `flap-ink-stop`): lifted lamp colours for status words set in flaps, tuned to read on the tile.

### Lamps
- **Go** (`lamp-go`), **Wait** (`lamp-wait`), **Stop** (`lamp-stop`), **Idle** (`lamp-idle`): status lamps and timeline event dots only. The green also edges the "live" data tag.

### Paper
- **Pass Paper / Paper 2 / Paper Ink / Paper Ink 2** (`paper`, `paper-2`, `paper-ink`, `paper-ink-2`): the boarding pass, the one paper object in the world, where the token is pasted.

### Fault
- **Fault Surface / Edge / Ink** (`fault-surface`, `fault-edge`, `fault-ink`): inline error panels in the app (a dark rust field with a 1px edge and pale coral text).

### Named Rules
**The Wayfinding Yellow Rule.** Sign yellow tells you where to go, what to do, or what changed: the primary action, the plate pictogram square, a band or wall, the next stop, the fresh lamp, focus. It is never atmosphere: no tinted panels, gradient washes, yellow-tinted shadows or glow bars.

**The Night Hall Rule.** The world is dark graphite. Light appears only as signage (yellow), selection (a warm-ink fill on the active tab or chip) and the paper boarding pass.

**The Lamp Colours Are State Rule.** Green, amber, red and idle-white mean go, wait, stop and idle. They are never used for decoration, category or brand.

## Typography

**Display Font:** Barlow Condensed (with Arial Narrow, sans-serif), weights 500 to 700
**Body Font:** Atkinson Hyperlegible Next (with Atkinson Hyperlegible, system-ui, sans-serif)
**Label/Mono Font:** Atkinson Hyperlegible Mono (with ui-monospace, monospace)

**Character:** Barlow Condensed is the board's hardware lettering, tall and narrow so a word fits a row of tiles. Atkinson Hyperlegible Next is the humanist sign voice, black on yellow or warm white on graphite, built for reading at a glance; its mono sibling sets every ref, time and token so data lines up.

### Hierarchy
- **Display** (Barlow Condensed 600, 0.8 of the tile height, line-height equal to the tile): every flap character. Tile sizes run from up to 120px in the hero headline (WHO MOVES / NEXT? and the face) through 44 to 92px section faces, 28 to 30px clocks and wordmarks, down to 16 to 29px board rows and 20px app status cells.
- **Headline** (Atkinson Next 700, clamp(28px, 4vw, 60px), 1.04): the H2 on a hanging sign plate, tracked at 0.005em.
- **Title** (Atkinson Next 700, 20 to 22px, 1.1, -0.01em): board titles, panel and group headings in the app, Programs module titles at 17px on their plates.
- **Lede** (Atkinson Next 400, clamp(17px, 1.35vw, 20px), 1.55, max 60ch): the paragraph under a sign plate, in Ink 2 with Ink-coloured bold.
- **Body** (Atkinson Next 400, 16px, 1.5): default; app copy steps to 14 to 15px for rows and controls.
- **Label** (Atkinson Next 700, 18px, -0.01em): text on sign links; buttons and tabs use 600 at 14 to 15px.
- **Column Label** (Atkinson Next 700, 12px, 0.05 to 0.06em, uppercase): board column heads and boarding-pass or fact field labels only.
- **Data** (Atkinson Mono, 11 to 13px): refs, timestamps, ages, the token field, org tags, the passenger name.
- **Carrier Code** (Barlow Condensed 700, 0.66 of the tag height, 0.04em): the two letters on a carrier tag; the boarding-pass gate number (40px) and the footer wordmark (34px, 0.14em) use the same hardware voice.

### Named Rules
**The Three Voices Rule.** Barlow Condensed belongs to the board's hardware: flap tiles, flap-faced chips, carrier codes, gate numbers and the wordmark. Atkinson Hyperlegible Next carries everything a person reads or clicks. Atkinson Mono carries data. A voice never crosses into another's job.

**The Level Sign Rule.** Headlines hang at about zero tracking (0.005em on plate H2s, -0.01em on titles, never tighter than -0.02em). Display weight comes from the plate and the size, not from crushed letter-spacing.

**The Column Head Rule.** Uppercase tracked 12px text labels a column or a field. It never sits above a heading as a kicker.

## Layout

The landing is a sequence of full-bleed bands on graphite. Horizontal padding is a single fluid gutter (`spacing.gutter`), and landing content holds to a 1360px measure (`spacing.page`) centred on wide screens, so the edges always have air; landing sections open with generous space above (`spacing.section`) and a fixed rhythm from section head to content (`spacing.head`). The hero is a full-bleed housing band directly under the 64px fixed nav, set side by side: on the right the local-time clock over the two-row flap headline (WHO MOVES / NEXT? and the face), whose eleven columns take up to 56% of the measure (tiles up to 120px tall, 0.7 as wide); on the left, centred against it, the page's H1 in Headline type (up to 54px, 16ch, "The open source manager that knows whose move it is."), a lede in ink-2 naming what the board tracks, the two actions (the yellow Connect GitHub sign, the board-dark sample board sign; side by side when the column has room) and the guest line as 14px small print in ink-3. The band takes only the height it needs, so the build section's sign shows on the first screen. Below 940px they stack, the board on top across the full width; on phones the headline restacks five tiles wide (WHO / MOVES / NEXT? / face). The sample day board opens the first section below it. The nav's Connect sign stays hidden while the hero's own buttons are on screen and drops in once they scroll away.

Each section head is a hanging sign plate (pictogram square and H2) with the lede (max 62ch) on its own below, so the right side of the lede stays open. The page has one face: the nav wordmark, which each section drives with its own state (the stalled count, the token check, the last board event). The landing runs: hero, the sample day (waiting on you or them), stalled threads, carrier codes (a repo list beside one repo's record), fresh repos (a topic picker and a grid of repo cards), the Programs wall, the boarding pass, the footer board.

Boards are CSS grids with subgrid rows: an 8px fresh-lamp column, carrier, flight number, thread, status, actor and time. Container queries remove columns as space shrinks (the thread title moves under the row at 980px; the number column goes at 560px) instead of shrinking type. The Programs wall opens with three countdown tickets (plate, big day count, tear-off stub) sorted soonest first and aligned with subgrid, then the GSoC route map full width with every stop labelled below the line, then Product Hunt. Tickets stack at 1000px; the route map turns into a vertical list under a 760px container.

The app is a sticky 64px header (brand face, centred tab rail, sync and account on the right), then pages padded at 24 to 28px by the gutter. The board runs two columns (Arrivals, Departures) that stack at 1180px; the thread detail is a 500px drawer on the right that becomes a bottom sheet under 860px, and wide screens (1500px and up) reserve room so it never covers the board. Spacing inside panels runs 18px padding, 12 to 14px row gaps, 8px between clustered controls.

## Elevation & Depth

Depth is physical, lit from above, and comes from how hardware is built rather than from floating cards. Housings carry a painted gradient with a 1px top highlight and a dark bottom lip, plus a long soft drop beneath. Data is recessed: bezels use inset shadows so flap modules and boards sit in the housing. Signs and plates hang forward with a soft drop shadow. Flap tiles have their own small drop and a stack of hairline shadows under the hinge that read as the cards waiting behind the top leaf. Lamps are the only light sources and the only elements with a glow, in their own colour.

### Shadow Vocabulary
- **Housing** (`inset 0 1px 0 rgba(255,255,255,0.09), inset 0 -2px 0 rgba(0,0,0,0.55), 0 30px 60px -30px rgba(0,0,0,0.9)`): painted board housings.
- **Bezel recess** (`inset 0 3px 8px rgba(0,0,0,0.85), inset 0 0 0 1px rgba(0,0,0,0.9), 0 1px 0 rgba(255,255,255,0.08)`): the black recess under flap modules and boards.
- **Hanging plate** (`inset 0 1px 0 rgba(255,255,255,0.08), 0 22px 34px -22px rgba(0,0,0,0.9)`): section sign plates.
- **Panel** (`inset 0 1px 0 rgba(255,255,255,0.05), inset 0 0 0 1px rgba(255,255,255,0.025)`): app panels and groups; the landing panel adds `0 30px 70px -45px rgba(0,0,0,0.9)`.
- **Tile** (`0 1px 0 rgba(255,255,255,0.03), 0 calc(var(--fh) * 0.04) calc(var(--fh) * 0.12) rgba(0,0,0,0.55)`): every flap tile, scaled to its height.
- **Lamp** (`0 0 0 2px rgba(0,0,0,0.55), 0 0 10px` in the lamp's own colour at 55%): status lamps only.
- **Menu / drawer** (`0 18px 40px rgba(0,0,0,0.55)`; drawer `-30px 0 80px -30px rgba(0,0,0,0.85)`): popovers and the detail drawer.

### Named Rules
**The Recess Rule.** Information sits in the housing (bezels, inset fields); signs hang out from it. Nothing lifts on hover.

**The Only Lamps Glow Rule.** A glow is light, so only lamps emit it. Everything else casts plain black shadow.

## Shapes

Small, machined corners. Tiles and carrier tags round at 3px, signs, buttons, tabs and inputs at 4px, bezels and Programs modules at 6px, panels, the drawer and the boarding pass at 10px. Full rounds are reserved for physical round things: lamps (go and the fresh lamp), screws, timeline dots, avatars, and the 28px chips (14px). The wait lamp is a diamond and the stop lamp a square, each at 1px. The boarding pass is cut with 14px half-circle notches at the perforation (a CSS mask) and a dashed perforation line; on mobile the notches move to the horizontal tear.

## Components

### Flap Tile (signature)
The board's display. Each tile is two leaves (top and bottom halves, each with its own gradient), a dark hinge gap at 2.2% of the height with pins at both edges, and a character set in Barlow Condensed at 0.8 of the tile height. Width is 0.66 of the height by default; the hero sets tiles at 0.7 of the height across eleven columns, and on phones at up to 0.92 so five columns fill the width.
- **Tones:** default warm-white ink; dim (#a09c92 floor) for their move and quiet values; go, wait and stop inks for status words.
- **Motion:** one shared requestAnimationFrame loop drives every tile. A change cycles forward through the drum (space, A to Z, digits, punctuation, lower case); digits roll on their own drum so 9 to 0 never passes letters. The top leaf falls in half the step (ease `cubic-bezier(0.55, 0, 1, 0.55)`, darkening to 42% brightness); the bottom leaf lands with a 7 degree overshoot (ease `cubic-bezier(0.25, 0.8, 0.35, 1)`). Defaults: 62ms per card, 22ms stagger, 12 card cap; intros scramble 4 to 10 random cards. Reduced motion or the in-page motion switch settles tiles instantly. The two moving leaves are shown only while a tile flips (`data-flip`); a resting tile has no 3D transform, so hundreds of idle tiles cost the compositor nothing. An opt-in synthesised clack plays per flip. On the hero headline a mouse running across the tiles riffles each one through three random cards and back.
- **Accessibility:** tiles are aria-hidden; the value is spoken once through a visually hidden label, or the row is marked decorative.

### Faces (signature)
Letter-built kaomoji set in flap cards, five tiles wide ((^_^), (o_o), (¬_¬), (x_x)) or seven wide for boards with room (\(^o^)/, (-_-)z). They close the hero headline, sit in the nav and app header as the brand mark, end every section head, and react to the cursor and to what the section shows. Faces only ever exist as flap characters.

### Sign Links (buttons on the landing)
- **Shape:** 4px corners, 56px tall (60px in the hero), label left and a 30px pictogram square right.
- **Primary:** sign yellow with sign ink, 700 at 18px; the square is inked with a yellow arrow.
- **Hover / Focus:** colours invert (ink field, yellow text) over 220ms and the square slides 4px right. Focus is the global 2px yellow outline at 3px offset.
- **On a yellow band:** the primary becomes an inked panel (ink field, yellow text, hover to pure black and white); the secondary is a cell outlined with a 2px inset ink stroke that fills ink on hover.
- **Board variant:** carrier-plate field with warm ink and a white square, inverting to ink on hover.

### Buttons (app)
- **Shape:** 4px corners, 40px tall (42px in the drawer), 14px side padding, 600 at 14px.
- **Default:** housing-3 field, ink text, a 1px white inset at 7%; hover to rail.
- **Sign:** yellow with sign ink at 700; hover inverts to ink with a 2px yellow inset ring. Reserved for the one action that moves the user on (open on GitHub, connect).
- **Danger:** dark rust field with coral text.
- **Icon buttons:** 32 to 34px squares, transparent until hover; a pressed toggle (pin, sound) turns its icon yellow.

### Status Lamps
A 9px lamp with a 2px black ring and a soft glow in its own colour. **Go** is a circle, **wait** a diamond (rotated square at 86%), **stop** a square, **idle** a hollow ring. The shape carries the state for anyone who cannot rely on colour.

### Fresh Lamp
What changed. An 8px solid sign-yellow dot in the first column of a board row, with a 1px black drop and no glow. It fades in over 400ms and is the only mark of news; no bars, outlines or row highlights.

### Carrier Tags
A two-letter code beside a tail fin painted in the repo's livery (two colours from a fixed set of twelve, a stripe at 118 degrees), on a carrier-plate backing with 3px corners. Sizes 20, 26 and 40px; in boards the tag matches the flap height and flips in on a rotateX entrance. Codes are derived from the repo name (word initials, then first letter plus a consonant) and assigned collision-free across every set shown together, in alphabetical order so a repo keeps its code however the list is sorted.

### Sign Plates (section heads)
A black plate hung from two 3px rods, 4px corners, a soft drop below. Left: a square pictogram in sign yellow with an ink silhouette; centre: the H2 (balanced wrap); right: the section's seven-tile face (dropped on mobile). As a plate scrolls in it swings down on its rods (a scroll-driven rotateX from -34 degrees with a small overshoot), and each section's main panel rises 48px into place; both are off with reduced motion or the motion switch. A fast scroll sets the plates swinging: each leans up to 5 degrees against the direction of travel, pivoting where the rods meet the ceiling, and a damped spring (stiffness 140, damping 7.5) brings it back through a swing or two. One loop drives every plate and runs only while something moves. App group heads use the same idea at 44px: a yellow square for Arrivals (your move), an ink square for Departures (their move).

### Housings and Bezels
Full-bleed painted graphite with a hairline vertical brush texture, a top light falloff and four 10px slotted screws inset 12px from the corners, each slot at its own angle. Flap modules and boards sit in a 6px black bezel with an inset recess. On the hero, a 720px warm light follows the mouse in soft-light blend, so it glances off the paint and the tiles alike; it moves by transform only and is absent on touch screens.

### Inputs / Fields
- **Search (app):** housing-2 field with a 1px rule inset, 40px, 4px corners, placeholder in ink-3; focus swaps the inset for a 2px yellow ring.
- **Notes:** a deeper field (#0f1012) with the same inset and yellow focus ring.
- **Token field (boarding pass):** 56px, a 2px paper-ink border, mono text on near-white; focus adds a 4px yellow ring; invalid turns the border red and shakes the pass.

### Navigation
- **Landing nav:** fixed 64px bar, transparent over the hero, then 88% housing with blur and a rule line once scrolled. Links are 600 at 15px in ink-2 with a housing-3 hover fill. The landing page scrolls natively, so the browser scrolls on its compositor thread and stays smooth while tiles flip; anchor links glide to their section (`scroll-behavior: smooth` while the landing is open, off with reduced motion or the motion switch). An eased JS scroller (Lenis) was tried and removed: it put every scroll frame on the main thread and trailed the wheel.
- **Board toolbar (app):** one row: the filter field, the All / PRs / Issues segment, two show-only toggles (Delayed with a wait diamond, New with a fresh lamp, each with its count in flaps), Mark seen and the shortcut key (hidden on phones). Arrivals and Departures carry their own counts in their heads; the Arrivals head also holds the sort toggle (longest waiting or newest first). On a narrow board the row actions (pin, snooze, open) give way to the thread sheet.
- **App header:** sticky 64px with a three-column grid; tabs sit in a housing-2 rail with 4px tabs, the current tab filled warm ink with housing text, and a yellow count badge for threads on you. Under 860px the tabs move to a scrolling second row.

### Chips and Tags
- **Chips:** 28px pills on the chip colour in ink-2, 600 at 13px; selected chips fill warm ink with housing text.
- **Data tags:** a dashed 1px border labels sample data; a solid green-edged border labels a live public feed.
- **Flap chips:** route and interest chips are split two-tone (each half a leaf) in Barlow Condensed uppercase.

### Pictograms
Drawn for this board: solid silhouettes, one fill weight, a 32-unit grid, fill `currentColor`. The set is arrivals, departures, clock, arrow, key, route, wall (information screen), hourglass, tail and spool (a spool of thread between two flanges, the product's namesake). They always sit in a square (30px in sign links, 44px in group heads, up to 76px on plates).

### Row Build (landing signature)
"How a thread becomes a row", straight after the hero and the target of "How it works". A 420vh track pins a stage: the parts list on the left (380px), the 3D scene on the right. The scene is CSS 3D, no library: every part is a box of six faces under one camera (2400px perspective), placed in world pixels with x along the row, y toward the viewer and z up.

- **The kit:** a sign-yellow mat with a 40px cutting grid, the row's dashed footprint and a black letter disc (A to E) beside each group of parts, which fades as its step finishes. Graphite parts lie flat on it: the back panel and shelf in a pile, the end caps on their sides, the carrier plate, eleven title tiles, three NEXT tiles, the lamp and eleven status tiles.
- **The build:** five equal steps (17% of the track each, after a 5% look at the kit). Parts travel on an arc (ease-in-out cubic, a lift of 70 to 120px) and turn upright a little before they land; tiles go one after another. Each tile lands blank and flips to its letter through the flap engine, so the build sounds like a board when sound is on. The lamp lands dark, lights in the stop colour and blinks twice.
- **The camera:** circles from 22 degrees to 14 while the row goes together, then leans in on the finished row. On a mouse the scene tilts a few degrees toward the pointer. A narrow stage looks along a steeper diagonal (40 degrees) so the long row uses its height. The mat's ends fade at the stage edges instead of being cut.
- **The parts list:** a big flap tile shows the current letter, then the step's name and "Part n of 5". Below, five rows with a 30px disc: hollow ink-3 ring for steps to come, sign yellow for the current one (its description opens), warm ink for steps done. A 4px rail fills sign yellow with the scroll, ticked at each step. Clicking a row glides to the moment that step's parts have landed. On phones the scene sits on top, the discs form a row of five buttons and the current description reads below them.
- **The row:** a sample thread from the landing board (quarry #2417 when changes were requested), labelled "Sample row" under the scene with its repo and note. The nav face changes with each step and reads `(*_*)` when the row is done.
- **Still:** reduced motion or the motion switch drops the pinned track and shows the finished row with all five descriptions open.

### Boarding Pass (signature)
The connect form. Paper ticket with a yellow header strip, a four-column field grid with uppercase field labels and a dashed rule, the token input, and a stub with gate, barcode and a dashed perforation. On success the stub tears away (900ms translate and rotate); on error the main panel shakes.

### Scrub Clock
The sample day's play button (42px housing-3 square) and a range track: a 4px track filled ink-2 up to the playhead, a 6 by 22px warm-ink thumb with a housing ring that turns yellow on focus, event ticks above and mono hour labels below.

### Organisation Cards (app)
The GSoC browser's card: a 44px logo on a paper tile (the org's initial in Barlow Condensed when there is no logo), name, and years in GSoC (sign yellow for a first-year org). Below them: the tagline, mono tech chips (inverted when they match an interest), categories and licence, then a link row where Project ideas is the one sign-yellow link and the guide, source and chat links are quiet. A star saves the org, and it pops once when switched on. Cards fill a 380px auto-fill grid and rise in a 30ms stagger, capped at twelve steps.

### Watch Rows (app)
One row per watched issue: status lamp, carrier tag, title over `repo#n · watching since`, then the status (label over detail) and a sign-yellow "N new" count. "Someone asked for it" sets its label in the wait colour. Closed and unreachable issues drop to 60% opacity. Rows sort with new activity first, then asked, PR, assigned, free and closed. Under 760px the status moves under the title.

### Guest Chip (app)
Without a token the header's right end shows a sign-yellow "Guest" pill followed by GitHub's allowance left in mono ("54 of 60 calls left"), and the whole chip links to Settings. Under 1100px only the pill shows. The nav face reads `(o_o)`, looking around. Board and Repos show the connect panel in place of the page: the headline says what needs a token, a bordered guest box offers "Browse as a guest" (sign yellow) and sample data, and the boarding pass sits below.

### Usage Meters (app)
Settings shows each allowance GitHub reported as a row: label, mono "N of M left", a 6px track filled in the go colour (stop colour under 20%), and "N used. Refills 3:12 AM." Only numbers GitHub sent appear; there is no estimate.

### Plan Board (app)
Five columns (Inbox, Up next, Working on, Waiting, Done) on a wrapping grid, each 232px at least, on the panel gradient with a flap count in the header. "Working on" carries a 3px sign-yellow top rule; a column a card is dragged over gets a 2px sign outline. Cards are housing-2 tickets: grip, carrier tag (or a cream "TASK" plate), mono `repo#n`, the priority control and a "⋯" menu on the top row, a bold title of up to three lines, then a lamp with the status and a sign-tinted "Your move" chip, and a footer with the kind and age. A card's priority paints a 3px left edge (sign, wait, grey). The lifted card tilts -1.5° with a deep shadow; its slot stays as a dashed sign outline at 30%. Finished cards sit in Done at 62% and can't be dragged. Above the columns, "Work on next" pairs a sign-yellow plate with the suggested card's title and the reason it was picked.

### Priority Plate (app)
P1, P2 and P3 in mono on a 20px plate: P1 is solid sign yellow, P2 a wait-colour outline on a faint wash, P3 a grey outline. With no priority the control is a flag icon. The menu lists each level with its word (High, Medium, Low) and a hint, then "No priority". On board rows the plate sits before the title like the pin; the drawer shows it with its word.

## Do's and Don'ts

### Do:
- **Do** put every value that changes (status, count, clock, face, flight number) in flap tiles so it flips through the drum, and settle it instantly under reduced motion or the motion switch.
- **Do** mark state with lamp shape as well as colour: go circle, wait diamond, stop square, idle ring.
- **Do** mark what changed with the 8px sign-yellow fresh lamp in the row's first column, and nothing else.
- **Do** open each landing section with a hanging black sign plate: yellow pictogram square, H2 at 0.005em tracking, the section's face at the far end.
- **Do** paint housings full bleed with four slotted corner screws, and set flap modules and boards in a recessed black bezel.
- **Do** assign carrier codes with the collision-free assigner for every set of repos shown together.
- **Do** keep dim flap ink at #a09c92 or brighter, and ink-3 for the faintest text on graphite.
- **Do** draw new pictograms as solid silhouettes on the 32-unit grid at one fill weight, filled with currentColor, and seat them in a square.
- **Do** label synthetic content with the dashed sample tag and live public feeds with the solid green-edged tag.

### Don't:
- **Don't** use sign yellow as atmosphere: no tinted panels, gradient washes, yellow-tinted shadows, or glow bars for what changed.
- **Don't** let colour alone carry thread state; lamps change shape and timeline dots always sit beside text naming the event.
- **Don't** set running text, sign labels or buttons in Barlow Condensed; it belongs to flaps, carrier codes, gate numbers and the wordmark.
- **Don't** put uppercase tracked labels above headings as kickers; uppercase 12px is for column heads and field labels.
- **Don't** track headlines tighter than -0.02em.
- **Don't** show the product as a lit dashboard screenshot or a bento grid of feature cards; show it as a working board.
- **Don't** lift cards on hover or float content above the housing; information is recessed and signs hang.
- **Don't** use emoji, icon fonts or text glyphs as icons; use the pictogram set.
- **Don't** introduce light page surfaces beyond signage yellow, warm-ink selection and the boarding-pass paper.
