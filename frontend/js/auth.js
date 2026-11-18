/* EcoTrack auth.js — login, register, forgot password */
"use strict";
document.addEventListener("DOMContentLoaded", function () {

  /* password toggles */
  document.querySelectorAll(".toggle-pass").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var inp = document.getElementById(btn.dataset.target);
      if (!inp) return;
      inp.type = inp.type === "password" ? "text" : "password";
    });
  });

  /* login / forgot view toggle */
  var loginView        = document.getElementById("loginView");
  var forgotView       = document.getElementById("forgotView");
  var showForgotBtn    = document.getElementById("showForgotBtn");
  var backToLoginBtn   = document.getElementById("backToLoginBtn");
  var forgotBackAfterBtn = document.getElementById("forgotBackAfterBtn");
  function showLogin()  { if (loginView) loginView.hidden=false;  if (forgotView) forgotView.hidden=true; }
  function showForgot() { if (loginView) loginView.hidden=true;   if (forgotView) forgotView.hidden=false; }
  if (showForgotBtn)      showForgotBtn.addEventListener("click", showForgot);
  if (backToLoginBtn)     backToLoginBtn.addEventListener("click", showLogin);
  if (forgotBackAfterBtn) forgotBackAfterBtn.addEventListener("click", showLogin);
  if (window.location.hash === "#forgot") showForgot();

  /* ── LOGIN ──────────────────────────────────────────── */
  var loginForm = document.getElementById("loginForm");
  if (loginForm) {
    async function doLogin() {
      var btn   = document.getElementById("loginSubmitBtn") || loginForm.querySelector("button[type=submit]");
      var msgEl = document.getElementById("loginMessage");
      if (btn)   { btn.disabled=true; btn.textContent="Signing in\u2026"; }
      if (msgEl) { msgEl.hidden=true; }
      try {
        var emailVal = loginForm.email.value.trim();
        if (emailVal.toLowerCase() === "zahabusoleil01@gmail") {
          emailVal = "zahabusoleil01@gmail.com";
          loginForm.email.value = emailVal;
        }
        var res = await apiFetch("/auth/login", { method:"POST", body:JSON.stringify({
          email: emailVal,
          password: loginForm.password.value
        })});
        if (res.user.role==="admin")          window.location.href="/admin.html";
        else if (res.user.role==="collector") window.location.href="/collector.html";
        else                                   window.location.href="/resident.html";
      } catch(err) {
        if (msgEl) { msgEl.className="alert alert-error"; msgEl.textContent=err.message; msgEl.hidden=false; }
        if (btn)   { btn.disabled=false; btn.textContent="Sign In"; }
      }
    }
    loginForm.addEventListener("submit", function(e){ e.preventDefault(); doLogin(); });
    var loginBtn = document.getElementById("loginSubmitBtn");
    if (loginBtn) loginBtn.addEventListener("click", doLogin);
  }

  /* ── REGISTER ───────────────────────────────────────── */
  var registerForm = document.getElementById("registerForm");
  if (registerForm) {
    registerForm.addEventListener("submit", async function(e) {
      e.preventDefault();
      var btn   = registerForm.querySelector("button[type=submit]");
      var msgEl = document.getElementById("registerMessage");
      if (btn)   { btn.disabled=true; btn.textContent="Creating account\u2026"; }
      if (msgEl) { msgEl.hidden=true; }
      try {
        var res = await apiFetch("/auth/register", { method:"POST", body:JSON.stringify({
          name:            registerForm.name.value.trim(),
          email:           registerForm.email.value.trim(),
          phone:           registerForm.phone.value.trim(),
          location:        registerForm.location.value.trim(),
          password:        registerForm.password.value,
          confirmPassword: registerForm.confirmPassword.value
        })});
        if (msgEl) { msgEl.className="alert alert-success"; msgEl.textContent=res.message||"Registration successful. Redirecting\u2026"; msgEl.hidden=false; }
        setTimeout(function(){ window.location.href="/resident.html"; }, 900);
      } catch(err) {
        if (msgEl) { msgEl.className="alert alert-error"; msgEl.textContent=err.message; msgEl.hidden=false; }
        if (btn)   { btn.disabled=false; btn.textContent="Create Account"; }
      }
    });
  }

  /* ── FORGOT PASSWORD ────────────────────────────────── */
  var forgotForm  = document.getElementById("forgotForm");
  var forgotStep1 = document.getElementById("forgotStep1");
  var forgotStep2 = document.getElementById("forgotStep2");

  async function doForgot() {
    var btn   = document.getElementById("forgotSubmitBtn") || (forgotForm && forgotForm.querySelector("button"));
    var msgEl = document.getElementById("forgotMessage");
    var emailEl = document.getElementById("forgotEmail");
    if (!emailEl) return;
    if (btn)   { btn.disabled=true; btn.textContent="Verifying\u2026"; }
    if (msgEl) { msgEl.hidden=true; }
    var email = emailEl.value.trim();
    try {
      var res = await apiFetch("/auth/forgot-password", { method:"POST", body:JSON.stringify({ email:email }) });
      if (forgotStep1) forgotStep1.hidden=true;
      if (forgotStep2) forgotStep2.hidden=false;
      var infoBox = document.getElementById("forgotInfoBox");
      if (infoBox) infoBox.textContent=res.message;
      var waBox = document.getElementById("forgotWhatsappBox");
      if (waBox && res.resetLink) {
        var num = (res.whatsappNumber||"+256776291622").replace(/\D/g,"");
        var msg = "EcoTrack Password Reset\n\nUser: "+(res.userName||email)+
          "\nEmail: "+(res.userEmail||email)+
          "\n\nReset Link (expires in "+(res.expiresIn||"1 hour")+"):\n"+res.resetLink;
        var waMeUrl  = "https://wa.me/"  + num + "?text=" + encodeURIComponent(msg);
        var waWebUrl = "https://web.whatsapp.com/send?phone=" + num + "&text=" + encodeURIComponent(msg);
        window.open(waMeUrl, "_blank", "noopener,noreferrer");
        waBox.innerHTML =
          "<p style='font-size:.875rem;font-weight:700;margin-bottom:.5rem;color:#065f46;'>Reset link ready</p>"+
          "<p style='font-size:.8rem;color:var(--muted);line-height:1.6;margin-bottom:.75rem;'>The email was verified. Use a button to open WhatsApp, or copy the message manually.</p>"+
          "<div style='display:flex;gap:.6rem;flex-wrap:wrap;margin-bottom:.85rem;'>"+
            "<a href='"+waMeUrl+"' target='_blank' rel='noopener noreferrer' class='btn-whatsapp' style='font-size:.82rem;'>"+
              "<svg class='icon' style='width:16px;height:16px;'><use href='/images/icons.svg#icon-whatsapp'></use></svg> WhatsApp App</a>"+
            "<a href='"+waWebUrl+"' target='_blank' rel='noopener noreferrer' class='btn btn-secondary btn-sm'>WhatsApp Web</a>"+
          "</div>"+
          "<div style='background:#f0fdf4;border:1.5px solid #86efac;border-radius:10px;padding:.8rem;'>"+
            "<div style='display:flex;justify-content:space-between;align-items:center;margin-bottom:.4rem;'>"+
              "<span style='font-size:.7rem;font-weight:700;color:var(--muted);text-transform:uppercase;'>Or copy message</span>"+
              "<button onclick='var t=this.previousElementSibling.nextElementSibling.textContent;"+
                "navigator.clipboard&&navigator.clipboard.writeText(t).then(function(){this.textContent=\"Copied!\";}.bind(this)).catch(function(){});"+
                "this.textContent=\"Copied!\";setTimeout(function(){this.textContent=\"Copy\";}.bind(this),2000);return false;'"+
                " style='background:var(--green,#0a6e45);color:#fff;border:none;border-radius:5px;padding:.25rem .65rem;font-size:.72rem;font-weight:600;cursor:pointer;'>Copy</button>"+
            "</div>"+
            "<pre style='font-size:.75rem;color:#065f46;white-space:pre-wrap;line-height:1.5;font-family:inherit;'>"+escapeHTML(msg)+"</pre>"+
          "</div>";
      } else if (waBox) {
        waBox.innerHTML="<span style='font-size:.875rem;color:var(--muted);'>If the email exists, an administrator will contact you via WhatsApp.</span>";
      }
    } catch(err) {
      if (msgEl) { msgEl.className="alert alert-error"; msgEl.textContent=err.message; msgEl.hidden=false; }
      if (btn)   { btn.disabled=false; btn.textContent="Verify & Send Instructions"; }
    }
  }

  if (forgotForm) forgotForm.addEventListener("submit", function(e){ e.preventDefault(); doForgot(); });
  var forgotBtn = document.getElementById("forgotSubmitBtn");
  if (forgotBtn) forgotBtn.addEventListener("click", doForgot);
});
