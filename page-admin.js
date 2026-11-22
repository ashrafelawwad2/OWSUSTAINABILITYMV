/* ==========================================================================
   AXIS Platform — Administration & Settings
   Users & roles, calculation parameters, organisation, audit trail, data tools
   ========================================================================== */
'use strict';

(function () {
  const state = { tab: 'users' };

  App.boot({
    page: 'admin',
    title: 'Administration & Settings',
    crumb: 'Platform configuration, users and audit trail',
    render: paint
  });

  function paint(root) {
    if (!Session.canAdmin()) {
      root.innerHTML = '<div class="card card-pad">' + UI.empty('Administrator access required',
        'This area manages users, calculation parameters and the audit trail. Sign in with Administrator access to continue.',
        'lock') + '<div style="text-align:center"><a class="btn btn-primary" href="login.html"><i class="fa-solid fa-right-to-bracket"></i> Sign in</a></div></div>';
      return;
    }

    root.innerHTML = `
      <div class="page-head">
        <div class="ph-txt">
          <h2>Administration &amp; Settings</h2>
          <div class="sub">Manage users and permissions, M&amp;V calculation parameters, organisational structure and review the audit trail</div>
        </div>
      </div>

      <div class="tabs" id="aTabs">
        <button class="tab on" data-t="users">Users &amp; permissions</button>
        <button class="tab" data-t="params">Calculation parameters</button>
        <button class="tab" data-t="org">Organisation</button>
        <button class="tab" data-t="audit">Audit trail</button>
        <button class="tab" data-t="data">Data management</button>
      </div>
      <div id="aBody"></div>
    `;

    $$('#aTabs .tab').forEach(b => b.addEventListener('click', () => {
      state.tab = b.getAttribute('data-t');
      $$('#aTabs .tab').forEach(x => x.classList.toggle('on', x === b));
      body(state.tab, root);
    }));

    body(state.tab, root);
  }

  function body(tab, root) {
    const host = $('#aBody');
    if (tab === 'users') return usersTab(host, root);
    if (tab === 'params') return paramsTab(host, root);
    if (tab === 'org') return orgTab(host);
    if (tab === 'audit') return auditTab(host);
    if (tab === 'data') return dataTab(host, root);
  }

  /* ===================== Users ===================== */
  function usersTab(host, root) {
    host.innerHTML = `
      <div class="card" style="margin-bottom:14px">
        <div class="card-head"><h3>Platform users</h3>
          <span class="ch-sub">${S.users.length} accounts</span>
          <div class="ch-actions"><button class="btn btn-sm btn-primary" id="addUser"><i class="fa-solid fa-user-plus"></i> Add user</button></div></div>
        <div id="userTable"></div>
      </div>
      <div class="card card-pad">
        <div class="tiny muted" style="text-transform:uppercase;letter-spacing:.08em;font-weight:700;margin-bottom:9px">Role permissions</div>
        <div class="table-wrap"><table class="data">
          <thead><tr><th>Capability</th><th>Administrator</th><th>Editor</th><th>M&amp;V Verifier</th><th>Viewer</th></tr></thead>
          <tbody>
            ${[
              ['View dashboards and reports', 1, 1, 1, 1],
              ['Register and edit projects', 1, 1, 0, 0],
              ['Submit M&amp;V measurement data', 1, 1, 1, 0],
              ['Verify and sign off savings', 1, 0, 1, 0],
              ['Upload documents and evidence', 1, 1, 1, 0],
              ['Manage users and permissions', 1, 0, 0, 0],
              ['Change calculation parameters', 1, 0, 0, 0],
              ['Review audit trail', 1, 0, 0, 0]
            ].map(r => `<tr><td>${esc(r[0])}</td>${r.slice(1).map(v =>
              `<td>${v ? '<i class="fa-solid fa-check" style="color:#4fe0bb"></i>' : '<i class="fa-solid fa-minus" style="color:#475569"></i>'}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table></div>
        <div class="banner banner-warn" style="margin:14px 0 0">
          <i class="fa-solid fa-shield-halved"></i>
          <div><strong>Enforcement note.</strong> These roles control what the interface exposes.
            Route-level protection for the administrative area must additionally be enforced by the platform
            dispatcher via Hosted Access Rules — never by browser-side JavaScript alone.</div>
        </div>
      </div>`;

    DataTable.render($('#userTable'), {
      pageSize: 15, searchable: true, rows: S.users,
      columns: [
        { key: 'name', label: 'Name', render: u => `<div style="display:flex;align-items:center;gap:8px">
            <span class="avatar" style="width:24px;height:24px;font-size:9.5px">${esc(u.name.split(' ').map(w => w[0]).join('').slice(0, 2))}</span>
            <span><strong>${esc(u.name)}</strong><div class="tiny muted">${esc(u.email)}</div></span></div>` },
        { key: 'role', label: 'Role', render: u => `<span class="badge ${u.role === 'Administrator' ? 'b-purple' : u.role === 'Editor' ? 'b-blue' : u.role === 'Verifier' ? 'b-teal' : 'b-slate'}">${esc(u.role)}</span>` },
        { key: 'company', label: 'Company', render: u => `<span class="tiny">${esc(u.company || '—')}</span>` },
        { key: 'status', label: 'Status', render: u => `<span class="badge ${u.status === 'Active' ? 'b-green' : u.status === 'Invited' ? 'b-amber' : 'b-red'}">${esc(u.status)}</span>` },
        { key: 'last_login', label: 'Last login', render: u => u.last_login ? Fmt.date(u.last_login) : '<span class="muted">never</span>' }
      ],
      emptyTitle: 'No users'
    });

    $('#addUser').addEventListener('click', () => {
      const f = [
        { name: 'name', label: 'Full name', type: 'text', required: true, span: 2 },
        { name: 'email', label: 'Email', type: 'email', required: true, span: 2 },
        { name: 'role', label: 'Role', type: 'select', options: ['Administrator', 'Editor', 'Verifier', 'Viewer'] },
        { name: 'company', label: 'Company', type: 'text' },
        { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Invited', 'Suspended'] }
      ];
      const m = UI.modal({
        title: 'Add platform user', body: Form.build(f, { role: 'Viewer', status: 'Invited' }),
        footer: '<button class="btn" data-close>Cancel</button><button class="btn btn-primary" id="save">Add user</button>'
      });
      m.querySelector('#save').addEventListener('click', async () => {
        const missing = Form.validate(m, f);
        if (missing.length) { err('Required: ' + missing.join(', ')); return; }
        const d = Form.read(m, f);
        d.id = 'usr-' + uuid().slice(0, 10);
        d.last_login = '';
        try {
          await API.create('users', d);
          await audit('Create', 'user', d.id, d.name + ' (' + d.role + ')');
          await reloadAll();
          m._close();
          ok('User added');
          paint(root);
        } catch (e) { err('Save failed: ' + e.message); }
      });
    });
  }

  /* ===================== Parameters ===================== */
  function paramsTab(host, root) {
    const groups = { tariff: 'Energy tariffs', carbon: 'Emission factors', financial: 'Financial parameters', general: 'General' };
    const rows = Object.keys(S.settings).map(k => ({
      key: k, value: S.settings[k],
      label: (S.settingsMeta && S.settingsMeta[k]) || k
    }));

    let html = '<div class="banner banner-info"><i class="fa-solid fa-circle-info"></i><div>' +
      'These parameters drive every calculation in the platform: cost savings, GHG avoided, NPV, IRR and payback. ' +
      'Changes take effect immediately across all dashboards and reports.</div></div>';

    html += '<div class="grid g2">';
    ['tariff', 'carbon', 'financial', 'general'].forEach(grp => {
      const keys = PARAM_KEYS.filter(p => p.group === grp);
      html += `<div class="card"><div class="card-head"><h3>${esc(groups[grp])}</h3></div><div class="card-body">`;
      keys.forEach(p => {
        html += `<div class="field"><label for="set_${p.key}">${esc(p.label)}</label>
          <input type="${p.type || 'number'}" step="${p.step || 'any'}" id="set_${p.key}" value="${esc(S.settings[p.key] !== undefined ? S.settings[p.key] : p.dflt)}">
          ${p.hint ? '<div class="hint">' + esc(p.hint) + '</div>' : ''}</div>`;
      });
      html += '</div></div>';
    });
    html += '</div>';
    html += '<div class="card card-pad" style="margin-top:14px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">' +
      '<span class="tiny muted" style="margin-right:auto">Changes are recorded in the audit trail.</span>' +
      '<button class="btn" id="resetParams"><i class="fa-solid fa-rotate-left"></i> Restore defaults</button>' +
      '<button class="btn btn-primary" id="saveParams"><i class="fa-solid fa-floppy-disk"></i> Save parameters</button></div>';

    host.innerHTML = html;

    $('#saveParams').addEventListener('click', async () => {
      const btn = $('#saveParams');
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving…';
      const existing = {};
      S.settings && Object.keys(S.settings).forEach(k => { existing[k] = S.settings[k]; });
      let changed = 0;
      for (const p of PARAM_KEYS) {
        const el = $('#set_' + p.key);
        if (!el) continue;
        const val = String(el.value);
        if (existing[p.key] === val) continue;
        try {
          const rec = (await API.all('settings')).find(r => r.key === p.key);
          if (rec) {
            await API.patch('settings', rec.id, { value: val });
          } else {
            await API.create('settings', { id: 'set-' + p.key, key: p.key, value: val, label: p.label, group: p.group });
          }
          changed++;
        } catch (e) { err('Failed to save ' + p.label + ': ' + e.message); }
      }
      await audit('Update', 'settings', 'parameters', changed + ' calculation parameter(s) updated');
      await reloadAll();
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save parameters';
      ok(changed ? changed + ' parameter(s) updated' : 'No changes to save');
      paint(root);
    });

    $('#resetParams').addEventListener('click', () => {
      UI.confirm('Restore all calculation parameters to platform defaults?', async () => {
        for (const p of PARAM_KEYS) {
          const el = $('#set_' + p.key);
          if (el) el.value = p.dflt;
        }
        info('Defaults restored in the form — click Save parameters to apply.');
      });
    });
  }

  const PARAM_KEYS = [
    { key: 'elec_price', label: 'Electricity tariff (USD/kWh)', group: 'tariff', dflt: 0.055, hint: 'Blended industrial tariff, Oriental Weavers plants' },
    { key: 'gas_price', label: 'Natural gas tariff (USD/Nm³)', group: 'tariff', dflt: 0.095 },
    { key: 'water_price', label: 'Water tariff (USD/m³)', group: 'tariff', dflt: 0.55 },
    { key: 'waste_cost', label: 'Waste disposal cost (USD/tonne)', group: 'tariff', dflt: 35 },
    { key: 'grid_ef', label: 'Grid emission factor (kgCO₂e/kWh)', group: 'carbon', dflt: 0.42, hint: 'Egypt grid factor, used for Scope 2 avoided emissions' },
    { key: 'gas_ef', label: 'Natural gas emission factor (kgCO₂e/Nm³)', group: 'carbon', dflt: 2.02, hint: 'Used for Scope 1 avoided emissions' },
    { key: 'discount_rate', label: 'Discount rate (decimal)', group: 'financial', dflt: 0.12, hint: 'e.g. 0.12 for 12%' },
    { key: 'project_life', label: 'Default economic life (years)', group: 'financial', dflt: 12 },
    { key: 'group_name', label: 'Group name', group: 'general', dflt: 'Oriental Weavers Group', type: 'text' },
    { key: 'dept_name', label: 'Reporting department', group: 'general', dflt: 'Sustainability & Process Improvement', type: 'text' },
    { key: 'reporting_period', label: 'Default M&V reporting period', group: 'general', dflt: 'Monthly', type: 'text' },
    { key: 'fy_start', label: 'Financial year start (MM-DD)', group: 'general', dflt: '01-01', type: 'text' },
    { key: 'energy_report_period', label: 'Group energy report period', group: 'energy', dflt: '2026-10', type: 'text' },
    { key: 'energy_cost_savings_ytd_m_egp', label: 'Energy cost savings YTD (million EGP)', group: 'energy', dflt: 10.0 },
    { key: 'energy_cost_savings_target_pct', label: 'Energy cost savings vs target (%)', group: 'energy', dflt: 53 }
  ];

  /* ===================== Organisation ===================== */
  function orgTab(host) {
    const byLevel = { group: [], company: [], factory: [], department: [] };
    S.facilities.forEach(f => { if (byLevel[f.level]) byLevel[f.level].push(f); });

    function tree(level, parentId, depth) {
      const list = S.facilities.filter(f => f.level === level && (f.parent_id || '') === (parentId || ''));
      return list.map(f => {
        const childLevel = { group: 'company', company: 'factory', factory: 'department' }[level];
        const projects = S.projects.filter(p => p.factory === f.name || p.company === f.name).length;
        const rows = S.projects.filter(p => p.factory === f.name || p.company === f.name);
        const savings = rows.reduce((a, p) => {
          const mv = MV.summary(p);
          return a + mv.annual.cost;
        }, 0);
        return `<div style="padding:9px 12px;border-left:2px solid ${level === 'group' ? '#16c79a' : level === 'company' ? '#3b9bff' : level === 'factory' ? '#f5a524' : '#64748b'};
            margin-left:${depth * 18}px;margin-bottom:6px;background:rgba(255,255,255,.02);border-radius:0 8px 8px 0">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <span class="tag">${esc(f.level)}</span>
            <strong style="font-size:12.7px">${esc(f.name)}</strong>
            ${f.headcount ? `<span class="tiny muted">${Fmt.int(f.headcount)} employees</span>` : ''}
            ${projects ? `<span class="badge b-blue">${projects} projects</span>` : ''}
            ${savings ? `<span class="badge b-green">${Fmt.money(savings)}/yr</span>` : ''}
          </div>
          ${f.location ? `<div class="tiny muted" style="margin-top:2px">${esc(f.location)}</div>` : ''}
          ${childLevel ? tree(childLevel, f.id, depth + 1) : ''}
        </div>`;
      }).join('');
    }

    host.innerHTML = `
      <div class="card">
        <div class="card-head"><h3>Organisational hierarchy</h3>
          <span class="ch-sub">Group → Company → Factory → Department → Project</span></div>
        <div class="card-body">
          ${tree('group', '', 0) || UI.empty('No hierarchy', 'Organisation records will appear here.', 'sitemap')}
        </div>
      </div>

      <div class="card" style="margin-top:14px">
        <div class="card-head"><h3>Consolidation levels</h3>
          <span class="ch-sub">Where performance rolls up</span></div>
        <div class="card-body">
          <div class="grid g4">
            ${[
              ['Group', S.projects.length, sum(S.projects, p => num(p.capex_approved))],
              ['Companies', uniq(S.projects.map(p => p.company)).length, uniq(S.projects.map(p => p.company)).length],
              ['Factories', uniq(S.projects.map(p => p.factory)).length, 0],
              ['Departments', uniq(S.projects.map(p => p.department)).length, 0]
            ].map((r, i) => UI.kpi({
              label: r[0],
              value: r[1],
              accent: ['#16c79a', '#3b9bff', '#f5a524', '#9b7bff'][i],
              foot: i === 0 ? r[1] + ' projects · ' + Fmt.money(r[2]) + ' approved CAPEX' : 'consolidation level'
            })).join('')}
          </div>
        </div>
      </div>`;
  }

  /* ===================== Audit trail ===================== */
  function auditTab(host) {
    host.innerHTML = `
      <div class="card">
        <div class="card-head"><h3>Audit trail</h3>
          <span class="ch-sub">${S.audit.length} recorded actions · newest first</span>
          <div class="ch-actions"><button class="btn btn-sm" id="audExp"><i class="fa-solid fa-file-csv"></i> Export</button></div></div>
        <div id="audTable"></div>
      </div>
      <div class="banner banner-info" style="margin-top:14px">
        <i class="fa-solid fa-clock-rotate-left"></i>
        <div><strong>Data lineage.</strong> Every create, update, delete, verification and configuration change is recorded with
          actor, timestamp and affected entity. This supports audit, third-party verification and dispute resolution.</div>
      </div>`;

    DataTable.render($('#audTable'), {
      pageSize: 20, searchable: true, rows: S.audit,
      columns: [
        { key: 'ts', label: 'Timestamp', render: a => {
            const d = new Date(num(a.ts));
            return `<span class="tiny mono">${d.toLocaleDateString('en-GB')} ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>`;
          }, sortValue: a => num(a.ts) },
        { key: 'actor', label: 'Actor', render: a => `<strong class="tiny">${esc(a.actor || '—')}</strong>` },
        { key: 'action', label: 'Action', render: a => {
            const cls = { Create: 'b-green', Update: 'b-blue', Delete: 'b-red', Verify: 'b-purple', Login: 'b-slate', Bootstrap: 'b-teal', Upload: 'b-teal' }[a.action] || 'b-slate';
            return `<span class="badge ${cls}">${esc(a.action)}</span>`;
          } },
        { key: 'entity', label: 'Entity', render: a => `<span class="tag">${esc(a.entity)}</span>` },
        { key: 'detail', label: 'Detail', render: a => `<span class="tiny dim">${esc(a.detail || '')}</span>` }
      ],
      emptyTitle: 'No audit records',
      empty: 'Actions will be recorded as users work in the platform.'
    });

    $('#audExp').addEventListener('click', () => {
      Export.csv('AXIS_audit_log_' + today() + '.csv', [
        { key: 'ts', label: 'Timestamp' }, { key: 'actor', label: 'Actor' },
        { key: 'action', label: 'Action' }, { key: 'entity', label: 'Entity' },
        { key: 'entity_id', label: 'Entity ID' }, { key: 'detail', label: 'Detail' }
      ], S.audit.map(a => Object.assign({}, a, { ts: new Date(num(a.ts)).toISOString() })));
    });
  }

  /* ===================== Data management ===================== */
  function dataTab(host, root) {
    const counts = [
      ['Projects', S.projects.length, 'projects'],
      ['Milestones', S.milestones.length, 'milestones'],
      ['Tasks', S.tasks.length, 'tasks'],
      ['M&V records', S.mvRecords.length, 'mv_records'],
      ['KPIs', S.kpis.length, 'kpis'],
      ['Risk register entries', S.risks.length, 'risks'],
      ['Documents', S.documents.length, 'documents'],
      ['Users', S.users.length, 'users'],
      ['Organisation units', S.facilities.length, 'facilities'],
      ['Audit records', S.audit.length, 'audit_log']
    ];

    host.innerHTML = `
      <div class="grid g2" style="margin-bottom:14px">
        <div class="card">
          <div class="card-head"><h3>Database contents</h3></div>
          <div class="card-body" style="padding:12px 15px">
            ${counts.map(c => `<div class="stat-line"><span class="k">${esc(c[0])}</span><span class="v">${Fmt.int(c[1])}</span></div>`).join('')}
          </div>
        </div>
        <div class="card">
          <div class="card-head"><h3>Import &amp; export</h3></div>
          <div class="card-body">
            <p class="tiny muted" style="line-height:1.6;margin-bottom:12px">
              Download templates for bulk project registration and monthly performance data, or export the full
              dataset for external analysis, ERP loading or backup.</p>
            <div style="display:flex;flex-direction:column;gap:8px">
              <button class="btn" id="exProjTpl"><i class="fa-solid fa-file-arrow-down"></i> Project import template</button>
              <button class="btn" id="exMvTpl"><i class="fa-solid fa-file-arrow-down"></i> M&amp;V data template</button>
              <button class="btn" id="exAllProjects"><i class="fa-solid fa-file-excel"></i> Export all projects</button>
              <button class="btn" id="exAllMv"><i class="fa-solid fa-file-excel"></i> Export all M&amp;V records</button>
              <button class="btn" id="exSettings"><i class="fa-solid fa-file-excel"></i> Export settings</button>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-head"><h3>Backup and recovery</h3><span class="ch-sub">Operational guidance</span></div>
        <div class="card-body">
          <div class="grid g2">
            <div>
              <div class="kv-k" style="margin-bottom:5px">Continuous protection</div>
              <p class="tiny muted" style="line-height:1.65">
                Project records, milestones, tasks, M&amp;V data, KPIs, risks, documents metadata and the audit trail
                are stored in the platform database, which is backed up by the hosting provider. Preview and live
                environments are separate stores: editing in the editor never changes deployed data and vice versa.
              </p>
            </div>
            <div>
              <div class="kv-k" style="margin-bottom:5px">Recommended operating practice</div>
              <p class="tiny muted" style="line-height:1.65">
                Export a full dataset (Excel) at each month-end and retain it with the signed M&amp;V report. Before any
                structural change or bulk import, take an export first. A code rollback restores application behaviour
                only — it does not restore data, so keep the exports separate from source control.
              </p>
            </div>
          </div>
          <div class="banner banner-warn" style="margin:14px 0 0">
            <i class="fa-solid fa-database"></i>
            <div><strong>No destructive actions are exposed here.</strong> This platform deliberately provides no
              "clear all data" control. Deleting records is done per record with an audit entry, so portfolio history
              cannot be wiped by accident.</div>
          </div>
        </div>
      </div>`;

    $('#exProjTpl').addEventListener('click', () => Export.template());
    $('#exMvTpl').addEventListener('click', () => Export.mvTemplate());
    $('#exAllProjects').addEventListener('click', () => {
      Export.excel('AXIS_all_projects_' + today() + '.xls', [
        { key: 'code', label: 'Code' }, { key: 'name', label: 'Project' },
        { key: 'category', label: 'Category' }, { key: 'subcategory', label: 'Subcategory' },
        { key: 'company', label: 'Company' }, { key: 'factory', label: 'Facility' },
        { key: 'department', label: 'Department' }, { key: 'owner', label: 'Owner' },
        { key: 'sponsor', label: 'Sponsor' }, { key: 'priority', label: 'Priority' },
        { key: 'status', label: 'Status' }, { key: 'progress', label: 'Progress' },
        { key: 'planned_start', label: 'Planned Start' }, { key: 'planned_end', label: 'Planned End' },
        { key: 'capex_estimated', label: 'CAPEX Estimated' }, { key: 'capex_approved', label: 'CAPEX Approved' },
        { key: 'capex_actual', label: 'CAPEX Actual' }, { key: 'savings_expected', label: 'Expected Savings' },
        { key: 'mv_method', label: 'M&V Method' }, { key: 'verification_status', label: 'Verification' },
        { key: 'description', label: 'Description' }
      ], S.projects, 'AXIS Full Project Export');
    });
    $('#exAllMv').addEventListener('click', () => {
      Export.excel('AXIS_all_mv_' + today() + '.xls', [
        { key: 'project', label: 'Project Code' }, { key: 'period', label: 'Period' },
        { key: 'baseline_elec_kwh', label: 'Baseline kWh' }, { key: 'elec_kwh', label: 'Actual kWh' },
        { key: 'baseline_gas_nm3', label: 'Baseline Nm3' }, { key: 'gas_nm3', label: 'Actual Nm3' },
        { key: 'baseline_production_t', label: 'Baseline Prod t' }, { key: 'production_t', label: 'Actual Prod t' },
        { key: 'baseline_water_m3', label: 'Baseline Water m3' }, { key: 'water_m3', label: 'Actual Water m3' },
        { key: 'baseline_waste_t', label: 'Baseline Waste t' }, { key: 'waste_t', label: 'Actual Waste t' },
        { key: 'verified', label: 'Verified' }, { key: 'verified_by', label: 'Verified By' }
      ], S.mvRecords.map(r => {
        const p = S.projById.get(r.project_id);
        return Object.assign({}, r, { project: p ? p.code : r.project_id, verified: r.verified ? 'Yes' : 'No' });
      }), 'AXIS Full M&V Data Export');
    });
    $('#exSettings').addEventListener('click', () => {
      Export.excel('AXIS_settings_' + today() + '.xls', [
        { key: 'key', label: 'Parameter' }, { key: 'value', label: 'Value' }
      ], Object.keys(S.settings).map(k => ({ key: k, value: S.settings[k] })), 'AXIS Calculation Parameters');
    });
  }
})();
