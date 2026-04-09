"use strict";

const CATEGORIES = [
  { id: "comida", label: "Comida", icon: "🍽", color: "#d9a46d" },
  { id: "transporte", label: "Transporte", icon: "🚌", color: "#93a8c8" },
  { id: "ocio", label: "Jueguitos", icon: "🎮", color: "#d7b5c8" },
  { id: "Electiva 3", label: "Electiva 3", icon: "📘", color: "#9cb7d8" },
  { id: "ropa", label: "Ropa", icon: "🧥", color: "#c7b0d6" },
  { id: "servicios", label: "Servicios", icon: "💡", color: "#a9d5cf" },
  { id: "casino", label: "Casino", icon: "🎰", color: "#e1b0b0" },
  { id: "otros", label: "Otros", icon: "◌", color: "#b8aca4" },
];

let state = {
  expenses: [],
  budgets: { income: 0, categories: {} },
  editingId: null,
};

const STORAGE_KEYS = { expenses: "fz_expenses", budgets: "fz_budgets" };

function loadState() {
  try {
    const exp = localStorage.getItem(STORAGE_KEYS.expenses);
    const bud = localStorage.getItem(STORAGE_KEYS.budgets);
    if (exp) state.expenses = JSON.parse(exp);
    if (bud) state.budgets = JSON.parse(bud);
  } catch (e) {
    console.error("[FZ] loadState:", e);
  }
}

function saveExpenses() {
  try {
    localStorage.setItem(STORAGE_KEYS.expenses, JSON.stringify(state.expenses));
  } catch (e) {
    showToast("Almacenamiento lleno.", "error");
  }
}

function saveBudgets() {
  try {
    localStorage.setItem(STORAGE_KEYS.budgets, JSON.stringify(state.budgets));
  } catch (e) {
    console.error("[FZ] saveBudgets:", e);
  }
}

function fmt(n) {
  return "$" + Number(n).toLocaleString("es-CO", { minimumFractionDigits: 0 });
}

function today() {
  return new Date().toISOString().split("T")[0];
}

function currentYM() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(ym) {
  const [y, m] = ym.split("-");
  return new Date(+y, +m - 1, 1).toLocaleString("es-CO", {
    month: "long",
    year: "numeric",
  });
}

function getCat(id) {
  return (
    CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1]
  );
}

function escapeHTML(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(d) {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function emptyState(msg) {
  return `<div class="empty-state"><div class="empty-icon"></div><p>${msg}</p></div>`;
}

function uniqueMonths() {
  const months = new Set(state.expenses.map((e) => e.date.slice(0, 7)));
  months.add(currentYM());
  return [...months].sort().reverse();
}

function getISOWeek(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() + 4 - day);
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const wk = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getFullYear()}-W${String(wk).padStart(2, "0")}`;
}

function weekLabel(wk) {
  const [y, w] = wk.split("-W");
  const jan1 = new Date(+y, 0, 1);
  const days = (parseInt(w, 10) - 1) * 7;
  const monday = new Date(jan1.getTime() + days * 86400000);
  const sunday = new Date(monday.getTime() + 6 * 86400000);
  const fmt2 = (d) => `${d.getDate()}/${d.getMonth() + 1}`;
  return `Sem. ${w} (${fmt2(monday)} - ${fmt2(sunday)} / ${y})`;
}

function uniqueWeeks() {
  const weeks = new Set(state.expenses.map((e) => getISOWeek(e.date)));
  weeks.add(getISOWeek(today()));
  return [...weeks].sort().reverse();
}

function expensesByPeriod(type, period) {
  if (type === "month")
    return state.expenses.filter((e) => e.date.startsWith(period));
  return state.expenses.filter((e) => getISOWeek(e.date) === period);
}

function spentByCategory(exps) {
  const map = {};
  exps.forEach((e) => {
    map[e.category] = (map[e.category] || 0) + Number(e.amount);
  });
  return map;
}

let toastTimer;
function showToast(msg, type = "success") {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.className = "toast";
  }, 3200);
}

let currentPage = "dashboard";

function navigateTo(page) {
  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.remove("active"));
  document
    .querySelectorAll(".nav-link")
    .forEach((l) => l.classList.remove("active"));
  const pageEl = document.getElementById(`page-${page}`);
  if (pageEl) pageEl.classList.add("active");
  const link = document.querySelector(`[data-page="${page}"]`);
  if (link) link.classList.add("active");
  currentPage = page;
  document.getElementById("sidebar").classList.remove("open");
  renderPage(page);
}

function renderPage(page) {
  switch (page) {
    case "dashboard":
      renderDashboard();
      break;
    case "gastos":
      renderExpenses();
      break;
    case "presupuesto":
      renderBudget();
      break;
    case "reportes":
      renderReports();
      break;
  }
}

function renderDashboard() {
  const ym = currentYM();
  document.getElementById("dashMonth").textContent = monthLabel(ym);

  const exps = state.expenses.filter((e) => e.date.startsWith(ym));
  const totalSpent = exps.reduce((a, e) => a + Number(e.amount), 0);
  const income = state.budgets.income || 0;
  const balance = income - totalSpent;

  document.getElementById("cardIncome").textContent = fmt(income);
  document.getElementById("cardSpent").textContent = fmt(totalSpent);

  const balEl = document.getElementById("cardBalance");
  balEl.textContent = fmt(balance);
  balEl.style.color = balance >= 0 ? "var(--success)" : "var(--danger)";

  const spent = spentByCategory(exps);
  const catBudgets = state.budgets.categories || {};
  const barsEl = document.getElementById("budgetBars");
  const rows = CATEGORIES.filter((c) => catBudgets[c.id] || spent[c.id]);

  if (!rows.length) {
    barsEl.innerHTML = emptyState(
      "Establece presupuestos en la sección Presupuesto.",
    );
    return;
  }

  barsEl.innerHTML = rows
    .map((c) => {
      const budget = catBudgets[c.id] || 0;
      const s = spent[c.id] || 0;
      const pct =
        budget > 0 ? Math.min((s / budget) * 100, 100) : s > 0 ? 100 : 0;
      return `
        <div class="budget-bar-row">
          <div class="budget-bar-header">
            <div class="budget-bar-cat">
              <span>${c.icon} ${c.label}</span>
            </div>
            <div class="budget-bar-vals">${fmt(s)} / ${budget > 0 ? fmt(budget) : "Sin límite"}</div>
          </div>
          <div class="bar-track">
            <div class="bar-fill" style="width:${pct}%; background:${c.color}"></div>
          </div>
        </div>`;
    })
    .join("");
}

function renderExpenses() {
  populateMonthSelect("filterMonth");
  populateCatSelect("filterCat", true);

  const ym = document.getElementById("filterMonth").value || currentYM();
  const cat = document.getElementById("filterCat").value || "";

  let exps = state.expenses.filter((e) => e.date.startsWith(ym));
  if (cat) exps = exps.filter((e) => e.category === cat);
  exps.sort((a, b) => b.date.localeCompare(a.date));

  document.getElementById("expenseList").innerHTML = exps.length
    ? exps.map(expenseHTML).join("")
    : emptyState("No hay gastos en este período.");
}

function expenseHTML(e) {
  const c = getCat(e.category);
  return `
    <div class="expense-item" data-id="${e.id}">
      <div class="expense-cat-icon" style="color:${c.color}">${c.icon}</div>
      <div class="expense-info">
        <div class="expense-desc">${escapeHTML(e.description)}</div>
        <div class="expense-meta">${c.label} · ${formatDate(e.date)}${e.note ? " · " + escapeHTML(e.note) : ""}</div>
      </div>
      <div class="expense-amount">-${fmt(e.amount)}</div>
      <div class="expense-actions">
        <button class="icon-btn" onclick="editExpense('${e.id}')" title="Editar">Editar</button>
        <button class="icon-btn del" onclick="deleteExpense('${e.id}')" title="Eliminar">Borrar</button>
      </div>
    </div>`;
}

function renderBudget() {
  const income = state.budgets.income || 0;
  document.getElementById("incomeInput").value = income || "";

  const catBudgets = state.budgets.categories || {};
  document.getElementById("catBudgetList").innerHTML = CATEGORIES.map(
    (c) => `
      <div class="cat-budget-item">
        <div class="cat-budget-icon" style="color:${c.color}">${c.icon}</div>
        <div class="cat-budget-name">${c.label}</div>
        <div class="cat-budget-input-row">
          <input type="number" class="text-input" id="budget_${c.id}" placeholder="Sin límite" min="0" value="${catBudgets[c.id] || ""}" />
          <button class="btn-primary btn-small" onclick="saveCatBudget('${c.id}')">Guardar</button>
        </div>
      </div>`,
  ).join("");
}

function saveCatBudget(catId) {
  const val = parseFloat(document.getElementById(`budget_${catId}`).value);
  if (isNaN(val) || val < 0) {
    showToast("Ingresa un valor válido.", "error");
    return;
  }
  if (!state.budgets.categories) state.budgets.categories = {};
  state.budgets.categories[catId] = val;
  saveBudgets();
  showToast(`Límite de ${getCat(catId).label} guardado.`);
}

let d3Loaded = false;
let currentReportType = "month";
let currentReportPeriod = "";

function loadD3(cb) {
  if (d3Loaded || window.d3) {
    d3Loaded = true;
    cb();
    return;
  }
  const s = document.createElement("script");
  s.src = "https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js";
  s.onload = () => {
    d3Loaded = true;
    cb();
  };
  s.onerror = () => showToast("No se pudo cargar D3.js.", "error");
  document.head.appendChild(s);
}

function renderReports() {
  currentReportType =
    document.getElementById("reportPeriodType").value || "month";
  populatePeriodSelect(currentReportType);
  currentReportPeriod = document.getElementById("reportPeriod").value;
  loadD3(() => {
    drawCharts(currentReportType, currentReportPeriod);
    renderSummary(currentReportType, currentReportPeriod);
  });
}

function populatePeriodSelect(type) {
  const sel = document.getElementById("reportPeriod");
  const prev = sel.value;
  sel.innerHTML = "";
  const items = type === "month" ? uniqueMonths() : uniqueWeeks();
  items.forEach((v) => {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = type === "month" ? monthLabel(v) : weekLabel(v);
    sel.appendChild(opt);
  });
  if (prev && items.includes(prev)) sel.value = prev;
  else if (items.length) sel.value = items[0];
}

function drawPie(exps, containerId) {
  const el = document.getElementById(containerId);
  el.innerHTML = "";

  const spent = spentByCategory(exps);
  const data = CATEGORIES.filter((c) => spent[c.id]).map((c) => ({
    id: c.id,
    label: c.label,
    icon: c.icon,
    color: c.color,
    value: spent[c.id],
  }));

  if (!data.length) {
    el.innerHTML = emptyState("Sin gastos en este período.");
    return;
  }

  const W = el.clientWidth || 480;
  const mobile = W < 640;
  const pieR = Math.min(W * (mobile ? 0.24 : 0.18), 98);
  const cx = pieR + 24;
  const cy = pieR + 24;
  const H = pieR * 2 + 48;
  const legendX = mobile ? 16 : cx * 2 + 24;
  const legendY = mobile ? H + 6 : 16;
  const legendW = mobile ? W - 32 : Math.max(W - legendX - 12, 160);
  const totalW = mobile ? W : legendX + legendW;
  const totalH = mobile
    ? H + data.length * 24 + 24
    : Math.max(H, data.length * 24 + 28);

  const svg = d3
    .select(el)
    .append("svg")
    .attr("width", "100%")
    .attr("viewBox", `0 0 ${totalW} ${totalH}`)
    .attr("aria-label", "Distribución por categoría");

  const pie = d3
    .pie()
    .value((d) => d.value)
    .sort(null);
  const arc = d3
    .arc()
    .innerRadius(pieR * 0.58)
    .outerRadius(pieR);
  const centerX = mobile ? W / 2 : cx;
  const arcs = svg.append("g").attr("transform", `translate(${centerX},${cy})`);

  arcs
    .selectAll("path")
    .data(pie(data))
    .enter()
    .append("path")
    .attr("class", "d3-bar")
    .attr("d", arc)
    .attr("fill", (d) => d.data.color)
    .attr("stroke", "#fffaf7")
    .attr("stroke-width", 3)
    .append("title")
    .text((d) => `${d.data.label}: ${fmt(d.data.value)}`);

  const total = data.reduce((a, d) => a + d.value, 0);
  arcs
    .append("text")
    .attr("text-anchor", "middle")
    .attr("dy", "-0.15em")
    .style("font-size", "11px")
    .style("fill", "#9c8d84")
    .text("Total");

  arcs
    .append("text")
    .attr("text-anchor", "middle")
    .attr("dy", "1.2em")
    .style("font-size", "13px")
    .style("font-weight", "700")
    .style("fill", "#2f241f")
    .text(fmt(total));

  const legend = svg
    .append("g")
    .attr("transform", `translate(${legendX}, ${legendY})`);
  data.forEach((d, i) => {
    const row = legend
      .append("g")
      .attr("class", "d3-legend")
      .attr("transform", `translate(0, ${i * 24})`);
    row
      .append("rect")
      .attr("width", 12)
      .attr("height", 12)
      .attr("rx", 4)
      .attr("fill", d.color);
    row
      .append("text")
      .attr("x", 18)
      .attr("y", 10)
      .style("font-size", "11px")
      .style("fill", "#6f625a")
      .text(
        `${d.icon} ${d.label} - ${fmt(d.value)} (${((d.value / total) * 100).toFixed(1)}%)`,
      );
  });
}

function drawBar(exps, containerId) {
  const el = document.getElementById(containerId);
  el.innerHTML = "";

  const catBudgets = state.budgets.categories || {};
  const spent = spentByCategory(exps);
  const data = CATEGORIES.filter((c) => catBudgets[c.id] || spent[c.id]).map(
    (c) => ({
      id: c.id,
      label: c.label,
      icon: c.icon,
      color: c.color,
      budget: catBudgets[c.id] || 0,
      spent: spent[c.id] || 0,
    }),
  );

  if (!data.length) {
    el.innerHTML = emptyState(
      "Sin datos de presupuesto o gastos en este período.",
    );
    return;
  }

  const margin = { top: 8, right: 12, bottom: 58, left: 68 };
  const W = el.clientWidth || 480;
  const IW = Math.max(W - margin.left - margin.right, 200);
  const IH = 145;

  const svg = d3
    .select(el)
    .append("svg")
    .attr("width", "100%")
    .attr(
      "viewBox",
      `0 0 ${IW + margin.left + margin.right} ${IH + margin.top + margin.bottom}`,
    )
    .attr("aria-label", "Presupuesto vs Gasto");

  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);
  const x0 = d3
    .scaleBand()
    .domain(data.map((d) => d.id))
    .range([0, IW])
    .padding(0.28);
  const x1 = d3
    .scaleBand()
    .domain(["budget", "spent"])
    .range([0, x0.bandwidth()])
    .padding(0.1);
  const maxVal = d3.max(data, (d) => Math.max(d.budget, d.spent)) || 1;
  const y = d3
    .scaleLinear()
    .domain([0, maxVal * 1.12])
    .nice()
    .range([IH, 0]);

  g.append("g")
    .attr("class", "d3-grid")
    .call(d3.axisLeft(y).tickSize(-IW).tickFormat("").ticks(5))
    .select(".domain")
    .remove();

  g.append("g")
    .attr("class", "d3-axis")
    .attr("transform", `translate(0,${IH})`)
    .call(
      d3.axisBottom(x0).tickFormat((id) => {
        const c = getCat(id);
        return `${c.icon} ${c.label}`;
      }),
    )
    .selectAll("text")
    .attr("transform", "rotate(-28)")
    .style("text-anchor", "end")
    .style("font-size", "10px");

  g.append("g")
    .attr("class", "d3-axis")
    .call(
      d3
        .axisLeft(y)
        .ticks(5)
        .tickFormat((v) => "$" + d3.format(",.0f")(v)),
    );

  const barGroups = g
    .selectAll(".bar-group")
    .data(data)
    .enter()
    .append("g")
    .attr("transform", (d) => `translate(${x0(d.id)},0)`);

  barGroups
    .append("rect")
    .attr("class", "d3-bar")
    .attr("x", x1("budget"))
    .attr("y", (d) => y(d.budget))
    .attr("width", x1.bandwidth())
    .attr("height", (d) => IH - y(d.budget))
    .attr("fill", "#eadfd7")
    .attr("rx", 6)
    .append("title")
    .text((d) => `Presupuesto ${d.label}: ${fmt(d.budget)}`);

  barGroups
    .append("rect")
    .attr("class", "d3-bar")
    .attr("x", x1("spent"))
    .attr("y", (d) => y(d.spent))
    .attr("width", x1.bandwidth())
    .attr("height", (d) => IH - y(d.spent))
    .attr("fill", (d) => d.color)
    .attr("rx", 6)
    .append("title")
    .text((d) => `Gasto ${d.label}: ${fmt(d.spent)}`);

  const legendY = IH + margin.bottom - 18;
  [
    { label: "Presupuesto", color: "#eadfd7" },
    { label: "Gasto real", color: "#d8b4a0" },
  ].forEach((l, i) => {
    const lx = i * 128;
    svg
      .append("rect")
      .attr("x", margin.left + lx)
      .attr("y", legendY)
      .attr("width", 12)
      .attr("height", 12)
      .attr("rx", 4)
      .attr("fill", l.color);
    svg
      .append("text")
      .attr("x", margin.left + lx + 18)
      .attr("y", legendY + 10)
      .style("font-size", "11px")
      .style("fill", "#6f625a")
      .text(l.label);
  });
}

function drawCharts(type, period) {
  const exps = expensesByPeriod(type, period);
  drawPie(exps, "pieChart");
  drawBar(exps, "barChart");
}

function renderSummary(type, period) {
  const exps = expensesByPeriod(type, period);
  const total = exps.reduce((a, e) => a + Number(e.amount), 0);
  const income = state.budgets.income || 0;
  const spent = spentByCategory(exps);

  const cats = CATEGORIES.filter((c) => spent[c.id]);
  const rows = cats
    .map(
      (c) => `
    <div class="summary-row">
      <span class="summary-row-label">${c.icon} ${c.label}</span>
      <span class="summary-row-val" style="color:${c.color}">-${fmt(spent[c.id])}</span>
    </div>`,
    )
    .join("");

  document.getElementById("monthlySummary").innerHTML = `
    ${rows}
    <div class="summary-row" style="background:rgba(244, 235, 229, 0.55)">
      <span class="summary-row-label" style="font-weight:700">Total gastado</span>
      <span class="summary-row-val" style="color:var(--danger)">-${fmt(total)}</span>
    </div>
    ${
      income
        ? `
    <div class="summary-row">
      <span class="summary-row-label" style="font-weight:700">Balance</span>
      <span class="summary-row-val" style="color:${income - total >= 0 ? "var(--success)" : "var(--danger)"}">${fmt(income - total)}</span>
    </div>`
        : ""
    }`;
}

function exportPDF() {
  const type = currentReportType;
  const period = currentReportPeriod;
  const label = type === "month" ? monthLabel(period) : weekLabel(period);
  const pieSVG = document.getElementById("pieChart").querySelector("svg");
  const barSVG = document.getElementById("barChart").querySelector("svg");

  if (!pieSVG || !barSVG) {
    showToast("Genera los gráficos antes de exportar.", "error");
    return;
  }

  const exps = expensesByPeriod(type, period);
  const total = exps.reduce((a, e) => a + Number(e.amount), 0);
  const income = state.budgets.income || 0;
  const spent = spentByCategory(exps);
  const cats = CATEGORIES.filter((c) => spent[c.id]);
  const ser = new XMLSerializer();
  const pieSVGStr = ser.serializeToString(pieSVG);
  const barSVGStr = ser.serializeToString(barSVG);
  const tableRows = cats
    .map(
      (c) =>
        `<tr><td>${c.icon} ${c.label}</td><td style="text-align:right;color:${c.color};font-weight:600">-${fmt(spent[c.id])}</td></tr>`,
    )
    .join("");
  const balColor =
    income > 0 ? (income - total >= 0 ? "#73a68b" : "#d36c6c") : "#9c8d84";
  const win = window.open("", "_blank", "width=900,height=700");

  win.document
    .write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/><title>FinanZapp - Reporte ${label}</title><style>
  @import url("https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Outfit:wght@600;700&display=swap");
  *{box-sizing:border-box;margin:0;padding:0} body{font-family:"Manrope",sans-serif;background:#fffaf7;color:#2f241f;padding:36px 40px}
  .header{display:flex;align-items:center;gap:12px;margin-bottom:28px;padding-bottom:16px;border-bottom:1px solid #eadfd7}
  .badge{width:40px;height:40px;border-radius:14px;display:grid;place-items:center;background:#f7e7dd;color:#c68d72;font-family:"Outfit",sans-serif;font-weight:700}
  .brand{font-family:"Outfit",sans-serif;font-size:1.35rem;font-weight:700}.brand span{color:#c68d72}.period{margin-left:auto;color:#6f625a;font-size:.84rem}
  .cards{display:flex;gap:14px;margin-bottom:18px}.card{flex:1;background:#fff;border:1px solid #eadfd7;border-radius:18px;padding:16px}
  .card-label{font-size:.72rem;color:#9c8d84;text-transform:uppercase;letter-spacing:.08em;font-weight:700;margin-bottom:8px}
  .card-val{font-family:"Outfit",sans-serif;font-size:1.3rem;font-weight:700} h2{font-family:"Outfit",sans-serif;font-size:1rem;margin:22px 0 12px;color:#6f625a}
  .chart-wrap{background:#fff;border:1px solid #eadfd7;border-radius:18px;padding:18px;margin-bottom:14px}.chart-wrap svg{width:100%;height:auto}
  table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #eadfd7;border-radius:18px;overflow:hidden}
  th{text-align:left;background:#f8f2ed;color:#6f625a;font-size:.74rem;letter-spacing:.08em;text-transform:uppercase;padding:12px 14px}
  td{padding:12px 14px;border-top:1px solid #f4ebe5;font-size:.9rem}.total-row td{background:#fff7f2;font-weight:700}.bal-row td{font-weight:700}.footer{margin-top:22px;text-align:center;color:#9c8d84;font-size:.75rem}
  @media print{body{padding:20px 24px}}
  </style></head><body>
  <div class="header"><div class="badge">FZ</div><div class="brand">Finan<span>Zapp</span></div><div class="period">Reporte: ${label}</div></div>
  <div class="cards">
    ${income ? `<div class="card"><div class="card-label">Ingresos</div><div class="card-val" style="color:#73a68b">${fmt(income)}</div></div>` : ""}
    <div class="card"><div class="card-label">Total gastado</div><div class="card-val" style="color:#d36c6c">-${fmt(total)}</div></div>
    ${income ? `<div class="card"><div class="card-label">Balance</div><div class="card-val" style="color:${balColor}">${fmt(income - total)}</div></div>` : ""}
  </div>
  <h2>Distribución por categoría</h2><div class="chart-wrap">${pieSVGStr}</div>
  <h2>Presupuesto vs Gasto real</h2><div class="chart-wrap">${barSVGStr}</div>
  <h2>Detalle por categoría</h2><table><thead><tr><th>Categoría</th><th style="text-align:right">Monto gastado</th></tr></thead><tbody>
  ${tableRows}
  <tr class="total-row"><td>Total</td><td style="text-align:right;color:#d36c6c">-${fmt(total)}</td></tr>
  ${income ? `<tr class="bal-row"><td>Balance</td><td style="text-align:right;color:${balColor}">${fmt(income - total)}</td></tr>` : ""}
  </tbody></table><div class="footer">Generado por FinanZapp · ${new Date().toLocaleDateString("es-CO", { dateStyle: "long" })}</div>
  <script>window.onload=()=>{window.focus();window.print();};<\/script></body></html>`);
  win.document.close();
}

function openModal(id = null) {
  state.editingId = id;
  document.getElementById("expenseForm").reset();
  clearErrors();
  document.getElementById("modalTitle").textContent = id
    ? "Editar gasto"
    : "Nuevo gasto";
  if (id) {
    const expense = state.expenses.find((x) => x.id === id);
    if (expense) {
      document.getElementById("expDesc").value = expense.description;
      document.getElementById("expAmount").value = expense.amount;
      document.getElementById("expCat").value = expense.category;
      document.getElementById("expDate").value = expense.date;
      document.getElementById("expNote").value = expense.note || "";
    }
  } else {
    document.getElementById("expDate").value = today();
  }
  document.getElementById("modalOverlay").classList.add("open");
  document.getElementById("expDesc").focus();
}

function closeModal() {
  document.getElementById("modalOverlay").classList.remove("open");
  state.editingId = null;
}

function clearErrors() {
  ["errDesc", "errAmount", "errCat", "errDate"].forEach((id) => {
    document.getElementById(id).textContent = "";
  });
}

function validateForm() {
  let ok = true;
  clearErrors();
  const desc = document.getElementById("expDesc").value.trim();
  const amount = document.getElementById("expAmount").value;
  const cat = document.getElementById("expCat").value;
  const date = document.getElementById("expDate").value;

  if (!desc) {
    document.getElementById("errDesc").textContent =
      "La descripción es requerida.";
    ok = false;
  }
  if (!amount || isNaN(amount) || +amount <= 0) {
    document.getElementById("errAmount").textContent =
      "Ingresa un monto mayor a 0.";
    ok = false;
  }
  if (!cat) {
    document.getElementById("errCat").textContent = "Selecciona una categoría.";
    ok = false;
  }
  if (!date) {
    document.getElementById("errDate").textContent = "La fecha es requerida.";
    ok = false;
  }
  return ok;
}

function checkBudgetLimits(newExpense) {
  const ym = newExpense.date.slice(0, 7);
  const amount = Number(newExpense.amount);
  const monthExps = state.expenses.filter(
    (e) => e.date.startsWith(ym) && e.id !== newExpense.id,
  );

  const catBudget = (state.budgets.categories || {})[newExpense.category];
  if (catBudget > 0) {
    const catSpent = monthExps
      .filter((e) => e.category === newExpense.category)
      .reduce((a, e) => a + Number(e.amount), 0);
    if (catSpent + amount > catBudget) {
      const catLabel = getCat(newExpense.category).label;
      const available = Math.max(0, catBudget - catSpent);
      return {
        ok: false,
        msg:
          `Límite de categoría superado\n\n` +
          `"${catLabel}" tiene un límite de ${fmt(catBudget)}.\n` +
          `Llevas gastado ${fmt(catSpent)} y te quedan ${fmt(available)} disponibles.\n\n` +
          `El gasto de ${fmt(amount)} supera ese límite.`,
      };
    }
  }

  const income = state.budgets.income || 0;
  if (income > 0) {
    const totalSpent = monthExps.reduce((a, e) => a + Number(e.amount), 0);
    if (totalSpent + amount > income) {
      const available = Math.max(0, income - totalSpent);
      return {
        ok: false,
        msg:
          `Presupuesto general superado\n\n` +
          `Tu ingreso mensual es ${fmt(income)}.\n` +
          `Llevas gastado ${fmt(totalSpent)} y te quedan ${fmt(available)} disponibles.\n\n` +
          `El gasto de ${fmt(amount)} supera tu presupuesto.`,
      };
    }
  }
  return { ok: true };
}

function handleExpenseSubmit(e) {
  e.preventDefault();
  if (!validateForm()) return;

  const expense = {
    id:
      state.editingId ||
      `fz_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    description: document.getElementById("expDesc").value.trim(),
    amount: parseFloat(document.getElementById("expAmount").value),
    category: document.getElementById("expCat").value,
    date: document.getElementById("expDate").value,
    note: document.getElementById("expNote").value.trim(),
    createdAt: state.editingId
      ? state.expenses.find((x) => x.id === state.editingId)?.createdAt ||
        Date.now()
      : Date.now(),
  };

  const check = checkBudgetLimits(expense);
  if (!check.ok) {
    showBudgetAlert(check.msg);
    return;
  }

  if (state.editingId) {
    const idx = state.expenses.findIndex((x) => x.id === state.editingId);
    if (idx !== -1) state.expenses[idx] = expense;
    showToast("Gasto actualizado.");
  } else {
    state.expenses.push(expense);
    showToast("Gasto registrado.");
  }

  saveExpenses();
  closeModal();
  renderPage(currentPage);
}

function showBudgetAlert(msg) {
  let overlay = document.getElementById("budgetAlertOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "budgetAlertOverlay";
    overlay.innerHTML = `
      <div class="budget-alert-box">
        <div class="budget-alert-icon">!</div>
        <div class="budget-alert-title">Gasto no permitido</div>
        <div class="budget-alert-msg" id="budgetAlertMsg"></div>
        <button class="btn-primary" id="budgetAlertClose">Entendido</button>
      </div>`;
    document.body.appendChild(overlay);
    document
      .getElementById("budgetAlertClose")
      .addEventListener("click", () => {
        overlay.classList.remove("open");
      });
    overlay.addEventListener("click", (ev) => {
      if (ev.target === overlay) overlay.classList.remove("open");
    });
  }

  document.getElementById("budgetAlertMsg").innerHTML = msg
    .split("\n")
    .map((l) => (l ? `<span>${escapeHTML(l)}</span>` : "<br>"))
    .join("");
  overlay.classList.add("open");
}

function editExpense(id) {
  openModal(id);
}

function deleteExpense(id) {
  if (!confirm("¿Eliminar este gasto?")) return;
  state.expenses = state.expenses.filter((e) => e.id !== id);
  saveExpenses();
  renderPage(currentPage);
  showToast("Gasto eliminado.", "error");
}

function populateCatSelect(selectId, withAll = false) {
  const sel = document.getElementById(selectId);
  const cur = sel.value;
  sel.innerHTML = withAll
    ? '<option value="">Todas las categorías</option>'
    : '<option value="">Seleccionar</option>';
  CATEGORIES.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = `${c.icon} ${c.label}`;
    sel.appendChild(opt);
  });
  if (cur) sel.value = cur;
}

function populateMonthSelect(selectId) {
  const sel = document.getElementById(selectId);
  const cur = sel.value || currentYM();
  sel.innerHTML = "";
  uniqueMonths().forEach((ym) => {
    const opt = document.createElement("option");
    opt.value = ym;
    opt.textContent = monthLabel(ym);
    sel.appendChild(opt);
  });
  sel.value = cur;
}

function handleConnectionChange() {
  const badge = document.getElementById("offlineBadge");
  if (navigator.onLine) {
    badge.style.display = "none";
    showToast("Conexión restablecida.");
  } else {
    badge.style.display = "inline-flex";
    showToast("Sin conexión. Modo offline activo.", "error");
  }
}

function init() {
  loadState();
  populateCatSelect("expCat");

  document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      navigateTo(link.dataset.page);
    });
  });

  document.getElementById("menuBtn").addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("open");
  });
  document
    .getElementById("addBtnMobile")
    .addEventListener("click", () => openModal());
  document
    .getElementById("addExpenseBtn")
    .addEventListener("click", () => openModal());

  document.getElementById("closeModal").addEventListener("click", closeModal);
  document.getElementById("cancelModal").addEventListener("click", closeModal);
  document
    .getElementById("expenseForm")
    .addEventListener("submit", handleExpenseSubmit);
  document.getElementById("modalOverlay").addEventListener("click", (e) => {
    if (e.target === document.getElementById("modalOverlay")) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  document.getElementById("saveIncomeBtn").addEventListener("click", () => {
    const val = parseFloat(document.getElementById("incomeInput").value);
    if (isNaN(val) || val < 0) {
      showToast("Ingresa un ingreso válido.", "error");
      return;
    }
    state.budgets.income = val;
    saveBudgets();
    showToast("Ingreso mensual guardado.");
  });

  document
    .getElementById("filterMonth")
    .addEventListener("change", renderExpenses);
  document
    .getElementById("filterCat")
    .addEventListener("change", renderExpenses);

  document.getElementById("reportPeriodType").addEventListener("change", () => {
    currentReportType = document.getElementById("reportPeriodType").value;
    populatePeriodSelect(currentReportType);
    currentReportPeriod = document.getElementById("reportPeriod").value;
    loadD3(() => {
      drawCharts(currentReportType, currentReportPeriod);
      renderSummary(currentReportType, currentReportPeriod);
    });
  });

  document.getElementById("reportPeriod").addEventListener("change", () => {
    currentReportPeriod = document.getElementById("reportPeriod").value;
    loadD3(() => {
      drawCharts(currentReportType, currentReportPeriod);
      renderSummary(currentReportType, currentReportPeriod);
    });
  });

  document.getElementById("exportPdfBtn").addEventListener("click", exportPDF);

  window.addEventListener("online", handleConnectionChange);
  window.addEventListener("offline", handleConnectionChange);
  if (!navigator.onLine) handleConnectionChange();

  navigateTo("dashboard");
}

document.addEventListener("DOMContentLoaded", init);
