# Toy Store Analytics (web)

A simple HTML/JS dashboard over the Maven Fuzzy Factory CSVs in `../data`.
Table relationships are documented in [`../docs/tables-schema.md`](../docs/tables-schema.md).

## Run locally

From the `toy-store/` folder:

```bash
node web/scripts/build-data.js
```

```bash
node web/serve.js
```

Then open <http://localhost:5500/web/>.

- Re-run the build step only when the CSVs change. It takes about 2 seconds and writes to `web/data/`, which git ignores.
- The server has no dependencies. It serves the whole `toy-store/` folder so the **Data Tables** page can read the raw CSVs from `../data`.
  Any static server rooted at `toy-store/` works too, for example `python -m http.server 5500`.
- Charts use Chart.js from cdnjs, so the first load needs an internet connection.

## Pages

| Page | What it shows |
|---|---|
| **Overview** (`index.html`) | KPIs, revenue and gross profit trend, revenue by product, sessions by channel, conversion trend, monthly table |
| **Products** | Revenue by product and month, units, refund rate trend, cross-sell matrix, product summary |
| **Traffic** | Sessions by source, source trend, conversion by source and device, conversion by device over time, campaign table |
| **Website Funnel** | Landing → order funnel, landing page A/B results, landing page traffic over time, billing A/B test, product page click-through |
| **Data Tables** | Raw tables and joined views, with Excel-style column filters, sorting, search, paging and CSV export |

## Slicers (Power BI style)

The slicer bar filters every page: **Date** (month range), **Product**, **Source**, **Campaign**, **Device** and **Visitor** (new vs repeat).

- Selections are saved in the browser and carry over between pages.
- Click a bar or table row to cross-filter by it. Click it again to clear. Ctrl/Shift+click adds to the selection.
- The Product slicer keeps orders that *contain* the product. For session metrics it keeps sessions that *viewed that product's page*.
- The Funnel page also has a page-level landing page filter: click a landing page row or bar.
- On Data Tables, the badge shows which slicers apply to the current table. Turn off **Apply slicers** to see every row.
  Raw `website_pageviews` supports the date slicer only, and `products` and the data dictionary are never sliced.

## Files

```
web/
├── index.html, products.html, traffic.html, funnel.html, tables.html
├── css/style.css            # light/dark theme tokens + layout
├── js/core.js               # data loading, slicers, filter predicates, chart helpers
├── js/<page>.js             # one script per page
├── scripts/build-data.js    # CSV → web/data/*.json (+ sessions_enriched.csv)
├── serve.js                 # zero-dependency static server
└── data/                    # generated (git-ignored)
    ├── meta.json            # months, products, UTM combos, labels
    ├── cube.json            # session aggregates by month × utm × device × repeat × landing × product page × billing × funnel step
    ├── orders.json          # one row per order, joined with session attributes and refunds
    ├── items.json           # one row per order item, with refunds
    └── sessions_enriched.csv  # joined view for the Data Tables page
```

Note: March 2015 is a partial month, because the data ends on 2015-03-19.
