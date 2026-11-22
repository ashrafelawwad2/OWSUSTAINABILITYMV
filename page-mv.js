/* ==========================================================================
   AXIS Platform — Measurement & Verification module
   Portfolio M&V overview, savings tracking, verification queue, bulk data entry
   ========================================================================== */
'use strict';

(function () {
  const state = { tab: 'overview', method: '', verify: '', category: '' };

  App.boot({
    page: 'mv',
    title: 'M&V & Performance Verification',
    crumb: 'Measurement, verification and savings assurance',
    render: paint
  });

  function paint(root) {
    const P = portfolio({ category: state.category });
    let rows = P.rows.filter(r => r.p.mv_method || r.mv.hasData);
    if (state.method) rows = rows.filter(r => r.p.mv_method === state.method);
    if (state.verify) rows = rows.filter(r => r.p.verification_status === state.verify);

    const t = P.totals;
    const tt = tariffs();
    const canEdit = Session.canEdit();
    const canVerify = Session.canVerify();

    // verification queue: records pending verification
    const pending = [];
    rows.forEach(r => r.mv.norm.forEach(n => {
      if (!n.verified) pending.push({ project: r.p, norm: n, row: r });
    }));
    pending.sort((a, b) => String(b.norm.period).localeCompare(String(a.norm.period)));

    root.innerHTML = `
      <div class="page-head">
        <div class="ph-txt">
          <h2>Measurement &amp; Verification</h2>
          <div class="sub">IPMVP-aligned performance verification across ${rows.length} projects ·
            ${Fmt.money(t.savingsActual)} measured · ${Fmt.money(t.savingsVerified)} independently verified</div>
        </div>
        <div class="page-actions">
          <button class="btn btn-sm" id="expMv"><i class="fa-solid fa-file-excel"></i> Export portfolio</button>
          <button class="btn btn-sm" id="tplMv"><i class="fa-solid fa-file-arrow-down"></i> Data template</button>
          ${canEdit ? '<button class="btn btn-sm btn-primary" id="entryBtn"><i class="fa-solid fa-keyboard"></i> Enter data</button>' : ''}
        </div>
      </div>

      <div class="grid g5" style="margin-bottom:14px">
        ${UI.kpi({ label: 'M&V coverage', value: Fmt.pct(t.mvCoverage, 0), accent: '#3b9bff', icon: 'clipboard-check',
          bar: t.mvCoverage, foot: rows.filter(r => r.mv.hasData).length + ' of ' + rows.length + ' with data' })}
        ${UI.kpi({ label: 'Measured savings', value: Fmt.money(t.savingsActual), accent: '#16c79a', icon: 'chart-line',
          foot: 'Annualised cost savings' })}
        ${UI.kpi({ label: 'Verified savings', value: Fmt.money(t.savingsVerified), accent: '#9b7bff', icon: 'certificate',
          foot: Fmt.pct(t.verifyRate, 0) + ' of measured' })}
        ${UI.kpi({ label: 'Achievement', value: Fmt.pct(t.achievement, 0), accent: t.achievement >= 95 ? '#16c79a' : t.achievement >= 80 ? '#f5a524' : '#f2545b',
          icon: 'bullseye', bar: clamp(t.achievement, 0, 100), foot: 'vs ' + Fmt.money(t.savingsExpected) + ' expected' })}
        ${UI.kpi({ label: 'Pending verification', value: Fmt.int(pending.length), accent: '#f5a524', icon: 'hourglass-half',
          foot: pending.length ? 'periods awaiting sign-off' : 'all periods verified' })}
      </div>

      <div class="tabs" id="mvTabs">
        <button class="tab on" data-t="overview">Performance overview</button>
        <button class="tab" data-t="matrix">Savings matrix</button>
        <button class="tab" data-t="verify">Verification queue <span class="cnt">${pending.length}</span></button>
        <button class="tab" data-t="method">Methodology</button>
      </div>
      <div id="mvBody"></div>
    `;

    $$('#mvTabs .tab').forEach(b => b.addEventListener('click', () => {
      state.tab = b.getAttribute('data-t');
      $$('#mvTabs .tab').forEach(x => x.classList.toggle('on', x === b));
      body(state.tab);
    }));

    $('#expMv').addEventListener('click', () => {
      Export.excel('AXIS_MV_portfolio_' + today() + '.xls', [
        { key: 'code', label: 'Code' }, { key: 'name', label: 'Project' },
        { key: 'factory', label: 'Facility' }, { key: 'method', label: 'IPMVP Option' },
        { key: 'periods', label: 'Periods Reported' },
        { key: 'expected', label: 'Expected Savings /yr' },
        { key: 'measured', label: 'Measured Savings /yr' },
        { key: 'verified', label: 'Verified Savings /yr' },
        { key: 'achievement', label: 'Achievement %' },
        { key: 'energyMwh', label: 'Energy Saved MWh/yr' },
        { key: 'ghg', label: 'GHG Avoided tCO2e/yr' },
        { key: 'water', label: 'Water Saved m3/yr' },
        { key: 'waste', label: 'Waste Reduced t/yr' },
        { key: 'status', label: 'Verification Status' }
      ], rows.map(r => ({
        code: r.p.code, name: r.p.name, factory: r.p.factory,
        method: r.p.mv_method || '', periods: r.mv.months,
        expected: num(r.p.savings_expected), measured: Math.round(r.mv.annual.cost),
        verified: Math.round(r.mv.verified.cost),
        achievement: r.mv.achievement === null ? '' : Math.round(r.mv.achievement),
        energyMwh: Math.round(r.mv.annual.energyMwh), ghg: Math.round(r.mv.annual.ghg),
        water: Math.round(r.mv.annual.water), waste: Math.round(r.mv.annual.waste),
        status: r.p.verification_status
      })), 'M&V Performance Portfolio Report');
    });
    $('#tplMv').addEventListener('click', () => Export.mvTemplate());
    const eb = $('#entryBtn');
    if (eb) eb.addEventListener('click', () => bulkEntry(rows));

    body(state.tab);

    /* ---------------- tab renderers ---------------- */
    function body(tab) {
      const host = $('#mvBody');
      if (tab === 'overview') return overview(host, rows);
      if (tab === 'matrix') return matrix(host, rows);
      if (tab === 'verify') return verify(host, pending, canVerify);
      if (tab === 'method') return methodology(host, rows);
    }
  }

  /* ===================== Overview ===================== */
  function overview(host, rows) {
    const withData = rows.filter(r => r.mv.hasData);
    const tt = tariffs();

    // savings achievement distribution
    const buckets = { 'Exceeds (≥110%)': 0, 'On target (95-110%)': 0, 'Below (80-95%)': 0, 'Underperforming (<80%)': 0, 'No data': 0 };
    rows.forEach(r => {
      if (!r.mv.hasData || r.mv.achievement === null) { buckets['No data']++; return; }
      const a = r.mv.achievement;
      if (a >= 110) buckets['Exceeds (≥110%)']++;
      else if (a >= 95) buckets['On target (95-110%)']++;
      else if (a >= 80) buckets['Below (80-95%)']++;
      else buckets['Underperforming (<80%)']++;
    });

    // monthly portfolio savings trend
    const periods = uniq(S.mvRecords.map(r => r.period)).sort().slice(-12);
    const measured = [], verified = [], energyMwh = [], ghg = [];
    periods.forEach(per => {
      let cm = 0, cv = 0, e = 0, g = 0;
      rows.forEach(r => {
        const rec = r.mv.recs.find(x => x.period === per);
        if (!rec) return;
        const n = MV.normalize(rec, tt);
        cm += n.costSaved;
        e += n.energySavedKwh / 1000;
        g += n.ghgSaved;
        if (n.verified) cv += n.costSaved;
      });
      measured.push(Math.round(cm));
      verified.push(Math.round(cv));
      energyMwh.push(Math.round(e));
      ghg.push(Math.round(g));
    });

    // top achievement / bottom achievement
    const ranked = withData.filter(r => r.mv.achievement !== null).sort((a, b) => b.mv.achievement - a.mv.achievement);

    host.innerHTML = `
      <div class="grid g23" style="margin-bottom:14px">
        <div class="card">
          <div class="card-head"><h3>Portfolio savings trend</h3>
            <span class="ch-sub">Measured and verified cost savings by month</span></div>
          <div class="card-body"><div class="chart-box lg"><canvas id="mvTrend"></canvas></div></div>
        </div>
        <div class="card">
          <div class="card-head"><h3>Target achievement distribution</h3></div>
          <div class="card-body">
            <div class="chart-box" style="height:206px"><canvas id="mvDist"></canvas></div>
            <div style="margin-top:12px">
              ${Object.keys(buckets).map(k => `<div class="stat-line"><span class="k">${esc(k)}</span><span class="v">${buckets[k]}</span></div>`).join('')}
            </div>
          </div>
        </div>
      </div>

      <div class="grid g2" style="margin-bottom:14px">
        <div class="card">
          <div class="card-head"><h3>Energy savings by month</h3><span class="ch-sub">MWh avoided across the portfolio</span></div>
          <div class="card-body"><div class="chart-box"><canvas id="mvEnergy"></canvas></div></div>
        </div>
        <div class="card">
          <div class="card-head"><h3>GHG avoided by month</h3><span class="ch-sub">tCO₂e</span></div>
          <div class="card-body"><div class="chart-box"><canvas id="mvGhg2"></canvas></div></div>
        </div>
      </div>

      <div class="grid g2">
        <div class="card">
          <div class="card-head"><h3>Strongest performers</h3><span class="ch-sub">Achievement vs expected savings</span></div>
          <div class="card-body" style="padding:10px">
            <div class="rank-list">
              ${ranked.slice(0, 6).map((r, i) => `
                <a class="rank-item" href="project.html?id=${esc(r.p.id)}&tab=mv" style="color:inherit;text-decoration:none">
                  <span class="rank-no">${i + 1}</span>
                  <span class="rank-name">${esc(r.p.name)}</span>
                  <span class="rank-val" style="color:#4fe0bb">${Fmt.pct(r.mv.achievement, 0)}</span>
                </a>`).join('') || UI.empty('No verified data', 'Submit M&V records to rank performance.', 'chart-simple')}
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-head"><h3>Requiring corrective action</h3><span class="ch-sub">Below 80% of expected savings</span></div>
          <div class="card-body" style="padding:10px">
            <div class="rank-list">
              ${ranked.slice().reverse().filter(r => r.mv.achievement < 90).slice(0, 6).map((r, i) => `
                <a class="rank-item" href="project.html?id=${esc(r.p.id)}&tab=mv" style="color:inherit;text-decoration:none">
                  <span class="rank-no">${i + 1}</span>
                  <span class="rank-name">${esc(r.p.name)}</span>
                  <span class="rank-val" style="color:#ff9298">${Fmt.pct(r.mv.achievement, 0)}</span>
                </a>`).join('') || UI.empty('All within target', 'No projects are materially below target.', 'circle-check')}
            </div>
          </div>
        </div>
      </div>
    `;

    const labels = periods.map(p => Fmt.period(p));
    CH.mixed('mvTrend', labels, [
      { label: 'Measured savings', data: measured, color: '#16c79a' },
      { label: 'Verified savings', data: verified, color: '#9b7bff' }
    ], [{ label: 'Trend', data: measured, color: '#f5a524', dash: [4, 3], axis: 'y1' }],
      { tooltip: { label: c => c.dataset.label + ': ' + Fmt.money(c.parsed.y) } });

    const dk = Object.keys(buckets).filter(k => buckets[k] > 0);
    CH.doughnut('mvDist', dk, dk.map(k => buckets[k]), {
      cutout: '62%', legend: false,
      colors: dk.map(k => k.indexOf('Exceeds') === 0 ? '#16c79a' : k.indexOf('On target') === 0 ? '#4fd1c5' : k.indexOf('Below') === 0 ? '#f5a524' : k.indexOf('Under') === 0 ? '#f2545b' : '#64748b'),
      tooltip: { label: c => c.label + ': ' + c.parsed + ' projects' }
    });

    CH.bar('mvEnergy', labels, [{ label: 'Energy saved', data: energyMwh, color: '#0ea5e9' }],
      { legend: false, tooltip: { label: c => Fmt.int(c.parsed.y) + ' MWh' } });
    CH.bar('mvGhg2', labels, [{ label: 'GHG avoided', data: ghg, color: '#16c79a' }],
      { legend: false, tooltip: { label: c => Fmt.int(c.parsed.y) + ' tCO₂e' } });
  }

  /* ===================== Matrix ===================== */
  function matrix(host, rows) {
    // project x period matrix of cost savings
    const periods = uniq(S.mvRecords.map(r => r.period)).sort().slice(-12);
    const tt = tariffs();
    const data = rows.map(r => {
      const byPeriod = {};
      r.mv.recs.forEach(rec => {
        const n = MV.normalize(rec, tt);
        byPeriod[rec.period] = { cost: n.costSaved, verified: n.verified };
      });
      return { row: r, byPeriod };
    });

    host.innerHTML = `
      <div class="card">
        <div class="card-head"><h3>Savings matrix — project × period</h3>
          <span class="ch-sub">Measured cost savings (USD). Purple cells are independently verified.</span>
          <div class="ch-actions"><button class="btn btn-sm" id="matExp"><i class="fa-solid fa-file-excel"></i> Export</button></div></div>
        <div class="table-wrap">
          <table class="data" id="matTable">
            <thead><tr>
              <th style="position:sticky;left:0;background:#0b1220;z-index:3">Project</th>
              <th class="num">Method</th>
              ${rows.length ? periods.map(p => `<th class="num">${Fmt.period(p).replace(' ', '<br>')}</th>`).join('') : ''}
              <th class="num">Total</th>
              <th class="num">Achieve</th>
            </tr></thead>
            <tbody>
              ${rows.length ? data.map(d => `
                <tr>
                  <td style="position:sticky;left:0;background:#111b2c;z-index:2">
                    <a href="project.html?id=${esc(d.row.p.id)}&tab=mv" style="font-weight:600">${esc(d.row.p.code)}</a>
                    <div class="tiny muted" style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(d.row.p.name)}</div>
                  </td>
                  <td class="num"><span class="tag">${esc(d.row.p.mv_method || '—')}</span></td>
                  ${periods.map(p => {
                    const cell = d.byPeriod[p];
                    if (!cell) return '<td class="num muted">—</td>';
                    return `<td class="num" style="color:${cell.verified ? '#b9a5ff' : '#e8eef7'};${cell.verified ? 'background:rgba(155,123,255,.09)' : ''}">${Fmt.money(cell.cost)}</td>`;
                  }).join('')}
                  <td class="num strong">${Fmt.money(d.row.mv.annual.cost)}</td>
                  <td class="num">${d.row.mv.achievement === null ? '—' :
                    `<span class="badge ${d.row.mv.achievement >= 95 ? 'b-green' : d.row.mv.achievement >= 80 ? 'b-amber' : 'b-red'}">${Fmt.pct(d.row.mv.achievement, 0)}</span>`}</td>
                </tr>`).join('')
                : `<tr><td colspan="${periods.length + 4}">${UI.empty('No M&V records', 'Submit measurement data to populate the matrix.', 'table-cells')}</td></tr>`}
            </tbody>
            ${rows.length ? `<tfoot><tr><td style="position:sticky;left:0;background:#0b1220">Portfolio total</td><td></td>
              ${periods.map(p => {
                const v = sum(data, d => d.byPeriod[p] ? d.byPeriod[p].cost : 0);
                return `<td class="num">${Fmt.money(v)}</td>`;
              }).join('')}
              <td class="num">${Fmt.money(sum(data, d => d.row.mv.annual.cost))}</td><td></td></tr></tfoot>` : ''}
          </table>
        </div>
      </div>`;

    const b = $('#matExp');
    if (b) b.addEventListener('click', () => {
      const cols = [{ key: 'code', label: 'Code' }, { key: 'name', label: 'Project' }, { key: 'method', label: 'Method' }]
        .concat(periods_map(periods).map(p => ({ key: 'p_' + p, label: p })))
        .concat([{ key: 'total', label: 'Total measured' }, { key: 'achievement', label: 'Achievement %' }]);
      Export.excel('AXIS_savings_matrix_' + today() + '.xls', cols, data.map(d => {
        const o = { code: d.row.p.code, name: d.row.p.name, method: d.row.p.mv_method || '', total: Math.round(d.row.mv.annual.cost), achievement: Math.round(d.row.mv.achievement || 0) };
        periods.forEach(p => { o['p_' + p] = d.byPeriod[p] ? Math.round(d.byPeriod[p].cost) : ''; });
        return o;
      }), 'M&V Savings Matrix');
    });
    function periods_map(ps) { return ps; }
  }

  /* ===================== Verification queue ===================== */
  function verify(host, pending, canVerify) {
    host.innerHTML = `
      <div class="banner banner-info">
        <i class="fa-solid fa-shield-halved"></i>
        <div><strong>Verification workflow.</strong> Plant teams submit monthly measurement data. An M&amp;V Verifier
        or Administrator validates it against utility invoices, calibration records and production reports, then marks
        the period verified. Only verified periods count toward the <em>independently verified savings</em> reported to the board.
        ${canVerify ? '' : '<br><strong>Your current session cannot verify records.</strong> Sign in as M&amp;V Verifier or Administrator.'}</div>
      </div>
      <div class="card">
        <div class="card-head"><h3>Periods awaiting verification</h3>
          <span class="ch-sub">${pending.length} records</span>
          ${canVerify && pending.length ? '<div class="ch-actions"><button class="btn btn-sm btn-primary" id="verifyAll"><i class="fa-solid fa-check-double"></i> Verify selected</button></div>' : ''}</div>
        <div id="vqTable"></div>
      </div>`;

    let selected = new Set();
    DataTable.render($('#vqTable'), {
      pageSize: 20, searchable: false,
      rows: pending,
      columns: [
        { key: 'sel', label: '', width: '38px', sortable: false, render: p =>
            canVerify ? `<input type="checkbox" data-sel="${esc(p.norm.rec.id)}"${selected.has(p.norm.rec.id) ? ' checked' : ''}>` : '' },
        { key: 'period', label: 'Period', render: p => '<strong>' + Fmt.period(p.norm.period) + '</strong>', sortValue: p => p.norm.period },
        { key: 'code', label: 'Project', render: p => `<a href="project.html?id=${esc(p.project.id)}&tab=mv">${esc(p.project.code)}</a>
            <div class="tiny muted" style="max-width:230px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.project.name)}</div>` },
        { key: 'facility', label: 'Facility', render: p => '<span class="tiny">' + esc(p.project.factory) + '</span>' },
        { key: 'cost', label: 'Cost saved', align: 'right', render: p => '<strong>' + Fmt.moneyFull(Math.round(p.norm.costSaved)) + '</strong>', sortValue: p => p.norm.costSaved },
        { key: 'energy', label: 'Energy MWh', align: 'right', render: p => Fmt.dec(p.norm.energySavedKwh / 1000, 1), sortValue: p => p.norm.energySavedKwh },
        { key: 'ghg', label: 'tCO₂e', align: 'right', render: p => Fmt.dec(p.norm.ghgSaved, 1), sortValue: p => p.norm.ghgSaved },
        { key: 'notes', label: 'Data note', render: p => '<span class="tiny muted">' + esc(p.norm.rec.notes || '—') + '</span>' },
        { key: 'act', label: '', width: '86px', sortable: false, render: p => canVerify
            ? `<button class="btn btn-sm btn-primary" data-vone="${esc(p.norm.rec.id)}">Verify</button>` : '<span class="tag">pending</span>' }
      ],
      afterPaint: mount => {
        mount.querySelectorAll('[data-sel]').forEach(cb => cb.addEventListener('change', () => {
          const id = cb.getAttribute('data-sel');
          if (cb.checked) selected.add(id); else selected.delete(id);
        }));
        mount.querySelectorAll('[data-vone]').forEach(b => b.addEventListener('click', () => doVerify([b.getAttribute('data-vone')])));
      },
      emptyTitle: 'Nothing pending',
      empty: 'Every submitted period has been verified. Well done.',
      emptyIcon: 'clipboard-check'
    });

    async function doVerify(ids) {
      const btn = $('#verifyAll');
      if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verifying…'; }
      let done = 0;
      for (const id of ids) {
        try {
          await API.patch('mv_records', id, { verified: true, verified_by: (Session.current() || {}).name || 'Verifier' });
          done++;
        } catch (e) { err('Verify failed: ' + e.message); }
      }
      await audit('Verify', 'mv_record', ids.join(','), done + ' M&V period(s) marked verified');
      await reloadAll();
      ok(done + ' period' + (done === 1 ? '' : 's') + ' verified');
      paint($('#content'));
    }

    const va = $('#verifyAll');
    if (va) va.addEventListener('click', () => {
      if (!selected.size) { info('Select at least one period to verify.'); return; }
      UI.confirm('Mark ' + selected.size + ' selected period(s) as independently verified?', () => doVerify(Array.from(selected)));
    });
  }

  /* ===================== Methodology ===================== */
  function methodology(host, rows) {
    const tt = tariffs();
    const byMethod = { A: [], B: [], C: [], D: [] };
    rows.forEach(r => { if (r.p.mv_method && byMethod[r.p.mv_method]) byMethod[r.p.mv_method].push(r); });

    host.innerHTML = `
      <div class="grid g2" style="margin-bottom:14px">
        <div class="card">
          <div class="card-head"><h3>IPMVP options in use</h3></div>
          <div class="card-body">
            ${Object.keys(byMethod).map(k => {
              const list = byMethod[k];
              const desc = {
                A: 'Retrofit isolation, key parameter measurement',
                B: 'Retrofit isolation, all parameter measurement',
                C: 'Whole facility metering',
                D: 'Calibrated simulation'
              }[k];
              return `<div style="margin-bottom:13px">
                <div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:4px">
                  <span><strong>Option ${k}</strong> <span class="tiny muted">— ${desc}</span></span>
                  <span class="v">${list.length} project${list.length === 1 ? '' : 's'}</span></div>
                <div class="prog"><i style="width:${rows.length ? list.length / rows.length * 100 : 0}%"></i></div>
              </div>`;
            }).join('')}
            <div class="divider"></div>
            <div class="stat-line"><span class="k">Projects with defined methodology</span><span class="v">${rows.filter(r => r.p.mv_method).length} of ${rows.length}</span></div>
            <div class="stat-line"><span class="k">Projects reporting data</span><span class="v">${rows.filter(r => r.mv.hasData).length}</span></div>
          </div>
        </div>
        <div class="card">
          <div class="card-head"><h3>Calculation parameters</h3><span class="ch-sub">Applied to every savings calculation</span></div>
          <div class="card-body" style="padding:12px 15px">
            <div class="stat-line"><span class="k">Electricity tariff</span><span class="v">${Fmt.moneyFull(tt.elec)} / kWh</span></div>
            <div class="stat-line"><span class="k">Natural gas tariff</span><span class="v">${Fmt.moneyFull(tt.gas)} / Nm³</span></div>
            <div class="stat-line"><span class="k">Water tariff</span><span class="v">${Fmt.moneyFull(tt.water)} / m³</span></div>
            <div class="stat-line"><span class="k">Waste disposal cost</span><span class="v">${Fmt.moneyFull(tt.waste)} / t</span></div>
            <div class="stat-line"><span class="k">Grid emission factor</span><span class="v">${tt.efElec} kgCO₂e / kWh</span></div>
            <div class="stat-line"><span class="k">Gas emission factor</span><span class="v">${tt.efGas} kgCO₂e / Nm³</span></div>
            <div class="stat-line"><span class="k">Gas energy content</span><span class="v">10.55 kWh / Nm³ (LHV)</span></div>
            <div class="stat-line"><span class="k">Discount rate</span><span class="v">${Fmt.pct(tt.discount * 100, 1)}</span></div>
            <div class="stat-line"><span class="k">Economic life</span><span class="v">${tt.life} years</span></div>
            <p class="tiny muted" style="margin-top:11px">Parameters are managed in Administration &amp; Settings and apply
              immediately to all dashboards, reports and calculations.</p>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-head"><h3>Savings confidence ladder</h3>
          <span class="ch-sub">Five distinct levels, reported separately and never blended</span></div>
        <div class="card-body">
          <div class="grid g5">
            ${ladder('1. Estimated', sum(rows, r => r.p.payback_expected ? num(r.p.savings_expected) : num(r.p.savings_expected)),
              'From the feasibility business case', '#64748b')}
            ${ladder('2. Approved target', sum(rows, r => num(r.p.savings_expected)),
              'Committed in the approved case', '#3b9bff')}
            ${ladder('3. Actual measured', sum(rows, r => r.mv.annual.cost),
              'Production-normalised M&V data', '#16c79a')}
            ${ladder('4. Adjusted', sum(rows, r => r.mv.annual.cost),
              'Normalised for production, hours, weather', '#f5a524')}
            ${ladder('5. Independently verified', sum(rows, r => r.mv.verified.cost),
              'Signed off by an authorised verifier', '#9b7bff')}
          </div>
          <div class="banner banner-info" style="margin:16px 0 0">
            <i class="fa-solid fa-circle-info"></i>
            <div><strong>Normalisation.</strong> Measured savings are adjusted for production volume using
              <span class="mono tiny">baseline × (actual production ÷ baseline production)</span> before the difference is taken.
              This prevents output changes from being misreported as efficiency gains or losses, consistent with IPMVP
              routine adjustment practice.</div>
          </div>
        </div>
      </div>`;

    function ladder(label, value, note, color) {
      return `<div class="kpi" style="--kpi-accent:${color}">
        <div class="kpi-top"><span class="kpi-label">${esc(label)}</span></div>
        <div class="kpi-value" style="font-size:19px">${Fmt.money(value)}</div>
        <div class="kpi-foot" style="line-height:1.4">${esc(note)}</div></div>`;
    }
  }

  /* ===================== Bulk entry ===================== */
  function bulkEntry(rows) {
    const active = rows.filter(r => r.p.mv_method || ['Completed', 'In Progress'].includes(r.p.status));
    if (!active.length) { info('No projects are currently reporting M&V data.'); return; }

    const period = new Date().toISOString().slice(0, 7);
    let body = '<div class="banner banner-info"><i class="fa-solid fa-circle-info"></i><div>' +
      'Enter measured values for each project. Leave a project blank to skip it. ' +
      'Savings are calculated automatically on save using production-normalised baselines.</div></div>' +
      '<div class="field" style="max-width:210px"><label>Reporting period</label>' +
      '<input type="text" id="bPeriod" value="' + period + '" placeholder="YYYY-MM"></div>' +
      '<div class="table-wrap" style="max-height:430px;overflow:auto">' +
      '<table class="data"><thead><tr>' +
      '<th style="position:sticky;top:0">Project</th>' +
      '<th style="position:sticky;top:0">Baseline kWh</th>' +
      '<th style="position:sticky;top:0">Actual kWh</th>' +
      '<th style="position:sticky;top:0">Baseline Nm³</th>' +
      '<th style="position:sticky;top:0">Actual Nm³</th>' +
      '<th style="position:sticky;top:0">Baseline t</th>' +
      '<th style="position:sticky;top:0">Actual t</th>' +
      '</tr></thead><tbody>';

    active.forEach(r => {
      // prefill baseline from the project's most recent record for fast entry
      const last = r.mv.recs.length ? r.mv.recs[r.mv.recs.length - 1] : null;
      const bE = last ? last.baseline_elec_kwh || last.elec_kwh || 0 : 0;
      const bG = last ? last.baseline_gas_nm3 || 0 : 0;
      const bP = last ? last.baseline_production_t || last.production_t || 0 : 0;
      body += '<tr>' +
        `<td style="white-space:nowrap"><strong>${esc(r.p.code)}</strong><div class="tiny muted">${esc(r.p.factory)}</div></td>` +
        `<td><input type="number" step="any" data-k="baseline_elec_kwh" data-p="${esc(r.p.id)}" value="${bE || ''}" style="min-width:96px"></td>` +
        `<td><input type="number" step="any" data-k="elec_kwh" data-p="${esc(r.p.id)}" style="min-width:96px"></td>` +
        `<td><input type="number" step="any" data-k="baseline_gas_nm3" data-p="${esc(r.p.id)}" value="${bG || ''}" style="min-width:96px"></td>` +
        `<td><input type="number" step="any" data-k="gas_nm3" data-p="${esc(r.p.id)}" style="min-width:96px"></td>` +
        `<td><input type="number" step="any" data-k="baseline_production_t" data-p="${esc(r.p.id)}" value="${bP || ''}" style="min-width:90px"></td>` +
        `<td><input type="number" step="any" data-k="production_t" data-p="${esc(r.p.id)}" style="min-width:90px"></td>` +
        '</tr>';
    });
    body += '</tbody></table></div>';

    const m = UI.modal({
      title: 'Bulk M&V data entry', body: body, size: 'wide',
      footer: '<button class="btn" data-close>Cancel</button><button class="btn btn-primary" id="saveBulk"><i class="fa-solid fa-floppy-disk"></i> Save records</button>'
    });

    m.querySelector('#saveBulk').addEventListener('click', async () => {
      const per = m.querySelector('#bPeriod').value.trim();
      if (!/^\d{4}-\d{2}$/.test(per)) { err('Period must be YYYY-MM.'); return; }
      const btn = m.querySelector('#saveBulk');
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving…';

      // group inputs by project
      const byProject = {};
      m.querySelectorAll('input[data-p]').forEach(inp => {
        const pid = inp.getAttribute('data-p');
        const key = inp.getAttribute('data-k');
        if (inp.value === '') return;
        byProject[pid] = byProject[pid] || {};
        byProject[pid][key] = parseFloat(inp.value);
      });

      let created = 0;
      for (const pid of Object.keys(byProject)) {
        const vals = byProject[pid];
        const existing = S.mvRecords.find(r => r.project_id === pid && r.period === per);
        const data = Object.assign({}, existing || {}, vals, { project_id: pid, period: per });
        try {
          if (existing) {
            await API.patch('mv_records', existing.id, vals);
          } else {
            data.id = 'mv-' + uuid().slice(0, 12);
            data.verified = false;
            data.verified_by = '';
            data.notes = 'Bulk entry by ' + ((Session.current() || {}).name || 'user');
            await API.create('mv_records', data);
          }
          created++;
        } catch (e) { err('Save failed for a project: ' + e.message); }
      }
      await audit('Create', 'mv_records', per, created + ' M&V records saved for ' + per);
      await reloadAll();
      m._close();
      ok(created + ' M&V record' + (created === 1 ? '' : 's') + ' saved for ' + Fmt.period(per));
      paint($('#content'));
    });
  }
})();
