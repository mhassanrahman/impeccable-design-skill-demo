---
name: Maven Fuzzy Factory analysis
description: An interactive marketing and sales analysis of an online toy store, shipped in the store's own toy box.
colors:
  box-cobalt: "#1e4bd2"
  box-cobalt-deep: "#1638a8"
  box-ink: "#ffffff"
  box-ink-soft: "#dce4ff"
  box-rule: "rgba(255, 255, 255, 0.28)"
  booklet-paper: "#eef1f8"
  window-white: "#ffffff"
  navy-ink: "#14183a"
  ink-secondary: "#474d6d"
  ink-muted: "#5f6687"
  rule: "#dde2ef"
  rule-hover: "#b9c2dc"
  grid: "#e8ebf3"
  wash: "#f4f6fb"
  sticker-yellow: "#ffc61a"
  sticker-yellow-deep: "#f0b400"
  sticker-tint: "#fff4cc"
  good: "#0d7a4a"
  bad: "#c2352b"
  series-1-cobalt: "#1e4bd2"
  series-2-orange: "#e8702a"
  series-3-green: "#15a06e"
  series-4-violet: "#7a4cc4"
  series-5-magenta: "#d9468f"
  series-6-teal: "#0b97b0"
  quiet-bar: "#c3cbe4"
  leak-tint: "#fde7da"
  leak-ink: "#a8481a"
typography:
  display:
    fontFamily: "Archivo, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "2.5rem"
    fontWeight: 800
    lineHeight: 1.06
    letterSpacing: "-0.025em"
    fontVariation: "'wdth' 125"
  headline:
    fontFamily: "Archivo, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 750
    lineHeight: 1.2
    letterSpacing: "-0.015em"
    fontVariation: "'wdth' 112"
  figure:
    fontFamily: "Archivo, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 700
    letterSpacing: "-0.01em"
    fontFeature: "tnum"
    fontVariation: "'wdth' 110"
  title:
    fontFamily: "Archivo, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 700
  dek:
    fontFamily: "Archivo, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  body:
    fontFamily: "Archivo, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "tnum"
  label:
    fontFamily: "Archivo, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    fontFeature: "tnum"
  caption:
    fontFamily: "Archivo, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    fontFeature: "tnum"
rounded:
  window: "18px"
  popover: "14px"
  grid: "12px"
  control: "10px"
  small: "8px"
  track: "6px"
  swatch: "3px"
  pill: "999px"
spacing:
  gutter: "32px"
  gutter-mobile: "16px"
  row-gap: "20px"
  hero-gap: "40px"
  block-gap: "56px"
  block-gap-first: "40px"
  window-pad: "20px 22px"
  window-pad-mobile: "16px"
components:
  window:
    backgroundColor: "{colors.window-white}"
    textColor: "{colors.navy-ink}"
    rounded: "{rounded.window}"
    padding: "20px 22px"
  tab:
    backgroundColor: "{colors.box-cobalt}"
    textColor: "{colors.box-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "8px 14px"
  tab-hover:
    backgroundColor: "{colors.box-cobalt-deep}"
  tab-active:
    backgroundColor: "{colors.window-white}"
    textColor: "{colors.box-cobalt}"
  slicer:
    backgroundColor: "{colors.window-white}"
    textColor: "{colors.navy-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "7px 10px 7px 12px"
  slicer-active:
    backgroundColor: "{colors.sticker-yellow}"
    textColor: "{colors.navy-ink}"
  button-primary:
    backgroundColor: "{colors.box-cobalt}"
    textColor: "{colors.box-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "7px 12px"
  button-primary-hover:
    backgroundColor: "{colors.box-cobalt-deep}"
  button-secondary:
    backgroundColor: "{colors.window-white}"
    textColor: "{colors.navy-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "7px 12px"
  button-link:
    textColor: "{colors.box-cobalt}"
    typography: "{typography.label}"
    rounded: "{rounded.small}"
    padding: "7px 8px"
  chip:
    backgroundColor: "{colors.window-white}"
    textColor: "{colors.navy-ink}"
    rounded: "{rounded.pill}"
    padding: "4px 11px"
  chip-active:
    backgroundColor: "{colors.sticker-yellow}"
  field:
    backgroundColor: "{colors.wash}"
    textColor: "{colors.navy-ink}"
    rounded: "{rounded.small}"
    padding: "7px 9px"
  field-focus:
    backgroundColor: "{colors.window-white}"
  badge:
    backgroundColor: "{colors.wash}"
    textColor: "{colors.ink-secondary}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: "3px 10px"
  table-row-selected:
    backgroundColor: "{colors.sticker-tint}"
---

# Design System: Maven Fuzzy Factory analysis

## Overview

**Creative North Star: "The Fuzzy Factory Toy Box"**

The analysis ships in the store's own packaging. The outside is a bold printed box-front: a full-width cobalt band that carries the headline finding in white expanded type, a ruled contents strip of key figures, and a white window that holds the chart proving the headline. Below it the page opens into the booklet: pale blue-grey paper, sections cut into blocks with deep gaps, and every chart or table set in a white die-cut window with a large radius and a soft shadow. A sticky slicer flap sits between the box and the booklet.

The system is dense but calm. It is a desktop analysis tool first. Colour carries meaning, not decoration: cobalt is the box and the headline's subject, one yellow marks what you have filtered by, and the six-slot series palette is kept for categories. Headlines are live findings that rewrite themselves when filters change, and the marks you did not select fade back instead of disappearing. Motion is limited to short state changes and one headline cross-fade.

The world rejects the sidebar plus KPI-card-grid BI template. Figures sit in a ruled strip on the box-front, not in a row of cards, and navigation is a row of tabs printed on the box, not a sidebar. The world is light-only by decision: there is no dark theme.

**Key Characteristics:**
- A cobalt box-front band holds the lead finding, its key figures and the proof chart; the booklet paper holds the rest.
- White die-cut windows with an 18px radius, no border and a soft navy-tinted shadow hold all data.
- Sticker yellow means "this is what you filtered by" and nothing decorative.
- Archivo on its width axis: expanded black for box headlines, a slightly expanded heavy weight for section findings, normal width for UI, tabular figures everywhere.
- Focus and fade cross-filtering: selected marks keep full colour, the rest drop to about 22% alpha.
- Authored 24px-grid SVG icons with a 2px round stroke.

## Colors

A committed cobalt-and-navy world on cool paper, with one reserved yellow and a six-slot categorical palette validated for colour-vision deficiency.

### Primary
- **Box Cobalt** (`box-cobalt`): The box-front band behind the header, the primary button, links, focus rings on paper, checkbox accents, funnel bars, sort arrows, and the colour of the bars a headline names. It is also series slot 1.
- **Box Cobalt Deep** (`box-cobalt-deep`): Hover on cobalt surfaces (tabs on the box-front, the primary button) and the bear's inner ears.
- **Box Ink** (`box-ink`) and **Box Ink Soft** (`box-ink-soft`): Text on the box-front. White is for headlines, the headline's bold terms and figures. Soft periwinkle is for the dek, figure labels, sub-figures and the credit line.
- **Box Rule** (`box-rule`): The 1px rules of the contents strip on cobalt, printed like a box side panel.

### Secondary
- **Sticker Yellow** (`sticker-yellow`) with **Sticker Yellow Deep** (`sticker-yellow-deep`) as its border: Active filter state. That covers an active slicer button, an active date preset chip, and an active column-filter button on the data tables. **Sticker Tint** (`sticker-tint`) fills the table row that is currently the cross-filter.

### Tertiary (data)
- **Series slots 1 to 6** (`series-1-cobalt` to `series-6-teal`): The categorical order for products, sources, channels, devices and landing pages. Charts assign slots through a fixed mapping, so a category keeps its colour on every page. The palette passes CVD and contrast checks on white for slots 1 to 5. Slot 6 (teal) sits in the CVD warn band: use it only where a legend or a table also identifies the category.
- **Quiet Bar** (`quiet-bar`): The resting tone for single-measure bar charts.
- **Heat** (Box Cobalt as `rgba(30, 75, 210, a)`, alpha capped at 0.4): Heat-map cells in tables.
- **Good** (`good`) and **Bad** (`bad`): Up and down deltas in text only.
- **Leak Tint** (`leak-tint`) and **Leak Ink** (`leak-ink`): The step number of a funnel step flagged as the leak, paired with a series-2 orange bar.

### Neutral
- **Booklet Paper** (`booklet-paper`): The page ground below the box-front. The sticky slicer flap uses it at 96% opacity.
- **Window White** (`window-white`): Every data window, popover, tooltip, slicer, button and sticky table header.
- **Navy Ink** (`navy-ink`): Primary text, figures, chart value labels and category tick labels.
- **Ink Secondary** (`ink-secondary`): Section sub-lines, note labels, default chart text and legends.
- **Ink Muted** (`ink-muted`): Captions, axis ticks, table headers, slicer labels and counts.
- **Rule** (`rule`) and **Rule Hover** (`rule-hover`): Control borders at rest and on hover, the flap's bottom rule, and table header rules.
- **Grid** (`grid`): Chart gridlines and table row rules.
- **Wash** (`wash`): Row hover, field fill, funnel tracks, badges and step numbers.

### Named Rules
**The Sticker Rule.** Sticker yellow marks what is filtered: active slicers, active chips, active column filters, and (as its tint) the cross-filtered table row. The world uses it natively in two other places, and only there: the focus ring on the cobalt box-front, where cobalt would vanish, and the text selection highlight. Never use it for decoration, highlights or data.

**The Emphasis Rule.** A single-measure bar chart is Quiet Bar at rest. Cobalt (series 1) goes on the bars the headline names, and series-2 orange goes on a named problem. Nothing else gets colour. If the headline names nothing, every bar stays quiet.

**The Fixed Slot Rule.** A category's series colour comes from its fixed slot mapping, never from its position in the current chart. Unselected categories fade to about 22% alpha (hex alpha `38`) rather than change hue.

**The Partial Month Rule.** March 2015 holds only 19 days. It is labelled "Mar 2015 (19 days)" (or "Mar 2015*" on narrow screens), its line segment is dashed 4/4, its bars drop to about 33% alpha (hex alpha `55`), and headline comparisons use full months only.

## Typography

**Display Font:** Archivo, variable width 62 to 125 and weight 100 to 900 (with system-ui, -apple-system, Segoe UI, sans-serif)
**Body Font:** Archivo at normal width (same stack)

**Character:** One grotesque family, used on its width axis. Expanded black reads as printed packaging and normal width reads as a precise instrument. Tabular figures are set on the body, so every number in the system lines up.

### Hierarchy
- **Display** (800, 2.5rem, 1.06, width 125%): The box-front headline, which states the live lead finding. Balanced wrap, max 22ch (28ch when it spans the full band). It steps down to 2.125rem at 1100px and 1.75rem at 700px. The brand wordmark uses the same width and weight at 1rem.
- **Headline** (750, 1.375rem, 1.2, width 112%): The finding that heads each booklet block, which is also live text. Balanced wrap, max 80ch for the block head.
- **Figure** (700, 1.375rem, width 110%): The key figures in the box-front contents strip. Their labels and sub-figures are caption size in Box Ink Soft at normal width.
- **Title** (700, 0.9375rem): Window titles, which say what the chart measures.
- **Dek** (400, 1rem, 1.5): The one supporting sentence under the display headline, max 60ch, pretty wrap. It drops to 0.9375rem at 700px.
- **Body** (400, 0.875rem, 1.5): Default text, section sub-lines and note panels (note paragraphs at 0.8125rem, max 48ch).
- **Label** (600, 0.8125rem): Tabs, buttons, slicer values, table cells (at 400) and chart legends (12px, 600).
- **Caption** (400, 0.75rem): Window captions, table headers (600), the credit, the colophon and counts. 0.6875rem is the smallest size, used only for popover field labels, funnel step numbers and funnel sub-values.

### Named Rules
**The Three Widths Rule.** Width 125% at weight 800 is for box headlines and the brand wordmark only. Width 112% is for block headings and 110% for the contents-strip figures. Everything else, all UI included, is at normal width. Never expand a control, a label or body text.

**The Tabular Rule.** Tabular figures are always on. Numeric table columns align right.

## Layout

The page is a 1440px maximum container with a 32px gutter (16px at 700px and below). The box-front hero is a 7:5 grid with a 40px gap and bottom-aligned columns. The finding, dek and contents strip sit on the left and the proof window sits on the right. At 1100px it becomes a single column. The contents strip is an auto-fit grid of cells at least 118px wide, divided by vertical rules. At 700px it becomes two columns with horizontal rules between rows.

The booklet is a stack of blocks: 40px above the first block, then 56px between blocks, with 72px of bottom padding before the colophon. Each block is a head (finding plus sub-line, 16px below) and a 12-column row with a 20px gap. Windows span 12, 8+4, 7+5 or 6+6. The 4-column partner is often a ruled note panel of term and value pairs rather than a second window. Every row collapses to full width at 1100px.

The slicer flap is sticky at the top of the viewport. At 700px it scrolls sideways on one line with its hint text hidden, and the tab row scrolls sideways too. Chart heights are fixed per window: 240px (short), 280px (default) and 340px (tall).

## Elevation & Depth

Depth is a soft, hybrid system. Paper is the ground, white windows float just above it on a diffuse navy-tinted shadow, and active controls lift a little further. There are no borders on windows and no hard offset shadows. Borders belong to controls, the full-page data grid and rules.

### Shadow Vocabulary
- **Window** (`box-shadow: 0 1px 2px rgba(20, 24, 58, 0.05), 0 10px 30px -12px rgba(20, 24, 58, 0.14)`): Every data window on paper.
- **Window on Box** (`box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12), 0 18px 36px -16px rgba(0, 0, 0, 0.35)`): The proof window on the cobalt band, which needs a deeper cast to read against a saturated ground.
- **Lift** (`box-shadow: 0 1px 1px rgba(20, 24, 58, 0.08), 0 6px 16px rgba(20, 24, 58, 0.16)`): Active items. That means the current tab, and an active slicer (together with a 1px upward translate).
- **Popover** (`box-shadow: 0 2px 4px rgba(20, 24, 58, 0.06), 0 18px 40px -10px rgba(20, 24, 58, 0.28)`): Slicer and column-filter popovers.

### Named Rules
**The Cast Shadow Rule.** Only an active item lifts. Resting controls stay flat with a 1px rule, and the lift is a soft cast shadow, never a hard offset.

## Shapes

Corners are generous and friendly, like die-cut card. Windows are 18px, popovers 14px, the full-page data grid 12px, and controls (tabs, slicers, buttons, toolbar selects) 10px. Small interior items such as options, fields and link buttons are 8px. Tracks, bars, focus rings and icon buttons are 6px, and swatches and legend boxes are 3px. Chips and badges are full pills. Unstacked chart bars get a 5px radius on their value end. Stacked segments get 2px with a 1.5px white seam between them. Funnel step numbers are circles.

Icons are authored on a 24px grid with a 2px round-capped, round-joined stroke and no fill. They render at 16px, or 13 to 15px inside controls. The brand mark is a flat cobalt-and-white bear face.

## Components

### Buttons
Compact and quiet. Colour appears only on the primary action.
- **Shape:** Softly rounded (10px).
- **Primary:** Box Cobalt with white label text at 600 weight, 7px 12px padding, hovering to Box Cobalt Deep.
- **Secondary:** White with a 1px Rule border. The border darkens to Rule Hover on hover. Disabled buttons drop to 45% opacity.
- **Link button:** No fill, a cobalt label with an optional icon, and a white fill on hover (used for "Reset filters", shown only while a filter is set).
- **Focus:** A 2px cobalt outline with a 2px offset. On the box-front the outline is sticker yellow.

### Slicers (signature)
The filter flap is the product's main control and follows the Power BI model.
- **Rest:** A white 10px button with a muted label, a bold value and a chevron.
- **Open:** Cobalt border while its popover is open.
- **Active:** A sticker-yellow fill with a deeper yellow border, Lift, and a 1px rise. The label and icon turn navy.
- **Popover:** 280px wide on white, 14px radius, Popover shadow, entering with a 180ms fade and 4px drop. Options are checkbox rows with a test-strip preview. Each row shows the session count it would leave given every other slicer, plus a 3px cobalt bar at 55% opacity. Options that would leave nothing are muted.

### Chips
- **Style:** Pill, white, 1px Rule border, 0.75rem at 600 weight.
- **State:** Active chips take the sticker-yellow fill. They are used for date presets.

### Cards / Containers (windows)
- **Corner Style:** 18px.
- **Background:** Window White.
- **Shadow Strategy:** Window, or Window on Box on the cobalt band (see Elevation & Depth).
- **Border:** None.
- **Internal Padding:** 20px 22px, or 16px at 700px. A title and a muted caption sit above the chart. The caption says what to click when the chart cross-filters.

### Inputs / Fields
- **Style:** Wash fill, 1px Rule border, 8px radius. Selects are white with an authored chevron. Toolbar selects use the 10px control radius and 600 weight.
- **Focus:** The border turns cobalt and the fill turns white.

### Navigation
Tabs printed on the box-front: white 600-weight labels with 8px 14px padding and a 10px radius. They hover to Box Cobalt Deep. The current page is a white tab with cobalt text and Lift. On mobile the tab row scrolls sideways.

### Data tables
0.8125rem cells with 9px 12px padding and Grid row rules. Headers are muted, 0.75rem, 600 weight and sticky on white. Rows take a wash on hover. A cross-filtered row takes Sticker Tint and the other rows fade to 50%. On the full data grid, headers carry a sort arrow and a column-filter button, which turns sticker yellow when that column is filtered. Long tables in a window fade out at the bottom as a scroll cue. Loading uses a shimmer skeleton, and empty results give a plain sentence that says how to widen the filters.

### Charts
Chart.js themed from the tokens. Archivo at 12px, Ink Secondary text, Grid gridlines, no axis borders or tick marks, and Ink Muted ticks. Category ticks on bar charts are navy at 600 weight. Legends sit top left with 10px rounded-square boxes. Tooltips are white with a Rule border and a 10px radius. Lines are 2px with no points at rest, and horizontal bars carry end value labels in navy at 600 weight. Month axes always keep the first and the partial last month. Charts that cross-filter show a pointer on marks.

### Funnel
Numbered steps, because the steps are a real sequence: a cobalt-on-wash circled number, the step name, a 22px wash track with a cobalt bar that scales from the left over 350ms, and a right-aligned value with its rate. The leak step switches to the orange bar and the leak-tint number.

### Motion
State changes run for 200ms on `cubic-bezier(0.16, 1, 0.3, 1)`. Chart updates animate for 220ms (ease-out quart) and never on first render. When filters change, live headlines fade to 35% for 140ms, swap their text and fade back. Reduced motion removes all transitions and animations.

## Do's and Don'ts

### Do:
- **Do** put the lead finding on the cobalt box-front in expanded 800-weight type, with the chart that proves it in a white window beside it.
- **Do** write block headings as findings that update with the filters, not as topic labels.
- **Do** hold every chart and table in a white window (18px radius, no border, Window shadow) on booklet paper.
- **Do** colour single-measure bars Quiet Bar, with cobalt only on what the headline names and series-2 orange only on a named problem.
- **Do** keep each category on its fixed series slot across pages, and pair slot 6 (teal) with a legend or table.
- **Do** fade unselected marks to about 22% alpha when cross-filtering instead of removing them.
- **Do** label, dash or lighten the partial month (Mar 2015, 19 days) wherever it appears.
- **Do** use authored 24px-grid SVG icons with a 2px round stroke.

### Don't:
- **Don't** use sticker yellow for anything except active filter state, the focus ring on the cobalt band, and text selection.
- **Don't** build a sidebar or a grid of KPI cards. Key figures go in the ruled contents strip.
- **Don't** expand the font width for controls, labels or body text.
- **Don't** add borders to windows or use hard offset shadows. Only active items lift.
- **Don't** add a dark theme. The world is light-only by decision.
