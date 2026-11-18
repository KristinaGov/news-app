"use strict";

// Raise this with every change to the app. The app compares it with the copy on the
// server and offers an update when they differ.
const APP_VERSION = "2026.11.18-3";

const $ = (id) => document.getElementById(id);
const DOC_TYPES = {
  law: "Law", study: "Study", consultation: "Consultation", white_paper: "Policy paper",
  data: "Data", press_release: "Press release", news: "News", other: "Other",
};
const DEFAULT_CATS = [{ id: "eu", name: "EU" }, { id: "de", name: "Germany" }, { id: "be", name: "Belgium" }];

const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); }
    catch { return fallback; }
  },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage full or blocked */ } },
};

const state = {
  tab: store.get("tab", "today"),
  dates: [],
  date: null,
  day: null,
  minInterest: store.get("minInterest", 1),
  docType: "all",
  query: "",
  searchResults: null,
  cfg: store.get("cfg", { repo: "", token: "" }),
  votes: store.get("votes", {}),
  savedIds: store.get("savedIds", {}),
  noteMonth: isoDate(new Date()).slice(0, 7),
  notes: [],
  noteDay: null,
  noteTag: null,
  notesError: "",
  legis: null,
  latestVersion: null,
  versionChecked: 0,
  catView: store.get("catView", "news"),
  legisDone: false,
};

function isoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function safeUrl(u) { return /^https?:\/\//i.test(u || "") ? u : "#"; }
function niceDate(iso) {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}
function cats() { return state.day?.categories?.length ? state.day.categories : DEFAULT_CATS; }
function catName(id) { return cats().find((c) => c.id === id)?.name || id; }

// ---------- news data ----------

async function fetchJson(path) {
  const res = await fetch(path, { cache: "no-cache" });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json();
}

async function loadIndex() {
  try {
    state.dates = (await fetchJson("data/index.json")).dates || [];
  } catch {
    state.dates = [];
  }
  state.date = state.dates[0] || null;
}

async function loadDay() {
  state.day = null;
  if (!state.date) return;
  try { state.day = await fetchJson(`data/${state.date}.json`); }
  catch { state.day = { date: state.date, items: [], errors: ["This day could not be loaded."] }; }
}

function sortItems(items) {
  return [...items].sort((a, b) => b.interest - a.interest || (b.published || "").localeCompare(a.published || ""));
}

// ---------- rendering: shared ----------

function renderChrome() {
  const i = state.dates.indexOf(state.date);
  $("dayLabel").textContent = state.date ? niceDate(state.date) : "No briefing yet";
  $("prevDay").disabled = i < 0 || i >= state.dates.length - 1;
  $("nextDay").disabled = i <= 0;
  const tabs = [{ id: "today", name: "Today" }, ...cats(), { id: "notes", name: "Notes" }];
  if (!tabs.some((t) => t.id === state.tab)) state.tab = "today";
  $("tabs").innerHTML = tabs.map((t) =>
    `<button data-tab="${esc(t.id)}" class="${t.id === state.tab ? "on" : ""}">${esc(t.name)}</button>`).join("");

  const msgs = [];
  if (state.day?.errors?.length) msgs.push("Incomplete briefing: " + state.day.errors.join("; "));
  if (state.day && state.day.profile_set === false && state.tab !== "notes")
    msgs.push("No interest profile yet, so ratings are neutral. Fill in config/profile.md.");
  if (!navigator.onLine) msgs.push("Offline: showing the last saved copy.");
  if (updateReady()) msgs.push(`App version ${state.latestVersion} is available. Tap here to update.`);
  $("banner").hidden = !msgs.length;
  $("banner").textContent = msgs.join(" ");
}

function sourcesHtml(item) {
  return item.sources.map((s) =>
    `<a href="${esc(safeUrl(s.url))}" target="_blank" rel="noopener">${esc(s.name)}</a>`).join("");
}

function cardHtml(item, showDate) {
  const vote = state.votes[item.id];
  return `<article class="card" id="item-${esc(item.id)}">
    <h3>${esc(item.title)}</h3>
    <div class="meta">
      <span class="score s${item.interest}" title="Interest ${item.interest} of 5">${item.interest}</span>
      <span class="badge">${esc(DOC_TYPES[item.doc_type] || item.doc_type)}</span>
      ${showDate ? `<span>${esc(catName(item.category))} · ${esc(niceDate(showDate))}</span>` : ""}
      ${item.published ? `<span>Published ${esc(item.published)}</span>` : ""}
      ${item.via === "search" ? `<span>found by web search</span>` : ""}
    </div>
    <p>${esc(item.summary)}</p>
    <p class="why">Rating: ${esc(item.interest_reason)}</p>
    <div class="tags">${(item.tags || []).map((t) => "#" + esc(t)).join(" ")}</div>
    <div class="srcs">${sourcesHtml(item)}</div>
    <div class="actions">
      <button data-vote="up" data-id="${esc(item.id)}" class="${vote === "up" ? "on" : ""}" aria-label="Interesting">👍</button>
      <button data-vote="down" data-id="${esc(item.id)}" class="${vote === "down" ? "on" : ""}" aria-label="Not interesting">👎</button>
      <button class="save ${state.savedIds[item.id] ? "on" : ""}" data-save="${esc(item.id)}">${state.savedIds[item.id] ? "Saved ✓" : "Save note"}</button>
    </div>
  </article>`;
}

// ---------- rendering: tabs ----------

function renderToday() {
  if (!state.day) return `<p class="empty">No briefing has been generated yet. The daily job creates the first one.</p>`;
  if (!state.day.items.length) return `<p class="empty">No stories for this day.</p>`;
  return cats().map((c) => {
    const items = sortItems(state.day.items.filter((i) => i.category === c.id));
    const rows = items.map((i) => `<div class="headline">
        <span class="score s${i.interest}">${i.interest}</span>
        <div class="body">
          <button class="text" data-goto="${esc(i.id)}" data-cat="${esc(c.id)}">${esc(i.headline)}</button>
          <div class="srcs">${sourcesHtml(i)}</div>
        </div>
      </div>`).join("");
    return `<h2>${esc(c.name)} <span class="count">${items.length}</span></h2>${rows || `<p class="empty">Nothing new.</p>`}`;
  }).join("");
}

// EU legislation tracker: a second view inside the category it belongs to.
function hasLegis(catId) { return state.legis?.category === catId && state.legis.files?.length; }
function legisDone(f) { return /^procedure (completed|lapsed|rejected)/i.test(f.stage || ""); }
function daysAgo(iso) { return iso ? (Date.now() - new Date(iso + "T12:00:00").getTime()) / 864e5 : Infinity; }
function eventLine(label, ev) {
  return ev ? `<p class="why"><strong>${label}:</strong> ${esc(niceYear(ev.date))}, ${esc(ev.text)}</p>` : "";
}
function niceYear(iso) {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function renderLegislation() {
  const L = state.legis;
  const open = L.files.filter((f) => !legisDone(f)), done = L.files.filter(legisDone);
  const shown = state.legisDone ? done : open;
  const cards = shown.map((f) => `<article class="card">
      <h3>${esc(f.title)}</h3>
      <div class="meta">
        <span class="badge">${esc(f.stage || "Status not read yet")}</span>
        ${daysAgo(f.changed) <= 7 ? `<span class="flag">Updated ${esc(niceDate(f.changed))}</span>` : ""}
        ${daysAgo(f.first_event?.date) <= 14 ? `<span class="flag">New</span>` : ""}
      </div>
      ${eventLine("Latest step", f.last_event)}
      ${eventLine("Next", f.next)}
      <div class="tags">${esc([...(f.committees || []), ...(f.rapporteurs || [])].join(" · "))}</div>
      <div class="srcs"><a href="${esc(safeUrl(f.link))}" target="_blank" rel="noopener">${esc(f.ref)}</a></div>
    </article>`).join("");
  return `<div class="chips">
      <button class="chip ${state.legisDone ? "" : "on"}" data-legis="open">In progress ${open.length}</button>
      <button class="chip ${state.legisDone ? "on" : ""}" data-legis="done">Completed ${done.length}</button>
    </div>
    <p class="legend">Energy and environment files since 2024, from the European Parliament's Legislative Observatory.
      Updated ${esc(niceDate(L.updated))}. For background on each file, open the
      <a href="${esc(safeUrl(L.train_url))}" target="_blank" rel="noopener">Legislative Train</a>.</p>
    ${cards || `<p class="empty">Nothing here.</p>`}`;
}

function renderCategory(catId) {
  if (hasLegis(catId)) {
    const legis = state.catView === "legis";
    const views = `<div class="chips">
        <button class="chip ${legis ? "" : "on"}" data-view="news">News</button>
        <button class="chip ${legis ? "on" : ""}" data-view="legis">Legislation</button>
      </div>`;
    return views + (legis ? renderLegislation() : renderCategoryNews(catId));
  }
  return renderCategoryNews(catId);
}

function renderCategoryNews(catId) {
  const all = (state.day?.items || []).filter((i) => i.category === catId);
  const types = [...new Set(all.map((i) => i.doc_type))];
  if (state.docType !== "all" && !types.includes(state.docType)) state.docType = "all";
  const items = sortItems(all.filter((i) => i.interest >= state.minInterest &&
    (state.docType === "all" || i.doc_type === state.docType)));
  const chips = [
    ...[[1, "All ratings"], [3, "3+"], [4, "4+"]].map(([n, label]) =>
      `<button class="chip ${state.minInterest === n ? "on" : ""}" data-min="${n}">${label}</button>`),
    ...(types.length > 1 ? [["all", "All types"], ...types.map((t) => [t, DOC_TYPES[t] || t])].map(([t, label]) =>
      `<button class="chip ${state.docType === t ? "on" : ""}" data-type="${esc(t)}">${esc(label)}</button>`) : []),
  ].join("");
  return `<div class="chips">${chips}</div>` +
    (items.map((i) => cardHtml(i)).join("") || `<p class="empty">${all.length ? "Nothing matches the filters." : "Nothing new in this category."}</p>`);
}

function renderSearch() {
  if (state.searchResults === null) return `<p class="empty">Searching…</p>`;
  if (!state.searchResults.length) return `<p class="empty">No matches in the last 60 days.</p>`;
  return `<h2>${state.searchResults.length} matches</h2>` +
    state.searchResults.map(({ item, date }) => cardHtml(item, date)).join("");
}

function renderNotes() {
  if (!state.cfg.repo || !state.cfg.token)
    return `<p class="empty">Connect your private notes repository to save notes.</p>
      <p style="text-align:center"><button class="primary" data-open-settings>Open settings</button></p>`;
  const [y, m] = state.noteMonth.split("-").map(Number);
  const days = new Date(y, m, 0).getDate();
  const offset = (new Date(y, m - 1, 1).getDay() + 6) % 7; // Monday first
  const counts = {};
  state.notes.forEach((n) => { counts[n.date] = (counts[n.date] || 0) + 1; });
  const today = isoDate(new Date());
  let cells = ["M", "T", "W", "T", "F", "S", "S"].map((d) => `<div class="lbl">${d}</div>`).join("");
  cells += `<div class="cell none"></div>`.repeat(offset);
  for (let d = 1; d <= days; d++) {
    const iso = `${state.noteMonth}-${String(d).padStart(2, "0")}`;
    const n = counts[iso] || 0;
    const level = n === 0 ? "" : `l${Math.min(4, n)}`;
    cells += `<button class="cell ${level} ${iso === state.noteDay ? "sel" : ""} ${iso === today ? "today" : ""}"
      data-day="${iso}" title="${n} note${n === 1 ? "" : "s"}">${d}</button>`;
  }
  const tags = [...new Set(state.notes.flatMap((n) => n.tags || []))].sort();
  const shown = state.notes
    .filter((n) => (!state.noteDay || n.date === state.noteDay) && (!state.noteTag || (n.tags || []).includes(state.noteTag)))
    .sort((a, b) => b.date.localeCompare(a.date) || (b.created || "").localeCompare(a.created || ""));
  const monthName = new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  return `<div class="month">
      <button class="icon" data-month="-1" aria-label="Previous month">‹</button>
      <strong>${esc(monthName)}</strong>
      <button class="icon" data-month="1" aria-label="Next month">›</button>
    </div>
    <div class="heat">${cells}</div>
    <p class="legend">${state.notes.length} note${state.notes.length === 1 ? "" : "s"} this month. Darker days have more notes; tap a day to filter.</p>
    ${state.notesError ? `<p class="error">${esc(state.notesError)}</p>` : ""}
    <div class="chips">
      <button class="chip" data-new-note>＋ New note</button>
      ${tags.map((t) => `<button class="chip ${state.noteTag === t ? "on" : ""}" data-tag="${esc(t)}">#${esc(t)}</button>`).join("")}
    </div>
    ${shown.map((n) => `<article class="card note">
        <h3>${esc(n.title)}</h3>
        <div class="meta"><span>${esc(niceDate(n.date))}</span>${n.category ? `<span class="badge">${esc(catName(n.category))}</span>` : ""}</div>
        <p class="text">${esc(n.text)}</p>
        <div class="tags">${(n.tags || []).map((t) => "#" + esc(t)).join(" ")}</div>
        <div class="actions">
          ${n.url ? `<a href="${esc(safeUrl(n.url))}" target="_blank" rel="noopener">Source</a>` : ""}
          <button class="linkbtn save" data-del="${esc(n.id)}">Delete</button>
        </div>
      </article>`).join("") || `<p class="empty">No notes${state.noteDay || state.noteTag ? " match the filter" : " this month"}.</p>`}`;
}

function render() {
  renderChrome();
  let html;
  if (state.query) html = renderSearch();
  else if (state.tab === "today") html = renderToday();
  else if (state.tab === "notes") html = renderNotes();
  else html = renderCategory(state.tab);
  $("view").innerHTML = html;
}

// ---------- GitHub storage (private notes repo) ----------

function b64encode(text) {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin);
}
function b64decode(b64) {
  const bin = atob(b64.replace(/\s/g, ""));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

async function ghRequest(path, options = {}) {
  const res = await fetch(`https://api.github.com/repos/${state.cfg.repo}/contents/${path}`, {
    ...options,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${state.cfg.token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  return res;
}

async function ghRead(path, fallback) {
  const res = await ghRequest(path);
  if (res.status === 404) return { data: fallback, sha: null };
  if (res.status === 401 || res.status === 403) throw new Error("GitHub rejected the token. Check it in settings.");
  if (!res.ok) throw new Error(`GitHub error ${res.status}`);
  const body = await res.json();
  return { data: JSON.parse(b64decode(body.content)), sha: body.sha };
}

// Read, change and write a JSON file; retry once if someone else wrote in between.
async function ghUpdate(path, fallback, message, mutate) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data, sha } = await ghRead(path, fallback);
    const next = mutate(data);
    const res = await ghRequest(path, {
      method: "PUT",
      body: JSON.stringify({ message, content: b64encode(JSON.stringify(next, null, 1)), ...(sha ? { sha } : {}) }),
    });
    if (res.ok) return next;
    if (res.status !== 409 && res.status !== 422) {
      if (res.status === 401 || res.status === 403 || res.status === 404)
        throw new Error("GitHub refused the write. Check the repository name and that the token has Contents read and write access.");
      throw new Error(`GitHub error ${res.status}`);
    }
  }
  throw new Error("Could not save because the file kept changing. Try again.");
}

async function loadNotes() {
  const month = state.noteMonth;
  state.notes = store.get(`notes:${month}`, []);
  state.notesError = "";
  if (!state.cfg.repo || !state.cfg.token) return;
  try {
    const { data } = await ghRead(`notes/${month}.json`, []);
    if (month !== state.noteMonth) return;
    state.notes = data;
    store.set(`notes:${month}`, data);
  } catch (err) {
    state.notesError = navigator.onLine ? err.message : "Offline: showing notes saved on this device.";
  }
}

async function saveNote(note) {
  const month = note.date.slice(0, 7);
  const next = await ghUpdate(`notes/${month}.json`, [], `Note: ${note.title}`.slice(0, 72), (list) => [...list, note]);
  store.set(`notes:${month}`, next);
  if (note.item_id) { state.savedIds[note.item_id] = true; store.set("savedIds", state.savedIds); }
  if (month === state.noteMonth) state.notes = next;
}

async function deleteNote(id) {
  const next = await ghUpdate(`notes/${state.noteMonth}.json`, [], "Delete note", (list) => list.filter((n) => n.id !== id));
  state.notes = next;
  store.set(`notes:${state.noteMonth}`, next);
}

async function sendVote(item, vote) {
  const previous = state.votes[item.id];
  const value = previous === vote ? null : vote;
  if (value) state.votes[item.id] = value; else delete state.votes[item.id];
  store.set("votes", state.votes);
  render();
  if (!state.cfg.repo || !state.cfg.token) return;
  try {
    await ghUpdate("feedback.json", [], `Feedback: ${value || "cleared"}`, (list) => {
      const rest = list.filter((v) => v.id !== item.id);
      if (value) rest.push({ id: item.id, title: item.title, category: item.category, tags: item.tags || [], vote: value, date: isoDate(new Date()) });
      return rest.slice(-300);
    });
  } catch (err) {
    if (previous) state.votes[item.id] = previous; else delete state.votes[item.id];
    store.set("votes", state.votes);
    render();
    alert("Feedback was not saved: " + err.message);
  }
}

// ---------- search across the archive ----------

const dayCache = {};
async function runSearch() {
  const q = state.query.toLowerCase();
  state.searchResults = null;
  render();
  const dates = state.dates.slice(0, 60);
  const days = await Promise.all(dates.map(async (d) => {
    if (!dayCache[d]) { try { dayCache[d] = await fetchJson(`data/${d}.json`); } catch { dayCache[d] = { items: [] }; } }
    return dayCache[d];
  }));
  if (q !== state.query.toLowerCase()) return;
  const out = [];
  days.forEach((day, i) => day.items.forEach((item) => {
    const hay = [item.title, item.headline, item.summary, (item.tags || []).join(" "), item.sources.map((s) => s.name).join(" ")].join(" ").toLowerCase();
    if (hay.includes(q)) out.push({ item, date: dates[i] });
  }));
  state.searchResults = out;
  render();
}

function findItem(id) {
  return (state.day?.items || []).find((i) => i.id === id) ||
    (state.searchResults || []).map((r) => r.item).find((i) => i.id === id);
}

// ---------- app version ----------

function updateReady() { return Boolean(state.latestVersion && state.latestVersion !== APP_VERSION); }

// Reads the version straight from the server's copy of this file, bypassing every cache.
async function checkVersion() {
  state.versionChecked = Date.now();
  try {
    const res = await fetch(`app.js?check=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const found = (await res.text()).match(/const APP_VERSION = "([^"]+)"/);
    if (!found) throw new Error("no version found");
    state.latestVersion = found[1];
    return true;
  } catch { return false; }
}

async function updateApp() {
  try {
    if (window.caches) await Promise.all((await caches.keys()).map((k) => caches.delete(k)));
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.update();
  } catch { /* reload anyway */ }
  location.reload();
}

function versionText(ok) {
  const briefing = state.day?.generated_at
    ? ` Latest briefing: ${new Date(state.day.generated_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}.` : "";
  if (!ok) return `App version ${APP_VERSION}. Could not reach the server to check for a newer one.${briefing}`;
  return (updateReady()
    ? `App version ${APP_VERSION}. Version ${state.latestVersion} is available.`
    : `App version ${APP_VERSION}. This is the latest version.`) + briefing;
}

// ---------- dialogs ----------

let noteDraft = null;
function openNote(item) {
  noteDraft = item || null;
  $("noteTitle").value = item ? item.title : "";
  $("noteText").value = item ? item.headline : "";
  $("noteTags").value = item ? [catName(item.category).toLowerCase(), ...(item.tags || [])].join(", ") : "";
  $("noteDate").value = isoDate(new Date());
  $("noteError").hidden = true;
  $("noteDialog").showModal();
}

function openSettings() {
  $("cfgRepo").value = state.cfg.repo;
  $("cfgToken").value = state.cfg.token;
  $("cfgStatus").textContent = "";
  $("cfgVersion").textContent = `App version ${APP_VERSION}. Checking for a newer one…`;
  $("cfgUpdate").hidden = true;
  $("settingsDialog").showModal();
  checkVersion().then((ok) => {
    $("cfgVersion").textContent = versionText(ok);
    $("cfgUpdate").hidden = !updateReady();
    renderChrome();
  });
}

function readSettingsForm() {
  state.cfg = { repo: $("cfgRepo").value.trim().replace(/^https:\/\/github\.com\//, "").replace(/\/$/, ""), token: $("cfgToken").value.trim() };
  store.set("cfg", state.cfg);
}

// ---------- events ----------

async function changeDay(step) {
  const i = state.dates.indexOf(state.date) + step;
  if (i < 0 || i >= state.dates.length) return;
  state.date = state.dates[i];
  await loadDay();
  render();
  window.scrollTo(0, 0);
}

async function switchTab(tab) {
  state.tab = tab;
  state.docType = "all";
  store.set("tab", tab);
  if (state.query) { state.query = ""; $("searchInput").value = ""; $("searchBar").hidden = true; }
  render();
  window.scrollTo(0, 0);
  if (tab === "notes") { await loadNotes(); render(); }
}

document.addEventListener("click", async (e) => {
  const t = e.target.closest("button, [data-open-settings]");
  if (!t) return;
  const d = t.dataset;
  if (d.tab) return switchTab(d.tab);
  if (d.goto) {
    await switchTab(d.cat);
    state.minInterest = 1; state.catView = "news"; render();
    const el = $("item-" + d.goto);
    if (el) { el.scrollIntoView({ block: "start" }); el.classList.add("flash"); setTimeout(() => el.classList.remove("flash"), 1500); }
    return;
  }
  if (d.view) { state.catView = d.view; store.set("catView", d.view); render(); return window.scrollTo(0, 0); }
  if (d.legis) { state.legisDone = d.legis === "done"; return render(); }
  if (d.min) { state.minInterest = Number(d.min); store.set("minInterest", state.minInterest); return render(); }
  if (d.type) { state.docType = d.type; return render(); }
  if (d.vote) { const item = findItem(d.id); if (item) sendVote(item, d.vote); return; }
  if (d.save) {
    if (!state.cfg.repo || !state.cfg.token) return openSettings();
    const item = findItem(d.save); if (item) openNote(item); return;
  }
  if ("newNote" in d) return openNote(null);
  if ("openSettings" in d) return openSettings();
  if (d.day) { state.noteDay = state.noteDay === d.day ? null : d.day; return render(); }
  if (d.tag) { state.noteTag = state.noteTag === d.tag ? null : d.tag; return render(); }
  if (d.month) {
    const [y, m] = state.noteMonth.split("-").map(Number);
    state.noteMonth = isoDate(new Date(y, m - 1 + Number(d.month), 1)).slice(0, 7);
    state.noteDay = null; state.noteTag = null;
    await loadNotes(); return render();
  }
  if (d.del) {
    if (!confirm("Delete this note?")) return;
    try { await deleteNote(d.del); } catch (err) { alert(err.message); }
    return render();
  }
});

$("prevDay").onclick = () => changeDay(1);
$("nextDay").onclick = () => changeDay(-1);
$("dayLabel").onclick = async () => { if (state.dates[0] && state.date !== state.dates[0]) { state.date = state.dates[0]; await loadDay(); render(); } };
$("settingsBtn").onclick = openSettings;
$("searchBtn").onclick = () => {
  const bar = $("searchBar");
  bar.hidden = !bar.hidden;
  if (bar.hidden) { state.query = ""; $("searchInput").value = ""; render(); } else $("searchInput").focus();
};
let searchTimer;
$("searchInput").oninput = (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    state.query = e.target.value.trim();
    if (state.query.length >= 2) runSearch(); else { state.query = ""; render(); }
  }, 300);
};

$("noteCancel").onclick = () => $("noteDialog").close();
$("noteForm").onsubmit = async (e) => {
  e.preventDefault();
  const note = {
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    date: $("noteDate").value,
    title: $("noteTitle").value.trim(),
    text: $("noteText").value.trim(),
    tags: [...new Set($("noteTags").value.split(",").map((t) => t.trim().toLowerCase().replace(/^#/, "")).filter(Boolean))],
    url: noteDraft ? noteDraft.sources[0]?.url || "" : "",
    category: noteDraft ? noteDraft.category : "",
    item_id: noteDraft ? noteDraft.id : "",
    created: new Date().toISOString(),
  };
  const btn = e.target.querySelector(".primary");
  btn.disabled = true;
  try {
    await saveNote(note);
    $("noteDialog").close();
    render();
  } catch (err) {
    $("noteError").textContent = err.message;
    $("noteError").hidden = false;
  } finally { btn.disabled = false; }
};

$("cfgTest").onclick = async () => {
  readSettingsForm();
  $("cfgStatus").textContent = "Testing…";
  try {
    const res = await fetch(`https://api.github.com/repos/${state.cfg.repo}`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${state.cfg.token}`, Accept: "application/vnd.github+json" },
    });
    if (!res.ok) throw new Error(res.status === 404 ? "Repository not found, or the token has no access to it." : `GitHub answered ${res.status}.`);
    const repo = await res.json();
    $("cfgStatus").textContent = `Connected to ${repo.full_name} (${repo.private ? "private" : "PUBLIC: your notes would be visible to anyone"}).` +
      (repo.permissions?.push ? "" : " Warning: this token cannot write.");
  } catch (err) { $("cfgStatus").textContent = err.message; }
};
$("settingsForm").onsubmit = async (e) => {
  e.preventDefault();
  readSettingsForm();
  $("settingsDialog").close();
  if (state.tab === "notes") await loadNotes();
  render();
};

$("cfgUpdate").onclick = updateApp;
$("banner").onclick = () => { if (updateReady()) updateApp(); };
// Re-check when the app comes back to the foreground, at most every 10 minutes.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && Date.now() - state.versionChecked > 600000)
    checkVersion().then(renderChrome);
});

window.addEventListener("online", render);
window.addEventListener("offline", render);

// ---------- start ----------

(async function start() {
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
  await loadIndex();
  await loadDay();
  render();
  checkVersion().then(renderChrome);
  try { state.legis = await fetchJson("data/legislation.json"); render(); } catch { /* no tracker data yet */ }
  if (state.tab === "notes") { await loadNotes(); render(); }
})();
