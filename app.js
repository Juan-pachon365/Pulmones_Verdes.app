// --------- Helpers ----------
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const pad = (n) => n.toString().padStart(2, "0");
const fmtCOP = (n) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n || 0);
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

// --------- State ----------
const state = {
  profile: JSON.parse(localStorage.getItem("rl_profile") || "null"),
  records: JSON.parse(localStorage.getItem("rl_records") || "{}"), // { 'YYYY-MM': { 'YYYY-MM-DD': {cigs, cost} } }
  monthCursor: (() => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth()+1)}`; })(),
  favTips: JSON.parse(localStorage.getItem("rl_favtips") || "[]"),
};

// --------- Init ----------
document.addEventListener("DOMContentLoaded", () => {
  bindNav();
  bindProfile();
  bindCalendar();
  bindDayModal();
  bindTips();
  renderAll();
});

// --------- Navigation buttons (scroll to sections) ----------
function bindNav(){
  $$(".top-nav .btn").forEach(b=>{
    b.addEventListener("click", ()=>{
      const sel = b.getAttribute("data-goto");
      const el = document.querySelector(sel);
      if(el) el.scrollIntoView({behavior:"smooth", block:"start"});
    });
  });
}

// --------- Profile ----------
function bindProfile(){
  // Preload values
  const p = state.profile || {};
  $("#name").value = p.name || "";
  $("#age").value = p.age || "";
  $("#startAge").value = p.startAge || "";
  $("#why").value = p.why || "";
  // price mode
  const priceMode = p.priceMode || "perCig";
  $$('input[name="priceMode"]').forEach(r => r.checked = (r.value === priceMode));
  togglePriceInputs(priceMode);
  $("#pricePerCig").value = p.pricePerCig ?? "";
  $("#pricePerPack").value = p.pricePerPack ?? "";
  $("#packSize").value = p.packSize ?? 20;

  // toggle inputs
  $$('input[name="priceMode"]').forEach(r => {
    r.addEventListener("change", () => togglePriceInputs(r.value));
  });

  $("#profileForm").addEventListener("submit", (e)=>{
    e.preventDefault();
    const priceModeSel = $$('input[name="priceMode"]').find(r=>r.checked)?.value || "perCig";
    const profile = {
      name: $("#name").value.trim(),
      age: +$("#age").value,
      startAge: +$("#startAge").value,
      why: $("#why").value.trim(),
      priceMode: priceModeSel,
      pricePerCig: +$("#pricePerCig").value || null,
      pricePerPack: +$("#pricePerPack").value || null,
      packSize: +$("#packSize").value || 20,
    };
    if(!profile.name || !profile.age || !profile.startAge || !profile.why){
      alert("Completa todos los campos del perfil."); return;
    }
    if(profile.startAge > profile.age){
      alert("La edad de inicio no puede ser mayor que tu edad actual."); return;
    }
    state.profile = profile;
    localStorage.setItem("rl_profile", JSON.stringify(profile));
    renderAll();
  });

  $("#resetBtn").addEventListener("click", ()=>{
    if(confirm("Esto borrará todos tus datos guardados en este dispositivo. ¿Continuar?")){
      localStorage.removeItem("rl_profile");
      localStorage.removeItem("rl_records");
      localStorage.removeItem("rl_favtips");
      location.reload();
    }
  });
}

function togglePriceInputs(mode){
  $("#perCigWrap").classList.toggle("hidden", mode !== "perCig");
  $("#perPackWrap").classList.toggle("hidden", mode !== "perPack");
  $("#packSizeWrap").classList.toggle("hidden", mode !== "perPack");
}

function pricePerCig(){
  const p = state.profile;
  if(!p) return 0;
  if(p.priceMode === "perCig"){
    return +p.pricePerCig || 0;
  } else {
    const size = (+p.packSize || 20);
    const pack = (+p.pricePerPack || 0);
    return size ? Math.round(pack / size) : 0;
  }
}

// --------- KPI header ----------
function renderKpis(){
  $("#kpiUser").textContent = state.profile?.name || "—";
  const mm = state.monthCursor;
  const mRec = state.records[mm] || {};
  const totals = Object.values(mRec).reduce((a, r) => {
    a.cigs += (+r.cigs||0);
    a.cost += (+r.cost||0);
    return a;
  }, {cigs:0, cost:0});
  $("#kpiMonthCigs").textContent = totals.cigs;
  $("#kpiMonthSpend").textContent = fmtCOP(totals.cost);
}

// --------- Calendar ----------
function bindCalendar(){
  $("#prevMonth").addEventListener("click", ()=> shiftMonth(-1));
  $("#nextMonth").addEventListener("click", ()=> shiftMonth(1));
  renderCalendar();
}
function shiftMonth(delta){
  const [y,m] = state.monthCursor.split("-").map(n=>+n);
  const d = new Date(y, m-1+delta, 1);
  state.monthCursor = `${d.getFullYear()}-${pad(d.getMonth()+1)}`;
  renderCalendar();
  renderSummary();
  renderKpis();
}
function renderCalendar(){
  const container = $("#calendarDays");
  container.innerHTML = "";
  const [Y,M] = state.monthCursor.split("-").map(n=>+n);
  const first = new Date(Y, M-1, 1);
  const last = new Date(Y, M, 0);
  const startOffset = (first.getDay() + 6) % 7; // Mon=0
  $("#monthLabel").textContent = first.toLocaleString("es-ES", { month:"long", year:"numeric" });

  for(let i=0;i<startOffset;i++){
    const empty = document.createElement("div");
    container.appendChild(empty);
  }
  for(let d=1; d<=last.getDate(); d++){
    const date = new Date(Y, M-1, d);
    const key = ymd(date);
    const mm = `${Y}-${pad(M)}`;
    const rec = (state.records[mm] || {})[key];
    const cell = document.createElement("button");
    cell.className = "cell";
    if(ymd(new Date()) === key) cell.classList.add("today");
    if(rec){ cell.classList.add("has"); if(rec.cigs > 20) cell.classList.add("bad"); }
    cell.innerHTML = `<div class="d">${d}</div><div class="v">${rec? `${rec.cigs} cig` : ""}</div>`;
    cell.addEventListener("click", ()=> openDayDialog(key));
    container.appendChild(cell);
  }
}

// --------- Day dialog ----------
function bindDayModal(){
  const dlg = $("#dayDialog");
  $("#saveDayBtn").addEventListener("click", (e)=>{
    e.preventDefault();
    const key = dlg.dataset.date;
    const mm = state.monthCursor;
    const cigs = +$("#dayCigs").value || 0;
    const cost = +$("#dayCost").value || 0;
    if(!state.records[mm]) state.records[mm] = {};
    state.records[mm][key] = { cigs, cost };
    localStorage.setItem("rl_records", JSON.stringify(state.records));
    dlg.close();
    renderCalendar();
    renderSummary();
    renderKpis();
  });
}

function openDayDialog(dateKey){
  const dlg = $("#dayDialog");
  const mm = state.monthCursor;
  const rec = (state.records[mm] || {})[dateKey] || {};
  const ppc = pricePerCig();

  $("#dayTitle").textContent = `Registro del ${dateKey}`;
  $("#dayCigs").value = rec.cigs ?? 0;
  $("#dayCost").value = rec.cost ?? (ppc * (rec.cigs ?? 0));
  $("#whyInline").textContent = state.profile?.why || "";
  $("#alertText").classList.toggle("hidden", !(rec.cigs > 20));

  // Auto-cost update when cigs changes
  $("#dayCigs").oninput = () => {
    const c = +$("#dayCigs").value || 0;
    $("#dayCost").value = Math.max(0, Math.round(c * pricePerCig()));
    $("#alertText").classList.toggle("hidden", !(c > 20));
  };

  dlg.dataset.date = dateKey;
  dlg.showModal();
}

// --------- Tips / favorites ----------
function bindTips(){
  $("#tips").addEventListener("click", (e)=>{
    if(!e.target.classList.contains("chip")) return;
    const tip = e.target.textContent.trim();
    if(!state.favTips.includes(tip)){
      state.favTips.push(tip);
    } else {
      state.favTips = state.favTips.filter(t => t !== tip);
    }
    localStorage.setItem("rl_favtips", JSON.stringify(state.favTips));
    renderFavTips();
  });
  renderFavTips();
}

function renderFavTips(){
  const f = $("#favTips");
  f.innerHTML = "";
  state.favTips.forEach(t=>{
    const btn = document.createElement("button");
    btn.className = "chip";
    btn.textContent = t + " ✕";
    btn.addEventListener("click", ()=>{
      state.favTips = state.favTips.filter(x=>x!==t);
      localStorage.setItem("rl_favtips", JSON.stringify(state.favTips));
      renderFavTips();
    });
    f.appendChild(btn);
  });
}

// --------- Summary ----------
const QUOTES = [
  "Cada minuto sin fumar es una victoria.",
  "Tu futuro vale más que un cigarrillo.",
  "Respira: el antojo sube y baja como una ola.",
  "Hoy eliges salud, mañana cosechas vida.",
  "Eres más fuerte que la nicotina."
];

function renderSummary(){
  const mm = state.monthCursor;
  const recs = state.records[mm] || {};
  let cigs=0, cost=0, days=0;
  Object.values(recs).forEach(r=>{
    cigs += (+r.cigs||0);
    cost += (+r.cost||0);
    if(r.cigs || r.cost) days++;
  });
  $("#sumCigs").textContent = cigs;
  $("#sumMoney").textContent = fmtCOP(cost);
  $("#sumDays").textContent = days;
  $("#motivationQuote").textContent = "“" + QUOTES[Math.floor(Math.random()*QUOTES.length)] + "”";

  // What-if list
  const ideas = makeWhatIf(cost);
  const ul = $("#whatIfList");
  ul.innerHTML = "";
  ideas.forEach(t=>{
    const li = document.createElement("li");
    li.textContent = t;
    ul.appendChild(li);
  });
}

function makeWhatIf(amount){
  const list = [];
  if(amount >= 20000) list.push("Una cena especial 🍽️");
  if(amount >= 50000) list.push("Ropa deportiva nueva 👟");
  if(amount >= 100000) list.push("Un mes de gimnasio 🏋️");
  if(amount >= 200000) list.push("Auriculares o parlante 🎧");
  if(amount >= 400000) list.push("Un curso online 🎓");
  if(amount >= 800000) list.push("Un fin de semana de viaje ✈️");
  if(list.length === 0) list.push("Ahorro para algo que te motive 💚");
  return list;
}

// --------- Render all ----------
function renderAll(){
  renderKpis();
  renderCalendar();
  renderSummary();
}
