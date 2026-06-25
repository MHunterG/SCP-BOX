/* =====================================================================
   SCP // Secure Access Terminal — логика интерфейса
   ===================================================================== */
(function () {
  "use strict";

  var DB = window.SCP_DB || [];
  var state = { level: 3, user: "RESEARCHER-7", filterClass: "all", query: "" };

  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------------- BOOT SEQUENCE ---------------- */
  var BOOT_LINES = [
    ["SCP TERMINAL OS v4.7.2  ·  SITE-19  ·  NODE //ALPHA", "ok"],
    ["(c) The Foundation. Несанкционированный доступ запрещён.", "dim"],
    ["", ""],
    ["[ POST ] Инициализация защищённого ядра ............ OK", "ok"],
    ["[ MEM  ] Проверка памяти 65536K ................... OK", "ok"],
    ["[ NET  ] Установка шифрованного канала AES-256 .... OK", "ok"],
    ["[ SEC  ] Загрузка протокола 4000-ESHU ............. OK", "ok"],
    ["[ WARN ] Обнаружена аномальная активность в секторе 7", "warn"],
    ["[ DB   ] Монтирование реестра аномалий ............ OK", "ok"],
    ["[ AUTH ] Запрос подтверждения личности ............ ОЖИДАНИЕ", "warn"],
    ["", ""],
    ["Готово. Передача управления модулю авторизации...", "ok"]
  ];

  function runBoot() {
    var log = $("#bootLog"), bar = $("#bootBarFill"), hint = $("#bootHint");
    var i = 0;
    log.classList.add("cursor");
    function next() {
      if (i < BOOT_LINES.length) {
        var line = BOOT_LINES[i];
        var span = document.createElement("span");
        span.className = line[1] || "";
        span.textContent = line[0] + "\n";
        log.appendChild(span);
        bar.style.width = Math.round(((i + 1) / BOOT_LINES.length) * 100) + "%";
        i++;
        setTimeout(next, line[0] === "" ? 90 : 230 + Math.random() * 160);
      } else {
        log.classList.remove("cursor");
        hint.textContent = "НАЖМИТЕ ЛЮБУЮ КЛАВИШУ ДЛЯ ПРОДОЛЖЕНИЯ";
        var go = function () {
          document.removeEventListener("keydown", go);
          document.removeEventListener("click", go);
          showLogin();
        };
        document.addEventListener("keydown", go);
        document.addEventListener("click", go);
        setTimeout(go, 4000);
      }
    }
    next();
  }

  function showLogin() {
    if ($("#boot").classList.contains("hidden")) return;
    $("#boot").classList.add("hidden");
    $("#login").classList.remove("hidden");
  }

  /* ---------------- LOGIN ---------------- */
  var CLEARANCE_HINTS = {
    1: "L1 — Конфиденциально. Базовый доступ к объектам класса Safe.",
    2: "L2 — Ограниченно. Доступ к материалам Safe и части Euclid.",
    3: "L3 — Секретно. Доступ к большинству материалов класса Euclid.",
    4: "L4 — Совершенно секретно. Доступ к данным класса Keter.",
    5: "O5 — Совет Надзирателей. Неограниченный доступ ко всем материалам."
  };

  function initLogin() {
    $$("#clearancePicker .clr").forEach(function (btn) {
      btn.addEventListener("click", function () {
        $$("#clearancePicker .clr").forEach(function (b) {
          b.classList.remove("is-active"); b.setAttribute("aria-checked", "false");
        });
        btn.classList.add("is-active"); btn.setAttribute("aria-checked", "true");
        state.level = parseInt(btn.dataset.level, 10);
        $("#clearanceHint").textContent = CLEARANCE_HINTS[state.level];
      });
    });
    $("#loginBtn").addEventListener("click", doLogin);
    $("#loginUser").addEventListener("keydown", function (e) { if (e.key === "Enter") doLogin(); });
  }

  function doLogin() {
    var name = ($("#loginUser").value || "RESEARCHER-7").trim().toUpperCase();
    state.user = name;
    var lvl = state.level === 5 ? "O5" : "L" + state.level;
    $("#userLevel").textContent = lvl;
    $("#aboutLevel").textContent = lvl;
    $("#userStat .stat__txt").innerHTML = name + " · <b>" + lvl + "</b>";
    $("#login").classList.add("hidden");
    $("#os").classList.remove("hidden");
    render();
    initTerminal();
  }

  /* ---------------- NAVIGATION ---------------- */
  function initNav() {
    $$(".navbtn").forEach(function (btn) {
      btn.addEventListener("click", function () { switchView(btn.dataset.view); closeMenus(); });
    });
    $("#menuToggle").addEventListener("click", function () {
      $("#topNav").classList.toggle("is-open");
    });
    $("#logoutBtn").addEventListener("click", function () {
      $("#os").classList.add("hidden");
      $("#login").classList.remove("hidden");
      $("#topNav").classList.remove("is-open");
    });
  }

  function closeMenus() {
    $("#topNav").classList.remove("is-open");
    var side = $("#dbSide"); if (side) side.classList.remove("is-open");
  }

  function switchView(view) {
    $$(".navbtn").forEach(function (b) { b.classList.toggle("is-active", b.dataset.view === view); });
    $$(".view").forEach(function (v) { v.classList.toggle("is-active", v.dataset.view === view); });
    if (view === "scanner") spawnBlips();
  }

  /* ---------------- DATABASE RENDER ---------------- */
  function classAccessible(cls) {
    var order = { Safe: 1, Euclid: 3, Keter: 4, Thaumiel: 5 };
    return state.level >= (order[cls] || 99);
  }

  function filtered() {
    var q = state.query.toLowerCase().trim();
    return DB.filter(function (o) {
      if (state.filterClass !== "all" && o.class !== state.filterClass) return false;
      if (!q) return true;
      var hay = (o.id + " " + o.name + " " + o.description + " " + (o.tags || []).join(" ")).toLowerCase();
      return hay.indexOf(q) !== -1;
    });
  }

  function render() {
    var items = filtered();
    var grid = $("#grid");
    grid.innerHTML = "";
    $("#dbEmpty").classList.toggle("hidden", items.length !== 0);
    items.forEach(function (o) { grid.appendChild(buildCard(o)); });

    $("#resultCount").textContent = items.length + " / " + DB.length + " ОБЪЕКТОВ";
    var counts = { Safe: 0, Euclid: 0, Keter: 0, Thaumiel: 0 };
    DB.forEach(function (o) { counts[o.class] = (counts[o.class] || 0) + 1; });
    $("#dbStats").innerHTML =
      "ВСЕГО В РЕЕСТРЕ: <b>" + DB.length + "</b><br>" +
      "Safe: <b>" + counts.Safe + "</b> · Euclid: <b>" + counts.Euclid + "</b><br>" +
      "Keter: <b>" + counts.Keter + "</b> · Thaumiel: <b>" + counts.Thaumiel + "</b>";
    $("#aboutCount").textContent = DB.length;
  }

  function buildCard(o) {
    var el = document.createElement("button");
    el.className = "card";
    el.setAttribute("aria-label", o.id + " — " + o.name);
    var locked = !classAccessible(o.class);
    el.innerHTML =
      '<div class="card__viz"><div class="viz viz-' + o.image + '"></div>' +
      (o.img ? '<img class="card__img" src="' + o.img + '" alt="' + o.id +
        '" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">' : '') +
      '<span class="card__cls cls-' + o.class + '">' + o.class + '</span></div>' +
      '<div class="card__body">' +
        '<div class="card__id">' + o.id + '</div>' +
        '<div class="card__name">«' + escapeHtml(o.name) + '»</div>' +
        '<div class="card__desc">' + (locked
          ? '◼ ДОСТУП ОГРАНИЧЕН — требуется уровень допуска ' + clsLevel(o.class) + '.'
          : escapeHtml(o.description.slice(0, 150)) + '…') + '</div>' +
        '<div class="card__open">► ОТКРЫТЬ ДОСЬЕ</div>' +
      '</div>';
    el.addEventListener("click", function () { openDoc(o, locked); });
    return el;
  }

  function clsLevel(cls) { return ({ Safe: "L1", Euclid: "L3", Keter: "L4", Thaumiel: "O5" })[cls] || "?"; }

  function initDatabase() {
    $("#searchInput").addEventListener("input", function (e) { state.query = e.target.value; render(); });
    $$("#classChips .chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        $$("#classChips .chip").forEach(function (c) { c.classList.remove("is-active"); });
        chip.classList.add("is-active");
        state.filterClass = chip.dataset.class;
        render();
      });
    });
    // mobile sidebar via menu button when in database view
    $("#menuToggle").addEventListener("click", function () {
      if ($('.view--database').classList.contains("is-active")) {
        $("#dbSide").classList.toggle("is-open");
        $("#topNav").classList.remove("is-open");
      }
    });
  }

  /* ---------------- DOCUMENT MODAL ---------------- */
  function openDoc(o, locked) {
    var clsColor = { Safe: "var(--safe)", Euclid: "var(--euclid)", Keter: "var(--keter)", Thaumiel: "var(--thaumiel)" }[o.class];
    var body = $("#modalBody");
    if (locked) {
      body.innerHTML =
        '<div class="doc__banner"><div><div class="doc__item">' + o.id + '</div>' +
        '<div class="doc__name">[ КЛАССИФИЦИРОВАНО ]</div></div>' +
        '<div class="doc__cls cls-' + o.class + '" style="color:' + clsColor + '">' + o.class + '</div></div>' +
        '<div class="doc__section"><div class="doc__h">УВЕДОМЛЕНИЕ О ДОПУСКЕ</div>' +
        '<div class="doc__text">⚠ Для просмотра данного досье требуется уровень допуска <b>' + clsLevel(o.class) +
        '</b> или выше. Ваш текущий уровень: <b>' + (state.level === 5 ? "O5" : "L" + state.level) + '</b>.<br><br>' +
        'Несанкционированная попытка доступа зарегистрирована. Обратитесь к куратору проекта.</div></div>' +
        '<div class="doc__stamp"><span>SITE-19 // SECURE ARCHIVE</span><span>ДОСТУП ОТКЛОНЁН</span></div>';
    } else {
      body.innerHTML =
        '<div class="doc__banner"><div><div class="doc__item">' + o.id + '</div>' +
        '<div class="doc__name">«' + escapeHtml(o.name) + '»</div></div>' +
        '<div class="doc__cls cls-' + o.class + '" style="color:' + clsColor + '">КЛАСС: ' + o.class + '</div></div>' +
        (o.img ? '<figure class="doc__figure"><img src="' + o.img + '" alt="' + o.id +
          '" referrerpolicy="no-referrer" onerror="this.closest(\'figure\').remove()">' +
          '<figcaption>' + escapeHtml(o.imgCredit || "") + '</figcaption></figure>' : "") +
        section("ОСОБЫЕ УСЛОВИЯ СОДЕРЖАНИЯ", o.containment) +
        section("ОПИСАНИЕ", o.description) +
        (o.addendum ? section("ДОПОЛНЕНИЕ", o.addendum) : "") +
        (o.discovered ? section("ИСТОРИЯ ОБНАРУЖЕНИЯ", o.discovered) : "") +
        '<div class="doc__section"><div class="doc__h">МЕТКИ</div><div class="doc__tags">' +
        (o.tags || []).map(function (t) { return '<span class="doc__tag">#' + escapeHtml(t) + '</span>'; }).join("") +
        '</div></div>' +
        '<div class="doc__stamp"><span>SITE-19 // ' + state.user + '</span><span>УРОВЕНЬ ' +
        (state.level === 5 ? "O5" : "L" + state.level) + ' · ' + dateStamp() + '</span></div>';
    }
    $("#modal").classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }

  function section(title, text) {
    return '<div class="doc__section"><div class="doc__h">' + title + '</div>' +
      '<div class="doc__text">' + redact(escapeHtml(text)) + '</div></div>';
  }

  // случайно «зацензурить» некоторые слова для атмосферы
  function redact(text) {
    return text.replace(/█+/g, function (m) {
      return '<span class="redacted" title="ДАННЫЕ УДАЛЕНЫ">' + m + '</span>';
    });
  }

  function initModal() {
    $("#modalClose").addEventListener("click", closeModal);
    $("#modalBackdrop").addEventListener("click", closeModal);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !$("#modal").classList.contains("hidden")) closeModal();
    });
  }
  function closeModal() { $("#modal").classList.add("hidden"); document.body.style.overflow = ""; }

  /* ---------------- SCANNER ---------------- */
  function spawnBlips() {
    var box = $("#radarBlips");
    box.innerHTML = "";
    for (var i = 0; i < 5; i++) {
      var s = document.createElement("span");
      s.style.left = (15 + Math.random() * 70) + "%";
      s.style.top = (15 + Math.random() * 70) + "%";
      s.style.animationDelay = (Math.random() * 2) + "s";
      box.appendChild(s);
    }
  }

  function initScanner() {
    spawnBlips();
    $("#scanBtn").addEventListener("click", function () {
      var btn = $("#scanBtn");
      var res = $("#scanResult");
      btn.disabled = true;
      res.innerHTML = '<div class="card__open" style="font-size:13px;color:var(--accent)">СКАНИРОВАНИЕ' +
        '<span class="cursor"></span></div>';
      spawnBlips();
      var ticks = 0;
      var iv = setInterval(function () {
        ticks++;
        var rnd = DB[Math.floor(Math.random() * DB.length)];
        res.innerHTML = '<div class="card__open" style="font-size:13px;color:var(--amber)">► ' +
          rnd.id + ' …</div>';
        if (ticks > 10) {
          clearInterval(iv);
          var pick = DB[Math.floor(Math.random() * DB.length)];
          res.innerHTML = "";
          var card = buildCard(pick);
          card.style.maxWidth = "320px";
          res.appendChild(card);
          btn.disabled = false;
        }
      }, 110);
    });
  }

  /* ---------------- TERMINAL ---------------- */
  var termReady = false;
  function initTerminal() {
    if (termReady) return; termReady = true;
    var out = $("#termOut");
    termPrint(out, "SCP TERMINAL OS v4.7.2 — интерактивная оболочка", "ln-accent");
    termPrint(out, "Введите 'help' для списка команд.", "ln-dim");
    termPrint(out, "", "");
    $("#termInput").addEventListener("keydown", function (e) {
      if (e.key !== "Enter") return;
      var cmd = e.target.value.trim();
      e.target.value = "";
      termPrint(out, "researcher@site-19:~$ " + cmd, "ln-cmd");
      handleCmd(out, cmd);
      out.scrollTop = out.scrollHeight;
    });
  }

  function termPrint(out, text, cls) {
    var d = document.createElement("div");
    if (cls) d.className = cls;
    d.textContent = text;
    out.appendChild(d);
  }

  function handleCmd(out, raw) {
    var parts = raw.split(/\s+/);
    var cmd = (parts[0] || "").toLowerCase();
    var arg = parts.slice(1).join(" ");
    switch (cmd) {
      case "":
        break;
      case "help":
        termPrint(out, "Доступные команды:", "ln-accent");
        termPrint(out, "  help            — этот список");
        termPrint(out, "  list            — все объекты реестра");
        termPrint(out, "  info <SCP-XXX>  — открыть досье объекта");
        termPrint(out, "  random          — случайный объект");
        termPrint(out, "  classes         — статистика по классам");
        termPrint(out, "  whoami          — текущая сессия");
        termPrint(out, "  clear           — очистить экран");
        break;
      case "list":
        DB.forEach(function (o) {
          termPrint(out, "  " + pad(o.id, 10) + " [" + o.class + "] «" + o.name + "»", "ln-dim");
        });
        break;
      case "info": {
        var found = DB.filter(function (o) { return o.id.toLowerCase() === arg.toLowerCase(); })[0];
        if (!found) { termPrint(out, "Объект не найден: " + (arg || "(пусто)"), "ln-amber"); break; }
        if (!classAccessible(found.class)) {
          termPrint(out, "◼ ДОСТУП ОТКЛОНЁН — требуется уровень " + clsLevel(found.class), "ln-amber");
          break;
        }
        termPrint(out, found.id + " [" + found.class + "] «" + found.name + "»", "ln-accent");
        termPrint(out, found.description);
        openDoc(found, false);
        break;
      }
      case "random": {
        var r = DB[Math.floor(Math.random() * DB.length)];
        termPrint(out, "► " + r.id + " [" + r.class + "] «" + r.name + "»", "ln-amber");
        openDoc(r, !classAccessible(r.class));
        break;
      }
      case "classes": {
        var c = {}; DB.forEach(function (o) { c[o.class] = (c[o.class] || 0) + 1; });
        Object.keys(c).forEach(function (k) { termPrint(out, "  " + pad(k, 10) + c[k], "ln-dim"); });
        break;
      }
      case "whoami":
        termPrint(out, state.user + " · уровень допуска " + (state.level === 5 ? "O5" : "L" + state.level) +
          " · SITE-19", "ln-accent");
        break;
      case "clear":
        out.innerHTML = "";
        break;
      case "sudo":
        termPrint(out, "Эта инцидентность зарегистрирована. Совет O5 уведомлён. ;)", "ln-amber");
        break;
      default:
        termPrint(out, "Неизвестная команда: " + cmd + ". Введите 'help'.", "ln-amber");
    }
  }

  function pad(s, n) { s = String(s); while (s.length < n) s += " "; return s; }

  /* ---------------- CLOCK ---------------- */
  function initClock() {
    var el = $("#clock");
    function tick() {
      var d = new Date();
      el.textContent = z(d.getHours()) + ":" + z(d.getMinutes()) + ":" + z(d.getSeconds());
    }
    tick(); setInterval(tick, 1000);
  }
  function z(n) { return (n < 10 ? "0" : "") + n; }
  function dateStamp() {
    var d = new Date();
    return z(d.getDate()) + "." + z(d.getMonth() + 1) + "." + d.getFullYear();
  }

  /* ---------------- UTIL ---------------- */
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ---------------- INIT ---------------- */
  document.addEventListener("DOMContentLoaded", function () {
    initLogin();
    initNav();
    initDatabase();
    initModal();
    initScanner();
    initClock();
    runBoot();
  });
})();
