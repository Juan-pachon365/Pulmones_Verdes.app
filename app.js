const registerForm = document.getElementById("registerForm");
const registerSection = document.getElementById("registerSection");
const welcomeSection = document.getElementById("welcomeSection");
const estrategiasSection = document.getElementById("estrategiasSection");
const calendarSection = document.getElementById("calendarSection");
const summarySection = document.getElementById("summarySection");

const userNameSpan = document.getElementById("userName");
const userMotivoSpan = document.getElementById("userMotivo");

const calendarDiv = document.getElementById("calendar");
const dayFormContainer = document.getElementById("dayFormContainer");
const selectedDateH3 = document.getElementById("selectedDate");
const cigsTodayInput = document.getElementById("cigsToday");
const costTodayInput = document.getElementById("costToday");
const alertMsg = document.getElementById("alertMsg");
const dayForm = document.getElementById("dayForm");

const totalCigsSpan = document.getElementById("totalCigs");
const totalMoneySpan = document.getElementById("totalMoney");
const motivationalPhrase = document.getElementById("motivationalPhrase");

let user = JSON.parse(localStorage.getItem("user")) || null;
let records = JSON.parse(localStorage.getItem("records")) || {}; // { 'YYYY-MM-DD': {cigs, cost} }

const phrases = [
  "Con ese dinero podrías comprar una bicicleta 🚲",
  "Podrías ahorrar para un viaje ✈️",
  "Podrías darte un regalo 🎁",
  "Podrías invertir en tu salud 🧘",
];

// -------- Registro inicial --------
registerForm.addEventListener("submit",(e)=>{
  e.preventDefault();
  user = {
    name: document.getElementById("name").value,
    age: document.getElementById("age").value,
    startAge: document.getElementById("startAge").value,
    motivo: document.getElementById("motivo").value
  };
  localStorage.setItem("user", JSON.stringify(user));
  mostrarApp();
});

function mostrarApp(){
  if(!user) return;
  registerSection.style.display="none";
  welcomeSection.style.display="block";
  estrategiasSection.style.display="block";
  calendarSection.style.display="block";
  summarySection.style.display="block";

  userNameSpan.textContent=user.name;
  userMotivoSpan.textContent=user.motivo;
  dibujarCalendario();
  actualizarResumen();
}
if(user) mostrarApp();

// -------- Calendario --------
function dibujarCalendario(){
  calendarDiv.innerHTML="";
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstDay = new Date(year,month,1);
  const lastDay = new Date(year,month+1,0);
  const daysInMonth = lastDay.getDate();

  for(let i=1;i<=daysInMonth;i++){
    const dateStr = `${year}-${String(month+1).padStart(2,"0")}-${String(i).padStart(2,"0")}`;
    const div = document.createElement("div");
    div.className="day";
    if(dateStr===today.toISOString().slice(0,10)) div.classList.add("today");
    if(records[dateStr]) div.classList.add("hasData");
    div.textContent=i;
    div.onclick=()=>abrirDia(dateStr);
    calendarDiv.appendChild(div);
  }
}

function abrirDia(dateStr){
  selectedDateH3.textContent="Día "+dateStr;
  dayFormContainer.style.display="block";
  cigsTodayInput.value=records[dateStr]?.cigs||0;
  costTodayInput.value=records[dateStr]?.cost||0;
  alertMsg.textContent="";
  dayForm.onsubmit=(e)=>{
    e.preventDefault();
    const cigs=+cigsTodayInput.value;
    const cost=+costTodayInput.value;
    records[dateStr]={cigs,cost};
    localStorage.setItem("records",JSON.stringify(records));
    if(cigs>20){ // fumador compulsivo
      alertMsg.textContent="⚠️ Atención: superaste el consumo promedio de un fumador compulsivo.";
      setTimeout(()=>alert("Recuerda tu motivo: "+user.motivo),500);
    }
    dibujarCalendario();
    actualizarResumen();
  };
}

// -------- Resumen mensual --------
function actualizarResumen(){
  let totalCigs=0,totalMoney=0;
  for(const d in records){
    const rec=records[d];
    totalCigs+=rec.cigs;
    totalMoney+=rec.cost;
  }
  totalCigsSpan.textContent=totalCigs;
  totalMoneySpan.textContent=totalMoney.toFixed(2);
  if(totalCigs>0){
    const phrase=phrases[Math.floor(Math.random()*phrases.length)];
    motivationalPhrase.textContent=phrase;
  }else{
    motivationalPhrase.textContent="";
  }
}
