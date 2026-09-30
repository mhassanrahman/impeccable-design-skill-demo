// Builds compact JSON (and one enriched CSV) for the web app from ../../data/*.csv.
// Usage (from toy-store/):  node web/scripts/build-data.js
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, '..', '..', 'data');
const OUT = path.join(__dirname, '..', 'data');
fs.mkdirSync(OUT, { recursive: true });

function readCsv(file, onRow) {
  const text = fs.readFileSync(path.join(DATA, file), 'utf8').replace(/^﻿/, '');
  let start = text.indexOf('\n') + 1;
  const header = text.slice(0, start).trim().split(',');
  while (start < text.length) {
    let end = text.indexOf('\n', start);
    if (end === -1) end = text.length;
    const line = text.slice(start, end).replace(/\r$/, '');
    if (line) onRow(line.split(',').map(v => v.replace(/^"|"$/g, '')));
    start = end + 1;
  }
  return header;
}
const t0 = Date.now();
const log = msg => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${msg}`);

// ---------- dimensions ----------
const FIRST_MONTH = [2012, 3];
const monthIndex = ts => (+ts.slice(0, 4) - FIRST_MONTH[0]) * 12 + (+ts.slice(5, 7) - FIRST_MONTH[1]);
const months = [];
for (let i = 0; i <= monthIndex('2015-03-01'); i++) {
  const y = FIRST_MONTH[0] + Math.floor((FIRST_MONTH[1] - 1 + i) / 12);
  const m = ((FIRST_MONTH[1] - 1 + i) % 12) + 1;
  months.push(`${y}-${String(m).padStart(2, '0')}`);
}

const products = [];
readCsv('products.csv', ([id, created, name]) => products.push({ id: +id, launched: created, name }));

const DEVICES = ['desktop', 'mobile'];
const LANDINGS = ['/home', '/lander-1', '/lander-2', '/lander-3', '/lander-4', '/lander-5'];
const PRODUCT_PAGES = ['/the-original-mr-fuzzy', '/the-forever-love-bear', '/the-birthday-sugar-panda', '/the-hudson-river-mini-bear'];
const BILLING = ['(none)', '/billing', '/billing-2'];
const STAGES = ['Landing page', 'Products listing', 'Product page', 'Cart', 'Shipping', 'Billing', 'Order placed'];
const STAGE_OF = { '/products': 1, '/cart': 3, '/shipping': 4, '/billing': 5, '/billing-2': 5, '/thank-you-for-your-order': 6 };
PRODUCT_PAGES.forEach(p => (STAGE_OF[p] = 2));

// UTM combos (source/campaign/content + referer-derived organic vs direct)
const utmList = [];
const utmKey = new Map();
function utmOf(src, camp, content, ref) {
  let source = src, campaign = camp, cont = content;
  if (src === 'NULL') { source = ref === 'NULL' ? 'direct' : 'organic'; campaign = '(none)'; cont = '(none)'; }
  const k = `${source}|${campaign}|${cont}`;
  if (!utmKey.has(k)) {
    const channel = source === 'direct' ? 'Direct type-in'
      : source === 'organic' ? 'Organic search'
      : source === 'socialbook' ? 'Paid social'
      : campaign === 'brand' ? 'Paid search - brand' : 'Paid search - nonbrand';
    utmKey.set(k, utmList.length);
    utmList.push({ source, campaign, content: cont, channel });
  }
  return utmKey.get(k);
}

// ---------- sessions ----------
const N = 480000;
const sMonth = new Uint8Array(N), sUtm = new Uint8Array(N), sDev = new Uint8Array(N), sRep = new Uint8Array(N);
const sLand = new Int8Array(N).fill(-1), sProd = new Uint8Array(N), sBill = new Uint8Array(N), sStage = new Uint8Array(N);
const sPv = new Uint16Array(N), sOrder = new Int32Array(N).fill(-1);
const sTs = [], sUser = new Int32Array(N);
let maxSid = 0;
readCsv('website_sessions.csv', ([id, ts, user, rep, src, camp, content, dev, ref]) => {
  const i = +id;
  maxSid = Math.max(maxSid, i);
  sTs[i] = ts; sUser[i] = +user; sMonth[i] = monthIndex(ts);
  sUtm[i] = utmOf(src, camp, content, ref); sDev[i] = DEVICES.indexOf(dev); sRep[i] = +rep;
});
log(`sessions: ${maxSid}`);

readCsv('website_pageviews.csv', ([, , sid, url]) => {
  const i = +sid;
  sPv[i]++;
  if (sLand[i] === -1) sLand[i] = LANDINGS.indexOf(url);
  const st = STAGE_OF[url] || 0;
  if (st > sStage[i]) sStage[i] = st;
  const pp = PRODUCT_PAGES.indexOf(url);
  if (pp >= 0 && !sProd[i]) sProd[i] = pp + 1;
  if (url === '/billing') sBill[i] = 1;
  if (url === '/billing-2') sBill[i] = 2;
});
log('pageviews processed');

// ---------- orders / items / refunds ----------
const orders = { id: [], ts: [], sid: [], uid: [], m: [], utm: [], dev: [], rep: [], land: [], prim: [], items: [], price: [], cogs: [], refund: [], mask: [] };
const orderIdx = new Map();
readCsv('orders.csv', ([id, ts, sid, uid, prim, items, price, cogs]) => {
  const s = +sid;
  orderIdx.set(+id, orders.id.length);
  sOrder[s] = +id;
  orders.id.push(+id); orders.ts.push(ts); orders.sid.push(s); orders.uid.push(+uid); orders.m.push(monthIndex(ts));
  orders.utm.push(sUtm[s]); orders.dev.push(sDev[s]); orders.rep.push(sRep[s]); orders.land.push(sLand[s]);
  orders.prim.push(+prim); orders.items.push(+items); orders.price.push(+price); orders.cogs.push(+cogs);
  orders.refund.push(0); orders.mask.push(0);
});

const items = { id: [], oi: [], prod: [], prim: [], price: [], cogs: [], refund: [], refundTs: [] };
const itemIdx = new Map();
readCsv('order_items.csv', ([id, , oid, prod, prim, price, cogs]) => {
  const oi = orderIdx.get(+oid);
  itemIdx.set(+id, items.id.length);
  items.id.push(+id); items.oi.push(oi); items.prod.push(+prod); items.prim.push(+prim);
  items.price.push(+price); items.cogs.push(+cogs); items.refund.push(0); items.refundTs.push('');
  orders.mask[oi] |= 1 << (+prod - 1);
});

readCsv('order_item_refunds.csv', ([, ts, itemId, oid, amt]) => {
  const ii = itemIdx.get(+itemId);
  items.refund[ii] = +amt; items.refundTs[ii] = ts;
  orders.refund[orderIdx.get(+oid)] = +(orders.refund[orderIdx.get(+oid)] + +amt).toFixed(2);
});
log(`orders: ${orders.id.length}, items: ${items.id.length}`);

// ---------- session cube ----------
// dims: month, utm, device, repeat, landing, productPage, billing, stage, bounce
// measures: sessions, orders, revenue, cogs
const cube = new Map();
let bounceStage0 = 0, stage0 = 0;
for (let i = 1; i <= maxSid; i++) {
  const bounce = sPv[i] === 1 ? 1 : 0;
  if (sStage[i] === 0) { stage0++; bounceStage0 += bounce; }
  const key = [sMonth[i], sUtm[i], sDev[i], sRep[i], sLand[i], sProd[i], sBill[i], sStage[i], bounce].join(',');
  let c = cube.get(key);
  if (!c) cube.set(key, (c = [0, 0, 0, 0]));
  c[0]++;
  if (sOrder[i] >= 0) {
    const oi = orderIdx.get(sOrder[i]);
    c[1]++; c[2] += orders.price[oi]; c[3] += orders.cogs[oi];
  }
}
const cubeRows = [];
for (const [k, v] of cube) cubeRows.push([...k.split(',').map(Number), v[0], v[1], +v[2].toFixed(2), +v[3].toFixed(2)]);
log(`cube rows: ${cubeRows.length} (stage-0 sessions ${stage0}, of which single-pageview ${bounceStage0})`);

// ---------- write ----------
const write = (name, obj) => {
  fs.writeFileSync(path.join(OUT, name), JSON.stringify(obj));
  log(`wrote ${name} (${(fs.statSync(path.join(OUT, name)).size / 1024).toFixed(0)} KB)`);
};
write('meta.json', {
  generatedAt: new Date().toISOString(),
  months, products, devices: DEVICES, landings: LANDINGS, productPages: PRODUCT_PAGES,
  billing: BILLING, stages: STAGES, utm: utmList,
  totals: { sessions: maxSid, orders: orders.id.length, items: items.id.length },
});
write('cube.json', { cols: ['m', 'utm', 'dev', 'rep', 'land', 'prod', 'bill', 'stage', 'bounce', 'sessions', 'orders', 'revenue', 'cogs'], rows: cubeRows });
write('orders.json', orders);
write('items.json', items);

// Joined view: sessions enriched with landing page, funnel depth and order
const out = fs.openSync(path.join(OUT, 'sessions_enriched.csv'), 'w');
let buf = 'website_session_id,created_at,user_id,is_repeat_session,source,campaign,content,channel,device_type,landing_page,pageviews,furthest_step,product_viewed,billing_page,order_id,order_revenue_usd\n';
for (let i = 1; i <= maxSid; i++) {
  const u = utmList[sUtm[i]];
  const oi = sOrder[i] >= 0 ? orderIdx.get(sOrder[i]) : -1;
  buf += [i, sTs[i], sUser[i], sRep[i], u.source, u.campaign, u.content, u.channel, DEVICES[sDev[i]], LANDINGS[sLand[i]], sPv[i],
    STAGES[sStage[i]], sProd[i] ? products[sProd[i] - 1].name : '', sBill[i] ? BILLING[sBill[i]] : '',
    oi >= 0 ? sOrder[i] : '', oi >= 0 ? orders.price[oi] : ''].join(',') + '\n';
  if (buf.length > 1 << 20) { fs.writeSync(out, buf); buf = ''; }
}
fs.writeSync(out, buf);
fs.closeSync(out);
log(`wrote sessions_enriched.csv (${(fs.statSync(path.join(OUT, 'sessions_enriched.csv')).size / 1048576).toFixed(1)} MB)`);
