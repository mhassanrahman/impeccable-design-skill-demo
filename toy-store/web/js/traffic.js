TS.start(function render(f) {
  const { meta, C, fmt } = TS;
  const n = f.to - f.from + 1;
  const SRC = TS.sources;
  const acc = () => ({ s: 0, o: 0, r: 0, b: 0 });
  const add = (a, r) => { a.s += r[C.sessions]; a.o += r[C.orders]; a.r += r[C.revenue]; a.b += r[C.bounce] ? r[C.sessions] : 0; };

  const total = acc(), bySrcAll = {}, trend = {}, srcDev = {}, devMonth = [0, 1].map(() => new Array(n).fill(0).map(acc));
  let repeat = 0, mobile = 0;
  SRC.forEach(s => { bySrcAll[s] = 0; trend[s] = new Array(n).fill(0); srcDev[s] = [acc(), acc()]; });
  const camp = new Map();

  // Source bar ignores the source/campaign slicers so the selection can be highlighted
  for (const r of TS.cubeRows({ ignore: ['utm'] })) bySrcAll[meta.utm[r[C.utm]].source] += r[C.sessions];

  for (const r of TS.cubeRows()) {
    const u = meta.utm[r[C.utm]], k = r[C.m] - f.from, dev = r[C.dev];
    add(total, r);
    trend[u.source][k] += r[C.sessions];
    add(srcDev[u.source][dev], r);
    add(devMonth[dev][k], r);
    if (r[C.rep]) repeat += r[C.sessions];
    if (dev === 1) mobile += r[C.sessions];
    const key = r[C.utm] + '|' + dev;
    if (!camp.has(key)) camp.set(key, { u, dev, ...acc() });
    add(camp.get(key), r);
  }

  TS.kpis('kpis', [
    { label: 'Sessions', value: fmt.int(total.s) },
    { label: 'Conversion rate', value: fmt.pct(TS.div(total.o, total.s), 2), sub: `${fmt.int(total.o)} orders` },
    { label: 'Revenue per session', value: fmt.usd2(TS.div(total.r, total.s)) },
    { label: 'Bounce rate', value: fmt.pct(TS.div(total.b, total.s)), sub: 'Single-page sessions' },
    { label: 'Repeat sessions', value: fmt.pct(TS.div(repeat, total.s)) },
    { label: 'Mobile share', value: fmt.pct(TS.div(mobile, total.s)) },
  ]);

  const srcColor = s => TS.color(TS.slot.source(s));
  TS.chart('c-src', {
    type: 'bar',
    data: { labels: SRC, datasets: [{ label: 'Sessions', data: SRC.map(s => bySrcAll[s]), backgroundColor: TS.dimColors(SRC.map(srcColor), SRC, f.source) }] },
    options: {
      indexAxis: 'y',
      scales: { x: { beginAtZero: true, ticks: { callback: fmt.compact } }, y: { grid: { display: false } } },
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `${fmt.int(c.raw)} sessions` } } },
    },
    onPick: (el, add) => TS.crossFilter('source', SRC[el.index], add),
  });

  const labels = TS.monthLabels();
  const liveSrc = SRC.filter(s => trend[s].some(v => v));
  TS.chart('c-trend', {
    type: 'line',
    data: { labels, datasets: liveSrc.map(s => ({ label: s, data: trend[s], borderColor: srcColor(s) })) },
    options: {
      scales: { y: { beginAtZero: true, ticks: { callback: fmt.compact } } },
      plugins: { tooltip: { callbacks: { label: c => `${c.dataset.label}: ${fmt.int(c.raw)}` } } },
    },
  });

  const DEV = meta.devices;
  TS.chart('c-cvr', {
    type: 'bar',
    data: { labels: liveSrc, datasets: DEV.map((d, di) => ({
      label: d, backgroundColor: TS.color(TS.slot.device(di)),
      data: liveSrc.map(s => TS.div(srcDev[s][di].o, srcDev[s][di].s) || 0),
    })) },
    options: {
      scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { callback: v => fmt.pct(v, 0) } } },
      plugins: { tooltip: { callbacks: { label: c => `${c.dataset.label}: ${fmt.pct(c.raw, 2)} (${fmt.int(srcDev[liveSrc[c.dataIndex]][c.datasetIndex].s)} sessions)` } } },
    },
    onPick: el => {
      const s = liveSrc[el.index], d = el.datasetIndex;
      const same = f.source.length === 1 && f.source[0] === s && f.device.length === 1 && f.device[0] === d;
      TS.setFilter(same ? { source: [], device: [] } : { source: [s], device: [d] });
    },
  });

  TS.chart('c-dev', {
    type: 'line',
    data: { labels, datasets: DEV.map((d, di) => ({
      label: d, borderColor: TS.color(TS.slot.device(di)),
      data: devMonth[di].map(a => (a.s >= 50 ? a.o / a.s : null)),
    })) },
    options: {
      scales: { y: { beginAtZero: true, ticks: { callback: v => fmt.pct(v, 0) } } },
      plugins: { tooltip: { callbacks: { label: c => `${c.dataset.label}: ${fmt.pct(c.raw, 2)}` } } },
    },
  });

  const rows = [...camp.values()].sort((a, b) => b.s - a.s);
  TS.table('t-camp', [
    { label: 'Source', render: r => `<span class="swatch" style="background:${srcColor(r.u.source)}"></span>${r.u.source}` },
    { label: 'Campaign', render: r => r.u.campaign },
    { label: 'Ad content', render: r => r.u.content },
    { label: 'Channel', render: r => r.u.channel },
    { label: 'Device', render: r => DEV[r.dev] },
    { label: 'Sessions', num: 1, render: r => fmt.int(r.s) },
    { label: 'Share', num: 1, render: r => fmt.pct(TS.div(r.s, total.s)) },
    { label: 'Bounce rate', num: 1, render: r => fmt.pct(TS.div(r.b, r.s)) },
    { label: 'Orders', num: 1, render: r => fmt.int(r.o) },
    { label: 'Conversion', num: 1, render: r => fmt.pct(TS.div(r.o, r.s), 2) },
    { label: 'Revenue', num: 1, render: r => fmt.usd(r.r) },
    { label: 'Revenue / session', num: 1, render: r => fmt.usd2(TS.div(r.r, r.s)) },
  ], rows, {
    onRow: r => {
      const same = f.source.length === 1 && f.source[0] === r.u.source && f.campaign.length === 1 && f.campaign[0] === r.u.campaign;
      TS.setFilter(same ? { source: [], campaign: [] } : { source: [r.u.source], campaign: [r.u.campaign] });
    },
    isSelected: r => f.source.includes(r.u.source) && f.campaign.includes(r.u.campaign),
  });
});
