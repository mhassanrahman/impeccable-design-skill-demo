let landSel = []; // page-level cross-filter (landing page indexes)

TS.start(function render(f) {
  const { meta, C, fmt } = TS;
  const n = f.to - f.from + 1;
  const L = meta.landings, S = meta.stages;
  const acc = () => ({ s: 0, o: 0, r: 0, b: 0 });

  const stage = new Array(S.length).fill(0);
  const land = L.map(acc), landTrend = L.map(() => new Array(n).fill(0));
  const bill = [acc(), acc(), acc()];
  const pp = meta.productPages.map(() => ({ s: 0, cart: 0, o: 0 }));
  let total = 0, orders = 0;

  for (const r of TS.cubeRows()) {
    const s = r[C.sessions], li = r[C.land], a = land[li];
    a.s += s; a.o += r[C.orders]; a.r += r[C.revenue]; if (r[C.bounce]) a.b += s;
    landTrend[li][r[C.m] - f.from] += s;
    if (landSel.length && !landSel.includes(li)) continue;
    total += s; orders += r[C.orders];
    for (let k = 0; k <= r[C.stage]; k++) stage[k] += s;
    if (r[C.bill]) { const b = bill[r[C.bill]]; b.s += s; b.o += r[C.orders]; b.r += r[C.revenue]; }
    if (r[C.prod]) { const p = pp[r[C.prod] - 1]; p.s += s; p.o += r[C.orders]; if (r[C.stage] >= 3) p.cart += s; }
  }
  const cvr = a => TS.div(a.o, a.s);
  const live = L.map((_, i) => i).filter(i => land[i].s > 0);
  const scope = landSel.length ? ` from ${landSel.map(i => L[i]).join(' + ')}` : '';

  // biggest leak between consecutive steps
  let leak = 1;
  for (let k = 1; k < S.length; k++) if (TS.div(stage[k], stage[k - 1]) < TS.div(stage[leak], stage[leak - 1])) leak = k;
  const eligible = live.filter(i => land[i].s >= 500);
  const byCvr = [...eligible].sort((a, b) => cvr(land[b]) - cvr(land[a]));

  // ---------- insight text ----------
  if (!total) {
    TS.say('headline', 'Nothing to analyse yet');
    TS.say('dek', TS.noData);
  } else {
    TS.say('headline', `The biggest leak is <b>${S[leak - 1].toLowerCase()} → ${S[leak].toLowerCase()}</b>: ${fmt.pct(1 - TS.div(stage[leak], stage[leak - 1]), 0)} of visitors${scope} stop there.`);
    const parts = [];
    if (byCvr.length > 1) {
      const hi = byCvr[0], lo = byCvr[byCvr.length - 1];
      parts.push(`<b>${L[hi]}</b> converts at ${fmt.pct(cvr(land[hi]), 1)}, ${fmt.x(TS.div(cvr(land[hi]), cvr(land[lo])))} the ${fmt.pct(cvr(land[lo]), 1)} of ${L[lo]}.`);
    }
    if (bill[1].s >= 100 && bill[2].s >= 100) parts.push(`The /billing-2 redesign turns <b>${fmt.pct(cvr(bill[2]), 0)}</b> of billing visits into orders, against ${fmt.pct(cvr(bill[1]), 0)} for /billing.`);
    else parts.push(`Overall, ${fmt.pct(TS.div(orders, total), 2)} of ${fmt.int(total)} sessions${scope} ended in an order.`);
    TS.say('dek', parts.join(' '));
  }

  TS.kpis('kpis', [
    { label: 'Sessions', value: fmt.int(total), sub: landSel.length ? `${landSel.length} landing page${landSel.length > 1 ? 's' : ''}` : 'All landing pages' },
    { label: 'Saw products', value: fmt.pct(TS.div(stage[1], total), 0) },
    { label: 'Reached cart', value: fmt.pct(TS.div(stage[3], total), 0) },
    { label: 'Reached billing', value: fmt.pct(TS.div(stage[5], total), 0) },
    { label: 'Ordered', value: fmt.pct(TS.div(orders, total), 2), sub: `${fmt.int(orders)} orders` },
  ]);

  document.getElementById('funnel-cap').textContent = `Sessions${scope} reaching each step · the biggest drop is marked in orange`;
  document.getElementById('funnel').innerHTML = S.map((name, k) => {
    const v = stage[k], w = TS.div(v, stage[0]) * 100 || 0;
    const step = k ? `${fmt.pct(TS.div(v, stage[k - 1]), 0)} of prev.` : 'start';
    return `<div class="f-row ${k === leak && total ? 'leak' : ''}" title="${name}: ${fmt.int(v)} sessions (${fmt.pct(w / 100)})">
      <span class="f-no">${k + 1}</span><span class="f-name">${name}</span>
      <div class="f-track"><div class="f-bar" style="transform:scaleX(${Math.max(w, 0.8) / 100})"></div></div>
      <span class="f-val">${fmt.int(v)}<small>${step}</small></span></div>`;
  }).join('');

  // ---------- landing pages ----------
  const lcolor = i => TS.color(TS.slot.landing(i));
  TS.say('h-land', byCvr.length ? `${L[byCvr[0]]} is the strongest landing page, converting ${fmt.pct(cvr(land[byCvr[0]]), 1)} of its visitors` : 'Landing page performance');
  TS.table('t-land', [
    { label: 'Landing page', cls: 'strong', render: r => `<span class="swatch" style="background:${lcolor(r.i)}"></span>${L[r.i]}` },
    { label: 'Sessions', num: 1, render: r => fmt.int(r.s) },
    { label: 'Bounce', num: 1, render: r => fmt.pct(TS.div(r.b, r.s)) },
    { label: 'Conversion', num: 1, render: r => fmt.pct(cvr(r), 2) },
    { label: 'Rev / session', num: 1, render: r => fmt.usd2(TS.div(r.r, r.s)) },
  ], live.map(i => ({ i, ...land[i] })), { onRow: (r, more) => toggleLand(r.i, more), isSelected: r => landSel.includes(r.i) });

  const hbar = (id, label, data, fmtV, tip, colors) => TS.chart(id, {
    type: 'bar',
    data: { labels: live.map(i => L[i]), datasets: [{ label, data, backgroundColor: colors }] },
    options: {
      indexAxis: 'y',
      scales: { x: { beginAtZero: true, ticks: { callback: v => fmt.pct(v, 0) } }, y: { grid: { display: false }, ticks: { color: TS.css('--ink'), font: { weight: 600 } } } },
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: tip } } },
    },
    endLabels: { pad: 56, format: fmtV, faded: i => landSel.length && !landSel.includes(live[i]) },
    onPick: (el, more) => toggleLand(live[el.index], more),
  });
  hbar('c-lcvr', 'Conversion rate', live.map(i => cvr(land[i])), v => fmt.pct(v, 1), c => `Conversion ${fmt.pct(c.raw, 2)} of ${fmt.int(land[live[c.dataIndex]].s)} sessions`,
    TS.emphasis(live, landSel.length ? landSel : byCvr.slice(0, 1)));
  const byBounce = [...eligible].sort((a, b) => TS.div(land[a].b, land[a].s) - TS.div(land[b].b, land[b].s));
  TS.say('h-bounce', byBounce.length > 1
    ? `${L[byBounce[0]]} holds attention best: only ${fmt.pct(TS.div(land[byBounce[0]].b, land[byBounce[0]].s), 0)} bounce, against ${fmt.pct(TS.div(land[byBounce[byBounce.length - 1]].b, land[byBounce[byBounce.length - 1]].s), 0)} on ${L[byBounce[byBounce.length - 1]]}`
    : 'Bounce rate by landing page');
  hbar('c-bounce', 'Bounce rate', live.map(i => TS.div(land[i].b, land[i].s)), v => fmt.pct(v, 0), c => `Bounce ${fmt.pct(c.raw, 1)}`,
    TS.emphasis(live, landSel.length ? landSel : byBounce.slice(0, 1), landSel.length ? [] : byBounce.slice(-1)));
  TS.chart('c-ltrend', {
    type: 'bar',
    data: { labels: TS.monthLabels(), datasets: live.map(i => ({ label: L[i], data: landTrend[i], backgroundColor: TS.dimColors(lcolor(i), [i], landSel)[0] })) },
    options: {
      scales: { x: { stacked: true, grid: { display: false }, ticks: { maxRotation: 0, autoSkipPadding: 18 } }, y: { stacked: true, ticks: { callback: fmt.compact } } },
      plugins: { tooltip: { mode: 'index', callbacks: { label: c => `${c.dataset.label}: ${fmt.int(c.raw)}` } } },
    },
    onPick: (el, more) => toggleLand(live[el.datasetIndex], more),
  });

  // ---------- billing test + product pages ----------
  const b1 = bill[1], b2 = bill[2];
  TS.say('h-bill', b1.s >= 100 && b2.s >= 100
    ? `/billing-2 turns ${fmt.pct(cvr(b2), 0)} of billing visits into orders, ${fmt.x(TS.div(cvr(b2), cvr(b1)))} the original page`
    : b2.s || b1.s ? `${b2.s ? '/billing-2' : '/billing'} converts ${fmt.pct(cvr(b2.s ? b2 : b1), 0)} of billing visits into orders` : 'No billing visits in this selection');
  TS.table('t-bill', [
    { label: 'Billing page', cls: 'strong', render: r => r.name },
    { label: 'Sessions', num: 1, render: r => fmt.int(r.s) },
    { label: 'Orders', num: 1, render: r => fmt.int(r.o) },
    { label: 'Billing → order', num: 1, cls: 'strong', render: r => fmt.pct(cvr(r)) },
    { label: 'Rev / billing visit', num: 1, render: r => fmt.usd2(TS.div(r.r, r.s)) },
  ], [1, 2].map(b => ({ name: meta.billing[b], ...bill[b] })).filter(r => r.s));

  const ppRows = pp.map((p, i) => ({ i, ...p })).filter(r => r.s);
  const bestPp = [...ppRows].filter(r => r.s >= 200).sort((a, b) => TS.div(b.cart, b.s) - TS.div(a.cart, a.s))[0];
  document.getElementById('h-pp').textContent = bestPp
    ? `${TS.shortName(meta.products[bestPp.i].name)} sends the most viewers to cart (${fmt.pct(TS.div(bestPp.cart, bestPp.s), 0)})`
    : 'Product page click-through';
  TS.table('t-pp', [
    { label: 'Product page', cls: 'strong', render: r => `<span class="swatch" style="background:${TS.color(TS.slot.product(r.i + 1))}"></span>${TS.esc(TS.shortName(meta.products[r.i].name))}` },
    { label: 'Sessions', num: 1, render: r => fmt.int(r.s) },
    { label: '→ Cart', num: 1, render: r => fmt.pct(TS.div(r.cart, r.s)) },
    { label: '→ Order', num: 1, render: r => fmt.pct(TS.div(r.o, r.s)) },
  ], ppRows, { onRow: (r, more) => TS.crossFilter('product', r.i + 1, more), isSelected: r => f.product.includes(r.i + 1) });

  function toggleLand(i, more) {
    if (more) landSel = landSel.includes(i) ? landSel.filter(x => x !== i) : [...landSel, i];
    else landSel = landSel.length === 1 && landSel[0] === i ? [] : [i];
    render(f);
  }
});
