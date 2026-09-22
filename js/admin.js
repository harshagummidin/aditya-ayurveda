/* Staff console: sign in, appointments, analytics, availability. */
(function () {
  const C = window.AD_CONFIG, S = window.AD_STORE, U = window.AD_UTIL;
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => [...(root || document).querySelectorAll(sel)];
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const STATUS = { pending: "Pending", approved: "Approved", completed: "Completed", rejected: "Rejected", no_show: "No-show", cancelled: "Cancelled" };
  const todayIso = U.isoDate(new Date());

  /* Chart palette: brand-derived, validated for CVD separation in both modes.
     Slot order is fixed; a series keeps its colour whatever gets filtered. */
  const PAL = {
    light: { cat: ["#1f8a45", "#2f5fb3", "#d9186f", "#a97a1f", "#7a4bd6", "#c2410c"], grid: "rgba(27,36,71,.10)", text: "#5a5f78", surface: "#ffffff" },
    dark: { cat: ["#2f9e5c", "#5a86e8", "#e2438b", "#b8882a", "#9470e8", "#d96f45"], grid: "rgba(244,236,228,.12)", text: "#b7afc3", surface: "#221d33" }
  };
  function isDark() { const t = document.documentElement.getAttribute("data-theme"); return t === "dark" || (!t && matchMedia("(prefers-color-scheme: dark)").matches); }
  const pal = () => (isDark() ? PAL.dark : PAL.light);
  const DOC_SLOT = { raghuram: 0, usha: 2, any: 1 }; /* fixed slot per physician, never by rank */

  /* ---------- theme ---------- */
  const themeBtn = $("#themeBtn");
  function syncTheme() { themeBtn.textContent = isDark() ? "Light mode" : "Dark mode"; }
  themeBtn.addEventListener("click", () => {
    const next = isDark() ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("ad_theme", next); } catch (e) {}
    syncTheme();
    if (current === "analytics") renderAnalytics();
  });
  syncTheme();

  /* ---------- auth ---------- */
  async function sha256(text) {
    if (window.crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
      return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
    }
    return sha256Fallback(text);
  }
  /* compact SHA-256 for file:// previews where crypto.subtle is unavailable */
  function sha256Fallback(ascii) {
    function rr(v, a) { return (v >>> a) | (v << (32 - a)); }
    const mathPow = Math.pow, maxWord = mathPow(2, 32), words = [], hash = [], k = [];
    let asciiBitLength = ascii.length * 8, primeCounter = 0, result = "";
    const isComposite = {};
    for (let candidate = 2; primeCounter < 64; candidate++) {
      if (!isComposite[candidate]) {
        for (let i = 0; i < 313; i += candidate) isComposite[i] = candidate;
        hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
        k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
      }
    }
    ascii += "\x80";
    while ((ascii.length % 64) - 56) ascii += "\x00";
    for (let i = 0; i < ascii.length; i++) { const j = ascii.charCodeAt(i); if (j >> 8) return ""; words[i >> 2] |= j << (((3 - i) % 4) * 8); }
    words[words.length] = (asciiBitLength / maxWord) | 0; words[words.length] = asciiBitLength;
    for (let j = 0; j < words.length;) {
      const w = words.slice(j, (j += 16)), oldHash = hash.slice(0);
      for (let i = 0; i < 64; i++) {
        const w15 = w[i - 15], w2 = w[i - 2], a = hash[0], e = hash[4];
        const temp1 = hash[7] + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & hash[5]) ^ (~e & hash[6])) + k[i] +
          (w[i] = i < 16 ? w[i] : (w[i - 16] + (rr(w15, 7) ^ rr(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (rr(w2, 17) ^ rr(w2, 19) ^ (w2 >>> 10))) | 0);
        const temp2 = (rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
        hash = [(temp1 + temp2) | 0].concat(hash); hash[4] = (hash[4] + temp1) | 0;
      }
      for (let i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
    }
    for (let i = 0; i < 8; i++) for (let j = 3; j + 1; j--) { const b = (hash[i] >> (j * 8)) & 255; result += (b < 16 ? "0" : "") + b.toString(16); }
    return result;
  }
  function signedIn() { try { return sessionStorage.getItem("ad_admin") === "1"; } catch (e) { return false; } }
  function showApp(on) {
    $("#loginView").hidden = on; $("#appView").hidden = !on;
    if (on) { const h = location.hash.replace("#", ""); switchView(TITLES[h] ? h : "overview"); }
  }
  $("#loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const u = $("#lUser").value.trim(), p = $("#lPass").value;
    const ok = u === C.admin.username && (await sha256(p)) === C.admin.passwordHash;
    $("#loginErr").hidden = ok;
    if (!ok) return;
    try { sessionStorage.setItem("ad_admin", "1"); } catch (e2) {}
    showApp(true);
  });
  $("#logoutBtn").addEventListener("click", () => { try { sessionStorage.removeItem("ad_admin"); } catch (e) {} showApp(false); });

  /* ---------- views ---------- */
  const TITLES = {
    overview: ["Overview", "What needs attention today"],
    appointments: ["Appointments", "Approve, reject and follow up on booking requests"],
    analytics: ["Analytics", "How people find and use the website"],
    availability: ["Availability", "Days, timings, slot length and blocked dates"]
  };
  let current = "overview";
  function switchView(v) {
    current = v;
    if (location.hash !== "#" + v) history.replaceState(null, "", "#" + v);
    $$(".sn[data-view]").forEach((b) => b.classList.toggle("on", b.dataset.view === v));
    $$(".view").forEach((s) => (s.hidden = s.dataset.view !== v));
    $("#viewTitle").textContent = TITLES[v][0]; $("#viewSub").textContent = TITLES[v][1];
    if (v === "overview") renderOverview();
    if (v === "appointments") renderTable();
    if (v === "analytics") renderAnalytics();
    if (v === "availability") renderSettings();
    updatePendingCount();
  }
  $$(".sn[data-view]").forEach((b) => b.addEventListener("click", () => switchView(b.dataset.view)));
  function updatePendingCount() {
    const n = S.listAppointments().filter((a) => a.status === "pending" && a.date >= todayIso).length;
    $("#pendingCount").textContent = n ? String(n) : "";
  }

  /* ---------- shared bits ---------- */
  const badge = (s) => '<span class="badge ' + s + '">' + (STATUS[s] || s) + "</span>";
  const docTag = (id) => '<span class="doc-tag ' + esc(id) + '"><i></i>' + esc(U.doctorName(id)) + "</span>";
  function opsFor(a) {
    const b = [];
    if (a.status === "pending") b.push(op(a.id, "approved", "Approve", "ok"), op(a.id, "rejected", "Reject", "no"));
    else if (a.status === "approved") b.push(op(a.id, "completed", "Completed", "ok"), op(a.id, "no_show", "No-show"), op(a.id, "rejected", "Cancel", "no"));
    else b.push(op(a.id, "pending", "Reopen"));
    b.push('<button class="mini" data-detail="' + esc(a.id) + '">Details</button>');
    return b.join("");
  }
  const op = (id, st, label, cls) => '<button class="mini ' + (cls || "") + '" data-op="' + st + '" data-id="' + esc(id) + '">' + label + "</button>";

  document.addEventListener("click", (e) => {
    const o = e.target.closest("[data-op]");
    if (o) { act(o.dataset.id, o.dataset.op); return; }
    const d = e.target.closest("[data-detail]");
    if (d) openDetail(d.dataset.detail);
  });

  function act(id, status) {
    const a = S.getAppointment(id);
    if (!a) return;
    if (status === "rejected") {
      confirmBox("Reject this request?", a.name + ", " + U.fmtDate(a.date) + " " + U.fmtTime(a.time) + ". The patient sees the reason when they check status.", true, (reason) => {
        S.updateStatus(id, "rejected", reason || "Slot not available, please rebook");
        toast("Rejected " + id);
        refresh();
      });
      return;
    }
    S.updateStatus(id, status);
    toast(STATUS[status] + ": " + id);
    refresh();
  }
  function refresh() {
    if (current === "overview") renderOverview();
    if (current === "appointments") renderTable();
    if (current === "analytics") renderAnalytics();
    updatePendingCount();
    if (!$("#detailModal").hidden && detailId) openDetail(detailId);
  }

  /* ---------- overview ---------- */
  function renderOverview() {
    const all = S.listAppointments();
    const today = all.filter((a) => a.date === todayIso && a.status !== "rejected" && a.status !== "cancelled").sort((a, b) => a.time.localeCompare(b.time));
    const pending = all.filter((a) => a.status === "pending" && a.date >= todayIso).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const in7 = new Date(); in7.setDate(in7.getDate() + 7);
    const upcoming = all.filter((a) => a.status === "approved" && a.date >= todayIso && a.date <= U.isoDate(in7)).length;
    const ev = S.listEvents();
    const wk = visitsBetween(ev, 6, 0), prev = visitsBetween(ev, 13, 7);
    const delta = prev ? Math.round(((wk - prev) / prev) * 100) : 0;
    $("#kpis").innerHTML =
      kpi("Appointments today", today.length, byDoc(today)) +
      kpi("Pending requests", pending.length, pending.length ? "Oldest " + ago(pending[pending.length - 1].createdAt) : "All clear") +
      kpi("Confirmed, next 7 days", upcoming, "") +
      kpi("Website visitors, last 7 days", wk, '<span class="delta ' + (delta >= 0 ? "up" : "down") + '">' + (delta >= 0 ? "+" : "") + delta + "% vs previous week</span>");
    $("#todayList").innerHTML = today.length ? today.map(item).join("") : '<div class="empty">No appointments today.</div>';
    $("#pendingList").innerHTML = pending.length ? pending.slice(0, 8).map(item).join("") : '<div class="empty">No new requests. Bookings from the website appear here.</div>';
  }
  function byDoc(list) {
    const r = list.filter((a) => a.doctor === "raghuram").length, u = list.filter((a) => a.doctor === "usha").length;
    return r + " Dr. Raghuram · " + u + " Dr. Usha";
  }
  const kpi = (label, n, sub) => '<div class="kpi"><span>' + label + "</span><b>" + n + "</b>" + (sub ? '<span class="small">' + sub + "</span>" : "") + "</div>";
  const item = (a) => '<div class="item"><div class="when">' + U.fmtTime(a.time) + (a.date !== todayIso ? '<span class="sub small muted" style="display:block;font-family:var(--sans);font-size:.78rem">' + U.fmtDate(a.date) + "</span>" : "") + '</div><div class="who"><b>' + esc(a.name) + "</b><span>" + docTag(a.doctor) + " · " + esc(a.visitType) + (a.mode && /Online/.test(a.mode) ? " · Online" : "") + "</span></div>" + '<div class="ops">' + badge(a.status) + opsFor(a) + "</div></div>";
  function ago(iso) {
    const h = Math.round((Date.now() - new Date(iso)) / 36e5);
    return h < 1 ? "just now" : h < 24 ? h + " h ago" : Math.round(h / 24) + " d ago";
  }
  function visitsBetween(ev, fromDaysAgo, toDaysAgo) {
    const a = new Date(); a.setHours(0, 0, 0, 0); a.setDate(a.getDate() - fromDaysAgo);
    const b = new Date(); b.setHours(23, 59, 59, 999); b.setDate(b.getDate() - toDaysAgo);
    return ev.filter((e) => e.t === "pageview" && new Date(e.ts) >= a && new Date(e.ts) <= b).length;
  }

  /* ---------- appointments table ---------- */
  const PAGE = 20;
  let page = 1;
  ["#q", "#fStatus", "#fDoctor", "#fRange"].forEach((id) => $(id).addEventListener("input", () => { page = 1; renderTable(); }));
  function filtered() {
    const q = $("#q").value.trim().toLowerCase(), st = $("#fStatus").value, dc = $("#fDoctor").value, rg = $("#fRange").value;
    return S.listAppointments().filter((a) => {
      if (st && a.status !== st) return false;
      if (dc && a.doctor !== dc) return false;
      if (rg === "upcoming" && a.date < todayIso) return false;
      if (rg === "today" && a.date !== todayIso) return false;
      if (rg === "past" && a.date >= todayIso) return false;
      if (q && !(a.name.toLowerCase().includes(q) || a.mobile.includes(q) || a.id.toLowerCase().includes(q))) return false;
      return true;
    }).sort((a, b) => (rg === "past" ? -1 : 1) * ((a.date + a.time).localeCompare(b.date + b.time)));
  }
  function renderTable() {
    const rows = filtered();
    const pages = Math.max(1, Math.ceil(rows.length / PAGE));
    page = Math.min(page, pages);
    const slice = rows.slice((page - 1) * PAGE, page * PAGE);
    $("#apptTable tbody").innerHTML = slice.length ? slice.map((a) =>
      "<tr><td><span class=\"id\">" + esc(a.id) + '</span><span class="sub">' + ago(a.createdAt) + " · " + esc(a.source) + "</span></td>" +
      "<td><b>" + esc(a.name) + '</b><span class="sub">' + esc(a.age) + " · " + esc(a.gender) + " · " + esc(a.mobile) + "</span></td>" +
      "<td>" + docTag(a.doctor) + "</td>" +
      "<td>" + U.fmtDate(a.date) + '<span class="sub">' + U.fmtTime(a.time) + "</span></td>" +
      "<td>" + esc(a.visitType) + '<span class="sub">' + esc((a.mode || "").replace(" at the hospital", "").replace(" (WhatsApp / video)", "")) + "</span></td>" +
      "<td>" + badge(a.status) + "</td>" +
      '<td><div class="ops">' + opsFor(a) + "</div></td></tr>"
    ).join("") : '<tr><td class="empty" colspan="7">No appointments match these filters.</td></tr>';
    let pg = "";
    for (let i = 1; i <= pages; i++) pg += '<button class="mini' + (i === page ? " ok" : "") + '" data-page="' + i + '">' + i + "</button>";
    $("#pager").innerHTML = "<span>" + rows.length + " appointment" + (rows.length === 1 ? "" : "s") + (pages > 1 ? ", page " + page + " of " + pages : "") + '</span><div class="pg">' + (pages > 1 ? pg : "") + "</div>";
  }
  $("#pager").addEventListener("click", (e) => { const b = e.target.closest("[data-page]"); if (b) { page = +b.dataset.page; renderTable(); } });
  $("#csvBtn").addEventListener("click", () => {
    const rows = filtered();
    const head = ["Booking ID", "Patient", "Age", "Gender", "Mobile", "Physician", "Date", "Time", "Mode", "Reason", "Status", "Patient note", "Staff note", "Requested at", "Source"];
    const csv = [head].concat(rows.map((a) => [a.id, a.name, a.age, a.gender, a.mobile, U.doctorName(a.doctor), U.fmtDate(a.date), U.fmtTime(a.time), a.mode, a.visitType, STATUS[a.status], a.note, a.adminNote, a.createdAt, a.source]))
      .map((r) => r.map((v) => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"').join(",")).join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "aditya-appointments-" + todayIso + ".csv"; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast("Exported " + rows.length + " rows");
  });

  /* ---------- detail modal ---------- */
  let detailId = null;
  function openDetail(id) {
    const a = S.getAppointment(id); if (!a) return;
    detailId = id;
    $("#dTitle").textContent = a.id;
    $("#dBody").innerHTML = '<dl class="kv">' +
      kv("Patient", esc(a.name) + ", " + esc(a.age) + ", " + esc(a.gender)) + kv("Mobile", '<a href="tel:+91' + esc(a.mobile) + '">' + esc(a.mobile) + '</a> · <a href="https://wa.me/91' + esc(a.mobile) + '" target="_blank" rel="noopener">WhatsApp</a>') +
      kv("Physician", docTag(a.doctor)) + kv("When", U.fmtDateLong(a.date) + ", " + U.fmtTime(a.time)) + kv("Mode", esc(a.mode)) + kv("Reason", esc(a.visitType)) +
      kv("Patient note", a.note ? esc(a.note) : '<span class="muted">None</span>') + kv("Status", badge(a.status)) + kv("Requested", new Date(a.createdAt).toLocaleString("en-IN") + " via " + esc(a.source)) + "</dl>";
    $("#dNote").value = a.adminNote || "";
    $("#dActions").innerHTML = opsFor(a).replace(/<button class="mini" data-detail[^>]*>Details<\/button>/, "") + '<button class="btn small" id="dSave" type="button">Save note</button>';
    $("#detailModal").hidden = false;
    $("#dSave").addEventListener("click", () => { S.updateStatus(a.id, S.getAppointment(a.id).status, $("#dNote").value.trim()); toast("Note saved"); refresh(); });
  }
  const kv = (k, v) => "<dt>" + k + "</dt><dd>" + v + "</dd>";
  $("#dClose").addEventListener("click", () => { $("#detailModal").hidden = true; detailId = null; });
  $("#detailModal").addEventListener("click", (e) => { if (e.target.id === "detailModal") { e.currentTarget.hidden = true; detailId = null; } });

  /* ---------- confirm modal ---------- */
  let onYes = null;
  function confirmBox(title, text, withReason, cb) {
    $("#cTitle").textContent = title; $("#cText").textContent = text;
    $("#cReasonWrap").hidden = !withReason; $("#cReason").value = "";
    onYes = cb; $("#confirmModal").hidden = false;
    (withReason ? $("#cReason") : $("#cYes")).focus();
  }
  $("#cYes").addEventListener("click", () => { const r = $("#cReason").value.trim(); $("#confirmModal").hidden = true; if (onYes) onYes(r); onYes = null; });
  $("#cNo").addEventListener("click", () => { $("#confirmModal").hidden = true; onYes = null; });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") { $("#confirmModal").hidden = true; $("#detailModal").hidden = true; } });
  $("#resetBtn").addEventListener("click", () => confirmBox("Reset demo data?", "Deletes every appointment, analytics event and availability change on this browser, then re-creates the sample data.", false, () => { S.seedDemo(true); toast("Demo data reset"); refresh(); }));

  /* ---------- analytics ---------- */
  const charts = {};
  let rangeDays = 7;
  $("#rangeSeg").addEventListener("change", (e) => {
    rangeDays = +e.target.value;
    $$("#rangeSeg label").forEach((l) => l.classList.toggle("on", l.querySelector("input").checked));
    renderAnalytics();
  });
  function chart(id, cfg) {
    if (charts[id]) charts[id].destroy();
    const ctx = $("#" + id);
    if (!ctx || !window.Chart) return;
    charts[id] = new Chart(ctx, cfg);
  }
  function base(extra) {
    const p = pal();
    Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
    Chart.defaults.color = p.text;
    const defaults = { responsive: true, maintainAspectRatio: false, animation: { duration: 500 }, plugins: { legend: { display: false }, tooltip: { backgroundColor: isDark() ? "#f4ece4" : "#1b2447", titleColor: isDark() ? "#1b2447" : "#fbf5ee", bodyColor: isDark() ? "#1b2447" : "#fbf5ee", padding: 10, cornerRadius: 8, displayColors: true } } };
    const out = Object.assign({}, defaults, extra || {});
    /* deep-merge plugins so a chart can add a legend or tooltip callback without losing the defaults */
    out.plugins = Object.assign({}, defaults.plugins, (extra && extra.plugins) || {});
    if (extra && extra.plugins) Object.keys(extra.plugins).forEach((k) => { out.plugins[k] = Object.assign({}, defaults.plugins[k] || {}, extra.plugins[k]); });
    return out;
  }
  const clip = (s, n) => (String(s).length > n ? String(s).slice(0, n - 1) + "…" : String(s));
  const axes = (yInt) => { const p = pal(); return { x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true } }, y: { beginAtZero: true, grid: { color: p.grid }, border: { display: false }, ticks: { precision: 0, stepSize: yInt ? undefined : undefined } } }; };
  const count = (arr, key) => arr.reduce((m, e) => { const k = typeof key === "function" ? key(e) : e[key]; if (k != null && k !== "") m[k] = (m[k] || 0) + 1; return m; }, {});
  const sorted = (m, n) => Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n || 99);

  function renderAnalytics() {
    const p = pal();
    const from = new Date(); from.setHours(0, 0, 0, 0); from.setDate(from.getDate() - (rangeDays - 1));
    const ev = S.listEvents().filter((e) => new Date(e.ts) >= from);
    const appts = S.listAppointments().filter((a) => new Date(a.createdAt) >= from);
    const pv = ev.filter((e) => e.t === "pageview");
    const sessions = new Set(pv.map((e) => e.sid));
    const reachedBook = new Set(ev.filter((e) => e.t === "section" && e.name === "book").map((e) => e.sid)).size;
    const started = new Set(ev.filter((e) => e.t === "booking_started").map((e) => e.sid)).size;
    const submitted = ev.filter((e) => e.t === "booking_submitted").length;
    const conv = sessions.size ? ((submitted / sessions.size) * 100).toFixed(1) : "0";
    $("#rangeNote").textContent = "From " + U.fmtDate(U.isoDate(from)) + " to today";
    $("#aKpis").innerHTML = kpi("Visits", sessions.size, "unique browser sessions") + kpi("Booking requests", submitted, conv + "% of visits") + kpi("Reached the booking form", reachedBook, sessions.size ? Math.round((reachedBook / sessions.size) * 100) + "% of visits" : "") + kpi("Contact taps", ev.filter((e) => e.t === "cta").length, "call, WhatsApp, directions");

    /* daily visits + bookings: same unit (count), one axis */
    const days = [], visitsD = [], booksD = [];
    for (let i = 0; i < rangeDays; i++) {
      const d = new Date(from); d.setDate(from.getDate() + i);
      const iso = U.isoDate(d); days.push(d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }));
      visitsD.push(pv.filter((e) => e.ts.slice(0, 10) === iso).length);
      booksD.push(ev.filter((e) => e.t === "booking_submitted" && e.ts.slice(0, 10) === iso).length);
    }
    chart("cDaily", { type: "bar", data: { labels: days, datasets: [
      { label: "Visits", data: visitsD, backgroundColor: p.cat[0], borderRadius: 4, borderSkipped: false, maxBarThickness: 22 },
      { label: "Booking requests", data: booksD, backgroundColor: p.cat[2], borderRadius: 4, borderSkipped: false, maxBarThickness: 22 }
    ] }, options: base({ plugins: { legend: { display: true, position: "top", align: "start", labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true, padding: 16 } } }, scales: axes() }) });

    /* fixed category order so a source or device keeps its colour across ranges */
    donut("cSource", fixedOrder(count(pv, "source"), ["direct", "google", "whatsapp", "facebook", "instagram", "youtube", "listing", "other"], 6), 6, null, true);
    donut("cDevice", fixedOrder(count(pv, "device"), ["mobile", "desktop", "tablet"], 3), 3, null, true);
    hbar("cSections", count(ev.filter((e) => e.t === "section"), "name"), 9, 0);
    const byDocMap = count(appts, "doctor");
    const docOrder = ["raghuram", "usha", "any"].filter((k) => byDocMap[k]);
    donut("cDoctor", Object.fromEntries(docOrder.map((k) => [U.doctorName(k), byDocMap[k]])), 3, docOrder.map((k) => p.cat[DOC_SLOT[k]]), true);
    hbar("cReason", count(appts, "visitType"), 8, 1);
    const hrs = Array.from({ length: 24 }, () => 0); pv.forEach((e) => hrs[new Date(e.ts).getHours()]++);
    chart("cHours", { type: "bar", data: { labels: hrs.map((_, i) => (i % 3 === 0 ? U.fmtTime(String(i).padStart(2, "0") + ":00").replace(":00", "") : "")), datasets: [{ data: hrs, backgroundColor: p.cat[2], borderRadius: 3, borderSkipped: false }] }, options: base({ scales: axes(), plugins: { tooltip: { callbacks: { title: (it) => U.fmtTime(String(it[0].dataIndex).padStart(2, "0") + ":00") } } } }) });
    const slotMap = count(appts, "time"); const slotEntries = sorted(slotMap, 8).sort((a, b) => a[0].localeCompare(b[0]));
    chart("cSlots", { type: "bar", data: { labels: slotEntries.map((e) => U.fmtTime(e[0])), datasets: [{ data: slotEntries.map((e) => e[1]), backgroundColor: p.cat[3], borderRadius: 4, borderSkipped: false, maxBarThickness: 28 }] }, options: base({ scales: axes() }) });
    hbar("cCta", count(ev.filter((e) => e.t === "cta"), "name"), 5, 4);

    const steps = [["Visited the site", sessions.size], ["Reached the booking form", reachedBook], ["Started filling it", started], ["Sent a request", submitted]];
    const max = steps[0][1] || 1;
    $("#funnel").innerHTML = steps.map((s, i) => '<div class="step"><span>' + s[0] + '</span><span><span class="n">' + s[1] + '</span> <span class="pct">' + (i ? Math.round((s[1] / max) * 100) + "%" : "") + '</span></span><div class="bar"><i style="width:' + Math.max(2, (s[1] / max) * 100) + '%"></i></div></div>').join("");
  }
  function fixedOrder(map, order, n) {
    const known = order.filter((k) => map[k]);
    const rest = Object.keys(map).filter((k) => !order.includes(k)).sort((a, b) => map[b] - map[a]);
    const keys = known.concat(rest).slice(0, n);
    const out = {}; keys.forEach((k) => { out[k] = map[k]; out.__slots = (out.__slots || []).concat(order.indexOf(k) < 0 ? 5 : order.indexOf(k) % 6); });
    return out;
  }
  function donut(id, map, n, colors, keepOrder) {
    if (map.__slots && !colors) { const p0 = pal(); colors = map.__slots.map((i) => p0.cat[i]); }
    if (map.__slots) { map = Object.assign({}, map); delete map.__slots; }
    const p = pal(); const ent = keepOrder ? Object.entries(map) : sorted(map, n);
    chart(id, { type: "doughnut", data: { labels: ent.map((e) => cap(e[0])), datasets: [{ data: ent.map((e) => e[1]), backgroundColor: colors || p.cat.slice(0, ent.length), borderColor: p.surface, borderWidth: 2, hoverOffset: 4 }] },
      options: base({ cutout: "62%", plugins: { legend: { display: true, position: "right", labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true, padding: 10 } } } }) });
  }
  function hbar(id, map, n, slot) {
    const p = pal(); const ent = sorted(map, n);
    chart(id, { type: "bar", data: { labels: ent.map((e) => cap(e[0])), datasets: [{ data: ent.map((e) => e[1]), backgroundColor: p.cat[slot], borderRadius: 4, borderSkipped: false, maxBarThickness: 16 }] },
      options: base({ indexAxis: "y", scales: { x: { beginAtZero: true, grid: { color: p.grid }, border: { display: false }, ticks: { precision: 0 } }, y: { grid: { display: false }, ticks: { callback: function (v) { return clip(this.getLabelForValue(v), 22); } } } } }) });
  }
  const cap = (s) => String(s).replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

  /* ---------- availability ---------- */
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  function renderSettings() {
    const s = S.getSettings();
    $("#days").innerHTML = DAYS.map((d, i) => '<label class="' + (s.days.includes(i) ? "on" : "") + '"><input type="checkbox" value="' + i + '"' + (s.days.includes(i) ? " checked" : "") + ">" + d + "</label>").join("");
    $("#w0s").value = s.windows[0].start; $("#w0e").value = s.windows[0].end;
    $("#w1s").value = s.windows[1] ? s.windows[1].start : ""; $("#w1e").value = s.windows[1] ? s.windows[1].end : "";
    $("#slotMin").value = String(s.slotMinutes); $("#fee").value = s.fee; $("#daysAhead").value = String(s.daysAhead);
    renderBlocked(s.blockedDates || []);
  }
  function renderBlocked(list) {
    $("#blocked").innerHTML = list.length ? list.sort().map((d) => '<span class="chip rm" data-unblock="' + d + '" title="Remove">' + U.fmtDate(d) + " ×</span>").join("") : '<span class="muted small">No blocked dates.</span>';
  }
  $("#days").addEventListener("change", () => $$("#days label").forEach((l) => l.classList.toggle("on", l.querySelector("input").checked)));
  $("#blockAdd").addEventListener("click", () => {
    const d = $("#blockDate").value; if (!d) return;
    const s = S.getSettings(); const list = s.blockedDates || [];
    if (!list.includes(d)) list.push(d);
    S.saveSettings({ blockedDates: list }); renderBlocked(list); $("#blockDate").value = ""; toast("Blocked " + U.fmtDate(d));
  });
  $("#blocked").addEventListener("click", (e) => {
    const c = e.target.closest("[data-unblock]"); if (!c) return;
    const list = (S.getSettings().blockedDates || []).filter((x) => x !== c.dataset.unblock);
    S.saveSettings({ blockedDates: list }); renderBlocked(list); toast("Unblocked " + U.fmtDate(c.dataset.unblock));
  });
  $("#settingsForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const days = $$("#days input:checked").map((i) => +i.value);
    if (!days.length) { toast("Pick at least one consultation day."); return; }
    const windows = [];
    if ($("#w0s").value && $("#w0e").value && $("#w0s").value < $("#w0e").value) windows.push({ label: "Morning", start: $("#w0s").value, end: $("#w0e").value });
    if ($("#w1s").value && $("#w1e").value && $("#w1s").value < $("#w1e").value) windows.push({ label: "Evening", start: $("#w1s").value, end: $("#w1e").value });
    if (!windows.length) { toast("Enter at least one valid time window."); return; }
    S.saveSettings({ days, windows, slotMinutes: +$("#slotMin").value, fee: $("#fee").value.trim() || C.schedule.fee, daysAhead: +$("#daysAhead").value });
    toast("Availability saved");
  });

  /* ---------- toast ---------- */
  let tt;
  function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(tt); tt = setTimeout(() => t.classList.remove("show"), 2400); }

  /* ---------- boot ---------- */
  showApp(signedIn());
})();
