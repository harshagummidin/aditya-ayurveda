# Aditya Multi Speciality Ayurvedic Hospital — website demo

Static website for Aditya Ayurvedic Hospital, Rajahmundry: portfolio of the hospital and its two
physicians (Dr. Suri Raghuram and Dr. Suri Usha), online appointment booking, and a staff console
with appointment approval and website analytics.

No build step, no server. Plain HTML, CSS and JavaScript, so it runs on GitHub Pages as is.

## Deploy to GitHub Pages

1. Create a new repository on GitHub (for example `aditya-ayurveda`).
2. Upload every file and folder in this directory to the repository root
   (`index.html`, `admin.html`, `css/`, `js/`, `assets/`, `.nojekyll`, `README.md`).
3. In the repository go to **Settings → Pages**, set **Source** to *Deploy from a branch*,
   pick branch `main` and folder `/ (root)`, and save.
4. After a minute the site is live at `https://<username>.github.io/aditya-ayurveda/`.
   The staff console is at `.../aditya-ayurveda/admin.html`.

All links are relative, so the site also works from any sub-folder or a custom domain.

## Staff console

- URL: `admin.html` (also linked as "Staff login" in the website footer).
- Demo login: username `admin`, password `aditya@2026`.
- To change the password, compute the SHA-256 hex of the new password
  (`printf 'newpass' | sha256sum` on Linux/Mac, or any online SHA-256 tool) and put it in
  `js/config.js` under `admin.passwordHash`.

The console shows: today's schedule and new requests, the full appointment list with
approve / reject / complete / no-show and CSV export, analytics (visits, sources, devices,
sections read, booking funnel, bookings by physician and reason, busiest hours, popular slots,
contact taps) and an availability screen (days, timings, slot length, fee, blocked dates).

## How the demo stores data

Bookings, analytics events and availability settings are stored in the browser's
`localStorage` (see `js/store.js`). That is enough to demonstrate the full flow on one laptop:
book on the website in one tab, approve it in the staff console in another tab.

On first load the store seeds five weeks of realistic sample data so the console looks alive.
Use **Reset demo data** in the console sidebar to start over.

To make bookings visible across devices for real use, implement the six methods of the store
adapter in `js/store.js` against a backend (Supabase, Firebase or a small Node API) and swap the
adapter at the bottom of the file. The pages do not need to change.

## Editing content

Everything factual lives in `js/config.js`: hospital details, phones, address, each doctor's
qualifications, domains of research and treatment, departments, Panchakarma therapies,
Aditya Herbals product lines, testimonials, consultation timings and fee.

Photos are in `assets/`. Replace `dr-usha.png` and `dr-raghuram.png` with higher-resolution
portraits when available; the layout crops to a portrait arch automatically.

## Files

```
index.html          public website
admin.html          staff console
css/site.css        design tokens and public styles (light + dark)
css/admin.css       console layout
js/config.js        all editable content
js/store.js         data layer (localStorage) + demo seed
js/track.js         first-party analytics events
js/site.js          public page behaviour and booking form
js/admin.js         console behaviour and charts (Chart.js from cdnjs)
assets/             logo, photos, therapy images
.nojekyll           tells GitHub Pages to serve files as they are
```
