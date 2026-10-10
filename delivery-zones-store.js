/* ElectroIsla: sincronización de zonas de domicilio con Supabase. */
(function () {
  "use strict";
  const select = document.getElementById("municipality");
  const menu = document.getElementById("deliveryMenu");
  const picker = document.getElementById("deliveryPicker");
  if (!select || !menu || !picker || typeof supabaseClient === "undefined") return;

  function escZone(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[ch]));
  }

  function rebuildMenu() {
    menu.innerHTML = Array.from(select.options).map(o => {
      const fee = Number(o.dataset.fee || 0);
      const feeText = !o.value ? "" : (fee > 0 ? `${fee} USD` : "Gratis");
      return `<button type="button" class="delivery-option${o.value === "" ? " placeholder-option" : ""}" data-value="${escZone(o.value)}" role="option" aria-selected="${o.selected}"><span>${escZone(o.value || o.textContent)}</span>${feeText ? `<b>${feeText}</b>` : ""}</button>`;
    }).join("");
    const o = select.options[select.selectedIndex];
    const textBox = document.getElementById("deliverySelectedText");
    const feeBox = document.getElementById("deliverySelectedFee");
    if (textBox) textBox.textContent = select.value ? o.textContent.split(" — ")[0] : "Selecciona tu zona";
    if (feeBox) feeBox.textContent = select.value ? (Number(o.dataset.fee || 0) > 0 ? `${Number(o.dataset.fee)} USD` : "Gratis") : "—";
  }

  async function loadZones() {
    try {
      const { data, error } = await supabaseClient
        .from("delivery_zones")
        .select("name,fee_usd,sort_order,available")
        .eq("available", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      if (!Array.isArray(data) || data.length === 0) return;

      const previous = select.value;
      const zones = data.filter(z => String(z.name || "").trim());
      if (!zones.length) return;

      select.replaceChildren(new Option("Selecciona...", ""));
      zones.forEach(z => {
        const fee = Math.max(0, Number(z.fee_usd) || 0);
        const name = String(z.name).trim();
        const option = new Option(`${name} — ${fee > 0 ? `${fee} USD` : "Gratis"}`, name);
        option.dataset.fee = String(fee);
        select.add(option);
      });
      if (zones.some(z => String(z.name).trim() === previous)) select.value = previous;

      rebuildMenu();
      select.dispatchEvent(new Event("change", { bubbles: true }));
    } catch (err) {
      console.warn("ElectroIsla: no se pudieron cargar las zonas desde Supabase; se conserva la lista inicial.", err);
    }
  }

  loadZones();
  try {
    supabaseClient.channel("delivery-zones-store-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_zones" }, loadZones)
      .subscribe();
  } catch (err) {
    console.warn("ElectroIsla: actualización en vivo de zonas no disponible.", err);
  }
})();
