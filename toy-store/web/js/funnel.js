let landSel = []; // page-level cross-filter (landing page indexes)

TS.start(function render(f) {
  const { meta, C, fmt } = TS;
  const n = f.to - f.from + 1;
  const L = meta.landings, S = meta.stages;
  const rows = TS.cubeRows();
  const acc = () => ({ s: 0, o: 0, r: 0, b: 0 });

  const stageCount = new Array(S.length).fill(0);
  const land = L.map(acc), landTrend = L.map(() => new Array(n).fill(0));
  const bill = [acc(), acc(), acc()];
  const pp = meta.productPages.map(() => ({ s: 0, cart: 0, o: 0 }));
  let total = 0, orders = 0;

  for (const r of rows) {
    const s = r[C.sessions], li = r[C.land];
    const a = land[li];
    a.s += s; a.o += r[C.orders]; a.r += r[C.revenue]; if (r[C.bounce]) a.b += s;
    landTrend[li][r[C.m] - f.from] += s;
    if (landSel.length && !landSel.includes(li)) continue;
    total += s; orders += r[C.orders];
    for (let k = 0; k <= r[C.stage]; k++) stageCount[k] += s;
    if (r[C.bill]) { const b = bill[r[C.bill]]; b.s += s; b.o += r[C.orders]; b.r += r[C.revenue]; }
    if (r[C.prod]) { const p = pp[r[C.prod] - 1]; p.s += s; p.o += r[C.orders]; if (r[C.stage] >= 3) p.cart += s; }
  }

  TS.kpis('kpis', [
    { label: 'Sessions', value: fmt.int(total), sub: landSel.length ? 'Selected landing pages' : 'All landing pages' },
    { label: 'Reached products', value: fmt.pct(TS.div(stageCount[1], total)) },
    { label: 'Reached cart', value: fmt.pct(TS.div(stageCount[3], total)) },
    { label: 'Reached billing', value: fmt.pct(TS.div(stageCount[5], total)) },
    { label: 'Conversion rate', value: fmt.pct(TS.div(orders, total), 2), sub: `${fmt.int(orders)} orders` },
  ]);

  // Funnel (HTML bars, direct-labelled)
  document.getElementById('funnel-desc').textContent =
    'Sessions reaching each step · % of all sessions · click-through from the previous step' +
    (landSel.length ? ` · landing page: ${landSel.map(i => L[i]).join(', ')}` : '');
  document.getElementById('funnel').innerHTML = S.map((name, k) => {
    const v = stageCount[k], w = TS.div(v, stageCount[0]) * 100 || 0;
    const ctr = k ? `<span class="pct">${fmt.pct(TS.div(v, stageCount[k - 1]))} of prev.</span>` : '';
    return `<div class="f-row" title="${name}: ${fmt.int(v)} sessions">
      <div class="f-name">${name}</div>
      <div class="f-track"><div class="f-bar" style="width:${w}%"></div></div>
      <div class="f-val">${fmt.int(v)} <span class="pct">${fmt.pct(w / 100)}</span>${ctr ? '<br>' + ctr : ''}</div></div>`;
  }).join('');

  const live = L.map((_, i) => i).filter(i => land[i].s > 0);
  const lcolor = i => TS.color(TS.slot.landing(i));
  TS.table('t-land', [
    { label: 'Landing page', render: r => `<span class="swatch" style="background:${lcolor(r.i)}"></span>${L[r.i]}` },
    { label: 'Sessions', num: 1, render: r => fmt.int(r.s) },
    { label: 'Bounce', num: 1, render: r => fmt.pct(TS.div(r.b, r.s)) },
    { label: 'Conversion', num: 1, render: r => fmt.pct(TS.div(r.o, r.s), 2) },
    { label: 'Rev / session', num: 1, render: r => fmt.usd2(TS.div(r.r, r.s)) },
  ], live.map(i => ({ i, ...land[i] })), {
    onRow: (r, add) => toggleLand(r.i, add),
    isSelected: r => landSel.includes(r.i),
  });

  const barOpts = (fmtTip) => ({
    scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { callback: v => fmt.pct(v, 0) } } },
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: fmtTip } } },
  });
  const liveLabels = live.map(i => L[i]);
  const liveColors = TS.dimColors(live.map(lcolor), live, landSel);
  TS.chart('c-bounce', {
    type: 'bar',
    data: { labels: liveLabels, datasets: [{ label: 'Bounce rate', data: live.map(i => TS.div(land[i].b, land[i].s)), backgroundColor: liveColors }] },
    options: barOpts(c => `Bounce rate: ${fmt.pct(c.raw)} (${fmt.int(land[live[c.dataIndex]].s)} sessions)`),
    onPick: (el, add) => toggleLand(live[el.index], add),
  });
  TS.chart('c-lcvr', {
    type: 'bar',
    data: { labels: liveLabels, datasets: [{ label: 'Conversion rate', data: live.map(i => TS.div(land[i].o, land[i].s)), backgroundColor: liveColors }] },
    options: barOpts(c => `Conversion: ${fmt.pct(c.raw, 2)}`),
    onPick: (el, add) => toggleLand(live[el.index], add),
  });
  TS.chart('c-ltrend', {
    type: 'bar',
    data: { labels: TS.monthLabels(), datasets: live.map(i => ({ label: L[i], data: landTrend[i], backgroundColor: lcolor(i) })) },
    options: {
      scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, ticks: { callback: fmt.compact } } },
      plugins: { tooltip: { mode: 'index', callbacks: { label: c => `${c.dataset.label}: ${fmt.int(c.raw)}` } } },
    },
    onPick: (el, add) => toggleLand(live[el.datasetIndex], add),
  });

  TS.table('t-bill', [
    { label: 'Billing page', render: r => r.name },
    { label: 'Sessions', num: 1, render: r => fmt.int(r.s) },
    { label: 'Orders', num: 1, render: r => fmt.int(r.o) },
    { label: 'Billing → order', num: 1, render: r => fmt.pct(TS.div(r.o, r.s)) },
    { label: 'Revenue / billing session', num: 1, render: r => fmt.usd2(TS.div(r.r, r.s)) },
  ], [1, 2].map(b => ({ name: meta.billing[b], ...bill[b] })).filter(r => r.s));

  TS.table('t-pp', [
    { label: 'Product page', render: r => `<span class="swatch" style="background:${TS.color(r.i)}"></span>${TS.esc(meta.products[r.i].name)}` },
    { label: 'Sessions', num: 1, render: r => fmt.int(r.s) },
    { label: '→ Cart', num: 1, render: r => fmt.pct(TS.div(r.cart, r.s)) },
    { label: '→ Order', num: 1, render: r => fmt.pct(TS.div(r.o, r.s)) },
  ], pp.map((p, i) => ({ i, ...p })).filter(r => r.s), {
    onRow: (r, add) => TS.crossFilter('product', r.i + 1, add),
    isSelected: r => f.product.includes(r.i + 1),
  });

  function toggleLand(i, add) {
    if (add) landSel = landSel.includes(i) ? landSel.filter(x => x !== i) : [...landSel, i];
    else landSel = landSel.length === 1 && landSel[0] === i ? [] : [i];
    render(f);
  }
});
