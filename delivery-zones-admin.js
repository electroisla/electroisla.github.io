/* ElectroIsla · Administración de zonas de domicilio
   Sección autogenerada para admin.html. Seguridad de escritura: políticas RLS de Supabase. */
(function(){
 const $=id=>document.getElementById(id);
 let zones=[], editingId=null, busy=false;
 const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
 const money=v=>"$"+(Number(v)||0).toFixed(2)+" USD";
 const status=m=>{const e=$("deliveryZonesStatus");if(e)e.textContent=m};
 function installUI(){
   if(!$("dashboard")||$("deliveryZonesPanel"))return;
   const style=document.createElement("style");
   style.textContent=`
   #deliveryZonesPanel{margin:18px 0;border:1px solid #dce7f2;border-radius:16px;padding:18px;background:#fff}
   #deliveryZonesPanel h2{color:#0757a6;margin:0 0 8px}
   #deliveryZoneForm{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:14px 0}
   #deliveryZoneForm label{display:flex;flex-direction:column;gap:6px;font-size:.92rem;color:#26384b}
   #deliveryZoneForm input:not([type=checkbox]){box-sizing:border-box;width:100%;padding:11px;border:1px solid #cbd8e5;border-radius:10px;font:inherit}
   #deliveryZoneForm .delivery-zone-check{flex-direction:row;align-items:center;gap:8px}
   .delivery-zone-row{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:13px 0;border-top:1px solid #e5edf5}
   .delivery-zone-main{display:flex;flex-direction:column;gap:4px;min-width:0}.delivery-zone-main strong{color:#064887;overflow-wrap:anywhere}
   .delivery-zone-main span{font-size:.9rem}.delivery-zone-main small{color:#68798a}
   .delivery-zone-actions{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}
   .delivery-zone-actions button{padding:7px 10px!important;min-width:38px}
   .delivery-zone-row.is-hidden-zone{opacity:.65;background:#f8fafc}
   #deliveryZonesStatus{font-size:.9rem;color:#526477;margin:8px 0}
   @media(max-width:600px){#deliveryZonesPanel{padding:13px}.delivery-zone-row{align-items:flex-start;flex-direction:column}.delivery-zone-actions{justify-content:flex-start}}
   `;
   document.head.appendChild(style);
   const panel=document.createElement("section");
   panel.id="deliveryZonesPanel";panel.className="admin-card";
   panel.innerHTML=`
     <h2>🚚 Zonas y costos de domicilio</h2>
     <p>Agrega zonas, cambia sus precios, ocúltalas o ajusta el orden en que aparecen en la tienda.</p>
     <p id="deliveryZonesStatus" role="status">Esperando conexión con Supabase…</p>
     <form id="deliveryZoneForm">
       <input type="hidden" id="deliveryZoneId">
       <label>Nombre de la zona<input id="deliveryZoneName" maxlength="100" required placeholder="Ej. Nueva zona"></label>
       <label>Costo del domicilio (USD)<input id="deliveryZoneFee" type="number" min="0" step="0.01" required value="0"></label>
       <label>Orden de aparición<input id="deliveryZoneOrder" type="number" min="1" step="1" required value="1"></label>
       <label class="delivery-zone-check"><input id="deliveryZoneAvailable" type="checkbox" checked> Visible en la tienda</label>
       <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
         <button class="btn primary" id="deliveryZoneSave" type="submit">Guardar zona</button>
         <button class="btn secondary hidden" id="deliveryZoneCancel" type="button">Cancelar edición</button>
       </div>
     </form>
     <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;margin:10px 0">
       <strong>Zonas registradas</strong><button class="btn secondary" id="deliveryZonesRefresh" type="button">🔄 Actualizar</button>
     </div>
     <div id="deliveryZonesList"></div>`;
   const dashboard=$("dashboard");
   const anchor=dashboard.querySelector(".admin-title");
   if(anchor&&anchor.nextSibling)dashboard.insertBefore(panel,anchor.nextSibling);else dashboard.prepend(panel);
 }
 function reset(){editingId=null;$("deliveryZoneForm").reset();$("deliveryZoneId").value="";$("deliveryZoneSave").textContent="Guardar zona";$("deliveryZoneCancel").classList.add("hidden");$("deliveryZoneAvailable").checked=true;$("deliveryZoneOrder").value=String(zones.length+1)}
 function render(){
   const list=$("deliveryZonesList");if(!list)return;
   if(!zones.length){list.innerHTML='<p>No hay zonas registradas.</p>';return}
   list.innerHTML=zones.map((z,i)=>'<article class="delivery-zone-row '+(z.available?'':'is-hidden-zone')+'"><div class="delivery-zone-main"><strong>'+esc(z.name)+'</strong><span>'+money(z.fee_usd)+' · Orden '+(Number(z.sort_order)||0)+'</span><small>'+(z.available?'Visible en la tienda':'Oculta en la tienda')+'</small></div><div class="delivery-zone-actions"><button class="btn secondary" type="button" data-zone-edit="'+esc(z.id)+'">Editar</button><button class="btn secondary" type="button" data-zone-toggle="'+esc(z.id)+'">'+(z.available?'Ocultar':'Mostrar')+'</button><button class="btn secondary" type="button" data-zone-up="'+esc(z.id)+'" '+(i===0?'disabled':'')+' aria-label="Subir zona">↑</button><button class="btn secondary" type="button" data-zone-down="'+esc(z.id)+'" '+(i===zones.length-1?'disabled':'')+' aria-label="Bajar zona">↓</button><button class="btn secondary" type="button" data-zone-delete="'+esc(z.id)+'">Eliminar</button></div></article>').join("");
 }
 async function load(force=false){
   if(!supabaseClient||(busy&&!force))return;
   busy=true;status("☁️ Cargando zonas desde Supabase…");
   try{const {data,error}=await supabaseClient.from("delivery_zones").select("id,name,fee_usd,sort_order,available").order("sort_order",{ascending:true}).order("name",{ascending:true});if(error)throw error;zones=data||[];render();status("☁️ "+zones.length+" zonas cargadas. Los cambios se guardan en Supabase.");if(!editingId)$("deliveryZoneOrder").value=String(zones.length+1)}
   catch(err){status("⚠️ No se pudieron cargar las zonas: "+(err.message||err));console.error("Zonas de domicilio:",err)}
   finally{busy=false}
 }
 async function save(e){
   e.preventDefault();if(busy)return;
   const name=$("deliveryZoneName").value.trim(),fee=Number($("deliveryZoneFee").value),order=Number.parseInt($("deliveryZoneOrder").value,10);
   if(!name){alert("Escribe el nombre de la zona.");return}if(!Number.isFinite(fee)||fee<0){alert("El costo debe ser 0 o mayor.");return}if(!Number.isInteger(order)||order<1){alert("El orden debe ser un número entero mayor que 0.");return}
   const payload={name,fee_usd:fee,sort_order:order,available:$("deliveryZoneAvailable").checked};busy=true;$("deliveryZoneSave").disabled=true;status("Guardando zona…");
   try{const result=editingId?await supabaseClient.from("delivery_zones").update(payload).eq("id",editingId):await supabaseClient.from("delivery_zones").insert(payload);if(result.error)throw result.error;editingId=null;busy=false;await load(true);reset();status("✅ Zona guardada en Supabase.")}
   catch(err){status("⚠️ No se guardó la zona: "+(err.message||err));alert("No se pudo guardar la zona. Comprueba que el nombre no esté repetido.\n\n"+(err.message||err))}
   finally{busy=false;$("deliveryZoneSave").disabled=false}
 }
 async function updateZone(id,changes){
   if(busy)return;const z=zones.find(x=>String(x.id)===String(id));if(!z)return;busy=true;status("Guardando cambio…");
   try{const {error}=await supabaseClient.from("delivery_zones").update(changes).eq("id",z.id);if(error)throw error;busy=false;await load(true);status("✅ Cambio guardado en Supabase.")}
   catch(err){status("⚠️ No se pudo guardar: "+(err.message||err));alert("No se pudo guardar el cambio.\n\n"+(err.message||err))}
   finally{busy=false}
 }
   
 async function removeZone(id){
   if(busy)return;
   const z=zones.find(x=>String(x.id)===String(id));
   if(!z)return;
   if(!confirm('¿Seguro que deseas eliminar la zona "'+z.name+'"? Esta acción no se puede deshacer.'))return;
   busy=true;
   status("Eliminando zona…");
   try{
     const {error}=await supabaseClient.from("delivery_zones").delete().eq("id",z.id);
     if(error)throw error;
     if(String(editingId)===String(z.id))reset();
     busy=false;
     await load(true);
     status("✅ Zona eliminada correctamente.");
   }catch(err){
     status("⚠️ No se pudo eliminar la zona: "+(err.message||err));
     alert("No se pudo eliminar la zona.\n\n"+(err.message||err));
   }finally{
     busy=false;
 }
   async function move(id,d){
   const i=zones.findIndex(z=>String(z.id)===String(id)),n=i+d;if(i<0||n<0||n>=zones.length||busy)return;
   const a=zones[i],b=zones[n],ao=a.sort_order,bo=b.sort_order;busy=true;status("Actualizando orden…");
   try{let r=await supabaseClient.from("delivery_zones").update({sort_order:bo}).eq("id",a.id);if(r.error)throw r.error;r=await supabaseClient.from("delivery_zones").update({sort_order:ao}).eq("id",b.id);if(r.error)throw r.error;busy=false;await load(true);status("✅ Orden actualizado.")}
   catch(err){status("⚠️ No se pudo cambiar el orden: "+(err.message||err));busy=false;await load(true)}
   finally{busy=false}
 }
 function edit(id){
   const z=zones.find(x=>String(x.id)===String(id));if(!z)return;editingId=z.id;$("deliveryZoneId").value=String(z.id);$("deliveryZoneName").value=z.name;$("deliveryZoneFee").value=String(z.fee_usd);$("deliveryZoneOrder").value=String(z.sort_order||1);$("deliveryZoneAvailable").checked=z.available!==false;$("deliveryZoneSave").textContent="Guardar cambios";$("deliveryZoneCancel").classList.remove("hidden");$("deliveryZoneName").focus();$("deliveryZoneForm").scrollIntoView({behavior:"smooth",block:"center"})
 }
 function setup(){
   if(!$("dashboard")||$("deliveryZonesList"))return;
   installUI();$("deliveryZoneForm").addEventListener("submit",save);$("deliveryZoneCancel").addEventListener("click",reset);$("deliveryZonesRefresh").addEventListener("click",()=>load(true));
   
   $("deliveryZonesList").addEventListener("click",e=>{
     const b=e.target.closest("button");
     if(!b)return;
     if(b.dataset.zoneEdit)edit(b.dataset.zoneEdit);
     else if(b.dataset.zoneToggle){
       const z=zones.find(x=>String(x.id)===b.dataset.zoneToggle);
       if(z)updateZone(z.id,{available:!z.available});
     }else if(b.dataset.zoneUp)move(b.dataset.zoneUp,-1);
     else if(b.dataset.zoneDown)move(b.dataset.zoneDown,1);
     else if(b.dataset.zoneDelete)removeZone(b.dataset.zoneDelete);
   });
   reset();const dash=$("dashboard");const obs=new MutationObserver(()=>{if(dash&&!dash.classList.contains("hidden"))load(true)});obs.observe(dash,{attributes:true,attributeFilter:["class"]});
   supabaseClient?.auth?.getSession().then(({data})=>{if(data?.session&&!dash.classList.contains("hidden"))load(true)});
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",setup);else setup();
})();
