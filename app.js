/* DSD SDS 97/98 - Offline-first trial application */
const DB_NAME = "dsd-sds-ambulance";
const DB_VERSION = 1;
let db;
let identity = null;
let currentReportId = null;
let currentTransactionId = null;
let draftTimer = null;
const $ = (id) => document.getElementById(id);
const money = (n) => new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(n||0));
const dayNames = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
const dateISO = (d=new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const dateDisplay = (s) => { if(!s) return "-"; const [y,m,d]=s.split("-"); return `${d}/${m}/${y}`; };
const makeId = (prefix) => `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
function openDB(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,DB_VERSION);
    req.onupgradeneeded=()=>{
      const d=req.result;
      if(!d.objectStoreNames.contains("reports")) d.createObjectStore("reports",{keyPath:"id"});
      if(!d.objectStoreNames.contains("transactions")) d.createObjectStore("transactions",{keyPath:"id"});
      if(!d.objectStoreNames.contains("settings")) d.createObjectStore("settings",{keyPath:"key"});
      if(!d.objectStoreNames.contains("drafts")) d.createObjectStore("drafts",{keyPath:"key"});
    };
    req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error);
  });
}
function store(name,mode="readonly"){return db.transaction(name,mode).objectStore(name);}
function put(name,value){return new Promise((res,rej)=>{const r=store(name,"readwrite").put(value);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});}
function get(name,key){return new Promise((res,rej)=>{const r=store(name).get(key);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});}
function all(name){return new Promise((res,rej)=>{const r=store(name).getAll();r.onsuccess=()=>res(r.result||[]);r.onerror=()=>rej(r.error);});}
function remove(name,key){return new Promise((res,rej)=>{const r=store(name,"readwrite").delete(key);r.onsuccess=()=>res();r.onerror=()=>rej(r.error);});}
function showScreen(id){
  document.querySelectorAll(".screen").forEach(s=>s.classList.add("hidden"));
  $(id).classList.remove("hidden"); window.scrollTo({top:0,behavior:"smooth"});
}
let toastTimer;
function toast(message){const el=$("toast");el.textContent=message;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),2600);}
function setConnection(){
  const el=$("connection");
  if(navigator.onLine){el.className="connection online";el.innerHTML="<i></i> Online";}
  else{el.className="connection offline";el.innerHTML="<i></i> Offline";}
}
function activeRegion(){return identity?.region || "Pasuruan";}
function escapeHtml(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function reportMessage(r){
  return `*ASSALAMUALAIKUM WR. WB.*\n\n*RELAWAN TRI BRATA*\nDSD SDS JATIM 97 / 98\n\nForm Permintaan bantuan *AMBULANCE ${r.region.toUpperCase()}*\n\nHari        : ${r.day}\nTanggal  : ${dateDisplay(r.date)}\nNo Tlp Keluarga : ${r.phone}\nNama Pasien : ${r.patient}\nUmur       : ${r.age||"-"}\nStatus     : ${r.status||"-"}\nJemput    : ${r.pickup}\nTujuan     : ${r.destination}\nJam        : ${r.time}\nKeterangan: ${r.notes||"-"}\n\nUntuk bantu sesama bisa gabung melalui:\nBRI 036001001707564\nAn. Relawan Tri Brata Jawa Timur\n\nSemoga Bermanfaat Dan Sehat Selalu.\n\nNo. Laporan: ${r.id}`;
}
function financeMessage(r,txs){
  const inc=txs.filter(t=>t.type==="Pemasukan").reduce((a,t)=>a+Number(t.amount),0);
  const exp=txs.filter(t=>t.type==="Pengeluaran").reduce((a,t)=>a+Number(t.amount),0);
  const lines=txs.map(t=>`${t.type}: ${money(t.amount)} | ${t.category} | ${t.note||"-"}`).join("\n");
  return `*LAPORAN KEUANGAN PELAYANAN*\nRELAWAN TRI BRATA - DSD SDS JATIM 97/98\n\nWilayah: ${r.region}\nNo. Laporan: ${r.id}\nPasien: ${r.patient}\nTanggal: ${dateDisplay(r.date)}\n\n${lines}\n\nTotal pemasukan: ${money(inc)}\nTotal pengeluaran: ${money(exp)}\nSaldo pelayanan: ${money(inc-exp)}\n\nOperator: ${r.operator}`;
}
function shareWhatsApp(text){
  const url="https://wa.me/?text="+encodeURIComponent(text);
  window.open(url,"_blank","noopener,noreferrer");
}
async function refreshHome(){
  const reports=(await all("reports")).sort((a,b)=>b.createdAt-a.createdAt);
  const txs=await all("transactions");
  $("totalReports").textContent=reports.length;
  $("pendingReports").textContent=reports.filter(r=>r.syncStatus!=="synced").length;
  $("recentReports").innerHTML=reports.slice(0,3).map(reportCard).join("")||'<div class="empty-state">Belum ada pelayanan tercatat.</div>';
  $("recentReports").querySelectorAll("[data-report]").forEach(b=>b.addEventListener("click",()=>openReport(b.dataset.report)));
  $("incomeTotal").textContent=money(txs.filter(t=>t.type==="Pemasukan").reduce((a,t)=>a+Number(t.amount),0));
  $("expenseTotal").textContent=money(txs.filter(t=>t.type==="Pengeluaran").reduce((a,t)=>a+Number(t.amount),0));
}
function reportCard(r){
  return `<article class="report-card"><div class="card-top"><strong>${escapeHtml(r.patient)}</strong><span class="status-pill">Tersimpan di perangkat</span></div><div class="card-meta">${escapeHtml(r.id)} · ${dateDisplay(r.date)} · ${escapeHtml(r.region)}</div><div class="card-meta">Jemput: ${escapeHtml(r.pickup)}</div><button class="secondary full" data-report="${escapeHtml(r.id)}" type="button">Buka laporan</button></article>`;
}
async function openReport(id){
  const r=await get("reports",id); if(!r)return;
  currentReportId=id;
  const fields=[["Wilayah",r.region],["Operator",r.operator],["Hari",r.day],["Tanggal",dateDisplay(r.date)],["No. Tlp keluarga",r.phone],["Nama pasien",r.patient],["Umur",r.age||"-"],["Status",r.status||"-"],["Jemput",r.pickup],["Tujuan",r.destination],["Jam",r.time],["Keterangan",r.notes||"-"]];
  $("reportDetail").innerHTML=`<div class="detail-id">${escapeHtml(r.id)}</div><div class="detail-grid">${fields.map(([k,v])=>`<div class="detail-item ${["Jemput","Tujuan","Keterangan"].includes(k)?"wide":""}"><small>${k}</small><strong>${escapeHtml(v)}</strong></div>`).join("")}</div>`;
  showScreen("detailScreen");
}
async function renderHistory(){
  const reports=(await all("reports")).sort((a,b)=>b.createdAt-a.createdAt);
  const q=$("historySearch").value.trim().toLowerCase();
  const filtered=reports.filter(r=>!q||`${r.patient} ${r.id} ${r.phone}`.toLowerCase().includes(q));
  $("historyList").innerHTML=filtered.map(reportCard).join("")||'<div class="empty-state">Tidak ada laporan yang cocok.</div>';
  $("historyList").querySelectorAll("[data-report]").forEach(b=>b.addEventListener("click",()=>openReport(b.dataset.report)));
}
async function renderTransactions(){
  const txs=(await all("transactions")).sort((a,b)=>b.createdAt-a.createdAt);
  const reports=await all("reports");
  $("transactionList").innerHTML=txs.map(t=>{
    const r=reports.find(x=>x.id===t.reportId);
    return `<article class="transaction-card"><div class="card-top"><strong>${escapeHtml(t.category)} · ${escapeHtml(r?.patient||"Laporan tidak ditemukan")}</strong><span class="${t.type==="Pemasukan"?"finance-amount":"finance-amount expense"}">${t.type==="Pemasukan"?"+":"−"}${money(t.amount)}</span></div><div class="card-meta">${escapeHtml(t.type)} · ${dateDisplay(t.date)} · ${escapeHtml(t.reportId)}</div><div class="card-meta">${escapeHtml(t.note||"-")}</div></article>`;
  }).join("")||'<div class="empty-state">Belum ada transaksi keuangan.</div>';
  $("financeReport").innerHTML='<option value="">Pilih laporan</option>'+reports.sort((a,b)=>b.createdAt-a.createdAt).map(r=>`<option value="${escapeHtml(r.id)}">${escapeHtml(r.id)} — ${escapeHtml(r.patient)}</option>`).join("");
}
function updateFormDate(){
  const now=new Date(); $("reportDay").value=dayNames[now.getDay()];
  if(!$("reportDate").value)$("reportDate").value=dateISO(now);
  if(!$("serviceTime").value)$("serviceTime").value=`${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
}
function formValues(){return Object.fromEntries(["reportDate","familyPhone","patientName","patientAge","patientStatus","pickup","destination","serviceTime","notes"].map(id=>[id,$(id).value]));}
async function saveDraft(){
  if(!$("reportForm"))return;
  await put("drafts",{key:"report",values:formValues(),savedAt:Date.now()});
  $("draftStatus").textContent="Draf tersimpan otomatis di perangkat ini.";
}
async function restoreDraft(){
  const d=await get("drafts","report");
  if(!d?.values)return;
  Object.entries(d.values).forEach(([id,v])=>{if($(id))$(id).value=v;});
  $("draftStatus").textContent="Draf sebelumnya dipulihkan dari perangkat ini.";
}
async function startReport(){
  $("reportForm").reset(); updateFormDate(); await restoreDraft();
  $("formRegion").textContent=`AMBULANCE ${activeRegion().toUpperCase()}`;
  showScreen("reportScreen");
}
async function submitReport(e){
  e.preventDefault();
  const v=formValues();
  const r={id:makeId("DSD"),region:activeRegion(),operator:identity.operator,day:dayNames[new Date(v.reportDate+"T12:00:00").getDay()],date:v.reportDate,phone:v.familyPhone.trim(),patient:v.patientName.trim(),age:v.patientAge.trim(),status:v.patientStatus.trim(),pickup:v.pickup.trim(),destination:v.destination.trim(),time:v.serviceTime,notes:v.notes.trim(),createdAt:Date.now(),syncStatus:"pending"};
  await put("reports",r); await remove("drafts","report");
  currentReportId=r.id; toast("Laporan tersimpan di perangkat.");
  await refreshHome(); await openReport(r.id);
}
async function addFinance(e){
  e.preventDefault();
  const tx={id:makeId("TRX"),reportId:$("financeReport").value,type:$("financeType").value,amount:Number($("financeAmount").value),category:$("financeCategory").value,note:$("financeNote").value.trim(),date:dateISO(),region:activeRegion(),operator:identity.operator,createdAt:Date.now(),syncStatus:"pending"};
  if(!tx.reportId||!Number.isFinite(tx.amount)||tx.amount<=0){toast("Pilih laporan dan isi nominal yang benar.");return;}
  await put("transactions",tx); $("financeForm").reset(); toast("Transaksi keuangan tersimpan.");
  await renderTransactions(); await refreshHome();
  currentTransactionId=tx.id; showTransactionSummary(tx.reportId);
}
async function showTransactionSummary(reportId){
  const r=await get("reports",reportId); const txs=(await all("transactions")).filter(t=>t.reportId===reportId);
  $("transactionShareText").innerHTML=`<div class="detail-id">${escapeHtml(reportId)}</div><h2>${escapeHtml(r?.patient||"Pelayanan")}</h2><p class="muted">${escapeHtml(r?.region||"")} · ${dateDisplay(r?.date)}</p><div class="section-heading"><h2>Rincian transaksi</h2></div>${txs.map(t=>`<div class="card-meta">${escapeHtml(t.type)} · ${escapeHtml(t.category)}: <strong>${money(t.amount)}</strong><br>${escapeHtml(t.note||"-")}</div>`).join("<hr>")}<div class="section-heading"><strong>Ringkasan</strong></div><p>Total pemasukan: <strong>${money(txs.filter(t=>t.type==="Pemasukan").reduce((a,t)=>a+t.amount,0))}</strong></p><p>Total pengeluaran: <strong>${money(txs.filter(t=>t.type==="Pengeluaran").reduce((a,t)=>a+t.amount,0))}</strong></p>`;
  $("shareFinance").onclick=()=>shareWhatsApp(financeMessage(r,txs));
  showScreen("transactionDetailScreen");
}
async function boot(){
  db=await openDB();
  const saved=await get("settings","identity"); identity=saved?.value||null;
  setConnection(); window.addEventListener("online",setConnection);window.addEventListener("offline",setConnection);
  $("region").addEventListener("change",()=> $("otherRegionWrap").classList.toggle("hidden",$("region").value!=="Wilayah lainnya"));
  $("setupForm").addEventListener("submit",async e=>{
    e.preventDefault(); const region=$("region").value==="Wilayah lainnya"?$("otherRegion").value.trim():$("region").value;
    if(!region){toast("Pilih atau isi wilayah terlebih dahulu.");return;}
    identity={region,operator:$("operator").value.trim()};
    await put("settings",{key:"identity",value:identity}); renderIdentity(); showScreen("homeScreen"); await refreshHome();
  });
  $("changeIdentity").onclick=async()=>{if(identity){$("region").value=["Pasuruan","Probolinggo","Malang","Surabaya"].includes(identity.region)?identity.region:"Wilayah lainnya";$("otherRegion").value=$("region").value==="Wilayah lainnya"?identity.region:"";$("otherRegionWrap").classList.toggle("hidden",$("region").value!=="Wilayah lainnya");$("operator").value=identity.operator;}showScreen("setupScreen");};
  $("newReport").onclick=startReport;
  $("cancelReport").onclick=()=>showScreen("homeScreen");
  $("reportForm").addEventListener("submit",submitReport);
  $("reportForm").addEventListener("input",()=>{clearTimeout(draftTimer);$("draftStatus").textContent="Menyimpan draf...";draftTimer=setTimeout(saveDraft,450);});
  $("openHistory").onclick=async()=>{await renderHistory();showScreen("historyScreen");};
  $("seeAll").onclick=$("openHistory").onclick;
  $("historySearch").addEventListener("input",renderHistory);
  $("openFinance").onclick=async()=>{await renderTransactions();showScreen("financeScreen");};
  $("financeForm").addEventListener("submit",addFinance);
  $("shareReport").onclick=async()=>{const r=await get("reports",currentReportId);if(r)shareWhatsApp(reportMessage(r));};
  $("addTransaction").onclick=async()=>{await renderTransactions();$("financeReport").value=currentReportId;showScreen("financeScreen");};
  document.querySelectorAll("[data-back]").forEach(b=>b.addEventListener("click",async()=>{showScreen(b.dataset.back);if(b.dataset.back==="homeScreen")await refreshHome();}));
  if(identity){renderIdentity();showScreen("homeScreen");await refreshHome();}else showScreen("setupScreen");
  if("serviceWorker" in navigator){navigator.serviceWorker.register("./sw.js").catch(err=>console.warn("Service worker:",err));}
}
function renderIdentity(){$("welcomeTitle").textContent=`Wilayah ${identity.region}`;$("operatorLabel").textContent=`Operator: ${identity.operator}`;}
document.addEventListener("DOMContentLoaded",()=>boot().catch(err=>{console.error(err);toast("Aplikasi gagal dibuka. Muat ulang halaman.");}));
