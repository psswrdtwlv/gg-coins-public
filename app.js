// GG Coins public rating: only approved public fields (name, group, earned, spent, balance).
const DATA_URL = "./rating.json";
const tabs = [...document.querySelectorAll("#tabs .tab")];
const tbody = document.querySelector("#tbody");
const statusEl = document.querySelector("#status");
const searchEl = document.querySelector("#search");
const refreshEl = document.querySelector("#refresh");
let rows = [];
let scope = "all";
let query = "";
let sortKey = "balance";
let sortDirection = "desc";

const number = v => {
  const n = Number(String(v ?? 0).replace(/\s/g,"").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, c => (
  {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]
));
const groupName = row => String(row.group ?? "").trim().toLowerCase();

function render() {
  if (!tbody) return;
  const visible = rows.filter(row => (
    (scope === "all" || (scope === "operators" && ["операторы","оператор","operators","operator"].includes(groupName(row))) ||
      (scope === "aup" && ["ауп","aup"].includes(groupName(row))))
    && String(row.name ?? "").toLocaleLowerCase("ru").includes(query)
  )).sort((a,b) => {
    let comparison = sortKey === "name"
      ? String(a.name ?? "").localeCompare(String(b.name ?? ""),"ru")
      : number(a[sortKey]) - number(b[sortKey]);
    return sortDirection === "asc" ? comparison : -comparison;
  });
  tbody.replaceChildren();
  if (!visible.length) {
    const tr = tbody.insertRow();
    const cell = tr.insertCell();
    cell.colSpan=5;
    cell.className="muted";
    cell.textContent="Нет данных";
    return;
  }
  for (const [i,row] of visible.entries()) {
    const tr=tbody.insertRow();
    if (i < 3) tr.className="row-animated";
    const rank=tr.insertCell();
    rank.innerHTML = i < 3
      ? '<span class="rankcell"><span class="badge top'+(i+1)+'">'+(i+1)+'</span></span>'
      : '<span class="rankcell">'+(i+1)+'</span>';
    tr.insertCell().textContent=String(row.name??"");
    for (const field of ["earned","spent","balance"]) {
      const cell=tr.insertCell();
      cell.className="td-num";
      const value=number(row[field]);
      if (field==="balance") cell.classList.add(value>0?"balance-pos":value<0?"balance-neg":"balance-zero");
      const coin=document.createElement("span");
      coin.className="coin";
      const dot=document.createElement("span");
      dot.className="coin-dot";
      dot.setAttribute("aria-hidden","true");
      const strong=document.createElement("b");
      strong.textContent=String(value);
      coin.append(dot,strong);
      cell.append(coin);
    }
  }
}

async function load() {
  if (!statusEl) return;
  refreshEl && (refreshEl.disabled=true);
  statusEl.textContent="Загружаю данные…";
  try {
    const response=await fetch(DATA_URL+"?ts="+Date.now(),{cache:"no-store"});
    if(!response.ok) throw new Error("HTTP "+response.status);
    const data=await response.json();
    rows=Array.isArray(data.all)?data.all:
      [...(Array.isArray(data.operators)?data.operators:[]),...(Array.isArray(data.aup)?data.aup:[])];
    const op=rows.filter(r=>["операторы","оператор","operators","operator"].includes(groupName(r))).length;
    const aup=rows.filter(r=>["ауп","aup"].includes(groupName(r))).length;
    statusEl.textContent="Загружено: "+rows.length+" (Операторы: "+op+", АУП: "+aup+")";
    render();
  } catch(err) {
    statusEl.textContent="Ошибка загрузки данных — попробуйте обновить";
    console.error("GG Coins rating:",err);
  } finally { refreshEl && (refreshEl.disabled=false); }
}
tabs.forEach(btn=>btn.addEventListener("click",()=>{
  scope=btn.dataset.scope;
  tabs.forEach(b=>b.classList.toggle("active",b===btn));
  render();
}));
searchEl?.addEventListener("input",()=>{query=searchEl.value.trim().toLocaleLowerCase("ru");render();});
refreshEl?.addEventListener("click",load);
document.querySelectorAll("th[data-sort]").forEach(th=>th.addEventListener("click",()=>{
  const key=th.dataset.sort;
  sortDirection=sortKey===key?(sortDirection==="asc"?"desc":"asc"):(key==="name"?"asc":"desc");
  sortKey=key;
  document.querySelectorAll("th[data-sort]").forEach(x=>{
    x.classList.toggle("asc",x.dataset.sort===sortKey&&sortDirection==="asc");
    x.classList.toggle("desc",x.dataset.sort===sortKey&&sortDirection==="desc");
  });
  render();
}));
document.querySelector('th[data-sort="balance"]')?.classList.add("desc");
load();
