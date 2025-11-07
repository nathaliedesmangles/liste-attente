// Utilitaires
const $ = (sel) => document.querySelector(sel);
const queueEl = $("#queue");
const nameInput = $("#student-name");
const addBtn = $("#add-btn");
const refreshBtn = $("#refresh-btn");
const clearLocalBtn = $("#clear-local-btn");
const courseInput = $("#course-code");
const groupSelect = $("#group-number");

const ENDPOINTS = {
  add: "/.netlify/functions/addRequest",
  close: "/.netlify/functions/closeRequest",
  listOpen: "/.netlify/functions/listOpen",
  stats: "/.netlify/functions/getStats",
};

// Garde la dernière room (sigle) et groupe localement (pratique pour le prof)
courseInput.value = localStorage.getItem("course_code") || "";
groupSelect.value = localStorage.getItem("group_number") || "1";

courseInput.addEventListener("change", ()=>{
  localStorage.setItem("course_code", courseInput.value.trim());
});
groupSelect.addEventListener("change", ()=>{
  localStorage.setItem("group_number", groupSelect.value);
});

// Ajouter une demande
addBtn.addEventListener("click", async ()=>{
  const course_code = courseInput.value.trim();
  const group = groupSelect.value;
  const student = nameInput.value.trim();
  if(!course_code){ alert("Saisir le sigle du cours."); return; }
  if(!student){ alert("Saisir le nom de l'étudiant."); return; }

  const payload = { course_code, group, student };
  const res = await fetch(ENDPOINTS.add, { method:"POST", body: JSON.stringify(payload) });
  const data = await res.json();
  if(!res.ok){ alert("Erreur: "+(data.error||res.status)); return; }

  nameInput.value = "";
  await loadQueue();
  await loadStats();
});

// Marquer “servi”
async function markServed(id){
  const res = await fetch(ENDPOINTS.close, { method:"POST", body: JSON.stringify({ id }) });
  const data = await res.json();
  if(!res.ok){ alert("Erreur: "+(data.error||res.status)); return; }
  await loadQueue();
  await loadStats();
}

// Afficher file d’attente (demandes ouvertes)
async function loadQueue(){
  queueEl.innerHTML = "<li>Chargement…</li>";
  const res = await fetch(ENDPOINTS.listOpen);
  const data = await res.json();
  if(!res.ok){ queueEl.innerHTML = "<li>Erreur de chargement</li>"; return;}
  queueEl.innerHTML = "";
  data.forEach(row=>{
    const li = document.createElement("li");
    const since = timeSince(new Date(row.created_at));
    li.innerHTML = `
      <div>
        <strong>${row.student}</strong>
        <small> • ${row.course_code} • G${row.group} • ${since}</small>
      </div>
      <div>
        <button class="secondary" data-id="${row.id}">Servi</button>
      </div>
    `;
    queueEl.appendChild(li);
  });
  // bind buttons
  queueEl.querySelectorAll("button[data-id]").forEach(btn=>{
    btn.addEventListener("click", ()=> markServed(btn.dataset.id));
  });
}

function timeSince(date){
  const s = Math.max(0, Math.floor((Date.now()-date.getTime())/1000));
  if(s<60) return `${s}s`;
  const m = Math.floor(s/60); const r = s%60;
  if(m<60) return `${m}m ${r}s`;
  const h = Math.floor(m/60); const rm = m%60;
  return `${h}h ${rm}m`;
}

// Stats
let chartByDate, chartAvgWait;
async function loadStats(){
  const res = await fetch(ENDPOINTS.stats);
  const stats = await res.json();
  if(!res.ok){ console.error(stats); return; }

  // Cartes
  $("#stats-box").innerHTML = `
    <div class="card"><strong>Total demandes</strong><br>${stats.totals.total_requests}</div>
    <div class="card"><strong>Demandes ouvertes (en file)</strong><br>${stats.totals.open_requests}</div>
    <div class="card"><strong>Temps d’attente moyen (global)</strong><br>${formatSeconds(stats.totals.avg_wait_seconds)}</div>
    <div class="card"><strong>Dernier jour (demandes)</strong><br>${stats.last_day?.date||"—"} : ${stats.last_day?.count||0}</div>
  `;

  // Graphique demandes par date
  const labels1 = stats.by_date.map(d=>d.date);
  const values1 = stats.by_date.map(d=>d.count);
  if(chartByDate) chartByDate.destroy();
  chartByDate = new Chart(document.getElementById("chartByDate").getContext("2d"), {
    type: "bar",
    data: { labels: labels1, datasets: [{ data: values1, label: "Demandes", backgroundColor:"rgba(59,130,246,.6)"}] },
    options:{responsive:true, plugins:{legend:{display:false}}}
  });

  // Graphique temps moyen par date
  const labels2 = stats.by_date_avg_wait.map(d=>d.date);
  const values2 = stats.by_date_avg_wait.map(d=>d.avg_wait_seconds/60); // minutes
  if(chartAvgWait) chartAvgWait.destroy();
  chartAvgWait = new Chart(document.getElementById("chartAvgWaitByDate").getContext("2d"), {
    type: "line",
    data: { labels: labels2, datasets: [{ data: values2, label: "Attente moyenne (min)", fill:false, tension:.2 }]},
    options:{responsive:true}
  });
}
function formatSeconds(s){
  if(!s || s<=0) return "0:00";
  const m = Math.floor(s/60), r = s%60;
  return `${m}:${String(r).padStart(2,"0")}`;
}

// Divers
refreshBtn.addEventListener("click", ()=>{ loadQueue(); loadStats(); });
clearLocalBtn.addEventListener("click", ()=>{ localStorage.clear(); alert("Cache local vidé."); });

document.addEventListener("DOMContentLoaded", async ()=>{
  await loadQueue();
  await loadStats();
});
