/* ------------------------------------------------------------------
   First-party analytics for the public page. Records one pageview per
   visit (source + device), sections seen, booking funnel steps and
   contact taps. Nothing leaves the browser; admin reads the same store.
   ------------------------------------------------------------------ */
(function () {
  const store = window.AD_STORE;
  if (!store) return;

  const sid = (function () {
    try {
      let s = sessionStorage.getItem("ad_sid");
      if (!s) { s = "v" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); sessionStorage.setItem("ad_sid", s); }
      return s;
    } catch (e) { return "v" + Date.now().toString(36); }
  })();

  function source() {
    const p = new URLSearchParams(location.search);
    const utm = (p.get("utm_source") || p.get("src") || "").toLowerCase();
    if (utm) return utm;
    const ref = (document.referrer || "").toLowerCase();
    if (!ref) return "direct";
    if (ref.includes("google.")) return "google";
    if (ref.includes("youtube") || ref.includes("youtu.be")) return "youtube";
    if (ref.includes("whatsapp") || ref.includes("wa.me")) return "whatsapp";
    if (ref.includes("instagram")) return "instagram";
    if (ref.includes("facebook") || ref.includes("fb.com")) return "facebook";
    if (ref.includes("practo") || ref.includes("justdial")) return "listing";
    if (ref.includes(location.hostname)) return "direct";
    return "other";
  }
  function device() {
    const w = Math.min(screen.width, window.innerWidth || screen.width);
    return w < 700 ? "mobile" : w < 1100 ? "tablet" : "desktop";
  }

  const seen = new Set();
  function once(key, evt) {
    if (seen.has(key)) return;
    seen.add(key);
    store.logEvent(Object.assign({ ts: new Date().toISOString(), sid }, evt));
  }

  window.AD_TRACK = {
    pageview(page) { once("pv:" + page, { t: "pageview", page, source: source(), device: device() }); },
    section(name) { once("sec:" + name, { t: "section", name }); },
    bookingStarted() { once("bstart", { t: "booking_started" }); },
    bookingSubmitted(doctor) { store.logEvent({ t: "booking_submitted", ts: new Date().toISOString(), sid, doctor }); },
    cta(name) { store.logEvent({ t: "cta", ts: new Date().toISOString(), sid, name }); },
    observeSections(selector) {
      const els = document.querySelectorAll(selector);
      if (!("IntersectionObserver" in window)) { els.forEach((el) => this.section(el.id)); return; }
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => { if (en.isIntersecting && en.intersectionRatio >= 0.3) window.AD_TRACK.section(en.target.id); });
      }, { threshold: [0.3] });
      els.forEach((el) => io.observe(el));
    }
  };
})();
