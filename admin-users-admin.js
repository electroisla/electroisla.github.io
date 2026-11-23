/* ElectroIsla 360 — Gestión segura de administradores */
(()=>{
  const $=id=>document.getElementById(id);
  const form=$("adminUserForm");
  if(!form)return;
  let admins=[];
  const escHtml=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const status=(message,isError=false)=>{
    const el=$("adminUsersStatus");
    if(el){el.textContent=message;el.style.color=isError?"#b42318":"";}
  };
  const invoke=async body=>{
    const {data,error}=await supabaseClient.functions.invoke("admin-manage-admins",{body});
    if(error)throw new Error(data?.error||error.message||"No se pudo completar la operación.");
    if(data?.error)throw new Error(data.error);
    return data||{};
  };
  const dateLabel=value=>{
    if(!value)return "Nunca";
    const d=new Date(value);
    return Number.isNaN(d.getTime())?"—":d.toLocaleDateString("es-ES",{year:"numeric",month:"short",day:"2-digit"});
  };
  function render(){
    const box=$("adminUsersList");
    if(!box)return;
    if(!admins.length){box.innerHTML='<p class="settings-help">No se encontraron cuentas con permisos de administrador.</p>';return;}
    box.innerHTML='<table><thead><tr><th>Administrador</th><th>Correo</th><th>Último acceso</th><th>Acción</th></tr></thead><tbody>'+
      admins.map(a=>'<tr><td><strong>'+escHtml(a.full_name||"Sin nombre")+'</strong></td><td>'+escHtml(a.email)+'</td><td>'+dateLabel(a.last_sign_in_at)+'</td><td class="admin-user-actions"><button type="button" class="btn secondary" data-edit-admin="'+escHtml(a.id)+'">✏️ Editar</button></td></tr>').join("")+
      '</tbody></table>';
  }
  async function load(){
    const refresh=$("adminUsersRefresh");
    if(refresh)refresh.disabled=true;
    status("Cargando cuentas de administradores…");
    try{
      const data=await invoke({action:"list"});
      admins=Array.isArray(data.admins)?data.admins:[];
      render();
      status(admins.length+" administrador(es) registrado(s).");
    }catch(error){
      status("No se pudieron cargar los administradores: "+error.message,true);
      const box=$("adminUsersList");if(box)box.innerHTML="";
    }finally{if(refresh)refresh.disabled=false;}
  }
  function reset(){
    form.reset();
    $("adminUserId").value="";
    $("adminUserPassword").required=true;
    $("adminUserPassword").placeholder="Mínimo 8 caracteres";
    $("adminUserPasswordLabel").firstChild.textContent="Contraseña inicial";
    $("adminUserPasswordHelp").textContent="Para crear la cuenta, establece una contraseña inicial de al menos 8 caracteres.";
    $("adminUserSave").textContent="➕ Crear administrador";
    $("adminUserCancel").hidden=true;
  }
  function edit(id){
    const a=admins.find(item=>String(item.id)===String(id));
    if(!a)return;
    $("adminUserId").value=a.id;
    $("adminUserName").value=a.full_name||"";
    $("adminUserEmail").value=a.email||"";
    $("adminUserPassword").value="";
    $("adminUserPassword").required=false;
    $("adminUserPassword").placeholder="Dejar vacío para conservarla";
    $("adminUserPasswordLabel").firstChild.textContent="Nueva contraseña (opcional)";
    $("adminUserPasswordHelp").textContent="Si no deseas cambiar la contraseña, deja este campo vacío.";
    $("adminUserSave").textContent="💾 Guardar cambios";
    $("adminUserCancel").hidden=false;
    $("adminUserName").focus();
    form.scrollIntoView({behavior:"smooth",block:"center"});
    status("Editando la cuenta de "+(a.email||"administrador")+".");
  }
  form.addEventListener("submit",async event=>{
    event.preventDefault();
    const id=$("adminUserId").value.trim();
    const full_name=$("adminUserName").value.trim();
    const email=$("adminUserEmail").value.trim().toLowerCase();
    const password=$("adminUserPassword").value;
    if(full_name.length<2){status("Escribe el nombre del administrador (mínimo 2 caracteres).",true);return;}
    if(!email){status("Escribe un correo electrónico válido.",true);return;}
    if((!id&&!password)||(password&&(password.length<8||password.length>128))){status("La contraseña debe tener entre 8 y 128 caracteres.",true);return;}
    const save=$("adminUserSave");
    save.disabled=true;
    status(id?"Guardando cambios…":"Creando cuenta de administrador…");
    try{
      const payload={action:id?"update":"create",email,full_name};
      if(id)payload.user_id=id;
      if(password)payload.password=password;
      await invoke(payload);
      reset();
      await load();
      status(id?"Administrador actualizado correctamente.":"Administrador creado correctamente.");
    }catch(error){
      status("No se pudo guardar: "+error.message,true);
    }finally{save.disabled=false;}
  });
  $("adminUserCancel")?.addEventListener("click",reset);
  $("adminUsersRefresh")?.addEventListener("click",load);
  $("adminUsersList")?.addEventListener("click",event=>{
    const button=event.target.closest("[data-edit-admin]");
    if(button)edit(button.dataset.editAdmin);
  });
  document.querySelector('#eiAdminNav a[href="#adminUsersPanel"]')?.addEventListener("click",()=>load());
  window.loadAdminUsersAdmin=load;
  if(location.hash==="#adminUsersPanel")load();
})();