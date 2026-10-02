TS.start(function render(f) {
  const { meta, orders, items, fmt } = TS;
  const n = f.to - f.from + 1;
  const P = meta.products;
  const per = () => P.map(() => new Array(n).fill(0));
  const rev = per(), sold = per(), refunded = per();
  const tot = P.map(() => ({ units: 0, rev: 0, cogs: 0, ref: 0, refAmt: 0, primary: 0 }));
  const all = P.map(() => ({ rev: 0, cogs: 0 })); // ignores the product slicer, for the hero comparison

  for (let j = 0; j < items.id.length; j++) {
    const p = items.prod[j] - 1;
    if (TS.itemOk(j, { product: 1 })) { all[p].rev += items.price[j]; all[p].cogs += items.cogs[j]; }
    if (!TS.itemOk(j)) continue;
    const k = orders.m[items.oi[j]] - f.from;
    rev[p][k] += items.price[j]; sold[p][k]++;
    const t = tot[p];
    t.units++; t.rev += items.price[j]; t.cogs += items.cogs[j]; t.primary += items.prim[j];
    if (items.refund[j]) { refunded[p][k]++; t.ref++; t.refAmt += items.refund[j]; }
  }
  const xs = P.map(() => ({ orders: 0, with: [0, 0, 0, 0] }));
  let nOrders = 0, multi = 0, orderItems = 0;
  for (let i = 0; i < orders.id.length; i++) {
    if (TS.orderOk(i)) { nOrders++; orderItems += orders.items[i]; if (orders.items[i] > 1) multi++; }
    if (!TS.orderOk(i, { product: 1 })) continue;
    const pp = orders.prim[i];
    if (TS.prodSet && !TS.prodSet.has(pp)) continue;
    xs[pp - 1].orders++;
    const other = orders.mask[i] & ~(1 << (pp - 1));
    for (let b = 0; b < 4; b++) if (other & (1 << b)) xs[pp - 1].with[b]++;
  }
  const sum = a => a.reduce((x, y) => x + y, 0);
  const T = tot.reduce((a, t) => ({ units: a.units + t.units, rev: a.rev + t.rev, cogs: a.cogs + t.cogs, ref: a.ref + t.ref }), { units: 0, rev: 0, cogs: 0, ref: 0 });
  const allRev = sum(all.map(a => a.rev));
  const margin = a => TS.div(a.rev - a.cogs, a.rev);
  const short = i => TS.shortName(P[i].name);
  const color = id => TS.color(TS.slot.product(id));

  // ---------- insight text ----------
  const liveAll = P.map((_, i) => i).filter(i => all[i].rev > 0);
  let xBest = null;
  xs.forEach((x, a) => x.with.forEach((w, b) => { if (x.orders >= 100 && a !== b && (!xBest || TS.div(w, x.orders) > xBest.rate)) xBest = { a, b, rate: TS.div(w, x.orders) }; }));
  if (!T.units) {
    TS.say('headline', 'Nothing to analyse yet');
    TS.say('dek', TS.noData);
  } else {
    const top = [...liveAll].sort((a, b) => all[b].rev - all[a].rev)[0];
    const best = [...liveAll].sort((a, b) => margin(all[b]) - margin(all[a]))[0];
    TS.say('headline', top === best
      ? `${short(top)} earns <b>${fmt.pct(TS.div(all[top].rev, allRev), 0)}</b> of revenue and carries the richest margin, <b>${fmt.pct(margin(all[top]), 0)}</b>.`
      : `${short(top)} earns <b>${fmt.pct(TS.div(all[top].rev, allRev), 0)}</b> of revenue, but ${short(best)} carries the richest margin at <b>${fmt.pct(margin(all[best]), 0)}</b>.`);
    TS.say('dek', `${fmt.pct(TS.div(multi, nOrders), 0)} of orders add a second item.` +
      (xBest ? ` The favourite add-on is <b>${short(xBest.b)}</b>, which joins ${fmt.pct(xBest.rate, 0)} of ${short(xBest.a)} orders.` : ''));
  }

  TS.kpis('kpis', [
    { label: 'Units sold', value: fmt.int(T.units) },
    { label: 'Revenue', value: fmt.usdK(T.rev), title: fmt.usd(T.rev) },
    { label: 'Gross margin', value: fmt.pct(TS.div(T.rev - T.cogs, T.rev)), sub: `${fmt.usdK(T.rev - T.cogs)} profit` },
    { label: 'Refund rate', value: fmt.pct(TS.div(T.ref, T.units), 1), sub: `${fmt.int(T.ref)} items` },
    { label: 'Multi-item orders', value: fmt.pct(TS.div(multi, nOrders), 0) },
    { label: 'Items per order', value: (TS.div(orderItems, nOrders) || 0).toFixed(2) },
  ]);

  const topP = [...liveAll].sort((a, b) => all[b].rev - all[a].rev)[0];
  const bestP = [...liveAll].sort((a, b) => margin(all[b]) - margin(all[a]))[0];
  const SHORTP = ['Mr. Fuzzy', 'Love Bear', 'Sugar Panda', 'Mini Bear'];
  TS.chart('c-prod', {
    type: 'bar',
    data: { labels: liveAll.map(i => (TS.narrow() ? SHORTP[i] : short(i))), datasets: [{ label: 'Revenue', data: liveAll.map(i => all[i].rev), backgroundColor: TS.emphasis(liveAll, f.product.length ? f.product.map(p => p - 1) : [topP, bestP]) }] },
    options: {
      indexAxis: 'y',
      scales: { x: { beginAtZero: true, ticks: TS.usdTicks }, y: { grid: { display: false }, ticks: { color: TS.css('--ink'), font: { weight: 600 } } } },
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => [`${fmt.usd(c.raw)} revenue`, `${fmt.pct(TS.div(c.raw, allRev), 1)} of total`] } } },
    },
    endLabels: { pad: 96, format: (v, i) => `$${fmt.compact(v)}  (${fmt.pct(margin(all[liveAll[i]]), 0)})`, faded: i => f.product.length && !f.product.includes(liveAll[i] + 1) },
    onPick: (el, more) => TS.crossFilter('product', liveAll[el.index] + 1, more),
  });

  // ---------- revenue mix ----------
  const labels = TS.monthLabels();
  const full = TS.fullMonths();
  const visible = P.map((_, i) => i).filter(i => sum(sold[i]) > 0);
  const monthTot = k => sum(rev.map(r => r[k]));
  const lead = visible.length ? [...visible].sort((a, b) => sum(rev[b]) - sum(rev[a]))[0] : null;
  if (lead != null && full.length > 1 && visible.length > 1) {
    const a = full[0] - f.from, z = full[full.length - 1] - f.from;
    const s0 = TS.div(rev[lead][a], monthTot(a)), s1 = TS.div(rev[lead][z], monthTot(z));
    TS.say('h-mix', `${short(lead)}'s share of monthly revenue ${s1 <= s0 ? 'fell' : 'rose'} from ${fmt.pct(s0, 0)} to ${fmt.pct(s1, 0)}${s1 < s0 ? ' as new products launched' : ''}`);
  } else TS.say('h-mix', lead != null ? `${short(lead)}: ${fmt.usd(sum(rev[lead]))} of revenue in this selection` : 'No product sales in this selection');
  TS.chart('c-rev', {
    type: 'bar',
    data: { labels, datasets: visible.map(i => ({ label: short(i), data: rev[i], backgroundColor: color(i + 1) })) },
    options: {
      scales: { x: { stacked: true, grid: { display: false }, ticks: { maxRotation: 0, autoSkipPadding: 18 } }, y: { stacked: true, ticks: TS.usdTicks } },
      plugins: { tooltip: { mode: 'index', callbacks: { label: c => `${c.dataset.label}: ${fmt.usd(c.raw)}` } } },
    },
    onPick: (el, more) => TS.crossFilter('product', visible[el.datasetIndex] + 1, more),
  });
  document.getElementById('n-launch').innerHTML = `<dl>${P.map((p, i) => `<div><dt><span class="swatch" style="background:${color(p.id)}"></span>${TS.esc(short(i))}</dt><dd>${TS.fmt.month(p.launched.slice(0, 7))}</dd></div>`).join('')}</dl>
    <p>Launch month of each product. Prices never changed (${P.map((p, i) => `${short(i)} ${fmt.usd2(items.price[items.prod.indexOf(p.id)])}`).join(', ')}), so every shift in the mix comes from volume, not pricing.</p>`;

  // ---------- cross-sell ----------
  TS.say('h-xsell', xBest ? `${short(xBest.b)} is the add-on of choice, joining ${fmt.pct(xBest.rate, 0)} of ${short(xBest.a)} orders` : 'Cross-sell between products');
  const heat = v => `background: rgba(${TS.css('--heat')}, ${Math.min(0.4, v * 1.5).toFixed(2)})`;
  TS.table('t-xsell', [
    { label: 'Primary product', cls: 'strong', render: r => `<span class="swatch" style="background:${color(r.i + 1)}"></span>${TS.esc(short(r.i))}` },
    { label: 'Orders', num: 1, render: r => fmt.int(r.orders) },
    ...P.map((q, b) => ({
      label: '+ ' + short(b), num: 1,
      render: r => (r.i === b ? '<span style="color:var(--muted)">–</span>' : `<b>${fmt.pct(TS.div(r.with[b], r.orders))}</b> <span style="color:var(--ink-2)">(${fmt.int(r.with[b])})</span>`),
      style: r => (r.i === b ? '' : heat(TS.div(r.with[b], r.orders))),
    })),
  ], xs.map((x, i) => ({ i, ...x })).filter(r => r.orders > 0));

  // ---------- refunds ----------
  const refRate = i => TS.div(tot[i].ref, tot[i].units);
  const worst = visible.filter(i => tot[i].units >= 200).sort((a, b) => refRate(b) - refRate(a))[0];
  TS.say('h-refund', worst != null ? `${short(worst)} is returned most often: ${fmt.pct(refRate(worst), 1)} of units sold are refunded` : 'Refund rate by product');
  TS.chart('c-refund', {
    type: 'line',
    data: { labels, datasets: visible.map(i => ({ label: short(i), borderColor: color(i + 1), spanGaps: true, data: sold[i].map((s, k) => (s >= 20 ? refunded[i][k] / s : null)) })) },
    options: {
      scales: { x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkipPadding: 18 } }, y: { beginAtZero: true, ticks: { callback: v => fmt.pct(v, 0) } } },
      plugins: { tooltip: { callbacks: { label: c => `${c.dataset.label}: ${fmt.pct(c.raw)}` } } },
    },
  });

  TS.table('t-prod', [
    { label: 'Product', cls: 'strong', render: r => `<span class="swatch" style="background:${color(r.p.id)}"></span>${TS.esc(r.p.name)}` },
    { label: 'Launched', render: r => r.p.launched.slice(0, 10) },
    { label: 'Units', num: 1, render: r => fmt.int(r.units) },
    { label: 'Revenue', num: 1, render: r => fmt.usd(r.rev) },
    { label: 'COGS', num: 1, render: r => fmt.usd(r.cogs) },
    { label: 'Gross profit', num: 1, render: r => fmt.usd(r.rev - r.cogs) },
    { label: 'Margin', num: 1, cls: 'strong', render: r => fmt.pct(TS.div(r.rev - r.cogs, r.rev)) },
    { label: 'Sold as primary', num: 1, render: r => fmt.pct(TS.div(r.primary, r.units)) },
    { label: 'Refunded', num: 1, render: r => fmt.int(r.ref) },
    { label: 'Refund rate', num: 1, render: r => fmt.pct(TS.div(r.ref, r.units), 2) },
    { label: 'Refunded $', num: 1, render: r => fmt.usd(r.refAmt) },
  ], P.map((p, i) => ({ p, ...tot[i] })).filter(r => r.units), { onRow: (r, more) => TS.crossFilter('product', r.p.id, more), isSelected: r => f.product.includes(r.p.id) });
});
