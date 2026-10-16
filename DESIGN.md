---
name: Spool
description: Where a contributor's open source threads wind up, sorted by whose move it is.
colors:
  console: "#08090a"
  bay: "#0f1011"
  bay-2: "#151618"
  bay-3: "#1c1d20"
  surface-sel: "#232428"
  rule: "#202226"
  rule-2: "#2c2e33"
  ink: "#f7f8f8"
  ink-soft: "#c9ced6"
  ink-2: "#9ca3ae"
  ink-3: "#7d838d"
  accent: "#7170ff"
  brand: "#5e6ad2"
  move: "#f2c94c"
  move-ink: "#1a1400"
  pencil: "#eb5757"
  alert: "#f16a6a"
  landed: "#4cb782"
  kind-pr: "#9b8afb"
  kind-issue: "#4ea7fc"
  kind-review: "#f087b5"
  kind-talk: "#4cb782"
  kind-plain: "#8a8f98"
  console-light: "#fcfcfd"
  bay-light: "#ffffff"
  bay-2-light: "#f6f7f8"
  bay-3-light: "#eef0f2"
  surface-sel-light: "#e9ebee"
  rule-light: "#e8eaed"
  rule-2-light: "#d9dce0"
  ink-light: "#0e0f11"
  ink-soft-light: "#33373e"
  ink-2-light: "#4c515a"
  ink-3-light: "#6b7079"
  accent-light: "#5e6ad2"
  move-light: "#d29b00"
  pencil-light: "#d63b3b"
  alert-light: "#c23434"
  landed-light: "#16804a"
typography:
  display:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "clamp(40px, 4.9vw, 70px)"
    fontWeight: 510
    lineHeight: 1
    letterSpacing: "-0.034em"
  headline:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "clamp(32px, 3.6vw, 48px)"
    fontWeight: 510
    lineHeight: 1.06
    letterSpacing: "-0.024em"
  statement:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "clamp(28px, 3.4vw, 46px)"
    fontWeight: 510
    lineHeight: 1.12
    letterSpacing: "-0.024em"
  chapter-headline:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "clamp(26px, 2.6vw, 36px)"
    fontWeight: 510
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  lede:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "clamp(16px, 1.4vw, 19px)"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "-0.012em"
  page-title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 510
    lineHeight: 1.2
    letterSpacing: "-0.016em"
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.35
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "-0.011em"
    fontFeature: "\"cv11\", \"ss01\""
  meta:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "12.5px"
    fontWeight: 400
    lineHeight: 1.4
  wordmark:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 590
    lineHeight: 1
    letterSpacing: "-0.02em"
  mono:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0.04em"
rounded:
  control: "6px"
  row: "8px"
  menu: "10px"
  card: "12px"
  window: "16px"
  stage: "24px"
  pill: "999px"
spacing:
  row-gap: "1px"
  group: "4px"
  panel: "clamp(14px, 1.6vw, 20px)"
  app-page: "28px"
  gutter: "clamp(20px, 4vw, 64px)"
  section: "clamp(88px, 10vw, 152px)"
  page: "1280px"
  sidebar: "236px"
components:
  row:
    backgroundColor: "{colors.bay-2}"
    textColor: "{colors.ink}"
    typography: "{typography.title}"
    rounded: "{rounded.row}"
    height: "44px"
    padding: "6px 12px"
  row-selected:
    backgroundColor: "{colors.bay-3}"
    textColor: "{colors.ink}"
    rounded: "{rounded.row}"
  group-head:
    backgroundColor: "{colors.bay-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.row}"
    height: "36px"
    padding: "0 12px"
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.console}"
    rounded: "{rounded.pill}"
    height: "40px"
    padding: "0 17px 0 19px"
  button-primary-hover:
    backgroundColor: "#dadbdb"
  button-quiet:
    backgroundColor: "rgba(247, 248, 248, 0.05)"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    height: "40px"
    padding: "0 17px 0 19px"
  button-quiet-hover:
    backgroundColor: "rgba(247, 248, 248, 0.09)"
  button-app:
    backgroundColor: "rgba(247, 248, 248, 0.05)"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    height: "32px"
    padding: "0 14px"
  nav-connect:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.console}"
    rounded: "{rounded.pill}"
    height: "32px"
    padding: "0 14px"
  chip:
    textColor: "{colors.ink-2}"
    rounded: "{rounded.pill}"
    height: "26px"
    padding: "0 10px"
  chip-picked:
    backgroundColor: "{colors.surface-sel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
  segment-picked:
    backgroundColor: "{colors.surface-sel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "26px"
    padding: "0 10px"
  label-pill:
    textColor: "{colors.ink-2}"
    rounded: "{rounded.pill}"
    height: "22px"
    padding: "0 8px"
  caption-tag:
    textColor: "{colors.ink-3}"
    typography: "{typography.mono}"
    rounded: "{rounded.control}"
    height: "22px"
    padding: "0 8px"
  input:
    backgroundColor: "{colors.bay-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.row}"
    height: "44px"
    padding: "0 14px"
  input-search:
    backgroundColor: "rgba(247, 248, 248, 0.03)"
    textColor: "{colors.ink}"
    rounded: "{rounded.row}"
    height: "32px"
    padding: "0 6px 0 10px"
  switch:
    backgroundColor: "{colors.bay-3}"
    rounded: "{rounded.pill}"
    width: "30px"
    height: "18px"
  switch-on:
    backgroundColor: "{colors.brand}"
  menu:
    backgroundColor: "{colors.bay-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.menu}"
    padding: "5px"
  nav-item:
    textColor: "{colors.ink-2}"
    rounded: "{rounded.control}"
    height: "30px"
    padding: "0 8px"
---

# Design System: Spool

## Overview

**Creative North Star: "The quiet workspace"**

Spool is a quiet dark workspace built at Linear's craft, paced like Stripe and framed the way Cursor mounts its product: a near-black console, grey steps, white-alpha hairlines and Inter set tight. Every open thread a contributor has on GitHub is one row, grouped by the question the product exists to answer: whose move is it. The landing page proves that by playing a real-scale Spool window through a sample day on a toned stage; the app is that same window at full size, a sidebar beside one inset panel.

The register is calm and precise, not decorative. Surfaces separate by a step in grey and a 1px rule, never by texture. Colour lives only in marks: the yellow half circle for your move, the red square for silence past the limit, a kind dot in a label, the indigo of something new or acted on. Every action is a pill, light for the one main way in and quiet beside it, and every arrow on an action is the same chevron that grows a shaft on hover. Figures are set inline as count lines, never as stat cards. Dark is the default; light is one switch away and keeps every structure.

Motion has one authored entrance and is otherwise driven by the scroll. The hero headline rises word by word out of a blur while its window lights up under a sweeping mask, and the sample day plays on its own clock because it is the first screen. Everything after it moves with the page: the statement band's plates draw on and act out their idea as they rise, the product tour pins and plays a morning in the app, the row walkthrough pops out to fill the screen and walks its cards sideways, the field's planes fly while the page moves, the season route draws, and the route diagram's lights travel. Scrolling back plays all of it backwards, and stopping holds it. Beyond that, things move when they change: a row slides between groups and flashes its status circle, numerals retype, a stalled tint wipes in, menus scale in from their trigger. Reduced motion or the motion switch settles all of it at once, delays included, and nothing pins. Four signatures carry over from earlier worlds: the letter-built faces in a chip beside the wordmark, the 3D field where every PR is a flight and the merge is the landing, numerals that retype with an optional printer sound, and the footer strip you can type on.

Confirmed rejections: the dashboard-screenshot hero, bento grids of feature cards, stat-card rows, monospace as costume, gradient text (one narrow exception, below), neon glows, and the paper strips, black holders and airport costume of the earlier worlds.

**Key Characteristics:**
- Near-black console, three grey surface steps and a picked step, 1px white-alpha rules between everything.
- Colour only in marks: yellow for your move, red for stalled silence, indigo for new or acted on, kind dots in label pills.
- Linear-style status circles and a fixed priority slot at the start of every row; silence at the end.
- Every action a pill with the hover arrow; figures as inline count lines.
- Inter 510 set tight for heads, Ink Soft as the second voice, Geist Mono only for tags, codes and printed data.
- One authored entrance; after the hero, motion follows the scroll, and otherwise things move only when state changes.

## Colors

A restrained palette: neutrals own the page, indigo marks what is new or acted on, and status colours stay small. Light values deepen every hue so the same marks hold on white.

### Primary
- **Indigo Accent** (accent): new to you, or acted on. Links, focus rings (2px, 3px offset), the caret, text selection at 40%, the unread dot at a row's left edge, the New toggle's round lamp, a pinned row's pin and 6% wash, the check on a picked menu item, and the input focus glow (a 1px accent ring plus a 3px ring at 22%). In light it settles to the brand value.
- **Brand Indigo** (brand): indigo as a fill. The done check, a switch that is on, the landed phase dot on the field's rail.

### Secondary
The status marks.
- **Your Move Yellow** (move): the half-filled status circle for threads waiting on you; the on-you count in the app sidebar (yellow on a 16% yellow tint, the one colour the sidebar carries); the day's passed ticks on the sample scrubber; the today marker on the GSoC route; the flight being brought in on the field, whose radar tag fills yellow, and its branch. In light it deepens (move-light), which carries marks and fills but is too pale for small text on white, so text set in yellow uses `--move-text` (#7a5a00 in light, 5.4:1 on its tint; the same yellow in dark).
- **Move Ink** (move-ink): text set on a yellow fill.
- **Stalled Red** (pencil): silence past the limit and nothing else. The stalled square, a silence count past the limit (red on a 16% red tint that wipes in from the left), the stretch of a silence meter past the limit, the stalled slabs in the third plate, the stalled count in the board's summary, the Stalled toggle's square lamp. Red text (a stalled count) uses `--pencil-text`, which darkens to #b02525 in light so it holds 4.5:1 on its tint.
- **Alert Coral** (alert): problems. A refused token, a failed search, a printed status in its stop tone ("CI failing", "Changes requested"), error banners (Ink text on an 8 to 10% alert wash with a 32 to 35% alert ring), and the destructive pill (alert text on an 8% wash, never a red fill).
- **Landed Green** (landed): approved and live. The go mark, the LIVE tag's dot and the ring it sends out.

### Tertiary
The thread kinds (CSS custom properties keep their earlier names, `--strip-pr` and siblings).
- **PR Violet, Issue Blue, Review Pink, Talk Green, Plain Grey** (kind-pr, kind-issue, kind-review, kind-talk, kind-plain): a 7px dot inside a row's label pill, the threads winding onto the spool in the first plate, a 3px edge on a field radar tag, a plane's tail. Never a background, never a row tint.

### Neutral
- **Console** (console): the page and the app's frame. **Bay** (bay): panels, groups, the app's inset panel, the chapter band. **Bay 2** (bay-2): group head bands, standalone rows, inputs, menus, the drawer. **Bay 3** (bay-3): hover on a standalone row, a selected row, raised controls, face chips. **Surface Sel** (surface-sel): a picked chip, segment, toggle or filter.
- **Rule / Rule 2** (rule, rule-2): hairlines between sections and around panels and rows; rings on quiet controls, chips, tags and menus.
- **Ink** (ink): titles and values. **Ink Soft** (ink-soft): the second voice, a section lede or the hero's offer. **Ink 2** (ink-2): notes that matter, nav labels, plate notes, secondary values. **Ink 3** (ink-3): IDs, meta, hints and captions. The statement's continuation is a mix halfway between Ink 2 and Ink 3 (about 6.4:1 on the console).
- Ink 3 holds 4.5:1 or better on Console, Bay and Bay 2 in both themes, and dips to about 4.1 to 4.4 on Bay 3 and Surface Sel.

### Named Rules
**The Small Colour Rule.** Colour lives in marks: a status circle, a dot, a lamp, a tinted count, a thin bar. If a whole button, card or panel turns a status colour, it is wrong. The only filled light surface is the primary pill.

**The Four Jobs Rule.** Indigo means new to you or acted on. Yellow means the move is yours. Red means silence past the limit and nothing else. Alert carries problems. They never trade jobs.

## Typography

**Display Font:** Inter (variable, optical size on, `cv11` and `ss01` on), falling back to system-ui
**Body Font:** Inter
**Label/Mono Font:** Geist Mono, falling back to ui-monospace

**Character:** One family in two voices. Inter at 510 with tight tracking gives every head the display cut, and Ink Soft gives each head a second voice a step under it; body runs at 400 with -0.011em. Geist Mono is the printer: small uppercase captions and the data it retypes.

### Hierarchy
- **Display** (510, clamp(40px, 4.9vw, 70px), 1, -0.034em, balanced, 17em measure): the landing H1 only, two lines across the column.
- **Headline** (510, clamp(32px, 3.6vw, 48px), 1.06, -0.024em, 16ch): landing section H2s. The close sets its centred head larger (clamp(36px, 4.6vw, 64px), 1.02, -0.03em, 14ch).
- **Statement** (510, clamp(28px, 3.4vw, 46px), 1.12, -0.024em, balanced, 24em): one sentence in Ink with its continuation a step back. It opens the statement band under the hero and the chapter.
- **Chapter headline** (510, clamp(26px, 2.6vw, 36px), 1.1, -0.02em, 20ch): sections inside the chapter speak one step quieter. Sub-heads inside a section run clamp(24px, 2.4vw, 32px).
- **Lede** (400, clamp(16px, 1.4vw, 19px), 1.55, -0.012em, Ink Soft, 52ch): beside each headline. The hero's offer runs a touch larger (clamp(17px, 1.45vw, 20px), 1.5, 44ch).
- **Page title** (510, 20px, 1.2, -0.016em): the app's page heads and the thread drawer's title. Section heads inside a page are 15px at 510 over a hairline.
- **Title** (500, 14px, 1.35): row titles; 13.5px in small rows and group names, 15px in large rows and plate titles, clamp(18px, 1.8vw, 22px) for the one row at reading distance.
- **Body** (400, 16px, 1.5, -0.011em): running copy; plate notes run 15px at 1.6 in Ink 2, 36ch.
- **Meta** (400, 12.5px, 1.4, Ink 3): notes, last move, hints. IDs and silence counts are 13px at 500 with tabular figures.
- **Wordmark** (590, 14 to 17px, -0.01 to -0.02em): "Spool" beside its face chip, in the nav, the sidebar and the footer.
- **Mono** (Geist Mono 500, 10.5 to 11px, 0.04em, uppercase): SAMPLE DATA and LIVE tags, the account tag, the anatomy letters A to E, GSoC month letters and stop dates, the field's radar tags, the token field and inline code.

### Named Rules
**The Second Voice Rule.** A section head's lede is Ink Soft: a step under the title, well above the notes. Sub-heads inside a section drop to Ink 2, and the app's page ledes to Ink 3.

**The Quiet Mono Rule.** Mono sets codes, captions and the data the printer retypes (faces, a clock, days left, stars, a limit, a phase word), never a heading, a button or a sentence. Counts in heads, rows and the app's figure lines are Inter with tabular figures, even while they retype.

**The Sentence Case Rule.** Status words read in sentence case with their abbreviations spelled out ("CI failing", "Changes requested", "Incoming PR", "With the author"). Only mono tags and printed fields are capitals.

## Layout

**Landing.** One column on the console, content held to 1280px and centred on wide screens, with a fluid gutter (clamp(20px, 4vw, 64px)). Each section opens with a full-width 1px rule and clamp(88px, 10vw, 152px) of space above it. A section head is a two-column grid, headline left and lede right with clamp(32px, 6vw, 96px) between, stacking under 860px; clamp(40px, 5vw, 72px) separates the head from what it introduces.

The hero sets its H1 across the column, then a row under it: the lede and two pills on the left (600px), the live next-deadline link on the right, the two aligned along their foot. Below that sits the stage holding the full-width three-pane window: a 212px sidebar, the bay, a 300px activity pane, 540px tall, with the day scrubber along the bay's foot. Under 1180px the window's sidebar goes; under 860px the activity pane drops under the bay and keeps only the last two moves.

The statement band follows the hero: the sentence across the column, then three plates in equal columns divided by hairlines the height of the plates, stacking with rules between them under 860px. The anatomy section shows one row at reading distance with lettered callouts above it on dashed leaders and a five-part key below (two columns under 1080px, one under 560px; the callouts give way under 860px). The field runs full bleed, masked to transparent on every edge. "Beyond your threads" is a chapter: a raised Bay band with hairlines top and bottom, opened by its own statement, holding fresh repos, programs and Google Summer of Code. The close centres its head over the token form; the footer strip and three columns end the page.

**App.** A 236px sidebar on the console beside one inset panel, held 8px from the viewport. Inside the panel nothing is boxed again: pages pad 0 28px (16px on phones), open with a page head over a hairline, and lay sections flat under 15px heads and their own hairlines. Two-column sections (28px rows, 40px columns) collapse under 1100px. The board's view bar is a row of 32px controls over a hairline; groups stack in one column 18px apart and rows sit 1px apart. The thread drawer is fixed at the right, 500px wide and 16px from the edges; above 1500px the board pads its right side so the list stays clear. Under 900px the sidebar folds into a sticky bar whose places scroll in a strip with faded edges.

**Rows are container queries.** Under 600px of row width the label pill folds away; under 480px the ID column narrows and the last move goes; under 460px a group's hint hides.

## Elevation & Depth

Flat by default, layered by tone: Console, then Bay, Bay 2 and Bay 3, each step ringed by a 1px rule drawn as an inset box-shadow so it never changes a box's size. Shadows appear only where something lifts off the page, and every one carries an offset and a soft blur.

### Shadow Vocabulary
- **Stage lift** (`box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.4), 0 24px 48px -24px rgba(0, 0, 0, 0.9)`, `--lift`): the hero stage only, with a floor of light under it (a radial 7% ink wash). It sits on the stage, outside the window's entrance mask, so the mask never cuts it.
- **Menu** (`box-shadow: inset 0 0 0 1px var(--rule-2), 0 18px 40px -8px rgba(0, 0, 0, 0.55)`): popover menus.
- **Drawer** (`box-shadow: inset 0 0 0 1px var(--rule-2), inset 0 1px 0 rgba(247, 248, 248, 0.06), -30px 0 80px -30px rgba(0, 0, 0, 0.85)`): the thread drawer, cast to the left.
- **Quiet ring** (`--quiet-ring`: a 4% inner ring, a 6% lit top edge, a 60% black outer ring and `0 4px 4px rgba(0, 0, 0, 0.1)`): quiet pills. Light swaps it for a Rule 2 ring and a 1px soft drop on a 70% white pill.
- **Pill press** (`box-shadow: 0 1px 1px rgba(0, 0, 0, 0.07), 0 3px 2px rgba(0, 0, 0, 0.04)`): the light primary pill.
- **Panel** (`box-shadow: inset 0 0 0 1px var(--rule), 0 1px 2px rgba(0, 0, 0, 0.12)`): the app's inset panel.

### Named Rules
**The Lit Edge Rule.** A raised thing is lit along its top edge by a 1px inset highlight of 6 to 9% ink: the quiet pill, the hero stage, the sample window, the drawer. On fine pointers, the hero window and the section panels also brighten their hairline where the pointer is (a 240px radial light masked to the 1px rim). It is light on a rim, never a glow or a halo.

**The Glass For Scrolling Rule.** Translucent glass with a 20px blur is for chrome that content scrolls under: the fixed site nav and the app's phone bar. Nowhere else.

The 3D field is a scene, not UI: its sun and cast shadows stay inside it.

## Shapes

Rounded but tight. Pills for every action, chip, label, repo filter, switch and count badge. 6px for nav items, tags, segments and callsign tiles; 8px for rows, inputs, the search field, the segmented control and the board's toggles; 10px for menus, the window's inner panel and the board's error banner; 12px for groups, panels, the app's inset panel, the drawer and the reading-distance row; 16px for the sample window; 24px for the hero stage. Hairlines are 1px everywhere.

Marks are 16px SVGs with 1.5 to 2px strokes and round caps. The status circle reads like Linear's: an open circle for their move, the same circle half filled for yours, a red rounded square with a white exclamation for stalled, a filled check for done, a dashed circle for idle. Priority is three rising bars in a 14px glyph, lit to the level in Ink 2 (Ink for urgent) over unlit bars at 18% ink; with no priority the slot shows three short dashes so titles still line up. Interface icons come from one drawn library (Lucide) at 16px. The statement band's plates are isometric hairline drawings (1.1px strokes) built in code from boxes and circles, their faces filled with the console so near shapes hide far ones.

## Components

### Buttons
Every action is a pill, and every arrow on one is the hover arrow.
- **Shape:** a full pill (999px).
- **Primary:** a light pill on dark: Ink with Console text, 40px tall, label 15px at 500, with the pill-press shadow. Hover dims it to 88% ink; a press scales it to 0.98. The nav's Connect is the same pill at 32px.
- **Quiet:** a 5% ink wash with a lit top edge on a dark ring (`--quiet-bg`, `--quiet-ring`); hover raises the wash to 9%. Light theme makes it a white pill on a Rule 2 ring.
- **App pills:** 32px, label 13px at 500, quiet by default; the main action uses the light pill; a destructive action is alert text on an 8% alert wash with a 35% alert ring. Disabled pills drop to 50% (a disabled landing pill turns Bay 3 with Ink 3 text).
- **Hover arrow:** a 10px chevron at rest; on hover or focus its shaft fades in and the head steps 3px over 300ms (`--ease-quart`), so it points where the click goes.
- **Icon buttons:** 30px, 7px radius, Ink 3, filling with a 6 to 8% ink wash on hover.

### Chips, segments and toggles
- **Chips:** 26px pills with a Rule 2 ring and Ink 2 text at 12.5px; hover adds a 5% wash. Picked is Surface Sel with a Rule 2 ring and Ink text.
- **Segmented control:** a Rule 2 framed 8px track with 26px segments; the picked segment is Surface Sel with a Rule 2 ring.
- **View-bar toggles and repo filters:** 32px toggles (a lamp, a word and a count) and 28px repo pills (callsign, name, count). Picked is Surface Sel with an Ink 3 ring, a step brighter so it reads as on from across the bar.
- **Switches:** 30 by 18px pills on Bay 3 with a Rule 2 ring; on fills with Brand and the 12px knob slides right, turning white.

### Cards / Containers
- **Corner Style:** 12px for groups and panels.
- **Background:** Bay, ringed by Rule. Inside the chapter, panels sit on the console instead, so they read as set into the band.
- **Shadow Strategy:** none; see Elevation & Depth.
- **Border:** a 1px inset Rule ring.
- **Internal Padding:** clamp(14px, 1.6vw, 20px) for panels; 4px for a group, whose head band is a 36px Bay 2 strip (status circle, name at 500, count in Ink 3, hint at the right, tools).
- In the app, the inset panel is the page's one card; sections inside it are never boxed again.

### Inputs / Fields
- **Style:** Bay 2 with a Rule 2 ring and an 8px radius, 44px tall on the landing's token form; the app's search and token fields are 32 to 34px on a 3% ink wash. Tokens are set in mono.
- **Focus:** a 1px accent ring plus a 3px accent ring at 22 to 25%.
- **Placeholder:** Ink 3.

### Navigation
- **Site nav:** fixed, 64px (56px under 960px), glass with a 20px blur, its hairline settling to full Rule once the page scrolls. The face chip and wordmark at left, links (14px, 450, Ink 2 to Ink on hover) in the middle, then the theme toggle, a divider and the 32px light Connect pill.
- **App sidebar:** 236px on the console. The face chip and wordmark with sync beside it, then six places as 30px items (13.5px, 450, Ink 2, Lucide icons in Ink 3); hover is a 4% ink wash, the current place a 7% wash with Ink text. The Bay's on-you count is the yellow badge. Below, the busiest repos under their callsign tiles with counts; sync status and the account at the foot.
- **Phone:** the sidebar folds into a sticky glass bar with the places in a horizontally scrolling strip that keeps the current place in view.

### Thread row (signature)
- **Anatomy:** status circle, ID (repo callsign and number joined by a hyphen, Ink 3, tabular), then in the app the pin and the priority slot before the title, the title with a note under it (the status word first, in sentence case), the label pill (kind dot and name), the last move (who over when), and silence (`14d`).
- **Fixed columns:** the ID column takes `--row-idw` (5.9em on the board, 4.9em when narrow) and the priority slot always draws, so every title starts in the same place.
- **On its own** a row is a card: Bay 2 with a Rule ring, Bay 3 on hover. **Inside a group** it lies flat and fills with Bay 2 on hover.
- **States:** selected is Bay 3 with a Rule 2 ring; new shows a 6px indigo dot at the left edge; pinned carries an indigo pin and a 6% indigo wash; other rows dim to 60% while one is open in the drawer; closed titles strike through in Ink 3; answered rows show a small check that draws on; stalled silence is red on a red tint.
- **Controls** fade in over the row's right end on hover or focus, on a gradient from Bay 3; touch screens leave them out.

### Menus and the drawer
- **Menus:** Bay 2, a Rule 2 ring, a 10px radius and 5px padding, with the menu shadow. They scale in from 0.96 at their trigger's corner over 160ms. Items are 32 to 40px with a 6% ink wash on hover; the picked one carries an indigo check.
- **Drawer:** Bay 2 on the right, 500px, a 12px radius and the drawer shadow; it slides 30px in while a clip opens from the left (360ms, `--ease-out`). Its title is the page title.

### Tags and status words
- **Caption tags:** 20 to 22px, a 5 to 6px radius, a Rule 2 ring, mono uppercase in Ink 3. SAMPLE DATA marks synthetic data; LIVE carries a 6px green dot that sends out a ring every two seconds while the tag is on screen. In the app, sample data is announced once by a quiet band across the panel's top (a 2.5% ink wash, the tag, one sentence, a quiet pill out).
- **Label pills:** 22px, a Rule 2 ring, Ink 2 at 12px with the 7px kind dot.
- **Status words** come from one formatter: sentence case, abbreviations spelled out.

### Figures
- Figures are inline count lines (the board head's summary: "3 on you", "2 on them", "1 stalled" side by side, each figure in Ink and the stalled one in red) or tabs and toggles that carry a count. Never stat cards.
- The one figure line is the app's Programs page: three countdowns in a row between hairlines, divided by vertical hairlines, each a 13px label, a 30px Inter figure at 510 that retypes, and a 14px unit in Ink 3. The countdowns are that page's content, so they earn it.

### Statement band and plates
- One sentence (Statement, Ink) and its continuation a step back, then three plates: one list, whose move, silence counted. Each plate is an isometric hairline drawing, a 15px title and a 15px Ink 2 note, with no figure number above it.
- The drawings: threads in the kind colours winding onto a spool; a thread lifted off their stack onto yours, marked with the yellow half circle; slabs of silence rising through a dashed limit, those past it in Stalled Red on a red wash.
- The plates follow the scroll from when a plate's top passes 95% of the viewport to when it reaches 28%. The first 42% of that draws the lines on in order, then the guides, threads and colour marks; the rest plays each plate's idea: light runs along each thread into the spool one after another, the top thread lifts off their stack and lands on yours as its mark turns yellow, and the slabs stand up a day at a time, turn red past the limit and topple like dominoes when a reply arrives. Boxes are drawn from their eight corners in any pose (the hull for the outline, edges shared by two visible faces inside), so tipped slabs stay true hairline drawings. With motion off the plates are simply drawn.

### Product tour
- A section after the statement band shows the app in use. The window (sidebar, bay, a detail drawer, the plan board) sits on a dotted stage with a faint accent glow under it, the one place the Stripe stage idea appears. A pointer and a key-press chip are drawn over it the way a screen recording shows them; on phones the pointer is a fingertip dot.
- The stage pins under the nav while a 340svh runway scrolls; each scripted step gets a share of the runway in proportion to its length, so the scroll picks the step and scrolling back rewinds. Five chapters under the window (Sign on, Triage, Answer, Stalls, Plan) each have a 2px bar that fills with the scroll through it; picking one scrolls to its start.
- Time jumps arrive as a blurred pill at the top of the panel; toasts sit bottom left. Every repo and person is the sample board's cast.

### Row walk (how a thread becomes a row)
- The panel pins over a 340svh runway. Over the first 7% it pops out from a card (inset 4% and 7%, 24px radius, a Rule 2 edge drawn just inside the cut) to the full screen, and over the last 6% it settles back. In between, a line of cards (one per part, A to E, then "That's one row.") walks sideways: each card rests at the left edge of the text for most of its share of the scroll and glides to the next in the middle. The card being read is raised and its letter fills; the others sit at 42%.
- The row at the top builds as each card arrives, with lettered callouts and the explained part lit while the rest dims. Each card shows the evidence Spool reads and what it makes of it: the searches and the one that matched, the repo name becoming its callsign, the title and its kind, the last word and whose move that makes it, the silence against the limit.
- With motion off nothing pins: the row is whole and the cards sit in a row you can swipe.

### Hero entrance and the sample day
- The H1 rises word by word (opacity, a 10px blur and 20% of its height, 900ms, 42ms apart); the lede, pills, guest line and next-deadline link follow with a 6px blur and 8px rise (800ms). Screen readers get the sentence whole.
- The window lights up from the left under a 400%-wide gradient mask sliding from 150% to 0 (1100ms after 300ms); the stage's drop and floor light fade up separately. The mask exists only during the animation.
- Each beat of the sample day slides the row that moved to its new group (460ms within a group, 760ms across, `--ease-slide`), flashes its status circle (brightness 1.7 and scale 1.22, 900ms after 380ms) and blurs the new activity line in (520ms), so the line and the row read as one event; the face in the chip reacts.

### The field (3D)
- three.js, in its own chunk, built in idle time after load and rendered only while visible. The planes fly only while the page scrolls: each pixel scrolled, either way, owes the field a little time, paid out over the next frames so a flick glides and the field coasts to a stop. A landing someone asks for with the button plays out on its own clock. A small SCROLL TO FLY tag sits where a pause button would. Planes are neutral with tails in the kind colour; the runway is near-black with grey paint and MAIN printed mid-runway. Radar tags are mono with a 3px kind edge; the flight being brought in has a yellow tag and a yellow branch; a flight in trouble prints its status in Alert. The phase rail marks the current phase with a raised plate and a status dot (yellow, or brand when landed). It is the only 3D on the site and the only place planes appear.

### Season route (GSoC)
- One line on a true time scale, dashed ahead and drawn solid by scroll; passed stops fill in and print their dates as the line reaches them, and the yellow today marker drops on last. Stops are buttons; the picked one shows as a row with days to go. Project-size windows are slips on the line that slide when the size changes. Tech bars grow in on scroll and filter a searchable list of organisation rows.

### Route diagram
- In the close, above the token form: Your browser and api.github.com as two raised nodes on a field of dots, three lanes between them. Reads go out with an indigo light, threads come back with a yellow one, and the write lane is dashed in Stalled Red with a stop mark. The scroll carries each light from one end of its lane to the other. On phones the route stands up, browser on top.

### Silence meter
- Every row in the Stalled section carries a 6px bar on one shared scale; a white tick marks the limit and the bar past it turns red. Dragging the limit moves every tick at once and rows move between groups.

### Printed field and the footer strip
- Counts, clocks, faces and status words retype left to right when they change (26ms a character by default), from one shared loop, with an optional printer sound. Reduced motion or the motion switch sets them at once.
- The footer strip prints the next deadline in large mono; click it and type, and it prints what you type; Escape puts it back. Theme, motion and printer sound switches sit beside the footer links.

### Letter faces
- Faces built from letters, such as (^_^), live in a small Bay 3 chip with a Rule 2 ring beside the wordmark. On the landing the chip shows the face of the section holding the middle of the viewport; the sample day, the app's loader and its errors each wear one.

### Waiting text
- Text waiting on GitHub ("Searching GitHub…", "Checking with GitHub…", "Reading the timeline…") carries a slow highlight across it (`.shimmer`, 2.2s, linear). It is the only gradient text in the system, allowed only on text that is waiting on GitHub, and it settles to plain text when motion is off.
- A silence count crossing the limit gets its red tint wiped in from the left (500ms), not switched on. Setting a priority stamps the glyph (320ms).

## Do's and Don'ts

### Do:
- **Do** put every thread in a row: status circle first, silence last, with the priority slot and the ID column at fixed widths so titles line up.
- **Do** say whose move it is with the group and the status circle.
- **Do** make every action a pill: the light pill for the one main way in, quiet pills beside it, every arrow the hover arrow.
- **Do** keep surfaces neutral and let marks carry the colour.
- **Do** set figures as inline count lines or as tabs and toggles with counts.
- **Do** open landing sections with a hairline and a title-left, lede-right head, the lede in Ink Soft.
- **Do** label synthetic data SAMPLE DATA and live data LIVE in mono caption tags; in the app, one quiet band across the panel's top.
- **Do** write status words in sentence case with abbreviations spelled out.
- **Do** step secondary text up to Ink 2 on Bay 3 and Surface Sel, where Ink 3 falls under 4.5:1.
- **Do** settle every motion at once, delays included, under reduced motion or the motion switch.
- **Do** drive motion after the hero from the scroll, so it rewinds and holds; never pause anything on hover.

### Don't:
- **Don't** fill a button, card or panel with a status colour; problems get Alert text on a faint wash, never a red fill.
- **Don't** use Stalled Red for anything but silence past the limit; errors and refusals use Alert.
- **Don't** build a stat-card row, a bento of feature cards or a dashboard-screenshot hero.
- **Don't** set headings, buttons or prose in mono.
- **Don't** use gradient text, glows or texture; the shimmer on text waiting on GitHub is the one gradient text.
- **Don't** give every section an entrance: the hero has one, the plates draw once, and everything else moves only when its state changes.
- **Don't** box sections again inside the app's inset panel.
- **Don't** add a second 3D scene or put planes outside the field.
- **Don't** put a kicker or eyebrow label above a heading, or number the sections.
