(() => {
 const panel=document.getElementById("gestoresAdminPanel");
 if(!panel || typeof supabaseClient==="undefined") return;
 const $=id=>document.getElementById(id), statusEl=$("gestoresAdminStatus"), listEl=$("gestoresAdminList"), summaryEl=$("gestoresAdminSummary");
 let loaded=false, profiles=[], electroRanges=[{min_price:0,max_price:null,commission_percent:5}];
 const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const money=n=>Number(n||0).toLocaleString("es-ES",{minimumFractionDigits:2,maximumFractionDigits:2});
 const invoke=async payload=>{
  const {data,error}=await supabaseClient.functions.invoke("admin-manage-gestors",{body:payload});
  if(error){let msg=error.message||"No se pudo completar la operación.";try{if(error.context?.json){const b=await error.context.json();msg=b.error||msg;}}catch(_){}throw new Error(msg);}
  if(data?.error)throw new Error(data.error);return data;
 };
 const slugify=v=>String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,50);
 function renderRanges(){
  $("gestoresElectroRanges").innerHTML=electroRanges.map((r,i)=>`<div class="gestor-range-row" data-range-index="${i}">
   <label>Precio mínimo (USD)<input type="number" min="0" step="0.01" data-range-min value="${esc(r.min_price)}" required></label>
   <label>Precio máximo (USD)<input type="number" min="0" step="0.01" data-range-max value="${r.max_price===null?"":esc(r.max_price)}" placeholder="${i===electroRanges.length-1?"Sin límite":"Obligatorio"}" ${i===electroRanges.length-1?"":"required"}></label>
   <label>Comisión (%)<input type="number" min="0" max="100" step="0.01" data-range-percent value="${esc(r.commission_percent)}" required></label>
   <button type="button" class="btn range-remove" data-remove-range="${i}" ${electroRanges.length===1?"disabled":""} aria-label="Eliminar rango">✕</button>
  </div>`).join("");
 }
 renderRanges();
 function render(){
  const active=profiles.filter(p=>p.status==="active").length;
  summaryEl.innerHTML=`<div class="gestor-kpi"><strong>${profiles.length}</strong><span>Registrados</span></div><div class="gestor-kpi"><strong>${active}</strong><span>Activos</span></div><div class="gestor-kpi"><strong>${profiles.length-active}</strong><span>Suspendidos</span></div>`;
  if(!profiles.length){listEl.innerHTML='<div class="gestor-empty">Todavía no hay gestores registrados.</div>';return;}
  listEl.innerHTML=profiles.map(p=>{
   const sales=Object.entries(p.stats?.sales||{}).map(([c,n])=>c+" "+money(n)).join(" · ")||"Sin ventas";
   const profit=Object.entries(p.stats?.profit||{}).map(([c,n])=>c+" "+money(n)).join(" · ")||"0.00";
   const balance=Object.entries(p.balance||{}).map(([c,n])=>c+" "+money(n)).join(" · ")||"0.00";
   const on=p.status==="active";
   return `<article class="gestor-admin-card"><div class="gestor-admin-card-head"><div><h3>${esc(p.display_name)}</h3><p>${esc(p.email||"Correo no disponible")}</p><small>Identificador: <b>${esc(p.slug)}</b></small></div><span class="gestor-status ${on?"is-active":"is-suspended"}">${on?"Activo":"Suspendido"}</span></div><div class="gestor-admin-stats"><div><b>${Number(p.stats?.orders||0)}</b><span>Pedidos</span></div><div><b>${sales}</b><span>Ventas</span></div><div><b>${profit}</b><span>Ganancia asignada</span></div><div><b>${balance}</b><span>Saldo contable</span></div><div><b>${Number(p.custom_prices||0)}</b><span>Precios propios</span></div></div><div class="gestor-admin-actions"><button class="btn ${on?"":"primary"}" type="button" data-status-id="${esc(p.id)}" data-next-status="${on?"suspended":"active"}">${on?"Suspender gestor":"Reactivar gestor"}</button><a class="btn" href="gestores.html?gestor=${encodeURIComponent(p.slug)}" target="_blank" rel="noopener">Abrir acceso del gestor ↗</a><button class="btn" type="button" data-copy-slug="${esc(p.slug)}">Copiar identificador</button><button class="btn danger" type="button" data-delete-id="${esc(p.id)}">Eliminar gestor</button></div></article>`;
  }).join("");
 }
 async function load(){
  statusEl.textContent="Consultando gestores y reglas de comisión…";listEl.innerHTML="";
  try{
   const d=await invoke({action:"list"});profiles=Array.isArray(d.profiles)?d.profiles:[];
   $("gestoresFoodCommission").value=Number(d.food_commission_percent??d.commission_percent??0);
   electroRanges=Array.isArray(d.electro_commission_ranges)&&d.electro_commission_ranges.length?d.electro_commission_ranges:[{min_price:0,max_price:null,commission_percent:5}];
   renderRanges();render();statusEl.textContent="Datos actualizados.";loaded=true;
  }catch(e){statusEl.textContent="No se pudo cargar la gestión: "+e.message;listEl.innerHTML="";}
 }
 $("gestoresRefresh").addEventListener("click",()=>{loaded=false;load();});
 $("gestoresFoodCommissionForm").addEventListener("submit",async e=>{
  e.preventDefault();if(!loaded){await load();if(!loaded)return;}const value=Number($("gestoresFoodCommission").value);
  if(!Number.isFinite(value)||value<0||value>100){statusEl.textContent="La comisión de Alimentos debe estar entre 0 y 100%.";return;}
  const b=$("gestoresSaveFoodCommission");b.disabled=true;statusEl.textContent="Guardando comisión de Alimentos…";
  try{const d=await invoke({action:"set_commission_rules",food_commission_percent:value,electro_commission_ranges:electroRanges});$("gestoresFoodCommission").value=d.food_commission_percent;statusEl.textContent="Comisión de Alimentos guardada.";}
  catch(e){statusEl.textContent="No se pudo guardar: "+e.message;}finally{b.disabled=false;}
 });
 $("gestoresElectroRangesForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const rows=[...$("gestoresElectroRanges").querySelectorAll(".gestor-range-row")];
  const ranges=rows.map(row=>({min_price:Number(row.querySelector("[data-range-min]").value),max_price:row.querySelector("[data-range-max]").value.trim()===""?null:Number(row.querySelector("[data-range-max]").value),commission_percent:Number(row.querySelector("[data-range-percent]").value)}));
  const b=$("gestoresSaveElectroRanges");b.disabled=true;statusEl.textContent="Validando y guardando rangos…";
  try{const d=await invoke({action:"set_commission_rules",food_commission_percent:Number($("gestoresFoodCommission").value),electro_commission_ranges:ranges});electroRanges=d.electro_commission_ranges;renderRanges();statusEl.textContent="Rangos de Electrodomésticos guardados. Se aplicarán a los nuevos pedidos.";}
  catch(e){statusEl.textContent="No se pudieron guardar los rangos: "+e.message;}finally{b.disabled=false;}
 });
 $("gestoresAddElectroRange").addEventListener("click",()=>{
  if(electroRanges.length>=30){statusEl.textContent="Puedes configurar hasta 30 rangos.";return;}
  const last=electroRanges[electroRanges.length-1],boundary=last.max_price===null?Math.max(Number(last.min_price)+1,100):Number(last.max_price);
  last.max_price=boundary;
  electroRanges.push({min_price:boundary,max_price:null,commission_percent:last.commission_percent});
  renderRanges();
 });
 $("gestoresElectroRanges").addEventListener("input",e=>{
  const row=e.target.closest(".gestor-range-row");if(!row)return;
  const i=Number(row.dataset.rangeIndex),r=electroRanges[i];if(!r)return;
  if(e.target.matches("[data-range-min]"))r.min_price=e.target.value;
  if(e.target.matches("[data-range-max]"))r.max_price=e.target.value.trim()===""?null:e.target.value;
  if(e.target.matches("[data-range-percent]"))r.commission_percent=e.target.value;
 });
 $("gestoresElectroRanges").addEventListener("click",e=>{
  const b=e.target.closest("[data-remove-range]");if(!b||electroRanges.length<=1)return;
  const i=Number(b.dataset.removeRange);electroRanges.splice(i,1);
  if(i===electroRanges.length)electroRanges[i-1].max_price=null;
  renderRanges();
 });
 $("gestoresCreateForm").addEventListener("submit",async e=>{
  e.preventDefault();const b=$("newGestorSubmit"),name=$("newGestorName").value.trim(),email=$("newGestorEmail").value.trim(),password=$("newGestorPassword").value,slug=$("newGestorSlug").value.trim().toLowerCase();
  if(password.length<8){statusEl.textContent="La contraseña debe tener al menos 8 caracteres.";return;}
  b.disabled=true;statusEl.textContent="Creando cuenta y perfil…";
  try{await invoke({action:"create",display_name:name,email,password,slug});$("gestoresCreateForm").reset();statusEl.textContent="Gestor creado. Ya puede entrar al portal de gestores.";loaded=false;await load();}
  catch(e){statusEl.textContent="No se pudo crear: "+e.message;}finally{b.disabled=false;}
 });
 $("newGestorName").addEventListener("input",()=>{const s=$("newGestorSlug");if(!s.dataset.edited)s.value=slugify($("newGestorName").value);});
 $("newGestorSlug").addEventListener("input",e=>{e.currentTarget.dataset.edited="1";});
 $("gestoresCreateForm").addEventListener("reset",()=>{$("newGestorSlug").dataset.edited="";});
 listEl.addEventListener("click",async e=>{
  const b=e.target.closest("[data-status-id]"),c=e.target.closest("[data-copy-slug]"),del=e.target.closest("[data-delete-id]");
  if(c){try{await navigator.clipboard.writeText(c.dataset.copySlug);statusEl.textContent="Identificador copiado.";}catch(_){statusEl.textContent="Identificador: "+c.dataset.copySlug;}return;}
  if(del){const id=del.dataset.deleteId,profile=profiles.find(p=>String(p.id)===String(id));if(!profile)return;if(!confirm("¿Eliminar a "+profile.display_name+"? Se bloqueará su acceso y desaparecerá de la lista, pero se conservarán todos sus pedidos, ganancias, liquidaciones y registros históricos. Esta acción no se puede deshacer desde el administrador."))return;del.disabled=true;statusEl.textContent="Retirando gestor y protegiendo su historial…";try{await invoke({action:"delete",gestor_id:id});statusEl.textContent="Gestor eliminado de la lista. Su historial contable se conserva.";loaded=false;await load();}catch(err){statusEl.textContent="No se pudo eliminar: "+err.message;del.disabled=false;}return;}
  if(!b)return;const next=b.dataset.nextStatus,id=b.dataset.statusId;
  if(next==="suspended"&&!confirm("¿Suspender este gestor? Su perfil dejará de estar activo en el portal."))return;
  b.disabled=true;
  try{await invoke({action:"set_status",gestor_id:id,status:next});statusEl.textContent=next==="active"?"Gestor reactivado.":"Gestor suspendido.";loaded=false;await load();}
  catch(err){statusEl.textContent="No se pudo cambiar el estado: "+err.message;b.disabled=false;}
 });
 document.querySelectorAll('#eiAdminNav a[href="#gestoresAdminPanel"]').forEach(a=>a.addEventListener("click",()=>{if(!loaded)load();}));
})();