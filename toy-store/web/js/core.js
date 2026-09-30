// Shared app core: shell, data loading, global slicers (Power BI style), filter predicates, formatting, charts, insight text.
(function () {
  const TS = (window.TS = {});
  const STORE_KEY = 'toy-store-filters';

  const PAGES = [
    ['index.html', 'Overview'], ['traffic.html', 'Traffic'], ['funnel.html', 'Website funnel'],
    ['products.html', 'Products'], ['tables.html', 'Data tables'],
  ];

  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
  };

  // ---------------- icons (authored, 24px grid, 2px stroke) ----------------
  const ICONS = {
    chevron: '<path d="M6 9l6 6 6-6"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    filter: '<path d="M4 5h16l-6 7.5V19l-4-2v-4.5z"/>',
    up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
    first: '<path d="M11 7l-5 5 5 5M18 7l-5 5 5 5"/>',
    prev: '<path d="M14 6l-6 6 6 6"/>',
    next: '<path d="M10 6l6 6-6 6"/>',
    last: '<path d="M13 7l5 5-5 5M6 7l5 5-5 5"/>',
    reset: '<path d="M4 12a8 8 0 1 0 2.3-5.6"/><path d="M4 4v4h4"/>',
  };
  TS.icon = name => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;
  const BEAR = `<svg viewBox="0 0 40 40" aria-hidden="true">
    <circle cx="9" cy="10" r="6.5" fill="#fff"/><circle cx="31" cy="10" r="6.5" fill="#fff"/>
    <circle cx="9" cy="10" r="3" fill="#1638a8"/><circle cx="31" cy="10" r="3" fill="#1638a8"/>
    <circle cx="20" cy="22" r="15" fill="#fff"/>
    <ellipse cx="20" cy="27" rx="7" ry="5.5" fill="#dce4ff"/>
    <circle cx="14.5" cy="19" r="1.9" fill="#14183a"/><circle cx="25.5" cy="19" r="1.9" fill="#14183a"/>
    <path d="M17.6 24.8h4.8l-2.4 2.6z" fill="#14183a"/>
  </svg>`;

  // ---------------- formatting ----------------
  const nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
  const usd0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const usd2 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  TS.fmt = {
    int: v => nf0.format(v || 0),
    usd: v => usd0.format(v || 0),
    usd2: v => usd2.format(v || 0),
    usdK: v => (Math.abs(v) >= 1e6 ? '$' + (v / 1e6).toFixed(2) + 'M' : Math.abs(v) >= 1e4 ? '$' + (v / 1e3).toFixed(0) + 'K' : usd0.format(v || 0)),
    pct: (v, d = 1) => (isFinite(v) ? (v * 100).toFixed(d) + '%' : '–'),
    x: v => (isFinite(v) ? v.toFixed(v >= 10 ? 0 : 1) + '×' : '–'),
    compact: v => (Math.abs(v) >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : Math.abs(v) >= 1e3 ? (v / 1e3).toFixed(Math.abs(v) >= 1e4 ? 0 : 1) + 'K' : nf0.format(v)),
    month: m => { const [y, mo] = m.split('-'); return new Date(+y, +mo - 1, 1).toLocaleString('en-US', { month: 'short', year: 'numeric' }); },
  };
  TS.div = (a, b) => (b ? a / b : NaN);
  TS.esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  TS.cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  TS.shortName = name => name.replace(/^The /, '');

  // ---------------- data ----------------
  TS.load = async function () {
    const get = f => fetch('data/' + f).then(r => { if (!r.ok) throw new Error(`data/${f} returned ${r.status}`); return r.json(); });
    const [meta, cube, orders, items] = await Promise.all([get('meta.json'), get('cube.json'), get('orders.json'), get('items.json')]);
    TS.meta = meta; TS.cube = cube; TS.orders = orders; TS.items = items;
    const c = {}; cube.cols.forEach((n, i) => (c[n] = i)); TS.C = c;
    const ordered = (vals, pref) => [...new Set(vals)].sort((a, b) => (pref.indexOf(a) + 1 || 99) - (pref.indexOf(b) + 1 || 99));
    TS.sources = ordered(meta.utm.map(u => u.source), ['gsearch', 'bsearch', 'socialbook', 'organic', 'direct']);
    TS.campaigns = ordered(meta.utm.map(u => u.campaign), ['nonbrand', 'brand', 'pilot', 'desktop_targeted', '(none)']);
    TS.channels = ['Paid search - nonbrand', 'Paid search - brand', 'Paid social', 'Organic search', 'Direct type-in'];
    initFilters();
    return TS;
  };

  // Channels: display names, sentence phrases, and the slicer patch that selects one
  const CH = {
    'Paid search - nonbrand': { label: 'Paid search · nonbrand', phrase: 'nonbrand paid search', patch: { source: [], campaign: ['nonbrand'] } },
    'Paid search - brand': { label: 'Paid search · brand', phrase: 'brand paid search', patch: { source: [], campaign: ['brand'] } },
    'Paid social': { label: 'Paid social', phrase: 'paid social', patch: { source: ['socialbook'], campaign: [] } },
    'Organic search': { label: 'Organic search', phrase: 'organic search', patch: { source: ['organic'], campaign: [] } },
    'Direct type-in': { label: 'Direct type-in', phrase: 'direct type-in', patch: { source: ['direct'], campaign: [] } },
  };
  TS.channelLabel = c => CH[c].label;
  TS.channelPhrase = c => CH[c].phrase;
  TS.selectedChannel = () => {
    const f = TS.filters;
    return TS.channels.find(c => {
      const p = CH[c].patch;
      return JSON.stringify(p.source) === JSON.stringify(f.source) && JSON.stringify(p.campaign) === JSON.stringify(f.campaign);
    }) || null;
  };
  TS.pickChannel = c => TS.setFilter(TS.selectedChannel() === c ? { source: [], campaign: [] } : { ...CH[c].patch });

  // ---------------- global filters (slicers) ----------------
  const DIMS = ['product', 'source', 'campaign', 'device', 'repeat'];
  TS.filters = null;
  const listeners = [];
  TS.onChange = fn => listeners.push(fn);

  function initFilters() {
    const last = TS.meta.months.length - 1;
    const saved = store.get(STORE_KEY) || {};
    const f = { from: 0, to: last };
    if (Number.isInteger(saved.from) && saved.from >= 0 && saved.from <= last) f.from = saved.from;
    if (Number.isInteger(saved.to) && saved.to >= f.from && saved.to <= last) f.to = saved.to;
    DIMS.forEach(d => (f[d] = Array.isArray(saved[d]) ? saved[d] : []));
    TS.filters = f;
    compile();
  }
  function utmMask(ignore) {
    const f = TS.filters;
    const src = !ignore.has('source') && f.source.length ? new Set(f.source) : null;
    const camp = !ignore.has('campaign') && f.campaign.length ? new Set(f.campaign) : null;
    return TS.meta.utm.map(u => (!src || src.has(u.source)) && (!camp || camp.has(u.campaign)));
  }
  function compile() {
    const f = TS.filters;
    TS.utmOk = utmMask(new Set());
    TS.devOk = [0, 1].map(d => !f.device.length || f.device.includes(d));
    TS.repOk = [0, 1].map(r => !f.repeat.length || f.repeat.includes(r));
    TS.prodSet = f.product.length ? new Set(f.product) : null;
    TS.prodMask = f.product.reduce((m, p) => m | (1 << (p - 1)), 0);
  }
  TS.setFilter = function (patch, silent) {
    Object.assign(TS.filters, patch);
    compile();
    store.set(STORE_KEY, TS.filters);
    renderSlicers();
    if (!silent) listeners.forEach(fn => fn(TS.filters));
  };
  TS.clearFilters = () => TS.setFilter({ from: 0, to: TS.meta.months.length - 1, product: [], source: [], campaign: [], device: [], repeat: [] });
  // click = only this value; click again = clear; ctrl/shift-click = add/remove
  TS.crossFilter = function (dim, value, additive) {
    const cur = TS.filters[dim];
    const next = additive ? (cur.includes(value) ? cur.filter(v => v !== value) : [...cur, value])
      : cur.length === 1 && cur[0] === value ? [] : [value];
    TS.setFilter({ [dim]: next });
  };
  TS.isFiltered = () => TS.filters.from > 0 || TS.filters.to < TS.meta.months.length - 1 || DIMS.some(d => TS.filters[d].length);

  // ---------------- predicates ----------------
  const monthOk = m => m >= TS.filters.from && m <= TS.filters.to;
  TS.monthOk = monthOk;
  // opts.ignore: dims to skip ('date', 'product', 'source', 'campaign', 'utm', 'device', 'repeat')
  TS.cubeRows = function (opts = {}) {
    const ig = new Set(opts.ignore || []), c = TS.C, out = [];
    if (ig.has('utm')) { ig.add('source'); ig.add('campaign'); }
    const utmOk = ig.has('source') || ig.has('campaign') ? utmMask(ig) : TS.utmOk;
    for (const r of TS.cube.rows) {
      if (!ig.has('date') && !monthOk(r[c.m])) continue;
      if (!utmOk[r[c.utm]]) continue;
      if (!ig.has('device') && !TS.devOk[r[c.dev]]) continue;
      if (!ig.has('repeat') && !TS.repOk[r[c.rep]]) continue;
      if (!ig.has('product') && TS.prodSet && !TS.prodSet.has(r[c.prod])) continue;
      out.push(r);
    }
    return out;
  };
  TS.orderOk = function (i, ig) {
    const o = TS.orders;
    if (!monthOk(o.m[i]) || !TS.devOk[o.dev[i]] || !TS.repOk[o.rep[i]]) return false;
    if (!(ig && ig.utm) && !TS.utmOk[o.utm[i]]) return false;
    if (!(ig && ig.product) && TS.prodMask && !(o.mask[i] & TS.prodMask)) return false;
    return true;
  };
  TS.itemOk = function (j, ig) {
    const it = TS.items, oi = it.oi[j], o = TS.orders;
    if (!monthOk(o.m[oi]) || !TS.utmOk[o.utm[oi]] || !TS.devOk[o.dev[oi]] || !TS.repOk[o.rep[oi]]) return false;
    if (!(ig && ig.product) && TS.prodSet && !TS.prodSet.has(it.prod[j])) return false;
    return true;
  };
  // Month indexes in range, excluding the partial final month (Mar 2015) when other months exist
  TS.fullMonths = () => {
    const f = TS.filters, last = TS.meta.months.length - 1, out = [];
    for (let m = f.from; m <= f.to; m++) out.push(m);
    return out.length > 1 && out[out.length - 1] === last ? out.slice(0, -1) : out;
  };
  TS.rangeLabel = () => {
    const f = TS.filters, M = TS.meta.months;
    return f.from === f.to ? TS.fmt.month(M[f.from]) : `${TS.fmt.month(M[f.from])} – ${TS.fmt.month(M[f.to])}`;
  };

  // ---------------- slicer UI ----------------
  let openPop = null;
  function closePop() {
    if (!openPop) return;
    openPop.parentElement.querySelector('.slicer-btn').setAttribute('aria-expanded', 'false');
    openPop.remove(); openPop = null;
  }
  document.addEventListener('mousedown', e => { if (openPop && !openPop.parentElement.contains(e.target)) closePop(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closePop(); });
  window.addEventListener('scroll', closePop, { passive: true });
  window.addEventListener('resize', closePop);

  function dimOptions(dim) {
    const m = TS.meta;
    switch (dim) {
      case 'product': return m.products.map(p => [p.id, p.name]);
      case 'source': return TS.sources.map(s => [s, s]);
      case 'campaign': return TS.campaigns.map(s => [s, s]);
      case 'device': return m.devices.map((d, i) => [i, TS.cap(d)]);
      case 'repeat': return [[0, 'New visitor'], [1, 'Repeat visitor']];
    }
  }
  const DIM_LABEL = { product: 'Product', source: 'Source', campaign: 'Campaign', device: 'Device', repeat: 'Visitor' };
  const DIM_NOTE = {
    product: 'Orders that contain the product, and sessions that viewed its product page.',
    source: 'organic = search engine without a paid click; direct = no referrer.',
  };
  // Test-strip preview: sessions each option would leave, given every other slicer
  function previewCounts(dim) {
    const C = TS.C, u = TS.meta.utm, counts = new Map();
    const key = {
      product: r => r[C.prod], source: r => u[r[C.utm]].source, campaign: r => u[r[C.utm]].campaign,
      device: r => r[C.dev], repeat: r => r[C.rep],
    }[dim];
    for (const r of TS.cubeRows({ ignore: [dim] })) { const k = key(r); counts.set(k, (counts.get(k) || 0) + r[C.sessions]); }
    return counts;
  }

  function renderSlicers() {
    const host = document.getElementById('slicers');
    if (!host || !TS.meta) return;
    closePop();
    const f = TS.filters, months = TS.meta.months, last = months.length - 1;
    host.innerHTML = '';
    const dateOn = f.from > 0 || f.to < last;
    host.appendChild(slicerBtn('Date', dateOn ? TS.rangeLabel() : 'Mar 2012 – Mar 2015', dateOn, datePopover));
    DIMS.forEach(dim => {
      const opts = dimOptions(dim), sel = f[dim];
      const val = !sel.length ? 'All' : sel.length === 1 ? opts.find(o => o[0] === sel[0])?.[1] : `${sel.length} selected`;
      host.appendChild(slicerBtn(DIM_LABEL[dim], val, sel.length > 0, pop => listPopover(pop, dim, opts)));
    });
    const clear = document.createElement('button');
    clear.className = 'link-btn'; clear.innerHTML = `${TS.icon('reset')} Reset filters`; clear.hidden = !TS.isFiltered();
    clear.onclick = TS.clearFilters;
    host.appendChild(clear);
    const note = document.createElement('span');
    note.className = 'flap-note';
    note.textContent = 'Click any bar or row to filter by it · Ctrl+click to add';
    host.appendChild(note);
  }

  function slicerBtn(label, value, on, build) {
    const wrap = document.createElement('div');
    wrap.className = 'slicer';
    const b = document.createElement('button');
    b.className = 'slicer-btn' + (on ? ' on' : '');
    b.setAttribute('aria-haspopup', 'true'); b.setAttribute('aria-expanded', 'false');
    b.innerHTML = `<span class="lbl">${label}</span><span class="val">${TS.esc(value)}</span>${TS.icon('chevron')}`;
    b.onclick = () => {
      const was = openPop && openPop.parentElement === wrap;
      closePop();
      if (was) return;
      const pop = document.createElement('div');
      pop.className = 'popover';
      wrap.appendChild(pop);
      openPop = pop;
      b.setAttribute('aria-expanded', 'true');
      build(pop);
      const r = b.getBoundingClientRect();
      pop.style.top = r.bottom + 6 + 'px';
      pop.style.left = Math.max(8, Math.min(r.left, window.innerWidth - pop.offsetWidth - 8)) + 'px';
    };
    wrap.appendChild(b);
    return wrap;
  }

  function datePopover(pop) {
    const months = TS.meta.months, f = TS.filters, last = months.length - 1;
    const opt = sel => months.map((m, i) => `<option value="${i}" ${i === sel ? 'selected' : ''}>${TS.fmt.month(m)}</option>`).join('');
    const years = [...new Set(months.map(m => m.slice(0, 4)))];
    const yearOf = y => { const idx = months.map((m, i) => (m.startsWith(y) ? i : -1)).filter(i => i >= 0); return [idx[0], idx[idx.length - 1]]; };
    const isOn = (a, b) => f.from === a && f.to === b;
    pop.innerHTML = `
      <div class="presets">
        <button class="chip ${isOn(0, last) ? 'on' : ''}" data-p="all">All time</button>
        ${years.map(y => { const [a, b] = yearOf(y); return `<button class="chip ${isOn(a, b) ? 'on' : ''}" data-p="${y}">${y}${y === '2015' ? ' (to 19 Mar)' : ''}</button>`; }).join('')}
        <button class="chip ${isOn(last - 11, last) ? 'on' : ''}" data-p="12">Last 12 months</button>
      </div>
      <hr class="pop-sep">
      <div class="pop-row">
        <label><span class="pop-label">From</span><select class="field" id="dfrom">${opt(f.from)}</select></label>
        <label><span class="pop-label">To</span><select class="field" id="dto">${opt(f.to)}</select></label>
      </div>`;
    pop.querySelectorAll('[data-p]').forEach(b => (b.onclick = () => {
      const p = b.dataset.p;
      if (p === 'all') TS.setFilter({ from: 0, to: last });
      else if (p === '12') TS.setFilter({ from: last - 11, to: last });
      else { const [a, z] = yearOf(p); TS.setFilter({ from: a, to: z }); }
    }));
    const from = pop.querySelector('#dfrom'), to = pop.querySelector('#dto');
    const apply = () => { let a = +from.value, b = +to.value; if (a > b) [a, b] = [b, a]; TS.setFilter({ from: a, to: b }); };
    from.onchange = apply; to.onchange = apply;
  }

  function listPopover(pop, dim, opts) {
    const sel = new Set(TS.filters[dim]);
    const counts = previewCounts(dim);
    const max = Math.max(1, ...opts.map(([v]) => counts.get(v) || 0));
    pop.innerHTML = (DIM_NOTE[dim] ? `<p class="pop-note">${DIM_NOTE[dim]}</p>` : '') +
      `<label class="opt"><input type="checkbox" data-all ${!sel.size ? 'checked' : ''}><b>All</b><span class="n">sessions</span></label><hr class="pop-sep"><div class="opts">` +
      opts.map(([v, l]) => {
        const n = counts.get(v) || 0;
        return `<label class="opt ${n ? '' : 'zero'}"><input type="checkbox" data-v='${JSON.stringify(v)}' ${sel.has(v) ? 'checked' : ''}><span>${TS.esc(l)}</span><span class="n">${TS.fmt.int(n)}</span><span class="bar"><i style="width:${(n / max) * 100}%"></i></span></label>`;
      }).join('') + '</div>';
    pop.querySelector('[data-all]').onchange = () => TS.setFilter({ [dim]: [] });
    pop.querySelectorAll('[data-v]').forEach(cb => (cb.onchange = () => {
      const v = JSON.parse(cb.dataset.v);
      cb.checked ? sel.add(v) : sel.delete(v);
      const next = sel.size === opts.length ? [] : opts.map(o => o[0]).filter(x => sel.has(x));
      TS.setFilter({ [dim]: next });
      const wrap = document.querySelectorAll('#slicers .slicer')[DIMS.indexOf(dim) + 1];
      if (wrap) wrap.querySelector('.slicer-btn').click(); // keep open for multi-select
    }));
  }

  // ---------------- page shell ----------------
  TS.shell = function () {
    const here = location.pathname.split('/').pop() || 'index.html';
    const header = document.querySelector('header.boxfront');
    const brand = document.createElement('div');
    brand.className = 'wrap brandrow';
    brand.innerHTML = `<a class="brand" href="index.html">${BEAR}<span><b>Maven Fuzzy Factory</b><span>Marketing &amp; sales analysis</span></span></a>
      <nav class="tabs" aria-label="Pages">${PAGES.map(([h, l]) => `<a href="${h}" ${h === here ? 'aria-current="page"' : ''}>${l}</a>`).join('')}</nav>
      <div class="credit">Analysis &amp; build by <b>Hassan Rahman</b><br>Data: Maven Analytics · Mar 2012 – 19 Mar 2015</div>`;
    header.prepend(brand);
    const flap = document.createElement('div');
    flap.className = 'flap';
    flap.innerHTML = '<div class="wrap" id="slicers" role="toolbar" aria-label="Filters"></div>';
    header.after(flap);
    const foot = document.createElement('footer');
    foot.className = 'colophon';
    foot.innerHTML = `<div class="wrap"><span>Analysis &amp; build by <b>Hassan Rahman</b> · Data: <b>Maven Analytics</b>, Maven Fuzzy Factory dataset</span>
      <span>* Mar 2015 covers 1–19 March only · 473K sessions · 1.19M pageviews · 32K orders · <a href="../docs/tables-schema.md">Data model &amp; integrity checks</a></span></div>`;
    document.body.appendChild(foot);
  };

  TS.start = async function (render) {
    TS.shell();
    try {
      await TS.load();
    } catch (e) {
      const h = document.getElementById('headline');
      if (h) h.textContent = 'The data has not been built yet';
      const d = document.getElementById('dek');
      if (d) d.innerHTML = `Run <b>node web/scripts/build-data.js</b>, then <b>node web/serve.js</b>, from the toy-store folder. (${TS.esc(e.message)})`;
      return;
    }
    renderSlicers();
    TS.onChange(render);
    render(TS.filters);
    TS.firstRender = false;
  };
  TS.firstRender = true;

  // Write insight text; cross-fades after the first render
  TS.say = function (id, html) {
    const el = document.getElementById(id);
    if (!el) return;
    if (TS.firstRender || el.innerHTML === html) { el.innerHTML = html; return; }
    el.classList.add('is-updating');
    setTimeout(() => { el.innerHTML = html; el.classList.remove('is-updating'); }, 140);
  };
  TS.noData = 'No sessions match these filters. Widen the date range or reset filters.';

  // ---------------- charts (Chart.js) ----------------
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  TS.css = css;
  TS.color = slot => css('--s' + ((slot % 6) + 1));
  TS.slot = {
    product: id => id - 1,
    source: s => ({ gsearch: 0, bsearch: 1, socialbook: 2, organic: 3, direct: 4 }[s] ?? 5),
    channel: c => TS.channels.indexOf(c),
    device: d => d,
    landing: i => i,
  };
  // Value labels at the end of horizontal bars
  const endLabels = {
    id: 'endLabels',
    afterDatasetsDraw(chart) {
      const opt = chart.$endLabels;
      if (!opt || !opt.format) return;
      const { ctx } = chart;
      ctx.save();
      ctx.font = `600 12px ${css('--font')}`;
      ctx.fillStyle = css('--ink');
      ctx.textBaseline = 'middle';
      chart.data.datasets.forEach((ds, di) => {
        chart.getDatasetMeta(di).data.forEach((bar, i) => {
          const v = ds.data[i];
          if (v == null || !isFinite(v)) return;
          ctx.globalAlpha = opt.faded && opt.faded(i) ? 0.45 : 1;
          ctx.fillText(opt.format(v, i), bar.x + 8, bar.y);
        });
      });
      ctx.restore();
    },
  };
  let registered = false;
  const charts = {};
  TS.chart = function (id, config) {
    if (!window.Chart) return;
    if (!registered) { Chart.register(endLabels); registered = true; }
    if (charts[id]) charts[id].destroy();
    const el = document.getElementById(id);
    if (!el) return;
    const ink = css('--ink'), ink2 = css('--ink-2'), muted = css('--muted'), grid = css('--grid'), rule = css('--rule');
    Chart.defaults.font.family = css('--font');
    Chart.defaults.font.size = 12;
    Chart.defaults.color = ink2;
    const o = (config.options = config.options || {});
    o.responsive = true; o.maintainAspectRatio = false;
    o.animation = TS.firstRender ? false : { duration: 220, easing: 'easeOutQuart' };
    o.layout = Object.assign({ padding: { top: 4, right: config.endLabels ? (config.endLabels.pad || 64) : 4 } }, o.layout || {});
    o.plugins = Object.assign({
      legend: { position: 'top', align: 'start', labels: { boxWidth: 10, boxHeight: 10, useBorderRadius: true, borderRadius: 3, color: ink2, padding: 14, font: { weight: 600 } } },
      tooltip: {
        backgroundColor: '#ffffff', titleColor: ink, bodyColor: ink2, borderColor: rule, borderWidth: 1,
        padding: 12, boxPadding: 5, usePointStyle: true, cornerRadius: 10, titleFont: { weight: 700 },
      },
    }, o.plugins || {});
    const scale = s => Object.assign({ grid: { color: grid, drawTicks: false }, border: { display: false }, ticks: { color: muted, padding: 8 } }, s);
    o.scales = o.scales || {};
    ['x', 'y'].forEach(k => (o.scales[k] = scale(o.scales[k] || {})));
    if (config.type === 'line') {
      o.interaction = { mode: 'index', intersect: false };
      config.data.datasets.forEach((d, i) => (config.data.datasets[i] = { borderWidth: 2, pointRadius: 0, pointHoverRadius: 5, pointHoverBorderWidth: 2, pointHoverBorderColor: '#fff', pointHitRadius: 10, tension: 0.3, backgroundColor: d.borderColor, ...d }));
    }
    if (config.type === 'bar') {
      const stacked = o.scales.x.stacked || o.scales.y.stacked;
      config.data.datasets.forEach((d, i) => (config.data.datasets[i] = { borderRadius: stacked ? 2 : 5, borderSkipped: stacked ? false : 'start', borderColor: '#ffffff', borderWidth: stacked ? { top: 1.5 } : 0, maxBarThickness: 40, ...d }));
    }
    // The final month (Mar 2015) holds only 19 days: dash its line segment and lighten its bars
    const labels = config.data.labels || [];
    const pIdx = labels.indexOf(TS.PARTIAL);
    // Month axes: a fixed tick set that always keeps the first and the (partial) last month
    const monthAxis = labels.length > 6 && /^[A-Z][a-z]{2} \d{4}/.test(labels[0]) && !(o.indexAxis === 'y');
    if (monthAxis) {
      const last = labels.length - 1, boxW = el.parentElement.clientWidth || 600;
      const step = Math.ceil(last / Math.max(3, Math.min(7, Math.floor(boxW / 120))));
      Object.assign(o.scales.x.ticks, {
        autoSkip: false, maxRotation: 0,
        callback: i => {
          const keep = i === last || (i % step === 0 && last - i >= step * 0.9);
          if (!keep) return null;
          return labels[i] === TS.PARTIAL && TS.narrow() ? 'Mar 2015*' : labels[i];
        },
      });
    }
    if (pIdx > 0) {
      config.data.datasets.forEach(d => {
        if (config.type === 'line') d.segment = { borderDash: ctx => (ctx.p1DataIndex === pIdx ? [4, 4] : undefined) };
        else if (typeof d.backgroundColor === 'string') d.backgroundColor = labels.map((_, i) => (i === pIdx ? d.backgroundColor + '55' : d.backgroundColor));
      });
    }
    if (config.onPick) {
      const pick = config.onPick;
      o.onClick = (evt, els) => { if (els.length) pick(els[0], evt.native.ctrlKey || evt.native.metaKey || evt.native.shiftKey); };
      o.onHover = (evt, els) => (evt.native.target.style.cursor = els.length ? 'pointer' : 'default');
    }
    const endCfg = config.endLabels;
    delete config.endLabels;
    charts[id] = new Chart(el, config);
    charts[id].$endLabels = endCfg;
    if (endCfg) charts[id].draw();
    return charts[id];
  };
  // Focus and fade: selected categories keep full colour, the rest fade back
  TS.dimColors = (base, keys, selected) => keys.map((k, i) => {
    const c = Array.isArray(base) ? base[i] : base;
    return !selected.length || selected.includes(k) ? c : c + '38';
  });

  TS.kpis = function (host, list) {
    document.getElementById(host).innerHTML = list.map(k =>
      `<div title="${k.title || ''}"><dt>${k.label}</dt><dd>${k.value}${k.sub ? `<small>${k.sub}</small>` : ''}</dd></div>`).join('');
  };
  TS.table = function (host, cols, rows, opts = {}) {
    const head = cols.map(c => `<th class="${c.num ? 'num' : ''}" scope="col">${c.label}</th>`).join('');
    let anySel = false;
    const body = rows.map((r, i) => {
      const sel = opts.isSelected && opts.isSelected(r);
      anySel = anySel || sel;
      return `<tr class="${opts.onRow ? 'clickable' : ''} ${sel ? 'selected' : ''}" data-i="${i}" ${opts.onRow ? 'tabindex="0"' : ''}>` + cols.map(c => {
        const v = c.render ? c.render(r) : r[c.key];
        return `<td class="${c.num ? 'num' : ''} ${c.cls || ''}" ${c.style ? `style="${c.style(r)}"` : ''}>${v}</td>`;
      }).join('') + '</tr>';
    }).join('');
    const el = document.getElementById(host);
    el.innerHTML = `<div class="tbl-wrap"><table class="data ${anySel ? 'has-selection' : ''}"><thead><tr>${head}</tr></thead><tbody>${body ||
      `<tr><td colspan="${cols.length}" class="empty">${TS.noData}</td></tr>`}</tbody></table></div>`;
    if (opts.onRow) el.querySelectorAll('tbody tr[data-i]').forEach(tr => {
      const go = e => opts.onRow(rows[+tr.dataset.i], e.ctrlKey || e.metaKey || e.shiftKey);
      tr.onclick = go;
      tr.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(e); } };
    });
  };
  TS.PARTIAL = 'Mar 2015 (19 days)';
  TS.monthLabels = () => TS.meta.months.slice(TS.filters.from, TS.filters.to + 1)
    .map((m, i) => (TS.filters.from + i === TS.meta.months.length - 1 ? TS.PARTIAL : TS.fmt.month(m)));
  TS.narrow = () => window.innerWidth < 700;
  // Single-measure bars: one quiet tone, cobalt on the bars the headline names, orange on a named problem
  TS.emphasis = (keys, named, problem = []) => keys.map(k => (named.includes(k) ? TS.css('--s1') : problem.includes(k) ? TS.css('--s2') : TS.css('--quiet')));
  TS.usdTicks = { callback: v => '$' + TS.fmt.compact(v) };
})();
