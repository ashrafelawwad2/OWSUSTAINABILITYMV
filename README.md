# Oriental Weavers — Projects, Monitoring & M&V Platform

A static, database-driven platform for managing, monitoring and verifying Oriental Weavers
manufacturing projects across the Group → Company → Plant → Department → Project hierarchy.

**This project contains only Oriental Weavers data.** The earlier synthetic "Horizon Industrial
Group" demonstration dataset has been fully removed from both the seed file and the stored data —
see [§7 Data hygiene](#7-data-hygiene).

---

## 1. Source material

| Source | Used for |
|---|---|
| `OW Sustainability Monthly Report Oct. 26_AE.pptx` | Group energy performance: NG saved/consumed, electricity savings, grid consumption, RE savings, EGP baselines, total energy cost savings YTD |
| `OW_Monthly_Executive_Report_Nov_2026.pptx` | Process improvement programme: coating & shearing, raw material, fleet reform, new projects, quality |
| OW Projects Dashboard slide (`images/ref-dashboard.png`) | Portfolio totals, status counts, budget by status |
| OW Project Detail slide (`images/ref-projects.png`) | The 21 projects: name, plant, budget, progress, status |

Both reference slides are stored in `images/` at their original resolution.

---

## 2. The 21 projects

Loaded verbatim and reconciling to the deck totals:

- Total portfolio budget **$28.02M** computed (deck states $28.01M) — 21 projects
- Active budget **$20.95M** — In Progress + Not Started
- Average completion **42%** — budget-weighted over the 9 In Progress projects (see §5)
- Completed 3 · Cancelled 2
- Status: In Progress 9, Under Study 5, Completed 3, Not Started 2, Cancelled 2

| # | Project | Plant | Budget | Progress | Status |
|---|---|---|---|---|---|
| 1 | Polyester Yarns Plant | King Tut | $7.30M | 90% | In Progress |
| 2 | Digital Printing | King Tut | $6.28M | 0% | Under Study |
| 3 | Velvet Project | Horus | $5.32M | 25% | In Progress |
| 4 | Axminister Capacity Increasing | Axminister F. Hall | $3.80M | 5% | In Progress |
| 5 | 5 MW On-site Solar | OWI | $2.50M | 10% | In Progress |
| 6 | Air Tangle | OWI / King Tut | $800K | 5% | In Progress |
| 7 | Racks + VNA RMWH | King Tut | $600K | 25% | In Progress |
| 8 | Racks + VNA RMWH (OWT) | OWT | $600K | 0% | Cancelled |
| 9 | 30% Forklift Electrification (10 units) | OWI | $256K | 0% | Not Started |
| 10 | Handling Equipment | OWI | $150K | 0% | Not Started |
| 11 | Ventilation Superba Halls | BCF 1 | $125K | 90% | In Progress |
| 12 | BCF 2&3 Energy Digitalization | BCF 2 & 3 | $100K | 10% | In Progress |
| 13 | IKEA WH Handling Improvement | IKEA WH | $100K | 0% | Cancelled |
| 14 | VOC Control in Shearing Halls Ramses | Ramses | $45K | 100% | Completed |
| 15 | Ramses Birds Control Net | Ramses | $20K | 100% | Completed |
| 16 | Install Production Water Sub-meter | OWI | $20K | 100% | Completed |
| 17 | Tri Generation | OWI | — | 15% | In Progress |
| 18 | TPR Backcoating Line | TBD | — | 0% | Under Study |
| 19 | 2 New Loop Looms | TBD | — | 0% | Under Study |
| 20 | Space Dye | TBD | — | 0% | Under Study |
| 21 | Superba | TBD | — | 0% | Under Study |

Projects 17–21 carry **no budget** on the deck. They are stored at `0`, not invented.

**People:** every project has `owner = Ashraf Elawwad` and `sponsor = Maged Mamdouh`. All named
references across milestones, tasks, risks and documents use the same two people.

### Organisation hierarchy

`Oriental Weavers Group` contains four companies — **Oriental Weavers Carpets**, **Oriental Weavers
International (OWI)**, **Oriental Weavers Tapes (OWT)**, **OW Logistics & Warehousing** — which own the
plants **King Tut, Horus, Axminster F. Hall, Ramses, BCF 1, BCF 2 & 3, Superba Halls, OWI, OWT,
IKEA WH**, plus a **TBD** node for the unallocated projects, and six departments (Energy, Process,
Engineering, Operations, Supply Chain, Quality).

---

## 3. One-page all-projects status board (`status.html`)

The default landing page for day-to-day use, and nav item **#1**. Single screen, no tabs, no filters —
everything for every project at once:

- **6 portfolio KPIs** — total projects, total portfolio budget, active budget, average completion,
  completed, needs attention (overdue / at-risk / open critical issues)
- **Status distribution** — chip row with count and budget per status, plus a stacked
  budget-by-status bar with legend
- **Group energy performance band** — the five YTD energy tiles from `settings.energy_perf`,
  including the two genuinely red "Below target" results
- **Full status register** — all 21 projects with `# / Code / Project / Plant / Owner / Budget /
  Progress / Status / Savings-per-year / Issues`, sorted OW-01 → OW-21, with a `tfoot` totals row
- **Print/PDF** and **CSV** export buttons in the page head

Every figure is recomputed from the Table API by `portfolio()` and `energyPerf()`. No page carries a
hardcoded number.

---

## 4. Group energy performance (Oct 2026 YTD)

Held as a JSON row (`settings.energy_perf`) and rendered by `energyPerf()` — **no hardcoded page
figures**.

| KPI | YTD | Target | Status |
|---|---|---|---|
| NG saved | 462k m³ | 224k m³ | On target |
| NG consumption | 10,740k m³ | 11,208k m³ | On target |
| Electricity savings | **-993 MWh** | 3,924 MWh | **Below target** |
| Grid electricity | 193.5 GWh | 188.7 GWh | **Below target** |
| RE savings | 3,702 MWh | 3,583 MWh | On target |

Total energy cost savings YTD **10.0m EGP = 53% of target**. 2025 adjusted baselines: 421 million EGP
(natural gas) and 133.3 million EGP (electricity).

**Currency:** group energy is reported in **EGP**; project budgets are in **USD**. Both are shown as
published and are deliberately *not* converted — the dashboard states this explicitly.

The two negative results are genuine underperformance in the source deck and are surfaced as red
"Below target" tiles rather than smoothed away.

---

## 5. Completion-percentage basis

`portfolio().totals` exposes two different completion measures on purpose:

| Field | Basis |
|---|---|
| `avgProgress` | Plain average of every row's progress (many rows are 0%, so this reads ~27%) |
| `avgProgressActive` | **Budget-weighted** average over the *In Progress* projects that carry a budget — this reproduces the deck's **42%** and is what the dashboards display |

`avgProgressActiveCount` reports how many projects that figure is drawn from (9). The UI labels it
"Budget-weighted · 9 in-progress projects" so the basis is never ambiguous.

---

## 6. November 2026 process programme

The executive report's action items are loaded as dated tasks with a `source` column, attached to the
owning project:

- **Coating & shearing** — humidity sensor installed on line 1 (installation fault, vendor to fix);
  MES, weight-measuring and heat-recovery in vendor discussion
- **Raw material** — VAC latex trial shows strong crease-recovery gain; mono-polymer recycling succeeded
- **Fleet reform** — master plan issued, 90% of RFQs out, vendor quote review due **16/11**
- **New projects** — digital print heading for financial approval; TBR data with project management
- **Quality** — metal detector quotes and incoming latex lab equipment list due **15/12**

Five explicit issues are also registered (sensor fault, RFQ closure, metal detector quotes, vendor
scope, digital print approval) so they appear in the risk register and alerts.

---

## 7. Data hygiene

The build originally shipped a synthetic demonstration dataset alongside the OW data. Because the
Table API's bulk loader skips an `id` that already exists, editing `js/seed.js` alone would never
have removed those rows — they had to be deleted and migrated explicitly. Both operations were run
against the store and verified:

**Removed (dummy / non-OW):** 32 Horizon demonstration projects (`prj-en-*`, `prj-su-*`, `prj-pr-*`,
`prj-nf-*`, `prj-op-*`), their 107 orphaned milestones, 36 Horizon facilities (group, companies,
plants, departments) and 8 non-OW user accounts.

**Migrated in place:** people names on existing child rows. 107 milestones, 144 tasks, 57 risks and
89 documents were `PATCH`ed to `Ashraf Elawwad` / `Maged Mamdouh`; the two OW user accounts were
recreated with `@orientalweavers.com` emails.

**Verified final state:** 21 projects (21 OW, 0 non-OW) · 21 facilities (0 non-OW) · 2 users ·
21 owners `Ashraf Elawwad` · 21 sponsors `Maged Mamdouh` · 0 bad owner/sponsor values ·
total budget 28,016,000 · `group_name = Oriental Weavers Group` · `dataset_complete = ow-2026-11`.

---

## 8. Architecture

No build step. Static HTML + CSS + vanilla ES2020, data through the platform Table API.

```
css/style.css          OW design system (navy #1B2A6B, white canvas, serif display headings)
js/core.js             CFG, Table API, session, M&V engine, portfolio(), alerts, shell, boot
js/seed.js             The 21 OW projects + org + energy KPIs (idempotent, resumable)
js/charts.js           Chart.js builders, OW palette, light-canvas defaults
js/ui.js               DataTable, Gantt, Export, Files, Form
js/page-*.js           One module per page (incl. page-status.js for the one-page board)
*.html                 15 pages
```

### Storage (11 tables)

`facilities`, `projects`, `milestones`, `tasks`, `mv_records`, `kpis`, `risks`, `documents`,
`users`, `audit_log`, `settings` — schema in `.tables/schema.json`.

The `projects` table carries `dataset_version` and `archived` so the OW dataset can be distinguished
from any earlier records.

### M&V engine (`MV` in core.js)

- IPMVP routine adjustment: `savings = baseline × (actual production ÷ baseline production) − actual`
- Options **A / B / C / D** per project
- NG → kWh at **10.55 kWh/Nm³** (LHV)
- Five savings levels kept distinct: estimated, approved target, actual measured, adjusted, verified
- NPV by discounted cash flow, IRR by bisection

### Access

`login.html` role selector (Administrator / Editor / M&V Verifier / Viewer). Only two accounts exist:
Ashraf Elawwad (Administrator) and Maged Mamdouh (Editor). `?view=1` on any page is a read-only
viewer link that hides edit controls and admin functions.

> **These are UI affordances only.** Real enforcement must come from Hosted Access Rules via the
> platform dispatcher. Client-side JavaScript cannot provide secure authentication.

---

## 9. Entry paths

| Page | Path | Notes |
|---|---|---|
| **Executive slide** | **`slide.html`** | **One slide, whole portfolio — nav #1** |
| **All projects status** | **`status.html`** | **One-page board — nav #2** |
| Sign in | `login.html` | Also `?next=`, language toggle |
| Executive dashboard | `index.html` | Includes OW energy performance band |
| Project portfolio | `portfolio.html` | |
| Project registration | `register.html` | 5-stage form |
| Project management | `management.html` | `data-page="management"` |
| Implementation monitoring | `monitoring.html` | `data-page="monitoring"` |
| M&V & verification | `mv.html` | 4 tabs |
| Energy & sustainability | `energy.html` | `data-category="energy"` |
| Process optimization | `process.html` | `data-category="process"` |
| New facilities | `facilities.html` | `data-category="facilities"` |
| Financial performance | `finance.html` | |
| Risk & issues | `risks.html` | Heat map |
| Reports & analytics | `reports.html` | 8 live reports |
| Administration | `admin.html` | 5 tabs |

Viewer link on any page: append `?view=1`.

---

## 10. Bilingual support (English / العربية)

A language toggle sits in the topbar of every page and on the sign-in card. The choice is stored
in `localStorage['axis_lang_v1']` and applied as `<html lang="ar" dir="rtl">`, so the whole
platform mirrors to right-to-left — sidebar, tables, charts, modals and the slide.

**How translation works (`js/i18n.js`):**

1. `I18N.t(str)` — explicit lookup, used where strings are composed in code.
2. `I18N.apply(root)` — walks rendered DOM and swaps exact English phrases for Arabic. This is
   what carries the 11 legacy page modules without rewriting every template literal.
3. A `MutationObserver` re-applies the walk after tabs, modals, toasts and table repaints inject
   new nodes. The walk is idempotent (Arabic is never a dictionary key) and cannot loop.

**Content is never translated.** The phrase-level pass only runs inside UI chrome (`.kpi-foot`,
`th`, `label`, `.badge`, captions) and never inside data cells, so project names, plant names and
people stay in their original wording.

**Arabic typography:** `letter-spacing` is forced to `0` for Arabic (joining forms break otherwise),
the Latin serif display stack is swapped for **IBM Plex Sans Arabic**, and numeric values are kept
`direction:ltr` with `unicode-bidi:isolate` so figures and units read correctly inside RTL text.

RTL overrides live in `css/style.css` under `[dir="rtl"]` — direction is switched on `<html>`
rather than by duplicated per-component rules.

---

## 11. Executive slide (`slide.html`)

One 16:9 deck slide covering the entire portfolio, built in fixed 1400×788 design units and scaled
to the viewport so it reads as a slide rather than a stretched web page.

- Navy header band: brand, title, reporting period
- Six-tile KPI strip: projects, total budget, active budget, budget-weighted completion, completed,
  needs attention
- **All 21 projects** in a two-column register (code, name, budget, progress bar, status dot)
- Status distribution panel: stacked budget bar plus count/budget per status
- Group energy panel: the five YTD metrics with on/below-target colouring
- `Fit to screen` (fullscreen) and `Download as PDF` (print) actions

**Printing** emits one landscape A4 page per slide (`@page{size:A4 landscape}`, `zoom:.70`).

**Narrow screens:** below 980px the slide reflows into a stacked full-size document instead of
scaling — a 1400px slide scaled to a 390px phone lands near 26%, which is technically "fitting"
but unreadable.

---

## 12. Verified

- `status.html` rendered and inspected at **desktop and mobile (390×844)**: 21 rows OW-01 → OW-21,
  owner column uniformly "Ashraf Elawwad", navy sticky table header, KPI cards stack cleanly on
  phone with no horizontal overflow, no raw code or unstyled elements.
- `status.html` KPIs read **42%** average completion ("Budget-weighted · 9 in-progress projects"),
  **USD 28.02M** total portfolio budget, **USD 20.95M** active budget.
- **`slide.html` executive slide** verified desktop + mobile, English + Arabic: all 21 projects
  OW-01 → OW-21 in the two-column register, six KPI tiles populated, status and energy panels
  rendered, no raw code or overflow. Mobile reflows to full-size stacked content.
- **Arabic RTL verified** on `slide.html`, `status.html`, `index.html`, `portfolio.html`,
  `reports.html` and `login.html`: sidebar mirrors to the right, Arabic script connects correctly,
  table headers and KPI captions are Arabic, **project names stay English** (data never translated),
  numeric values remain LTR-readable. No RTL layout breakage found.
- English LTR regression-checked on `status.html` after the bilingual refactor.
- `index.html` executive dashboard: energy band renders all five YTD tiles with correct values and
  the two red "Below target" badges; portfolio status list, facility comparison and top-projects
  tables all populated.
- Login page confirmed: OW monogram, navy band, white card, role selector, `@orientalweavers.com`
  defaults.
- Data store verified as OW-only (see §7).
- All syntax checks pass on `js/core.js`, `js/charts.js`, `js/ui.js`, `js/seed.js`, `js/page-status.js`;
  every `status.html` asset reference resolves.

### Bugs fixed during this pass

- `js/page-reports.js` read `t.implementing`, which does not exist on `portfolio().totals`, so the
  "Under implementation" card in the executive report rendered **`undefined`**. Corrected to
  `t.inProgress` and re-verified as **9**.
- `js/i18n.js` had a missing trailing comma in the dictionary, which made the whole file a syntax
  error; every page then failed with `I18N is not defined` and rendered blank. Fixed and confirmed
  with a clean console.

## 13. Outstanding

- Browser render-verification of the remaining 11 legacy pages.
- Interactive flows (save project, M&V entry, verification sign-off, upload, export).
- Excel/CSV **import parser** — templates download, ingestion not implemented.
- PowerPoint export (Excel and Print/PDF exist).
- **Not deployed.** `hosted_deploy` has never been run; nothing is live. The live D1 database is
  still empty — the OW data currently lives in the preview store and would need an approved
  `HostedDbSyncFromPreview` plus a Hosted Deploy to become public.
