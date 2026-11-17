/* EcoTrack Collector Dashboard */
document.addEventListener('DOMContentLoaded', async function () {
  var SECS=['overview','tasks','history','profile'];
  var navLinks=document.querySelectorAll('.dash-nav a[data-section]');
  var titleEl=document.getElementById('topbarTitle');
  var TITLES={'overview':'Overview','tasks':'Assigned Tasks','history':'Completed History','profile':'My Profile'};
  var sidebar=document.getElementById('dashSidebar');
  var overlay=document.getElementById('sidebarOverlay');
  var toggleBtn=document.getElementById('sidebarToggle');
  function closeSidebar(){if(sidebar)sidebar.classList.remove('open');if(overlay)overlay.classList.remove('show');}
  function showSection(id){
    SECS.forEach(function(s){var el=document.getElementById('sec-'+s);if(el)el.hidden=s!==id;});
    navLinks.forEach(function(a){a.classList.toggle('active',a.dataset.section===id);});
    if(titleEl)titleEl.textContent=TITLES[id]||id;
    closeSidebar();
  }
  navLinks.forEach(function(a){a.addEventListener('click',function(e){e.preventDefault();showSection(a.dataset.section);});});
  document.querySelectorAll('[data-section]').forEach(function(el){
    if(el.tagName==='A'&&!el.closest('.dash-nav'))el.addEventListener('click',function(e){e.preventDefault();showSection(el.dataset.section);});
  });
  if(toggleBtn)toggleBtn.addEventListener('click',function(){sidebar.classList.toggle('open');overlay.classList.toggle('show');});
  if(overlay)overlay.addEventListener('click',closeSidebar);

  var msgEl=document.getElementById('collectorMessage');
  function showMsg(t,type){
    if(!msgEl)return;msgEl.className='alert alert-'+(type||'info');msgEl.textContent=t;msgEl.hidden=false;
    clearTimeout(msgEl._t);msgEl._t=setTimeout(function(){msgEl.hidden=true;},5000);
  }

  var allTasks=[];

  async function loadAll(){
    var r=await Promise.all([apiFetch('/auth/me'),apiFetch('/collector/tasks')]);
    var me=r[0],tasksRes=r[1];
    if(me.user.role!=='collector'){window.location.href='/login.html';return;}
    var ne=document.getElementById('collectorName');var ae=document.getElementById('collectorAvatar');
    if(ne)ne.textContent=me.user.name;if(ae)ae.textContent=me.user.name.charAt(0).toUpperCase();
    allTasks=tasksRes.tasks||[];
    renderProfile(me.user);renderStats();renderOverview();renderTasks();renderHistory();
  }

  function renderProfile(u){
    var pr=document.getElementById('collectorProfile');if(!pr)return;
    pr.innerHTML='<div class="profile-card"><div class="profile-avatar">'+escapeHTML(u.name.charAt(0).toUpperCase())+'</div><div class="profile-info"><strong>'+escapeHTML(u.name)+'</strong><span>Collector Account</span></div></div>'
      +'<div class="profile-details-grid" style="margin-top:1.25rem;">'
      +'<div class="profile-field"><label>Email</label><p>'+escapeHTML(u.email)+'</p></div>'
      +'<div class="profile-field"><label>Phone</label><p>'+escapeHTML(u.phone)+'</p></div>'
      +'<div class="profile-field"><label>Location</label><p>'+escapeHTML(u.location)+'</p></div>'
      +'<div class="profile-field"><label>Member Since</label><p>'+new Date(u.createdAt).toLocaleDateString()+'</p></div>'
      +'</div>';
  }

  function renderStats(){
    var g=document.getElementById('collectorStatsGrid');if(!g)return;
    var active=allTasks.filter(function(t){return t.status!=='completed';}).length;
    var done=allTasks.filter(function(t){return t.status==='completed';}).length;
    var blocked=allTasks.filter(function(t){return t.status==='blocked';}).length;
    g.innerHTML=[
      {l:'Assigned Tasks',v:active,i:'\u{1F4CD}'},
      {l:'Completed',v:done,i:'\u{2705}'},
      {l:'Blocked',v:blocked,i:'\u{26A0}'},
      {l:'Total Tasks',v:allTasks.length,i:'\u{1F4CB}'}
    ].map(function(x){return '<div class="stat-box"><h4>'+x.i+' '+x.l+'</h4><h3>'+x.v+'</h3></div>';}).join('');
  }

  function renderOverview(){
    var tb=document.getElementById('overviewTaskTable');if(!tb)return;
    var list=allTasks.filter(function(t){return t.status!=='completed';}).slice(0,5);
    if(!list.length){tb.innerHTML='<tr><td colspan="4" class="empty-state">No active tasks assigned.</td></tr>';return;}
    tb.innerHTML=list.map(function(t){
      return '<tr><td><strong>'+escapeHTML(t.report?t.report.category:'-')+'</strong></td><td>'+escapeHTML(t.report?t.report.location:'-')+'</td><td style="font-size:.8rem;">'+escapeHTML(t.scheduledDate?new Date(t.scheduledDate).toLocaleDateString():'TBD')+'</td><td>'+formatStatusBadge(t.status)+'</td></tr>';
    }).join('');
  }

  function renderTasks(){
    var tb=document.getElementById('taskTable');if(!tb)return;
    var active=allTasks.filter(function(t){return t.status!=='completed';});
    if(!active.length){tb.innerHTML='<tr><td colspan="9" class="empty-state">No active tasks assigned.</td></tr>';return;}
    tb.innerHTML=active.map(function(t){
      var ph=t.report&&t.report.imageContentType?'<a href="/api/reports/'+encodeURIComponent(t.report._id)+'/image" target="_blank" class="btn btn-ghost btn-sm">View</a>':'-';
      var acts='';
      if(t.status==='assigned')acts='<button class="btn btn-primary btn-sm" data-tid="'+escapeHTML(t._id)+'" data-ts="in_progress">Start Task</button>';
      else if(t.status==='in_progress')acts='<div class="table-actions"><button class="btn btn-primary btn-sm" data-tid="'+escapeHTML(t._id)+'" data-ts="completed">Mark Done</button><button class="btn btn-warning btn-sm" data-tid="'+escapeHTML(t._id)+'" data-ts="blocked">Report Issue</button></div>';
      else if(t.status==='blocked')acts='<button class="btn btn-secondary btn-sm" data-tid="'+escapeHTML(t._id)+'" data-ts="in_progress">Resume</button>';
      return '<tr><td><strong>'+escapeHTML(t.report?t.report.category:'-')+'</strong></td><td>'+escapeHTML(t.report?t.report.location:'-')+'</td><td style="font-size:.82rem;max-width:160px;white-space:normal;">'+escapeHTML(t.report?t.report.description.slice(0,80):'')+'</td><td>'+ph+'</td><td>'+escapeHTML(t.report&&t.report.resident?t.report.resident.name:'Unknown')+'</td><td style="font-size:.8rem;">'+escapeHTML(t.scheduledDate?new Date(t.scheduledDate).toLocaleDateString():'TBD')+'</td><td>'+formatStatusBadge(t.status)+'</td><td style="font-size:.82rem;max-width:140px;white-space:normal;">'+escapeHTML(t.notes||'-')+'</td><td>'+acts+'</td></tr>';
    }).join('');

    tb.querySelectorAll('[data-tid]').forEach(function(btn){
      btn.addEventListener('click',async function(){
        var status=btn.dataset.ts;var notes='';
        if(status==='blocked'){notes=window.prompt('Please describe the issue blocking this task:','');if(notes===null||!notes.trim())return;}
        btn.disabled=true;
        try{
          await apiFetch('/collector/tasks/'+btn.dataset.tid+'/status',{method:'PATCH',body:JSON.stringify({status:status,notes:notes||''})});
          showMsg('Task updated to: '+status,'success');await loadAll();
        }catch(err){showMsg(err.message,'error');btn.disabled=false;}
      });
    });
  }

  function renderHistory(){
    var tb=document.getElementById('collectionHistory');if(!tb)return;
    var done=allTasks.filter(function(t){return t.status==='completed';});
    if(!done.length){tb.innerHTML='<tr><td colspan="4" class="empty-state">No completed collections yet.</td></tr>';return;}
    tb.innerHTML=done.map(function(t){
      return '<tr><td><strong>'+escapeHTML(t.report?t.report.category:'-')+'</strong></td><td>'+escapeHTML(t.report?t.report.location:'-')+'</td><td>'+escapeHTML(t.completionDate?new Date(t.completionDate).toLocaleString():'N/A')+'</td><td style="font-size:.82rem;max-width:200px;white-space:normal;">'+escapeHTML(t.notes||'-')+'</td></tr>';
    }).join('');
  }

  try{await loadAll();}catch(err){
    if(err.message.includes('401'))window.location.href='/login.html';
    else showMsg(err.message,'error');
  }
});
