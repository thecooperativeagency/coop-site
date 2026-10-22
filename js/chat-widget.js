/* Coop site chat widget. No third-party code. Talks to /api/chat. */
(function () {
  if (window.__coopChat) return; window.__coopChat = 1;
  var css = "\
.cc-launch{position:fixed;right:max(1rem,env(safe-area-inset-right));bottom:max(1rem,env(safe-area-inset-bottom));z-index:60;display:flex;align-items:center;gap:.5rem;border:0;border-radius:999px;background:#000;color:#fff;font:500 .95rem/1 var(--sans,'Helvetica Neue',Helvetica,Arial,sans-serif);padding:.85rem 1.1rem;cursor:pointer;box-shadow:0 6px 24px rgba(0,0,0,.25);transition:opacity .2s,transform .2s}\
.cc-launch:hover{transform:translateY(-1px)}.cc-launch:focus-visible,.cc-panel button:focus-visible,.cc-panel input:focus-visible,.cc-panel textarea:focus-visible{outline:3px solid #8ab4f8;outline-offset:2px}\
.cc-launch.cc-hide{opacity:0;pointer-events:none;transform:translateY(8px)}\
.cc-launch svg{width:1.15rem;height:1.15rem}\
.cc-panel{position:fixed;right:max(1rem,env(safe-area-inset-right));bottom:max(1rem,env(safe-area-inset-bottom));z-index:61;width:min(23rem,calc(100vw - 2rem));height:min(34rem,calc(100dvh - 2rem));display:flex;flex-direction:column;background:#fff;color:#000;border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,.3);overflow:hidden;font:400 .95rem/1.45 var(--sans,'Helvetica Neue',Helvetica,Arial,sans-serif)}\
.cc-panel[hidden]{display:none}\
.cc-head{display:flex;align-items:center;justify-content:space-between;padding:.8rem 1rem;background:#000;color:#fff}\
.cc-head h2{margin:0;font:400 1.35rem/1.1 var(--display,'Instrument Serif',Georgia,serif);color:#fff}\
.cc-head p{margin:.1rem 0 0;font-size:.75rem;opacity:.75}\
.cc-x{background:none;border:0;color:#fff;font-size:1.5rem;line-height:1;cursor:pointer;padding:.25rem .4rem}\
.cc-log{flex:1;overflow-y:auto;padding:1rem;display:flex;flex-direction:column;gap:.6rem;background:var(--bg-soft,#f2f2f2)}\
.cc-m{max-width:85%;padding:.55rem .8rem;border-radius:12px;white-space:pre-wrap;word-wrap:break-word}\
.cc-bot{align-self:flex-start;background:#fff;border:1px solid #ddd}.cc-me{align-self:flex-end;background:#000;color:#fff}\
.cc-typing{opacity:.6;font-style:italic}\
.cc-cta{align-self:flex-start;background:none;border:1px solid #000;border-radius:999px;padding:.4rem .8rem;font:inherit;font-size:.85rem;cursor:pointer}\
.cc-lead{background:#fff;border:1px solid #ddd;border-radius:12px;padding:.8rem;display:grid;gap:.45rem}\
.cc-lead p{margin:0 0 .2rem;font-size:.85rem}\
.cc-lead label{font-size:.75rem;font-weight:600;display:grid;gap:.15rem}\
.cc-lead input{font:inherit;font-size:16px;padding:.45rem .55rem;border:1px solid #bbb;border-radius:8px}\
.cc-lead .cc-hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}\
.cc-lead button,.cc-send{background:#000;color:#fff;border:0;border-radius:999px;padding:.55rem 1rem;font:inherit;cursor:pointer}\
.cc-err{color:#b00020;font-size:.8rem;min-height:1em}\
.cc-form{display:flex;gap:.5rem;padding:.65rem;border-top:1px solid #ddd;background:#fff}\
.cc-form textarea{flex:1;resize:none;font:inherit;font-size:16px;padding:.5rem .65rem;border:1px solid #bbb;border-radius:10px;max-height:6rem}\
.cc-note{font-size:.7rem;color:#555;padding:0 .9rem .55rem;background:#fff;margin:0}\
.cc-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}\
@media (max-width:540px){.cc-launch{padding:.8rem}.cc-launch .cc-lbl{display:none}}\
@media (max-width:767px),(pointer:coarse){.cc-panel{top:0;left:0;right:0;bottom:auto;width:100%;max-width:none;height:100vh;height:100dvh;border-radius:0;background:#fff;transform:translateY(0);will-change:transform,height;overscroll-behavior:contain}.cc-head{flex:none;padding-top:max(.8rem,env(safe-area-inset-top))}.cc-log{flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}.cc-form,.cc-note{flex:none}.cc-note{padding-bottom:max(.55rem,env(safe-area-inset-bottom))}}\
html.cc-lock,html.cc-lock body{position:fixed!important;top:0;left:0;right:0;bottom:0;width:100%!important;overflow:hidden!important;overscroll-behavior:none}\
@media (prefers-reduced-motion:reduce){.cc-launch{transition:none}}";
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  var hist = [], busy = false, leadShown = false, leadDone = false;
  var launch = el("button", "cc-launch", '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg><span class="cc-lbl">Questions? Chat</span>');
  launch.type = "button"; launch.setAttribute("aria-label", "Open chat with The Cooperative Agency"); launch.setAttribute("aria-expanded", "false"); launch.setAttribute("aria-controls", "cc-panel");
  var panel = el("section", "cc-panel"); panel.id = "cc-panel"; panel.hidden = true; panel.setAttribute("role", "dialog"); panel.setAttribute("aria-label", "Chat with The Cooperative Agency");
  panel.innerHTML = '<div class="cc-head"><div><h2>The Cooperative Agency</h2><p>Automated assistant · Lance follows up personally</p></div><button type="button" class="cc-x" aria-label="Close chat">×</button></div>' +
    '<div class="cc-log" role="log" aria-live="polite" aria-relevant="additions"></div>' +
    '<form class="cc-form"><label class="cc-sr" for="cc-in">Your message</label><textarea id="cc-in" rows="1" maxlength="500" placeholder="Ask about our services…" required></textarea><button class="cc-send" type="submit">Send</button></form>' +
    '<p class="cc-note">Answers come from our site info. For specifics, Lance will follow up.</p>';
  document.body.appendChild(launch); document.body.appendChild(panel);
  var log = panel.querySelector(".cc-log"), form = panel.querySelector(".cc-form"), input = panel.querySelector("textarea");

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; return e; }
  function add(text, who) { var m = el("div", "cc-m " + (who === "me" ? "cc-me" : "cc-bot")); m.textContent = text; log.appendChild(m); log.scrollTop = log.scrollHeight; return m; }
  var mq = window.matchMedia ? window.matchMedia("(max-width:767px),(pointer:coarse)") : { matches: false };
  var vv = window.visualViewport, scrollY = 0, raf = 0;
  function measure() { raf = 0;
    if (panel.hidden || !mq.matches) { panel.style.height = ""; panel.style.transform = ""; return; }
    var h = vv ? vv.height : window.innerHeight, t = vv ? vv.offsetTop : 0;
    panel.style.height = Math.round(h) + "px"; panel.style.transform = "translateY(" + Math.round(t) + "px)"; }
  function fit() { if (!raf) raf = (window.requestAnimationFrame || setTimeout)(measure); }
  if (vv) { vv.addEventListener("resize", fit); vv.addEventListener("scroll", fit); }
  window.addEventListener("resize", fit);
  function settle() { if (panel.hidden || !mq.matches) return; window.scrollTo(0, 0); fit(); setTimeout(function () { if (panel.hidden) return; window.scrollTo(0, 0); fit(); }, 120); setTimeout(fit, 350); }
  panel.addEventListener("focusin", function (e) { settle();
    var t = e.target; if (t && t.closest && t.closest(".cc-lead") && mq.matches) setTimeout(function () { // keep inline form field visible inside the log, not the page
      var lr = log.getBoundingClientRect(), tr = t.getBoundingClientRect();
      if (tr.bottom > lr.bottom - 8) log.scrollTop += tr.bottom - lr.bottom + 16; else if (tr.top < lr.top + 8) log.scrollTop -= lr.top - tr.top + 16; }, 360); });
  panel.addEventListener("focusout", settle);
  function lock(on) { if (!mq.matches) return; var d = document.documentElement, b = document.body;
    if (on) { if (d.classList.contains("cc-lock")) return; scrollY = window.scrollY || d.scrollTop || 0; b.style.top = -scrollY + "px"; d.classList.add("cc-lock"); }
    else if (d.classList.contains("cc-lock")) { d.classList.remove("cc-lock"); b.style.top = ""; window.scrollTo(0, scrollY); } }
  function open() { if (!panel.hidden) return; panel.hidden = false; lock(true); measure(); if (mq.matches && document.activeElement && document.activeElement.blur) document.activeElement.blur(); launch.classList.add("cc-hide"); launch.setAttribute("aria-expanded", "true");
    if (!log.children.length) { add("Hi! I can answer questions about The Cooperative Agency's services for dealerships and businesses. What can I help with?", "bot"); ctaButton(); }
    log.scrollTop = log.scrollHeight; if (!mq.matches) input.focus(); else settle(); }
  function close() { if (panel.hidden) return; panel.hidden = true; lock(false); measure(); launch.classList.remove("cc-hide"); if (window.__ccSync) window.__ccSync(); launch.setAttribute("aria-expanded", "false"); launch.focus(); }
  launch.addEventListener("click", open);
  // Public API + any [data-coop-chat] link/button opens the panel (link falls back to /contact without JS).
  window.coopChat = { open: open, close: close };
  document.addEventListener("click", function (e) {
    var t = e.target.closest && e.target.closest("[data-coop-chat]");
    if (!t || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault(); open();
  });
  panel.querySelector(".cc-x").addEventListener("click", close);
  panel.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  input.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event("submit")); } });

  function ctaButton() { if (leadDone || leadShown) return; var b = el("button", "cc-cta"); b.type = "button"; b.textContent = "Have Lance follow up"; b.addEventListener("click", function () { b.remove(); showLead(); }); log.appendChild(b); }
  function showLead() {
    if (leadShown || leadDone) return; leadShown = true;
    log.querySelectorAll(".cc-cta").forEach(function (c) { c.remove(); });
    var f = el("form", "cc-lead"); f.setAttribute("aria-label", "Leave your contact info");
    f.innerHTML = '<p>Leave your info and Lance will follow up personally.</p>' +
      '<label>Name<input name="name" autocomplete="name" required maxlength="120"></label>' +
      '<label>Dealership / company<input name="company" autocomplete="organization" required maxlength="160"></label>' +
      '<label>Email<input name="email" type="email" autocomplete="email" maxlength="200"></label>' +
      '<label>Phone<input name="phone" type="tel" autocomplete="tel" maxlength="40"></label>' +
      '<div class="cc-hp" aria-hidden="true"><input name="company_url" tabindex="-1" autocomplete="off"></div>' +
      '<div class="cc-err" role="alert"></div><button type="submit">Send to Lance</button>';
    log.appendChild(f); log.scrollTop = log.scrollHeight; if (!mq.matches) f.querySelector("input").focus();
    f.addEventListener("submit", function (e) {
      e.preventDefault(); var err = f.querySelector(".cc-err"), btn = f.querySelector("button");
      var d = {}; new FormData(f).forEach(function (v, k) { d[k] = String(v).trim(); });
      if (!d.email && !d.phone) { err.textContent = "Please add an email or phone number."; return; }
      btn.disabled = true; err.textContent = "";
      d.action = "lead"; d.messages = hist;
      post(d).then(function (r) {
        if (!r.ok) throw r;
        leadDone = true; f.remove(); add("Thanks, " + d.name.split(" ")[0] + "! Lance has your info and will follow up personally.", "bot");
      }).catch(function (r) {
        btn.disabled = false;
        err.textContent = r && r.error === "rate-limited" ? "Too many submissions. Please email lance@thecoopbrla.com." : "Couldn’t send. Email lance@thecoopbrla.com or call (225) 240-4570.";
      });
    });
  }
  function post(body) {
    return fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(body) })
      .then(function (res) { return res.json().catch(function () { return { ok: false }; }).then(function (j) { j.status = res.status; if (res.status >= 400) j.ok = false; return j; }); });
  }
  form.addEventListener("submit", function (e) {
    e.preventDefault(); var t = input.value.trim(); if (!t || busy) return;
    busy = true; input.value = ""; add(t, "me"); hist.push({ role: "user", content: t.slice(0, 500) }); hist = hist.slice(-10);
    var typing = add("Typing…", "bot"); typing.classList.add("cc-typing");
    post({ messages: hist }).then(function (r) {
      typing.remove();
      var reply = r.reply || "Sorry, something went wrong. Email lance@thecoopbrla.com or call (225) 240-4570.";
      add(reply, "bot"); if (r.ok) hist.push({ role: "assistant", content: reply });
      if (r.offer_form || /\bform\b/i.test(reply)) showLead();
    }).catch(function () { typing.remove(); add("Sorry, I couldn’t connect. Email lance@thecoopbrla.com or call (225) 240-4570.", "bot"); })
      .then(function () { busy = false; });
  });

  // Keep the launcher from covering contact forms on small screens.
  var forms = document.querySelectorAll("form.js-contact");
  if (forms.length && "IntersectionObserver" in window) {
    var vis = new Set();
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (x) { x.isIntersecting ? vis.add(x.target) : vis.delete(x.target); });
      sync();
    });
    function sync() { launch.classList.toggle("cc-hide", (vis.size > 0 && window.innerWidth < 900) || !panel.hidden); }
    window.__ccSync = sync;
    forms.forEach(function (f) { io.observe(f); });
  }
})();
