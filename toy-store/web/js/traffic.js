TS.start(function render(f) {
  const { meta, C, fmt } = TS;
  const n = f.to - f.from + 1;
  const SRC = TS.sources, DEV = meta.devices;
  const acc = () => ({ s: 0, o: 0, r: 0, b: 0 });
  const add = (a, r) => { a.s += r[C.sessions]; a.o += r[C.orders]; a.r += r[C.revenue]; if (r[C.bounce]) a.b += r[C.sessions]; };

  const total = acc(), trend = {}, srcDev = {}, devMonth = [0, 1].map(() => new Array(n).fill(0).map(acc));
  let repeat = 0, mobile = 0;
  SRC.forEach(s => { trend[s] = new Array(n).fill(0); srcDev[s] = [acc(), acc()]; });
  const camp = new Map();

  // Hero bars ignore the source/campaign slicers so the selection can be compared with the rest
  const srcAll = {}; let allS = 0;
  SRC.forEach(s => (srcAll[s] = acc()));
  for (const r of TS.cubeRows({ ignore: ['utm'] })) { add(srcAll[meta.utm[r[C.utm]].source], r); allS += r[C.sessions]; }
  // Device comparison ignores the device slicer
  const devAll = [acc(), acc()];
  for (const r of TS.cubeRows({ ignore: ['device'] })) add(devAll[r[C.dev]], r);

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
  const rps = a => TS.div(a.r, a.s), cvr = a => TS.div(a.o, a.s);

  // ---------- insight text ----------
  const liveAll = SRC.filter(s => srcAll[s].s > 0);
  if (!total.s) {
    TS.say('headline', 'Nothing to analyse yet');
    TS.say('dek', TS.noData);
  } else {
    if (f.source.length === 1 && srcAll[f.source[0]].s) {
      const s = f.source[0], a = srcAll[s];
      TS.say('headline', `${s} sends <b>${fmt.pct(TS.div(a.s, allS), 0)}</b> of visits and earns <b>${fmt.usd2(rps(a))}</b> per visit, ${fmt.x(TS.div(rps(a), TS.div(liveAll.reduce((x, k) => x + srcAll[k].r, 0), allS)))} the site average.`);
    } else {
      const top = [...liveAll].sort((a, b) => srcAll[b].s - srcAll[a].s)[0];
      const best = liveAll.filter(s => srcAll[s].s >= allS * 0.02).sort((a, b) => rps(srcAll[b]) - rps(srcAll[a]))[0] || top;
      TS.say('headline', top === best
        ? `${top} sends <b>${fmt.pct(TS.div(srcAll[top].s, allS), 0)}</b> of visits and earns the most per visit, <b>${fmt.usd2(rps(srcAll[top]))}</b>.`
        : `${top} sends <b>${fmt.pct(TS.div(srcAll[top].s, allS), 0)}</b> of visits, but ${best} visitors are worth more: <b>${fmt.usd2(rps(srcAll[best]))}</b> a session against ${fmt.usd2(rps(srcAll[top]))}.`);
    }
    const [d, m] = devAll;
    TS.say('dek', d.s && m.s
      ? `A desktop visit converts at <b>${fmt.pct(cvr(d), 1)}</b>, ${fmt.x(TS.div(cvr(d), cvr(m)))} the ${fmt.pct(cvr(m), 1)} on mobile. Mobile is ${fmt.pct(TS.div(m.s, d.s + m.s), 0)} of traffic but only ${fmt.pct(TS.div(m.r, d.r + m.r), 0)} of revenue.`
      : `All ${fmt.int(total.s)} sessions in this selection are on ${d.s ? 'desktop' : 'mobile'}.`);
  }

  TS.kpis('kpis', [
    { label: 'Sessions', value: fmt.int(total.s) },
    { label: 'Conversion', value: fmt.pct(cvr(total), 2), sub: `${fmt.int(total.o)} orders` },
    { label: 'Revenue / session', value: fmt.usd2(rps(total)) },
    { label: 'Bounce rate', value: fmt.pct(TS.div(total.b, total.s)), sub: 'Left after one page' },
    { label: 'Repeat visits', value: fmt.pct(TS.div(repeat, total.s)) },
    { label: 'Mobile share', value: fmt.pct(TS.div(mobile, total.s)) },
  ]);

  const srcColor = s => TS.color(TS.slot.source(s));
  const topS = [...liveAll].sort((a, b) => srcAll[b].s - srcAll[a].s)[0];
  const bestS = liveAll.filter(s => srcAll[s].s >= allS * 0.02).sort((a, b) => rps(srcAll[b]) - rps(srcAll[a]))[0];
  TS.chart('c-src', {
    type: 'bar',
    data: { labels: liveAll, datasets: [{ label: 'Sessions', data: liveAll.map(s => srcAll[s].s), backgroundColor: TS.emphasis(liveAll, f.source.length ? f.source : [topS, bestS]) }] },
    options: {
      indexAxis: 'y',
      scales: { x: { beginAtZero: true, ticks: { callback: fmt.compact } }, y: { grid: { display: false }, ticks: { color: TS.css('--ink'), font: { weight: 600 } } } },
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => [`${fmt.int(c.raw)} sessions`, `${fmt.pct(cvr(srcAll[liveAll[c.dataIndex]]), 2)} conversion`] } } },
    },
    endLabels: { pad: 104, format: (v, i) => `${fmt.compact(v)}  (${fmt.usd2(rps(srcAll[liveAll[i]]))})`, faded: i => f.source.length && !f.source.includes(liveAll[i]) },
    onPick: (el, more) => TS.crossFilter('source', liveAll[el.index], more),
  });

  // ---------- trend ----------
  const labels = TS.monthLabels();
  const live = SRC.filter(s => trend[s].some(v => v));
  const lead = [...live].sort((a, b) => trend[b].reduce((x, y) => x + y, 0) - trend[a].reduce((x, y) => x + y, 0))[0];
  if (lead) {
    const pk = trend[lead].indexOf(Math.max(...trend[lead]));
    TS.say('h-trend', `${lead} traffic peaked in ${TS.fmt.month(meta.months[f.from + pk])} at ${fmt.int(trend[lead][pk])} sessions`);
  } else TS.say('h-trend', 'No traffic in this selection');
  TS.chart('c-trend', {
    type: 'line',
    data: { labels, datasets: live.map(s => ({ label: s, data: trend[s], borderColor: srcColor(s) })) },
    options: {
      scales: { x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkipPadding: 18 } }, y: { beginAtZero: true, ticks: { callback: fmt.compact } } },
      plugins: { tooltip: { callbacks: { label: c => `${c.dataset.label}: ${fmt.int(c.raw)}` } } },
    },
  });

  // ---------- device ----------
  const both = live.filter(s => srcDev[s][0].s >= 100 && srcDev[s][1].s >= 100);
  const wins = both.filter(s => cvr(srcDev[s][0]) > cvr(srcDev[s][1])).length;
  TS.say('h-dev', !both.length ? 'Conversion by device'
    : wins === both.length ? `Desktop out-converts mobile for every source${both.length > 1 ? `, all ${both.length} of them` : ''}`
    : `Desktop out-converts mobile for ${wins} of ${both.length} sources`);
  TS.chart('c-cvr', {
    type: 'bar',
    data: { labels: live, datasets: DEV.map((d, di) => ({
      label: TS.cap(d), backgroundColor: TS.dimColors(TS.color(TS.slot.device(di)), live, f.source),
      data: live.map(s => TS.div(srcDev[s][di].o, srcDev[s][di].s) || 0),
    })) },
    options: {
      scales: { x: { grid: { display: false }, ticks: { color: TS.css('--ink'), font: { weight: 600 } } }, y: { beginAtZero: true, ticks: { callback: v => fmt.pct(v, 0) } } },
      plugins: { tooltip: { callbacks: { label: c => `${c.dataset.label}: ${fmt.pct(c.raw, 2)} of ${fmt.int(srcDev[live[c.dataIndex]][c.datasetIndex].s)} sessions` } } },
    },
    onPick: el => {
      const s = live[el.index], d = el.datasetIndex;
      const same = f.source.length === 1 && f.source[0] === s && f.device.length === 1 && f.device[0] === d;
      TS.setFilter(same ? { source: [], device: [] } : { source: [s], device: [d] });
    },
  });
  TS.chart('c-dev', {
    type: 'line',
    data: { labels, datasets: DEV.map((d, di) => ({ label: TS.cap(d), borderColor: TS.color(TS.slot.device(di)), data: devMonth[di].map(a => (a.s >= 50 ? a.o / a.s : null)) })) },
    options: {
      scales: { x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkipPadding: 18 } }, y: { beginAtZero: true, ticks: { callback: v => fmt.pct(v, 0) } } },
      plugins: { tooltip: { callbacks: { label: c => `${c.dataset.label}: ${fmt.pct(c.raw, 2)}` } } },
    },
  });

  // ---------- campaigns ----------
  const rows = [...camp.values()].sort((a, b) => b.s - a.s);
  const eligible = rows.filter(r => r.s >= Math.max(200, total.s * 0.01));
  const best = [...eligible].sort((a, b) => rps(b) - rps(a))[0];
  TS.say('h-camp', best
    ? `${best.u.source} ${best.u.campaign === '(none)' ? '' : best.u.campaign + ' '}on ${DEV[best.dev]} is the most valuable traffic: ${fmt.usd2(rps(best))} per session`
    : 'Campaign performance');
  TS.table('t-camp', [
    { label: 'Source', cls: 'strong', render: r => `<span class="swatch" style="background:${srcColor(r.u.source)}"></span>${r.u.source}` },
    { label: 'Campaign', render: r => r.u.campaign },
    { label: 'Ad', render: r => r.u.content },
    { label: 'Channel', render: r => TS.channelLabel(r.u.channel) },
    { label: 'Device', render: r => TS.cap(DEV[r.dev]) },
    { label: 'Sessions', num: 1, render: r => fmt.int(r.s) },
    { label: 'Share', num: 1, render: r => fmt.pct(TS.div(r.s, total.s)) },
    { label: 'Bounce', num: 1, render: r => fmt.pct(TS.div(r.b, r.s)) },
    { label: 'Orders', num: 1, render: r => fmt.int(r.o) },
    { label: 'Conversion', num: 1, render: r => fmt.pct(cvr(r), 2) },
    { label: 'Revenue', num: 1, render: r => fmt.usd(r.r) },
    { label: 'Revenue / session', num: 1, cls: 'strong', render: r => fmt.usd2(rps(r)) },
  ], rows, {
    onRow: r => {
      const same = f.source.length === 1 && f.source[0] === r.u.source && f.campaign.length === 1 && f.campaign[0] === r.u.campaign;
      TS.setFilter(same ? { source: [], campaign: [] } : { source: [r.u.source], campaign: [r.u.campaign] });
    },
    isSelected: r => f.source.length === 1 && f.source[0] === r.u.source && f.campaign.length === 1 && f.campaign[0] === r.u.campaign,
  });
});
