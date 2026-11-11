(function () {
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function platformLabel(platform) {
    return platform === "Motive" ? "BUILT ON MOTIVE" : "ANY PLATFORM";
  }

  function sheetTitle(item) {
    return item.title || item.pageTitle || "";
  }

  function isFeed(item) {
    return (item.thumb || "").indexOf("social-feed-grid") !== -1;
  }

  /* Tear sheets */
  var slots = Array.prototype.slice.call(document.querySelectorAll("[data-ts-group]"));
  var filterBar = document.querySelector("[data-ts-filter]");
  var dialog = document.querySelector("#ts-lightbox");
  var items = [];
  var filter = "all";
  var openIndex = -1;
  var lastFocus = null;

  function visibleItems() {
    return items.filter(function (item) {
      if (filter === "motive") return item.platform === "Motive";
      if (filter === "all") return true;
      return item.group === filter;
    });
  }

  function card(item, index) {
    var linked = !!item.url;
    var el = document.createElement(linked ? "a" : "button");
    el.className = "ts-card" + (isFeed(item) ? " ts-card--feed" : "");
    if (linked) {
      el.href = item.url;
      el.target = "_blank";
      el.rel = "noopener";
    } else {
      el.type = "button";
      el.addEventListener("click", function () { openAt(index); });
    }
    var frame = document.createElement("span");
    frame.className = "ts-card__frame";
    var img = document.createElement("img");
    img.src = item.thumb;
    img.alt = item.alt || "";
    img.width = 800;
    img.height = isFeed(item) ? 600 : 500;
    frame.appendChild(img);
    var cap = document.createElement("span");
    cap.className = "ts-card__cap";
    var title = document.createElement("span");
    title.textContent = (item.placeholder ? "Placeholder · " : "") + sheetTitle(item);
    var badge = document.createElement("span");
    badge.className = "ts-motive";
    badge.textContent = platformLabel(item.platform);
    cap.appendChild(title);
    cap.appendChild(badge);
    el.appendChild(frame);
    el.appendChild(cap);
    return el;
  }

  function syncSwipe(slot, count) {
    var swipe = count > 2 && !slot.hidden;
    slot.classList.toggle("ts-slot--swipe", swipe);
    var hint = slot.previousElementSibling;
    var isHint = hint && hint.classList && hint.classList.contains("ts-swipe-hint");
    if (swipe) {
      if (!isHint) {
        hint = document.createElement("p");
        hint.className = "ts-swipe-hint";
        hint.textContent = "Swipe";
        slot.parentNode.insertBefore(hint, slot);
      }
    } else if (isHint) {
      hint.remove();
    }
  }

  function renderSheets() {
    var shown = visibleItems();
    slots.forEach(function (slot) {
      var group = slot.getAttribute("data-ts-group");
      slot.textContent = "";
      if (filter !== "all" && filter !== "motive" && filter !== group) {
        slot.hidden = true;
        syncSwipe(slot, 0);
        return;
      }
      var mine = shown.filter(function (item) { return item.group === group; });
      slot.hidden = mine.length === 0;
      mine.forEach(function (item) { slot.appendChild(card(item, items.indexOf(item))); });
      syncSwipe(slot, mine.length);
    });
    if (filterBar) {
      Array.prototype.forEach.call(filterBar.querySelectorAll("button"), function (btn) {
        btn.setAttribute("aria-pressed", btn.getAttribute("data-filter") === filter ? "true" : "false");
      });
    }
  }

  function focusables() {
    return Array.prototype.slice.call(dialog.querySelectorAll("button, a[href]")).filter(function (el) {
      return !el.disabled && el.offsetParent !== null;
    });
  }

  function show(index) {
    var list = visibleItems();
    if (!list.length) return;
    var item = items[index];
    if (!item || list.indexOf(item) === -1) item = list[0];
    openIndex = items.indexOf(item);
    var full = dialog.querySelector("[data-ts-full]");
    full.src = item.full;
    full.alt = item.alt || "";
    dialog.querySelector("[data-ts-caption]").textContent = (item.placeholder ? "Placeholder. " : "") + item.store + " · " + sheetTitle(item);
    var link = dialog.querySelector("[data-ts-url]");
    if (item.url) {
      link.hidden = false;
      link.href = item.url;
    } else {
      link.hidden = true;
      link.removeAttribute("href");
    }
  }

  function openAt(index) {
    if (!dialog) return;
    lastFocus = document.activeElement;
    dialog.hidden = false;
    document.body.classList.add("ts-open");
    show(index);
    dialog.querySelector("[data-ts-close]").focus();
  }

  function closeSheet() {
    if (!dialog || dialog.hidden) return;
    dialog.hidden = true;
    document.body.classList.remove("ts-open");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function step(dir) {
    var list = visibleItems();
    if (!list.length) return;
    var pos = list.indexOf(items[openIndex]);
    if (pos < 0) pos = 0;
    show(items.indexOf(list[(pos + dir + list.length) % list.length]));
  }

  if (dialog) {
    dialog.addEventListener("keydown", function (event) {
      if (event.key === "Escape") { event.preventDefault(); closeSheet(); return; }
      if (event.key === "ArrowRight") { event.preventDefault(); step(1); return; }
      if (event.key === "ArrowLeft") { event.preventDefault(); step(-1); return; }
      if (event.key !== "Tab") return;
      var nodes = focusables();
      if (!nodes.length) return;
      var first = nodes[0], last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
    dialog.querySelector("[data-ts-close]").addEventListener("click", closeSheet);
    dialog.addEventListener("click", function (event) { if (event.target === dialog) closeSheet(); });
    dialog.querySelector("[data-ts-prev]").addEventListener("click", function () { step(-1); });
    dialog.querySelector("[data-ts-next]").addEventListener("click", function () { step(1); });
  }

  if (filterBar) {
    filterBar.addEventListener("click", function (event) {
      var btn = event.target.closest("button[data-filter]");
      if (!btn) return;
      filter = btn.getAttribute("data-filter");
      renderSheets();
    });
  }

  if (slots.length) {
    fetch("./public/images/tearsheets/manifest.json").then(function (res) { return res.json(); }).then(function (data) {
      items = Array.isArray(data) ? data : [];
      renderSheets();
    }).catch(function () { renderSheets(); });
  }

  /* Store media */
  function makeVideo(item) {
    var video = document.createElement("video");
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.autoplay = !reduceMotion;
    video.playsInline = true;
    video.preload = "none";
    video.setAttribute("playsinline", "");
    video.setAttribute("preload", "none");
    if (item.poster) video.poster = item.poster;
    if (item.alt) video.setAttribute("aria-label", item.alt);
    video.dataset.mp4 = item.mp4 || "";
    video.dataset.webm = item.webm || "";
    video.addEventListener("click", function () {
      if (reduceMotion || !video.dataset.mp4) return;
      video.controls = true;
      video.muted = false;
      var play = video.play();
      if (play && play.catch) play.catch(function () {});
    });
    return video;
  }

  function arm(video) {
    if (video.dataset.armed || reduceMotion) return;
    if (!video.dataset.mp4 && !video.dataset.webm) return;
    video.dataset.armed = "1";
    if (video.dataset.webm) {
      var webm = document.createElement("source");
      webm.src = video.dataset.webm;
      webm.type = "video/webm";
      video.appendChild(webm);
    }
    if (video.dataset.mp4) {
      var mp4 = document.createElement("source");
      mp4.src = video.dataset.mp4;
      mp4.type = "video/mp4";
      video.appendChild(mp4);
    }
    video.load();
  }

  var videos = [];
  function mountMedia(data) {
    var engine = document.querySelector("[data-media-slot='engine']");
    var content = document.querySelector("[data-media-slot='content']");
    if (engine) {
      data.filter(function (item) { return item.role === "band"; }).forEach(function (item) {
        var band = document.createElement("figure");
        band.className = "ps-media-band";
        var video = makeVideo(item);
        videos.push(video);
        band.appendChild(video);
        engine.appendChild(band);
      });
      var stills = document.createElement("div");
      stills.className = "ps-stills";
      data.filter(function (item) { return item.role === "still"; }).forEach(function (item) {
        var fig = document.createElement("figure");
        fig.className = "ps-still";
        fig.setAttribute("data-aspect", item.aspect || "16:9");
        var pic = document.createElement("picture");
        if (item.src_sm) {
          var source = document.createElement("source");
          source.media = "(max-width: 900px)";
          source.srcset = item.src_sm;
          pic.appendChild(source);
        }
        var img = document.createElement("img");
        img.src = item.src || "";
        img.alt = item.alt || "";
        pic.appendChild(img);
        fig.appendChild(pic);
        stills.appendChild(fig);
      });
      if (stills.childElementCount) engine.appendChild(stills);
    }
    if (content) {
      var row = document.createElement("div");
      row.className = "ps-phones";
      data.filter(function (item) { return item.role === "phone"; }).forEach(function (item) {
        var fig = document.createElement("figure");
        fig.className = "ps-phone";
        var video = makeVideo(item);
        videos.push(video);
        fig.appendChild(video);
        var cap = document.createElement("figcaption");
        var caption = item.caption || "Published on Instagram";
        if (item.ig_url) {
          var a = document.createElement("a");
          a.href = item.ig_url;
          a.target = "_blank";
          a.rel = "noopener";
          a.textContent = caption;
          cap.appendChild(a);
        } else {
          cap.textContent = caption;
        }
        fig.appendChild(cap);
        row.appendChild(fig);
      });
      if (row.childElementCount) content.appendChild(row);
    }
    if (!videos.length || !("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var video = entry.target;
        if (entry.isIntersecting) {
          if (reduceMotion) return;
          arm(video);
          var play = video.play();
          if (play && play.catch) play.catch(function () {});
        } else if (!video.paused) {
          video.pause();
        }
      });
    }, { threshold: 0.4 });
    videos.forEach(function (video) { io.observe(video); });
  }

  fetch("./public/media.json").then(function (res) { return res.json(); }).then(mountMedia).catch(function () {});

  /* Sticky bar */
  var bar = document.querySelector(".ps-bar");
  var hero = document.querySelector("#ps-hero");
  var closeEl = document.querySelector("#ps-close");
  if (!bar || !hero || !("IntersectionObserver" in window)) return;
  var heroGone = false, closeOn = false, formOn = false;
  function paint() {
    var narrow = window.matchMedia("(max-width: 900px)").matches;
    var show = narrow && heroGone && !closeOn && !formOn;
    document.body.classList.toggle("ps-bar-on", show);
    bar.hidden = !show;
  }
  new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) { heroGone = !entry.isIntersecting; });
    paint();
  }, { threshold: 0 }).observe(hero);
  if (closeEl) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { closeOn = entry.isIntersecting; });
      paint();
    }, { threshold: 0.12 }).observe(closeEl);
  }
  Array.prototype.forEach.call(document.querySelectorAll("form.js-contact"), function (form) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { formOn = entry.isIntersecting; });
      paint();
    }, { threshold: 0.12 }).observe(form);
  });
  window.addEventListener("resize", paint);
  paint();
})();
