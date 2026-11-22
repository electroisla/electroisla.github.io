(() => {
 const panel=document.getElementById("gestoresAdminPanel");
 if(!panel || typeof supabaseClient==="undefined") return;
 const $=id=>document.getElementById(id), statusEl=$("gestoresAdminStatus"), listEl=$("gestoresAdminList"), summaryEl=$("gestoresAdminSummary");
 let loaded=false, profiles=[];
 const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const money=n=>Number(n||0).toLocaleString("es-ES",{minimumFractionDigits:2,maximumFractionDigits:2});
 const invoke=async payload=>{
  const {data,error}=await supabaseClient.functions.invoke("admin-manage-gestors",{body:payload});
  if(error){let msg=error.message||"No se pudo completar la operación.";try{if(error.context?.json){const b=await error.context.json();msg=b.error||msg;}}catch(_){}throw new Error(msg);}
  if(data?.error)throw new Error(data.error);return data;
 };
 const slugify=v=>String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,50);
 function render(){
  const active=profiles.filter(p=>p.status==="active").length;
  summaryEl.innerHTML=`<div class="gestor-kpi"><strong>${profiles.length}</strong><span>Registrados</span></div><div class="gestor-kpi"><strong>${active}</strong><span>Activos</span></div><div class="gestor-kpi"><strong>${profiles.length-active}</strong><span>Suspendidos</span></div>`;
  if(!profiles.length){listEl.innerHTML='<div class="gestor-empty">Todavía no hay gestores registrados.</div>';return;}
  listEl.innerHTML=profiles.map(p=>{
   const sales=Object.entries(p.stats?.sales||{}).map(([c,n])=>c+" "+money(n)).join(" · ")||"Sin ventas";
   const profit=Object.entries(p.stats?.profit||{}).map(([c,n])=>c+" "+money(n)).join(" · ")||"0.00";
   const balance=Object.entries(p.balance||{}).map(([c,n])=>c+" "+money(n)).join(" · ")||"0.00";
   const on=p.status==="active";
   return `<article class="gestor-admin-card"><div class="gestor-admin-card-head"><div><h3>${esc(p.display_name)}</h3><p>${esc(p.email||"Correo no disponible")}</p><small>Identificador: <b>${esc(p.slug)}</b></small></div><span class="gestor-status ${on?"is-active":"is-suspended"}">${on?"Activo":"Suspendido"}</span></div><div class="gestor-admin-stats"><div><b>${Number(p.stats?.orders||0)}</b><span>Pedidos</span></div><div><b>${sales}</b><span>Ventas</span></div><div><b>${profit}</b><span>Ganancia asignada</span></div><div><b>${balance}</b><span>Saldo contable</span></div><div><b>${Number(p.custom_prices||0)}</b><span>Precios propios</span></div></div><div class="gestor-admin-actions"><button class="btn ${on?"":"primary"}" type="button" data-status-id="${esc(p.id)}" data-next-status="${on?"suspended":"active"}">${on?"Suspender gestor":"Reactivar gestor"}</button><a class="btn" href="gestores.html?gestor=${encodeURIComponent(p.slug)}" target="_blank" rel="noopener">Abrir acceso del gestor ↗</a><button class="btn" type="button" data-copy-slug="${esc(p.slug)}">Copiar identificador</button></div></article>`;
  }).join("");
 }
 async function load(){
  statusEl.textContent="Consultando gestores y movimientos…";listEl.innerHTML="";
  try{const d=await invoke({action:"list"});profiles=Array.isArray(d.profiles)?d.profiles:[];$("gestoresCommission").value=Number(d.commission_percent??0);render();statusEl.textContent="Datos actualizados.";loaded=true;}
  catch(e){statusEl.textContent="No se pudo cargar la gestión: "+e.message;listEl.innerHTML="";}
 }
 $("gestoresRefresh").addEventListener("click",()=>{loaded=false;load();});
 $("gestoresCommissionForm").addEventListener("submit",async e=>{
  e.preventDefault();const value=Number($("gestoresCommission").value);
  if(!Number.isFinite(value)||value<0||value>100){statusEl.textContent="La comisión debe estar entre 0 y 100%.";return;}
  const b=$("gestoresSaveCommission");b.disabled=true;statusEl.textContent="Guardando comisión general…";
  try{const d=await invoke({action:"set_commission",commission_percent:value});$("gestoresCommission").value=d.commission_percent;statusEl.textContent="Comisión guardada. Se aplicará a los nuevos pedidos.";}
  catch(e){statusEl.textContent="No se pudo guardar: "+e.message;}finally{b.disabled=false;}
 });
 $("gestoresCreateForm").addEventListener("submit",async e=>{
  e.preventDefault();const b=$("newGestorSubmit"), name=$("newGestorName").value.trim(),email=$("newGestorEmail").value.trim(),password=$("newGestorPassword").value,slug=$("newGestorSlug").value.trim().toLowerCase();
  if(password.length<8){statusEl.textContent="La contraseña debe tener al menos 8 caracteres.";return;}
  b.disabled=true;statusEl.textContent="Creando cuenta y perfil…";
  try{await invoke({action:"create",display_name:name,email,password,slug});$("gestoresCreateForm").reset();statusEl.textContent="Gestor creado. Ya puede entrar al portal de gestores.";loaded=false;await load();}
  catch(e){statusEl.textContent="No se pudo crear: "+e.message;}finally{b.disabled=false;}
 });
 $("newGestorName").addEventListener("input",()=>{const s=$("newGestorSlug");if(!s.dataset.edited)s.value=slugify($("newGestorName").value);});
 $("newGestorSlug").addEventListener("input",e=>{e.currentTarget.dataset.edited="1";});
 $("gestoresCreateForm").addEventListener("reset",()=>{$("newGestorSlug").dataset.edited="";});
 listEl.addEventListener("click",async e=>{
  const b=e.target.closest("[data-status-id]"),c=e.target.closest("[data-copy-slug]");
  if(c){try{await navigator.clipboard.writeText(c.dataset.copySlug);statusEl.textContent="Identificador copiado.";}catch(_){statusEl.textContent="Identificador: "+c.dataset.copySlug;}return;}
  if(!b)return;const next=b.dataset.nextStatus,id=b.dataset.statusId;
  if(next==="suspended"&&!confirm("¿Suspender este gestor? Su perfil dejará de estar activo en el portal."))return;
  b.disabled=true;
  try{await invoke({action:"set_status",gestor_id:id,status:next});statusEl.textContent=next==="active"?"Gestor reactivado.":"Gestor suspendido.";loaded=false;await load();}
  catch(err){statusEl.textContent="No se pudo cambiar el estado: "+err.message;b.disabled=false;}
 });
 document.querySelectorAll('#eiAdminNav a[href="#gestoresAdminPanel"]').forEach(a=>a.addEventListener("click",()=>{if(!loaded)load();}));
})();