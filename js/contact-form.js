(function () {
  var forms = document.querySelectorAll("form.js-contact");
  if (!forms.length) return;

  function payload(form) {
    var data = new FormData(form);
    var obj = {};
    data.forEach(function (value, key) {
      if (key) obj[key] = String(value).trim();
    });
    return obj;
  }

  forms.forEach(function (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (form.getAttribute("data-state") === "sent") return;
      var btn = form.querySelector('button[type="submit"]');
      var err = form.querySelector(".form-error");
      if (btn) btn.disabled = true;
      form.setAttribute("data-state", "sending");
      if (err) err.textContent = "";

      fetch(form.getAttribute("action") || "/api/contact", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(payload(form)),
      })
        .then(function (res) {
          if (!res.ok) throw new Error("not-ok");
          return res.json().catch(function () { return {}; });
        })
        .then(function () {
          form.setAttribute("data-state", "sent");
          form.reset();
        })
        .catch(function () {
          form.setAttribute("data-state", "error");
          if (err) {
            err.textContent =
              "Couldn’t send the form. Email lance@thecoopbrla.com or call 225-384-7228 and we’ll take it from there.";
          }
          if (btn) btn.disabled = false;
        });
    });
  });
})();
