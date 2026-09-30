// Shared app core: header, data loading, global slicers (Power BI style), filter predicates, formatting, charts.
(function () {
  const TS = (window.TS = {});
  const STORE_KEY = 'toy-store-filters';
  const THEME_KEY = 'toy-store-theme';

  const PAGES = [
    ['index.html', 'Overview'], ['products.html', 'Products'], ['traffic.html', 'Traffic'],
    ['funnel.html', 'Website Funnel'], ['tables.html', 'Data Tables'],
  ];

  // ---------------- storage (never required) ----------------
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } },
  };

  // ---------------- theme ----------------
  function applyTheme(t) {
    if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
    else delete document.documentElement.dataset.theme;
  }
  applyTheme(store.get(THEME_KEY));

  // ---------------- formatting ----------------
  const nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
  const usd0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const usd2 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  TS.fmt = {
    int: v => nf0.format(v || 0),
    usd: v => usd0.format(v || 0),
    usd2: v => usd2.format(v || 0),
    pct: (v, d = 1) => (isFinite(v) ? (v * 100).toFixed(d) + '%' : '–'),
    compact: v => (Math.abs(v) >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : Math.abs(v) >= 1e3 ? (v / 1e3).toFixed(v >= 1e4 ? 0 : 1) + 'K' : nf0.format(v)),
    month: m => { const [y, mo] = m.split('-'); return new Date(+y, +mo - 1, 1).toLocaleString('en-US', { month: 'short', year: 'numeric' }); },
  };
  TS.div = (a, b) => (b ? a / b : NaN);
  TS.esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---------------- data ----------------
  TS.load = async function () {
    const get = f => fetch('data/' + f).then(r => { if (!r.ok) throw new Error(f + ' ' + r.status); return r.json(); });
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

  // ---------------- global filters (slicers) ----------------
  // product: [1..4] | source: [str] | campaign: [str] | device: [0/1] | repeat: [0/1]
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

  function compile() {
    const f = TS.filters;
    const inSet = arr => (arr.length ? new Set(arr) : null);
    const src = inSet(f.source), camp = inSet(f.campaign);
    TS.utmOk = TS.meta.utm.map(u => (!src || src.has(u.source)) && (!camp || camp.has(u.campaign)));
    TS.devOk = [0, 1].map(d => !f.device.length || f.device.includes(d));
    TS.repOk = [0, 1].map(r => !f.repeat.length || f.repeat.includes(r));
    TS.prodSet = inSet(f.product);
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

  // Cross-filter from a chart click: click = only this value, click again = clear, ctrl/shift-click = add/remove.
  TS.crossFilter = function (dim, value, additive) {
    const cur = TS.filters[dim];
    let next;
    if (additive) next = cur.includes(value) ? cur.filter(v => v !== value) : [...cur, value];
    else next = cur.length === 1 && cur[0] === value ? [] : [value];
    TS.setFilter({ [dim]: next });
  };

  TS.isFiltered = () => TS.filters.from > 0 || TS.filters.to < TS.meta.months.length - 1 || DIMS.some(d => TS.filters[d].length);

  // Predicates -------------------------------------------------
  const monthOk = m => m >= TS.filters.from && m <= TS.filters.to;
  TS.monthOk = monthOk;
  // opts.ignore: array of dims to skip (e.g. a chart that shows every product)
  TS.cubeRows = function (opts = {}) {
    const ig = new Set(opts.ignore || []), c = TS.C, out = [];
    for (const r of TS.cube.rows) {
      if (!ig.has('date') && !monthOk(r[c.m])) continue;
      if (!ig.has('utm') && !TS.utmOk[r[c.utm]]) continue;
      if (!ig.has('device') && !TS.devOk[r[c.dev]]) continue;
      if (!ig.has('repeat') && !TS.repOk[r[c.rep]]) continue;
      if (!ig.has('product') && TS.prodSet && !TS.prodSet.has(r[c.prod])) continue;
      out.push(r);
    }
    return out;
  };
  TS.orderOk = function (i, ig) {
    const o = TS.orders;
    if (!monthOk(o.m[i]) || !TS.utmOk[o.utm[i]] || !TS.devOk[o.dev[i]] || !TS.repOk[o.rep[i]]) return false;
    if (!(ig && ig.product) && TS.prodMask && !(o.mask[i] & TS.prodMask)) return false;
    return true;
  };
  TS.itemOk = function (j, ig) {
    const it = TS.items, oi = it.oi[j], o = TS.orders;
    if (!monthOk(o.m[oi]) || !TS.utmOk[o.utm[oi]] || !TS.devOk[o.dev[oi]] || !TS.repOk[o.rep[oi]]) return false;
    if (!(ig && ig.product) && TS.prodSet && !TS.prodSet.has(it.prod[j])) return false;
    return true;
  };

  // ---------------- slicer UI ----------------
  let openPop = null;
  function closePop() { if (openPop) { openPop.remove(); openPop = null; } }
  document.addEventListener('mousedown', e => { if (openPop && !openPop.parentElement.contains(e.target)) closePop(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closePop(); });

  function dimOptions(dim) {
    const m = TS.meta;
    switch (dim) {
      case 'product': return m.products.map(p => [p.id, p.name]);
      case 'source': return TS.sources.map(s => [s, s]);
      case 'campaign': return TS.campaigns.map(s => [s, s]);
      case 'device': return m.devices.map((d, i) => [i, d[0].toUpperCase() + d.slice(1)]);
      case 'repeat': return [[0, 'New visitor'], [1, 'Repeat visitor']];
    }
  }
  const DIM_LABEL = { product: 'Product', source: 'Source', campaign: 'Campaign', device: 'Device', repeat: 'Visitor' };
  const DIM_HINT = {
    product: 'Orders containing the product · sessions that viewed its product page',
  };

  function renderSlicers() {
    const host = document.getElementById('slicers');
    if (!host || !TS.meta) return;
    closePop();
    const f = TS.filters, months = TS.meta.months, last = months.length - 1;
    host.innerHTML = '';
    const dateOn = f.from > 0 || f.to < last;
    host.appendChild(slicerBtn('Date', dateOn ? `${TS.fmt.month(months[f.from])} – ${TS.fmt.month(months[f.to])}` : 'All', dateOn, datePopover));
    DIMS.forEach(dim => {
      const opts = dimOptions(dim), sel = f[dim];
      const val = !sel.length ? 'All' : sel.length === 1 ? opts.find(o => o[0] === sel[0])?.[1] : `${sel.length} selected`;
      host.appendChild(slicerBtn(DIM_LABEL[dim], val, sel.length > 0, pop => listPopover(pop, dim, opts)));
    });
    const clear = document.createElement('button');
    clear.className = 'clear-all'; clear.textContent = 'Clear all filters'; clear.hidden = !TS.isFiltered();
    clear.onclick = TS.clearFilters;
    host.appendChild(clear);
    const hint = document.createElement('span');
    hint.className = 'hint'; hint.style.marginLeft = 'auto';
    hint.textContent = 'Tip: click a bar or row to cross-filter · Ctrl+click to add';
    host.appendChild(hint);
  }

  function slicerBtn(label, value, on, build) {
    const wrap = document.createElement('div');
    wrap.className = 'slicer';
    const b = document.createElement('button');
    b.className = 'slicer-btn' + (on ? ' on' : '');
    b.innerHTML = `<span class="lbl">${label}</span><span class="val">${TS.esc(value)}</span><span class="caret">▼</span>`;
    b.onclick = () => {
      const was = openPop && openPop.parentElement === wrap;
      closePop();
      if (was) return;
      const pop = document.createElement('div');
      pop.className = 'popover';
      wrap.appendChild(pop);
      openPop = pop;
      build(pop);
      const r = pop.getBoundingClientRect();
      if (r.right > window.innerWidth - 8) pop.classList.add('right');
    };
    wrap.appendChild(b);
    return wrap;
  }

  function datePopover(pop) {
    const months = TS.meta.months, f = TS.filters, last = months.length - 1;
    const opt = sel => months.map((m, i) => `<option value="${i}" ${i === sel ? 'selected' : ''}>${TS.fmt.month(m)}</option>`).join('');
    const years = [...new Set(months.map(m => m.slice(0, 4)))];
    pop.innerHTML = `
      <div class="presets" style="margin-bottom:8px">
        <button class="chip" data-p="all">All time</button>
        ${years.map(y => `<button class="chip" data-p="${y}">${y}</button>`).join('')}
        <button class="chip" data-p="12">Last 12 mo</button>
      </div>
      <div class="row"><label class="hint">From</label><label class="hint">To</label></div>
      <div class="row"><select id="dfrom">${opt(f.from)}</select><select id="dto">${opt(f.to)}</select></div>`;
    pop.querySelectorAll('[data-p]').forEach(b => (b.onclick = () => {
      const p = b.dataset.p;
      if (p === 'all') TS.setFilter({ from: 0, to: last });
      else if (p === '12') TS.setFilter({ from: last - 11, to: last });
      else {
        const idx = months.map((m, i) => (m.startsWith(p) ? i : -1)).filter(i => i >= 0);
        TS.setFilter({ from: idx[0], to: idx[idx.length - 1] });
      }
    }));
    const from = pop.querySelector('#dfrom'), to = pop.querySelector('#dto');
    const apply = () => {
      let a = +from.value, b = +to.value;
      if (a > b) [a, b] = [b, a];
      TS.setFilter({ from: a, to: b });
    };
    from.onchange = apply; to.onchange = apply;
  }

  function listPopover(pop, dim, opts) {
    const sel = new Set(TS.filters[dim]);
    pop.innerHTML = (DIM_HINT[dim] ? `<div class="hint" style="margin:0 6px 6px">${DIM_HINT[dim]}</div>` : '') +
      `<label class="opt"><input type="checkbox" data-all ${!sel.size ? 'checked' : ''}> <b>Select all</b></label><hr><div class="opts">` +
      opts.map(([v, l]) => `<label class="opt"><input type="checkbox" data-v='${JSON.stringify(v)}' ${sel.has(v) ? 'checked' : ''}> ${TS.esc(l)}</label>`).join('') +
      '</div>';
    pop.querySelector('[data-all]').onchange = () => TS.setFilter({ [dim]: [] });
    pop.querySelectorAll('[data-v]').forEach(cb => (cb.onchange = () => {
      const v = JSON.parse(cb.dataset.v);
      cb.checked ? sel.add(v) : sel.delete(v);
      // Selecting every option is the same as no filter
      const next = sel.size === opts.length ? [] : opts.map(o => o[0]).filter(x => sel.has(x));
      TS.setFilter({ [dim]: next });
      // keep popover open for multi-select
      const wrap = document.querySelectorAll('.slicer')[DIMS.indexOf(dim) + 1];
      if (wrap) wrap.querySelector('.slicer-btn').click();
    }));
  }

  // ---------------- page shell ----------------
  TS.shell = function (opts = {}) {
    const here = location.pathname.split('/').pop() || 'index.html';
    const header = document.createElement('header');
    header.className = 'topbar';
    header.innerHTML = `<div class="brand">Maven Fuzzy Factory <span>· Toy Store Analytics</span></div>
      <nav class="nav">${PAGES.map(([h, l]) => `<a href="${h}" class="${h === here ? 'active' : ''}">${l}</a>`).join('')}</nav>
      <div class="spacer"></div>
      <button class="icon-btn" id="theme-btn" title="Toggle light / dark theme"></button>`;
    document.body.prepend(header);
    if (opts.slicers !== false) {
      const s = document.createElement('div');
      s.id = 'slicers'; s.className = 'slicers';
      header.after(s);
    }
    const tb = header.querySelector('#theme-btn');
    const label = () => (tb.textContent = { light: '☀ Light', dark: '☾ Dark' }[store.get(THEME_KEY)] || '◐ Auto');
    label();
    tb.onclick = () => {
      const order = [null, 'light', 'dark'];
      const next = order[(order.indexOf(store.get(THEME_KEY)) + 1) % 3];
      store.set(THEME_KEY, next); applyTheme(next); label();
      listeners.forEach(fn => fn(TS.filters));
    };
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => listeners.forEach(fn => fn(TS.filters)));
  };

  TS.start = async function (render, opts = {}) {
    TS.shell(opts);
    const main = document.querySelector('main');
    try {
      await TS.load();
    } catch (e) {
      main.innerHTML = `<div class="card"><h2>Could not load data</h2><p class="desc">${TS.esc(e.message)}</p>
        <p>Build the data first, then serve the app over HTTP (see <code>web/README.md</code>):</p>
        <pre>node web/scripts/build-data.js\nnode web/serve.js</pre></div>`;
      return;
    }
    renderSlicers();
    TS.onChange(render);
    render(TS.filters);
  };

  // ---------------- charts (Chart.js) ----------------
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  TS.color = slot => css('--s' + ((slot % 8) + 1));
  TS.css = css;
  // Fixed entity → slot maps (color follows the entity, never its rank)
  TS.slot = {
    product: id => id - 1,
    source: s => ({ gsearch: 0, bsearch: 1, socialbook: 2, organic: 3, direct: 4 }[s] ?? 7),
    channel: c => TS.channels.indexOf(c),
    device: d => d,
    landing: i => i,
  };
  const charts = {};
  TS.chart = function (id, config) {
    if (charts[id]) charts[id].destroy();
    const el = document.getElementById(id);
    if (!el) return;
    const text2 = css('--text-2'), muted = css('--muted'), grid = css('--grid'), axis = css('--axis'), surface = css('--surface');
    Chart.defaults.font.family = css('--font');
    Chart.defaults.color = text2;
    const o = (config.options = config.options || {});
    o.responsive = true; o.maintainAspectRatio = false;
    o.animation = { duration: 250 };
    o.plugins = Object.assign({
      legend: { position: 'top', align: 'start', labels: { boxWidth: 10, boxHeight: 10, useBorderRadius: true, borderRadius: 2, color: text2 } },
      tooltip: {
        backgroundColor: surface, titleColor: css('--text'), bodyColor: text2, borderColor: css('--border'), borderWidth: 1,
        padding: 10, boxPadding: 4, usePointStyle: true,
      },
    }, o.plugins || {});
    const scale = s => Object.assign({
      grid: { color: grid, drawTicks: false }, border: { color: axis }, ticks: { color: muted, padding: 6 },
    }, s);
    o.scales = o.scales || {};
    ['x', 'y'].forEach(k => (o.scales[k] = scale(o.scales[k] || {})));
    if (config.type === 'line') {
      o.interaction = { mode: 'index', intersect: false };
      config.data.datasets.forEach((d, i) => (config.data.datasets[i] = { borderWidth: 2, pointRadius: 0, pointHoverRadius: 5, pointHitRadius: 10, tension: 0.25, backgroundColor: d.borderColor, ...d }));
    }
    if (config.type === 'bar') {
      const stacked = o.scales.x.stacked || o.scales.y.stacked;
      config.data.datasets.forEach((d, i) => (config.data.datasets[i] = { borderRadius: stacked ? 0 : 4, borderColor: surface, borderWidth: stacked ? { top: 2 } : 0, maxBarThickness: 48, ...d }));
    }
    if (config.onPick) {
      const pick = config.onPick;
      o.onClick = (evt, els) => { if (els.length) pick(els[0], evt.native.ctrlKey || evt.native.metaKey || evt.native.shiftKey); };
      o.onHover = (evt, els) => (evt.native.target.style.cursor = els.length ? 'pointer' : 'default');
    }
    charts[id] = new Chart(el, config);
    return charts[id];
  };
  // Highlight selected categories on a bar chart (dim the rest)
  TS.dimColors = (base, keys, selected) => keys.map((k, i) => {
    const c = Array.isArray(base) ? base[i] : base;
    return !selected.length || selected.includes(k) ? c : c + '40';
  });

  TS.kpis = function (host, list) {
    document.getElementById(host).innerHTML = list.map(k =>
      `<div class="kpi"><div class="k-label">${k.label}</div><div class="k-value">${k.value}</div>${k.sub ? `<div class="k-sub">${k.sub}</div>` : ''}</div>`).join('');
  };
  TS.table = function (host, cols, rows, opts = {}) {
    const head = cols.map(c => `<th class="${c.num ? 'num' : ''}">${c.label}</th>`).join('');
    const body = rows.map((r, i) => {
      const cls = [opts.onRow ? 'clickable' : '', opts.isSelected && opts.isSelected(r) ? 'selected' : ''].join(' ');
      return `<tr class="${cls}" data-i="${i}">` + cols.map(c => {
        const v = c.render ? c.render(r) : r[c.key];
        return `<td class="${c.num ? 'num' : ''}" ${c.style ? `style="${c.style(r)}"` : ''}>${v}</td>`;
      }).join('') + '</tr>';
    }).join('');
    const el = document.getElementById(host);
    el.innerHTML = `<div class="tbl-wrap"><table class="data"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
    if (opts.onRow) el.querySelectorAll('tbody tr').forEach(tr => (tr.onclick = e => opts.onRow(rows[+tr.dataset.i], e.ctrlKey || e.metaKey || e.shiftKey)));
  };
  TS.monthLabels = () => TS.meta.months.slice(TS.filters.from, TS.filters.to + 1).map(TS.fmt.month);
})();
