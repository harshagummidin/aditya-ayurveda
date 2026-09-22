/* ------------------------------------------------------------------
   Data layer. Everything the site remembers goes through AD_STORE.

   Backed by localStorage today, which is enough for a demo on one
   browser. To go live across devices, implement the same methods
   (listAppointments, saveAppointment, listEvents, logEvent,
   getSettings, saveSettings) against Supabase, Firebase or a Node
   API and swap the adapter at the bottom of this file.
   ------------------------------------------------------------------ */
(function () {
  const KEYS = {
    appts: "ad_appointments",
    events: "ad_events",
    settings: "ad_settings",
    seeded: "ad_seeded_v1"
  };
  const MAX_EVENTS = 6000;

  function read(key, fallback) {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
    catch (e) { return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage blocked: page still works */ }
  }

  const pad = (n) => String(n).padStart(2, "0");
  function isoDate(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function makeId(dateStr, rnd) {
    const r = rnd ? rnd() : Math.random();
    return "AD-" + dateStr.replace(/-/g, "").slice(2) + "-" + Math.floor(r * 9000 + 1000);
  }

  const LocalStore = {
    /* Appointments ------------------------------------------------ */
    listAppointments() { return read(KEYS.appts, []); },
    getAppointment(id) { return this.listAppointments().find((a) => a.id === id) || null; },
    findByMobile(mobile) {
      return this.listAppointments().filter((a) => a.mobile === mobile)
        .sort((a, b) => (a.date + a.time < b.date + b.time ? 1 : -1));
    },
    saveAppointment(appt) {
      const list = this.listAppointments();
      const i = list.findIndex((a) => a.id === appt.id);
      if (i >= 0) list[i] = appt; else list.push(appt);
      write(KEYS.appts, list);
      return appt;
    },
    createAppointment(input) {
      const now = new Date().toISOString();
      return this.saveAppointment({
        id: makeId(input.date),
        name: input.name, mobile: input.mobile, age: input.age, gender: input.gender,
        doctor: input.doctor, mode: input.mode, visitType: input.visitType,
        date: input.date, time: input.time, note: input.note || "",
        status: "pending", adminNote: "", createdAt: now, updatedAt: now, source: input.source || "website"
      });
    },
    updateStatus(id, status, adminNote) {
      const appt = this.getAppointment(id);
      if (!appt) return null;
      appt.status = status;
      if (typeof adminNote === "string") appt.adminNote = adminNote;
      appt.updatedAt = new Date().toISOString();
      return this.saveAppointment(appt);
    },
    /* slots already taken for a doctor on a date */
    bookedSlots(date, doctor) {
      return this.listAppointments()
        .filter((a) => a.date === date && (!doctor || a.doctor === doctor) && a.status !== "rejected" && a.status !== "cancelled")
        .map((a) => a.time);
    },

    /* Analytics events ------------------------------------------- */
    listEvents() { return read(KEYS.events, []); },
    logEvent(evt) {
      const list = this.listEvents();
      list.push(evt);
      if (list.length > MAX_EVENTS) list.splice(0, list.length - MAX_EVENTS);
      write(KEYS.events, list);
    },

    /* Settings ---------------------------------------------------- */
    getSettings() {
      const base = JSON.parse(JSON.stringify(window.AD_CONFIG.schedule));
      return Object.assign(base, read(KEYS.settings, {}));
    },
    saveSettings(partial) {
      const merged = Object.assign(this.getSettings(), partial);
      write(KEYS.settings, merged);
      return merged;
    },

    /* Demo data --------------------------------------------------- */
    isSeeded() { return !!read(KEYS.seeded, false); },
    resetAll() { Object.values(KEYS).forEach((k) => localStorage.removeItem(k)); },
    seedDemo(force) {
      if (this.isSeeded() && !force) return;
      this.resetAll();
      seed(this);
      write(KEYS.seeded, true);
    }
  };

  /* ---------------- Seed: 35 days of realistic demo data --------------- */
  function seed(store) {
    const C = window.AD_CONFIG;
    const rnd = mulberry32(20260922);
    const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
    const names = [
      "S Suneetha", "T Manchireddy", "Subhash Naidu", "B Purnachandra Rao", "Aparna Jain", "K Vineetha",
      "P Lakshmi Prasanna", "M Venkata Ramana", "G Swapna", "R Satyanarayana", "N Kavitha", "A Durga Prasad",
      "Y Sravani", "K Suresh Babu", "P Annapurna", "M Hari Krishna", "V Sailaja", "G Ramesh",
      "B Bhavani", "S Naga Raju", "C Manjula", "K Chandra Sekhar", "T Jyothi", "D Mohan Rao"
    ];
    const notes = [
      "Trying to conceive for 3 years, low AMH", "PCOD, irregular periods", "Psoriasis on elbows since 2 years",
      "Knee pain, told to get replacement", "Back pain, sciatica", "Acne and pigmentation", "Hair fall after delivery",
      "Panchakarma course for stress", "Piles, avoiding surgery", "Migraine twice a week", "", "", "Follow-up after 30 days"
    ];
    const sources = ["direct", "google", "whatsapp", "youtube", "facebook", "direct", "google", "google", "instagram"];
    const devices = ["mobile", "mobile", "mobile", "desktop", "tablet"];
    const sections = ["hero", "doctors", "treatments", "womens", "panchakarma", "hospital", "reviews", "visit", "book"];

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const settings = store.getSettings();
    const slots = buildSlots(settings);

    /* events */
    for (let d = 34; d >= 0; d--) {
      const day = new Date(today); day.setDate(today.getDate() - d);
      const dow = day.getDay();
      let visits = 18 + Math.floor(rnd() * 14) + (dow === 0 ? -7 : 0) + (dow === 1 ? 6 : 0);
      if (d < 7) visits += 7;
      for (let v = 0; v < visits; v++) {
        const ts = new Date(day); ts.setHours(weightedHour(rnd), Math.floor(rnd() * 60), 0, 0);
        const sid = "s" + d + "_" + v;
        store.logEvent({ t: "pageview", ts: ts.toISOString(), sid, page: "home", source: pick(sources), device: pick(devices) });
        const depth = 1 + Math.floor(rnd() * sections.length);
        for (let s = 0; s < depth; s++) store.logEvent({ t: "section", ts: ts.toISOString(), sid, name: sections[s] });
        if (depth >= 8 && rnd() < 0.55) {
          store.logEvent({ t: "booking_started", ts: ts.toISOString(), sid });
          if (rnd() < 0.6) store.logEvent({ t: "booking_submitted", ts: ts.toISOString(), sid });
        }
        if (rnd() < 0.14) store.logEvent({ t: "cta", ts: ts.toISOString(), sid, name: pick(["call", "whatsapp", "directions", "youtube"]) });
      }
    }

    /* appointments: past 20 days + next 6 days */
    const statusesPast = ["completed", "completed", "completed", "completed", "no_show", "rejected"];
    for (let d = -20; d <= 6; d++) {
      const day = new Date(today); day.setDate(today.getDate() + d);
      if (!settings.days.includes(day.getDay())) continue;
      const count = d < 0 ? 4 + Math.floor(rnd() * 5) : d === 0 ? 6 : 1 + Math.floor(rnd() * 4);
      const used = new Set();
      for (let i = 0; i < count; i++) {
        const doctor = pick(["raghuram", "raghuram", "usha", "usha", "raghuram"]);
        let time = pick(slots), guard = 0;
        while (used.has(doctor + time) && guard++ < 30) time = pick(slots);
        used.add(doctor + time);
        const created = new Date(day);
        created.setDate(created.getDate() - (1 + Math.floor(rnd() * 4)));
        created.setHours(9 + Math.floor(rnd() * 11), Math.floor(rnd() * 60));
        let status;
        if (d < 0) status = pick(statusesPast);
        else if (d === 0) status = pick(["approved", "approved", "pending", "completed"]);
        else status = pick(["pending", "pending", "approved"]);
        const gender = doctor === "usha" ? pick(["Female", "Female", "Female", "Male"]) : pick(["Male", "Female", "Male"]);
        store.saveAppointment({
          id: makeId(isoDate(day), rnd),
          name: pick(names),
          mobile: "9" + String(Math.floor(rnd() * 900000000 + 100000000)),
          age: 20 + Math.floor(rnd() * 50), gender, doctor,
          mode: pick(C.modes.concat([C.modes[0], C.modes[0]])),
          visitType: pick(C.visitTypes),
          date: isoDate(day), time,
          note: pick(notes), status,
          adminNote: status === "rejected" ? "Doctor at a conference, asked to rebook" : "",
          createdAt: created.toISOString(), updatedAt: created.toISOString(),
          source: pick(["website", "website", "website", "phone"])
        });
      }
    }
  }

  function weightedHour(rnd) {
    const r = rnd();
    if (r < 0.35) return 8 + Math.floor(rnd() * 5);
    if (r < 0.55) return 13 + Math.floor(rnd() * 4);
    if (r < 0.92) return 17 + Math.floor(rnd() * 5);
    return Math.floor(rnd() * 8);
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* Slot helper shared by site and admin */
  function buildSlots(settings) {
    const out = [];
    settings.windows.forEach((w) => {
      let [h, m] = w.start.split(":").map(Number);
      const [eh, em] = w.end.split(":").map(Number);
      while (h * 60 + m < eh * 60 + em) {
        out.push(pad(h) + ":" + pad(m));
        m += settings.slotMinutes;
        if (m >= 60) { h += Math.floor(m / 60); m = m % 60; }
      }
    });
    return out;
  }

  window.AD_STORE = LocalStore;
  window.AD_UTIL = {
    buildSlots, isoDate, pad,
    fmtDate(iso) { if (!iso) return ""; const [y, m, d] = iso.split("-"); return d + "-" + m + "-" + y; },
    fmtDateLong(iso) {
      return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
    },
    fmtTime(hhmm) {
      const [h, m] = hhmm.split(":").map(Number);
      return (h % 12 === 0 ? 12 : h % 12) + ":" + pad(m) + " " + (h >= 12 ? "PM" : "AM");
    },
    doctorName(id) {
      const d = window.AD_CONFIG.doctors.find((x) => x.id === id);
      return d ? d.shortName : id === "any" ? "Either doctor" : id || "";
    }
  };

  LocalStore.seedDemo(false);
})();
