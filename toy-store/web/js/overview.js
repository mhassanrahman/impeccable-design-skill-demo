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
  // Channel efficiency ignores the source/campaign slicers so the chosen channel can be compared with the rest
  const ch = {};
  TS.channels.forEach(c => (ch[c] = { s: 0, o: 0, r: 0 }));
  let chTotal = { s: 0, o: 0, r: 0 };
  for (const r of TS.cubeRows({ ignore: ['utm'] })) {
    const a = ch[meta.utm[r[C.utm]].channel];
    a.s += r[C.sessions]; a.o += r[C.orders]; a.r += r[C.revenue];
    chTotal.s += r[C.sessions]; chTotal.o += r[C.orders]; chTotal.r += r[C.revenue];
  }

  let nOrders = 0, nItems = 0, refundedItems = 0, refunded = 0;
  for (let i = 0; i < orders.id.length; i++) if (TS.orderOk(i)) { nOrders++; M.orders[orders.m[i] - f.from]++; }
  for (let j = 0; j < items.id.length; j++) {
    if (!TS.itemOk(j)) continue;
    const k = orders.m[items.oi[j]] - f.from;
    M.revenue[k] += items.price[j]; M.cogs[k] += items.cogs[j];
    nItems++;
    if (items.refund[j]) { refundedItems++; refunded += items.refund[j]; }
  }
  const sum = a => a.reduce((x, y) => x + y, 0);
  const sessions = sum(M.sessions), revenue = sum(M.revenue), cogs = sum(M.cogs);
  const monthName = k => TS.fmt.month(meta.months[k]);

  // ---------- insight text ----------
  const live = TS.channels.filter(c => ch[c].s > 0);
  const avgRps = TS.div(chTotal.r, chTotal.s);
  const sel = TS.selectedChannel();
  if (!sessions) {
    TS.say('headline', 'Nothing to analyse yet');
    TS.say('dek', TS.noData);
  } else {
    if (sel && ch[sel].s) {
      const a = ch[sel], rps = TS.div(a.r, a.s);
      TS.say('headline', `${TS.cap(TS.channelPhrase(sel))} brings <b>${fmt.pct(TS.div(a.s, chTotal.s), 0)}</b> of visits and earns <b>${fmt.usd2(rps)}</b> a session, ${fmt.x(TS.div(rps, avgRps))} the site average.`);
    } else {
      const top = [...live].sort((a, b) => ch[b].s - ch[a].s)[0];
      const best = live.filter(c => ch[c].s >= chTotal.s * 0.02).sort((a, b) => TS.div(ch[b].r, ch[b].s) - TS.div(ch[a].r, ch[a].s))[0] || top;
      const topRps = TS.div(ch[top].r, ch[top].s), bestRps = TS.div(ch[best].r, ch[best].s);
      TS.say('headline', top === best
        ? `${TS.cap(TS.channelPhrase(top))} brings <b>${fmt.pct(TS.div(ch[top].s, chTotal.s), 0)}</b> of visits and earns the most per visit, <b>${fmt.usd2(topRps)}</b>.`
        : `${TS.cap(TS.channelPhrase(top))} brings <b>${fmt.pct(TS.div(ch[top].s, chTotal.s), 0)}</b> of visits, but ${TS.channelPhrase(best)} earns <b>${fmt.usd2(bestRps)}</b> a session, ${fmt.x(TS.div(bestRps, topRps))} as much.`);
    }
    const full = TS.fullMonths(), a = full[0] - f.from, z = full[full.length - 1] - f.from;
    TS.say('dek', full.length > 1
      ? `Monthly revenue went from <b>${fmt.usd(M.revenue[a])}</b> in ${monthName(full[0])} to <b>${fmt.usd(M.revenue[z])}</b> in ${monthName(full[full.length - 1])}, while conversion moved from ${fmt.pct(TS.div(M.orders[a], M.sessions[a]), 1)} to <b>${fmt.pct(TS.div(M.orders[z], M.sessions[z]), 1)}</b>.`
      : `In ${monthName(f.from)} the store took <b>${fmt.int(nOrders)}</b> orders worth <b>${fmt.usd(revenue)}</b> from ${fmt.int(sessions)} sessions.`);
  }

  TS.kpis('kpis', [
    { label: 'Sessions', value: fmt.int(sessions) },
    { label: 'Orders', value: fmt.int(nOrders), sub: `${fmt.int(nItems)} items` },
    { label: 'Conversion', value: fmt.pct(TS.div(nOrders, sessions), 2) },
    { label: 'Revenue', value: fmt.usdK(revenue), title: fmt.usd(revenue), sub: `${fmt.pct(TS.div(revenue - cogs, revenue), 0)} margin` },
    { label: 'Avg order', value: fmt.usd2(TS.div(revenue, nOrders)) },
    { label: 'Refund rate', value: fmt.pct(TS.div(refundedItems, nItems), 1), sub: `${fmt.usdK(refunded)} refunded` },
  ]);

  // ---------- hero: channel efficiency ----------
  const effRps = live.map(c => TS.div(ch[c].r, ch[c].s));
  const topC = [...live].sort((a, b) => ch[b].s - ch[a].s)[0];
  const bestC = live.filter(c => ch[c].s >= chTotal.s * 0.02).sort((a, b) => TS.div(ch[b].r, ch[b].s) - TS.div(ch[a].r, ch[a].s))[0];
  const SHORT = { 'Paid search - nonbrand': 'Nonbrand search', 'Paid search - brand': 'Brand search', 'Paid social': 'Paid social', 'Organic search': 'Organic', 'Direct type-in': 'Direct' };
  TS.chart('c-eff', {
    type: 'bar',
    data: { labels: live.map(c => (TS.narrow() ? SHORT[c] : TS.channelLabel(c))), datasets: [{
      label: 'Revenue per session', data: effRps,
      backgroundColor: TS.emphasis(live, sel ? [sel] : [topC, bestC]),
    }] },
    options: {
      indexAxis: 'y',
      scales: { x: { beginAtZero: true, ticks: { callback: v => '$' + v } }, y: { grid: { display: false }, ticks: { color: TS.css('--ink'), font: { weight: 600 } } } },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: c => [`${fmt.usd2(c.raw)} per session`, `${fmt.int(ch[live[c.dataIndex]].s)} sessions · ${fmt.pct(TS.div(ch[live[c.dataIndex]].o, ch[live[c.dataIndex]].s), 2)} conversion`] } },
      },
    },
    endLabels: { pad: 96, format: (v, i) => `${fmt.usd2(v)}  (${fmt.pct(TS.div(ch[live[i]].s, chTotal.s), 0)})`, faded: i => sel && live[i] !== sel },
    onPick: el => TS.pickChannel(live[el.index]),
  });

  // ---------- revenue trend ----------
  const labels = TS.monthLabels();
  const full = TS.fullMonths();
  const r0 = M.revenue[full[0] - f.from], r1 = M.revenue[full[full.length - 1] - f.from];
  TS.say('h-rev', !revenue ? 'No revenue in this selection'
    : full.length < 2 ? `${fmt.usd(revenue)} of revenue in ${monthName(f.from)}`
    : r1 >= r0 ? `Monthly revenue grew ${fmt.x(TS.div(r1, r0))} between ${monthName(full[0])} and ${monthName(full[full.length - 1])}`
    : `Monthly revenue fell ${fmt.pct(1 - TS.div(r1, r0), 0)} between ${monthName(full[0])} and ${monthName(full[full.length - 1])}`);
  TS.chart('c-rev', {
    type: 'line',
    data: { labels, datasets: [
      { label: 'Revenue', data: M.revenue, borderColor: TS.color(0), fill: { target: 'origin', above: TS.color(0) + '14' } },
      { label: 'Gross profit', data: M.revenue.map((v, i) => v - M.cogs[i]), borderColor: TS.color(2) },
    ] },
    options: {
      scales: { x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkipPadding: 18 } }, y: { beginAtZero: true, ticks: TS.usdTicks } },
      plugins: { tooltip: { callbacks: { label: c => `${c.dataset.label}: ${fmt.usd(c.raw)}` } } },
    },
  });
  const peak = M.revenue.indexOf(Math.max(...M.revenue));
  const cvrs = M.orders.map((o, i) => (M.sessions[i] >= 100 ? o / M.sessions[i] : 0));
  const bestCvr = cvrs.indexOf(Math.max(...cvrs));
  document.getElementById('n-rev').innerHTML = `<dl>
    <div><dt>Best revenue month</dt><dd>${revenue ? `${monthName(f.from + peak)} · ${fmt.usd(M.revenue[peak])}` : '–'}</dd></div>
    <div><dt class="gold">Best conversion month</dt><dd>${sessions ? `${monthName(f.from + bestCvr)} · ${fmt.pct(cvrs[bestCvr], 1)}` : '–'}</dd></div>
    <div><dt>Gross profit</dt><dd>${fmt.usd(revenue - cogs)}</dd></div>
    <div><dt>Gross margin</dt><dd>${fmt.pct(TS.div(revenue - cogs, revenue))}</dd></div>
    <div><dt>Revenue per session</dt><dd>${fmt.usd2(TS.div(revenue, sessions))}</dd></div>
  </dl><p>Gross profit is item revenue minus cost of goods sold. Refunds are shown separately and not netted out.</p>`;

  // ---------- traffic mix + conversion ----------
  const s0 = M.sessions[full[0] - f.from], s1 = M.sessions[full[full.length - 1] - f.from];
  const c0 = TS.div(M.orders[full[0] - f.from], s0), c1 = TS.div(M.orders[full[full.length - 1] - f.from], s1);
  TS.say('h-mix', !sessions ? 'No traffic in this selection'
    : full.length < 2 ? `${fmt.int(sessions)} sessions converted at ${fmt.pct(TS.div(nOrders, sessions), 2)}`
    : `Traffic grew ${fmt.x(TS.div(s1, s0))}, and conversion ${c1 >= c0 ? 'rose' : 'fell'} from ${fmt.pct(c0, 1)} to ${fmt.pct(c1, 1)}`);
  const liveCh = TS.channels.filter(c => byChannel[c].some(v => v));
  TS.chart('c-sess', {
    type: 'bar',
    data: { labels, datasets: liveCh.map(c => ({ label: TS.channelLabel(c), data: byChannel[c], backgroundColor: TS.color(TS.slot.channel(c)) })) },
    options: {
      scales: { x: { stacked: true, grid: { display: false }, ticks: { maxRotation: 0, autoSkipPadding: 18 } }, y: { stacked: true, ticks: { callback: fmt.compact } } },
      plugins: { tooltip: { mode: 'index', callbacks: { label: c => `${c.dataset.label}: ${fmt.int(c.raw)}` } } },
    },
    onPick: el => TS.pickChannel(liveCh[el.datasetIndex]),
  });
  TS.chart('c-cvr', {
    type: 'line',
    data: { labels, datasets: [{ label: 'Conversion rate', data: M.orders.map((o, i) => TS.div(o, M.sessions[i])), borderColor: TS.color(0) }] },
    options: {
      scales: { x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkipPadding: 18 } }, y: { beginAtZero: true, ticks: { callback: v => fmt.pct(v, 0) } } },
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `Conversion ${fmt.pct(c.raw, 2)}` } } },
    },
  });

  const rows = labels.map((l, i) => ({ l, s: M.sessions[i], o: M.orders[i], r: M.revenue[i], g: M.revenue[i] - M.cogs[i] })).reverse();
  TS.table('t-month', [
    { label: 'Month', key: 'l', cls: 'strong' },
    { label: 'Sessions', num: 1, render: r => fmt.int(r.s) },
    { label: 'Orders', num: 1, render: r => fmt.int(r.o) },
    { label: 'Conversion', num: 1, render: r => fmt.pct(TS.div(r.o, r.s), 2) },
    { label: 'Revenue', num: 1, render: r => fmt.usd(r.r) },
    { label: 'Gross profit', num: 1, render: r => fmt.usd(r.g) },
    { label: 'Avg order', num: 1, render: r => fmt.usd2(TS.div(r.r, r.o)) },
    { label: 'Revenue / session', num: 1, render: r => fmt.usd2(TS.div(r.r, r.s)) },
  ], sessions ? rows : []);
});
