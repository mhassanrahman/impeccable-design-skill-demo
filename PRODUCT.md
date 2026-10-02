# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack
Static HTML pages with vanilla JS and CSS (the user chose "simple HTML pages" in the first session). Data is pre-built into JSON by `web/scripts/build-data.js` and served locally by `web/serve.js`. Chart.js is loaded from a CDN. The app always runs locally and is never deployed.

## Users
The site is a **portfolio / showcase piece**. It shows the author's data-analysis and data-product design skills to recruiters, hiring managers and prospective clients. Those visitors skim first. They need to see within seconds that this is serious, rigorous analysis, and then they may click around the slicers and tables to test its depth. The author also uses it themselves when presenting the work.

## Product Purpose
An interactive analysis of the Maven Analytics "Maven Fuzzy Factory" dataset. The data comes from an online toy store and covers Mar 2012 to Mar 2015: 473K sessions, 1.19M pageviews, 32K orders, 4 products. The site tells the story of the business through data. Success means a visitor leaves convinced the author can turn raw relational data into clear, trustworthy, decision-ready insight.

## Positioning
Most portfolio dashboards are static screenshots or BI embeds. This one is hand-built and fully interactive. It has Power BI-style cross-filtering slicers that work across every page, Excel-style column filters on the raw tables and joined views, and a documented data model with integrity checks (`docs/tables-schema.md`).

## Operating Context
- Visitors open it in a desktop browser, usually from a portfolio link or during a screen share or interview.
- Its primary analytic lens is **marketing efficiency**: which channels, campaigns, devices and landing pages drive traffic that converts and pays.
- Growth, product mix and the website-funnel story support that lens.

## Capabilities and Constraints
- Pages that must all stay: Overview, Products, Traffic, Website Funnel, Data Tables.
- Global slicers: Date (month range), Product, Source, Campaign, Device and Visitor. They persist across pages, and clicking a chart or table row cross-filters.
- Data Tables: 7 raw tables and 3 joined views, with column filters, sort, search, paging and CSV export.
- Terminology: session, order, conversion rate (orders ÷ sessions), AOV, revenue per session, gross profit/margin, refund rate, bounce rate, channel (Paid search – nonbrand, Paid search – brand, Paid social, Organic search, Direct type-in).
- The data has no ad-spend or cost-per-click figures, so ROAS or CAC can't be computed and must not be fabricated. Revenue per session is the efficiency proxy.
- March 2015 is a partial month, because the data ends on 2015-03-19.

## Brand Commitments
Data source attribution: Maven Analytics (Maven Fuzzy Factory dataset). No other brand assets exist.

## Evidence on Hand
- Raw data: `data/*.csv`. The data dictionary is `data/maven_fuzzy_factory_data_dictionary.csv`.
- Schema and relationships: `docs/tables-schema.md`.
- Every figure shown must be computed from the data. No invented benchmarks, testimonials or claims.

## Product Principles
1. **Insight before chrome.** Every view leads with the conclusion the data supports, then lets the visitor verify it.
2. **Trust is the product.** Definitions are visible, numbers reconcile, and nothing is estimated without saying so.
3. **Marketing efficiency is the spine.** Tie traffic back to conversion and revenue per session wherever possible.
4. **Depth on demand.** A quick skim tells the story, and slicers and tables reward the visitor who digs in.
