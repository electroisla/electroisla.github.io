/* ElectroIsla 360: hasta diez cuentas Zelle por importe. */
(function(){
 const $=id=>document.getElementById(id);let rows=[];
 const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const activeRows=()=>rows.filter(r=>r.enabled).sort((a,b)=>Number(a.sort_order)-Number(b.sort_order));
 const listEl=()=>$("zelleAmountAccountsList");
 function syncInputsToRows(){
  const list=listEl();if(!list)return;
  rows.forEach(row=>{
   const id=Number(row.id),value=list.querySelector('[data-zelle-account-value="'+id+'"]'),holder=list.querySelector('[data-zelle-account-holder="'+id+'"]'),cap=list.querySelector('[data-zelle-max-amount="'+id+'"]');
   if(value)row.account_value=value.value.trim();
   if(holder)row.account_holder=holder.value.trim();
   if(cap)row.max_amount=cap.value.trim()===""?null:Number(cap.value);
  });
 }
 function capFor(id){const row=rows.find(r=>Number(r.id)===Number(id));return row&&row.max_amount!==null&&row.max_amount!==""&&Number.isFinite(Number(row.max_amount))?Number(row.max_amount):null}
 function money(value){return Number(value).toLocaleString("es-ES",{minimumFractionDigits:2,maximumFractionDigits:2})}
 function rangeLabel(index,active){
  if(active.length===1)return "Todos los importes en USD";
  if(index===0)return "Hasta "+money(capFor(active[0].id))+" USD";
  const previous=capFor(active[index-1].id);
  if(index===active.length-1)return "Más de "+money(previous)+" USD";
  return "Más de "+money(previous)+" y hasta "+money(capFor(active[index].id))+" USD";
 }
 function render(){
  const list=listEl();if(!list)return;
  const active=activeRows();
  list.innerHTML=active.map((row,index)=>{
   const id=Number(row.id),last=index===active.length-1,prev=index>0?capFor(active[index-1].id):null;
   const range=last?(active.length===1?"Cubre todos los importes en USD.":"Último rango: más de "+money(prev)+" USD, sin límite superior."):"";
   const limitField=last?"":'<label>Límite máximo de esta cuenta (USD)<input type="number" min="0.01" step="0.01" required data-zelle-max-amount="'+id+'" value="'+esc(row.max_amount??"")+'" placeholder="Ej. 300.00"></label>';
   return '<article class="admin-card" style="margin:0;padding:12px;border:1px solid var(--ei-line);box-shadow:none"><strong style="display:block;color:var(--ei-blue);margin-bottom:8px">Cuenta '+id+' · '+esc(rangeLabel(index,active))+'</strong>'+limitField+'<label>Correo o teléfono Zelle<input type="text" maxlength="180" autocomplete="off" data-zelle-account-value="'+id+'" value="'+esc(row.account_value||"")+'" placeholder="correo@ejemplo.com o teléfono"></label><label>Titular de la cuenta<input type="text" maxlength="180" data-zelle-account-holder="'+id+'" value="'+esc(row.account_holder||"")+'" placeholder="Nombre del titular"></label>'+(last?'<p class="settings-help" style="margin:5px 0 0">'+esc(range)+'</p>':"")+'</article>';
  }).join("");
  $("zelleAmountAccountCount").textContent=active.length+" de 10 cuentas habilitadas";
  $("addZelleAmountAccount").disabled=active.length>=10;
  $("removeZelleAmountAccount").disabled=active.length<=1;
  $("saveZelleAmountAccounts").disabled=false;
 }
 function updateLabels(){
  syncInputsToRows();const active=activeRows();
  active.forEach((row,index)=>{
   const card=listEl()?.querySelectorAll("article")[index];if(!card)return;
   const strong=card.querySelector("strong");if(strong)strong.textContent="Cuenta "+row.id+" · "+rangeLabel(index,active);
   const help=card.querySelector(".settings-help");if(help&&index===active.length-1)help.textContent=active.length===1?"Cubre todos los importes en USD.":"Último rango: más de "+money(capFor(active[index-1].id))+" USD, sin límite superior.";
  });
 }
 async function load(){
  const status=$("zelleAmountAccountsStatus");if(status)status.textContent="Cargando…";
  const {data,error}=await supabaseClient.from("zelle_amount_accounts").select("id,label,max_amount,account_value,account_holder,enabled,sort_order").order("sort_order",{ascending:true});
  if(error)throw error;
  rows=(Array.isArray(data)?data:[]).map(r=>({...r,max_amount:r.max_amount===null?null:Number(r.max_amount)}));
  if(rows.length!==10)throw new Error("No se encontraron las diez posiciones de cuentas Zelle.");
  rows.sort((a,b)=>Number(a.sort_order)-Number(b.sort_order));
  const active=activeRows();
  if(!active.length)throw new Error("Debe existir al menos una cuenta Zelle habilitada.");
  // Las cuentas activas deben estar en orden consecutivo para evitar rangos ambiguos.
  if(active.some((r,i)=>Number(r.id)!==i+1))throw new Error("Las cuentas habilitadas deben estar consecutivas desde la cuenta 1.");
  render();
  if(status)status.textContent=active.length+" cuentas habilitadas. La última cubre los importes superiores.";
 }
 function validate(){
  syncInputsToRows();const active=activeRows();
  if(!active.length||active.length>10)throw new Error("Debe haber entre 1 y 10 cuentas habilitadas.");
  if(active.some((r,i)=>Number(r.id)!==i+1))throw new Error("Las cuentas habilitadas deben estar consecutivas desde la cuenta 1.");
  let previous=0;
  for(let i=0;i<active.length-1;i++){
   const cap=Number(active[i].max_amount);
   if(!Number.isFinite(cap)||cap<=0)throw new Error("Introduce un límite positivo para la cuenta "+active[i].id+".");
   if(cap<=previous)throw new Error("Los límites deben aumentar estrictamente de una cuenta a la siguiente.");
   previous=cap;
  }
  return active;
 }
 function addAccount(){
  syncInputsToRows();const active=activeRows();if(active.length>=10)return;
  const last=active[active.length-1],previousCap=active.length>1?capFor(active[active.length-2].id):0;
  const lastLower=active.length>1?previousCap:0;
  last.max_amount=Number((lastLower+100).toFixed(2));
  const next=rows.find(r=>Number(r.id)===active.length+1);if(!next)return;
  next.enabled=true;next.sort_order=active.length+1;next.max_amount=null;
  render();updateLabels();
  const status=$("zelleAmountAccountsStatus");if(status)status.textContent="Nueva cuenta añadida. Revisa el límite sugerido y guarda los cambios.";
 }
 function removeAccount(){
  syncInputsToRows();const active=activeRows();if(active.length<=1)return;
  const last=active[active.length-1];last.enabled=false;last.max_amount=null;
  const newLast=active[active.length-2];newLast.max_amount=null;
  render();updateLabels();
  const status=$("zelleAmountAccountsStatus");if(status)status.textContent="Se quitó la última cuenta de los rangos activos. Guarda los cambios para aplicar.";
 }
 async function save(){
  const btn=$("saveZelleAmountAccounts"),status=$("zelleAmountAccountsStatus");
  try{
   const active=validate(),activeIds=new Set(active.map(r=>Number(r.id)));
   const payload=rows.map(row=>{
    const id=Number(row.id),index=active.findIndex(r=>Number(r.id)===id),enabled=activeIds.has(id);
    const max=enabled&&index<active.length-1?Number(row.max_amount):null;
    const label=enabled?rangeLabel(index,active):"Cuenta "+id+" (desactivada)";
    return {id,label,max_amount:max,account_value:String(row.account_value||"").trim(),account_holder:String(row.account_holder||"").trim(),enabled,sort_order:id,updated_at:new Date().toISOString()};
   });
   if(btn)btn.disabled=true;if(status)status.textContent="Guardando…";
   const {error}=await supabaseClient.from("zelle_amount_accounts").upsert(payload,{onConflict:"id"});if(error)throw error;
   rows=payload.map(r=>({...r,max_amount:r.max_amount===null?null:Number(r.max_amount)}));render();
   if(status)status.textContent="✅ "+active.length+" cuentas y límites guardados.";
  }catch(err){if(status)status.textContent="⚠️ No se pudo guardar.";alert("No se pudo guardar la configuración Zelle. "+(err.message||err))}
  finally{if(btn)btn.disabled=false}
 }
 window.loadZelleAmountAccountsAdmin=load;
 $("addZelleAmountAccount")?.addEventListener("click",addAccount);
 $("removeZelleAmountAccount")?.addEventListener("click",removeAccount);
 $("saveZelleAmountAccounts")?.addEventListener("click",save);
 listEl()?.addEventListener("input",updateLabels);
})();
