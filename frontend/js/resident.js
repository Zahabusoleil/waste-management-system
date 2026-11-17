/* EcoTrack Resident Dashboard */
document.addEventListener('DOMContentLoaded', async function () {
  var SECS=['overview','submit','my-reports','profile'];
  var navLinks=document.querySelectorAll('.dash-nav a[data-section]');
  var titleEl=document.getElementById('topbarTitle');
  var TITLES={'overview':'Overview','submit':'Submit Report','my-reports':'My Reports','profile':'My Profile'};
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

  var msgEl=document.getElementById('residentMessage');
  function showMsg(t,type){
    if(!msgEl)return;msgEl.className='alert alert-'+(type||'info');msgEl.textContent=t;msgEl.hidden=false;
    clearTimeout(msgEl._t);msgEl._t=setTimeout(function(){msgEl.hidden=true;},5000);
  }

  var allReports=[];

  async function loadProfile(){
    var res=await apiFetch('/auth/me');
    var u=res.user;
    var ne=document.getElementById('residentName');var ae=document.getElementById('residentAvatar');
    if(ne)ne.textContent=u.name;
    if(ae)ae.textContent=u.name.charAt(0).toUpperCase();
    var pr=document.getElementById('residentProfile');
    if(pr){
      pr.innerHTML='<div class="profile-card"><div class="profile-avatar">'+escapeHTML(u.name.charAt(0).toUpperCase())+'</div><div class="profile-info"><strong>'+escapeHTML(u.name)+'</strong><span>Resident Account</span></div></div>'
        +'<div class="profile-details-grid" style="margin-top:1.25rem;">'
        +'<div class="profile-field"><label>Email</label><p>'+escapeHTML(u.email)+'</p></div>'
        +'<div class="profile-field"><label>Phone</label><p>'+escapeHTML(u.phone)+'</p></div>'
        +'<div class="profile-field"><label>Location</label><p>'+escapeHTML(u.location)+'</p></div>'
        +'<div class="profile-field"><label>Member Since</label><p>'+new Date(u.createdAt).toLocaleDateString()+'</p></div>'
        +'</div>';
    }
    return u;
  }

  async function loadReports(){
    var r=await apiFetch('/reports');
    allReports=r.reports||[];
    renderStats();renderRecentTable();renderFullTable();
  }

  function renderStats(){
    var g=document.getElementById('residentStatsGrid');if(!g)return;
    var total=allReports.length;
    var pending=allReports.filter(function(r){return r.status==='Pending';}).length;
    var active=allReports.filter(function(r){return r.status==='Assigned'||r.status==='In Progress';}).length;
    var done=allReports.filter(function(r){return r.status==='Completed';}).length;
    g.innerHTML=[
      {l:'Total Reports',v:total,i:'\u{1F4CB}'},
      {l:'Pending Review',v:pending,i:'\u{23F3}'},
      {l:'In Progress',v:active,i:'\u{1F69B}'},
      {l:'Completed',v:done,i:'\u{2705}'}
    ].map(function(x){return '<div class="stat-box"><h4>'+x.i+' '+x.l+'</h4><h3>'+x.v+'</h3></div>';}).join('');
  }

  function renderRecentTable(){
    var tb=document.getElementById('recentReportsTable');if(!tb)return;
    var list=allReports.slice(0,5);
    if(!list.length){tb.innerHTML='<tr><td colspan="4" class="empty-state">No reports submitted yet.</td></tr>';return;}
    tb.innerHTML=list.map(function(r){
      return '<tr><td><strong>'+escapeHTML(r.category)+'</strong></td><td>'+escapeHTML(r.location)+'</td><td>'+formatStatusBadge(r.status)+'</td><td style="font-size:.8rem;">'+new Date(r.createdAt).toLocaleDateString()+'</td></tr>';
    }).join('');
  }

  function renderFullTable(){
    var tb=document.getElementById('reportList');if(!tb)return;
    var sf=(document.getElementById('statusFilter')||{}).value||'all';
    var list=sf==='all'?allReports:allReports.filter(function(r){return r.status===sf;});
    if(!list.length){tb.innerHTML='<tr><td colspan="7" class="empty-state">No reports found for this filter.</td></tr>';return;}
    tb.innerHTML=list.map(function(r){
      var ph=r.imageContentType?'<a href="/api/reports/'+encodeURIComponent(r._id)+'/image" target="_blank" class="btn btn-ghost btn-sm">View</a>':'-';
      var acts=['Pending','Rejected'].includes(r.status)?'<div class="table-actions"><button class="btn btn-secondary btn-sm" data-edit="'+escapeHTML(r._id)+'">Edit</button><button class="btn btn-danger btn-sm" data-del="'+escapeHTML(r._id)+'">Delete</button></div>':'-';
      return '<tr><td><strong>'+escapeHTML(r.category)+'</strong></td><td>'+escapeHTML(r.location)+'</td><td style="max-width:200px;white-space:normal;font-size:.82rem;">'+escapeHTML(r.description.slice(0,80))+(r.description.length>80?'...':'')+'</td><td>'+ph+'</td><td>'+formatStatusBadge(r.status)+'</td><td style="font-size:.8rem;">'+new Date(r.createdAt).toLocaleDateString()+'</td><td>'+acts+'</td></tr>';
    }).join('');

    tb.querySelectorAll('[data-edit]').forEach(function(btn){
      btn.addEventListener('click',function(){
        var rep=allReports.find(function(r){return r._id===btn.dataset.edit;});if(!rep)return;
        document.getElementById('editReportId').value=rep._id;
        document.getElementById('editCategory').value=rep.category;
        document.getElementById('editLocation').value=rep.location;
        document.getElementById('editDescription').value=rep.description;
        document.getElementById('editImage').value='';
        document.getElementById('editReportDialog').showModal();
      });
    });
    tb.querySelectorAll('[data-del]').forEach(function(btn){
      btn.addEventListener('click',async function(){
        if(!confirm('Delete this report? This cannot be undone.'))return;
        btn.disabled=true;
        try{await apiFetch('/reports/'+btn.dataset.del,{method:'DELETE'});showMsg('Report deleted.','success');await loadReports();}
        catch(err){showMsg(err.message,'error');btn.disabled=false;}
      });
    });
  }

  var sf=document.getElementById('statusFilter');
  if(sf)sf.addEventListener('change',renderFullTable);

  var reportForm=document.getElementById('reportForm');
  if(reportForm){
    reportForm.addEventListener('submit',async function(e){
      e.preventDefault();
      var btn=reportForm.querySelector('button[type=submit]');btn.disabled=true;btn.textContent='Submitting...';
      try{
        await apiFetch('/reports',{method:'POST',body:new FormData(reportForm)});
        showMsg('Report submitted successfully.','success');
        reportForm.reset();await loadReports();showSection('my-reports');
      }catch(err){showMsg(err.message,'error');}
      btn.disabled=false;btn.textContent='Submit Report';
    });
  }

  var editForm=document.getElementById('editReportForm');
  if(editForm){
    editForm.addEventListener('submit',async function(e){
      e.preventDefault();
      var btn=editForm.querySelector('button[type=submit]');btn.disabled=true;btn.textContent='Saving...';
      var fd=new FormData(editForm);var id=fd.get('reportId');fd.delete('reportId');
      try{
        await apiFetch('/reports/'+encodeURIComponent(id),{method:'PUT',body:fd});
        document.getElementById('editReportDialog').close();
        showMsg('Report updated.','success');await loadReports();
      }catch(err){showMsg(err.message,'error');}
      btn.disabled=false;btn.textContent='Save Changes';
    });
  }

  var cancelBtn=document.getElementById('cancelEditReport');
  if(cancelBtn)cancelBtn.addEventListener('click',function(){document.getElementById('editReportDialog').close();});

  try{
    await loadProfile();
    await loadReports();
  }catch(err){
    if(err.message&&err.message.includes('401')){window.location.href='/login.html';}
    else{showMsg(err.message,'error');}
  }
});
