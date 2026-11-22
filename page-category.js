/* ==========================================================================
   AXIS Platform — Category performance pages
   Energy & Sustainability / Process Optimization / New Facilities
   Shared analytical engine driven by the page's data-category attribute.
   ========================================================================== */
'use strict';

(function () {
  const categoryKey = document.body.getAttribute('data-category') || 'energy';
  const meta = CATEGORIES[categoryKey] || CATEGORIES.energy;
  const PAGE = {
    energy: {
      title: 'Energy & Sustainability',
      sub: 'Energy efficiency, renewable generation and decarbonisation performance',
      tabs: [
        { id: 'energy', label: 'Energy performance' },
        { id: 'sustain', label: 'Sustainability & carbon' },
        { id: 'projects', label: 'Projects' }
      ]
    },
    process: {
      title: 'Process Optimization',
      sub: 'Specific energy consumption, yield, productivity and material efficiency',
      tabs: [
        { id: 'energy', label: 'Process efficiency' },
        { id: 'sustain', label: 'Resource & waste' },
        { id: 'projects', label: 'Projects' }
      ]
    },
    facilities: {
      title: 'New Facilities',
      sub: 'Capacity expansion, capital delivery and operational readiness',
      tabs: [
        { id: 'energy', label: 'Capacity delivery' },
        { id: 'sustain', label: 'Utility & carbon impact' },
        { id: 'projects', label: 'Projects' }
      ]
    }
  }[categoryKey] || {};

  const state = { tab: 'energy', company: '', factory: '' };

  App.boot({
    page: categoryKey === 'energy' ? 'energy' : categoryKey === 'process' ? 'process' : 'facilities',
    title: PAGE.title,
    crumb: PAGE.sub,
    render: paint
  });

  /** Projects in this category, optionally including related categories. */
  function scopeProjects() {
    let cats = [categoryKey];
    if (categoryKey === 'energy') cats = ['energy', 'sustainability'];
    if (categoryKey === 'process') cats = ['process', 'operations'];
    if (categoryKey === 'facilities') cats = ['facilities'];
    const P = portfolio({});
    return P.rows.filter(r => cats.indexOf(r.p.category) !== -1);
  }

  function paint(root) {
    const all = scopeProjects();
    let rows = all.filter(r => (!state.company || r.p.company === state.company) &&
      (!state.factory || r.p.factory === state.factory));

    const tt = tariffs();
    const companies = uniq(all.map(r => r.p.company)).sort();
    const factories = uniq(all.filter(r => !state.company || r.p.company === state.company).map(r => r.p.factory)).sort();

    root.innerHTML = `
      <div class="page-head">
        <div class="ph-txt">
          <h2>${esc(PAGE.title)}</h2>
          <div class="sub">${esc(PAGE.sub)} · ${rows.length} projects ·
            ${Fmt.money(sum(rows, r => r.mv.annual.cost))} measured annual benefit</div>
        </div>
        <div class="page-actions">
          <button class="btn btn-sm" id="cExp"><i class="fa-solid fa-file-excel"></i> Export</button>
          <button class="btn btn-sm" id="cPrint"><i class="fa-solid fa-print"></i> Report</button>
        </div>
      </div>

      <div class="card card-pad" style="margin-bottom:14px">
        <div class="filter-bar">
          <select id="cComp"><option value="">All companies</option>
            ${companies.map(c => `<option value="${esc(c)}"${state.company === c ? ' selected' : ''}>${esc(c)}</option>`).join('')}</select>
          <select id="cFac"><option value="">All facilities</option>
            ${factories.map(f => `<option value="${esc(f)}"${state.factory === f ? ' selected' : ''}>${esc(f)}</option>`).join('')}</select>
          <button class="btn btn-sm btn-ghost" id="cReset"><i class="fa-solid fa-rotate-left"></i> Reset</button>
        </div>
      </div>

      <div class="tabs" id="cTabs">
        ${PAGE.tabs.map((t, i) => `<button class="tab${i === 0 ? ' on' : ''}" data-t="${t.id}">${esc(t.label)}</button>`).join('')}
      </div>
      <div id="cBody"></div>
    `;

    $('#cComp').addEventListener('change', e => { state.company = e.target.value; state.factory = ''; paint(root); });
    $('#cFac').addEventListener('change', e => { state.factory = e.target.value; paint(root); });
    $('#cReset').addEventListener('click', () => { state.company = state.factory = ''; paint(root); });
    $('#cPrint').addEventListener('click', () => Export.printReport(PAGE.title, rows.length + ' projects · ' + Fmt.date(today())));
    $('#cExp').addEventListener('click', () => {
      Export.excel('AXIS_' + categoryKey + '_' + today() + '.xls', [
        { key: 'code', label: 'Code' }, { key: 'name', label: 'Project' },
        { key: 'sub', label: 'Subcategory' }, { key: 'factory', label: 'Facility' },
        { key: 'status', label: 'Status' }, { key: 'progress', label: 'Progress %' },
        { key: 'capex', label: 'CAPEX Actual' },
        { key: 'expected', label: 'Expected Savings /yr' },
        { key: 'measured', label: 'Measured Savings /yr' },
        { key: 'verified', label: 'Verified Savings /yr' },
        { key: 'achievement', label: 'Achievement %' },
        { key: 'elec', label: 'Electricity kWh/yr' }, { key: 'gas', label: 'Gas Nm3/yr' },
        { key: 'energy', label: 'Energy MWh/yr' }, { key: 'ghg', label: 'GHG tCO2e/yr' },
        { key: 'water', label: 'Water m3/yr' }, { key: 'waste', label: 'Waste t/yr' },
        { key: 'sec', label: 'SEC Improvement %' }, { key: 'capacity', label: 'Capacity Added' },
        { key: 'renewable', label: 'Renewable MWh/yr' }
      ], rows.map(r => ({
        code: r.p.code, name: r.p.name, sub: r.p.subcategory, factory: r.p.factory,
        status: r.p.status, progress: num(r.p.progress), capex: Math.round(r.fin.capex),
        expected: num(r.p.savings_expected), measured: Math.round(r.mv.annual.cost),
        verified: Math.round(r.mv.verified.cost),
        achievement: r.mv.achievement === null ? '' : Math.round(r.mv.achievement),
        elec: Math.round(r.mv.annual.elec), gas: Math.round(r.mv.annual.gas),
        energy: Math.round(r.mv.annual.energyMwh), ghg: Math.round(r.mv.annual.ghg),
        water: Math.round(r.mv.annual.water), waste: Math.round(r.mv.annual.waste),
        sec: num(r.p.sec_improvement_pct), capacity: num(r.p.capacity_added),
        renewable: num(r.p.renewable_mwh_year)
      })), PAGE.title + ' Report');
    });

    $$('#cTabs .tab').forEach(b => b.addEventListener('click', () => {
      state.tab = b.getAttribute('data-t');
      $$('#cTabs .tab').forEach(x => x.classList.toggle('on', x === b));
      body(state.tab, rows);
    }));

    body(state.tab, rows);
  }

  function body(tab, rows) {
    const host = $('#cBody');
    if (tab === 'projects') return projectTab(host, rows);
    if (tab === 'sustain') return sustainTab(host, rows);
    return energyTab(host, rows);
  }

  /* ------------------------------------------------------------------ */
  /* Tab 1 — efficiency / capacity                                        */
  /* ------------------------------------------------------------------ */
  function energyTab(host, rows) {
    const tt = tariffs();
    const t = {
      elec: sum(rows, r => r.mv.annual.elec),
      gas: sum(rows, r => r.mv.annual.gas),
      energy: sum(rows, r => r.mv.annual.energyMwh),
      verifiedEnergy: sum(rows, r => r.mv.verified.energyMwh),
      cost: sum(rows, r => r.mv.annual.cost),
      verifiedCost: sum(rows, r => r.mv.verified.cost),
      capex: sum(rows, r => r.fin.capex),
      renewable: sum(rows, r => num(r.p.renewable_mwh_year)),
      capacity: sum(rows, r => num(r.p.capacity_added)),
      sec: avg(rows.filter(r => num(r.p.sec_improvement_pct) > 0), r => num(r.p.sec_improvement_pct))
    };
    const expectCost = sum(rows, r => num(r.p.savings_expected));

    // by subcategory
    const subs = [];
    groupBy(rows, r => r.p.subcategory || 'Unclassified').forEach((list, sub) => {
      subs.push({
        sub: sub,
        n: list.length,
        energy: sum(list, r => r.mv.annual.energyMwh),
        cost: sum(list, r => r.mv.annual.cost),
        capex: sum(list, r => r.fin.capex),
        ghg: sum(list, r => r.mv.annual.ghg)
      });
    });
    subs.sort((a, b) => b.cost - a.cost);

    // monthly energy savings
    const periods = uniq(S.mvRecords.filter(r => rows.some(x => x.p.id === r.project_id)).map(r => r.period)).sort().slice(-12);
    const en = [], co = [];
    periods.forEach(per => {
      let e = 0, c = 0;
      rows.forEach(r => {
        const rec = r.mv.recs.find(x => x.period === per);
        if (!rec) return;
        const n = MV.normalize(rec, tt);
        e += n.energySavedKwh / 1000;
        c += n.costSaved;
      });
      en.push(Math.round(e)); co.push(Math.round(c));
    });

    // facility intensity comparison
    const fac = [];
    groupBy(rows.filter(r => r.mv.hasData), r => r.p.factory).forEach((list, f) => {
      fac.push({
        factory: f,
        energy: sum(list, r => r.mv.annual.energyMwh),
        cost: sum(list, r => r.mv.annual.cost),
        n: list.length,
        ghg: sum(list, r => r.mv.annual.ghg)
      });
    });
    fac.sort((a, b) => b.energy - a.energy);

    host.innerHTML = `
      <div class="grid g5" style="margin-bottom:14px">
        ${UI.kpi({ label: 'Total energy saved', value: Fmt.int(t.energy), unit: 'MWh/yr', accent: '#0ea5e9', icon: 'plug-circle-bolt',
          foot: Fmt.int(t.verifiedEnergy) + ' MWh verified' })}
        ${UI.kpi({ label: 'Electricity saved', value: Fmt.int(t.elec / 1000), unit: 'MWh/yr', accent: '#f5a524', icon: 'bolt',
          foot: Fmt.int(t.elec) + ' kWh/yr' })}
        ${UI.kpi({ label: 'Gas saved', value: Fmt.int(t.gas), unit: 'Nm³/yr', accent: '#f2545b', icon: 'fire-flame-simple',
          foot: 'Thermal energy avoided' })}
        ${UI.kpi({ label: 'Cost savings', value: Fmt.money(t.cost), accent: '#16c79a', icon: 'coins',
          foot: Fmt.pct(expectCost > 0 ? t.cost / expectCost * 100 : 0, 0) + ' of expected' })}
        ${UI.kpi({ label: 'Renewable output', value: Fmt.int(t.renewable), unit: 'MWh/yr', accent: '#9b7bff', icon: 'solar-panel',
          foot: 'Contracted generation' })}
      </div>

      <div class="grid g23" style="margin-bottom:14px">
        <div class="card">
          <div class="card-head"><h3>Energy savings trend</h3>
            <span class="ch-sub">Monthly energy avoided (MWh) and cost savings</span></div>
          <div class="card-body"><div class="chart-box lg"><canvas id="cTrend"></canvas></div></div>
        </div>
        <div class="card">
          <div class="card-head"><h3>Savings by subcategory</h3></div>
          <div class="card-body" style="padding:12px 15px;max-height:330px;overflow:auto">
            ${subs.length ? subs.map(s => `
              <div style="margin-bottom:12px">
                <div style="display:flex;justify-content:space-between;gap:8px;font-size:12.4px;margin-bottom:3px">
                  <span class="dim">${esc(s.sub)}</span>
                  <strong class="mono">${Fmt.money(s.cost)}</strong></div>
                <div class="prog"><i style="width:${t.cost > 0 ? clamp(s.cost / t.cost * 100, 2, 100) : 0}%"></i></div>
                <div class="tiny muted" style="margin-top:2px">${s.n} project${s.n === 1 ? '' : 's'} · ${Fmt.int(s.energy)} MWh/yr</div>
              </div>`).join('') : UI.empty('No data', 'Submit M&V records to populate the breakdown.', 'chart-simple')}
          </div>
        </div>
      </div>

      <div class="grid g2" style="margin-bottom:14px">
        <div class="card">
          <div class="card-head"><h3>Energy saved by facility</h3></div>
          <div class="card-body"><div class="chart-box"><canvas id="cFac"></canvas></div></div>
        </div>
        <div class="card">
          <div class="card-head"><h3>Investment efficiency</h3>
            <span class="ch-sub">CAPEX vs annual energy savings by project</span></div>
          <div class="card-body"><div class="chart-box"><canvas id="cEff"></canvas></div></div>
        </div>
      </div>

      <div class="card">
        <div class="card-head"><h3>Energy performance by project</h3>
          <span class="ch-sub">Ranked by measured energy savings</span></div>
        <div id="cTable"></div>
      </div>`;

    CH.mixed('cTrend', periods.map(p => Fmt.period(p)),
      [{ label: 'Energy saved', data: en, color: '#0ea5e9' }],
      [{ label: 'Cost savings', data: co, color: '#16c79a', axis: 'y1' }],
      { tooltip: { label: c => c.dataset.label === 'Energy saved' ? Fmt.int(c.parsed.y) + ' MWh' : Fmt.money(c.parsed.y) } });

    CH.hbar('cFac', fac.map(f => f.factory.replace(/ (Plant|Works|Mill|Complex|Bakery)$/, '')),
      fac.map(f => f.energy), { label: 'MWh/yr', colorFn: () => '#0ea5e9' });

    const eff = rows.filter(r => r.mv.hasData && r.fin.capex > 0).slice(0, 14);
    CH.make('cEff', {
      type: 'bar',
      data: {
        labels: eff.map(r => r.p.code),
        datasets: [{
          label: 'MWh saved per USD 1,000 CAPEX',
          data: eff.map(r => +(r.mv.annual.energyMwh / (r.fin.capex / 1000)).toFixed(2)),
          backgroundColor: eff.map(r => r.p.category === 'energy' ? '#f5a524' : '#16c79a'),
          borderRadius: 5, maxBarThickness: 28
        }]
      },
      options: {
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: c => c.parsed.y + ' MWh per $1,000 invested' } }
        },
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true, grid: { color: 'rgba(38,54,79,.42)' } }
        }
      }
    });

    DataTable.render($('#cTable'), {
      pageSize: 12, searchable: false,
      rows: rows.slice().sort((a, b) => b.mv.annual.energyMwh - a.mv.annual.energyMwh),
      columns: [
        { key: 'code', label: 'Code', width: '84px', render: r => `<a href="project.html?id=${esc(r.p.id)}" class="mono">${esc(r.p.code)}</a>` },
        { key: 'name', label: 'Project', render: r => `<div style="min-width:190px">${esc(r.p.name)}<div class="tiny muted">${esc(r.p.subcategory || '')}</div></div>` },
        { key: 'fac', label: 'Facility', render: r => '<span class="tiny">' + esc(r.p.factory) + '</span>' },
        { key: 'elec', label: 'kWh/yr', align: 'right', render: r => Fmt.int(r.mv.annual.elec), sortValue: r => r.mv.annual.elec },
        { key: 'gas', label: 'Nm³/yr', align: 'right', render: r => Fmt.int(r.mv.annual.gas), sortValue: r => r.mv.annual.gas },
        { key: 'mwh', label: 'MWh/yr', align: 'right', render: r => `<strong>${Fmt.int(r.mv.annual.energyMwh)}</strong>`, sortValue: r => r.mv.annual.energyMwh },
        { key: 'cost', label: 'USD/yr', align: 'right', render: r => Fmt.money(r.mv.annual.cost), sortValue: r => r.mv.annual.cost },
        { key: 'capex', label: 'CAPEX', align: 'right', render: r => Fmt.money(r.fin.capex), sortValue: r => r.fin.capex },
        { key: 'ach', label: 'Achieve', align: 'right', render: r => r.mv.achievement === null ? '—' :
            `<span class="badge ${r.mv.achievement >= 95 ? 'b-green' : r.mv.achievement >= 80 ? 'b-amber' : 'b-red'}">${Fmt.pct(r.mv.achievement, 0)}</span>`,
          sortValue: r => r.mv.achievement || 0 }
      ],
      footer: all => `<td colspan="3"><strong>Total</strong></td>
        <td class="num">${Fmt.int(sum(all, r => r.mv.annual.elec))}</td>
        <td class="num">${Fmt.int(sum(all, r => r.mv.annual.gas))}</td>
        <td class="num">${Fmt.int(sum(all, r => r.mv.annual.energyMwh))}</td>
        <td class="num">${Fmt.money(sum(all, r => r.mv.annual.cost))}</td>
        <td class="num">${Fmt.money(sum(all, r => r.fin.capex))}</td><td></td>`,
      emptyTitle: 'No projects', empty: 'No projects in this category match the filters.'
    });
  }

  /* ------------------------------------------------------------------ */
  /* Tab 2 — sustainability / carbon / resource                           */
  /* ------------------------------------------------------------------ */
  function sustainTab(host, rows) {
    const tt = tariffs();
    const ghg = sum(rows, r => r.mv.annual.ghg);
    const ghgV = sum(rows, r => r.mv.verified.ghg);
    const water = sum(rows, r => r.mv.annual.water);
    const waste = sum(rows, r => r.mv.annual.waste);
    const renew = sum(rows, r => num(r.p.renewable_mwh_year));
    const scope1 = sum(rows.filter(r => num(r.p.savings_gas_nm3_year) > 0), r => r.mv.annual.ghg);
    const scope2 = sum(rows.filter(r => num(r.p.savings_kwh_year) > 0), r => r.mv.annual.ghg);

    const periods = uniq(S.mvRecords.filter(r => rows.some(x => x.p.id === r.project_id)).map(r => r.period)).sort().slice(-12);
    const ghgSeries = [], waterSeries = [], wasteSeries = [];
    periods.forEach(per => {
      let g = 0, w = 0, ws = 0;
      rows.forEach(r => {
        const rec = r.mv.recs.find(x => x.period === per);
        if (!rec) return;
        const n = MV.normalize(rec, tt);
        g += n.ghgSaved; w += n.waterSaved; ws += n.wasteSaved;
      });
      ghgSeries.push(Math.round(g)); waterSeries.push(Math.round(w)); wasteSeries.push(Math.round(ws));
    });

    // carbon contribution by category of action
    const carbonMix = [];
    groupBy(rows.filter(r => r.mv.annual.ghg > 0), r => r.p.category).forEach((list, cat) => {
      carbonMix.push({ cat: (CATEGORIES[cat] || {}).short || cat, ghg: sum(list, r => r.mv.annual.ghg) });
    });
    carbonMix.sort((a, b) => b.ghg - a.ghg);

    host.innerHTML = `
      <div class="grid g5" style="margin-bottom:14px">
        ${UI.kpi({ label: 'GHG emissions avoided', value: Fmt.int(ghg), unit: 'tCO₂e/yr', accent: '#16c79a', icon: 'leaf',
          foot: Fmt.int(ghgV) + ' tCO₂e verified' })}
        ${UI.kpi({ label: 'Scope 1 avoided', value: Fmt.int(scope1), unit: 'tCO₂e/yr', accent: '#f2545b', icon: 'fire-flame-simple',
          foot: 'Fuel and gas combustion' })}
        ${UI.kpi({ label: 'Scope 2 avoided', value: Fmt.int(scope2), unit: 'tCO₂e/yr', accent: '#0ea5e9', icon: 'bolt',
          foot: 'Purchased electricity' })}
        ${UI.kpi({ label: 'Water saved', value: Fmt.int(water), unit: 'm³/yr', accent: '#3b9bff', icon: 'droplet',
          foot: 'Conservation and reuse' })}
        ${UI.kpi({ label: 'Waste reduced', value: Fmt.int(waste), unit: 't/yr', accent: '#9b7bff', icon: 'recycle',
          foot: 'Diverted or avoided' })}
      </div>

      <div class="grid g23" style="margin-bottom:14px">
        <div class="card">
          <div class="card-head"><h3>Decarbonisation trajectory</h3>
            <span class="ch-sub">Monthly GHG avoided and cumulative position</span></div>
          <div class="card-body"><div class="chart-box lg"><canvas id="sGhg"></canvas></div></div>
        </div>
        <div class="card">
          <div class="card-head"><h3>Carbon contribution</h3></div>
          <div class="card-body">
            <div class="chart-box" style="height:210px"><canvas id="sMix"></canvas></div>
            <div style="margin-top:12px">
              ${carbonMix.map(c => `<div class="stat-line"><span class="k">${esc(c.cat)}</span><span class="v">${Fmt.int(c.ghg)} t</span></div>`).join('')}
            </div>
          </div>
        </div>
      </div>

      <div class="grid g2" style="margin-bottom:14px">
        <div class="card">
          <div class="card-head"><h3>Water savings trend</h3><span class="ch-sub">m³ per month</span></div>
          <div class="card-body"><div class="chart-box"><canvas id="sWater"></canvas></div></div>
        </div>
        <div class="card">
          <div class="card-head"><h3>Waste reduction trend</h3><span class="ch-sub">tonnes per month</span></div>
          <div class="card-body"><div class="chart-box"><canvas id="sWaste"></canvas></div></div>
        </div>
      </div>

      <div class="card" style="margin-bottom:14px">
        <div class="card-head"><h3>Environmental performance by project</h3></div>
        <div id="sTable"></div>
      </div>

      <div class="card card-pad">
        <div style="display:flex;gap:11px;align-items:flex-start;flex-wrap:wrap">
          <i class="fa-solid fa-leaf" style="color:#16c79a;font-size:15px;margin-top:1px"></i>
          <div style="flex:1;min-width:260px;font-size:12.4px;color:var(--text-dim);line-height:1.65">
            <strong style="color:#fff">Emissions accounting basis.</strong>
            Avoided emissions are calculated from measured energy savings using grid emission factor
            ${tt.efElec} kgCO₂e/kWh (Scope 2) and natural gas factor ${tt.efGas} kgCO₂e/Nm³ (Scope 1).
            Renewable generation (${Fmt.int(renew)} MWh/yr contracted) is reported on a generation basis and is
            not double-counted in the avoided-emissions total.
          </div>
        </div>
      </div>`;

    let cum = 0;
    const ghgCum = ghgSeries.map(v => { cum += v; return cum; });
    CH.mixed('sGhg', periods.map(p => Fmt.period(p)),
      [{ label: 'GHG avoided', data: ghgSeries, color: '#16c79a' }],
      [{ label: 'Cumulative', data: ghgCum, color: '#9b7bff', axis: 'y1' }],
      { tooltip: { label: c => Fmt.int(c.parsed.y) + ' tCO₂e' } });

    CH.doughnut('sMix', carbonMix.map(c => c.cat), carbonMix.map(c => c.ghg), {
      cutout: '60%', legend: false,
      colors: carbonMix.map(c => {
        const k = Object.keys(CATEGORIES).find(k2 => CATEGORIES[k2].short === c.cat);
        return k ? CATEGORIES[k].color : '#64748b';
      }),
      tooltip: { label: c => c.label + ': ' + Fmt.int(c.parsed) + ' tCO₂e/yr' }
    });

    CH.bar('sWater', periods.map(p => Fmt.period(p)), [{ label: 'Water saved', data: waterSeries, color: '#3b9bff' }],
      { legend: false, tooltip: { label: c => Fmt.int(c.parsed.y) + ' m³' } });
    CH.bar('sWaste', periods.map(p => Fmt.period(p)), [{ label: 'Waste reduced', data: wasteSeries, color: '#9b7bff' }],
      { legend: false, tooltip: { label: c => Fmt.int(c.parsed.y) + ' t' } });

    DataTable.render($('#sTable'), {
      pageSize: 12, searchable: false,
      rows: rows.slice().sort((a, b) => b.mv.annual.ghg - a.mv.annual.ghg),
      columns: [
        { key: 'code', label: 'Code', width: '84px', render: r => `<a href="project.html?id=${esc(r.p.id)}" class="mono">${esc(r.p.code)}</a>` },
        { key: 'name', label: 'Project', render: r => `<div style="min-width:190px">${esc(r.p.name)}<div class="tiny muted">${esc(r.p.factory)}</div></div>` },
        { key: 'ghg', label: 'tCO₂e/yr', align: 'right', render: r => `<strong>${Fmt.int(r.mv.annual.ghg)}</strong>`, sortValue: r => r.mv.annual.ghg },
        { key: 'ghgV', label: 'Verified', align: 'right', render: r => Fmt.int(r.mv.verified.ghg), sortValue: r => r.mv.verified.ghg },
        { key: 'water', label: 'Water m³/yr', align: 'right', render: r => Fmt.int(r.mv.annual.water), sortValue: r => r.mv.annual.water },
        { key: 'waste', label: 'Waste t/yr', align: 'right', render: r => Fmt.int(r.mv.annual.waste), sortValue: r => r.mv.annual.waste },
        { key: 'renew', label: 'RE MWh/yr', align: 'right', render: r => num(r.p.renewable_mwh_year) ? Fmt.int(r.p.renewable_mwh_year) : '—', sortValue: r => num(r.p.renewable_mwh_year) },
        { key: 'sec', label: 'SEC impr.', align: 'right', render: r => num(r.p.sec_improvement_pct) ? Fmt.pct(r.p.sec_improvement_pct, 1) : '—', sortValue: r => num(r.p.sec_improvement_pct) },
        { key: 'ver', label: 'Verification', render: r => UI.verifyBadge(r.p.verification_status) }
      ],
      footer: all => `<td colspan="2"><strong>Total</strong></td>
        <td class="num">${Fmt.int(sum(all, r => r.mv.annual.ghg))}</td>
        <td class="num">${Fmt.int(sum(all, r => r.mv.verified.ghg))}</td>
        <td class="num">${Fmt.int(sum(all, r => r.mv.annual.water))}</td>
        <td class="num">${Fmt.int(sum(all, r => r.mv.annual.waste))}</td>
        <td class="num">${Fmt.int(sum(all, r => num(r.p.renewable_mwh_year)))}</td><td colspan="2"></td>`,
      emptyTitle: 'No projects'
    });
  }

  /* ------------------------------------------------------------------ */
  /* Tab 3 — project list                                                 */
  /* ------------------------------------------------------------------ */
  function projectTab(host, rows) {
    host.innerHTML = `
      <div class="card">
        <div class="card-head"><h3>${esc(PAGE.title)} projects</h3>
          <span class="ch-sub">${rows.length} projects</span></div>
        <div id="pList"></div>
      </div>`;

    DataTable.render($('#pList'), {
      pageSize: 20, searchable: true, rows: rows,
      onRowClick: r => { location.href = 'project.html?id=' + encodeURIComponent(r.p.id); },
      columns: [
        { key: 'code', label: 'Code', width: '84px', render: r => `<span class="mono">${esc(r.p.code)}</span>` },
        { key: 'name', label: 'Project', render: r => `<div style="min-width:210px">${esc(r.p.name)}<div class="tiny muted">${esc(r.p.subcategory || '')}</div></div>` },
        { key: 'fac', label: 'Facility', render: r => `<span class="tiny">${esc(r.p.factory)}</span>` },
        { key: 'owner', label: 'Owner', render: r => `<span class="tiny">${esc(r.p.owner || '—')}</span>` },
        { key: 'status', label: 'Status', render: r => UI.statusBadge(r.p.status) },
        { key: 'prog', label: 'Progress', width: '118px', render: r => UI.prog(r.p.progress, r.delayed ? 'bad' : '') },
        { key: 'capex', label: 'CAPEX', align: 'right', render: r => Fmt.money(r.fin.capex), sortValue: r => r.fin.capex },
        { key: 'meas', label: 'Measured /yr', align: 'right', render: r => r.mv.hasData ? Fmt.money(r.mv.annual.cost) : '—', sortValue: r => r.mv.annual.cost },
        { key: 'ach', label: 'Achieve', align: 'right', render: r => r.mv.achievement === null ? '—' :
            `<span class="badge ${r.mv.achievement >= 95 ? 'b-green' : r.mv.achievement >= 80 ? 'b-amber' : 'b-red'}">${Fmt.pct(r.mv.achievement, 0)}</span>`,
          sortValue: r => r.mv.achievement || 0 },
        { key: 'ver', label: 'Verification', render: r => UI.verifyBadge(r.p.verification_status) }
      ],
      emptyTitle: 'No projects', empty: 'No projects in this category match the filters.'
    });
  }
})();
