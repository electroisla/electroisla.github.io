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
      admins.map(a=>'<tr><td><strong>'+escHtml(a.full_name||"Sin nombre")+'</strong></td><td>'+escHtml(a.email)+'</td><td>'+dateLabel(a.last_sign_in_at)+'</td><td class="admin-user-actions"><button type="button" class="btn secondary admin-user-icon-btn" data-edit-admin="'+escHtml(a.id)+'" title="Editar administrador" aria-label="Editar administrador"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg></button><button type="button" class="btn danger admin-user-icon-btn" data-delete-admin="'+escHtml(a.id)+'" data-admin-email="'+escHtml(a.email)+'" title="Eliminar administrador" aria-label="Eliminar administrador"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="m19 6-1 14H6L5 6"/><path d="M10 11v5M14 11v5"/></svg></button></td></tr>').join("")+
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
  $("adminUsersList")?.addEventListener("click",async event=>{
    const editButton=event.target.closest("[data-edit-admin]");
    if(editButton){edit(editButton.dataset.editAdmin);return;}
    const deleteButton=event.target.closest("[data-delete-admin]");
    if(!deleteButton)return;
    const email=deleteButton.dataset.adminEmail||"esta cuenta";
    if(!confirm("¿Eliminar definitivamente la cuenta de administrador "+email+"? Esta acción no se puede deshacer."))return;
    deleteButton.disabled=true;status("Eliminando cuenta…");
    try{await invoke({action:"delete",user_id:deleteButton.dataset.deleteAdmin});await load();status("Cuenta "+email+" eliminada.");}
    catch(error){status("No se pudo eliminar: "+error.message,true);deleteButton.disabled=false;}
  });
  document.querySelector('#eiAdminNav a[href="#adminUsersPanel"]')?.addEventListener("click",()=>load());
  window.loadAdminUsersAdmin=load;
  if(location.hash==="#adminUsersPanel")load();
})();