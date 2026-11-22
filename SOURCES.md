# Sources

Every source considered for the briefing and how it is collected. Checked on 2026-11-18.
The working list the daily job reads is `config/feeds.yaml`; change it there, then update
this page.

- **RSS**: read directly from the source's feed every day. No AI is used to collect it.
- **RSS, filtered**: a broad feed. Only entries matching the category keywords are kept,
  again without AI.
- **News page**: the source has no feed, so the job reads its news page every day and
  picks up links it has not seen before. No AI is used.
- **Data export**: read from an official data export every day. No AI is used.
- **AI search**: not tied to a source. On Monday and Thursday a model runs a few web
  searches on set topics (EU 5, Germany 2, Belgium 2) to catch stories the sources below
  missed, from any publisher. Each search costs about $0.007. The topics are in
  `config/feeds.yaml` under `search_topics`; each day's file records what the searches
  returned (`search_log`).

Totals: 34 sources by RSS, 5 news pages, 1 data export, plus 9 topic searches twice a week.

## EU

| Source | Collected by | Notes |
|---|---|---|
| European Commission, DG Energy | RSS | |
| European Commission, DG Climate Action | RSS | Covers EU ETS and CBAM announcements |
| European Commission, DG Environment | RSS | Feed found on 2026-11-18; was AI search before |
| European Commission, Joint Research Centre | RSS, filtered | |
| European Commission, Press Corner | RSS, filtered | |
| EUR-Lex, Official Journal L series (adopted acts) | RSS, filtered | Titles only. Was AI search before |
| EUR-Lex, Commission proposals | RSS, filtered | Titles only, no dates in the feed |
| European Environment Agency | RSS | Was AI search before |
| ACER | RSS | No dates in the feed |
| ENTSO-E | RSS | Was AI search before |
| Carbon Pulse | RSS | Paywalled: headlines only |
| Euractiv | RSS, filtered | Whole-site feed; the energy section feed refuses automated readers. Was AI search before |
| Council of the EU, press releases | RSS, filtered | Added 2026-11-22 |
| Politico Europe, energy section | RSS | Added 2026-11-22. Partly paywalled |
| E3G (think tank) | RSS, filtered | Added 2026-11-22 |
| Florence School of Regulation | RSS, filtered | Added 2026-11-22 |
| Sandbag (think tank, ETS and CBAM) | RSS | Added 2026-11-22 |
| European Parliament Legislative Observatory | Data export | Feeds the Legislation view in the EU tab: status, latest step and next date of each energy and environment file opened since 2024 |
| European Parliament Legislative Train | Not read | The site refuses automated readers. The Observatory above holds the same procedures; the app links to the Train for background |

## Germany

| Source | Collected by | Notes |
|---|---|---|
| Clean Energy Wire | RSS | |
| pv magazine Deutschland | RSS | |
| Umweltbundesamt | RSS | |
| Federal Environment Ministry | RSS | Was AI search before |
| Bundesnetzagentur, press releases | RSS, filtered | Also covers telecoms and post, hence the filter. No dates in the feed. Was AI search before |
| tagesschau, energy section | RSS | |
| Tagesspiegel, business and politics sections | RSS, filtered | Added 2026-11-22. No energy-only feed exists |
| heise, energy topic | RSS, filtered | |
| Handelsblatt, energy section | RSS | Added 2026-11-22. Partly paywalled |
| Spiegel, Energiewende topic | RSS | Added 2026-11-22 |
| FAZ, climate, energy and environment | RSS | Added 2026-11-22. Partly paywalled |
| Agora Energiewende, news and publications | News page | Was AI search before |

## Belgium

| Source | Collected by | Notes |
|---|---|---|
| De Tijd, energy section | RSS | Dutch. Partly paywalled. Was AI search before |
| L'Echo, energy section | RSS | French. Partly paywalled. Was AI search before |
| VRT NWS (English) | RSS, filtered | |
| VRT NWS (Dutch) | RSS, filtered | |
| RTBF Info | RSS, filtered | French. Was AI search before |
| Knack | RSS, filtered | Dutch. Added 2026-11-22 |
| CREG (federal energy regulator), news and publications | News page | Was AI search before |
| FPS Economy, news | News page, filtered | Was AI search before |

## Considered and left out

| Source | Why |
|---|---|
| EUR-Lex, all Parliament and Council legislation (feed) | Overlaps with the Official Journal L feed |
| EUR-Lex, Official Journal C series (feed) | Notices and information; high volume, little policy content |
| ENTSO-E position papers (feed) | Rarely updated; main news feed carries the announcements |
| European Parliament ITRE and ENVI committees | Feeds refuse automated readers |
| European Parliament open data API | Works, but gives no titles or status for procedures |
| Bundesnetzagentur EEG and gas feeds | 100 to 200 undated entries of auction dates and routine notices |
| Bundesregierung news (feed) | General government news, little energy content |
| De Tijd, Belgian politics (feed) | General politics; energy stories already come from the energy section |
| Fluxys, FEBEG, EnergyVille, BDEW, DIW, dena | No feed found; not worth an AI search each |
| Search topics "EU ETS prices and reforms" and "Belgian energy policy decisions" | Removed to save AI searches; the feeds above cover them |

| Tagesspiegel Background (Energie & Klima) | Subscriber-only and closed to automated readers; cannot be read by the job |

| Commission "Have your say" consultations | No feed, and the page cannot be read without a browser |
| Federal Ministry for Economic Affairs and Energy (DE) | No feed, and the press page cannot be read without a browser. Its announcements reach the briefing through the German press feeds and the Germany search topic |
| Elia | Site refuses automated readers. Covered by a Belgium search topic |
| Vlaamse Nutsregulator, The Brussels Times | No feed, and their news pages cannot be read without a browser |
| Financial Times and Guardian energy feeds, Energy Monitor, IEA | Work, but global rather than European; add if wanted |
| WindEurope, Hydrogen Europe | Work, but mostly industry announcements |
| Bruegel, Ember, CEPS, Montel, Reuters, Energy Post | No working feed, stale feed, or refuses automated readers |

## Adding a source

1. Look for a feed first (often `/rss`, `/feed`, or a link in the page footer) and add it
   under `feeds:` in `config/feeds.yaml`. Add `keywords: true` if the feed is not
   energy-specific.
2. If there is no feed but the site has a plain news page, add it under `pages:` with
   the pattern its news links follow.

## AI models

Set in `config/feeds.yaml` under `models:`, by their OpenRouter names. Chosen on
2026-11-18 from OpenRouter's price list, among models that support what the job needs.
The choice rests on price and listed features; no quality comparison was run.

| Task | First choice | Fallback | Price of first choice per million tokens |
|---|---|---|---|
| Summaries | Claude Haiku 5.5 | GPT-6 Luna | $0.10 in, $0.50 out |
| Web search | GPT-6 Luna | Claude Haiku 5.5 | $0.10 in, $0.50 out |
