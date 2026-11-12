(function () {
  document.documentElement.classList.add("js");
  var page = document.querySelector(".ps-page");
  if (!page) return;

  var menuBtn = document.querySelector(".ps-nav-btn");
  var menu = document.getElementById("ps-menu");
  var menuClose = menu ? menu.querySelector(".ps-menu__close") : null;
  var formWrap = document.querySelector(".ps-form-wrap");
  var form = document.getElementById("ps-lead");
  var bar = document.querySelector(".ps-bar");
  var hero = document.querySelector(".page-hero");
  var closeSec = document.getElementById("ps-close");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var narrow = window.matchMedia("(max-width: 900px)");

  function menuItems() {
    if (!menu) return [];
    return Array.prototype.slice.call(menu.querySelectorAll("a, button"));
  }

  function openMenu() {
    if (!menu || !menuBtn) return;
    menu.hidden = false;
    menuBtn.setAttribute("aria-expanded", "true");
    document.documentElement.style.overflow = "hidden";
    if (menuClose) menuClose.focus();
  }

  function closeMenu() {
    if (!menu || !menuBtn) return;
    menu.hidden = true;
    menuBtn.setAttribute("aria-expanded", "false");
    document.documentElement.style.overflow = "";
    menuBtn.focus();
  }

  if (menuBtn && menu) {
    menuBtn.addEventListener("click", openMenu);
    if (menuClose) menuClose.addEventListener("click", closeMenu);
    menu.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        return;
      }
      if (event.key !== "Tab") return;
      var items = menuItems();
      if (!items.length) return;
      var first = items[0];
      var last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && menu && !menu.hidden) closeMenu();
    });
  }

  function openForm() {
    if (!formWrap) return;
    formWrap.classList.add("is-open");
    window.setTimeout(function () {
      var field = form ? form.querySelector("input, textarea") : null;
      if (field) field.focus();
    }, 250);
  }

  Array.prototype.forEach.call(document.querySelectorAll("[data-open-form]"), function (link) {
    link.addEventListener("click", function () {
      openForm();
    });
  });

  document.addEventListener("click", function (event) {
    var trigger = event.target.closest && event.target.closest("[data-chat-draft]");
    if (!trigger) return;
    var draft = trigger.getAttribute("data-chat-draft");
    if (!draft) return;
    window.setTimeout(function () {
      var field = document.querySelector("#cc-in");
      if (!field) return;
      field.value = draft;
    }, 0);
  });

  function icon(playing) {
    if (playing) {
      return '<svg viewBox="0 0 14 14" aria-hidden="true"><rect x="2" y="1" width="3.5" height="12"/><rect x="8.5" y="1" width="3.5" height="12"/></svg>';
    }
    return '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M3 1.2v11.6L12.5 7z"/></svg>';
  }

  function syncButton(video, button) {
    var playing = !video.paused;
    button.innerHTML = icon(playing);
    button.setAttribute("aria-label", playing ? "Pause" : "Play");
  }

  Array.prototype.forEach.call(document.querySelectorAll(".ps-ex video"), function (video) {
    var button = video.parentElement.querySelector(".ps-play");
    if (!button) return;
    video.muted = true;
    syncButton(video, button);
    button.addEventListener("click", function () {
      if (video.paused) {
        delete video.dataset.userPaused;
        var playAttempt = video.play();
        if (playAttempt && playAttempt.catch) playAttempt.catch(function () {});
      } else {
        video.dataset.userPaused = "1";
        video.pause();
      }
      syncButton(video, button);
    });
    video.addEventListener("play", function () { syncButton(video, button); });
    video.addEventListener("pause", function () { syncButton(video, button); });
  });

  if ("IntersectionObserver" in window) {
    var videoWatch = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var video = entry.target;
        var button = video.parentElement.querySelector(".ps-play");
        var visible = entry.isIntersecting && entry.intersectionRatio >= 0.5;
        if (visible && !reduce && !video.dataset.userPaused) {
          var attempt = video.play();
          if (attempt && attempt.catch) attempt.catch(function () {});
        } else if (!visible) {
          video.pause();
        }
        if (button) syncButton(video, button);
      });
    }, { threshold: [0, 0.5, 1] });
    Array.prototype.forEach.call(document.querySelectorAll(".ps-ex video"), function (video) {
      videoWatch.observe(video);
    });
  }

  var heroSeen = true;
  var closeSeen = false;

  function paintBar() {
    if (!bar) return;
    var show = narrow.matches && !heroSeen && !closeSeen;
    bar.classList.toggle("is-on", show);
    bar.setAttribute("aria-hidden", show ? "false" : "true");
    if (show) bar.removeAttribute("inert");
    else bar.setAttribute("inert", "");
    document.body.classList.toggle("ps-bar-on", show);
  }

  if (bar && "IntersectionObserver" in window) {
    if (hero) {
      var heroWatch = new IntersectionObserver(function (entries) {
        heroSeen = entries[0].isIntersecting;
        paintBar();
      }, { threshold: 0 });
      heroWatch.observe(hero);
    }
    if (closeSec) {
      var closeWatch = new IntersectionObserver(function (entries) {
        closeSeen = entries[0].isIntersecting;
        paintBar();
      }, { threshold: 0 });
      closeWatch.observe(closeSec);
    }
    narrow.addEventListener("change", paintBar);
    paintBar();
  }

  var here = document.querySelector(".ps-here");
  var hereIdx = here ? here.querySelector(".ps-here__idx") : null;
  var hereName = here ? here.querySelector(".ps-here__name") : null;
  var stages = document.querySelectorAll("[data-ps-stage]");
  var hereNames = {
    "1": "They find you",
    "2": "They land and reach out",
    "3": "They stay with you",
    "4": "They buy, and you see what worked"
  };
  var hereCurrent = null;

  function paintHere(id) {
    if (!here || !hereIdx || !hereName) return;
    if (id === hereCurrent) return;
    hereCurrent = id;
    if (!id) {
      here.hidden = true;
      here.setAttribute("aria-hidden", "true");
      document.body.classList.remove("ps-here-on");
      return;
    }
    hereIdx.textContent = id + " of 4";
    hereName.textContent = hereNames[id];
    here.hidden = false;
    here.setAttribute("aria-hidden", "false");
    document.body.classList.add("ps-here-on");
  }

  if (here && hereIdx && hereName && stages.length && "IntersectionObserver" in window) {
    var hereRatios = {};
    var hereWatch = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var id = entry.target.getAttribute("data-ps-stage");
        hereRatios[id] = entry.isIntersecting ? entry.intersectionRatio : 0;
      });
      var best = null;
      var bestR = 0;
      Object.keys(hereRatios).forEach(function (id) {
        if (hereRatios[id] > bestR) {
          bestR = hereRatios[id];
          best = id;
        }
      });
      paintHere(bestR > 0 ? best : null);
    }, {
      threshold: [0, 0.15, 0.3, 0.5, 0.75, 1],
      rootMargin: "-10% 0px -55% 0px"
    });
    Array.prototype.forEach.call(stages, function (stage) {
      hereWatch.observe(stage);
    });
  }
})();
