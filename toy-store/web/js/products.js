TS.start(function render(f) {
  const { meta, orders, items, fmt } = TS;
  const n = f.to - f.from + 1;
  const P = meta.products, pids = P.map(p => p.id);
  const per = () => P.map(() => new Array(n).fill(0));
  const rev = per(), sold = per(), refunded = per();
  const tot = P.map(() => ({ units: 0, rev: 0, cogs: 0, ref: 0, refAmt: 0, primary: 0 }));
  const unitsAll = [0, 0, 0, 0];

  for (let j = 0; j < items.id.length; j++) {
    const p = items.prod[j] - 1;
    if (TS.itemOk(j, { product: 1 })) unitsAll[p]++;
    if (!TS.itemOk(j)) continue;
    const k = orders.m[items.oi[j]] - f.from;
    rev[p][k] += items.price[j]; sold[p][k]++;
    const t = tot[p];
    t.units++; t.rev += items.price[j]; t.cogs += items.cogs[j]; t.primary += items.prim[j];
    if (items.refund[j]) { refunded[p][k]++; t.ref++; t.refAmt += items.refund[j]; }
  }

  // Cross-sell: orders grouped by primary product (product slicer filters the primary product)
  const xs = P.map(() => ({ orders: 0, with: [0, 0, 0, 0] }));
  let nOrders = 0, multi = 0, orderItems = 0;
  for (let i = 0; i < orders.id.length; i++) {
    if (!TS.orderOk(i)) continue;
    nOrders++; orderItems += orders.items[i];
    if (orders.items[i] > 1) multi++;
  }
  for (let i = 0; i < orders.id.length; i++) {
    if (!TS.orderOk(i, { product: 1 })) continue;
    const pp = orders.prim[i];
    if (TS.prodSet && !TS.prodSet.has(pp)) continue;
    xs[pp - 1].orders++;
    const other = orders.mask[i] & ~(1 << (pp - 1));
    for (let b = 0; b < 4; b++) if (other & (1 << b)) xs[pp - 1].with[b]++;
  }

  const sum = a => a.reduce((x, y) => x + y, 0);
  const T = tot.reduce((a, t) => ({ units: a.units + t.units, rev: a.rev + t.rev, cogs: a.cogs + t.cogs, ref: a.ref + t.ref }), { units: 0, rev: 0, cogs: 0, ref: 0 });
  TS.kpis('kpis', [
    { label: 'Units sold', value: fmt.int(T.units) },
    { label: 'Revenue', value: fmt.usd(T.rev) },
    { label: 'Gross margin', value: fmt.pct(TS.div(T.rev - T.cogs, T.rev)), sub: `${fmt.usd(T.rev - T.cogs)} gross profit` },
    { label: 'Refund rate', value: fmt.pct(TS.div(T.ref, T.units), 2), sub: `${fmt.int(T.ref)} items refunded` },
    { label: 'Multi-item orders', value: fmt.pct(TS.div(multi, nOrders)), sub: `${fmt.int(multi)} of ${fmt.int(nOrders)} orders` },
    { label: 'Items per order', value: (TS.div(orderItems, nOrders) || 0).toFixed(2) },
  ]);

  const labels = TS.monthLabels();
  const color = id => TS.color(TS.slot.product(id));
  const short = name => name.replace(/^The /, '');
  const visible = P.filter((p, i) => sum(sold[i]) > 0 || !TS.prodSet);

  TS.chart('c-rev', {
    type: 'bar',
    data: { labels, datasets: visible.map(p => ({ label: short(p.name), data: rev[p.id - 1], backgroundColor: color(p.id), pid: p.id })) },
    options: {
      scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, ticks: { callback: v => '$' + fmt.compact(v) } } },
      plugins: { tooltip: { mode: 'index', callbacks: { label: c => `${c.dataset.label}: ${fmt.usd(c.raw)}` } } },
    },
    onPick: (el, add) => TS.crossFilter('product', visible[el.datasetIndex].id, add),
  });

  TS.chart('c-units', {
    type: 'bar',
    data: { labels: P.map(p => short(p.name)), datasets: [{ label: 'Units', data: unitsAll, backgroundColor: TS.dimColors(pids.map(color), pids, f.product) }] },
    options: {
      indexAxis: 'y',
      scales: { x: { beginAtZero: true, ticks: { callback: fmt.compact } }, y: { grid: { display: false } } },
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `${fmt.int(c.raw)} units` } } },
    },
    onPick: (el, add) => TS.crossFilter('product', pids[el.index], add),
  });

  TS.chart('c-refund', {
    type: 'line',
    data: { labels, datasets: visible.map(p => ({
      label: short(p.name), borderColor: color(p.id), spanGaps: true,
      // hide months with too few sales to give a meaningful rate
      data: sold[p.id - 1].map((s, k) => (s >= 20 ? refunded[p.id - 1][k] / s : null)),
    })) },
    options: {
      scales: { y: { beginAtZero: true, ticks: { callback: v => fmt.pct(v, 0) } } },
      plugins: { tooltip: { callbacks: { label: c => `${c.dataset.label}: ${fmt.pct(c.raw)}` } } },
    },
  });

  // Cross-sell matrix with a single-hue sequential wash
  const heat = v => `background: rgba(${TS.css('--heat')}, ${Math.min(0.5, v * 1.6).toFixed(2)})`;
  const xrows = P.map((p, i) => ({ p, ...xs[i] })).filter(r => r.orders > 0);
  TS.table('t-xsell', [
    { label: 'Primary product', render: r => `<span class="swatch" style="background:${color(r.p.id)}"></span>${TS.esc(short(r.p.name))}` },
    { label: 'Orders', num: 1, render: r => fmt.int(r.orders) },
    ...P.map((q, b) => ({
      label: '+ ' + short(q.name), num: 1,
      render: r => (r.p.id === q.id ? '<span class="hint">–</span>' : `${fmt.pct(TS.div(r.with[b], r.orders))}<div class="hint">${fmt.int(r.with[b])}</div>`),
      style: r => (r.p.id === q.id ? '' : heat(TS.div(r.with[b], r.orders))),
    })),
  ], xrows);

  const prow = P.map((p, i) => ({ p, ...tot[i] }));
  TS.table('t-prod', [
    { label: 'Product', render: r => `<span class="swatch" style="background:${color(r.p.id)}"></span>${TS.esc(r.p.name)}` },
    { label: 'Launched', render: r => r.p.launched.slice(0, 10) },
    { label: 'Units', num: 1, render: r => fmt.int(r.units) },
    { label: 'Revenue', num: 1, render: r => fmt.usd(r.rev) },
    { label: 'COGS', num: 1, render: r => fmt.usd(r.cogs) },
    { label: 'Gross profit', num: 1, render: r => fmt.usd(r.rev - r.cogs) },
    { label: 'Margin', num: 1, render: r => fmt.pct(TS.div(r.rev - r.cogs, r.rev)) },
    { label: 'Sold as primary', num: 1, render: r => fmt.pct(TS.div(r.primary, r.units)) },
    { label: 'Refunded', num: 1, render: r => fmt.int(r.ref) },
    { label: 'Refund rate', num: 1, render: r => fmt.pct(TS.div(r.ref, r.units), 2) },
    { label: 'Refunded $', num: 1, render: r => fmt.usd(r.refAmt) },
  ], prow, { onRow: (r, add) => TS.crossFilter('product', r.p.id, add), isSelected: r => f.product.includes(r.p.id) });
});
