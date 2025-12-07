console.log("APP.JS CHARGÉ CORRECTEMENT !");


//------------------------------------------------------
// CONFIG
//------------------------------------------------------
const API_URL = "/.netlify/functions";
const TEACHER_PASSWORD = "montmorency2025";

//------------------------------------------------------
// STATE
//------------------------------------------------------
let queue = [];
let teacherMode = false;

//------------------------------------------------------
// INIT
//------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
  checkTeacherCookie();
  loadQueue();
});

//------------------------------------------------------
// LISTENERS
//------------------------------------------------------
function setupEventListeners() {
  document.getElementById("add-btn").onclick = addStudent;
  document.getElementById("refresh-btn").onclick = loadQueue;
  document.getElementById("clear-local-btn").onclick = () => localStorage.clear();

  // Mode enseignant
  document.getElementById("teacher-toggle").onclick = () => {
    document.getElementById("teacher-login").style.display = "block";
  };

  document.getElementById("teacher-login-btn").onclick = () => {
    const pwd = document.getElementById("teacher-password").value.trim();
    if (pwd === TEACHER_PASSWORD) {
      activateTeacherMode();
    } else {
      alert("Mot de passe incorrect.");
    }
  };
}

//------------------------------------------------------
// ADD STUDENT  (Frontend → Backend)
//------------------------------------------------------
async function addStudent() {
  const name = document.getElementById("student-name").value.trim();
  const course = document.getElementById("course-code").value.trim();
  const group = document.getElementById("group").value.trim();
  const timestamp = Date.now();

  if (!name) return alert("Veuillez inscrire un nom.");
  if (!course) return alert("Veuillez choisir un cours.");
  if (!group) {
      return alert("Veuillez entrer un groupe (2 caractères max).");
  }


  const entry = {
    id: timestamp.toString(), // ID unique
    name,
    course,
    group,
    timestamp
  };

  try {
    await fetch(`${API_URL}/add`, {
      method: "POST",
      body: JSON.stringify(entry)
    });

    document.getElementById("student-name").value = "";
    await loadQueue();

  } catch (err) {
    console.error("Erreur add:", err);
    alert("Erreur lors de l’ajout.");
  }
}

//------------------------------------------------------
// QUEUE RENDERING
//------------------------------------------------------
function renderQueue() {
  const ul = document.getElementById("queue");
  ul.innerHTML = "";

  if (!queue.length) {
    ul.innerHTML = "<li>Aucune attente.</li>";
    return;
  }

  queue.forEach(item => {
    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${item.name}</strong> — ${item.course} — Groupe ${item.group}
    `;

    if (teacherMode) {
      const btn = document.createElement("button");
      btn.textContent = "Servi ✔";
      btn.onclick = () => markAsServed(item.id);
      li.appendChild(btn);
    }

    ul.appendChild(li);
  });
}

//------------------------------------------------------
// LOAD QUEUE
//------------------------------------------------------
async function loadQueue() {
  try {
    const res = await fetch(`${API_URL}/list`);
    queue = await res.json();
    renderQueue();
  } catch (err) {
    console.error("Erreur load:", err);
    alert("Impossible de charger la liste.");
  }
}

//------------------------------------------------------
// MARK AS SERVED
//------------------------------------------------------
async function markAsServed(id) {
  if (!teacherMode) return alert("Seulement pour l’enseignant.");

  try {
    await fetch(`${API_URL}/served`, {
      method: "POST",
      body: JSON.stringify({ id })
    });

    await loadQueue();

  } catch (err) {
    console.error("Erreur served:", err);
    alert("Erreur lors de la mise à jour.");
  }
}

//------------------------------------------------------
// TEACHER MODE
//------------------------------------------------------
function activateTeacherMode() {
  teacherMode = true;
  document.cookie = "teacherMode=1; path=/;";
  document.getElementById("teacher-login").style.display = "none";
  renderQueue();
}

function checkTeacherCookie() {
  if (document.cookie.includes("teacherMode=1")) teacherMode = true;
}


