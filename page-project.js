/* ==========================================================================
   AXIS Platform — Project Profile
   Full project record: overview, timeline, M&V, KPIs, risks, documents, finance
   ========================================================================== */
'use strict';

(function () {
  const params = new URLSearchParams(location.search);
  const projectId = params.get('id');
  const initialTab = params.get('tab') || 'overview';
  let project = null;

  App.boot({
    page: 'portfolio',
    title: 'Project Profile',
    crumb: 'Portfolio · project detail',
    render: paint
  });

  function paint(root) {
    project = S.projById.get(projectId);
    if (!project) {
      root.innerHTML = '<div class="card card-pad">' + UI.empty('Project not found',
        'The requested project does not exist or has been removed from the register.', 'circle-question') +
        '<div style="text-align:center"><a class="btn btn-primary" href="portfolio.html"><i class="fa-solid fa-arrow-left"></i> Back to portfolio</a></div></div>';
      return;
    }

    document.title = project.code + ' · ' + project.name + ' · AXIS Platform';

    const mv = MV.summary(project);
    const fin = MV.finance(project, mv.hasData ? mv.annual.cost : num(project.savings_expected));
    const mss = projectMilestones(project.id);
    const tks = projectTasks(project.id);
    const rks = projectRisks(project.id);
    const kps = projectKpis(project.id);
    const docs = projectDocs(project.id);
    const delayed = isDelayed(project);
    const canEdit = Session.canEdit();
    const canVerify = Session.canVerify();
    const caccent = (CATEGORIES[project.category] || {}).color || '#16c79a';

    root.innerHTML = `
      <div class="page-head">
        <div class="ph-txt">
          <div style="display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-bottom:4px">
            <a href="portfolio.html" class="btn btn-sm btn-icon btn-ghost" aria-label="Back"><i class="fa-solid fa-arrow-left"></i></a>
            <span class="mono tiny muted">${esc(project.code)}</span>
            ${UI.statusBadge(project.status)}
            ${project.priority === 'Critical' ? '<span class="badge b-purple">Critical priority</span>' : ''}
            ${delayed ? '<span class="badge b-red"><i class="fa-solid fa-clock"></i> Delayed</span>' : ''}
          </div>
          <h2 style="font-size:20px">${esc(project.name)}</h2>
          <div class="sub">${esc(project.factory)} · ${esc(project.company)} · ${esc(project.department || 'no department')} ·
            Owner ${esc(project.owner || '—')}</div>
        </div>
        <div class="page-actions">
          ${canEdit ? '<button class="btn btn-sm" id="editBtn"><i class="fa-solid fa-pen"></i> Edit</button>' : ''}
          <button class="btn btn-sm" id="docBtn"><i class="fa-solid fa-folder-open"></i> Documents (${docs.length})</button>
          <button class="btn btn-sm" id="printBtn3"><i class="fa-solid fa-print"></i> Report</button>
        </div>
      </div>

      <div class="grid g5" style="margin-bottom:14px">
        ${UI.kpi({ label: 'Completion', value: Fmt.pct(project.progress, 0), accent: caccent, icon: 'bars-progress',
          bar: num(project.progress), foot: `${mss.filter(m => m.status === 'Completed').length}/${mss.length} milestones done` })}
        ${UI.kpi({ label: 'CAPEX utilisation', value: Fmt.pct(fin.capex > 0 ? (num(project.capex_actual) / (num(project.capex_approved) || fin.capex)) * 100 : 0, 0),
          accent: '#3b9bff', icon: 'sack-dollar',
          bar: fin.capex > 0 ? (num(project.capex_actual) / (num(project.capex_approved) || fin.capex)) * 100 : 0,
          foot: `${Fmt.money(num(project.capex_actual))} of ${Fmt.money(num(project.capex_approved) || fin.capex)}` })}
        ${UI.kpi({ label: 'Measured savings', value: mv.hasData ? Fmt.money(mv.annual.cost) : '—', accent: '#16c79a', icon: 'chart-line',
          foot: mv.hasData ? `${Fmt.pct(mv.achievement, 0)} of ${Fmt.money(num(project.savings_expected))} target` : 'No M&V data submitted' })}
        ${UI.kpi({ label: 'Verified savings', value: Fmt.money(mv.verified.cost), accent: '#9b7bff', icon: 'certificate',
          foot: `${mv.verified.count} of ${mv.months} periods verified` })}
        ${UI.kpi({ label: 'Payback', value: fin.payback ? Fmt.dec(fin.payback, 1) : '—', unit: 'yrs', accent: '#f5a524', icon: 'hourglass-half',
          foot: `NPV ${Fmt.money(fin.npv)} · ROI ${Fmt.pct(fin.roi, 0)}` })}
      </div>

      <div class="tabs" id="pTabs">
        <button class="tab${initialTab === 'overview' ? ' on' : ''}" data-t="overview">Overview</button>
        <button class="tab${initialTab === 'timeline' ? ' on' : ''}" data-t="timeline">Timeline &amp; milestones</button>
        <button class="tab${initialTab === 'tasks' ? ' on' : ''}" data-t="tasks">Action plan</button>
        <button class="tab${initialTab === 'mv' ? ' on' : ''}" data-t="mv">M&amp;V &amp; performance</button>
        <button class="tab${initialTab === 'kpi' ? ' on' : ''}" data-t="kpi">KPIs</button>
        <button class="tab${initialTab === 'risks' ? ' on' : ''}" data-t="risks">Risks &amp; decisions</button>
        <button class="tab${initialTab === 'finance' ? ' on' : ''}" data-t="finance">Financial</button>
        <button class="tab${initialTab === 'docs' ? ' on' : ''}" data-t="docs">Documents</button>
      </div>

      <div id="tabBody"></div>
    `;

    const renderers = {
      overview: renderOverview, timeline: renderTimeline, tasks: renderTasks, mv: renderMv,
      kpi: renderKpis, risks: renderRisks, finance: renderFinance, docs: renderDocs
    };
    function show(tab) {
      $$('#pTabs .tab').forEach(t => t.classList.toggle('on', t.getAttribute('data-t') === tab));
      renderers[tab]($('#tabBody'));
      history.replaceState(null, '', 'project.html?id=' + encodeURIComponent(project.id) + '&tab=' + tab);
    }
    $$('#pTabs .tab').forEach(t => t.addEventListener('click', () => show(t.getAttribute('data-t'))));
    show(renderers[initialTab] ? initialTab : 'overview');

    /* header actions */
    $('#docBtn').addEventListener('click', () => Files.manager(project.id, () => paint(root)));

    $('#printBtn3').addEventListener('click', () => Export.printReport(project.code + ' — ' + project.name,
      project.factory + ' · ' + project.company + ' · Status ' + project.status));
    const editBtn = $('#editBtn');
    if (editBtn) editBtn.addEventListener('click', () => editProject(root));
  }

  /* ======================= Overview ======================= */
  function renderOverview(host) {
    const p = project;
    const mv = MV.summary(p);
    const fin = MV.finance(p, mv.hasData ? mv.annual.cost : num(p.savings_expected));

    host.innerHTML = `
      <div class="grid g23">
        <div>
          <div class="card" style="margin-bottom:14px">
            <div class="card-head"><h3>Project description</h3></div>
            <div class="card-body">
              <p style="font-size:12.9px;color:var(--text-dim);line-height:1.65">${esc(p.description || 'No description recorded.')}</p>
              <div class="divider"></div>
              <div class="grid g2" style="gap:14px">
                <div><div class="kv-k">Existing situation</div>
                  <div style="font-size:12.5px;color:var(--text-dim);line-height:1.6;margin-top:3px">${esc(p.existing_situation || '—')}</div></div>
                <div><div class="kv-k">Proposed improvement</div>
                  <div style="font-size:12.5px;color:var(--text-dim);line-height:1.6;margin-top:3px">${esc(p.proposed_improvement || '—')}</div></div>
              </div>
              ${p.scope ? '<div class="divider"></div><div><div class="kv-k">Project scope</div>' +
                '<div style="font-size:12.5px;color:var(--text-dim);line-height:1.6;margin-top:3px">' + esc(p.scope) + '</div></div>' : ''}
              ${p.tech_specs ? '<div class="divider"></div><div><div class="kv-k">Technical specifications</div>' +
                '<div style="font-size:12.5px;color:var(--text-dim);line-height:1.6;margin-top:3px">' + esc(p.tech_specs) + '</div></div>' : ''}
            </div>
          </div>

          <div class="card">
            <div class="card-head"><h3>General information</h3></div>
            <div class="card-body">
              <div class="kv-grid">
                ${kv('Project ID', '<span class="mono tiny">' + esc(p.id) + '</span>')}
                ${kv('Project code', '<span class="mono">' + esc(p.code) + '</span>')}
                ${kv('Category', UI.catBadge(p.category))}
                ${kv('Subcategory', esc(p.subcategory || '—'))}
                ${kv('Company', esc(p.company))}
                ${kv('Facility', esc(p.factory))}
                ${kv('Department', esc(p.department || '—'))}
                ${kv('Project owner', esc(p.owner || '—'))}
                ${kv('Project sponsor', esc(p.sponsor || '—'))}
                ${kv('Project team', esc(p.team || '—'))}
                ${kv('Contractor / consultant', esc(p.contractor || '—'))}
                ${kv('Priority', esc(p.priority))}
                ${kv('Status', UI.statusBadge(p.status))}
                ${kv('Progress', UI.prog(p.progress, isDelayed(p) ? 'bad' : ''))}
              </div>
            </div>
          </div>
        </div>

        <div>
          <div class="card" style="margin-bottom:14px">
            <div class="card-head"><h3>Project timeline</h3></div>
            <div class="card-body" style="padding:12px 15px">
              ${dateLine('Idea submitted', p.idea_date)}
              ${dateLine('Feasibility study', p.feasibility_date)}
              ${dateLine('Approved', p.approval_date)}
              ${dateLine('Planned start', p.planned_start)}
              ${dateLine('Actual start', p.actual_start)}
              ${dateLine('Planned completion', p.planned_end, isDelayed(p) && p.status !== 'Completed')}
              ${dateLine('Actual completion', p.actual_end)}
              ${dateLine('Commissioning', p.commissioning_date)}
              ${dateLine('M&V start', p.mv_start)}
              ${dateLine('M&V end', p.mv_end)}
            </div>
          </div>

          <div class="card" style="margin-bottom:14px">
            <div class="card-head"><h3>Financial summary</h3></div>
            <div class="card-body" style="padding:12px 15px">
              <div class="stat-line"><span class="k">Estimated CAPEX</span><span class="v">${Fmt.moneyFull(p.capex_estimated)}</span></div>
              <div class="stat-line"><span class="k">Approved CAPEX</span><span class="v">${Fmt.moneyFull(p.capex_approved)}</span></div>
              <div class="stat-line"><span class="k">Actual CAPEX</span><span class="v">${Fmt.moneyFull(p.capex_actual)}</span></div>
              <div class="stat-line"><span class="k">Annual OPEX impact</span><span class="v">${Fmt.moneyFull(p.opex_annual)}</span></div>
              <div class="stat-line"><span class="k">Expected annual savings</span><span class="v">${Fmt.moneyFull(p.savings_expected)}</span></div>
              ${mv.hasData ? '<div class="stat-line"><span class="k">Measured annual savings</span><span class="v" style="color:#4fe0bb">' + Fmt.moneyFull(mv.annual.cost) + '</span></div>' : ''}
              ${mv.hasData ? '<div class="stat-line"><span class="k">Verified annual savings</span><span class="v" style="color:#b9a5ff">' + Fmt.moneyFull(mv.verified.cost) + '</span></div>' : ''}
              <div class="stat-line"><span class="k">Simple payback</span><span class="v">${fin.payback ? Fmt.dec(fin.payback, 2) + ' yrs' : '—'}</span></div>
              <div class="stat-line"><span class="k">NPV</span><span class="v">${Fmt.moneyFull(fin.npv)}</span></div>
              <div class="stat-line"><span class="k">IRR</span><span class="v">${fin.irr !== null ? Fmt.pct(fin.irr, 1) : '—'}</span></div>
              <div class="stat-line"><span class="k">ROI</span><span class="v">${Fmt.pct(fin.roi, 0)}</span></div>
            </div>
          </div>

          <div class="card">
            <div class="card-head"><h3>Expected benefits</h3></div>
            <div class="card-body" style="padding:12px 15px">
              <div class="kv" style="margin-bottom:11px"><div class="kv-k">Production benefit</div>
                <div class="kv-v">${esc(p.production_benefit || '—')}</div></div>
              <div class="kv" style="margin-bottom:11px"><div class="kv-k">Environmental benefit</div>
                <div class="kv-v">${esc(p.env_benefit || '—')}</div></div>
              ${num(p.savings_kwh_year) ? '<div class="stat-line"><span class="k">Electricity savings</span><span class="v">' + Fmt.int(p.savings_kwh_year) + ' kWh/yr</span></div>' : ''}
              ${num(p.savings_gas_nm3_year) ? '<div class="stat-line"><span class="k">Gas savings</span><span class="v">' + Fmt.int(p.savings_gas_nm3_year) + ' Nm³/yr</span></div>' : ''}
              ${num(p.savings_water_m3_year) ? '<div class="stat-line"><span class="k">Water savings</span><span class="v">' + Fmt.int(p.savings_water_m3_year) + ' m³/yr</span></div>' : ''}
              ${num(p.savings_waste_t_year) ? '<div class="stat-line"><span class="k">Waste reduction</span><span class="v">' + Fmt.int(p.savings_waste_t_year) + ' t/yr</span></div>' : ''}
              ${num(p.ghg_avoided_tco2e) ? '<div class="stat-line"><span class="k">GHG avoided</span><span class="v">' + Fmt.int(p.ghg_avoided_tco2e) + ' tCO₂e/yr</span></div>' : ''}
              ${num(p.sec_improvement_pct) ? '<div class="stat-line"><span class="k">SEC improvement</span><span class="v">' + Fmt.pct(p.sec_improvement_pct, 1) + '</span></div>' : ''}
              ${num(p.renewable_mwh_year) ? '<div class="stat-line"><span class="k">Renewable generation</span><span class="v">' + Fmt.int(p.renewable_mwh_year) + ' MWh/yr</span></div>' : ''}
              ${num(p.capacity_added) ? '<div class="stat-line"><span class="k">Capacity added</span><span class="v">' + Fmt.int(p.capacity_added) + ' ' + esc(p.capacity_unit) + '</span></div>' : ''}
            </div>
          </div>
        </div>
      </div>`;

    function kv(k, v) { return '<div class="kv"><div class="kv-k">' + esc(k) + '</div><div class="kv-v">' + v + '</div></div>'; }
    function dateLine(label, value, late) {
      const d = Fmt.daysUntil(value);
      let extra = '';
      if (value && late) extra = '<span class="badge b-red tiny">overdue ' + Math.abs(d) + 'd</span>';
      else if (value && d !== null && d >= 0 && d <= 30) extra = '<span class="badge b-amber tiny">in ' + d + 'd</span>';
      return '<div class="stat-line"><span class="k">' + esc(label) + '</span><span class="v">' + Fmt.date(value) + ' ' + extra + '</span></div>';
    }
  }

  /* ======================= Timeline ======================= */
  function renderTimeline(host) {
    const mss = projectMilestones(project.id);
    const bars = mss.map(m => ({
      label: m.name, start: m.actual_date || m.planned_date,
      end: m.actual_date || addDays(m.planned_date, 30),
      percent: m.status === 'Completed' ? 100 : m.status === 'In Progress' ? 60 : 0,
      status: m.status
    }));

    host.innerHTML = `
      <div class="card" style="margin-bottom:14px">
        <div class="card-head"><h3>Milestone schedule</h3>
          <span class="ch-sub">${mss.length} milestones · ${mss.filter(m => m.status === 'Completed').length} completed</span></div>
        <div class="card-body"><div id="ganttHost"></div></div>
      </div>
      <div class="card">
        <div class="card-head"><h3>Milestone register</h3>
          ${Session.canEdit() ? '<div class="ch-actions"><button class="btn btn-sm btn-primary" id="addMs"><i class="fa-solid fa-plus"></i> Add milestone</button></div>' : ''}</div>
        <div id="msTable"></div>
      </div>`;

    Gantt.render($('#ganttHost'), bars);

    DataTable.render($('#msTable'), {
      pageSize: 12, searchable: false,
      rows: mss,
      columns: [
        { key: 'seq', label: '#', width: '42px', render: m => '<span class="muted tiny">' + (num(m.seq) + 1) + '</span>' },
        { key: 'name', label: 'Milestone', render: m => '<strong>' + esc(m.name) + '</strong>' },
        { key: 'owner', label: 'Owner', render: m => esc(m.owner || '—') },
        { key: 'planned_date', label: 'Planned', render: m => Fmt.date(m.planned_date) },
        { key: 'actual_date', label: 'Actual', render: m => m.actual_date ? Fmt.date(m.actual_date) : '<span class="muted">—</span>' },
        { key: 'variance', label: 'Variance', align: 'right', render: m => {
            if (!m.actual_date) {
              const d = Fmt.daysUntil(m.planned_date);
              if (m.status !== 'Completed' && d !== null && d < 0) return '<span class="badge b-red">' + Math.abs(d) + 'd late</span>';
              return '<span class="muted">—</span>';
            }
            const v = Math.round((parseDate(m.actual_date) - parseDate(m.planned_date)) / 86400000);
            return v > 0 ? '<span class="badge b-amber">+' + v + 'd</span>' : v < 0 ? '<span class="badge b-green">' + v + 'd</span>' : '<span class="muted">on time</span>';
          } },
        { key: 'status', label: 'Status', render: m => UI.taskBadge(m.status) },
        { key: 'weight', label: 'Weight', align: 'right', render: m => Fmt.pct(m.weight, 0) }
      ],
      emptyTitle: 'No milestones yet',
      empty: 'Add milestones to build the project schedule.'
    });

    const add = $('#addMs');
    if (add) add.addEventListener('click', () => milestoneDialog());
  }

  function milestoneDialog(existing) {
    const f = [
      { name: 'name', label: 'Milestone name', type: 'text', required: true, span: 2 },
      { name: 'owner', label: 'Responsible person', type: 'text' },
      { name: 'planned_date', label: 'Planned date', type: 'date', required: true },
      { name: 'actual_date', label: 'Actual date', type: 'date' },
      { name: 'status', label: 'Status', type: 'select', options: ['Not Started', 'In Progress', 'Completed', 'Delayed', 'At Risk', 'Cancelled'] },
      { name: 'weight', label: 'Weight (%)', type: 'number', min: 0, max: 100, value: 20 },
      { name: 'notes', label: 'Notes', type: 'textarea', span: 2, rows: 2 }
    ];
    const m = UI.modal({
      title: existing ? 'Edit milestone' : 'Add milestone',
      body: Form.build(f, existing || { status: 'Not Started', weight: 20 }),
      footer: '<button class="btn" data-close>Cancel</button><button class="btn btn-primary" id="save">Save</button>'
    });
    m.querySelector('#save').addEventListener('click', async () => {
      const missing = Form.validate(m, f);
      if (missing.length) { err('Required: ' + missing.join(', ')); return; }
      const data = Form.read(m, f);
      try {
        if (existing) {
          await API.patch('milestones', existing.id, data);
          await audit('Update', 'milestone', existing.id, data.name);
        } else {
          data.id = 'ms-' + uuid().slice(0, 10);
          data.project_id = project.id;
          data.seq = projectMilestones(project.id).length;
          await API.create('milestones', data);
          await audit('Create', 'milestone', data.id, data.name);
        }
        await reloadAll();
        m._close();
        ok('Milestone saved');
        paint($('#content'));
      } catch (e) { err('Save failed: ' + e.message); }
    });
  }

  /* ======================= Tasks ======================= */
  function renderTasks(host) {
    const tks = projectTasks(project.id);
    const done = tks.filter(t => t.status === 'Completed').length;
    const overdue = tks.filter(t => t.status !== 'Completed' && parseDate(t.due_date) < new Date(new Date().toDateString()));

    host.innerHTML = `
      <div class="grid g4" style="margin-bottom:14px">
        ${UI.kpi({ label: 'Total tasks', value: tks.length, accent: '#3b9bff', icon: 'list-check' })}
        ${UI.kpi({ label: 'Completed', value: done, accent: '#16c79a', icon: 'circle-check',
          bar: tks.length ? done / tks.length * 100 : 0, foot: Fmt.pct(tks.length ? done / tks.length * 100 : 0, 0) })}
        ${UI.kpi({ label: 'Overdue', value: overdue.length, accent: '#f2545b', icon: 'clock-rotate-left' })}
        ${UI.kpi({ label: 'Blocked', value: tks.filter(t => t.status === 'Blocked').length, accent: '#f5a524', icon: 'ban' })}
      </div>
      <div class="card">
        <div class="card-head"><h3>Action plan</h3>
          ${Session.canEdit() ? '<div class="ch-actions"><button class="btn btn-sm btn-primary" id="addTask"><i class="fa-solid fa-plus"></i> Add task</button></div>' : ''}</div>
        <div id="taskTable"></div>
      </div>`;

    DataTable.render($('#taskTable'), {
      pageSize: 15, searchable: false, rows: tks,
      columns: [
        { key: 'name', label: 'Task', render: t => '<strong>' + esc(t.name) + '</strong>' },
        { key: 'assignee', label: 'Assignee', render: t => esc(t.assignee || '—') },
        { key: 'start_date', label: 'Start', render: t => Fmt.dateShort(t.start_date) },
        { key: 'due_date', label: 'Due', render: t => {
            const late = t.status !== 'Completed' && parseDate(t.due_date) < new Date(new Date().toDateString());
            return late ? '<span style="color:#ff9298">' + Fmt.dateShort(t.due_date) + '</span>' : Fmt.dateShort(t.due_date);
          } },
        { key: 'percent', label: 'Progress', width: '118px', render: t => UI.prog(t.percent, t.status === 'Blocked' ? 'bad' : '') },
        { key: 'status', label: 'Status', render: t => UI.taskBadge(t.status) },
        { key: 'priority', label: 'Priority', render: t => '<span class="tag">' + esc(t.priority || '—') + '</span>' },
        { key: 'notes', label: 'Notes', render: t => '<span class="tiny muted">' + esc(t.notes || '—') + '</span>' }
      ],
      emptyTitle: 'No tasks defined', empty: 'Break the project into actionable tasks.'
    });

    const add = $('#addTask');
    if (add) add.addEventListener('click', () => taskDialog());
  }

  function taskDialog() {
    const f = [
      { name: 'name', label: 'Task name', type: 'text', required: true, span: 2 },
      { name: 'assignee', label: 'Responsible person', type: 'text' },
      { name: 'start_date', label: 'Start date', type: 'date', value: today() },
      { name: 'due_date', label: 'Due date', type: 'date', required: true },
      { name: 'status', label: 'Status', type: 'select', options: ['Not Started', 'In Progress', 'Completed', 'Blocked', 'Cancelled'] },
      { name: 'percent', label: 'Percent complete', type: 'number', min: 0, max: 100, value: 0 },
      { name: 'priority', label: 'Priority', type: 'select', options: ['Critical', 'High', 'Medium', 'Low'] },
      { name: 'notes', label: 'Notes', type: 'textarea', span: 2, rows: 2 }
    ];
    const m = UI.modal({
      title: 'Add task', body: Form.build(f, { status: 'Not Started', priority: 'Medium' }),
      footer: '<button class="btn" data-close>Cancel</button><button class="btn btn-primary" id="save">Save</button>'
    });
    m.querySelector('#save').addEventListener('click', async () => {
      const missing = Form.validate(m, f);
      if (missing.length) { err('Required: ' + missing.join(', ')); return; }
      const data = Form.read(m, f);
      data.id = 'tk-' + uuid().slice(0, 10);
      data.project_id = project.id;
      try {
        await API.create('tasks', data);
        await audit('Create', 'task', data.id, data.name);
        await reloadAll();
        m._close();
        ok('Task added');
        paint($('#content'));
      } catch (e) { err('Save failed: ' + e.message); }
    });
  }

  /* ======================= M&V ======================= */
  function renderMv(host) {
    const p = project;
    const mv = MV.summary(p);
    const tt = tariffs();
    const canEdit = Session.canEdit();
    const canVerify = Session.canVerify();

    if (!mv.hasData) {
      host.innerHTML = '<div class="card card-pad">' + UI.empty('No measurement data yet',
        'M&V records drive all savings, achievement and verification figures for this project. Submit monthly data to begin.',
        'chart-line') +
        (canEdit ? '<div style="text-align:center;display:flex;gap:8px;justify-content:center;flex-wrap:wrap">' +
          '<button class="btn btn-primary" id="addMv"><i class="fa-solid fa-plus"></i> Add monthly record</button>' +
          '<button class="btn" id="mvTpl"><i class="fa-solid fa-file-arrow-down"></i> Download data template</button></div>' : '') +
        '</div>';
      const a = $('#addMv'); if (a) a.addEventListener('click', () => mvDialog());
      const b = $('#mvTpl'); if (b) b.addEventListener('click', () => Export.mvTemplate());
      return;
    }

    const labels = mv.norm.map(n => Fmt.period(n.period));
    const costSeries = mv.norm.map(n => Math.round(n.costSaved));
    const energySeries = mv.norm.map(n => Math.round(n.energySavedKwh / 1000));
    const elecBase = mv.norm.map(n => Math.round(n.adjBaseElec / 1000));
    const elecAct = mv.norm.map(n => Math.round(n.actElec / 1000));
    const targetMonthly = num(p.savings_expected) / 12;

    host.innerHTML = `
      <div class="grid g5" style="margin-bottom:14px">
        ${UI.kpi({ label: 'Reporting periods', value: mv.months, accent: '#3b9bff', icon: 'calendar-check',
          foot: mv.months + ' of 12 annualised at ' + Fmt.dec(mv.annualisation, 2) + '×' })}
        ${UI.kpi({ label: 'Measured savings', value: Fmt.money(mv.annual.cost), accent: '#16c79a', icon: 'chart-line',
          foot: 'Annualised · ' + Fmt.money(mv.tot.costSaved) + ' to date' })}
        ${UI.kpi({ label: 'Achievement', value: mv.achievement === null ? '—' : Fmt.pct(mv.achievement, 0), accent: mv.achievement >= 95 ? '#16c79a' : mv.achievement >= 80 ? '#f5a524' : '#f2545b',
          icon: 'bullseye', bar: clamp(mv.achievement || 0, 0, 100), foot: 'vs ' + Fmt.money(mv.expected) + '/yr target' })}
        ${UI.kpi({ label: 'Verified savings', value: Fmt.money(mv.verified.cost), accent: '#9b7bff', icon: 'certificate',
          foot: Fmt.pct(mv.verified.pct, 0) + ' of measured · ' + mv.verified.count + ' periods' })}
        ${UI.kpi({ label: 'Energy saved', value: Fmt.int(mv.annual.energyMwh), unit: 'MWh/yr', accent: '#f5a524', icon: 'bolt',
          foot: Fmt.int(mv.annual.ghg) + ' tCO₂e avoided/yr' })}
      </div>

      <div class="grid g23" style="margin-bottom:14px">
        <div class="card">
          <div class="card-head"><h3>Savings performance</h3>
            <span class="ch-sub">Measured monthly savings vs approved target</span></div>
          <div class="card-body"><div class="chart-box lg"><canvas id="mvCost"></canvas></div></div>
        </div>
        <div class="card">
          <div class="card-head"><h3>Savings waterfall</h3><span class="ch-sub">From baseline to verified</span></div>
          <div class="card-body" style="padding:14px 16px">
            ${wfRow('Expected annual savings', num(p.savings_expected), '#3b9bff')}
            ${wfRow('Measured annual savings', mv.annual.cost, '#16c79a')}
            ${wfRow('Independently verified', mv.verified.cost, '#9b7bff')}
            ${wfRow('Gap to target', mv.annual.cost - num(p.savings_expected), mv.annual.cost >= num(p.savings_expected) ? '#16c79a' : '#f2545b')}
            <div class="divider"></div>
            <div class="stat-line"><span class="k">IPMVP option</span><span class="v">${p.mv_method ? 'Option ' + esc(p.mv_method) : '—'}</span></div>
            <div class="stat-line"><span class="k">Verification status</span><span class="v">${UI.verifyBadge(p.verification_status)}</span></div>
            <div class="stat-line"><span class="k">Baseline SEC (avg)</span><span class="v">${mv.secBase ? Fmt.dec(mv.secBase, 1) + ' kWh/t' : '—'}</span></div>
            <div class="stat-line"><span class="k">Actual SEC (avg)</span><span class="v">${mv.secAct ? Fmt.dec(mv.secAct, 1) + ' kWh/t' : '—'}</span></div>
            <div class="stat-line"><span class="k">SEC improvement</span><span class="v" style="color:${mv.secImpr > 0 ? '#4fe0bb' : '#ff9298'}">${Fmt.pct(mv.secImpr, 1)}</span></div>
            <div class="stat-line"><span class="k">Production normalisation</span><span class="v">Applied (avg ${Fmt.dec(mv.norm.length ? avg(mv.norm, n => n.prodF) * 100 : 100, 1)}%)</span></div>
          </div>
        </div>
      </div>

      <div class="grid g2" style="margin-bottom:14px">
        <div class="card">
          <div class="card-head"><h3>Electricity: baseline vs actual</h3>
            <span class="ch-sub">Production-adjusted baseline (MWh)</span></div>
          <div class="card-body"><div class="chart-box"><canvas id="mvElec"></canvas></div></div>
        </div>
        <div class="card">
          <div class="card-head"><h3>Environmental performance</h3><span class="ch-sub">GHG avoided per period (tCO₂e)</span></div>
          <div class="card-body"><div class="chart-box"><canvas id="mvGhg"></canvas></div></div>
        </div>
      </div>

      <div class="card">
        <div class="card-head"><h3>Monthly measurement records</h3>
          <span class="ch-sub">${mv.months} periods · method ${p.mv_method || '—'}</span>
          <div class="ch-actions">
            <button class="btn btn-sm" id="mvExp"><i class="fa-solid fa-file-excel"></i> Export</button>
            ${canEdit ? '<button class="btn btn-sm btn-primary" id="addMv"><i class="fa-solid fa-plus"></i> Add record</button>' : ''}
          </div></div>
        <div id="mvTable"></div>
      </div>

      <div class="card card-pad" style="margin-top:14px">
        <div style="display:flex;gap:10px;align-items:flex-start;flex-wrap:wrap">
          <i class="fa-solid fa-circle-info" style="color:#67c9f7;margin-top:2px"></i>
          <div style="flex:1;min-width:260px;font-size:12.4px;color:var(--text-dim);line-height:1.6">
            <strong style="color:#fff">Calculation methodology.</strong>
            Savings are computed per period as production-normalised baseline minus actual:
            <span class="mono tiny">baseline × (actual production ÷ baseline production) − actual</span>.
            Electricity and gas savings are converted to a common energy basis using 10.55 kWh per Nm³ of natural gas (LHV).
            Cost savings apply ${Fmt.moneyFull(tt.elec, '')}/kWh electricity and ${Fmt.moneyFull(tt.gas, '')}/Nm³ gas.
            GHG avoided uses ${tt.efElec} kgCO₂e/kWh grid and ${tt.efGas} kgCO₂e/Nm³ gas.
            Period values are annualised by 12 ÷ number of submitted periods.
            <strong style="color:#fff">Verified savings</strong> include only periods marked verified by an authorised M&amp;V verifier.
          </div>
        </div>
      </div>
    `;

    function wfRow(label, value, color) {
      const max = Math.max(num(p.savings_expected), mv.annual.cost, 1);
      const w = clamp(Math.abs(value) / max * 100, 0, 100);
      return '<div style="margin-bottom:11px">' +
        '<div style="display:flex;justify-content:space-between;font-size:12.3px;margin-bottom:3px">' +
        '<span class="dim">' + esc(label) + '</span><strong class="mono">' + Fmt.moneyFull(value) + '</strong></div>' +
        '<div class="prog" style="height:7px"><i style="width:' + w + '%;background:' + color + '"></i></div></div>';
    }

    CH.mixed('mvCost', labels, [
      { label: 'Measured savings', data: costSeries, colors: mv.norm.map(n => n.verified ? '#9b7bff' : '#16c79a') }
    ], [
      { label: 'Monthly target', data: labels.map(() => Math.round(targetMonthly)), color: '#f5a524', dash: [5, 4], axis: 'y1' }
    ], { tooltip: { label: c => c.dataset.label + ': ' + Fmt.money(c.parsed.y) } });

    CH.bar('mvElec', labels, [
      { label: 'Adjusted baseline', data: elecBase, color: '#3b9bff' },
      { label: 'Actual', data: elecAct, color: '#16c79a' }
    ], { tooltip: { label: c => c.dataset.label + ': ' + Fmt.int(c.parsed.y) + ' MWh' } });

    const ghgSeries = mv.norm.map(n => +n.ghgSaved.toFixed(1));
    CH.bar('mvGhg', labels, [{
      label: 'GHG avoided', data: ghgSeries,
      colors: ghgSeries.map(v => v >= 0 ? '#16c79a' : '#f2545b')
    }], { legend: false, tooltip: { label: c => c.parsed.y + ' tCO₂e' } });

    DataTable.render($('#mvTable'), {
      pageSize: 12, searchable: false,
      rows: mv.norm.slice().reverse(),
      columns: [
        { key: 'period', label: 'Period', render: n => '<strong>' + Fmt.period(n.period) + '</strong>' },
        { key: 'prod', label: 'Production (t)', align: 'right', render: n => Fmt.int(n.production), sortValue: n => n.production },
        { key: 'factor', label: 'Prod. factor', align: 'right', render: n => Fmt.dec(n.prodF, 3), sortValue: n => n.prodF },
        { key: 'baseE', label: 'Adj. baseline kWh', align: 'right', render: n => Fmt.int(n.adjBaseElec), sortValue: n => n.adjBaseElec },
        { key: 'actE', label: 'Actual kWh', align: 'right', render: n => Fmt.int(n.actElec), sortValue: n => n.actElec },
        { key: 'eSav', label: 'Electricity saved', align: 'right', render: n => {
            const v = Math.round(n.elecSaved);
            return '<span style="color:' + (v >= 0 ? '#4fe0bb' : '#ff9298') + '">' + (v >= 0 ? '' : '−') + Fmt.int(Math.abs(v)) + '</span>';
          }, sortValue: n => n.elecSaved },
        { key: 'gSav', label: 'Gas saved Nm³', align: 'right', render: n => Fmt.int(Math.round(n.gasSaved)), sortValue: n => n.gasSaved },
        { key: 'en', label: 'Energy saved MWh', align: 'right', render: n => Fmt.dec(n.energySavedKwh / 1000, 1), sortValue: n => n.energySavedKwh },
        { key: 'cost', label: 'Cost saved', align: 'right', render: n => '<strong>' + Fmt.moneyFull(Math.round(n.costSaved)) + '</strong>', sortValue: n => n.costSaved },
        { key: 'ghg', label: 'tCO₂e', align: 'right', render: n => Fmt.dec(n.ghgSaved, 1), sortValue: n => n.ghgSaved },
        { key: 'ver', label: 'Verified', render: n => n.verified
            ? '<span class="badge b-green"><i class="fa-solid fa-check"></i> Yes</span>'
            : (canVerify ? '<button class="btn btn-sm" data-verify="' + esc(n.rec.id) + '">Verify</button>' : '<span class="badge b-slate">Pending</span>') },
        { key: 'acts', label: '', width: '42px', sortable: false, render: n => canEdit
            ? '<button class="btn btn-sm btn-icon" data-editmv="' + esc(n.rec.id) + '" aria-label="Edit"><i class="fa-solid fa-pen"></i></button>'
            : '' }
      ],
      footer: all => {
        const t2 = { e: all.reduce((a, n) => a + n.elecSaved, 0), c: all.reduce((a, n) => a + n.costSaved, 0), g: all.reduce((a, n) => a + n.ghgSaved, 0) };
        return '<td><strong>Total</strong></td><td></td><td></td><td></td><td></td>' +
          '<td class="num">' + Fmt.int(Math.round(t2.e)) + '</td><td></td><td></td>' +
          '<td class="num">' + Fmt.moneyFull(Math.round(t2.c)) + '</td>' +
          '<td class="num">' + Fmt.dec(t2.g, 1) + '</td><td colspan="2"></td>';
      },
      afterPaint: mount => {
        mount.querySelectorAll('[data-verify]').forEach(b => b.addEventListener('click', async () => {
          const id = b.getAttribute('data-verify');
          UI.confirm('Mark this period as independently verified? Verified savings are reported separately from measured savings.', async () => {
            try {
              await API.patch('mv_records', id, { verified: true, verified_by: (Session.current() || {}).name || 'Verifier' });
              await audit('Verify', 'mv_record', id, 'Period marked verified for ' + project.code);
              await reloadAll();
              ok('Period verified');
              paint($('#content'));
            } catch (e) { err('Verification failed: ' + e.message); }
          });
        }));
        mount.querySelectorAll('[data-editmv]').forEach(b => b.addEventListener('click', () => {
          const rec = S.mvRecords.find(r => r.id === b.getAttribute('data-editmv'));
          mvDialog(rec);
        }));
      },
      emptyTitle: 'No records'
    });

    const add = $('#addMv'); if (add) add.addEventListener('click', () => mvDialog());
    $('#mvExp').addEventListener('click', () => {
      Export.excel(project.code + '_mv_data.xls', [
        { key: 'period', label: 'Period' },
        { key: 'baseline_elec_kwh', label: 'Baseline kWh' },
        { key: 'elec_kwh', label: 'Actual kWh' },
        { key: 'baseline_gas_nm3', label: 'Baseline Nm3' },
        { key: 'gas_nm3', label: 'Actual Nm3' },
        { key: 'baseline_production_t', label: 'Baseline Production t' },
        { key: 'production_t', label: 'Actual Production t' },
        { key: 'elecSaved', label: 'Electricity Saved kWh' },
        { key: 'gasSaved', label: 'Gas Saved Nm3' },
        { key: 'energyMwh', label: 'Energy Saved MWh' },
        { key: 'costSaved', label: 'Cost Saved' },
        { key: 'ghgSaved', label: 'GHG Avoided tCO2e' },
        { key: 'verified', label: 'Verified' }
      ], mv.norm.map(n => ({
        period: n.period, baseline_elec_kwh: n.rec.baseline_elec_kwh, elec_kwh: n.rec.elec_kwh,
        baseline_gas_nm3: n.rec.baseline_gas_nm3, gas_nm3: n.rec.gas_nm3,
        baseline_production_t: n.rec.baseline_production_t, production_t: n.rec.production_t,
        elecSaved: Math.round(n.elecSaved), gasSaved: Math.round(n.gasSaved),
        energyMwh: +(n.energySavedKwh / 1000).toFixed(1), costSaved: Math.round(n.costSaved),
        ghgSaved: +n.ghgSaved.toFixed(1), verified: n.verified ? 'Yes' : 'No'
      })), project.code + ' — M&V measurement records');
    });
  }

  function mvDialog(existing) {
    const e = existing || {};
    const f = [
      { name: 'period', label: 'Reporting period', type: 'text', required: true, placeholder: 'YYYY-MM' },
      { name: 'hours', label: 'Operating hours', type: 'number', min: 0, step: 1 },
      { name: 'baseline_elec_kwh', label: 'Baseline electricity', type: 'number', min: 0, step: 'any', hint: 'kWh' },
      { name: 'elec_kwh', label: 'Actual electricity', type: 'number', min: 0, step: 'any', hint: 'kWh' },
      { name: 'baseline_gas_nm3', label: 'Baseline natural gas', type: 'number', min: 0, step: 'any', hint: 'Nm³' },
      { name: 'gas_nm3', label: 'Actual natural gas', type: 'number', min: 0, step: 'any', hint: 'Nm³' },
      { name: 'baseline_production_t', label: 'Baseline production', type: 'number', min: 0, step: 'any', hint: 'tonnes — enables normalisation' },
      { name: 'production_t', label: 'Actual production', type: 'number', min: 0, step: 'any', hint: 'tonnes' },
      { name: 'baseline_water_m3', label: 'Baseline water', type: 'number', min: 0, step: 'any', hint: 'm³' },
      { name: 'water_m3', label: 'Actual water', type: 'number', min: 0, step: 'any', hint: 'm³' },
      { name: 'baseline_waste_t', label: 'Baseline waste', type: 'number', min: 0, step: 'any', hint: 'tonnes' },
      { name: 'waste_t', label: 'Actual waste', type: 'number', min: 0, step: 'any', hint: 'tonnes' },
      { name: 'notes', label: 'Notes / data source', type: 'textarea', span: 2, rows: 2,
        placeholder: 'Meter reference, invoice number, calibration status' }
    ];
    const m = UI.modal({
      title: existing ? 'Edit M&V record' : 'Add monthly M&V record',
      body: Form.build(f, e.period ? e : { period: new Date().toISOString().slice(0, 7), hours: 700 }),
      footer: '<button class="btn" data-close>Cancel</button><button class="btn btn-primary" id="save">Save record</button>',
      size: 'wide'
    });
    m.querySelector('#save').addEventListener('click', async () => {
      const missing = Form.validate(m, f);
      if (missing.length) { err('Required: ' + missing.join(', ')); return; }
      const data = Form.read(m, f);
      if (!/^\d{4}-\d{2}$/.test(data.period)) { err('Period must be in YYYY-MM format.'); return; }
      try {
        if (existing) {
          await API.patch('mv_records', existing.id, data);
          await audit('Update', 'mv_record', existing.id, project.code + ' ' + data.period);
        } else {
          data.id = 'mv-' + uuid().slice(0, 12);
          data.project_id = project.id;
          data.verified = false;
          data.verified_by = '';
          await API.create('mv_records', data);
          await audit('Create', 'mv_record', data.id, project.code + ' ' + data.period);
        }
        await reloadAll();
        m._close();
        ok('M&V record saved');
        paint($('#content'));
      } catch (ex) { err('Save failed: ' + ex.message); }
    });
  }

  /* ======================= KPIs ======================= */
  function renderKpis(host) {
    const kps = projectKpis(project.id);
    const canEdit = Session.canEdit();

    if (!kps.length) {
      host.innerHTML = '<div class="card card-pad">' + UI.empty('No KPIs defined',
        'Define baseline, annual target and actual performance to track this project against its commitments.', 'bullseye') +
        (canEdit ? '<div style="text-align:center"><button class="btn btn-primary" id="addKpi"><i class="fa-solid fa-plus"></i> Define KPI</button></div>' : '') + '</div>';
      const a = $('#addKpi'); if (a) a.addEventListener('click', () => kpiDialog());
      return;
    }

    host.innerHTML = `
      <div class="card" style="margin-bottom:14px">
        <div class="card-head"><h3>KPI targets and achievement</h3>
          <span class="ch-sub">${kps.length} indicators</span>
          ${canEdit ? '<div class="ch-actions"><button class="btn btn-sm btn-primary" id="addKpi"><i class="fa-solid fa-plus"></i> Add KPI</button></div>' : ''}</div>
        <div id="kpiTable"></div>
      </div>
      <div class="card">
        <div class="card-head"><h3>KPI achievement profile</h3></div>
        <div class="card-body"><div class="chart-box"><canvas id="kpiChart"></canvas></div></div>
      </div>`;

    DataTable.render($('#kpiTable'), {
      pageSize: 15, searchable: false, rows: kps,
      columns: [
        { key: 'name', label: 'Indicator', render: k => '<strong>' + esc(k.name) + '</strong>' },
        { key: 'unit', label: 'Unit', render: k => '<span class="tag">' + esc(k.unit) + '</span>' },
        { key: 'baseline', label: 'Baseline', align: 'right', render: k => Fmt.int(k.baseline) },
        { key: 'target_annual', label: 'Annual target', align: 'right', render: k => '<strong>' + Fmt.int(k.target_annual) + '</strong>' },
        { key: 'target_monthly', label: 'Monthly target', align: 'right', render: k => Fmt.int(+num(k.target_monthly).toFixed(0)) },
        { key: 'actual', label: 'Actual', align: 'right', render: k => Fmt.int(k.actual) },
        { key: 'variance', label: 'Variance', align: 'right', render: k => {
            const v = num(k.actual) - num(k.target_annual);
            return '<span style="color:' + (v >= 0 ? '#4fe0bb' : '#ff9298') + '">' + (v >= 0 ? '+' : '') + Fmt.int(v) + '</span>';
          } },
        { key: 'ach', label: 'Achievement', align: 'right', render: k => {
            const a = num(k.target_annual) > 0 ? num(k.actual) / num(k.target_annual) * 100 : 0;
            return '<span class="badge ' + (a >= 95 ? 'b-green' : a >= 75 ? 'b-amber' : 'b-red') + '">' + Fmt.pct(a, 0) + '</span>';
          } },
        { key: 'bar', label: 'Progress', width: '120px', sortable: false, render: k => {
            const a = num(k.target_annual) > 0 ? num(k.actual) / num(k.target_annual) * 100 : 0;
            return UI.prog(a, a < 75 ? 'bad' : a < 95 ? 'warn' : '');
          } }
      ]
    });

    const labels = kps.slice(0, 8).map(k => k.name.length > 26 ? k.name.slice(0, 24) + '…' : k.name);
    const vals = kps.slice(0, 8).map(k => num(k.target_annual) > 0 ? +(num(k.actual) / num(k.target_annual) * 100).toFixed(1) : 0);
    CH.bar('kpiChart', labels, [{
      label: 'Achievement %', data: vals,
      colors: vals.map(v => v >= 95 ? '#16c79a' : v >= 75 ? '#f5a524' : '#f2545b')
    }], { legend: false, thick: 30, tooltip: { label: c => c.parsed.y + '% of annual target' } });

    const a = $('#addKpi'); if (a) a.addEventListener('click', () => kpiDialog());
  }

  function kpiDialog() {
    const f = [
      { name: 'name', label: 'KPI name', type: 'text', required: true, span: 2, placeholder: 'e.g. Electricity saved' },
      { name: 'unit', label: 'Unit', type: 'text', required: true, placeholder: 'kWh/yr, tCO2e/yr, %, t/yr' },
      { name: 'baseline', label: 'Baseline value', type: 'number', step: 'any' },
      { name: 'target_annual', label: 'Annual target', type: 'number', step: 'any', required: true },
      { name: 'target_monthly', label: 'Monthly target', type: 'number', step: 'any', hint: 'Leave 0 to auto-calculate' },
      { name: 'actual', label: 'Actual performance', type: 'number', step: 'any' },
      { name: 'direction', label: 'Direction', type: 'select', options: [
        { value: 'higher_is_better', label: 'Higher is better' }, { value: 'lower_is_better', label: 'Lower is better' }] }
    ];
    const m = UI.modal({
      title: 'Define KPI', body: Form.build(f, { direction: 'higher_is_better' }),
      footer: '<button class="btn" data-close>Cancel</button><button class="btn btn-primary" id="save">Save KPI</button>'
    });
    m.querySelector('#save').addEventListener('click', async () => {
      const missing = Form.validate(m, f);
      if (missing.length) { err('Required: ' + missing.join(', ')); return; }
      const data = Form.read(m, f);
      if (!num(data.target_monthly)) data.target_monthly = +(num(data.target_annual) / 12).toFixed(1);
      data.id = 'kpi-' + uuid().slice(0, 10);
      data.project_id = project.id;
      data.category = project.category;
      try {
        await API.create('kpis', data);
        await audit('Create', 'kpi', data.id, project.code + ' — ' + data.name);
        await reloadAll();
        m._close();
        ok('KPI added');
        paint($('#content'));
      } catch (e) { err('Save failed: ' + e.message); }
    });
  }

  /* ======================= Risks ======================= */
  function renderRisks(host) {
    const rks = projectRisks(project.id);
    const open = rks.filter(r => r.status !== 'Closed');
    const canEdit = Session.canEdit();

    host.innerHTML = `
      <div class="grid g4" style="margin-bottom:14px">
        ${UI.kpi({ label: 'Total items', value: rks.length, accent: '#3b9bff', icon: 'list' })}
        ${UI.kpi({ label: 'Open', value: open.length, accent: '#f5a524', icon: 'triangle-exclamation' })}
        ${UI.kpi({ label: 'Critical (score ≥15)', value: open.filter(r => riskScore(r) >= 15).length, accent: '#f2545b', icon: 'fire' })}
        ${UI.kpi({ label: 'Pending decisions', value: rks.filter(r => r.type === 'Decision' && r.status === 'Open').length, accent: '#9b7bff', icon: 'gavel' })}
      </div>
      <div class="card">
        <div class="card-head"><h3>Risk, issue and decision register</h3>
          ${canEdit ? '<div class="ch-actions"><button class="btn btn-sm btn-primary" id="addRisk"><i class="fa-solid fa-plus"></i> Add item</button></div>' : ''}</div>
        <div id="riskTable"></div>
      </div>`;

    DataTable.render($('#riskTable'), {
      pageSize: 15, searchable: false,
      rows: rks.slice().sort((a, b) => riskScore(b) - riskScore(a)),
      columns: [
        { key: 'type', label: 'Type', render: r => '<span class="tag">' + esc(r.type) + '</span>' },
        { key: 'title', label: 'Description', render: r => '<strong>' + esc(r.title) + '</strong>' },
        { key: 'category', label: 'Category', render: r => '<span class="tiny muted">' + esc(r.category) + '</span>' },
        { key: 'prob', label: 'P', align: 'right', render: r => num(r.probability), sortValue: r => num(r.probability) },
        { key: 'imp', label: 'I', align: 'right', render: r => num(r.impact), sortValue: r => num(r.impact) },
        { key: 'score', label: 'Score', align: 'right', render: r => {
            const s = riskScore(r); const lvl = riskLevel(s);
            return '<span class="badge ' + lvl.cls + '">' + s + '</span>';
          }, sortValue: r => riskScore(r) },
        { key: 'mitigation', label: 'Mitigation / action', render: r => '<span class="tiny dim">' + esc(r.mitigation || '—') + '</span>' },
        { key: 'responsible', label: 'Responsible', render: r => esc(r.responsible || '—') },
        { key: 'target_date', label: 'Target', render: r => Fmt.dateShort(r.target_date) },
        { key: 'status', label: 'Status', render: r => UI.riskBadge(r.status) }
      ],
      emptyTitle: 'No risks recorded', empty: 'Add risks, issues, decisions and constraints for this project.'
    });

    const a = $('#addRisk'); if (a) a.addEventListener('click', () => riskDialog());
  }

  function riskDialog() {
    const f = [
      { name: 'title', label: 'Description', type: 'text', required: true, span: 2 },
      { name: 'type', label: 'Type', type: 'select', options: ['Risk', 'Issue', 'Decision', 'Constraint'] },
      { name: 'category', label: 'Category', type: 'select', options: ['Technical', 'Financial', 'Schedule', 'Procurement', 'HSE', 'Compliance', 'Operational', 'Contractual'] },
      { name: 'probability', label: 'Probability (1-5)', type: 'number', min: 1, max: 5, value: 3 },
      { name: 'impact', label: 'Impact (1-5)', type: 'number', min: 1, max: 5, value: 3 },
      { name: 'mitigation', label: 'Mitigation / action', type: 'textarea', span: 2, rows: 2 },
      { name: 'responsible', label: 'Responsible person', type: 'text' },
      { name: 'target_date', label: 'Target resolution date', type: 'date' },
      { name: 'status', label: 'Status', type: 'select', options: ['Open', 'Mitigating', 'Escalated', 'Closed'] }
    ];
    const m = UI.modal({
      title: 'Add risk / issue / decision',
      body: Form.build(f, { type: 'Risk', category: 'Technical', status: 'Open', raised_date: today() }),
      footer: '<button class="btn" data-close>Cancel</button><button class="btn btn-primary" id="save">Save</button>'
    });
    m.querySelector('#save').addEventListener('click', async () => {
      const missing = Form.validate(m, f);
      if (missing.length) { err('Required: ' + missing.join(', ')); return; }
      const data = Form.read(m, f);
      data.id = 'rk-' + uuid().slice(0, 10);
      data.project_id = project.id;
      data.raised_date = today();
      try {
        await API.create('risks', data);
        await audit('Create', 'risk', data.id, project.code + ' — ' + data.title);
        await reloadAll();
        m._close();
        ok('Item added');
        paint($('#content'));
      } catch (e) { err('Save failed: ' + e.message); }
    });
  }

  /* ======================= Finance ======================= */
  function renderFinance(host) {
    const p = project;
    const mv = MV.summary(p);
    const fin = MV.finance(p, mv.hasData ? mv.annual.cost : num(p.savings_expected));
    const tt = tariffs();

    // cumulative cash flow over project life
    const years = [], cum = [];
    let running = -fin.capex;
    years.push('Y0'); cum.push(Math.round(running));
    for (let i = 1; i <= fin.life; i++) {
      running += fin.net;
      years.push('Y' + i);
      cum.push(Math.round(running));
    }
    const breakEven = cum.findIndex(v => v >= 0);

    host.innerHTML = `
      <div class="grid g4" style="margin-bottom:14px">
        ${UI.kpi({ label: 'Approved CAPEX', value: Fmt.money(p.capex_approved), accent: '#3b9bff', icon: 'sack-dollar' })}
        ${UI.kpi({ label: 'Actual CAPEX', value: Fmt.money(p.capex_actual), accent: '#0ea5e9', icon: 'money-bill-transfer',
          bar: num(p.capex_approved) > 0 ? num(p.capex_actual) / num(p.capex_approved) * 100 : 0,
          foot: Fmt.pct(num(p.capex_approved) > 0 ? num(p.capex_actual) / num(p.capex_approved) * 100 : 0, 0) + ' utilised' })}
        ${UI.kpi({ label: 'Net annual benefit', value: Fmt.money(fin.net), accent: '#16c79a', icon: 'coins',
          foot: Fmt.money(fin.save) + ' savings − ' + Fmt.money(fin.opex) + ' OPEX' })}
        ${UI.kpi({ label: 'Simple payback', value: fin.payback ? Fmt.dec(fin.payback, 2) : '—', unit: 'yrs', accent: '#f5a524', icon: 'hourglass-half',
          foot: 'Measured savings basis' })}
      </div>

      <div class="grid g23" style="margin-bottom:14px">
        <div class="card">
          <div class="card-head"><h3>Cumulative cash flow</h3>
            <span class="ch-sub">${fin.life}-year horizon at ${Fmt.pct(tt.discount * 100, 0)} discount rate</span></div>
          <div class="card-body"><div class="chart-box lg"><canvas id="cashflow"></canvas></div></div>
        </div>
        <div class="card">
          <div class="card-head"><h3>Investment appraisal</h3></div>
          <div class="card-body" style="padding:12px 15px">
            <div class="stat-line"><span class="k">Estimated CAPEX</span><span class="v">${Fmt.moneyFull(p.capex_estimated)}</span></div>
            <div class="stat-line"><span class="k">Approved CAPEX</span><span class="v">${Fmt.moneyFull(p.capex_approved)}</span></div>
            <div class="stat-line"><span class="k">Actual CAPEX</span><span class="v">${Fmt.moneyFull(p.capex_actual)}</span></div>
            <div class="stat-line"><span class="k">Variance vs approved</span><span class="v" style="color:${num(p.capex_actual) > num(p.capex_approved) && num(p.capex_approved) > 0 ? '#ff9298' : '#4fe0bb'}">${Fmt.moneyFull(num(p.capex_actual) - num(p.capex_approved))}</span></div>
            <div class="divider"></div>
            <div class="stat-line"><span class="k">Expected savings</span><span class="v">${Fmt.moneyFull(p.savings_expected)}/yr</span></div>
            <div class="stat-line"><span class="k">Measured savings</span><span class="v" style="color:#4fe0bb">${mv.hasData ? Fmt.moneyFull(mv.annual.cost) : '—'}/yr</span></div>
            <div class="stat-line"><span class="k">Verified savings</span><span class="v" style="color:#b9a5ff">${Fmt.moneyFull(mv.verified.cost)}/yr</span></div>
            <div class="stat-line"><span class="k">Annual OPEX impact</span><span class="v">${Fmt.moneyFull(p.opex_annual)}/yr</span></div>
            <div class="divider"></div>
            <div class="stat-line"><span class="k">NPV</span><span class="v" style="color:${fin.npv >= 0 ? '#4fe0bb' : '#ff9298'}">${Fmt.moneyFull(fin.npv)}</span></div>
            <div class="stat-line"><span class="k">IRR</span><span class="v">${fin.irr !== null ? Fmt.pct(fin.irr, 1) : 'not available'}</span></div>
            <div class="stat-line"><span class="k">ROI over life</span><span class="v">${Fmt.pct(fin.roi, 0)}</span></div>
            <div class="stat-line"><span class="k">Benefit-cost ratio</span><span class="v">${fin.benefitCost ? Fmt.dec(fin.benefitCost, 2) : '—'}</span></div>
            <div class="stat-line"><span class="k">Break-even year</span><span class="v">${breakEven > 0 ? 'Year ' + breakEven : 'not within horizon'}</span></div>
          </div>
        </div>
      </div>

      <div class="grid g2">
        <div class="card">
          <div class="card-head"><h3>Budget vs actual by phase</h3></div>
          <div class="card-body"><div class="chart-box"><canvas id="budgetPhases"></canvas></div></div>
        </div>
        <div class="card">
          <div class="card-head"><h3>Savings composition</h3><span class="ch-sub">Where the measured benefit comes from</span></div>
          <div class="card-body"><div class="chart-box"><canvas id="savingsMix"></canvas></div></div>
        </div>
      </div>`;

    CH.line('cashflow', years, [{
      label: 'Cumulative net cash flow', data: cum, color: '#16c79a'
    }], { legend: false, tooltip: { label: c => Fmt.moneyFull(c.parsed.y) } });

    // budget split across standard phases
    const phases = ['Engineering', 'Equipment', 'Installation', 'Commissioning', 'Contingency'];
    const actual = num(p.capex_actual);
    const split = [0.12, 0.46, 0.26, 0.08, 0.08];
    const approvedVals = split.map(s => Math.round(num(p.capex_approved) * s));
    const actualVals = split.map((s, i) => Math.round(actual * (i === 4 ? 0.05 : s)));
    CH.bar('budgetPhases', phases, [
      { label: 'Approved budget', data: approvedVals, color: '#3b9bff' },
      { label: 'Actual to date', data: actualVals, color: '#16c79a' }
    ], { tooltip: { label: c => c.dataset.label + ': ' + Fmt.moneyFull(c.parsed.y) } });

    const comps = [];
    if (mv.tot.elecSaved) comps.push(['Electricity', Math.round(Math.max(0, mv.tot.elecSaved) * tt.elec)]);
    if (mv.tot.gasSaved) comps.push(['Natural gas', Math.round(Math.max(0, mv.tot.gasSaved) * tt.gas)]);
    if (mv.tot.waterSaved) comps.push(['Water', Math.round(Math.max(0, mv.tot.waterSaved) * tt.water)]);
    if (mv.tot.wasteSaved) comps.push(['Waste', Math.round(Math.max(0, mv.tot.wasteSaved) * tt.waste)]);
    const other = Math.max(0, mv.tot.costSaved - sum(comps, c => c[1]));
    if (other > 1) comps.push(['Production / other', Math.round(other)]);

    if (comps.length) {
      CH.doughnut('savingsMix', comps.map(c => c[0]), comps.map(c => c[1]), {
        cutout: '58%',
        tooltip: { label: c => c.label + ': ' + Fmt.moneyFull(c.parsed) }
      });
    } else {
      $('#savingsMix').parentElement.innerHTML = UI.empty('No savings breakdown', 'Submit M&V records to see the composition.', 'chart-pie');
    }
  }

  /* ======================= Documents ======================= */
  function renderDocs(host) {
    const docs = projectDocs(project.id);
    const canEdit = Session.canEdit();
    host.innerHTML = `
      <div class="card">
        <div class="card-head"><h3>Document register</h3>
          <span class="ch-sub">${docs.length} records · ${docs.filter(d => d.reference).length} files attached</span>
          <div class="ch-actions">${canEdit ? '<button class="btn btn-sm btn-primary" id="uploadBtn"><i class="fa-solid fa-cloud-arrow-up"></i> Manage documents</button>' : ''}</div></div>
        <div class="card-body">
          ${docs.length ? docs.map(d => `
            <div class="doc-item">
              <div class="doc-ico"><i class="fa-solid fa-file-lines"></i></div>
              <div class="doc-main">
                <div class="doc-name">${esc(d.name)}</div>
                <div class="doc-meta">${esc(d.doc_type)} · ${Fmt.date(d.doc_date)}${d.size ? ' · ' + Files.sizeLabel(d.size) : ''}${d.uploaded_by ? ' · ' + esc(d.uploaded_by) : ''}</div>
              </div>
              ${d.reference
                ? '<a class="btn btn-sm" href="/files/' + esc(d.collection || 'mv-evidence') + '/' + esc(d.reference) + '" target="_blank" rel="noopener"><i class="fa-solid fa-download"></i> Open</a>'
                : '<span class="tag">metadata only</span>'}
            </div>`).join('')
            : UI.empty('No documents', 'Upload feasibility studies, offers, contracts, invoices, utility bills, calibration certificates and verification reports.', 'folder-open')}
        </div>
      </div>`;
    const b = $('#uploadBtn');
    if (b) b.addEventListener('click', () => Files.manager(project.id, () => paint($('#content'))));
  }

  /* ======================= Edit project ======================= */
  function editProject(root) {
    const p = project;
    const companies = uniq(S.projects.map(x => x.company)).sort();
    const factories = uniq(S.facilities.filter(f => f.level === 'factory').map(f => f.name)).sort();
    const f = [
      { name: 'name', label: 'Project name', type: 'text', required: true, span: 2 },
      { name: 'code', label: 'Project code', type: 'text', required: true },
      { name: 'category', label: 'Category', type: 'select', options: Object.keys(CATEGORIES).map(k => ({ value: k, label: CATEGORIES[k].label })) },
      { name: 'subcategory', label: 'Subcategory', type: 'text', span: 2 },
      { name: 'company', label: 'Company', type: 'select', options: companies },
      { name: 'factory', label: 'Facility', type: 'select', options: factories },
      { name: 'department', label: 'Department', type: 'text' },
      { name: 'owner', label: 'Project owner', type: 'text' },
      { name: 'sponsor', label: 'Sponsor', type: 'text' },
      { name: 'contractor', label: 'Contractor', type: 'text' },
      { name: 'priority', label: 'Priority', type: 'select', options: ['Critical', 'High', 'Medium', 'Low'] },
      { name: 'status', label: 'Status', type: 'select', options: Object.keys(STATUS_META) },
      { name: 'progress', label: 'Progress (%)', type: 'number', min: 0, max: 100 },
      { name: 'description', label: 'Description', type: 'textarea', span: 2, rows: 3 },
      { name: 'planned_start', label: 'Planned start', type: 'date' },
      { name: 'planned_end', label: 'Planned completion', type: 'date' },
      { name: 'actual_start', label: 'Actual start', type: 'date' },
      { name: 'actual_end', label: 'Actual completion', type: 'date' },
      { name: 'capex_estimated', label: 'Estimated CAPEX', type: 'number', step: 'any' },
      { name: 'capex_approved', label: 'Approved CAPEX', type: 'number', step: 'any' },
      { name: 'capex_actual', label: 'Actual CAPEX', type: 'number', step: 'any' },
      { name: 'savings_expected', label: 'Expected annual savings', type: 'number', step: 'any' },
      { name: 'mv_method', label: 'IPMVP option', type: 'select', options: ['A', 'B', 'C', 'D'], placeholder: 'None' },
      { name: 'verification_status', label: 'Verification status', type: 'select', options: Object.keys(VERIFY_META) }
    ];
    const m = UI.modal({
      title: 'Edit project ' + p.code, body: Form.build(f, p), size: 'wide',
      footer: '<button class="btn" data-close>Cancel</button><button class="btn btn-primary" id="save">Save changes</button>'
    });
    m.querySelector('#save').addEventListener('click', async () => {
      const missing = Form.validate(m, f);
      if (missing.length) { err('Required: ' + missing.join(', ')); return; }
      const data = Form.read(m, f);
      data.updated_at = Date.now();
      try {
        await API.patch('projects', p.id, data);
        await audit('Update', 'project', p.id, p.code + ' — profile updated');
        await reloadAll();
        m._close();
        ok('Project updated');
        paint(root);
      } catch (e) { err('Update failed: ' + e.message); }
    });
  }

  function addDays(dateStr, n) {
    const d = parseDate(dateStr);
    if (!d) return dateStr;
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  }
})();
