// Excel-style data grid: raw CSV tables + joined views, column filters, sort, search, paging, export.
(function () {
  const $ = id => document.getElementById(id);
  const cache = {};
  let ds = null;          // current dataset {name, cols:[{name,num}], data:[colArrays], n, slicer, scope}
  let colFilters = {};    // colIndex -> {values:Set|null, text:'', min:null, max:null}
  let sort = null;        // {col, dir}
  let view = [];          // filtered + sorted row indexes
  let page = 0;
  let loadToken = 0;

  // ---------- CSV parsing (columnar) ----------
  function splitLine(line) {
    if (line.indexOf('"') === -1) return line.split(',');
    const out = []; let cur = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (q) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') q = false;
        else cur += ch;
      } else if (ch === '"') q = true;
      else if (ch === ',') { out.push(cur); cur = ''; }
      else cur += ch;
    }
    out.push(cur);
    return out;
  }
  function parseCsv(text) {
    text = text.replace(/^﻿/, '');
    let pos = text.indexOf('\n');
    const header = splitLine(text.slice(0, pos).replace(/\r$/, ''));
    const data = header.map(() => []);
    pos++;
    while (pos < text.length) {
      let end = text.indexOf('\n', pos);
      if (end === -1) end = text.length;
      let line = text.slice(pos, end);
      if (line.endsWith('\r')) line = line.slice(0, -1);
      if (line) { const v = splitLine(line); for (let c = 0; c < header.length; c++) data[c].push(v[c] ?? ''); }
      pos = end + 1;
    }
    const cols = header.map((name, c) => {
      const col = data[c];
      let num = col.length > 0;
      for (let i = 0; i < col.length && num; i++) if (col[i] === '' || isNaN(col[i])) num = false;
      if (num) data[c] = Float64Array.from(col, Number);
      return { name, num };
    });
    return { cols, data, n: data[0].length };
  }

  // ---------- slicer mapping helpers ----------
  const monthStrOk = ts => {
    const m = ts.slice(0, 7), M = TS.meta.months;
    return m >= M[TS.filters.from] && m <= M[TS.filters.to];
  };
  const inList = (arr, v) => !arr.length || arr.includes(v);

  // ---------- dataset loaders ----------
  const RAW_SCOPE = {
    orders: 'All slicers', order_items: 'All slicers', order_item_refunds: 'All slicers (by refunded item)',
    website_sessions: 'Date, source, campaign, device, visitor', website_pageviews: 'Date only',
    products: 'Not applicable', maven_fuzzy_factory_data_dictionary: 'Not applicable',
  };
  async function loadRaw(name) {
    const res = await fetch('../data/' + name + '.csv');
    if (!res.ok) throw new Error(`Could not read data/${name}.csv (${res.status}). Serve the toy-store folder, not only web/.`);
    const d = parseCsv(await res.text());
    const col = n => d.data[d.cols.findIndex(c => c.name === n)];
    d.scope = RAW_SCOPE[name];
    if (name === 'orders') d.slicer = i => TS.orderOk(i);
    else if (name === 'order_items') d.slicer = i => TS.itemOk(i);
    else if (name === 'order_item_refunds') {
      const itemIdx = new Map(); TS.items.id.forEach((id, j) => itemIdx.set(id, j));
      const oi = col('order_item_id');
      d.slicer = i => TS.itemOk(itemIdx.get(oi[i]));
    } else if (name === 'website_sessions') {
      const ts = col('created_at'), src = col('utm_source'), camp = col('utm_campaign'), ref = col('http_referer'), dev = col('device_type'), rep = col('is_repeat_session');
      d.slicer = i => {
        const f = TS.filters;
        if (!monthStrOk(ts[i])) return false;
        const s = src[i] === 'NULL' ? (ref[i] === 'NULL' ? 'direct' : 'organic') : src[i];
        const c = camp[i] === 'NULL' ? '(none)' : camp[i];
        return inList(f.source, s) && inList(f.campaign, c) && inList(f.device, dev[i] === 'mobile' ? 1 : 0) && inList(f.repeat, rep[i]);
      };
    } else if (name === 'website_pageviews') {
      const ts = col('created_at');
      d.slicer = i => monthStrOk(ts[i]);
    }
    return d;
  }

  function fromColumns(cols, scope, slicer) {
    return { cols: cols.map(c => ({ name: c[0], num: c[1] instanceof Float64Array })), data: cols.map(c => c[1]), n: cols[0][1].length, scope, slicer };
  }
  const F = arr => Float64Array.from(arr);

  function joinedOrders() {
    const o = TS.orders, m = TS.meta, u = i => m.utm[o.utm[i]], P = m.products;
    const names = o.mask.map(mask => P.filter(p => mask & (1 << (p.id - 1))).map(p => p.name).join(' + '));
    return fromColumns([
      ['order_id', F(o.id)], ['created_at', o.ts], ['website_session_id', F(o.sid)], ['user_id', F(o.uid)],
      ['source', o.utm.map((_, i) => u(i).source)], ['campaign', o.utm.map((_, i) => u(i).campaign)],
      ['content', o.utm.map((_, i) => u(i).content)], ['channel', o.utm.map((_, i) => u(i).channel)],
      ['device_type', o.dev.map(d => m.devices[d])], ['is_repeat_session', F(o.rep)], ['landing_page', o.land.map(l => m.landings[l])],
      ['primary_product', o.prim.map(p => P[p - 1].name)], ['items_purchased', F(o.items)], ['products_in_order', names],
      ['price_usd', F(o.price)], ['cogs_usd', F(o.cogs)], ['gross_profit_usd', F(o.price.map((p, i) => +(p - o.cogs[i]).toFixed(2)))],
      ['refund_usd', F(o.refund)],
    ], 'All slicers', i => TS.orderOk(i));
  }
  function joinedItems() {
    const it = TS.items, o = TS.orders, m = TS.meta, P = m.products;
    const ou = j => m.utm[o.utm[it.oi[j]]];
    return fromColumns([
      ['order_item_id', F(it.id)], ['created_at', it.oi.map(i => o.ts[i])], ['order_id', F(it.oi.map(i => o.id[i]))],
      ['product_id', F(it.prod)], ['product_name', it.prod.map(p => P[p - 1].name)], ['is_primary_item', F(it.prim)],
      ['price_usd', F(it.price)], ['cogs_usd', F(it.cogs)], ['gross_profit_usd', F(it.price.map((p, j) => +(p - it.cogs[j]).toFixed(2)))],
      ['refunded', it.refund.map(r => (r ? 'Yes' : 'No'))], ['refund_usd', F(it.refund)], ['refund_created_at', it.refundTs],
      ['source', it.id.map((_, j) => ou(j).source)], ['campaign', it.id.map((_, j) => ou(j).campaign)],
      ['device_type', it.oi.map(i => m.devices[o.dev[i]])], ['is_repeat_session', F(it.oi.map(i => o.rep[i]))],
    ], 'All slicers', j => TS.itemOk(j));
  }
  async function joinedSessions() {
    const res = await fetch('data/sessions_enriched.csv');
    if (!res.ok) throw new Error('data/sessions_enriched.csv missing. Run: node web/scripts/build-data.js');
    const d = parseCsv(await res.text());
    const col = n => d.data[d.cols.findIndex(c => c.name === n)];
    const ts = col('created_at'), src = col('source'), camp = col('campaign'), dev = col('device_type'), rep = col('is_repeat_session'), prod = col('product_viewed');
    const pid = new Map(TS.meta.products.map(p => [p.name, p.id]));
    d.scope = 'All slicers (product = product page viewed)';
    d.slicer = i => {
      const f = TS.filters;
      return monthStrOk(ts[i]) && inList(f.source, src[i]) && inList(f.campaign, camp[i]) &&
        inList(f.device, dev[i] === 'mobile' ? 1 : 0) && inList(f.repeat, rep[i]) && (!f.product.length || f.product.includes(pid.get(prod[i])));
    };
    return d;
  }

  async function getDataset(key) {
    if (cache[key]) return cache[key];
    let d;
    if (key === 'j-orders') d = joinedOrders();
    else if (key === 'j-items') d = joinedItems();
    else if (key === 'j-sessions') d = await joinedSessions();
    else d = await loadRaw(key);
    d.key = key;
    return (cache[key] = d);
  }

  // ---------- filtering / sorting ----------
  const cellStr = (c, i) => { const v = ds.data[c][i]; return ds.cols[c].num ? fmtNum(c, v) : v; };
  function fmtNum(c, v) { return /usd/.test(ds.cols[c].name) ? v.toFixed(2) : String(v); }

  function passesCol(c, i, skip) {
    if (c === skip) return true;
    const cf = colFilters[c], v = ds.data[c][i];
    if (cf.values && !cf.values.has(v)) return false;
    if (cf.text && String(ds.cols[c].num ? fmtNum(c, v) : v).toLowerCase().indexOf(cf.text) === -1) return false;
    if (cf.min != null && v < cf.min) return false;
    if (cf.max != null && v > cf.max) return false;
    return true;
  }
  // rows passing slicers + search + all column filters except `skip`
  function filteredRows(skip) {
    const useSlicers = $('use-slicers').checked && ds.slicer;
    const q = $('search').value.trim().toLowerCase();
    const active = Object.keys(colFilters).map(Number).filter(c => c !== skip);
    const out = [];
    for (let i = 0; i < ds.n; i++) {
      if (useSlicers && !ds.slicer(i)) continue;
      let ok = true;
      for (const c of active) if (!passesCol(c, i, skip)) { ok = false; break; }
      if (!ok) continue;
      if (q) {
        let hit = false;
        for (let c = 0; c < ds.cols.length && !hit; c++) if (String(cellStr(c, i)).toLowerCase().indexOf(q) !== -1) hit = true;
        if (!hit) continue;
      }
      out.push(i);
    }
    return out;
  }
  function refresh(keepPage) {
    if (!ds) return;
    view = filteredRows(-1);
    if (sort) {
      const col = ds.data[sort.col], dir = sort.dir;
      view.sort((a, b) => (col[a] < col[b] ? -dir : col[a] > col[b] ? dir : a - b));
    }
    if (!keepPage) page = 0;
    renderGrid();
  }

  // ---------- rendering ----------
  function renderGrid() {
    const size = +$('page-size').value, pages = Math.max(1, Math.ceil(view.length / size));
    page = Math.min(page, pages - 1);
    const start = page * size, slice = view.slice(start, start + size);
    const head = ds.cols.map((c, ci) => {
      const s = sort && sort.col === ci ? `<span class="sort">${TS.icon(sort.dir > 0 ? 'up' : 'down')}</span>` : '';
      const on = colFilters[ci] ? ' on' : '';
      return `<th class="${c.num ? 'num' : ''}" data-c="${ci}"><div class="th-in"><span>${TS.esc(c.name)}</span>${s}<button class="fbtn${on}" data-f="${ci}" title="Filter or sort ${TS.esc(c.name)}" aria-label="Filter or sort ${TS.esc(c.name)}">${TS.icon('filter')}</button></div></th>`;
    }).join('');
    const body = slice.map(i => '<tr>' + ds.cols.map((c, ci) => `<td class="${c.num ? 'num' : ''}">${TS.esc(cellStr(ci, i))}</td>`).join('') + '</tr>').join('');
    $('grid').innerHTML = `<table class="data xl"><thead><tr>${head}</tr></thead><tbody>${body ||
      `<tr><td colspan="${ds.cols.length}" class="empty"><b>No rows match</b>Loosen a column filter, clear the search, or untick Apply filters.</td></tr>`}</tbody></table>`;
    $('grid').querySelectorAll('th').forEach(th => (th.onclick = e => {
      if (e.target.closest('.fbtn')) return;
      const c = +th.dataset.c;
      sort = !sort || sort.col !== c ? { col: c, dir: 1 } : sort.dir === 1 ? { col: c, dir: -1 } : null;
      refresh();
    }));
    $('grid').querySelectorAll('.fbtn').forEach(b => (b.onclick = e => { e.stopPropagation(); openColFilter(+b.dataset.f, b); }));
    $('info').textContent = `${TS.fmt.int(view.length)} of ${TS.fmt.int(ds.n)} rows` + (view.length ? ` · showing ${TS.fmt.int(start + 1)}–${TS.fmt.int(start + slice.length)}` : '');
    $('page-no').textContent = `Page ${TS.fmt.int(page + 1)} of ${TS.fmt.int(pages)}`;
    $('prev').disabled = $('first').disabled = page === 0;
    $('next').disabled = $('last').disabled = page >= pages - 1;
    $('clear-cols').disabled = !Object.keys(colFilters).length && !sort;
    $('slicer-scope').textContent = 'Filters applied: ' + (ds.scope || 'none, not applicable to this table');
  }

  // ---------- Excel-style column filter popover ----------
  let pop = null;
  function closePop() { if (pop) { pop.remove(); pop = null; } }
  document.addEventListener('mousedown', e => { if (pop && !pop.contains(e.target) && !e.target.closest('.fbtn')) closePop(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closePop(); });

  function openColFilter(c, btn) {
    closePop();
    const col = ds.cols[c], cf = colFilters[c] || {};
    // distinct values from rows that pass every *other* filter (Excel behaviour)
    const rows = filteredRows(c);
    const counts = new Map();
    for (const i of rows) { const v = ds.data[c][i]; counts.set(v, (counts.get(v) || 0) + 1); if (counts.size > 1000) break; }
    const listable = counts.size <= 1000;
    const values = listable ? [...counts.keys()].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)) : [];

    pop = document.createElement('div');
    pop.className = 'popover th-pop';
    pop.style.width = '300px';
    pop.innerHTML = `
      <div class="pop-row"><button class="btn" data-s="1">${TS.icon('up')} Sort ascending</button><button class="btn" data-s="-1">${TS.icon('down')} Descending</button></div><hr class="pop-sep">
      <div class="pop-row"><input type="text" class="field" id="cf-text" placeholder="Contains…" value="${TS.esc(cf.text || '')}"></div>
      ${col.num ? `<div class="pop-row"><input type="number" class="field" id="cf-min" placeholder="Min" value="${cf.min ?? ''}"><input type="number" class="field" id="cf-max" placeholder="Max" value="${cf.max ?? ''}"></div>` : ''}
      ${listable ? `<hr class="pop-sep"><div class="pop-row"><input type="text" class="field" id="cf-find" placeholder="Search values…"></div>
        <label class="opt"><input type="checkbox" id="cf-all"><b>Select all</b><span class="n">rows</span></label>
        <div class="opts" id="cf-list">${values.map((v, k) => `<label class="opt" data-k="${k}"><input type="checkbox" data-k="${k}" ${!cf.values || cf.values.has(v) ? 'checked' : ''}><span>${TS.esc(col.num ? fmtNum(c, v) : v === '' ? '(blank)' : v)}</span><span class="n">${TS.fmt.int(counts.get(v))}</span></label>`).join('')}</div>`
      : `<p class="pop-note">${TS.fmt.int(rows.length)} rows with more than 1,000 distinct values. Filter with Contains${col.num ? ' or Min / Max' : ''}.</p>`}
      <div class="pop-actions"><button class="btn" id="cf-clear">Clear</button><button class="btn primary" id="cf-ok">Apply</button></div>`;
    document.body.appendChild(pop);
    const r = btn.getBoundingClientRect();
    pop.style.top = Math.min(r.bottom + 4, window.innerHeight - pop.offsetHeight - 8) + 'px';
    pop.style.left = Math.max(8, Math.min(r.right - 300, window.innerWidth - 308)) + 'px';

    pop.querySelectorAll('[data-s]').forEach(b => (b.onclick = () => { sort = { col: c, dir: +b.dataset.s }; closePop(); refresh(); }));
    const boxes = [...pop.querySelectorAll('#cf-list input')];
    const all = pop.querySelector('#cf-all');
    const syncAll = () => { if (all) { const vis = boxes.filter(b => b.closest('label').style.display !== 'none'); all.checked = vis.every(b => b.checked); } };
    syncAll();
    if (all) all.onchange = () => { boxes.forEach(b => { if (b.closest('label').style.display !== 'none') b.checked = all.checked; }); };
    boxes.forEach(b => (b.onchange = syncAll));
    const find = pop.querySelector('#cf-find');
    if (find) find.oninput = () => {
      const q = find.value.toLowerCase();
      boxes.forEach(b => { const l = b.closest('label'); l.style.display = l.textContent.toLowerCase().includes(q) ? '' : 'none'; });
      syncAll();
    };
    pop.querySelector('#cf-clear').onclick = () => { delete colFilters[c]; closePop(); refresh(); };
    pop.querySelector('#cf-ok').onclick = () => {
      const next = {};
      const text = pop.querySelector('#cf-text').value.trim().toLowerCase();
      if (text) next.text = text;
      if (col.num) {
        const mn = pop.querySelector('#cf-min').value, mx = pop.querySelector('#cf-max').value;
        if (mn !== '') next.min = +mn;
        if (mx !== '') next.max = +mx;
      }
      if (listable) {
        const chosen = values.filter((v, k) => boxes[k].checked);
        if (chosen.length < values.length) next.values = new Set(chosen);
      }
      if (Object.keys(next).length) colFilters[c] = next; else delete colFilters[c];
      closePop(); refresh();
    };
    const t = pop.querySelector('#cf-text');
    t.onkeydown = e => { if (e.key === 'Enter') pop.querySelector('#cf-ok').click(); };
  }

  // ---------- export ----------
  function exportCsv() {
    const q = v => (/[",\n]/.test(v) ? '"' + String(v).replace(/"/g, '""') + '"' : v);
    const parts = [ds.cols.map(c => q(c.name)).join(',') + '\n'];
    let buf = '';
    for (const i of view) {
      buf += ds.cols.map((c, ci) => q(cellStr(ci, i))).join(',') + '\n';
      if (buf.length > 1 << 20) { parts.push(buf); buf = ''; }
    }
    parts.push(buf);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(parts, { type: 'text/csv' }));
    a.download = `${ds.key.replace(/^j-/, '')}${ds.key.startsWith('j-') ? '_enriched' : ''}_filtered.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  // ---------- wiring ----------
  async function selectView(key) {
    const token = ++loadToken;
    closePop();
    colFilters = {}; sort = null; page = 0;
    $('grid').innerHTML = `<div class="skeleton" aria-label="Loading ${TS.esc(key)}">${'<i></i>'.repeat(10)}</div>`;
    $('info').textContent = /pageviews|sessions/.test(key) ? 'Loading a large table, this can take a few seconds…' : 'Loading…';
    try {
      const d = await getDataset(key);
      if (token !== loadToken) return;
      ds = d;
      refresh();
    } catch (e) {
      $('grid').innerHTML = `<div class="empty"><b>This table could not be loaded</b>${TS.esc(e.message)}</div>`;
    }
    try { localStorage.setItem('toy-store-table', key); } catch { /* ignore */ }
  }

  TS.start(() => refresh(true)).then(() => {
    if (!TS.meta) return; // load failed; TS.start already showed the error
    let saved = null;
    try { saved = localStorage.getItem('toy-store-table'); } catch { /* ignore */ }
    if (saved && [...$('view').options].some(o => o.value === saved)) $('view').value = saved;
    selectView($('view').value);
  });

  $('export').innerHTML = `${TS.icon('download')} Export CSV`;
  [['first', 'first'], ['prev', 'prev'], ['next', 'next'], ['last', 'last']].forEach(([id, ic]) => ($(id).innerHTML = TS.icon(ic)));
  $('view').onchange = () => selectView($('view').value);
  let t;
  $('search').oninput = () => { clearTimeout(t); t = setTimeout(() => refresh(), 250); };
  $('use-slicers').onchange = () => refresh();
  $('page-size').onchange = () => { page = 0; renderGrid(); };
  $('first').onclick = () => { page = 0; renderGrid(); };
  $('prev').onclick = () => { page--; renderGrid(); };
  $('next').onclick = () => { page++; renderGrid(); };
  $('last').onclick = () => { page = 1e9; renderGrid(); };
  $('clear-cols').onclick = () => { colFilters = {}; sort = null; refresh(); };
  $('export').onclick = () => ds && exportCsv();
})();
