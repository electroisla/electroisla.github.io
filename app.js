// ElectroIsla 9.8.1
const WHATSAPP="5352017110";
const defaultProducts=[
{id:"a1",name:"Carne de cerdo",category:"Alimentos",price:12.5,currency:"USD",discountPrice:null,unit:"kg",image:"",description:"Carne de cerdo.",available:true},
{id:"a2",name:"Aceite",category:"Alimentos",price:8,currency:"USD",discountPrice:null,unit:"botella",image:"",description:"Aceite para cocina.",available:true},
{id:"a3",name:"Pescado",category:"Alimentos",price:10,currency:"USD",discountPrice:null,unit:"kg",image:"",description:"Pescado.",available:true},
{id:"a4",name:"Combo de alimentos",category:"Alimentos",price:35,currency:"USD",discountPrice:null,unit:"combo",image:"",description:"Combo promocional.",available:true},
{id:"e1",name:"Split",category:"Electrodomésticos",price:270,currency:"USD",discountPrice:null,unit:"unidad",image:"",description:"Aire acondicionado Split.",available:true},
{id:"e2",name:"Ventilador recargable",category:"Electrodomésticos",price:65,currency:"USD",discountPrice:null,unit:"unidad",image:"",description:"Ventilador recargable.",available:true},
{id:"e3",name:"Lavadora",category:"Electrodomésticos",price:320,currency:"USD",discountPrice:null,unit:"unidad",image:"",description:"Lavadora.",available:true},
{id:"e4",name:"Cocina",category:"Electrodomésticos",price:180,currency:"USD",discountPrice:null,unit:"unidad",image:"",description:"Cocina doméstica.",available:true}
];
function readLocalJSON(key,fallback){
  try{
    const raw=localStorage.getItem(key);
    return raw===null?fallback:JSON.parse(raw);
  }catch(err){
    console.warn(`Datos locales inválidos en ${key}; se utilizará el valor predeterminado.`,err);
    return fallback;
  }
}
const localProducts=readLocalJSON("electroisla_products",[]);
const localCart=readLocalJSON("electroisla_cart",[]);
const localCategories=readLocalJSON("electroisla_categories",null);
let products=Array.isArray(localProducts)?localProducts:[];
let cart=Array.isArray(localCart)?localCart:[];
let categories=Array.isArray(localCategories)?localCategories:[...new Set(defaultProducts.map(p=>p.category).filter(Boolean))].map((name,index)=>({id:`local-${index}`,name,sort_order:index+1,available:true}));
let storeSettings={usd_to_cup:700,transfer_markup_percent:0};
const currencySymbols={USD:"$",CUP:"$",EUR:"€"};
const money=(n,currency="USD")=>(currencySymbols[currency]||"")+Number(n).toFixed(2)+" "+currency;
const effectivePrice=p=>Number.isFinite(Number(p.discountPrice))&&Number(p.discountPrice)>0&&Number(p.discountPrice)<Number(p.price)?Number(p.discountPrice):Number(p.price);
const cashCup=p=>{const base=effectivePrice(p);if((p.currency||"USD")==="USD")return base*Number(storeSettings.usd_to_cup||0);if((p.currency||"USD")==="CUP")return base;return null};
const transferCup=p=>{const cash=cashCup(p);return cash===null?null:cash*(1+Number(storeSettings.transfer_markup_percent||0)/100)};
// Tarifas de respaldo: deben coincidir con delivery_zones en Supabase.
const DELIVERY_FEES={
 "Nueva Gerona":0,
 "Mal Pais":4,
 "Micro 2":0,
 "Frank País":5,
 "Argelia":10,
 "La Reforma":10,
 "La Caoba":2,
 "Comunidad la 53":3,
 "La Tumbita":5,
 "Micro 70":0,
 "Abel Santa María":0,
 "Pueblo Nuevo":0,
 "Francoi":0,
 "Sierra Caballos":0,
 "Nazareno":0,
 "Chacón":2,
 "Patria":3,
 "Los Colonos":2,
 "Los Bejeranos":2,
 "La Fe":5,
 "Demajagua":5,
 "La Victoria":7,
 "Atanagildo":7,
 "Mella":10,
 "Ciro Redondo":5,
 "Otro":10
};
function getDeliveryZone(){
 const zone=document.getElementById("municipality")?.value||"";
 const other=document.getElementById("otherZone")?.value.trim()||"";
 return zone==="Otro"?(other?`Otro: ${other}`:"Otro"):zone;
}
function getDeliveryFeeUSD(){
 const zoneSelect=document.getElementById("municipality");
 const zone=zoneSelect?.value||"";
 if(!zone)return 0;
 const selectedOption=zoneSelect?.selectedOptions?.[0];
 const optionFee=selectedOption?.dataset?.fee;
 if(optionFee!==undefined && optionFee!=="") return Number(optionFee)||0;
 return Number(DELIVERY_FEES[zone]||0);
}
function updateDeliveryFields(){
 const zone=document.getElementById("municipality")?.value||"";
 const wrap=document.getElementById("otherZoneWrap");
 const input=document.getElementById("otherZone");
 if(wrap)wrap.classList.toggle("hidden",zone!=="Otro");
 if(input){
  input.required=zone==="Otro";
  if(zone!=="Otro")input.value="";
 }
 updatePaymentSummary();
}
function setupPhoneCodePicker(selectId,pickerId,triggerId,menuId,textId){
 const select=document.getElementById(selectId),picker=document.getElementById(pickerId),trigger=document.getElementById(triggerId),menu=document.getElementById(menuId),textBox=document.getElementById(textId);
 if(!select||!picker||!trigger||!menu||!textBox)return;
 menu.innerHTML=[...select.options].map(o=>'<button type="button" class="delivery-option" data-value="'+esc(o.value)+'" role="option" aria-selected="'+o.selected+'"><span>'+esc(o.textContent)+'</span></button>').join("");
 function sync(){const o=select.options[select.selectedIndex];textBox.textContent=o?o.textContent:"Selecciona país";menu.querySelectorAll(".delivery-option").forEach(b=>{const active=b.dataset.value===select.value;b.classList.toggle("active",active);b.setAttribute("aria-selected",String(active));});}
 function close(){picker.classList.remove("open");trigger.setAttribute("aria-expanded","false");}
 trigger.addEventListener("click",()=>{const open=!picker.classList.contains("open");picker.classList.toggle("open",open);trigger.setAttribute("aria-expanded",String(open));});
 menu.addEventListener("click",e=>{const b=e.target.closest(".delivery-option");if(!b)return;select.value=b.dataset.value;select.dispatchEvent(new Event("change",{bubbles:true}));sync();close();});
 select.addEventListener("change",sync);
 document.addEventListener("click",e=>{if(!picker.contains(e.target))close();});
 document.addEventListener("keydown",e=>{if(e.key==="Escape")close();});
 sync();
}
function setupDeliveryPicker(){
 const select=document.getElementById("municipality");
 const picker=document.getElementById("deliveryPicker");
 const trigger=document.getElementById("deliveryTrigger");
 const menu=document.getElementById("deliveryMenu");
 const textBox=document.getElementById("deliverySelectedText");
 const feeBox=document.getElementById("deliverySelectedFee");
 if(!select||!picker||!trigger||!menu)return;
 const options=[...select.options];
 menu.innerHTML=options.map((o,index)=>{
   const fee=o.dataset.fee;
   const feeText=o.value===""?"":(Number(fee||0)>0?`${fee} USD`:"Gratis");
   return `<button type="button" class="delivery-option${o.value===""?" placeholder-option":""}" data-value="${esc(o.value)}" role="option" aria-selected="${o.selected}"><span>${esc(o.value?o.value:o.textContent)}</span>${feeText?`<b>${feeText}</b>`:""}</button>`;
 }).join("");
 function sync(){
   const o=select.options[select.selectedIndex];
   const value=select.value;
   textBox.textContent=value?o.textContent.split(" — ")[0]:"Selecciona tu zona";
   feeBox.textContent=value?(Number(o.dataset.fee||0)>0?`${o.dataset.fee} USD`:"Gratis"):"—";
   menu.querySelectorAll(".delivery-option").forEach(btn=>{
     const active=btn.dataset.value===value;
     btn.classList.toggle("active",active);
     btn.setAttribute("aria-selected",String(active));
   });
 }
 function close(){picker.classList.remove("open");trigger.setAttribute("aria-expanded","false");}
 trigger.addEventListener("click",()=>{const open=!picker.classList.contains("open");picker.classList.toggle("open",open);trigger.setAttribute("aria-expanded",String(open));});
 menu.addEventListener("click",e=>{
   const btn=e.target.closest(".delivery-option");
   if(!btn)return;
   select.value=btn.dataset.value;
   select.dispatchEvent(new Event("change",{bubbles:true}));
   sync();
   close();
 });
 select.addEventListener("change",sync);
 document.addEventListener("click",e=>{if(!picker.contains(e.target))close();});
 document.addEventListener("keydown",e=>{if(e.key==="Escape")close();});
 sync();
}

function priceMarkup(p){const cur=p.currency||"USD",sym=currencySymbols[cur]||"";const discounted=effectivePrice(p)<Number(p.price);const original=discounted?`<span class="old-price">${sym}${Number(p.price).toFixed(2)} ${cur}</span> `:"";return `${original}<span class="discount-price">${sym}${effectivePrice(p).toFixed(2)} ${cur}</span>`;}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
async function loadStoreSettings(){const {data,error}=await supabaseClient.from("store_settings").select("usd_to_cup,transfer_markup_percent").eq("id",1).maybeSingle();if(error)throw error;if(data){storeSettings={usd_to_cup:Number(data.usd_to_cup)||0,transfer_markup_percent:Number(data.transfer_markup_percent)||0}}}
async function loadCloudCategories(){const {data,error}=await supabaseClient.from("categories").select("id,name,sort_order,available").order("sort_order",{ascending:true}).order("name",{ascending:true});if(error)throw error;categories=(data||[]).filter(c=>c.available!==false&&String(c.name||"").trim()).map(c=>({id:c.id,name:String(c.name).trim(),sort_order:Number(c.sort_order)||0,available:true}));saveCategories();return true}
function saveCategories(){localStorage.setItem("electroisla_categories",JSON.stringify(categories))}
function save(){
  try{
    localStorage.setItem("electroisla_products",JSON.stringify(products.map(p=>({...p,image:""}))));
  }catch(err){
    console.warn("Catálogo no guardado localmente; se conserva en Supabase.",err);
  }
  try{
    localStorage.setItem("electroisla_cart",JSON.stringify(cart));
  }catch(err){
    console.warn("No se pudo guardar el carrito localmente.",err);
  }
}

function fromRow(r){return{id:String(r.id),name:r.name||"",category:r.category||"Alimentos",price:Number(r.price)||0,currency:r.currency||"USD",discountPrice:r.discount_price===null||r.discount_price===undefined||Number(r.discount_price)<=0?null:Number(r.discount_price),unit:r.unit||"",image:r.image||"",description:r.description||"",available:r.available!==false}}
// Cliente de solo lectura para el catálogo público: no reutiliza una sesión
// de administrador/cliente que pueda necesitar renovar tokens antes de consultar.
const catalogReadClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
);

async function loadCloudProducts(){
  // No descargar las imágenes grandes junto con los datos ligeros del catálogo.
  const {data,error}=await catalogReadClient
    .from("products")
    .select("id,name,category,price,discount_price,currency,unit,description,available");

  if(error) throw error;
  if(!Array.isArray(data) || data.length===0){
    throw new Error("Supabase devolvió un catálogo vacío; se reintentará la consulta.");
  }

  const previousById=new Map(products.map(p=>[String(p.id),p]));
  products=data.map(row=>{
    const p=fromRow(row);
    // Las imágenes no se recuperan de localStorage: se solicitan a Supabase bajo demanda.
    return p;
  });
  save();
  return true;
}

async function loadCloudProductsWithRetry(maxAttempts=3){
  let lastError;
  for(let attempt=1;attempt<=maxAttempts;attempt++){
    try{
      await loadCloudProducts();
      return true;
    }catch(err){
      lastError=err;
      console.warn(`Intento ${attempt}/${maxAttempts} de cargar productos fallido.`,err);
      if(attempt<maxAttempts){
        await new Promise(resolve=>setTimeout(resolve,attempt*1000));
      }
    }
  }
  throw lastError;
}
async function loadApprovedReviews(){
 try{
  const {data,error}=await supabaseClient.from("reviews").select("id,product_id,rating,reviewer_name,comment,created_at").eq("approved",true).order("created_at",{ascending:false});
  if(error)throw error;
  reviewsByProduct={};
  (data||[]).forEach(r=>{const key=String(r.product_id);(reviewsByProduct[key]||(reviewsByProduct[key]=[])).push(r)});
  reviewsLoaded=true;
 }catch(err){
  reviewsByProduct={};
  reviewsLoaded=false;
  console.warn("Reseñas no disponibles; la tienda continúa normalmente.",err);
 }
}
function reviewSummary(productId){
 const list=reviewsByProduct[String(productId)]||[];
 if(!list.length)return {count:0,avg:0};
 const avg=list.reduce((s,r)=>s+Number(r.rating||0),0)/list.length;
 return {count:list.length,avg};
}
function reviewStars(value){
 const rounded=Math.round(Number(value)||0);
 return Array.from({length:5},(_,i)=>i<rounded?"★":"☆").join("");
}
function renderReviewBadge(p){
 const r=reviewSummary(p.id);
 if(!r.count)return '<button type="button" class="product-review-link" data-review-product="'+esc(p.id)+'">☆ Sé el primero en reseñar</button>';
 return '<button type="button" class="product-review-summary" data-review-product="'+esc(p.id)+'" aria-label="Ver reseñas de '+esc(p.name)+'"><span class="review-stars">'+reviewStars(r.avg)+'</span><span>'+r.avg.toFixed(1)+' · '+r.count+' reseña'+(r.count===1?'':'s')+'</span></button>';
}
async function startCloud(){
  // Iniciar la consulta de productos inmediatamente: no esperar a que terminen
  // ajustes, categorías o reseñas para mostrar el catálogo.
  window.catalogLoading = products.length === 0;

  // Si el navegador ya tiene un catálogo guardado, dibujar inmediatamente
  // las tarjetas completas y habilitar sus controles antes de consultar Supabase.
  if(products.length){
    window.catalogLoading = false;
    render(currentFilter);
    renderCart();
  }else if(!window.__electroislaFastCatalog){
    render();
  }

  const productsTask = (async()=>{
    try{
      await loadCloudProductsWithRetry();
      window.catalogLoadError = "";
      window.catalogLoading = false;
      renderCategoryTabs();
      renderCategoryMenu();
      render();
      renderCart();
      renderCartRecommendations();
    }catch(err){
      window.catalogLoadError = String(err?.message || err || "Error desconocido");
      window.catalogLoading = false;
      console.error("Error al cargar productos de Supabase tras varios intentos:", err);
      render();
      renderCart();
    }
  })();

  // Estos datos complementarios se cargan en paralelo y actualizan la vista
  // cuando están listos, sin bloquear la primera aparición de los productos.
  const settingsTask = loadStoreSettings()
    .then(()=>{ updatePaymentSummary(); renderCart(); })
    .catch(err=>console.warn("No se pudieron cargar los ajustes de la tienda:",err));

  const categoriesTask = loadCloudCategories()
    .then(()=>{
      if(currentFilter!=="Todos"&&!categories.some(c=>c.name===currentFilter)){
        currentFilter="Todos";
      }
      renderCategoryTabs();
      renderCategoryMenu();
      render(currentFilter);
    })
    .catch(err=>console.warn("No se pudieron cargar las categorías:",err));

  const reviewsTask = loadApprovedReviews()
    .then(()=>{ if(products.length) render(currentFilter); });

  await Promise.allSettled([productsTask,settingsTask,categoriesTask,reviewsTask]);
}

let currentFilter="Todos";
let reviewsByProduct={};
let reviewsLoaded=false;
function renderCategoryTabs(){
 const tabs=document.getElementById("categoryTabs");
 if(!tabs)return;

 const names=[...new Set(categories.map(c=>c.name).filter(Boolean))];

 tabs.innerHTML=`
 <button class="filter${currentFilter==="Todos"?" active":""}" data-filter="Todos">Ofertas</button>
 ${names.map(name=>`
   <button class="filter${currentFilter===name?" active":""}" data-filter="${esc(name)}">
     ${esc(name)}
   </button>
 `).join("")}`;

 tabs.querySelectorAll(".filter").forEach(b=>{
   b.addEventListener("click",()=>{
     const f=b.dataset.filter;
     currentFilter=f;

     tabs.querySelectorAll(".filter")
       .forEach(x=>x.classList.toggle("active",x.dataset.filter===f));

     b.scrollIntoView({
       behavior:"smooth",
       block:"nearest",
       inline:"center"
     });

     render(f);
   });
 });
}

function renderCategoryMenu(){
 const menu=document.getElementById("categoryMenu");
 if(!menu)return;

 const names=[...new Set(
   categories.map(c=>c.name).filter(Boolean)
 )];

 menu.innerHTML=`
   <div class="category-menu-head">
     <div>
       <span class="category-menu-kicker">NAVEGACIÓN</span>
       <h2>Categorías</h2>
     </div>

     <button
       type="button"
       class="category-menu-close"
       id="categoryMenuClose"
       aria-label="Cerrar categorías">
       ✕
     </button>
   </div>

   <div class="category-menu-list">

     <button
       type="button"
       class="category-menu-item${currentFilter==="Todos"?" active":""}"
       data-menu-filter="Todos">
       <span>Ofertas</span>
       <span>›</span>
     </button>

     ${names.map(name=>`
       <button
         type="button"
         class="category-menu-item${currentFilter===name?" active":""}"
         data-menu-filter="${esc(name)}">
         <span>${esc(name)}</span>
         <span>›</span>
       </button>
     `).join("")}

   </div>
 `;

 menu.querySelector("#categoryMenuClose")
   ?.addEventListener("click",closeCategoryMenu);

 menu.querySelectorAll("[data-menu-filter]")
   .forEach(b=>{
     b.addEventListener("click",()=>{
       currentFilter=b.dataset.menuFilter;

       closeCategoryMenu();

       renderCategoryTabs();
       renderCategoryMenu();
       render(currentFilter);
     });
   });
}

function ensureCategoryMenu(){
 if(document.getElementById("categoryMenu"))return;

 const overlay=document.createElement("div");

 overlay.id="categoryMenuOverlay";
 overlay.className="category-menu-overlay";

 overlay.addEventListener("click",closeCategoryMenu);

 document.body.appendChild(overlay);

 const menu=document.createElement("aside");

 menu.id="categoryMenu";
 menu.className="category-menu";

 menu.setAttribute(
   "aria-label",
   "Menú de categorías"
 );

 document.body.appendChild(menu);

 renderCategoryMenu();
}

function openCategoryMenu(){
 ensureCategoryMenu();

 renderCategoryMenu();

 document
   .getElementById("categoryMenuOverlay")
   ?.classList.add("open");

 document
   .getElementById("categoryMenu")
   ?.classList.add("open");

 document.body.classList.add("category-menu-open");
}

function closeCategoryMenu(){
 document
   .getElementById("categoryMenuOverlay")
   ?.classList.remove("open");

 document
   .getElementById("categoryMenu")
   ?.classList.remove("open");

 document.body.classList.remove("category-menu-open");
}
function updateStickyOrder(animate=false){const bar=document.getElementById("stickyOrder");if(!bar)return;const count=cart.reduce((s,i)=>s+i.qty,0);let total=0;cart.forEach(i=>{const p=products.find(x=>x.id===i.id);if(p)total+=effectivePrice(p)*i.qty});bar.classList.toggle("visible",count>0);const c=bar.querySelector("[data-sticky-count]");const n=bar.querySelector("[data-sticky-count-number]");const w=bar.querySelector("[data-sticky-count-word]");const t=bar.querySelector("[data-sticky-total]");if(n)n.textContent=count;if(w)w.textContent=count===1?"producto":"productos";if(c&&!n&&!w)c.textContent=`${count} producto${count===1?"":"s"}`;if(t)t.textContent=money(total,"USD");if(animate){bar.classList.remove("electroisla-order-update");if(n)n.classList.remove("electroisla-product-count-bounce");void bar.offsetWidth;if(n)n.classList.add("electroisla-product-count-bounce");bar.classList.add("electroisla-order-update");setTimeout(()=>{bar.classList.remove("electroisla-order-update");if(n)n.classList.remove("electroisla-product-count-bounce")},450)}}
const requestedProductImages=new Set();
const pendingProductImageElements=new Map();
let productImageObserver=null;
let productImageBatchScheduled=false;
function scheduleProductImages(){
  const box=document.getElementById("products");
  if(!box)return;
  const pending=[...box.querySelectorAll("[data-product-image]")];
  // Solicita de inmediato las primeras fotos del catálogo, que son las que el
  // usuario ve al abrir la tienda. Las demás siguen cargándose bajo demanda.
  const firstVisibleBatch=pending.slice(0,8);
  if(firstVisibleBatch.length)queueProductImages(firstVisibleBatch);
  if(!("IntersectionObserver" in window)){
    queueProductImages(pending.slice(8));
    return;
  }
  if(!productImageObserver){
    productImageObserver=new IntersectionObserver(entries=>{
      const visible=[];
      entries.forEach(entry=>{
        if(!entry.isIntersecting)return;
        productImageObserver.unobserve(entry.target);
        visible.push(entry.target);
      });
      if(visible.length)queueProductImages(visible);
    },{rootMargin:"700px 0px"});
  }
  // Evita observar otra vez las primeras fotos: ya están en la petición inicial.
  const firstSet=new Set(firstVisibleBatch);
  pending.forEach(el=>{if(!firstSet.has(el))productImageObserver.observe(el);});
}
// Agrupa las imágenes visibles en una sola consulta a Supabase, en vez de
// realizar una petición de red por producto. Esto reduce mucho la latencia móvil.
function queueProductImages(elements){
  elements.forEach(el=>{
    const id=String(el?.dataset?.productImage||"");
    if(id&&!requestedProductImages.has(id))pendingProductImageElements.set(id,el);
  });
  if(productImageBatchScheduled||!pendingProductImageElements.size)return;
  productImageBatchScheduled=true;
  requestAnimationFrame(()=>setTimeout(flushProductImageBatch,0));
}
async function flushProductImageBatch(){
  productImageBatchScheduled=false;
  const batch=[...pendingProductImageElements.entries()];
  pendingProductImageElements.clear();
  const ids=batch.map(([id])=>id).filter(id=>!requestedProductImages.has(id));
  if(!ids.length)return;
  ids.forEach(id=>requestedProductImages.add(id));
  try{
    const {data,error}=await catalogReadClient.from("products").select("id,image").in("id",ids);
    if(error)throw error;
    const images=new Map((data||[]).map(row=>[String(row.id),typeof row.image==="string"?row.image:""]));
    const box=document.getElementById("products");
    batch.forEach(([id])=>{
      const product=products.find(p=>String(p.id)===id);
      if(!product)return;
      const image=images.get(id)||"";
      product.image=image;
      // El usuario puede cambiar de categoría mientras la consulta está en vuelo.
      // Busca la tarjeta actual por ID; nunca deja sin actualizar una tarjeta nueva
      // por haber intentado modificar un elemento antiguo que ya fue reemplazado.
      const el=box&&[...box.querySelectorAll("[data-product-image]")].find(node=>String(node.dataset.productImage)===id);
      if(!el)return;
      el.removeAttribute("data-product-image");
      if(image){
        const img=document.createElement("img");
        img.src=image;
        img.alt=product.name||"";
        img.loading="lazy";
        img.decoding="async";
        el.replaceChildren(img);
      }else{
        el.textContent=product.category==="Alimentos"?"🥩":"🏠";
      }
    });
    try{localStorage.setItem("electroisla_products",JSON.stringify(products.map(p=>({...p,image:""}))));}catch(_){}
  }catch(err){
    // Permite que las tarjetas visibles vuelvan a intentar cargar si falla Supabase.
    ids.forEach(id=>requestedProductImages.delete(id));
    console.warn("No se pudieron cargar las imágenes del catálogo en lote.",err);
  }
}
async function loadProductImage(el){
  // La ficha ampliada usa el mismo mecanismo de lote que las tarjetas del catálogo.
  queueProductImages([el]);
}
function render(filter="Todos"){
 const box=document.getElementById("products");
 if(!box)return;
 const heading=document.querySelector(".catalog-heading h2");
 if(window.catalogLoading&&products.length===0&&window.__electroislaFastCatalog){
  if(heading)heading.textContent=filter==="Todos"?"Ofertas":filter;
  const count=document.getElementById("resultCount");
  if(count)count.textContent="Cargando catálogo…";
  updateStickyOrder();
  return;
 }
 if(heading)heading.textContent=filter==="Todos"?"Ofertas":filter;
 const q=(document.getElementById("productSearch")?.value||"").trim().toLowerCase();
 const activeCategoryNames=new Set(categories.map(c=>String(c.name).trim()));
 const list=products.filter(p=>p.available!==false&&(filter==="Todos"||p.category===filter)&&(!q||`${p.name} ${p.description||""}`.toLowerCase().includes(q))&&(filter==="Todos"||activeCategoryNames.has(String(p.category||"").trim())));
 const count=document.getElementById("resultCount");
 if(count)count.textContent=`${list.length} producto${list.length===1?"":"s"}`;
 const cardMarkup=p=>{
  const qty=cart.find(i=>i.id===p.id)?.qty||0;
  return `<article class="product shop-product" data-product-id="${esc(p.id)}" data-category="${esc(p.category||"")}"><div class="product-info"><span class="tag">${esc(p.category)}</span><h3>${esc(p.name)}</h3><p>${esc(p.description||"")}</p>${renderReviewBadge(p)}<div class="price">${priceMarkup(p)} <small>${esc(p.unit||"")}</small></div></div><div class="product-media"><button type="button" class="product-img product-image-trigger" data-product-detail="${esc(p.id)}" aria-label="Ver detalles de ${esc(p.name)}"${p.image?"":` data-product-image="${esc(p.id)}"`}>${p.image?`<img src="${p.image}" alt="" loading="lazy" decoding="async">`:(p.category==="Alimentos"?"🥩":"🏠")}</button><button class="add-circle${qty>0?" has-qty":""}" onclick="add('${esc(p.id)}')" aria-label="Agregar ${esc(p.name)}">${qty>0?qty:"+"}</button></div></article>`;
 };
 let markup="";
 if(filter==="Todos"&&list.length){
  const orderedNames=categories.map(c=>String(c.name||"").trim()).filter(Boolean);
  [...new Set(list.map(p=>String(p.category||"Otros").trim()||"Otros"))].filter(name=>!orderedNames.includes(name)).sort((a,b)=>a.localeCompare(b,"es")).forEach(name=>orderedNames.push(name));
  orderedNames.forEach(name=>{
   const group=list.filter(p=>(String(p.category||"Otros").trim()||"Otros")===name);
   if(!group.length)return;
   markup+=`<h3 class="catalog-category-heading" style="grid-column:1/-1;display:flex;align-items:center;gap:9px;margin:18px 0 2px;padding:0 2px 8px;border-bottom:1px solid #e8edf4;color:#173b67;font-size:16px;font-weight:700;line-height:1.3"><span style="display:inline-block;width:4px;height:20px;border-radius:4px;background:#f58220;flex:0 0 4px"></span><span>${esc(name)}</span><span style="margin-left:auto;color:#77869a;font-size:11px;font-weight:600">${group.length} producto${group.length===1?"":"s"}</span></h3>`;
   markup+=group.map(cardMarkup).join("");
  });
 }else{
  markup=list.map(cardMarkup).join("");
 }
 box.innerHTML=markup||(window.catalogLoadError?'<p class="empty-products">No se pudieron cargar los productos.</p><p class="catalog-load-error" style="font-size:12px;color:#b42318;overflow-wrap:anywhere">Diagnóstico: '+esc(window.catalogLoadError)+'</p>':(window.catalogLoading?'<p class="empty-products">Cargando productos…</p>':'<p class="empty-products">No hay productos disponibles.</p>'));
 box.querySelectorAll("[data-review-product]").forEach(btn=>btn.addEventListener("click",()=>openReviewModal(btn.dataset.reviewProduct)));
 scheduleProductImages();
 updateStickyOrder();
}
function electroislaAnimate(selector,className="electroisla-pop"){const el=document.querySelector(selector);if(!el)return;el.classList.remove(className);void el.offsetWidth;el.classList.add(className);setTimeout(()=>el.classList.remove(className),350)}
function electroislaAnimateAdd(id){const product=products.find(p=>String(p.id)===String(id));const card=[...document.querySelectorAll(".shop-product")].find(el=>String(el.dataset.productId)===String(id));if(card){card.classList.remove("electroisla-photo-added");void card.offsetWidth;card.classList.add("electroisla-photo-added");setTimeout(()=>card.classList.remove("electroisla-photo-added"),400)}const btn=product?[...document.querySelectorAll(".add-circle")].find(b=>b.getAttribute("aria-label")===`Agregar ${product.name}`):null;if(btn){btn.classList.remove("electroisla-bounce");void btn.offsetWidth;btn.classList.add("electroisla-bounce");setTimeout(()=>btn.classList.remove("electroisla-bounce"),400)}electroislaAnimate("#cartCount","electroisla-cart-bounce");electroislaAnimate("#cartTopTotal");electroislaAnimate("#cartTotal");electroislaAnimate(".cart-head-total strong");updateStickyOrder(true)}
function updateCategoryHighlight(name){
 const tabs=document.getElementById("categoryTabs");
 if(!tabs)return;
 tabs.querySelectorAll(".filter").forEach(b=>b.classList.toggle("active",b.dataset.filter===name));
 const active=tabs.querySelector(`.filter[data-filter="${CSS.escape(name)}"]`);
 if(active){
  const r=active.getBoundingClientRect(),tr=tabs.getBoundingClientRect();
  if(r.left<tr.left+8 || r.right>tr.right-8) active.scrollIntoView({behavior:"smooth",block:"nearest",inline:"center"});
 }
}
let categoryScrollFrame=0;
function syncCategoryWithScroll(){
 const box=document.getElementById("products");
 if(!box || currentFilter!=="Todos")return;
 const items=[...box.querySelectorAll(".shop-product[data-category]")];
 if(!items.length)return;
 const toolbar=document.querySelector(".shop-toolbar");
 const toolbarBottom=toolbar?.getBoundingClientRect().bottom||0;
 const targetY=Math.max(toolbarBottom+30,window.innerHeight*0.34);
 let best=null,bestDistance=Infinity;
 for(const item of items){
  const r=item.getBoundingClientRect();
  const visibleTop=Math.max(r.top,toolbarBottom);
  const visibleBottom=Math.min(r.bottom,window.innerHeight);
  if(visibleBottom<=visibleTop)continue;
  const distance=Math.abs((r.top+r.height/2)-targetY);
  if(distance<bestDistance){bestDistance=distance;best=item;}
 }
 if(!best)best=items.find(item=>item.getBoundingClientRect().bottom>toolbarBottom)||items[items.length-1];
 const category=best?.dataset.category;
 if(category)updateCategoryHighlight(category);
}
function scheduleCategoryScrollSync(){
 if(categoryScrollFrame)return;
 categoryScrollFrame=requestAnimationFrame(()=>{categoryScrollFrame=0;syncCategoryWithScroll();});
}

function add(id){const x=cart.find(i=>i.id===id);x?x.qty++:cart.push({id,qty:1});save();renderCart();render(currentFilter);requestAnimationFrame(()=>electroislaAnimateAdd(id))}
function change(id,d){const x=cart.find(i=>i.id===id);if(!x)return;const oldCount=cart.reduce((s,i)=>s+i.qty,0);x.qty+=d;if(x.qty<=0)cart=cart.filter(i=>i.id!==id);save();renderCart();render(currentFilter);const newCount=cart.reduce((s,i)=>s+i.qty,0);requestAnimationFrame(()=>{if(newCount>0&&newCount!==oldCount)electroislaAnimate("#cartCount","electroisla-cart-bounce");updateStickyOrder(true)})}
function getOrderTotals(){
 const canPayCupTransfer=cart.length>0&&cart.every(i=>{const p=products.find(x=>x.id===i.id);return p&&p.category==="Electrodomésticos";});
 let usdTotal=0,cashTotal=0,transferTotal=0,usdAvailable=true,cupAvailable=canPayCupTransfer;
 cart.forEach(i=>{
  const p=products.find(x=>x.id===i.id); if(!p)return;
  const cur=p.currency||"USD", unitPrice=effectivePrice(p), qty=i.qty;
  if(cur==="USD") usdTotal+=unitPrice*qty; else usdAvailable=false;
  const cash=cashCup(p), transfer=transferCup(p);
  if(cash===null||transfer===null){cupAvailable=false;return}
  cashTotal+=cash*qty; transferTotal+=transfer*qty;
 });
 const deliveryFeeUSD=getDeliveryFeeUSD();
 const deliveryFeeCUP=deliveryFeeUSD*Number(storeSettings.usd_to_cup||0);
 const deliveryFeeTransfer=deliveryFeeCUP*(1+Number(storeSettings.transfer_markup_percent||0)/100);
 usdTotal+=deliveryFeeUSD;
 cashTotal+=deliveryFeeCUP;
 transferTotal+=deliveryFeeTransfer;
 return {usdTotal,cashTotal,transferTotal,deliveryFeeUSD,deliveryFeeCUP,deliveryFeeTransfer,usdAvailable,cupAvailable,canPayCupTransfer};
}
function updatePaymentSummary(){
 const box=document.getElementById("paymentSummary"); if(!box)return;
 const totals=getOrderTotals();
 const usdRadio=document.querySelector('input[name="paymentMethod"][value="USD"]');
 const zelleRadio=document.querySelector('input[name="paymentMethod"][value="ZELLE"]');
 const cupRadio=document.querySelector('input[name="paymentMethod"][value="CUP"]');
 const transferRadio=document.querySelector('input[name="paymentMethod"][value="TRANSFERENCIA"]');
 if(usdRadio)usdRadio.disabled=!totals.usdAvailable;
 if(zelleRadio)zelleRadio.disabled=!totals.usdAvailable;
 if(cupRadio)cupRadio.disabled=!totals.cupAvailable;
 if(transferRadio)transferRadio.disabled=!totals.cupAvailable;
 const cupLabel=cupRadio?.closest(".payment-option");
 const transferLabel=transferRadio?.closest(".payment-option");
 if(cupLabel)cupLabel.style.display=totals.canPayCupTransfer?"":"none";
 if(transferLabel)transferLabel.style.display=totals.canPayCupTransfer?"":"none";
 const selected=document.querySelector('input[name="paymentMethod"]:checked');
 if(selected&&selected.disabled){
  const fallback=document.querySelector('input[name="paymentMethod"]:not(:disabled)');
  if(fallback)fallback.checked=true;
 }
 const method=document.querySelector('input[name="paymentMethod"]:checked')?.value||"USD";
 const amount=(method==="USD"||method==="ZELLE")?money(totals.usdTotal,"USD"):method==="CUP"?money(totals.cashTotal,"CUP"):money(totals.transferTotal,"CUP");
 const label=method==="USD"?"USD":method==="ZELLE"?"Zelle":method==="CUP"?"CUP (efectivo)":"Transferencia";
 const fee=totals.deliveryFeeUSD;
 const feeSelected=(method==="USD"||method==="ZELLE")?money(totals.deliveryFeeUSD,"USD"):method==="CUP"?money(totals.deliveryFeeCUP,"CUP"):money(totals.deliveryFeeTransfer,"CUP");
 const feeText=fee>0?`Domicilio: ${feeSelected}`:"Domicilio: Gratis";
 const zoneName=getDeliveryZone();
 box.innerHTML=`<strong>Total a pagar: ${amount}</strong><span>${zoneName?`Zona: ${esc(zoneName)}`:"Selecciona una zona"}</span><span>${feeText}</span><span>Método seleccionado: ${label}</span>`;
}
function renderCart(){
 const box=document.getElementById("cartItems"),count=cart.reduce((s,i)=>s+i.qty,0);
 const cartBadge=document.getElementById("cartCount");
 if(cartBadge){
   cartBadge.textContent=count;
   cartBadge.classList.toggle("cart-count-hidden",count===0);
 }
 let usdTotal=0;
 box.innerHTML=cart.length?cart.map(i=>{
   const p=products.find(x=>x.id===i.id); if(!p)return"";
   const cur=p.currency||"USD",unitPrice=effectivePrice(p),lineTotal=unitPrice*i.qty;
   if(cur==="USD")usdTotal+=lineTotal;
   const img=p.image?`<img class="cart-thumb" src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy" decoding="async">`:`<div class="cart-thumb placeholder">🛍️</div>`;
   return `<div class="cart-item">
     <div class="cart-thumb-wrap">${img}</div>
     <div class="cart-item-main">
       <div class="cart-item-top"><strong style="font-size:12px!important;line-height:1!important;font-weight:600!important;display:block!important">${esc(p.name)}</strong></div>
       <div class="cart-item-name-divider" aria-hidden="true"></div>
       <div class="cart-item-description" style="font-size:9.5px!important;line-height:1!important;font-weight:400!important;margin:0!important;padding:0!important;">${esc(p.description||"")}</div>
       <div class="cart-item-category" style="font-size:10px!important;line-height:1!important;font-weight:400!important;margin:0!important;padding:3px 9px!important">${esc(p.category||"")}</div>
       <div class="cart-item-price" style="font-size:13px!important;line-height:1!important;font-weight:600!important;margin-top:14px!important;padding:0!important">${money(unitPrice,cur)}</div>
       <div class="cart-item-bottom">
         <div class="qty"><button onclick="change('${esc(p.id)}',-1)" aria-label="Disminuir">−</button><b style="font-size:11px!important;line-height:1!important;font-weight:800!important;display:block!important">${i.qty}</b><button onclick="change('${esc(p.id)}',1)" aria-label="Aumentar">+</button></div>
         <button class="cart-remove-minimal" onclick="removeFromCart('${esc(p.id)}')" aria-label="Eliminar ${esc(p.name)}" title="Eliminar producto">
           <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 7.5h14M8.5 7.5V5.8c0-.8.6-1.3 1.4-1.3h4.2c.8 0 1.4.5 1.4 1.3v1.7M7.2 8.5l.9 10.3c.1.8.7 1.2 1.5 1.2h4.8c.8 0 1.4-.4 1.5-1.2l.9-10.3M10 11v5.5M14 11v5.5" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"/></svg>
         </button>
       </div>
     </div>
   </div>`;
 }).join(""):`<div class="cart-empty"><div>🛍️</div><strong>Tu pedido está vacío</strong><span>Agrega productos para comenzar.</span></div>`;
 const cartTotal=document.getElementById("cartTotal");
 if(cartTotal)cartTotal.innerHTML=cart.length?(usdTotal>0?money(usdTotal,"USD"):"USD 0.00"):"USD 0.00";
 const topTotal=document.getElementById("cartTopTotal");
 const bottomTotal=document.getElementById("cartBottomTotal");
 const totalText=`$${usdTotal.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})} USD`;
 if(topTotal)topTotal.textContent=totalText;
 if(bottomTotal)bottomTotal.textContent=topTotal?topTotal.textContent:totalText;
 const topCount=document.getElementById("cartTopCount");
 if(topCount){
   const totalItems=cart.reduce((s,i)=>s+i.qty,0);
   topCount.textContent=`${totalItems} artículo${totalItems===1?"":"s"}`;
 }
 updateStickyOrder();
 updatePaymentSummary();
}
function renderCartRecommendations(){
 const box=document.getElementById("cartRecommendations");
 if(!box)return;
 const cartIds=new Set(cart.map(i=>i.id));
 const list=products.filter(p=>p.available&&!cartIds.has(p.id)).slice(0,6);
 box.innerHTML=list.map(p=>{
   const img=p.image?`<img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy" decoding="async">`:`<div class="recommendation-placeholder">${p.category==="Alimentos"?"🥫":"🏠"}</div>`;
   return `<article class="recommendation-card">
     <div class="recommendation-image">${img}<button class="recommendation-add" onclick="add('${esc(p.id)}')" aria-label="Agregar ${esc(p.name)}">+</button></div>
     <div class="recommendation-name">${esc(p.name)}</div>
     <strong class="recommendation-price">${money(effectivePrice(p),p.currency||"USD")}</strong>
   </article>`;
 }).join("")||`<div class="recommendation-empty">No hay productos adicionales para mostrar.</div>`;
}
function removeFromCart(id){cart=cart.filter(i=>i.id!==String(id));save();renderCart();render();}

let cartScrollY=0;
function lockPageScroll(){
  cartScrollY=window.scrollY||window.pageYOffset||0;
  document.documentElement.classList.add("cart-open-lock");
  document.body.classList.add("cart-open-lock");
  document.body.style.top=`-${cartScrollY}px`;
}
function unlockPageScroll(){
  document.documentElement.classList.remove("cart-open-lock");
  document.body.classList.remove("cart-open-lock");
  document.body.style.top="";
  window.scrollTo(0,cartScrollY);
}
function openCart(){
  document.getElementById("cart").classList.add("open");
  document.getElementById("cartOverlay").classList.remove("hidden");
  lockPageScroll();
}
function closeCart(){
  document.getElementById("cart").classList.remove("open");
  document.getElementById("cartOverlay").classList.add("hidden");
  unlockPageScroll();
}
function openCheckout(){if(!cart.length){alert("Agrega al menos un producto.");return}updatePaymentSummary();document.getElementById("checkoutModal").classList.remove("hidden")}
renderCategoryTabs();
document.getElementById("shopSearchBtn")?.addEventListener("click",()=>{const w=document.getElementById("searchWrap");w.classList.toggle("hidden");if(!w.classList.contains("hidden"))document.getElementById("productSearch")?.focus()});
document.getElementById("shopMenuBtn")?.addEventListener("click",openCategoryMenu);
document.getElementById("products")?.addEventListener("click",e=>{const trigger=e.target.closest("[data-product-detail]");if(trigger)openProductDetail(trigger.dataset.productDetail);});
document.getElementById("productDetailClose")?.addEventListener("click",closeProductDetail);
document.getElementById("productDetailModal")?.addEventListener("click",e=>{if(e.target.id==="productDetailModal")closeProductDetail();});
document.getElementById("productDetailAdd")?.addEventListener("click",addFromProductDetail);
document.getElementById("productDetailReview")?.addEventListener("click",()=>{const id=document.getElementById("productDetailModal")?.dataset.productId;if(!id)return;closeProductDetail();openReviewModal(id);});
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeProductDetail();});

document.getElementById("productSearch")?.addEventListener("input",()=>render(currentFilter));
window.addEventListener("scroll",scheduleCategoryScrollSync,{passive:true});
window.addEventListener("resize",scheduleCategoryScrollSync);
window.addEventListener("load",scheduleCategoryScrollSync);
document.getElementById("cartBtn")?.addEventListener("click",openCart);document.getElementById("closeCart").onclick=closeCart;document.getElementById("cartOverlay").onclick=closeCart;document.getElementById("checkoutBtn").onclick=openCheckout;document.getElementById("closeModal").onclick=()=>document.getElementById("checkoutModal").classList.add("hidden");
function openProductDetail(productId){
 const p=products.find(x=>String(x.id)===String(productId));
 const modal=document.getElementById("productDetailModal");
 if(!p||!modal)return;
 modal.dataset.productId=String(productId);
 const imageBox=document.getElementById("productDetailImage");
 const title=document.getElementById("productDetailName");
 const category=document.getElementById("productDetailCategory");
 const description=document.getElementById("productDetailDescription");
 const price=document.getElementById("productDetailPrice");
 const addButton=document.getElementById("productDetailAdd");
 if(title)title.textContent=p.name||"Producto";
 if(category)category.textContent=p.category||"";
 if(description)description.textContent=p.description||"Consulta los detalles de este producto.";
 if(price)price.innerHTML=priceMarkup(p)+" <small>"+esc(p.unit||"")+"</small>";
 if(imageBox){
  imageBox.classList.toggle("is-loading",!p.image);
  imageBox.innerHTML=p.image?'<img src="'+esc(p.image)+'" alt="'+esc(p.name)+'" decoding="async">':'<span class="product-detail-placeholder">'+(p.category==="Alimentos"?"🥩":"🏠")+'</span>';
 }
 if(addButton)addButton.textContent=(cart.find(i=>String(i.id)===String(productId))?.qty||0)>0?"Agregar otra unidad":"Agregar al carrito";
 const reviewInfo=document.getElementById("productDetailReviews");
 const reviewButton=document.getElementById("productDetailReview");
 const review=reviewSummary(productId);
 if(reviewInfo)reviewInfo.innerHTML=review.count?'<span class="review-stars">'+reviewStars(review.avg)+'</span><strong>'+review.avg.toFixed(1)+'</strong><span>'+review.count+' reseña'+(review.count===1?'':'s')+'</span>':'<span class="review-stars review-stars-empty">☆☆☆☆☆</span><span>Aún sin reseñas</span>';
 if(reviewButton)reviewButton.textContent=review.count?"Leer reseñas o escribir la tuya":"Escribir la primera reseña";
 modal.classList.remove("hidden");
 modal.setAttribute("aria-hidden","false");
 if(!p.image){
  catalogReadClient.from("products").select("image").eq("id",String(productId)).maybeSingle().then(({data,error})=>{
   if(error)throw error;
   const image=typeof data?.image==="string"?data.image:"";
   const current=products.find(x=>String(x.id)===String(productId));
   if(current&&image)current.image=image;
   if(modal.dataset.productId===String(productId)&&imageBox&&image){
    imageBox.classList.remove("is-loading");
    imageBox.innerHTML='<img src="'+esc(image)+'" alt="'+esc(p.name)+'" decoding="async">';
   }
   if(current&&image)save();
  }).catch(error=>console.warn("No se pudo cargar la imagen ampliada del producto.",error));
 }
}
function closeProductDetail(){
 const modal=document.getElementById("productDetailModal");
 if(modal){modal.classList.add("hidden");modal.setAttribute("aria-hidden","true");}
}
function addFromProductDetail(){
 const id=document.getElementById("productDetailModal")?.dataset.productId;
 if(!id)return;
 add(id);
 const button=document.getElementById("productDetailAdd");
 if(button)button.textContent="Agregar otra unidad";
}
function openReviewModal(productId){
 const p=products.find(x=>String(x.id)===String(productId));
 if(!p)return;
 const modal=document.getElementById("reviewModal");
 if(!modal)return;
 modal.dataset.productId=String(productId);
 const title=document.getElementById("reviewProductName");
 if(title)title.textContent=p.name;
 const existing=document.getElementById("reviewExisting");
 const existingReviews=reviewsByProduct[String(productId)]||[];
 if(existing){existing.innerHTML=existingReviews.length?`<div class="review-existing-title">Opiniones de clientes</div>`+existingReviews.slice(0,4).map(r=>`<div class="review-existing-item"><div><span class="review-stars">${reviewStars(r.rating)}</span><strong>${esc(r.reviewer_name||"Cliente")}</strong></div><p>${esc(r.comment)}</p></div>`).join(""):`<div class="review-existing-empty">Todavía no hay reseñas publicadas.</div>`;}
 const name=document.getElementById("reviewerName");
 const comment=document.getElementById("reviewComment");
 if(name)name.value=""; if(comment)comment.value="";
 modal.querySelectorAll(".review-star-input").forEach(b=>b.classList.toggle("active",Number(b.dataset.rating)===5));
 const rating=document.getElementById("reviewRating"); if(rating)rating.value="5";
 modal.classList.remove("hidden"); modal.setAttribute("aria-hidden","false");
}
function closeReviewModal(){const modal=document.getElementById("reviewModal");if(modal){modal.classList.add("hidden");modal.setAttribute("aria-hidden","true")}}
async function submitReview(){
 const modal=document.getElementById("reviewModal"); if(!modal)return;
 const productId=modal.dataset.productId||"";
 const rating=Number(document.getElementById("reviewRating")?.value||0);
 const name=(document.getElementById("reviewerName")?.value||"").trim().slice(0,80)||"Cliente";
 const comment=(document.getElementById("reviewComment")?.value||"").trim();
 if(!productId||rating<1||rating>5){alert("Selecciona una valoración de 1 a 5 estrellas.");return}
 if(comment.length<5){alert("Escribe un comentario un poco más detallado.");return}
 if(comment.length>500){alert("El comentario no puede superar 500 caracteres.");return}
 const btn=document.getElementById("submitReview"); if(btn)btn.disabled=true;
 try{
  const {error}=await supabaseClient.from("reviews").insert({product_id:productId,rating,reviewer_name:name,comment,approved:false});
  if(error)throw error;
  closeReviewModal();
  alert("¡Gracias! Tu reseña quedó pendiente de aprobación.");
 }catch(err){alert("No se pudo enviar la reseña. Inténtalo nuevamente.");console.warn(err)}
 finally{if(btn)btn.disabled=false}
}
function showThankYou(){
 const modal=document.getElementById("thankYouModal");
 if(!modal)return;
 modal.classList.remove("hidden");
 modal.setAttribute("aria-hidden","false");
}
function finishPurchase(){
 cart=[];
 save();
 const form=document.getElementById("orderForm");
 if(form)form.reset();
 const select=document.getElementById("municipality");
 if(select){
   select.value="";
   select.dispatchEvent(new Event("change",{bubbles:true}));
 }
 const modal=document.getElementById("thankYouModal");
 if(modal){modal.classList.add("hidden");modal.setAttribute("aria-hidden","true");}
 document.getElementById("checkoutModal")?.classList.add("hidden");
 closeCart();
 currentFilter="Todos";
 document.querySelectorAll(".filter").forEach(x=>x.classList.toggle("active",x.dataset.filter==="Todos"));
 render("Todos");
 renderCart();
 window.scrollTo({top:0,behavior:"smooth"});
}
let waitingForWhatsAppReturn=false;
function markWhatsAppPending(){
 waitingForWhatsAppReturn=true;
 sessionStorage.setItem("electroisla_whatsapp_pending","1");
}
function checkWhatsAppReturn(){
 if(!waitingForWhatsAppReturn && sessionStorage.getItem("electroisla_whatsapp_pending")!=="1")return;
 if(document.visibilityState==="hidden")return;
 waitingForWhatsAppReturn=false;
 sessionStorage.removeItem("electroisla_whatsapp_pending");
 showThankYou();
}

// ElectroIsla — registro de pedidos para el reporte de ventas.
async function recordOrderForReport({name,phone,recipientName,recipientAddress,recipientPhone,zoneName,note,method,totals}){
  try{
    const orderItems=cart.map(i=>{
      const p=products.find(x=>x.id===i.id);
      if(!p)return null;
      const unitPrice=Number(effectivePrice(p))||0;
      const qty=Number(i.qty)||0;
      return {
        id:String(p.id),
        name:p.name||"",
        category:p.category||"",
        qty,
        unit:p.unit||"",
        unit_price:unitPrice,
        line_total:unitPrice*qty
      };
    }).filter(Boolean);
    const isUsd=method==="USD"||method==="ZELLE";
    const total=Number(isUsd?totals.usdTotal:method==="CUP"?totals.cashTotal:totals.transferTotal)||0;
    const delivery=Number(isUsd?totals.deliveryFeeUSD:method==="CUP"?totals.deliveryFeeCUP:totals.deliveryFeeTransfer)||0;
    const subtotal=Math.max(0,total-delivery);
    const {error}=await supabaseClient.from("orders").insert({
      customer_name:name||"",
      customer_phone:phone||"",
      delivery_zone:zoneName||"",
      payment_method:method,
      currency:isUsd?"USD":"CUP",
      subtotal,
      delivery_fee:delivery,
      total,
      items:orderItems,
      note:[`DATOS DE QUIEN RECIBE EL PEDIDO: ${recipientName||""}; Dirección: ${recipientAddress||""}; Teléfono: ${recipientPhone||""}`,note||""].filter(Boolean).join("\n"),
      status:"sent"
    });
    if(error)console.warn("No se pudo registrar el pedido para el reporte de ventas:",error);
  }catch(err){
    console.warn("No se pudo registrar el pedido para el reporte de ventas:",err);
  }
}

document.getElementById("orderForm").addEventListener("submit",e=>{e.preventDefault();const totals=getOrderTotals();const method=document.querySelector('input[name="paymentMethod"]:checked')?.value;if(!method){alert("Selecciona un método de pago.");return}if((method==="USD"||method==="ZELLE")&&!totals.usdAvailable){alert("El pago en USD/Zelle no está disponible para este pedido.");return}if((method==="CUP"||method==="TRANSFERENCIA")&&!totals.cupAvailable){alert("CUP y Transferencia solo están disponibles para pedidos de electrodomésticos.");return}const zone=document.getElementById("municipality").value,other=document.getElementById("otherZone").value.trim();if(!zone){alert("Selecciona la zona de entrega.");return}if(zone==="Otro"&&!other){alert("Escribe cuál es tu zona de entrega.");return}const lines=cart.map(i=>{const p=products.find(x=>x.id===i.id);if(!p)return"";const cur=p.currency||"USD",unitPrice=effectivePrice(p),lineTotal=unitPrice*i.qty,cash=cashCup(p),transfer=transferCup(p);let selectedLine="";if(method==="USD"||method==="ZELLE")selectedLine=money(lineTotal,"USD");else if(method==="CUP")selectedLine=money(cash*i.qty,"CUP");else selectedLine=money(transfer*i.qty,"CUP");return `• ${p.name} — ${i.qty} ${p.unit||"unidad"} — ${selectedLine}`}).join("\n");const name=document.getElementById("customerName").value.trim(),phone=(document.getElementById("customerPhoneCode").value==="+1-CA"?"+1":document.getElementById("customerPhoneCode").value)+document.getElementById("customerPhone").value.trim(),recipientName=document.getElementById("recipientName").value.trim(),recipientAddress=document.getElementById("recipientAddress").value.trim(),recipientPhone=(document.getElementById("recipientPhoneCode").value==="+1-CA"?"+1":document.getElementById("recipientPhoneCode").value)+document.getElementById("recipientPhone").value.trim(),zoneName=zone==="Otro"?other:zone,note=document.getElementById("note").value.trim();if(!recipientName||!recipientAddress||!recipientPhone){alert("Completa el nombre, la dirección y el teléfono de quien recibe el pedido.");return}const paymentLabel=method==="USD"?"USD":method==="ZELLE"?"ZELLE":method==="CUP"?"CUP (efectivo)":"TRANSFERENCIA";const subtotalSelected=(method==="USD"||method==="ZELLE")?money(totals.usdTotal-totals.deliveryFeeUSD,"USD"):method==="CUP"?money(totals.cashTotal-totals.deliveryFeeCUP,"CUP"):money(totals.transferTotal-totals.deliveryFeeTransfer,"CUP");const paymentTotal=(method==="USD"||method==="ZELLE")?money(totals.usdTotal,"USD"):method==="CUP"?money(totals.cashTotal,"CUP"):money(totals.transferTotal,"CUP");const deliverySelected=(method==="USD"||method==="ZELLE")?money(totals.deliveryFeeUSD,"USD"):method==="CUP"?money(totals.deliveryFeeCUP,"CUP"):money(totals.deliveryFeeTransfer,"CUP");const deliveryText=totals.deliveryFeeUSD>0?deliverySelected:"Gratis";const msg=`🛒 NUEVO PEDIDO\n\n👤 PERSONA QUE REALIZA EL PEDIDO\nNombre: ${name}\nTeléfono: ${phone}\n\n📦 PERSONA QUE RECIBE EL PEDIDO\nNombre: ${recipientName}\nDirección: ${recipientAddress}\nTeléfono: ${recipientPhone}\n\n🛍️ PRODUCTOS:\n${lines}\n\n📍 Zona de entrega: ${zoneName}\n\n💳 MÉTODO DE PAGO: ${paymentLabel}\n🧾 Subtotal: ${subtotalSelected}\n🚚 Domicilio: ${deliveryText}\n💰 TOTAL A PAGAR: ${paymentTotal}${note?`\n📝 Nota: ${note}`:""}`;recordOrderForReport({name,phone,recipientName,recipientAddress,recipientPhone,zoneName,note,method,totals});markWhatsAppPending();window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`,"_blank")});

document.getElementById("thankYouAccept")?.addEventListener("click",finishPurchase);
document.getElementById("reviewClose")?.addEventListener("click",closeReviewModal);
document.getElementById("reviewCancel")?.addEventListener("click",closeReviewModal);
document.getElementById("submitReview")?.addEventListener("click",submitReview);
document.querySelectorAll(".review-star-input").forEach(btn=>btn.addEventListener("click",()=>{const n=Number(btn.dataset.rating);const r=document.getElementById("reviewRating");if(r)r.value=String(n);document.querySelectorAll(".review-star-input").forEach(x=>x.classList.toggle("active",Number(x.dataset.rating)<=n))}));
document.getElementById("reviewModal")?.addEventListener("click",e=>{if(e.target.id==="reviewModal")closeReviewModal()});
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")setTimeout(checkWhatsAppReturn,250)});
window.addEventListener("focus",()=>setTimeout(checkWhatsAppReturn,250));
window.addEventListener("pageshow",()=>setTimeout(checkWhatsAppReturn,250));
document.querySelectorAll('input[name="paymentMethod"]').forEach(r=>r.addEventListener("change",updatePaymentSummary));
document.getElementById("municipality")?.addEventListener("change",updateDeliveryFields);
document.getElementById("otherZone")?.addEventListener("input",updatePaymentSummary);

setupDeliveryPicker();
 setupPhoneCodePicker("customerPhoneCode","customerPhonePicker","customerPhoneTrigger","customerPhoneMenu","customerPhoneSelectedText");
 setupPhoneCodePicker("recipientPhoneCode","recipientPhonePicker","recipientPhoneTrigger","recipientPhoneMenu","recipientPhoneSelectedText");
ensureCategoryMenu();
startCloud();

supabaseClient.channel("settings-store").on("postgres_changes",{event:"*",schema:"public",table:"store_settings"},async()=>{try{await loadStoreSettings();render();renderCart()}catch(e){console.warn(e)}}).subscribe();

supabaseClient.channel("products-store").on("postgres_changes",{event:"*",schema:"public",table:"products"},async(payload)=>{try{const changedId=payload?.new?.id;if(changedId!==undefined){const changed=products.find(p=>String(p.id)===String(changedId));if(changed)changed.image="";requestedProductImages.delete(String(changedId));try{localStorage.setItem("electroisla_products",JSON.stringify(products.map(p=>({...p,image:""}))))}catch(_){}}await loadCloudProducts();renderCategoryMenu();render();renderCart()}catch(e){console.warn(e)}}).subscribe();
supabaseClient.channel("reviews-store").on("postgres_changes",{event:"*",schema:"public",table:"reviews"},async()=>{try{await loadApprovedReviews();render()}catch(e){console.warn(e)}}).subscribe();

supabaseClient.channel("categories-store").on("postgres_changes",{event:"*",schema:"public",table:"categories"},async()=>{
 try{
  await loadCloudCategories();

  if(currentFilter!=="Todos"&&!categories.some(c=>c.name===currentFilter)){
   currentFilter="Todos";
  }

  renderCategoryTabs();
  renderCategoryMenu();
  render(currentFilter);
  renderCart();

 }catch(e){
  console.warn("No se pudieron actualizar las categorías.",e);
 }
}).subscribe();
