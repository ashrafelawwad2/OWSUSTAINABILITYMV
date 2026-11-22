/* ==========================================================================
   AXIS Platform — Risk, Issues & Decision Management
   Group-wide register with risk matrix, heat map and decision tracking
   ========================================================================== */
'use strict';

(function () {
  const state = { type: '', category: '', status: '', severity: '', company: '' };

  App.boot({
    page: 'risks',
    title: 'Risk & Issues',
    crumb: 'Group risk register, issues and pending decisions',
    render: paint
  });

  function paint(root) {
    const all = S.risks.map(r => {
      const p = S.projById.get(r.project_id);
      return Object.assign({}, r, { project: p, score: riskScore(r), level: riskLevel(riskScore(r)) });
    });

    let rows = all.slice();
    if (state.type) rows = rows.filter(r => r.type === state.type);
    if (state.category) rows = rows.filter(r => r.category === state.category);
    if (state.status) rows = rows.filter(r => r.status === state.status);
    if (state.company) rows = rows.filter(r => r.project && r.project.company === state.company);
    if (state.severity === 'critical') rows = rows.filter(r => r.score >= 15 && r.status !== 'Closed');
    if (state.severity === 'high') rows = rows.filter(r => r.score >= 9 && r.score < 15 && r.status !== 'Closed');
    if (state.severity === 'open') rows = rows.filter(r => r.status !== 'Closed');

    const open = all.filter(r => r.status !== 'Closed');
    const critical = open.filter(r => r.score >= 15);
    const decisions = all.filter(r => r.type === 'Decision' && r.status === 'Open');
    const overdue = open.filter(r => r.target_date && parseDate(r.target_date) < new Date(new Date().toDateString()));

    const companies = uniq(S.projects.map(p => p.company)).sort();
    const canEdit = Session.canEdit();

    // risk matrix counts (probability 1-5 × impact 1-5)
    const matrix = {};
    open.forEach(r => {
      const k = num(r.probability) + '-' + num(r.impact);
      matrix[k] = (matrix[k] || 0) + 1;
    });

    root.innerHTML = `
      <div class="page-head">
        <div class="ph-txt">
          <h2>Risk, Issues &amp; Decisions</h2>
          <div class="sub">${all.length} register entries · ${open.length} open · ${critical.length} critical ·
            ${decisions.length} decisions awaiting approval</div>
        </div>
        <div class="page-actions">
          <button class="btn btn-sm" id="riskExp"><i class="fa-solid fa-file-excel"></i> Export</button>
          <button class="btn btn-sm" id="riskPrint"><i class="fa-solid fa-print"></i> Report</button>
          ${canEdit ? '<button class="btn btn-sm btn-primary" id="riskAdd"><i class="fa-solid fa-plus"></i> Add entry</button>' : ''}
        </div>
      </div>

      <div class="grid g5" style="margin-bottom:14px">
        ${UI.kpi({ label: 'Total registered', value: all.length, accent: '#3b9bff', icon: 'list',
          foot: all.filter(r => r.type === 'Risk').length + ' risks · ' + all.filter(r => r.type === 'Issue').length + ' issues' })}
        ${UI.kpi({ label: 'Open items', value: open.length, accent: '#f5a524', icon: 'triangle-exclamation',
          foot: Fmt.pct(all.length ? open.length / all.length * 100 : 0, 0) + ' of register' })}
        ${UI.kpi({ label: 'Critical (score ≥15)', value: critical.length, accent: '#f2545b', icon: 'fire',
          foot: critical.length ? 'Immediate escalation required' : 'None at critical level' })}
        ${UI.kpi({ label: 'Past target date', value: overdue.length, accent: '#9b7bff', icon: 'clock-rotate-left',
          foot: 'Mitigation overdue' })}
        ${UI.kpi({ label: 'Pending decisions', value: decisions.length, accent: '#0ea5e9', icon: 'gavel',
          foot: 'Awaiting management approval' })}
      </div>

      <div class="card card-pad" style="margin-bottom:14px">
        <div class="filter-bar">
          <select id="rType"><option value="">All types</option>
            ${['Risk', 'Issue', 'Decision', 'Constraint'].map(t => `<option value="${t}"${state.type === t ? ' selected' : ''}>${t}</option>`).join('')}</select>
          <select id="rCat"><option value="">All categories</option>
            ${['Technical', 'Financial', 'Schedule', 'Procurement', 'HSE', 'Compliance', 'Operational', 'Contractual'].map(c => `<option value="${c}"${state.category === c ? ' selected' : ''}>${c}</option>`).join('')}</select>
          <select id="rStatus"><option value="">All statuses</option>
            ${['Open', 'Mitigating', 'Escalated', 'Closed'].map(s => `<option value="${s}"${state.status === s ? ' selected' : ''}>${s}</option>`).join('')}</select>
          <select id="rSev"><option value="">Any severity</option>
            <option value="open"${state.severity === 'open' ? ' selected' : ''}>All open</option>
            <option value="critical"${state.severity === 'critical' ? ' selected' : ''}>Critical only</option>
            <option value="high"${state.severity === 'high' ? ' selected' : ''}>High only</option></select>
          <select id="rComp"><option value="">All companies</option>
            ${companies.map(c => `<option value="${esc(c)}"${state.company === c ? ' selected' : ''}>${esc(c)}</option>`).join('')}</select>
          <button class="btn btn-sm btn-ghost" id="rReset"><i class="fa-solid fa-rotate-left"></i> Reset</button>
        </div>
      </div>

      <div class="grid g23" style="margin-bottom:14px">
        <div class="card">
          <div class="card-head"><h3>Risk heat map</h3>
            <span class="ch-sub">Open items plotted by probability and impact</span></div>
          <div class="card-body"><div id="heatMap"></div></div>
        </div>
        <div class="card">
          <div class="card-head"><h3>Exposure by category</h3></div>
          <div class="card-body">
            <div class="chart-box" style="height:222px"><canvas id="riskCat"></canvas></div>
            <div style="margin-top:12px">
              ${uniq(open.map(r => r.category)).map(c => {
                const list = open.filter(r => r.category === c);
                return `<div class="stat-line"><span class="k">${esc(c)}</span><span class="v">${list.length} · score ${sum(list, r => r.score)}</span></div>`;
              }).join('') || '<div class="tiny muted">No open items</div>'}
            </div>
          </div>
        </div>
      </div>

      <div class="card" style="margin-bottom:14px">
        <div class="card-head"><h3>Risk register</h3>
          <span class="ch-sub">${rows.length} entries · sorted by risk score</span></div>
        <div id="riskTable"></div>
      </div>

      <div class="grid g2">
        <div class="card">
          <div class="card-head"><h3>Decisions awaiting management</h3><span class="ch-sub">${decisions.length} pending</span></div>
          <div class="card-body" style="padding:11px;max-height:360px;overflow:auto">
            ${decisions.length ? decisions.slice(0, 10).map(d => `
              <a class="alert-item" href="project.html?id=${esc(d.project_id)}&tab=risks" style="text-decoration:none;color:inherit">
                <span class="alert-sev ${d.score >= 12 ? 'sev-high' : 'sev-med'}"></span>
                <span class="ai-body"><span class="ai-title">${esc(d.title)}</span>
                <span class="ai-meta">${d.project ? esc(d.project.code) + ' · ' + esc(d.project.factory) : ''} ·
                  responsible ${esc(d.responsible || '—')} · by ${Fmt.dateShort(d.target_date)}</span></span>
              </a>`).join('') : UI.empty('No pending decisions', 'All management decisions have been resolved.', 'gavel')}
          </div>
        </div>
        <div class="card">
          <div class="card-head"><h3>Highest risks requiring escalation</h3></div>
          <div class="card-body" style="padding:10px">
            <div class="rank-list">
              ${open.slice().sort((a, b) => b.score - a.score).slice(0, 8).map((r, i) => `
                <a class="rank-item" href="project.html?id=${esc(r.project_id)}&tab=risks" style="color:inherit;text-decoration:none">
                  <span class="rank-no">${i + 1}</span>
                  <span class="rank-name" title="${esc(r.title)}">${esc(r.title)}</span>
                  <span class="rank-val" style="color:${r.score >= 15 ? '#ff9298' : '#ffc768'}">${r.score}</span>
                </a>`).join('') || UI.empty('No open risks', 'The register is clear.', 'circle-check')}
            </div>
          </div>
        </div>
      </div>
    `;

    /* ---- filters ---- */
    const b = (id, key) => $('#' + id).addEventListener('change', e => { state[key] = e.target.value; paint(root); });
    b('rType', 'type'); b('rCat', 'category'); b('rStatus', 'status'); b('rSev', 'severity'); b('rComp', 'company');
    $('#rReset').addEventListener('click', () => {
      Object.assign(state, { type: '', category: '', status: '', severity: '', company: '' });
      paint(root);
    });

    /* ---- heat map ---- */
    const cellColor = score => score >= 15 ? 'rgba(242,84,91,.72)' : score >= 9 ? 'rgba(245,165,36,.65)' :
      score >= 4 ? 'rgba(59,155,255,.5)' : 'rgba(100,116,139,.42)';
    let hm = '<div style="overflow-x:auto"><table style="border-collapse:separate;border-spacing:3px;width:100%;min-width:420px">';
    hm += '<tr><td></td>' + [1, 2, 3, 4, 5].map(i => `<td style="text-align:center;font-size:10px;color:var(--text-mute);font-weight:700;padding-bottom:2px">I${i}</td>`).join('') + '</tr>';
    for (let p = 5; p >= 1; p--) {
      hm += `<tr><td style="font-size:10px;color:var(--text-mute);font-weight:700;padding-right:4px;text-align:right">P${p}</td>`;
      for (let i = 1; i <= 5; i++) {
        const k = p + '-' + i;
        const n = matrix[k] || 0;
        hm += `<td style="background:${cellColor(p * i)};border-radius:7px;text-align:center;padding:9px 4px;
          font-size:${n ? '14px' : '10px'};font-weight:700;color:${n ? '#fff' : 'rgba(255,255,255,.28)'};
          min-width:44px" title="Probability ${p} × Impact ${i} = ${p * i}">${n || '·'}</td>`;
      }
      hm += '</tr>';
    }
    hm += '</table><div class="tiny muted" style="margin-top:9px">Rows = probability (P1–P5) · columns = impact (I1–I5) · cells show count of open items</div></div>';
    $('#heatMap').innerHTML = hm;

    /* ---- category chart ---- */
    const cats = uniq(open.map(r => r.category));
    CH.bar('riskCat', cats, [{
      label: 'Exposure score', data: cats.map(c => sum(open.filter(r => r.category === c), r => r.score)),
      colors: cats.map(c => {
        const list = open.filter(r => r.category === c);
        const mx = Math.max.apply(null, list.map(r => r.score).concat([0]));
        return mx >= 15 ? '#f2545b' : mx >= 9 ? '#f5a524' : '#3b9bff';
      })
    }], { legend: false, thick: 20, tooltip: { label: c => 'Exposure score ' + c.parsed.x } });

    /* ---- register table ---- */
    DataTable.render($('#riskTable'), {
      pageSize: 20, searchable: true,
      rows: rows.slice().sort((a, b2) => b2.score - a.score),
      columns: [
        { key: 'type', label: 'Type', render: r => `<span class="tag">${esc(r.type)}</span>` },
        { key: 'title', label: 'Description', render: r => `<div style="min-width:210px">${esc(r.title)}
            <div class="tiny muted" style="max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.mitigation || '')}</div></div>` },
        { key: 'project', label: 'Project', render: r => r.project
            ? `<a href="project.html?id=${esc(r.project_id)}&tab=risks" class="tiny mono">${esc(r.project.code)}</a>
               <div class="tiny muted" style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.project.factory)}</div>`
            : '<span class="muted">—</span>' },
        { key: 'category', label: 'Category', render: r => `<span class="tiny">${esc(r.category)}</span>` },
        { key: 'p', label: 'P', align: 'right', render: r => num(r.probability), sortValue: r => num(r.probability) },
        { key: 'i', label: 'I', align: 'right', render: r => num(r.impact), sortValue: r => num(r.impact) },
        { key: 'score', label: 'Score', align: 'right', render: r => `<span class="badge ${r.level.cls}">${r.score}</span>`, sortValue: r => r.score },
        { key: 'responsible', label: 'Responsible', render: r => '<span class="tiny">' + esc(r.responsible || '—') + '</span>' },
        { key: 'target', label: 'Target date', render: r => {
            if (!r.target_date) return '<span class="muted">—</span>';
            const late = r.status !== 'Closed' && parseDate(r.target_date) < new Date(new Date().toDateString());
            return `<span style="${late ? 'color:#ff9298' : ''}">${Fmt.dateShort(r.target_date)}</span>`;
          }, sortValue: r => r.target_date || '9999' },
        { key: 'status', label: 'Status', render: r => UI.riskBadge(r.status) }
      ],
      emptyTitle: 'No entries match', empty: 'Adjust the filters to widen the selection.'
    });

    /* ---- export ---- */
    const cols = [
      { key: 'type', label: 'Type' }, { key: 'title', label: 'Description' },
      { key: 'category', label: 'Category' },
      { key: 'projectCode', label: 'Project Code' }, { key: 'projectName', label: 'Project' },
      { key: 'company', label: 'Company' }, { key: 'factory', label: 'Facility' },
      { key: 'probability', label: 'Probability' }, { key: 'impact', label: 'Impact' },
      { key: 'score', label: 'Risk Score' }, { key: 'level', label: 'Level' },
      { key: 'mitigation', label: 'Mitigation' }, { key: 'responsible', label: 'Responsible' },
      { key: 'target_date', label: 'Target Date' }, { key: 'status', label: 'Status' },
      { key: 'raised_date', label: 'Raised' }
    ];
    const data = () => rows.map(r => ({
      type: r.type, title: r.title, category: r.category,
      projectCode: r.project ? r.project.code : '', projectName: r.project ? r.project.name : '',
      company: r.project ? r.project.company : '', factory: r.project ? r.project.factory : '',
      probability: num(r.probability), impact: num(r.impact), score: r.score, level: r.level.label,
      mitigation: r.mitigation, responsible: r.responsible, target_date: r.target_date,
      status: r.status, raised_date: r.raised_date
    }));
    $('#riskExp').addEventListener('click', () => Export.excel('AXIS_risk_register_' + today() + '.xls', cols, data(), 'Group Risk, Issue and Decision Register'));
    $('#riskPrint').addEventListener('click', () => Export.printReport('Risk, Issues & Decisions Report', rows.length + ' register entries'));

    const addBtn = $('#riskAdd');
    if (addBtn) addBtn.addEventListener('click', () => addRisk(paint, root));
  }

  function addRisk(repaint, root) {
    const projects = S.projects.slice().sort((a, b) => String(a.code).localeCompare(String(b.code)));
    const f = [
      { name: 'project_id', label: 'Project', type: 'select', required: true, span: 2,
        options: projects.map(p => ({ value: p.id, label: p.code + ' — ' + p.name })) },
      { name: 'title', label: 'Description', type: 'text', required: true, span: 2 },
      { name: 'type', label: 'Type', type: 'select', options: ['Risk', 'Issue', 'Decision', 'Constraint'] },
      { name: 'category', label: 'Category', type: 'select', options: ['Technical', 'Financial', 'Schedule', 'Procurement', 'HSE', 'Compliance', 'Operational', 'Contractual'] },
      { name: 'probability', label: 'Probability (1-5)', type: 'number', min: 1, max: 5, value: 3 },
      { name: 'impact', label: 'Impact (1-5)', type: 'number', min: 1, max: 5, value: 3 },
      { name: 'mitigation', label: 'Mitigation / corrective action', type: 'textarea', span: 2, rows: 2 },
      { name: 'responsible', label: 'Responsible person', type: 'text' },
      { name: 'target_date', label: 'Target resolution date', type: 'date' },
      { name: 'status', label: 'Status', type: 'select', options: ['Open', 'Mitigating', 'Escalated', 'Closed'] }
    ];
    const m = UI.modal({
      title: 'Add register entry', body: Form.build(f, { type: 'Risk', category: 'Technical', status: 'Open' }), size: 'wide',
      footer: '<button class="btn" data-close>Cancel</button><button class="btn btn-primary" id="save">Save entry</button>'
    });
    m.querySelector('#save').addEventListener('click', async () => {
      const missing = Form.validate(m, f);
      if (missing.length) { err('Required: ' + missing.join(', ')); return; }
      const d = Form.read(m, f);
      d.id = 'rk-' + uuid().slice(0, 10);
      d.raised_date = today();
      try {
        await API.create('risks', d);
        await audit('Create', 'risk', d.id, d.title);
        await reloadAll();
        m._close();
        ok('Register entry added');
        repaint(root);
      } catch (e) { err('Save failed: ' + e.message); }
    });
  }
})();
