/* ==========================================================================
   Oriental Weavers Platform — Chart layer (Chart.js theming + builders)
   Light canvas, navy axis text — matches the OW monthly reporting decks.
   ========================================================================== */
'use strict';

const CH = (function () {
  const registry = [];

  /* Palette anchored on the OW status colours from the projects dashboard,
     extended with harmonious tints for multi-series charts. */
  const PALETTE = ['#1B2A6B', '#1E7B96', '#6B46C1', '#2E7D32', '#B7791F', '#C53030',
    '#4590A8', '#8C92A4', '#7C5CC4', '#5B9E60', '#D19A3E', '#D96A6A'];

  if (window.Chart) {
    Chart.defaults.color = '#4A5578';
    Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
    Chart.defaults.font.size = 11;
    Chart.defaults.borderColor = 'rgba(226,232,240,.9)';
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    Chart.defaults.plugins.legend.labels.boxWidth = 7;
    Chart.defaults.plugins.legend.labels.boxHeight = 7;
    Chart.defaults.plugins.legend.labels.padding = 14;
    Chart.defaults.plugins.legend.labels.font = { size: 11 };
    Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(20,32,79,.96)';
    Chart.defaults.plugins.tooltip.borderColor = 'rgba(20,32,79,.96)';
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.titleFont = { size: 11.5, weight: '700' };
    Chart.defaults.plugins.tooltip.bodyFont = { size: 11.5 };
    Chart.defaults.plugins.tooltip.padding = 9;
    Chart.defaults.plugins.tooltip.cornerRadius = 7;
    Chart.defaults.plugins.tooltip.displayColors = true;
    Chart.defaults.plugins.tooltip.boxPadding = 4;
    Chart.defaults.maintainAspectRatio = false;
    Chart.defaults.animation = { duration: 550 };
  }

  function grad(ctx, hex, a) {
    const g = ctx.createLinearGradient(0, 0, 0, 260);
    const r = parseInt(hex.slice(1, 3), 16), gg = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    g.addColorStop(0, 'rgba(' + r + ',' + gg + ',' + b + ',' + (a === undefined ? 0.42 : a) + ')');
    g.addColorStop(1, 'rgba(' + r + ',' + gg + ',' + b + ',0.02)');
    return g;
  }

  /** Create a chart on a canvas id, destroying any previous instance. */
  function make(canvasId, config) {
    const el = document.getElementById(canvasId);
    if (!el) return null;
    const prev = Chart.getChart(el);
    if (prev) { registry.splice(registry.indexOf(prev), 1); prev.destroy(); }
    const c = new Chart(el, config);
    registry.push(c);
    return c;
  }

  const axes = (opts) => Object.assign({
    x: { grid: { display: false, border: { display: false } }, ticks: { maxRotation: 0, autoSkipPadding: 12 } },
    y: { grid: { color: 'rgba(38,54,79,.42)' }, border: { display: false }, beginAtZero: true }
  }, opts || {});

  /* ------------------------------- builders ------------------------------- */

  function line(canvasId, labels, datasets, opts) {
    const o = opts || {};
    const el = document.getElementById(canvasId);
    const ctx = el ? el.getContext('2d') : null;
    return make(canvasId, {
      type: 'line',
      data: {
        labels: labels,
        datasets: datasets.map((d, i) => {
          const col = d.color || PALETTE[i % PALETTE.length];
          return {
            label: d.label, data: d.data,
            borderColor: col, backgroundColor: d.fill === false ? 'transparent' : (ctx ? grad(ctx, col, 0.28) : col + '33'),
            fill: d.fill === undefined ? true : d.fill,
            tension: 0.34, borderWidth: 2, pointRadius: 0, pointHoverRadius: 4,
            pointBackgroundColor: col, pointBorderColor: '#0e1526', pointBorderWidth: 2,
            borderDash: d.dash || []
          };
        })
      },
      options: {
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: o.legend === undefined ? datasets.length > 1 : o.legend, position: 'bottom' },
          tooltip: { callbacks: o.tooltip || {} }
        },
        scales: axes(o.axes)
      }
    });
  }

  function bar(canvasId, labels, datasets, opts) {
    const o = opts || {};
    const horizontal = o.horizontal;
    return make(canvasId, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: datasets.map((d, i) => ({
          label: d.label, data: d.data,
          backgroundColor: d.colors || (d.color || PALETTE[i % PALETTE.length]),
          borderRadius: 5, borderSkipped: false,
          maxBarThickness: o.thick || 34,
          stack: d.stack || undefined
        }))
      },
      options: {
        indexAxis: horizontal ? 'y' : 'x',
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: o.legend === undefined ? datasets.length > 1 : o.legend, position: 'bottom' },
          tooltip: { callbacks: o.tooltip || {} }
        },
        scales: horizontal ? axes({
          x: { grid: { color: 'rgba(38,54,79,.42)' }, border: { display: false }, beginAtZero: true, ticks: o.ticks || {} },
          y: { grid: { display: false }, border: { display: false } }
        }) : axes(o.axes)
      }
    });
  }

  function doughnut(canvasId, labels, values, opts) {
    const o = opts || {};
    return make(canvasId, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: o.colors || PALETTE,
          borderColor: '#111b2c', borderWidth: 2.5, hoverOffset: 6
        }]
      },
      options: {
        cutout: o.cutout || '66%',
        plugins: {
          legend: { display: o.legend === false ? false : true, position: o.legendPos || 'right' },
          tooltip: { callbacks: o.tooltip || {} }
        }
      }
    });
  }

  function radar(canvasId, labels, datasets) {
    return make(canvasId, {
      type: 'radar',
      data: {
        labels: labels,
        datasets: datasets.map((d, i) => {
          const col = d.color || PALETTE[i % PALETTE.length];
          return {
            label: d.label, data: d.data, borderColor: col,
            backgroundColor: col + '26', borderWidth: 2,
            pointBackgroundColor: col, pointRadius: 3, pointBorderColor: '#111b2c'
          };
        })
      },
      options: {
        plugins: { legend: { position: 'bottom' } },
        scales: {
          r: {
            beginAtZero: true, max: 100,
            grid: { color: 'rgba(38,54,79,.6)' },
            angleLines: { color: 'rgba(38,54,79,.6)' },
            pointLabels: { font: { size: 10.5 }, color: '#9fb0c9' },
            ticks: { display: false, stepSize: 25 }
          }
        }
      }
    });
  }

  function bubble(canvasId, points, opts) {
    const o = opts || {};
    return make(canvasId, {
      type: 'bubble',
      data: {
        datasets: [{
          label: o.label || 'Projects',
          data: points,
          backgroundColor: points.map(p => (p.col || '#16c79a') + 'cc'),
          borderColor: points.map(p => p.col || '#16c79a'),
          borderWidth: 1.5, hoverBorderWidth: 2
        }]
      },
      options: {
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: c => { const d = c.raw; return d.label + ': payback ' + d.x + ' yr, achievement ' + d.y + '%'; } } }
        },
        scales: axes(o.axes)
      }
    });
  }

  function mixed(canvasId, labels, barSets, lineSets, opts) {
    const o = opts || {};
    const el = document.getElementById(canvasId);
    const ctx = el ? el.getContext('2d') : null;
    const datasets = [];
    barSets.forEach((d, i) => datasets.push({
      type: 'bar', label: d.label, data: d.data,
      backgroundColor: d.colors || (d.color || PALETTE[i % PALETTE.length]),
      borderRadius: 5, borderSkipped: false, maxBarThickness: o.thick || 26,
      yAxisID: d.axis || 'y', stack: d.stack || undefined,
      order: 2
    }));
    lineSets.forEach((d, i) => {
      const col = d.color || PALETTE[(i + 2) % PALETTE.length];
      datasets.push({
        type: 'line', label: d.label, data: d.data,
        borderColor: col, backgroundColor: 'transparent',
        borderWidth: 2.2, tension: 0.35, pointRadius: 0, pointHoverRadius: 4,
        pointBackgroundColor: col, borderDash: d.dash || [],
        yAxisID: d.axis || 'y1', order: 1, fill: false
      });
    });
    const scales = axes({});
    if (lineSets.some(l => (l.axis || 'y1') === 'y1')) {
      scales.y1 = {
        position: 'right', grid: { drawOnChartArea: false }, border: { display: false },
        beginAtZero: true, ticks: { color: '#9fb0c9' }
      };
    }
    return make(canvasId, {
      data: { labels: labels, datasets: datasets },
      options: {
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'bottom' },
          tooltip: { callbacks: o.tooltip || {} }
        },
        scales: scales
      }
    });
  }

  function polar(canvasId, labels, values, colors) {
    return make(canvasId, {
      type: 'polarArea',
      data: {
        labels: labels,
        datasets: [{ data: values, backgroundColor: (colors || PALETTE).map(c => c + 'cc'), borderColor: '#111b2c', borderWidth: 2 }]
      },
      options: {
        plugins: { legend: { position: 'bottom' } },
        scales: { r: { grid: { color: 'rgba(38,54,79,.6)' }, ticks: { display: false } } }
      }
    });
  }

  /** Horizontal comparison bars with dual metrics */
  function hbar(canvasId, labels, values, opts) {
    const o = opts || {};
    return bar(canvasId, labels, [{
      label: o.label || 'Value', data: values,
      colors: values.map(v => o.colorFn ? o.colorFn(v) : '#16c79a')
    }], { horizontal: true, legend: false, thick: 18, tooltip: o.tooltip });
  }

  return { make, line, bar, doughnut, radar, bubble, mixed, polar, hbar, PALETTE, grad };
})();
