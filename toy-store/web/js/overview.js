TS.start(function render(f) {
  const { meta, orders, items, C, fmt } = TS;
  const n = f.to - f.from + 1;
  const zeros = () => new Array(n).fill(0);
  const M = { sessions: zeros(), orders: zeros(), revenue: zeros(), cogs: zeros() };
  const byChannel = {};
  TS.channels.forEach(c => (byChannel[c] = zeros()));

  for (const r of TS.cubeRows()) {
    const k = r[C.m] - f.from;
    M.sessions[k] += r[C.sessions];
    byChannel[meta.utm[r[C.utm]].channel][k] += r[C.sessions];
  }
  let nOrders = 0, nItems = 0, refunded = 0, refundedItems = 0;
  for (let i = 0; i < orders.id.length; i++) if (TS.orderOk(i)) { nOrders++; M.orders[orders.m[i] - f.from]++; }
  const prodRev = [0, 0, 0, 0];
  for (let j = 0; j < items.id.length; j++) {
    // product chart ignores the product slicer so the selection can be highlighted
    if (TS.itemOk(j, { product: 1 })) prodRev[items.prod[j] - 1] += items.price[j];
    if (!TS.itemOk(j)) continue;
    const k = orders.m[items.oi[j]] - f.from;
    M.revenue[k] += items.price[j]; M.cogs[k] += items.cogs[j];
    nItems++;
    if (items.refund[j]) { refunded += items.refund[j]; refundedItems++; }
  }
  const sum = a => a.reduce((x, y) => x + y, 0);
  const sessions = sum(M.sessions), revenue = sum(M.revenue), cogs = sum(M.cogs);

  TS.kpis('kpis', [
    { label: 'Sessions', value: fmt.int(sessions) },
    { label: 'Orders', value: fmt.int(nOrders), sub: `${fmt.int(nItems)} items sold` },
    { label: 'Conversion rate', value: fmt.pct(TS.div(nOrders, sessions), 2) },
    { label: 'Revenue', value: fmt.usd(revenue) },
    { label: 'Gross profit', value: fmt.usd(revenue - cogs), sub: `${fmt.pct(TS.div(revenue - cogs, revenue))} margin` },
    { label: 'Avg order value', value: fmt.usd2(TS.div(revenue, nOrders)) },
    { label: 'Refund rate', value: fmt.pct(TS.div(refundedItems, nItems), 2), sub: `${fmt.usd(refunded)} refunded` },
  ]);

  const labels = TS.monthLabels();
  const usdTicks = { callback: v => '$' + fmt.compact(v) };
  TS.chart('c-rev', {
    type: 'line',
    data: { labels, datasets: [
      { label: 'Revenue', data: M.revenue, borderColor: TS.color(0) },
      { label: 'Gross profit', data: M.revenue.map((v, i) => v - M.cogs[i]), borderColor: TS.color(2) },
    ] },
    options: {
      scales: { y: { beginAtZero: true, ticks: usdTicks } },
      plugins: { tooltip: { callbacks: { label: c => `${c.dataset.label}: ${fmt.usd(c.raw)}` } } },
    },
  });

  const pids = meta.products.map(p => p.id);
  TS.chart('c-prod', {
    type: 'bar',
    data: { labels: meta.products.map(p => p.name.replace(/^The /, '')), datasets: [{
      label: 'Revenue', data: prodRev,
      backgroundColor: TS.dimColors(pids.map(id => TS.color(TS.slot.product(id))), pids, f.product),
    }] },
    options: {
      indexAxis: 'y',
      scales: { x: { beginAtZero: true, ticks: usdTicks }, y: { grid: { display: false } } },
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => fmt.usd(c.raw) } } },
    },
    onPick: (el, add) => TS.crossFilter('product', pids[el.index], add),
  });

  TS.chart('c-sess', {
    type: 'bar',
    data: { labels, datasets: TS.channels.map(c => ({ label: c, data: byChannel[c], backgroundColor: TS.color(TS.slot.channel(c)) })) },
    options: {
      scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, ticks: { callback: fmt.compact } } },
      plugins: { tooltip: { mode: 'index', callbacks: { label: c => `${c.dataset.label}: ${fmt.int(c.raw)}` } } },
    },
  });

  TS.chart('c-cvr', {
    type: 'line',
    data: { labels, datasets: [{ label: 'Conversion rate', data: M.orders.map((o, i) => TS.div(o, M.sessions[i])), borderColor: TS.color(0) }] },
    options: {
      scales: { y: { beginAtZero: true, ticks: { callback: v => fmt.pct(v, 0) } } },
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `Conversion: ${fmt.pct(c.raw, 2)}` } } },
    },
  });

  const rows = labels.map((l, i) => ({ l, s: M.sessions[i], o: M.orders[i], r: M.revenue[i], g: M.revenue[i] - M.cogs[i] })).reverse();
  TS.table('t-month', [
    { label: 'Month', key: 'l' },
    { label: 'Sessions', num: 1, render: r => fmt.int(r.s) },
    { label: 'Orders', num: 1, render: r => fmt.int(r.o) },
    { label: 'Conversion', num: 1, render: r => fmt.pct(TS.div(r.o, r.s), 2) },
    { label: 'Revenue', num: 1, render: r => fmt.usd(r.r) },
    { label: 'Gross profit', num: 1, render: r => fmt.usd(r.g) },
    { label: 'AOV', num: 1, render: r => fmt.usd2(TS.div(r.r, r.o)) },
    { label: 'Revenue / session', num: 1, render: r => fmt.usd2(TS.div(r.r, r.s)) },
  ], rows);
});
