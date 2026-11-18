/* EcoTrack Admin Dashboard */
"use strict";
document.addEventListener("DOMContentLoaded", async function () {

  /* clipboard fallback */
  function fallbackCopy(text, btn) {
    var ta = document.createElement("textarea");
    ta.value = text; ta.style.cssText = "position:fixed;top:-9999px;left:-9999px;";
    document.body.appendChild(ta); ta.focus(); ta.select();
    try { document.execCommand("copy"); if(btn){ btn.textContent="Copied!"; setTimeout(function(){ btn.textContent="Copy"; },2000); } }
    catch(e) { if(btn) btn.textContent="Select & copy manually"; }
    document.body.removeChild(ta);
  }

  /* sidebar nav */
  var SECS = ["overview","users","reports","collections","create-collector"];
  var navLinks = document.querySelectorAll(".dash-nav a[data-section]");
  var titleEl  = document.getElementById("topbarTitle");
  var TITLES   = {
    "overview":"Dashboard Overview","users":"User Management",
    "reports":"Waste Reports","collections":"Collection Tasks","create-collector":"Add Collector"
  };
  var sidebar   = document.getElementById("dashSidebar");
  var overlay   = document.getElementById("sidebarOverlay");
  var toggleBtn = document.getElementById("sidebarToggle");

  function closeSidebar(){ if(sidebar)sidebar.classList.remove("open"); if(overlay)overlay.classList.remove("show"); }
  function showSection(id){
    SECS.forEach(function(s){ var el=document.getElementById("sec-"+s); if(el)el.hidden=s!==id; });
    navLinks.forEach(function(a){ a.classList.toggle("active",a.dataset.section===id); });
    if(titleEl)titleEl.textContent=TITLES[id]||id;
    closeSidebar();
  }
  navLinks.forEach(function(a){ a.addEventListener("click",function(e){ e.preventDefault(); showSection(a.dataset.section); }); });
  if(toggleBtn)toggleBtn.addEventListener("click",function(){ sidebar.classList.toggle("open"); overlay.classList.toggle("show"); });
  if(overlay)overlay.addEventListener("click",closeSidebar);

  /* password toggles */
  document.querySelectorAll(".toggle-pass").forEach(function(btn){
    btn.addEventListener("click",function(){ var inp=document.getElementById(btn.dataset.target); if(inp)inp.type=inp.type==="password"?"text":"password"; });
  });

  /* message */
  var msgEl = document.getElementById("adminMessage");
  function showMsg(t,type){
    if(!msgEl)return;
    msgEl.className="alert alert-"+(type||"info"); msgEl.textContent=t; msgEl.hidden=false;
    clearTimeout(msgEl._t); msgEl._t=setTimeout(function(){ msgEl.hidden=true; },6000);
  }

  /* data */
  var allUsers=[], allReports=[], allCollections=[];

  async function loadAll(){
    try{
      var r = await Promise.all([
        apiFetch("/auth/me"), apiFetch("/admin/stats"), apiFetch("/admin/users?role=all"),
        apiFetch("/admin/reports"), apiFetch("/admin/collections")
      ]);
      var me=r[0],stats=r[1],us=r[2],rep=r[3],col=r[4];
      if(me.user.role!=="admin"){ window.location.href="/login.html"; return; }
      var ne=document.getElementById("adminName"), ae=document.getElementById("adminAvatar");
      if(ne)ne.textContent=me.user.name;
      if(ae && !ae.querySelector("img"))ae.textContent=me.user.name.charAt(0).toUpperCase();
      renderStats(stats.stats);
      allUsers=us.users||[]; allReports=rep.reports||[]; allCollections=col.collections||[];
      renderUsers(); renderReports(); renderCollections();
    }catch(err){ showMsg(err.message,"error"); }
  }

  /* stats */
  function renderStats(s){
    var g=document.getElementById("statsGrid"); if(!g)return;
    var items=[
      {l:"Total Residents",v:s.residents,icon:"users"},
      {l:"Total Collectors",v:s.collectors,icon:"truck"},
      {l:"Total Reports",v:s.totalReports,icon:"reports"},
      {l:"Pending Reports",v:s.pendingReports,icon:"chart"},
      {l:"Assigned",v:s.assignedCollections,icon:"send"},
      {l:"Completed",v:s.completedCollections,icon:"check"}
    ];
    g.innerHTML=items.map(function(x){
      return "<div class=\"stat-box\">" +
        "<h4><svg class=\"icon icon-sm\" style=\"margin-right:4px;\"><use href=\"/images/icons.svg#icon-"+x.icon+"\"></use></svg>"+x.l+"</h4>" +
        "<h3>"+x.v+"</h3></div>";
    }).join("");
  }

  /* users */
  function renderUsers(){
    var tb=document.getElementById("usersTable"); if(!tb)return;
    var rf=(document.getElementById("userRoleFilter")||{}).value||"all";
    var q=((document.getElementById("userSearch")||{}).value||"").trim().toLowerCase();
    var list=allUsers.filter(function(u){ return(rf==="all"||u.role===rf)&&(!q||(u.name+u.email).toLowerCase().includes(q)); });
    if(!list.length){ tb.innerHTML="<tr><td colspan=\"7\" class=\"empty-state\">No users found.</td></tr>"; return; }
    tb.innerHTML=list.map(function(u){
      var sb=formatStatusBadge(u.status);
      var rb="<span style=\"display:inline-flex;padding:.25rem .6rem;border-radius:999px;font-size:.75rem;font-weight:700;background:#ede9fe;color:#5b21b6;\">"+escapeHTML(u.role)+"</span>";
      var editBtn="<button class=\"btn btn-sm btn-action-edit\" data-uid=\""+escapeHTML(u._id)+"\" data-action=\"edit\" title=\"Edit user\">" +
        "<svg class=\"icon icon-sm\"><use href=\"/images/icons.svg#icon-edit\"></use></svg></button>";
      var resetBtn=u.role==="admin"?"":"<button class=\"btn btn-sm btn-action-reset\" data-uid=\""+escapeHTML(u._id)+"\" data-action=\"reset\" title=\"Reset password\">" +
        "<svg class=\"icon icon-sm\"><use href=\"/images/icons.svg#icon-lock\"></use></svg></button>";
      var toggleBtn=u.role==="admin"?"":
        "<button class=\"btn btn-sm "+(u.status==="active"?"btn-action-deactivate":"btn-action-activate")+"\" data-uid=\""+escapeHTML(u._id)+"\" data-action=\"toggle\" data-ust=\""+(u.status==="active"?"inactive":"active")+"\">" +
        (u.status==="active"?"Deactivate":"Activate")+"</button>";
      var delBtn=u.role==="admin"?"":"<button class=\"btn btn-sm btn-action-delete\" data-uid=\""+escapeHTML(u._id)+"\" data-action=\"delete\" title=\"Delete user\">" +
        "<svg class=\"icon icon-sm\"><use href=\"/images/icons.svg#icon-trash\"></use></svg></button>";
      return "<tr data-user-row=\""+escapeHTML(u._id)+"\">" +
        "<td><strong>"+escapeHTML(u.name)+"</strong></td>" +
        "<td>"+escapeHTML(u.email)+"</td>" +
        "<td>"+escapeHTML(u.phone||"—")+"</td>" +
        "<td>"+rb+"</td>" +
        "<td>"+sb+"</td>" +
        "<td style=\"font-size:.8rem;color:#666;\">"+new Date(u.createdAt).toLocaleDateString()+"</td>" +
        "<td><div class=\"user-actions\">"+editBtn+resetBtn+toggleBtn+delBtn+"</div></td>" +
        "</tr>";
    }).join("");

    /* delegate clicks */
    tb.addEventListener("click", handleUserAction);
  }

  function handleUserAction(e){
    var btn=e.target.closest("[data-action]"); if(!btn)return;
    var uid=btn.dataset.uid;
    var user=allUsers.find(function(u){ return u._id===uid; });
    if(!user)return;
    var action=btn.dataset.action;
    if(action==="edit")   openEditDialog(user);
    if(action==="delete") confirmDeleteUser(user,btn);
    if(action==="reset")  openResetPassDialog(user);
    if(action==="toggle") toggleUserStatus(user,btn);
  }

  async function toggleUserStatus(user,btn){
    btn.disabled=true;
    try{
      await apiFetch("/admin/users/"+user._id+"/status",{method:"PATCH",body:JSON.stringify({status:btn.dataset.ust})});
      showMsg("User status updated.","success"); await loadAll();
    }catch(err){ showMsg(err.message,"error"); btn.disabled=false; }
  }

  async function confirmDeleteUser(user,btn){
    if(!confirm("Delete "+user.name+"?\n\nThis will remove their account and all associated reports. This cannot be undone."))return;
    btn.disabled=true;
    try{
      await apiFetch("/admin/users/"+user._id,{method:"DELETE"});
      showMsg("User deleted.","success"); await loadAll();
    }catch(err){ showMsg(err.message,"error"); btn.disabled=false; }
  }

  /* edit dialog */
  var currentEditId=null;
  function openEditDialog(user){
    currentEditId=user._id;
    document.getElementById("editUserId").value=user._id;
    document.getElementById("editUserName").value=user.name;
    document.getElementById("editUserPhone").value=user.phone||"";
    document.getElementById("editUserLocation").value=user.location||"";
    var em=document.getElementById("editUserMessage"); if(em){ em.hidden=true; }
    document.getElementById("editUserDialog").showModal();
  }
  document.getElementById("closeEditUser").addEventListener("click",function(){ document.getElementById("editUserDialog").close(); });
  document.getElementById("cancelEditUser").addEventListener("click",function(){ document.getElementById("editUserDialog").close(); });
  document.getElementById("editUserForm").addEventListener("submit",async function(e){
    e.preventDefault();
    var btn=this.querySelector("button[type=submit]"); btn.disabled=true; btn.textContent="Saving…";
    var em=document.getElementById("editUserMessage"); if(em)em.hidden=true;
    try{
      await apiFetch("/admin/users/"+currentEditId,{method:"PATCH",body:JSON.stringify({
        name:document.getElementById("editUserName").value.trim(),
        phone:document.getElementById("editUserPhone").value.trim(),
        location:document.getElementById("editUserLocation").value.trim()
      })});
      document.getElementById("editUserDialog").close();
      showMsg("User updated successfully.","success"); await loadAll();
    }catch(err){
      if(em){ em.className="alert alert-error"; em.textContent=err.message; em.hidden=false; }
      btn.disabled=false; btn.textContent="Save Changes";
    }
  });

  /* reset password dialog */
  var currentResetId=null;
  function openResetPassDialog(user){
    currentResetId=user._id;
    document.getElementById("newUserPassword").value="";
    var info=document.getElementById("resetPassUserInfo");
    if(info)info.textContent="Resetting password for: "+user.name+" ("+user.email+")";
    var rm=document.getElementById("resetPassMessage"); if(rm)rm.hidden=true;
    document.getElementById("resetPassForm").hidden=false;
    document.getElementById("resetPassResult").hidden=true;
    document.getElementById("resetPassDialog").showModal();
  }
  document.getElementById("closeResetPass").addEventListener("click",function(){ document.getElementById("resetPassDialog").close(); });
  document.getElementById("cancelResetPass").addEventListener("click",function(){ document.getElementById("resetPassDialog").close(); });
  document.getElementById("closeResetPassDone").addEventListener("click",function(){ document.getElementById("resetPassDialog").close(); });
  document.getElementById("confirmResetPass").addEventListener("click",async function(){
    var newPassword=document.getElementById("newUserPassword").value;
    var rm=document.getElementById("resetPassMessage");
    if(!newPassword||newPassword.length<8){
      if(rm){ rm.className="alert alert-error"; rm.textContent="Password must be at least 8 characters."; rm.hidden=false; }
      return;
    }
    this.disabled=true; this.textContent="Resetting…";
    try{
      var res=await apiFetch("/admin/users/"+currentResetId+"/reset-password",{method:"POST",body:JSON.stringify({newPassword:newPassword})});
      document.getElementById("resetPassForm").hidden=true;
      var suc=document.getElementById("resetPassSuccess");
      suc.textContent=res.message+" Password reset for "+escapeHTML(res.userName)+".";
      var waBox=document.getElementById("resetPassWa");

      /* Build the WhatsApp message text */
      var waText = "EcoTrack Password Reset\n\n" +
        "Hello " + (res.userName||"") + ",\n\n" +
        "Your EcoTrack account password has been reset by an administrator.\n\n" +
        "Email: " + (res.userEmail||"") + "\n" +
        "New Password: " + (document.getElementById("newUserPassword").value) + "\n\n" +
        "Please sign in and change your password immediately.\n\n" +
        "EcoTrack Support\n" + window.location.origin;

      var phone = (res.userPhone||"").replace(/[^0-9]/g,"");
      if(phone && phone.startsWith("0")) phone = "256" + phone.slice(1);
      if(!phone || phone.length < 7) phone = "256776291622";

      var waMeUrl  = "https://wa.me/"  + phone + "?text=" + encodeURIComponent(waText);
      var waWebUrl = "https://web.whatsapp.com/send?phone=" + phone + "&text=" + encodeURIComponent(waText);

      /* AUTO-OPEN WhatsApp immediately */
      window.open(waMeUrl, "_blank", "noopener,noreferrer");

      waBox.innerHTML =
        "<div style='padding:1rem;background:#f0fdf4;border:1.5px solid #86efac;border-radius:12px;'>" +
          "<p style='font-size:.85rem;font-weight:700;color:#065f46;margin-bottom:.35rem;'>" +
            "WhatsApp opened automatically</p>" +
          "<p style='font-size:.78rem;color:var(--muted);line-height:1.55;margin-bottom:.85rem;'>" +
            "If WhatsApp did not open automatically, click one of the buttons below.</p>" +
          "<div style='display:flex;gap:.6rem;flex-wrap:wrap;'>" +
            "<a href='" + waMeUrl + "' target='_blank' rel='noopener noreferrer' " +
               "class='btn-whatsapp' style='font-size:.82rem;text-decoration:none;'>" +
              "<svg class='icon' style='width:16px;height:16px;'>" +
                "<use href='/images/icons.svg#icon-whatsapp'></use></svg>" +
              " Open WhatsApp App</a>" +
            "<a href='" + waWebUrl + "' target='_blank' rel='noopener noreferrer' " +
               "class='btn btn-secondary btn-sm' style='text-decoration:none;'>" +
               "WhatsApp Web</a>" +
          "</div>" +
        "</div>";
      await loadAll();
    }catch(err){
      if(rm){ rm.className="alert alert-error"; rm.textContent=err.message; rm.hidden=false; }
      this.disabled=false; this.textContent="Reset & Notify via WhatsApp";
    }
  });

  document.getElementById("userRoleFilter").addEventListener("change",renderUsers);
  document.getElementById("userSearch").addEventListener("input",renderUsers);

  /* reports */
  function renderReports(){
    var tb=document.getElementById("reportsTable"); if(!tb)return;
    var sf=(document.getElementById("reportStatusFilter")||{}).value||"all";
    var q=((document.getElementById("reportSearch")||{}).value||"").trim().toLowerCase();
    var collectors=allUsers.filter(function(u){ return u.role==="collector"&&u.status==="active"; });
    var list=allReports.filter(function(r){ return(sf==="all"||r.status===sf)&&(!q||(r.category+r.location+(r.resident?r.resident.name:"")).toLowerCase().includes(q)); });
    if(!list.length){ tb.innerHTML="<tr><td colspan=\"7\" class=\"empty-state\">No reports found.</td></tr>"; return; }
    tb.innerHTML=list.map(function(r){
      var ph=r.imageContentType?"<a href=\"/api/reports/"+encodeURIComponent(r._id)+"/image\" target=\"_blank\" class=\"btn btn-ghost btn-sm\"><svg class=\"icon icon-sm\"><use href=\"/images/icons.svg#icon-photo\"></use></svg> View</a>":"<span style=\"color:#aaa;\">None</span>";
      var opts=collectors.map(function(c){ return "<option value=\""+escapeHTML(c._id)+"\">"+escapeHTML(c.name)+"</option>"; }).join("");
      var cs="<select data-csel style=\"margin:0;padding:.35rem .5rem;font-size:.8rem;border-radius:8px;width:155px;\"><option value=\"\">Select collector</option>"+opts+"</select>" +
        "<input type=\"date\" data-sdate style=\"margin:.3rem 0 0;padding:.35rem .5rem;font-size:.8rem;border-radius:8px;width:155px;\"/>";
      var acts="";
      if(r.status==="Pending"){
        acts="<div class=\"table-actions\">" +
          "<button class=\"btn btn-primary btn-sm\" data-act=\"approve\" data-id=\""+escapeHTML(r._id)+"\">Approve</button>" +
          "<button class=\"btn btn-danger btn-sm\" data-act=\"reject\" data-id=\""+escapeHTML(r._id)+"\">Reject</button>" +
          "</div>";
      }else if(r.status==="Approved"||r.status==="Assigned"){
        acts="<button class=\"btn btn-secondary btn-sm\" data-act=\"assign\" data-id=\""+escapeHTML(r._id)+"\">Assign</button>";
      }else{
        acts="<span style=\"font-size:.78rem;color:#888;\">"+r.status+"</span>";
      }
      return "<tr data-rs=\""+escapeHTML(r.status)+"\">" +
        "<td><strong>"+escapeHTML(r.category)+"</strong></td>" +
        "<td>"+escapeHTML(r.location)+"</td>" +
        "<td>"+escapeHTML(r.resident?r.resident.name:"Unknown")+"</td>" +
        "<td>"+ph+"</td>" +
        "<td>"+formatStatusBadge(r.status)+"</td>" +
        "<td>"+cs+"</td>" +
        "<td>"+acts+"</td>" +
        "</tr>";
    }).join("");

    tb.querySelectorAll("[data-act=\"approve\"],[data-act=\"reject\"]").forEach(function(btn){
      btn.addEventListener("click",async function(){
        btn.disabled=true;
        try{
          await apiFetch("/admin/reports/"+btn.dataset.id+"/status",{method:"PATCH",body:JSON.stringify({status:btn.dataset.act==="approve"?"Approved":"Rejected"})});
          showMsg("Report "+btn.dataset.act+"d.","success"); await loadAll();
        }catch(err){ showMsg(err.message,"error"); btn.disabled=false; }
      });
    });
    tb.querySelectorAll("[data-act=\"assign\"]").forEach(function(btn){
      btn.addEventListener("click",async function(){
        var row=btn.closest("tr");
        var cid=row.querySelector("[data-csel]").value;
        var sd=row.querySelector("[data-sdate]").value;
        if(!cid){ showMsg("Select an active collector first.","error"); return; }
        btn.disabled=true;
        try{
          await apiFetch("/admin/reports/"+btn.dataset.id+"/status",{method:"PATCH",body:JSON.stringify({status:"Assigned",collectorId:cid,scheduledDate:sd||undefined})});
          showMsg("Task assigned.","success"); await loadAll();
        }catch(err){ showMsg(err.message,"error"); btn.disabled=false; }
      });
    });
  }

  document.getElementById("reportStatusFilter").addEventListener("change",renderReports);
  document.getElementById("reportSearch").addEventListener("input",renderReports);

  /* collections */
  function renderCollections(){
    var tb=document.getElementById("collectionsTable"); if(!tb)return;
    if(!allCollections.length){ tb.innerHTML="<tr><td colspan=\"6\" class=\"empty-state\">No collection tasks yet.</td></tr>"; return; }
    var sc={assigned:"assigned",in_progress:"in-progress",completed:"completed",blocked:"rejected"};
    tb.innerHTML=allCollections.map(function(c){
      return "<tr>" +
        "<td><strong>"+escapeHTML(c.report?c.report.category:"—")+"</strong></td>" +
        "<td>"+escapeHTML(c.report?c.report.location:"—")+"</td>" +
        "<td>"+escapeHTML(c.collector?c.collector.name:"Unknown")+"</td>" +
        "<td>"+escapeHTML(c.scheduledDate?new Date(c.scheduledDate).toLocaleDateString():"TBD")+"</td>" +
        "<td><span class=\"badge "+(sc[c.status]||"")+"\">"+ escapeHTML(c.status)+"</span></td>" +
        "<td style=\"font-size:.82rem;white-space:normal;max-width:180px;\">"+escapeHTML(c.notes||"—")+"</td>" +
        "</tr>";
    }).join("");
  }

  /* create collector */
  var cf=document.getElementById("collectorForm");
  if(cf){
    cf.addEventListener("submit",async function(e){
      e.preventDefault();
      var btn=cf.querySelector("button[type=submit]"); btn.disabled=true; btn.textContent="Creating…";
      try{
        await apiFetch("/admin/collectors",{method:"POST",body:JSON.stringify(Object.fromEntries(new FormData(cf)))});
        cf.reset(); showMsg("Collector account created.","success"); await loadAll();
      }catch(err){ showMsg(err.message,"error"); }
      btn.disabled=false; btn.textContent="Create Collector Account";
    });
  }

  try{ await loadAll(); }catch(err){ showMsg(err.message,"error"); }
});
