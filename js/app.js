"use strict";

// Практическая №3. Источник данных — исходные JSON из dataset; данные не перезаписываются.
const state = { metrics: [], rows: [], notifications: [], onlyProgress: false };
const $ = (selector) => document.querySelector(selector);

function setText(element, value) { element.textContent = String(value); }
function statusClass(status) {
  return status === "Готово" ? "badge-done" : status === "В работе" ? "badge-progress" : "badge-new";
}
function showToast(message) {
  setText($("#toastMessage"), message);
  // Программное управление Bootstrap-компонентом (требование п. 11).
  bootstrap.Toast.getOrCreateInstance($("#actionToast")).show();
}
function renderMetrics() {
  const grid = $("#metricsGrid"); grid.replaceChildren();
  if (!state.metrics.length) { grid.innerHTML = '<div class="col-12"><div class="alert alert-secondary">Показатели отсутствуют.</div></div>'; return; }
  state.metrics.forEach((metric, index) => {
    const col = document.createElement("div"); col.className = "col-12 col-sm-6 col-xl-3";
    const card = document.createElement("article"); card.className = "card metric-card";
    const body = document.createElement("div"); body.className = "card-body p-4";
    const top = document.createElement("div"); top.className = "d-flex justify-content-between align-items-center mb-3";
    const label = document.createElement("span"); label.className = "metric-label"; setText(label, metric.title);
    const icon = document.createElement("span"); icon.className = "metric-symbol"; setText(icon, ["01", "02", "03", "04"][index] || "•");
    const value = document.createElement("div"); value.className = "metric-value"; setText(value, metric.value);
    top.append(label,icon);body.append(top,value);card.append(body);col.append(card);grid.append(col);
  });
}
function renderRows() {
  const tbody = $("#operationsBody"); tbody.replaceChildren();
  const visible = state.onlyProgress ? state.rows.filter(row => row.status === "В работе") : state.rows;
  setText($("#rowCount"), `Показано: ${visible.length} из ${state.rows.length}`);
  if (visible.length === 0) {
    const tr = document.createElement("tr"), td = document.createElement("td");td.colSpan = 3;td.className = "p-4 text-secondary";setText(td,"Нет записей для выбранного фильтра.");tr.append(td);tbody.append(tr);return;
  }
  visible.forEach(row => {
    const tr=document.createElement("tr");
    const id=document.createElement("td");id.className="ps-4";setText(id,row.id);
    const action=document.createElement("td");action.className="fw-semibold";setText(action,row.action);
    const status=document.createElement("td");status.className="pe-4";
    const badge=document.createElement("span");badge.className=`badge-status ${statusClass(row.status)}`;setText(badge,row.status);
    status.append(badge);tr.append(id,action,status);tbody.append(tr);
  });
}
function renderNotifications() {
  const list=$("#notificationsList");list.replaceChildren();
  if(!state.notifications.length){list.innerHTML='<div class="col-12"><div class="alert alert-secondary">Уведомлений нет.</div></div>';return;}
  state.notifications.forEach(item=>{
    const col=document.createElement("div");col.className="col-12 col-md-6";
    const card=document.createElement("article");card.className=`notice-card ${item.type === "warning" ? "notice-warning" : ""}`;
    const title=document.createElement("div");title.className="fw-bold mb-2";setText(title,item.type === "warning" ? "Предупреждение" : "Системное сообщение");
    const text=document.createElement("p");text.className="text-secondary mb-0";setText(text,item.text);
    card.append(title,text);col.append(card);list.append(col);
  });
}
function validateAction() {
  const input=$("#actionInput"); const valid=input.value.trim().length >= 3 && input.value.trim().length <= 80;
  input.classList.toggle("is-valid",valid);input.classList.toggle("is-invalid",!valid);
  return valid;
}
async function loadData() {
  try {
    const [dashboardResult,noticeResult] = await Promise.all([fetch("dataset/dashboard.json"),fetch("dataset/notifications.json")]);
    if(!dashboardResult.ok || !noticeResult.ok)throw new Error("Один из файлов dataset недоступен.");
    const dashboard=await dashboardResult.json(), notices=await noticeResult.json();
    if(!Array.isArray(dashboard.metrics)||!Array.isArray(dashboard.rows)||!Array.isArray(notices))throw new Error("Неверный формат JSON.");
    state.metrics=dashboard.metrics;state.rows=dashboard.rows;state.notifications=notices;
    renderMetrics();renderRows();renderNotifications();
  }catch(error){
    const message="Не удалось загрузить dataset. Запускайте index.html через Live Server и проверьте файлы dashboard.json и notifications.json.";
    setText($("#loadError"),message);$("#loadError").classList.remove("d-none");
    state.metrics=[];state.rows=[];state.notifications=[];renderMetrics();renderRows();renderNotifications();
    console.error("Ошибка загрузки данных:",error);
  }
}
$("#operationForm").addEventListener("submit",event=>{
  event.preventDefault();
  if(!validateAction()){
    $("#actionInput").focus();
    const warning=state.notifications.find(n=>n.type==="warning");
    if(warning)showToast(warning.text);
    return;
  }
  const nextId=state.rows.reduce((max,row)=>Math.max(max,Number(row.id)||0),0)+1;
  state.rows.unshift({id:nextId,action:$("#actionInput").value.trim(),status:$("#statusInput").value});
  renderRows();
  bootstrap.Modal.getOrCreateInstance($("#addModal")).hide();
  $("#operationForm").reset();$("#actionInput").classList.remove("is-valid","is-invalid");
  const success=state.notifications.find(n=>n.type==="success");
  showToast(success ? success.text : "Операция добавлена");
});
$("#actionInput").addEventListener("input",()=>{
  if($("#actionInput").classList.contains("is-valid")||$("#actionInput").classList.contains("is-invalid")) validateAction();
});
$("#toggleStatusBtn").addEventListener("click",()=>{
  state.onlyProgress=!state.onlyProgress;
  const button=$("#toggleStatusBtn");
  setText(button,state.onlyProgress?"Показать все":"Только в работе");
  button.classList.toggle("btn-primary",state.onlyProgress);button.classList.toggle("btn-outline-primary",!state.onlyProgress);
  renderRows();
});
$("#showNoticeBtn").addEventListener("click",()=>{
  showToast(state.notifications[0]?.text || "Уведомлений пока нет");
});
$("#addModal").addEventListener("hidden.bs.modal",()=>{
  $("#operationForm").reset();$("#actionInput").classList.remove("is-valid","is-invalid");
});
loadData();
