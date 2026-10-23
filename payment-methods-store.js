/* ElectroIsla 360: métodos de pago configurables y modalidad de cobro */
(function(){
 const form=document.getElementById("orderForm");
 const list=document.getElementById("paymentMethodsListStore");
 if(!form||!list||typeof supabaseClient==="undefined")return;
 let methods=[];
 const byId=id=>document.getElementById(id);
 const escPay=value=>String(value==null?"":value).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]});
 const timing=()=>form.querySelector('input[name="paymentTiming"]:checked')?.value||"PREPAID";
 const current=()=>{const el=form.querySelector('input[name="paymentMethod"]:checked');return methods.find(m=>m.code===el?.value)||null};
 function available(){
  const totals=getOrderTotals(),t=timing();
  return methods.filter(m=>m.enabled&&(t==="PREPAID"?m.supports_prepaid:m.supports_postdelivery)&&(m.currency==="USD"?totals.usdAvailable:totals.cupAvailable));
 }
 function render(){
  const totals=getOrderTotals(),postOption=byId("postDeliveryTimingOption"),postRadio=form.querySelector('input[name="paymentTiming"][value="POST_DELIVERY"]');
  const hasPost=methods.some(m=>m.enabled&&m.supports_postdelivery&&(m.currency==="USD"?totals.usdAvailable:totals.cupAvailable));
  if(postOption)postOption.style.display=hasPost?"":"none";
  if(!hasPost&&postRadio?.checked){const pre=form.querySelector('input[name="paymentTiming"][value="PREPAID"]');if(pre)pre.checked=true}
  const due=byId("paymentDueWrap");if(due)due.classList.toggle("hidden",timing()!=="POST_DELIVERY");
  const old=form.querySelector('input[name="paymentMethod"]:checked')?.value,items=available();
  list.innerHTML=items.length?items.map(function(m,i){return '<label class="payment-option"><input type="radio" name="paymentMethod" value="'+escPay(m.code)+'" '+(m.code===old||(!old&&i===0)?"checked":"")+'> <span>'+escPay(m.name)+' · '+escPay(m.currency)+'</span></label>'}).join(""):'<p class="payment-help">No hay métodos habilitados para esta modalidad y estos productos. Contacta con la tienda para coordinar el pago.</p>';
  if(!items.some(m=>m.code===old)&&items.length){const r=list.querySelector('input[name="paymentMethod"]');if(r)r.checked=true}
  summary();
 }
 function summary(){
  const box=byId("paymentSummary");if(!box)return;
  const m=current();if(!m){box.innerHTML="<span>Selecciona un método de pago disponible.</span>";return}
  const totals=getOrderTotals(),usd=m.currency==="USD",transfer=m.code==="TRANSFERENCIA",amount=usd?totals.usdTotal:transfer?totals.transferTotal:totals.cashTotal,fee=usd?totals.deliveryFeeUSD:transfer?totals.deliveryFeeTransfer:totals.deliveryFeeCUP;
  const details=m.account_details&&typeof m.account_details==="object"?Object.entries(m.account_details).filter(function(x){return String(x[1]??"").trim()}):[];
  let out="<strong>Total a pagar: "+escPay(money(amount,m.currency))+"</strong><span>"+(getDeliveryZone()?"Zona: "+escPay(getDeliveryZone()):"Selecciona una zona")+"</span><span>"+(fee>0?"Domicilio: "+escPay(money(fee,m.currency)):"Domicilio: Gratis")+"</span><span>Método seleccionado: "+escPay(m.name)+"</span>";
  if(timing()==="PREPAID")out+="<strong>Pago antes de la entrega</strong>";
  else {const days=Number(byId("paymentDueDays")?.value||3);out+="<strong>Pago después de la entrega</strong><span>Fecha límite elegida: "+new Date(Date.now()+days*86400000).toLocaleDateString("es-ES")+"</span>";}
  details.forEach(function(x){out+="<span><strong>"+escPay(x[0])+":</strong> "+escPay(x[1])+"</span>"});
  if(m.instructions)out+="<span><strong>Instrucciones:</strong> "+escPay(m.instructions)+"</span>";
  if(timing()==="POST_DELIVERY"&&m.postdelivery_terms)out+="<span><strong>Condiciones:</strong> "+escPay(m.postdelivery_terms)+"</span>";
  box.innerHTML=out;
 }
 async function load(){
  try{const res=await supabaseClient.from("payment_methods").select("code,name,currency,account_details,instructions,enabled,supports_prepaid,supports_postdelivery,postdelivery_terms,sort_order").eq("enabled",true).order("sort_order",{ascending:true}).order("name",{ascending:true});if(res.error)throw res.error;methods=res.data||[]}
  catch(e){console.warn("No se pudieron cargar métodos de pago",e);methods=[]}
  render();
 }
 form.addEventListener("change",function(e){if(e.target.matches('input[name="paymentTiming"]'))render();else if(e.target.matches('input[name="paymentMethod"],#paymentDueDays'))summary()});
 form.addEventListener("submit",async function(e){
  e.preventDefault();e.stopImmediatePropagation();
  const m=current(),t=timing(),totals=getOrderTotals();
  if(!m){alert("No hay un método habilitado para la modalidad elegida.");return}
  if(t==="PREPAID"&&!m.supports_prepaid||t==="POST_DELIVERY"&&!m.supports_postdelivery){alert("Este método no está habilitado para esa modalidad.");return}
  const usd=m.currency==="USD",transfer=m.code==="TRANSFERENCIA";
  if(usd&&!totals.usdAvailable){alert("Este método en USD no está disponible para estos productos.");return}
  if(!usd&&!totals.cupAvailable){alert("Los métodos en CUP solo están disponibles para pedidos de electrodomésticos.");return}
  const zone=byId("municipality").value,other=byId("otherZone").value.trim();
  if(!zone){alert("Selecciona la zona de entrega.");return}if(zone==="Otro"&&!other){alert("Escribe cuál es tu zona de entrega.");return}
  const name=byId("customerName").value.trim(),phone=(byId("customerPhoneCode").value==="+1-CA"?"+1":byId("customerPhoneCode").value)+byId("customerPhone").value.trim();
  const recipientName=byId("recipientName").value.trim(),recipientAddress=byId("recipientAddress").value.trim(),recipientPhone=(byId("recipientPhoneCode").value==="+1-CA"?"+1":byId("recipientPhoneCode").value)+byId("recipientPhone").value.trim(),note=byId("note").value.trim();
  if(!recipientName||!recipientAddress||!recipientPhone){alert("Completa el nombre, la dirección y el teléfono de quien recibe el pedido.");return}
  const zoneName=zone==="Otro"?other:zone,amount=usd?totals.usdTotal:transfer?totals.transferTotal:totals.cashTotal,delivery=usd?totals.deliveryFeeUSD:transfer?totals.deliveryFeeTransfer:totals.deliveryFeeCUP,subtotal=Math.max(0,amount-delivery);
  const days=Number(byId("paymentDueDays")?.value||3),dueAt=t==="POST_DELIVERY"?new Date(Date.now()+days*86400000).toISOString():null;
  const details=m.account_details&&typeof m.account_details==="object"?Object.entries(m.account_details).map(function(x){return x[0]+": "+x[1]}).join("\n"):"";
  const lines=cart.map(function(i){const p=products.find(x=>x.id===i.id);if(!p)return "";const price=effectivePrice(p),line=usd?money(price*i.qty,"USD"):transfer?money(transferCup(p)*i.qty,"CUP"):money(cashCup(p)*i.qty,"CUP");return "• "+p.name+" — "+i.qty+" "+(p.unit||"unidad")+" — "+line}).filter(Boolean).join("\n");
  const when=t==="PREPAID"?"Antes de la entrega":"Después de la entrega (plazo de "+days+" día(s), fecha límite "+new Date(dueAt).toLocaleDateString("es-ES")+")";
  const msg="🛒 NUEVO PEDIDO\n\n👤 PERSONA QUE REALIZA EL PEDIDO\nNombre: "+name+"\nTeléfono: "+phone+"\n\n📦 PERSONA QUE RECIBE EL PEDIDO\nNombre: "+recipientName+"\nDirección: "+recipientAddress+"\nTeléfono: "+recipientPhone+"\n\n🛍️ PRODUCTOS:\n"+lines+"\n\n📍 Zona de entrega: "+zoneName+"\n\n💳 MÉTODO DE PAGO: "+m.name+" ("+m.code+")\n🕒 MOMENTO DE PAGO: "+when+"\n"+(details?"🏦 DATOS DE PAGO:\n"+details+"\n":"")+(m.instructions?"📋 INSTRUCCIONES: "+m.instructions+"\n":"")+(t==="POST_DELIVERY"&&m.postdelivery_terms?"📅 CONDICIONES: "+m.postdelivery_terms+"\n":"")+"🧾 Subtotal: "+money(subtotal,m.currency)+"\n🚚 Domicilio: "+(delivery>0?money(delivery,m.currency):"Gratis")+"\n💰 TOTAL A PAGAR: "+money(amount,m.currency)+(note?"\n📝 Nota: "+note:"");
  try{
   const items=cart.map(function(i){const p=products.find(x=>x.id===i.id);if(!p)return null;const price=Number(effectivePrice(p))||0,qty=Number(i.qty)||0;return {id:String(p.id),name:p.name||"",category:p.category||"",qty:qty,unit:p.unit||"",unit_price:price,line_total:price*qty}}).filter(Boolean);
   const res=await supabaseClient.from("orders").insert({customer_name:name,customer_phone:phone,delivery_zone:zoneName,payment_method:m.code,payment_timing:t,payment_due_at:dueAt,payment_status:"PENDING",currency:m.currency,subtotal:subtotal,delivery_fee:delivery,total:amount,items:items,note:["DATOS DE QUIEN RECIBE EL PEDIDO: "+recipientName+"; Dirección: "+recipientAddress+"; Teléfono: "+recipientPhone,note].filter(Boolean).join("\n"),status:"sent"});
   if(res.error)console.warn("No se pudo registrar el pedido para el reporte:",res.error);
  }catch(err){console.warn("No se pudo registrar el pedido para el reporte:",err)}
  if(typeof markWhatsAppPending==="function")markWhatsAppPending();
  window.open("https://wa.me/5352017110?text="+encodeURIComponent(msg),"_blank");
 },true);
 load();
 try{supabaseClient.channel("payment-methods-checkout").on("postgres_changes",{event:"*",schema:"public",table:"payment_methods"},load).subscribe()}catch(e){}
})();