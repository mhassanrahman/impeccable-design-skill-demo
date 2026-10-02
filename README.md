# impeccable-design-apps

A demo of designing a real interface with **Impeccable** inside **Claude Code**. It shows how a person steers the design, from a first brief to refining one specific component, by talking to Claude.

The subject is Toy Store Analytics: an interactive dashboard over the Maven Analytics "Maven Fuzzy Factory" dataset (Mar 2012 to Mar 2015: 473K sessions, 32K orders, 4 products). It is static HTML, vanilla JS and CSS with no framework and no dependencies. It runs locally only and is never deployed.

## Quick start

Run from the repo root. Requires Node.

```bash
node web/scripts/build-data.js   # CSV -> web/data/*.json (about 2s; re-run only when the CSVs change)
node web/serve.js                # http://localhost:5500/web/
```

`web/data/` is generated and git-ignored, so build before the first serve. Charts load Chart.js from cdnjs and the Archivo font from Google Fonts, so the first load needs internet. There is no test suite or bundler; check JS syntax with `node --check web/js/<file>.js`.

## Designing with Impeccable

Impeccable is a skill for Claude Code. There is nothing to install in this repo: open Claude Code in the repo root and type `/impeccable` followed by what you want. The repo only stores the context Impeccable reads, so its decisions stay consistent from session to session.

| File | Role |
|---|---|
| [`PRODUCT.md`](PRODUCT.md) | Who the users are, what the product is for, and constraints |
| [`DESIGN.md`](DESIGN.md) | The visual system: tokens, type, colour rules |
| `.impeccable/design.json`, `.impeccable/surfaces/` | Machine-readable design context and per-page briefs |

### 1. Direct the design with commands

Name a command and, optionally, a target. Claude loads that command's playbook and applies it to your code.

```
/impeccable critique web/index.html      # UX review with heuristic scoring
/impeccable audit                        # accessibility, performance, responsive checks
/impeccable typeset the headline         # fix type hierarchy and fonts
/impeccable colorize                     # add strategic colour
/impeccable bolder                       # amplify a safe or bland design
/impeccable quieter                      # tone down a loud one
/impeccable polish                       # final pass before shipping
```

Others include `layout`, `distill`, `clarify`, `harden`, `adapt`, `animate`, `delight`, `overdrive` and `extract`. Run `/impeccable` with no argument for a menu based on the project's current state.

### 2. Instruct the agent about one component with `live`

`live` is for changes to a single element. You point at it in the browser, and Claude writes variants of just that element into the real source.

1. Start the app (`node web/serve.js`), then in Claude Code run `/impeccable live`. Claude boots a small helper and starts listening for your actions in the background.
2. Open <http://localhost:5500/web/>. The Impeccable bar appears on the page. Its scope is set in [`.impeccable/live/config.json`](.impeccable/live/config.json), currently `web/*.html`.
3. Click the element you want to change, such as a KPI card, a chart panel or the slicer bar.
4. Pick an action (`bolder`, `quieter`, `distill`, `polish`, `typeset`, `colorize`, `layout`, `adapt`, `animate`, `delight`, `overdrive`), or type a free-form instruction such as "make the headline number the hero". You can also annotate the element with comments, arrows and loops to show what you mean.
5. Press **Go**. Claude generates three variants, each taking a different design direction, and hot-swaps them into the page. Cycle through them in place.
6. Use the knobs on each variant (for example density or colour amount) to tune it without asking again.
7. **Accept** the one you want and Claude writes it into the real HTML and CSS, or **discard** to restore the original.

While live is running:

- **Steer** sends page-level direction, such as "tighten the spacing everywhere", not tied to one element.
- Variants stay inside the existing identity from `DESIGN.md`. Ask explicitly for a redesign if you want a different look.
- It needs a local checkout and does not work on a deployed site.
- To stop, tell Claude, close the tab, or use the bar's exit button. Claude then removes the injected script and any leftover variant wrappers.

### 3. Keep the context current

- `/impeccable document` regenerates `DESIGN.md` from the shipped code, so the design record matches what is on screen.
- `/impeccable doctor` reports drift between the Impeccable files and the installed version.

## Layout

```
data/        Raw Maven Fuzzy Factory CSVs (source of truth)
docs/        tables-schema.md (data model), impeccable-design.pptx
web/         The app: 5 pages, css/style.css, js/core.js + one js file per page
             See web/README.md for pages, slicers and generated-data details
PRODUCT.md   Product context: users, purpose, constraints
DESIGN.md    Visual system: tokens, type, colour rules
.impeccable/ Impeccable context and live-mode config (session artifacts are git-ignored)
```

## Conventions

- **Pages:** Overview, Products, Traffic, Website Funnel and Data Tables must all stay.
- **Slicers:** Date, Product, Source, Campaign, Device and Visitor apply on every page, persist in the browser, and are implemented in `web/js/core.js`. Per-page logic goes in that page's own script.
- **Data flow:** pages read the pre-built JSON from `web/data/`. Only Data Tables reads raw CSVs from `data/` directly, which is why the server is rooted at the repo root.
- **Visual changes:** follow `DESIGN.md` (light theme only) and the context in `PRODUCT.md`.
- **Data caveat:** March 2015 is a partial month, because the data ends on 2015-03-19.

## Docs

- [`web/README.md`](web/README.md): pages, slicer behaviour, generated files
- [`docs/tables-schema.md`](docs/tables-schema.md): table relationships and integrity checks
- [`PRODUCT.md`](PRODUCT.md), [`DESIGN.md`](DESIGN.md): product and design context
