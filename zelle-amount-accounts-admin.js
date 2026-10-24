/* ElectroIsla 360: configuración de cuatro cuentas Zelle por importe. */
(function(){
 const $=id=>document.getElementById(id);let rows=[];
 const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 function limits(){return [Number($("zelleAmountMax1")?.value),Number($("zelleAmountMax2")?.value),Number($("zelleAmountMax3")?.value)]}
 function rangeLabel(id,caps){if(id===1)return "Hasta "+caps[0].toFixed(2)+" USD";if(id===2)return "Más de "+caps[0].toFixed(2)+" y hasta "+caps[1].toFixed(2)+" USD";if(id===3)return "Más de "+caps[1].toFixed(2)+" y hasta "+caps[2].toFixed(2)+" USD";return "Más de "+caps[2].toFixed(2)+" USD"}
 function render(){
  const list=$("zelleAmountAccountsList");if(!list)return;let caps=limits();
  if(caps.some(v=>!Number.isFinite(v))||!(caps[0]<caps[1]&&caps[1]<caps[2]))caps=[50,100,200];
  list.innerHTML=rows.map(row=>{const id=Number(row.id);return '<article class="admin-card" style="margin:0;padding:12px;border:1px solid var(--ei-line);box-shadow:none"><strong data-zelle-range-label="'+id+'" style="display:block;color:var(--ei-blue);margin-bottom:8px">Cuenta '+id+' · '+esc(rangeLabel(id,caps))+'</strong><label>Correo o teléfono Zelle<input type="text" maxlength="180" autocomplete="off" data-zelle-account-value="'+id+'" value="'+esc(row.account_value||"")+'" placeholder="correo@ejemplo.com o teléfono"></label><label>Titular de la cuenta<input type="text" maxlength="180" data-zelle-account-holder="'+id+'" value="'+esc(row.account_holder||"")+'" placeholder="Nombre del titular"></label></article>'}).join("");
 }
 async function load(){
  const status=$("zelleAmountAccountsStatus");if(status)status.textContent="Cargando…";
  const {data,error}=await supabaseClient.from("zelle_amount_accounts").select("id,label,max_amount,account_value,account_holder,enabled,sort_order").order("sort_order",{ascending:true});
  if(error)throw error;rows=Array.isArray(data)?data:[];if(rows.length!==4)throw new Error("La configuración debe contener las cuatro cuentas.");
  const caps=rows.slice(0,3).map(r=>Number(r.max_amount));$("zelleAmountMax1").value=String(caps[0]);$("zelleAmountMax2").value=String(caps[1]);$("zelleAmountMax3").value=String(caps[2]);render();
  if(status)status.textContent=rows[0].account_value&&rows.slice(1).some(r=>!r.account_value)?"Cuenta 1 precargada; faltan cuentas por completar.":"☁️ Cuatro rangos cargados.";
 }
 function updateRangeLabels(){
  const caps=limits();if(caps.some(v=>!Number.isFinite(v))||!(caps[0]<caps[1]&&caps[1]<caps[2]))return;
  rows.forEach(row=>{const id=Number(row.id),el=$("zelleAmountAccountsList")?.querySelector('[data-zelle-range-label="'+id+'"]');if(el)el.textContent="Cuenta "+id+" · "+rangeLabel(id,caps)});
 }
 function validCaps(){const caps=limits();if(caps.some(v=>!Number.isFinite(v)||v<=0)||!(caps[0]<caps[1]&&caps[1]<caps[2]))throw new Error("Los límites deben ser positivos y aumentar en orden: límite 1 < límite 2 < límite 3.");return caps}
 async function save(){
  const btn=$("saveZelleAmountAccounts"),status=$("zelleAmountAccountsStatus");
  try{
   const caps=validCaps(),list=$("zelleAmountAccountsList");
   const payload=rows.map(row=>{const id=Number(row.id),accountValue=list.querySelector('[data-zelle-account-value="'+id+'"]').value.trim(),accountHolder=list.querySelector('[data-zelle-account-holder="'+id+'"]').value.trim();return {id,label:rangeLabel(id,caps),max_amount:id<=3?caps[id-1]:null,account_value:accountValue,account_holder:accountHolder,enabled:true,sort_order:id,updated_at:new Date().toISOString()}});
   if(btn)btn.disabled=true;if(status)status.textContent="Guardando…";
   const {error}=await supabaseClient.from("zelle_amount_accounts").upsert(payload,{onConflict:"id"});if(error)throw error;
   rows=payload;render();if(status)status.textContent="✅ Cuentas y límites guardados.";
  }catch(err){if(status)status.textContent="⚠️ No se pudo guardar.";alert("No se pudo guardar la configuración Zelle. "+(err.message||err))}
  finally{if(btn)btn.disabled=false}
 }
 window.loadZelleAmountAccountsAdmin=load;
 ["zelleAmountMax1","zelleAmountMax2","zelleAmountMax3"].forEach(id=>$(id)?.addEventListener("input",updateRangeLabels));
 $("saveZelleAmountAccounts")?.addEventListener("click",save);
})();