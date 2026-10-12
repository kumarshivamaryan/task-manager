// ---------- State ----------
const STORAGE_KEY = "student-tasks-v1";
let tasks = load();
let editingId = null;

// Task shape: { id, title, description, due ("YYYY-MM-DD" or ""), priority, completed, created }

// ---------- Helpers ----------
const $ = id => document.getElementById(id);
const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch (e) { return []; }
}
function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); } catch (e) {}
}
function todayStr() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
function isOverdue(t) { return !t.completed && t.due && t.due < todayStr(); }
function formatDate(s) {
  return new Date(s + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
// Escape user text so it can't inject HTML
function esc(str) {
  const d = document.createElement("div"); d.textContent = str; return d.innerHTML;
}

// ---------- Create / Update ----------
$("taskForm").addEventListener("submit", e => {
  e.preventDefault();
  const title = $("title").value.trim();
  if (!title) { $("error").textContent = "Please enter a title."; $("title").focus(); return; }
  $("error").textContent = "";

  const data = {
    title,
    description: $("desc").value.trim(),
    due: $("due").value,
    priority: $("priority").value
  };

  if (editingId) {
    tasks = tasks.map(t => t.id === editingId ? { ...t, ...data } : t);
  } else {
    tasks.push({ id: Date.now().toString(36), completed: false, created: Date.now(), ...data });
  }
  resetForm(); save(); render();
});

function startEdit(id) {
  const t = tasks.find(t => t.id === id); if (!t) return;
  editingId = id;
  $("title").value = t.title; $("desc").value = t.description;
  $("due").value = t.due; $("priority").value = t.priority;
  $("submitBtn").textContent = "Save changes";
  $("cancelBtn").hidden = false;
  $("title").focus(); window.scrollTo({ top: 0, behavior: "smooth" });
}
function resetForm() {
  editingId = null; $("taskForm").reset(); $("priority").value = "medium";
  $("submitBtn").textContent = "Add task"; $("cancelBtn").hidden = true; $("error").textContent = "";
}
$("cancelBtn").addEventListener("click", resetForm);

// ---------- Toggle / Delete ----------
function toggle(id) {
  tasks = tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
  save(); render();
}
function remove(id) {
  if (!confirm("Delete this task?")) return;
  tasks = tasks.filter(t => t.id !== id);
  if (editingId === id) resetForm();
  save(); render();
}
$("clearDone").addEventListener("click", () => {
  if (!tasks.some(t => t.completed)) return;
  if (confirm("Remove all completed tasks?")) { tasks = tasks.filter(t => !t.completed); save(); render(); }
});

// ---------- Filtering & sorting ----------
function visibleTasks() {
  const s = $("fStatus").value, p = $("fPriority").value, sort = $("fSort").value;
  let list = tasks.filter(t =>
    (s === "all" || (s === "done") === t.completed) &&
    (p === "all" || t.priority === p));

  list.sort((a, b) => {
    if (sort === "priority") return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (sort === "newest") return b.created - a.created;
    // due date: tasks without a date go last
    return (a.due || "9999").localeCompare(b.due || "9999");
  });
  return list;
}
["fStatus", "fPriority", "fSort"].forEach(id => $(id).addEventListener("change", render));

// ---------- Rendering ----------
function render() {
  // stats
  const done = tasks.filter(t => t.completed).length;
  $("statTotal").textContent = tasks.length;
  $("statDone").textContent = done;
  $("statLate").textContent = tasks.filter(isOverdue).length;
  $("bar").style.width = (tasks.length ? done / tasks.length * 100 : 0) + "%";

  // list
  const list = visibleTasks();
  $("list").innerHTML = list.length ? list.map(t => `
    <li class="task ${t.priority} ${t.completed ? "done" : ""}">
      <input type="checkbox" ${t.completed ? "checked" : ""} data-act="toggle" data-id="${t.id}"
             aria-label="Mark complete">
      <div class="body">
        <div class="title">${esc(t.title)}</div>
        ${t.description ? `<div class="desc">${esc(t.description)}</div>` : ""}
        <div class="meta">
          <span class="badge ${t.priority}">${t.priority}</span>
          ${t.due ? `<span class="${isOverdue(t) ? "overdue" : ""}">📅 ${formatDate(t.due)}${isOverdue(t) ? " (overdue)" : ""}</span>` : ""}
        </div>
      </div>
      <div class="row-actions">
        <button data-act="edit" data-id="${t.id}">Edit</button>
        <button class="btn-danger" data-act="delete" data-id="${t.id}">Delete</button>
      </div>
    </li>`).join("")
    : `<li class="empty">${tasks.length ? "No tasks match these filters." : "No tasks yet — add your first one above! ✨"}</li>`;
}

// One click listener handles every button/checkbox in the list (event delegation)
$("list").addEventListener("click", e => {
  const el = e.target.closest("[data-act]"); if (!el) return;
  const { act, id } = el.dataset;
  if (act === "toggle") toggle(id);
  else if (act === "edit") startEdit(id);
  else if (act === "delete") remove(id);
});

// ---------- Theme toggle ----------
$("themeBtn").addEventListener("click", () => {
  const root = document.documentElement;
  const dark = root.dataset.theme === "dark" ||
    (!root.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);
  root.dataset.theme = dark ? "light" : "dark";
});

render();
