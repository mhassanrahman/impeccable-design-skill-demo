---
version: 1
slug: "web-index-html"
primary_target: "web/index.html"
related_targets: ["web/products.html","web/traffic.html","web/funnel.html","web/tables.html"]
---

# Surface brief: Toy Store Analytics web app

Scope: all five pages in `web/` (Overview, Products, Traffic, Website Funnel, Data Tables), sharing one shell.
Visitor mode: Operate. The site is a portfolio showcase, so the skim has to land within seconds.

Audience and job: recruiters and hiring managers skim for proof of analytical rigor, then poke the slicers and tables to test depth. The author also presents it on screen shares.
Task and proof: every page leads with 2–3 computed findings in plain English that update with the slicers, followed by the charts that prove them. The spine is marketing efficiency (channels, campaigns, devices, landing pages → conversion and revenue per session).
Constraints: keep all five pages and all current functionality. Keep plain HTML/JS with Chart.js. No fabricated figures, and no spend-based metrics (the data has no spend). Credit line: "Analysis & build by Hassan Rahman · Data: Maven Analytics".
Avoid: generic BI template, too dense.

## Direction contract

THESIS: The analysis ships in the store's own toy box. The outside is a bold printed box-front carrying the headline finding, and the inside is a booklet of findings, each proven in a white die-cut window. It refuses the sidebar + KPI-card-grid BI template.

OWN-WORLD: Committed cobalt boxboard #1E4BD2 owns the header box-front. Booklet paper #EEF1F8 is the page ground, and white die-cut windows (large radius, no border, soft shadow) hold the data. Ink is navy #14183A. Sticker yellow #FFC61A is reserved for active filter state only. Archivo is used expanded/black for box headlines and normal width for UI, with tabular figures. Contents strips are ruled like a box side panel. Icons are authored SVG with 2px strokes.

STORY: The visitor reads the finding, sees the chart that proves it, then filters. The headline rewrites itself, so they believe the numbers are live and rigorous. They click marks to cross-filter.

FIRST VIEWPORT: The cobalt box-front band spans full width. The brand lockup and nav tabs sit top-left, with the credit and data-through date on the right. A white expanded headline states the lead marketing finding (≈2.6rem) with one supporting sentence below, and a ruled white contents strip holds 6 KPIs. A white window on the right holds the channel chart. The sticky slicer flap sits directly beneath the band.

FORM: The Fuzzy Factory Toy Box: grounded list position 6, seed key 80bf8c5f. Raises: focus-and-fade cross-filtering (ikeda), test-strip preview counts in slicers (darkroom), yellow reserved for the control (drawcord), active items lift with a soft cast shadow (leather; translated from the hard offset shadow, per the craft floor), and sections cut into blocks with deep gaps (cloud quarry). Signature interaction: selecting a slicer or mark rewrites every headline finding while the unselected marks fade. Motion grammar: 200ms ease-out state changes only, plus one headline cross-fade on filter change.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
