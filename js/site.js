/* Public site behaviour: render config, doctor tabs, slots, booking, lookup, tracking. */
(function () {
  const C = window.AD_CONFIG, S = window.AD_STORE, U = window.AD_UTIL, T = window.AD_TRACK;
  const $ = (sel, root) => (root || document).querySelector(sel);
  const el = (tag, attrs, html) => {
    const n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach((k) => (k === "class" ? (n.className = attrs[k]) : n.setAttribute(k, attrs[k])));
    if (html != null) n.innerHTML = html;
    return n;
  };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  const doc = (id) => C.doctors.find((d) => d.id === id);

  /* ---------- theme + menu ---------- */
  const themeBtn = $("#themeBtn");
  function isDark() { const t = document.documentElement.getAttribute("data-theme"); return t === "dark" || (!t && matchMedia("(prefers-color-scheme: dark)").matches); }
  function syncThemeLabel() { themeBtn.textContent = isDark() ? "Light mode" : "Dark mode"; }
  themeBtn.addEventListener("click", () => {
    const next = isDark() ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("ad_theme", next); } catch (e) {}
    syncThemeLabel();
  });
  syncThemeLabel();

  const nav = $("#nav"), menuBtn = $("#menuBtn");
  menuBtn.addEventListener("click", () => { const open = nav.classList.toggle("open"); menuBtn.setAttribute("aria-expanded", String(open)); });
  nav.addEventListener("click", (e) => { if (e.target.closest("a")) { nav.classList.remove("open"); menuBtn.setAttribute("aria-expanded", "false"); } });
  const links = [...nav.querySelectorAll(".link")];
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((ents) => {
      ents.forEach((en) => { if (en.isIntersecting) links.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + en.target.id)); });
    }, { rootMargin: "-40% 0px -55% 0px" });
    links.forEach((a) => { const t = $(a.getAttribute("href")); if (t) io.observe(t); });
  }

  /* ---------- hero duo ---------- */
  const heroAreas = {
    raghuram: ["Neurology, paralysis and spine", "Arthritis and joint disease", "Psoriasis, vitiligo and chronic skin", "Male infertility and Kshara Sutra"],
    usha: ["Infertility and Uttara Basti", "Gynaecology and obstetric care", "Ayurvedic cosmetology: skin and hair", "Yoga, weight and wellness"]
  };
  $("#duo").innerHTML = C.doctors.map((d) => {
    const cls = d.accent === "pink" ? "pink" : "green";
    return '<article class="phys ' + d.id + '">' +
      '<div class="arch ' + d.id + '"><img src="' + d.photo + '" alt="' + esc(d.name) + '" loading="eager"></div>' +
      '<div class="txt"><p class="dom">' + (d.id === "usha" ? "Women's health · Cosmetology" : "Physician · Panchakarma · Research") + '</p>' +
      "<h3>" + esc(d.name) + '</h3><p class="deg">' + esc(d.degrees) + " · " + esc(d.experienceYears) + "+ years</p>" +
      '<ul class="areas">' + heroAreas[d.id].map((a) => "<li>" + esc(a) + "</li>").join("") + "</ul>" +
      '<div class="go"><a class="btn ' + cls + ' small" href="#book" data-book-doc="' + d.id + '">Appointment with ' + esc(d.shortName) + '</a><a class="btn small" href="#doctors" data-show-doc="' + d.id + '">Profile</a></div></div></article>';
  }).join("");

  /* ---------- lineage ---------- */
  $("#lineage").innerHTML = C.lineage.map((l) => '<div class="item"><b>' + esc(l.year) + "</b><span>" + esc(l.text) + "</span></div>").join("");

  /* ---------- doctor profiles ---------- */
  $("#profiles").innerHTML = C.doctors.map((d) => {
    const cls = d.accent === "pink" ? "pink" : "green";
    return '<div class="profile ' + d.id + '" data-doc="' + d.id + '">' +
      '<aside class="card"><div class="arch ' + d.id + '"><img src="' + d.photo + '" alt="' + esc(d.name) + '" loading="lazy"></div>' +
      "<h3>" + esc(d.name) + '</h3><p class="role">' + esc(d.degrees) + "<br>" + esc(d.role) + "</p>" +
      '<ul class="meta"><li><span>Experience</span><b>' + d.experienceYears + '+ years</b></li><li><span>Registration</span><b>' + esc(d.regNo) + '</b></li><li><span>Direct line</span><b><a href="tel:+' + d.phoneRaw + '" data-cta="call" style="text-decoration:none">' + esc(d.phone) + "</a></b></li></ul>" +
      '<div class="go"><a class="btn ' + cls + '" href="#book" data-book-doc="' + d.id + '">Appointment with ' + esc(d.shortName) + "</a></div></aside>" +
      '<div class="body"><h4>About</h4><div class="bio">' + d.bio.map((p) => "<p>" + esc(p) + "</p>").join("") + "</div>" +
      "<h4>Domains of research</h4><ul class=\"rlist\">" + d.research.map((r) => "<li>" + esc(r) + "</li>").join("") + "</ul>" +
      '<h4>Domains of treatment</h4><div class="tgroups">' + d.treats.map((g) => '<div class="tgroup"><b>' + esc(g.group) + '</b><div class="chips">' + g.items.map((i) => '<span class="chip">' + esc(i) + "</span>").join("") + "</div></div>").join("") + "</div>" +
      '<h4>Qualifications</h4><ul class="qlist">' + d.qualifications.map((q) => "<li>" + esc(q) + "</li>").join("") + "</ul>" +
      "</div></div>";
  }).join("");
  function showDoc(id) {
    document.querySelectorAll(".tab").forEach((t) => t.setAttribute("aria-selected", String(t.dataset.doc === id)));
    document.querySelectorAll(".profile").forEach((p) => p.classList.toggle("show", p.dataset.doc === id));
  }
  document.querySelectorAll(".tab").forEach((t) => t.addEventListener("click", () => showDoc(t.dataset.doc)));
  showDoc("raghuram");

  /* ---------- departments ---------- */
  $("#deptGrid").innerHTML = C.departments.map((d) => {
    const who = d.doctor === "both" ? '<i class="g"></i><i class="p"></i>Both' : d.doctor === "usha" ? '<i class="p"></i>Dr. Usha' : '<i class="g"></i>Dr. Raghuram';
    return '<article class="dept"><header><h3>' + esc(d.title) + '</h3><span class="who">' + who + '</span></header><div class="chips">' + d.items.map((i) => '<span class="chip">' + esc(i) + "</span>").join("") + "</div></article>";
  }).join("");

  /* ---------- women's clinic ---------- */
  const usha = doc("usha");
  const grp = (name) => usha.treats.find((g) => g.group === name);
  $("#wgrid").innerHTML =
    '<div class="wcol lead"><figure class="wimg"><img src="assets/womens-couple.jpg" alt="Couple hoping to conceive" loading="lazy"></figure><h3>Infertility</h3><p class="sub">Uttara Basti, a natural intra-uterine Ayurvedic procedure.</p><ul>' +
    grp("Infertility").items.filter((i) => !/Uttara/.test(i)).concat(["Endometriosis", "Uterine polyps", "PID"]).map((i) => "<li>" + esc(i) + "</li>").join("") +
    '</ul><div class="benefits"><span>Improves reproductive health</span><span>Supports ovulation</span><span>Promotes hormonal balance</span><span>Strengthens overall wellness</span></div></div>' +
    '<div class="wcol"><figure class="wimg cut"><img src="assets/womens-face.png" alt="Facial skin care" loading="lazy"></figure><h3>Skin care</h3><p class="sub">Natural solutions for healthy, radiant skin.</p><ul>' + grp("Skin").items.map((i) => "<li>" + esc(i) + "</li>").join("") + '</ul><span class="tag">Machine-assisted</span></div>' +
    '<div class="wcol"><figure class="wimg"><img src="assets/womens-hair.jpg" alt="Scalp and hair treatments" loading="lazy"></figure><h3>Hair care</h3><p class="sub">Strengthen hair from root to tip.</p><ul>' + grp("Hair").items.map((i) => "<li>" + esc(i) + "</li>").join("") + "</ul></div>" +
    '<div class="wcol"><figure class="wimg"><img src="assets/womens-wellness.jpg" alt="Siro Dhara therapy" loading="lazy"></figure><h3>Wellness</h3><p class="sub">Detox, rejuvenation and stress relief.</p><ul>' + grp("Wellness").items.map((i) => "<li>" + esc(i) + "</li>").join("") + "</ul></div>";

  /* ---------- panchakarma ---------- */
  $("#pkIntro").textContent = C.panchakarma.intro;
  $("#pkBenefits").innerHTML = C.panchakarma.benefits.map((b) => "<li>" + CHECK + "<span>" + esc(b) + "</span></li>").join("");
  $("#therGrid").innerHTML = C.panchakarma.therapies.map((t) => '<article class="ther"><img src="' + t.img + '" alt="' + esc(t.name) + '" loading="lazy"><div class="t"><h3>' + esc(t.name) + "</h3><p>" + esc(t.text) + "</p></div></article>").join("");

  /* ---------- hospital ---------- */
  $("#stats").innerHTML = C.clinic.stats.map((s) => '<div class="stat"><b>' + esc(s.n) + "</b><span>" + esc(s.t) + "</span></div>").join("");
  $("#facList").innerHTML = C.clinic.facilities.map((f) => "<li>" + CHECK + "<span>" + esc(f) + "</span></li>").join("");

  /* ---------- herbals ---------- */
  $("#herbIntro").textContent = C.herbals.intro;
  $("#herbGrid").innerHTML = C.herbals.lines.map((l) => '<div class="herb"><h3>' + esc(l.title) + "</h3><ul>" + l.items.map((i) => "<li>" + esc(i) + "</li>").join("") + "</ul></div>").join("");

  /* ---------- reviews ---------- */
  $("#revGrid").innerHTML = C.reviews.map((r) => '<article class="rev"><q>' + esc(r.text) + "</q><footer><span>" + esc(r.name) + ", " + esc(r.area) + '</span><span class="stars" aria-label="5 stars">★★★★★</span></footer></article>').join("");

  /* ---------- visit ---------- */
  $("#year").textContent = new Date().getFullYear();
  $("#addr").innerHTML = C.clinic.addressLines.map(esc).join("<br>");
  $("#phones").innerHTML = C.clinic.phones.map((p) => '<a class="ph" href="tel:+' + p.raw.replace(/^0/, "91") + '" data-cta="call">' + esc(p.display) + " <small>" + esc(p.label) + "</small></a>").join("");
  const waHref = "https://wa.me/" + C.clinic.whatsapp + "?text=" + encodeURIComponent("Namaste Aditya Ayurvedic Hospital, I would like to book a consultation.");
  $("#waLink").href = waHref; $("#heroWa").href = waHref;
  $("#dirLink").href = C.clinic.mapsShort || ("https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(C.clinic.mapsQuery));
  $("#ytLink").href = C.clinic.social.youtube;
  $("#reach").innerHTML = C.clinic.reach.map((r) => "<div><b>" + esc(r.how) + "</b>" + esc(r.text) + "</div>").join("");
  const iframe = el("iframe", { title: "Map to Aditya Ayurvedic Hospital", loading: "lazy", referrerpolicy: "no-referrer-when-downgrade", allowfullscreen: "" });
  iframe.src = "https://www.google.com/maps?q=" + encodeURIComponent(C.clinic.mapsQuery) + "&output=embed";
  $("#map").appendChild(iframe);

  /* ---------- schedule + hours ---------- */
  const settings = S.getSettings();
  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const todayDow = new Date().getDay();
  $("#hours").innerHTML = DAYS.map((d, i) => {
    const open = settings.days.includes(i);
    const txt = open ? settings.windows.map((w) => U.fmtTime(w.start) + " – " + U.fmtTime(w.end)).join(", ") : "Holiday";
    return '<li class="' + (i === todayDow ? "today" : "") + '"><span>' + d + "</span><span>" + txt + "</span></li>";
  }).join("");
  $("#feeText").textContent = settings.fee;

  const allSlots = U.buildSlots(settings);
  const todayIso = U.isoDate(new Date());
  function isWorkingDay(iso) {
    const d = new Date(iso + "T00:00:00");
    return settings.days.includes(d.getDay()) && !(settings.blockedDates || []).includes(iso);
  }
  function bookedFor(iso, doctorId) {
    if (doctorId === "any") {
      /* free if at least one doctor is free */
      const a = new Set(S.bookedSlots(iso, "raghuram")), b = new Set(S.bookedSlots(iso, "usha"));
      return new Set([...a].filter((t) => b.has(t)));
    }
    return new Set(S.bookedSlots(iso, doctorId).concat(S.bookedSlots(iso, "any")));
  }
  function freeSlots(iso, doctorId) {
    const booked = bookedFor(iso, doctorId);
    const now = new Date();
    const isToday = iso === todayIso;
    const nowMin = now.getHours() * 60 + now.getMinutes() + 30;
    return allSlots.filter((t) => {
      if (booked.has(t)) return false;
      if (isToday) { const [h, m] = t.split(":").map(Number); if (h * 60 + m < nowMin) return false; }
      return true;
    });
  }
  function nextAvailable(doctorId) {
    const d = new Date();
    for (let i = 0; i <= settings.daysAhead; i++) {
      const iso = U.isoDate(d);
      if (isWorkingDay(iso)) { const f = freeSlots(iso, doctorId); if (f.length) return { date: iso, time: f[0] }; }
      d.setDate(d.getDate() + 1);
    }
    return null;
  }

  /* ---------- booking form ---------- */
  const form = $("#bookForm"), fDate = $("#fDate"), slotsBox = $("#slots"), fType = $("#fType");
  let doctorId = "raghuram", mode = C.modes[0], chosenSlot = "";

  $("#docPick").innerHTML = C.doctors.map((d) => '<label' + (d.id === doctorId ? ' class="on"' : "") + '><input type="radio" name="doctor" value="' + d.id + '"' + (d.id === doctorId ? " checked" : "") + '><span class="av"><img src="' + d.photo + '" alt=""></span><span>' + esc(d.shortName) + '<br><small class="muted">' + (d.id === "usha" ? "Women's health, skin" : "Physician, Panchakarma") + "</small></span></label>").join("") +
    '<label><input type="radio" name="doctor" value="any"><span class="av">?</span><span>Either doctor<br><small class="muted">Hospital assigns</small></span></label>';
  $("#modeSeg").innerHTML = C.modes.map((m, i) => '<label' + (i === 0 ? ' class="on"' : "") + '><input type="radio" name="mode" value="' + esc(m) + '"' + (i === 0 ? " checked" : "") + ">" + esc(m.replace(" at the hospital", "").replace(" (WhatsApp / video)", " video")) + "</label>").join("");
  fType.innerHTML = '<option value="">Select</option>' + C.visitTypes.map((v) => "<option>" + esc(v) + "</option>").join("");

  const maxD = new Date(); maxD.setDate(maxD.getDate() + settings.daysAhead);
  fDate.min = todayIso; fDate.max = U.isoDate(maxD);
  const na0 = nextAvailable(doctorId);
  if (na0) fDate.value = na0.date;

  function renderSlots() {
    const iso = fDate.value;
    slotsBox.innerHTML = "";
    if (!iso) { slotsBox.innerHTML = '<span class="empty">Choose a date to see free slots.</span>'; return; }
    if (!isWorkingDay(iso)) { slotsBox.innerHTML = '<span class="empty">No consultations on ' + DAYS[new Date(iso + "T00:00:00").getDay()] + ". Please pick another day.</span>"; return; }
    const free = new Set(freeSlots(iso, doctorId));
    if (!free.size) { slotsBox.innerHTML = '<span class="empty">All slots taken for ' + U.doctorName(doctorId) + " on this day. Try another date.</span>"; return; }
    settings.windows.forEach((w) => {
      slotsBox.appendChild(el("span", { class: "grp" }, esc(w.label) + " · " + U.fmtTime(w.start) + " to " + U.fmtTime(w.end)));
      allSlots.filter((t) => t >= w.start && t < w.end).forEach((t) => {
        const b = el("button", { type: "button", class: "slot" + (t === chosenSlot ? " on" : "") }, U.fmtTime(t));
        if (!free.has(t)) b.disabled = true;
        b.addEventListener("click", () => {
          chosenSlot = t;
          slotsBox.querySelectorAll(".slot").forEach((x) => x.classList.toggle("on", x === b));
          $("#slotErr").parentElement.classList.remove("invalid");
        });
        slotsBox.appendChild(b);
      });
    });
    if (!free.has(chosenSlot)) chosenSlot = "";
  }
  fDate.addEventListener("change", () => { chosenSlot = ""; renderSlots(); });
  $("#docPick").addEventListener("change", (e) => {
    doctorId = e.target.value;
    $("#docPick").querySelectorAll("label").forEach((l) => l.classList.toggle("on", l.querySelector("input").checked));
    chosenSlot = ""; renderSlots();
  });
  $("#modeSeg").addEventListener("change", (e) => {
    mode = e.target.value;
    $("#modeSeg").querySelectorAll("label").forEach((l) => l.classList.toggle("on", l.querySelector("input").checked));
  });
  renderSlots();

  function setDoctor(id) {
    const r = $('#docPick input[value="' + id + '"]');
    if (!r) return;
    r.checked = true;
    r.dispatchEvent(new Event("change", { bubbles: true }));
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-book-doc]");
    if (b) setDoctor(b.dataset.bookDoc);
    const s = e.target.closest("[data-show-doc]");
    if (s) showDoc(s.dataset.showDoc);
  });

  function setInvalid(input, bad) { input.closest(".field").classList.toggle("invalid", !!bad); return !bad; }
  let started = false;
  form.addEventListener("focusin", () => { if (!started) { started = true; T.bookingStarted(); } });
  $("#fMobile").addEventListener("input", (e) => { e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10); });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = $("#fName").value.trim(), mobile = $("#fMobile").value.trim(), age = $("#fAge").value.trim();
    const gender = $("#fGender").value, visitType = fType.value, date = fDate.value;
    let ok = true;
    ok = setInvalid($("#fName"), name.length < 2) && ok;
    ok = setInvalid($("#fMobile"), !/^[6-9]\d{9}$/.test(mobile)) && ok;
    ok = setInvalid($("#fAge"), age === "" || +age < 0 || +age > 120) && ok;
    ok = setInvalid($("#fGender"), !gender) && ok;
    ok = setInvalid(fType, !visitType) && ok;
    ok = setInvalid(fDate, !date || !isWorkingDay(date) || date < todayIso || date > fDate.max) && ok;
    const slotOk = chosenSlot && freeSlots(date, doctorId).includes(chosenSlot);
    $("#slotErr").parentElement.classList.toggle("invalid", !slotOk);
    ok = ok && slotOk;
    if (!ok) { toast("Please fix the highlighted fields."); const bad = form.querySelector(".invalid"); if (bad) bad.scrollIntoView({ behavior: "smooth", block: "center" }); return; }

    const appt = S.createAppointment({ name, mobile, age: +age, gender, doctor: doctorId, mode, visitType, date, time: chosenSlot, note: $("#fNote").value.trim(), source: "website" });
    T.bookingSubmitted(doctorId);
    showDone(appt);
    form.reset();
    setDoctor(doctorId);
    chosenSlot = ""; fDate.value = date; renderSlots();
  });

  function showDone(a) {
    $("#doneSummary").innerHTML =
      '<div class="row"><span>Booking ID</span><span class="id">' + esc(a.id) + "</span></div>" +
      '<div class="row"><span>Patient</span><span>' + esc(a.name) + ", " + esc(a.age) + "</span></div>" +
      '<div class="row"><span>Physician</span><span>' + esc(U.doctorName(a.doctor)) + "</span></div>" +
      '<div class="row"><span>When</span><span>' + U.fmtDateLong(a.date) + ", " + U.fmtTime(a.time) + "</span></div>" +
      '<div class="row"><span>Mode</span><span>' + esc(a.mode) + "</span></div>" +
      '<div class="row"><span>Status</span><span>Awaiting confirmation</span></div>';
    const msg = "Aditya Ayurvedic Hospital appointment request\nID: " + a.id + "\nPatient: " + a.name + "\nPhysician: " + U.doctorName(a.doctor) + "\nDate: " + U.fmtDate(a.date) + " " + U.fmtTime(a.time) + "\nMode: " + a.mode;
    $("#doneWa").href = "https://wa.me/?text=" + encodeURIComponent(msg);
    $("#doneModal").hidden = false;
    $("#doneClose").focus();
  }
  $("#doneClose").addEventListener("click", () => { $("#doneModal").hidden = true; });
  $("#doneModal").addEventListener("click", (e) => { if (e.target.id === "doneModal") e.currentTarget.hidden = true; });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") $("#doneModal").hidden = true; });

  /* ---------- lookup ---------- */
  const STATUS_TXT = { pending: "Awaiting confirmation", approved: "Confirmed", rejected: "Not available, please rebook", completed: "Visit completed", no_show: "Missed", cancelled: "Cancelled" };
  $("#lookupForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const m = $("#lookupMobile").value.replace(/\D/g, ""), out = $("#lookupResult");
    if (!/^\d{10}$/.test(m)) { out.innerHTML = '<span class="muted">Enter the 10-digit mobile used while booking.</span>'; return; }
    const list = S.findByMobile(m).slice(0, 4);
    if (!list.length) { out.innerHTML = '<span class="muted">No bookings found for this number on this device.</span>'; return; }
    out.innerHTML = list.map((a) => '<div class="row"><span><b>' + esc(a.id) + '</b><br><span class="muted">' + esc(U.doctorName(a.doctor)) + " · " + U.fmtDate(a.date) + " · " + U.fmtTime(a.time) + "</span></span><span>" + esc(STATUS_TXT[a.status] || a.status) + "</span></div>").join("");
  });

  /* ---------- toast ---------- */
  let tt;
  function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(tt); tt = setTimeout(() => t.classList.remove("show"), 2600); }

  /* ---------- motion: reveal, counters, parallax, progress, petals, smooth anchors ---------- */
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const revealSel = ".sec-head, .lineage .item, .dept, .ther, .rev, .wcol, .herb, .stat, .fac-list li, .gallery figure, .pk-hero > *, .hosp-top > *, .visit-grid > *, .book-grid > *, .profile .card, .profile .body > *, .reach > div";
  document.querySelectorAll(revealSel).forEach((n) => { if (!n.classList.contains("reveal")) n.classList.add("reveal"); });
  document.querySelectorAll(".dept-grid, .ther-grid, .rev-grid, .wgrid, .herb-grid, .stats, .gallery, .lineage .wrap, .fac-list").forEach((grid) => {
    [...grid.children].forEach((c, i) => c.style.setProperty("--d", Math.min(i, 7) * 0.07 + "s"));
  });
  if ("IntersectionObserver" in window && !reduce) {
    const rio = new IntersectionObserver((ents) => { ents.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); rio.unobserve(en.target); } }); }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    document.querySelectorAll(".reveal, .reveal-scale").forEach((n) => rio.observe(n));
  } else {
    document.querySelectorAll(".reveal, .reveal-scale").forEach((n) => n.classList.add("in"));
  }
  /* animated counters on the hospital stats */
  function animateCount(el) {
    const raw = el.textContent.trim(); const m = raw.match(/^([\d,\.]+)(.*)$/);
    if (!m || reduce) return;
    const target = parseFloat(m[1].replace(/,/g, "")), suffix = m[2], dec = (m[1].split(".")[1] || "").length;
    const t0 = performance.now(), dur = 1400;
    (function tick(now) {
      const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = (target * e).toLocaleString("en-IN", { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suffix;
      if (k < 1) requestAnimationFrame(tick); else el.textContent = raw;
    })(t0);
  }
  if ("IntersectionObserver" in window) {
    const cio = new IntersectionObserver((ents) => { ents.forEach((en) => { if (en.isIntersecting) { animateCount(en.target); cio.unobserve(en.target); } }); }, { threshold: 0.6 });
    document.querySelectorAll(".stat b").forEach((b) => cio.observe(b));
  }
  /* scroll progress, header shadow, parallax images */
  const prog = $("#prog"), top = $(".top"), plx = [...document.querySelectorAll("[data-parallax]")];
  let ticking = false;
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY, max = document.documentElement.scrollHeight - innerHeight;
      if (prog) prog.style.width = (max > 0 ? (y / max) * 100 : 0) + "%";
      top.classList.toggle("scrolled", y > 8);
      if (!reduce) plx.forEach((img) => {
        const r = img.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return;
        const off = (r.top + r.height / 2 - innerHeight / 2) * -parseFloat(img.dataset.parallax);
        img.style.setProperty("--py", off.toFixed(1) + "px");
      });
      ticking = false;
    });
  }
  addEventListener("scroll", onScroll, { passive: true }); onScroll();
  /* floating bottom bar: hidden while the hero (which has its own buttons) or the booking form is on screen */
  const sticky = $("#stickyCta");
  if (sticky && "IntersectionObserver" in window) {
    const vis = { hero: true, book: false };
    const sio = new IntersectionObserver((ents) => {
      ents.forEach((en) => { vis[en.target.id] = en.isIntersecting; });
      sticky.classList.toggle("hide", vis.hero || vis.book);
    }, { threshold: 0.05 });
    ["hero", "book"].forEach((id) => { const n = document.getElementById(id); if (n) sio.observe(n); });
  } else if (sticky) { sticky.classList.remove("hide"); }
  /* floating lotus petals in the hero */
  const petals = $("#petals");
  if (petals && !reduce) {
    for (let i = 0; i < 14; i++) {
      const p = el("span", { class: "petal" });
      p.style.left = (Math.random() * 100) + "%"; p.style.setProperty("--dur", (11 + Math.random() * 10) + "s");
      p.style.setProperty("--delay", (-Math.random() * 20) + "s"); p.style.setProperty("--dx", ((Math.random() - 0.5) * 16) + "vw");
      p.style.transform = "scale(" + (0.6 + Math.random() * 0.8) + ")";
      petals.appendChild(p);
    }
  }
  /* eased smooth scroll for in-page anchors (falls back to CSS scroll-behavior) */
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]'); if (!a || reduce) return;
    const id = a.getAttribute("href").slice(1); const target = id ? document.getElementById(id) : document.body;
    if (!target) return;
    e.preventDefault();
    const start = window.scrollY, end = target.getBoundingClientRect().top + start - (id === "top" ? 0 : 84), dist = end - start;
    const dur = Math.min(1100, 400 + Math.abs(dist) * 0.25), t0 = performance.now();
    (function step(now) {
      const k = Math.min(1, (now - t0) / dur), ease = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      window.scrollTo(0, start + dist * ease);
      if (k < 1) requestAnimationFrame(step); else history.replaceState(null, "", "#" + id);
    })(t0);
  });

  /* ---------- tracking ---------- */
  T.pageview("home");
  T.observeSections("main section[id]");
  document.addEventListener("click", (e) => { const a = e.target.closest("[data-cta]"); if (a) T.cta(a.dataset.cta); });
})();
