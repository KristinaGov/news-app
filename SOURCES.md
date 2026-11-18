# Sources

Every source considered for the briefing and how it is collected. Checked on 2026-11-18.
The working list the daily job reads is `config/feeds.yaml`; change it there, then update
this page.

- **RSS**: read directly from the source's feed every day. No AI is used to collect it.
- **RSS, filtered**: a broad feed. Only entries matching the category keywords are kept,
  again without AI.
- **AI search**: the source has no usable feed, so a model runs a web search limited to
  that source's own website. Each search costs a fee (about $0.007). It runs on Monday,
  Wednesday and Friday only, looking back three days, with a cap on searches per category
  (EU 1, Germany 2, Belgium 3).
- **Data export**: read from an official data export every day. No AI is used.

Totals: 24 sources by RSS, 8 by AI search, 1 by data export.

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
| Commission "Have your say" consultations | AI search | No feed exists |
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
| heise, energy topic | RSS, filtered | |
| Federal Ministry for Economic Affairs and Energy | AI search | No working feed found |
| Agora Energiewende | AI search | No feed found |

## Belgium

| Source | Collected by | Notes |
|---|---|---|
| De Tijd, energy section | RSS | Dutch. Partly paywalled. Was AI search before |
| L'Echo, energy section | RSS | French. Partly paywalled. Was AI search before |
| VRT NWS (English) | RSS, filtered | |
| VRT NWS (Dutch) | RSS, filtered | |
| RTBF Info | RSS, filtered | French. Was AI search before |
| CREG (federal energy regulator) | AI search | No feed found |
| Elia (transmission system operator) | AI search | Site refuses automated readers |
| Vlaamse Nutsregulator (formerly VREG) | AI search | No feed found |
| FPS Economy, energy pages | AI search | A feed address exists but is empty |
| The Brussels Times | AI search | No feed found |

## Considered and left out

| Source | Why |
|---|---|
| EUR-Lex, all Parliament and Council legislation (feed) | Overlaps with the Official Journal L feed |
| EUR-Lex, Official Journal C series (feed) | Notices and information; high volume, little policy content |
| ENTSO-E position papers (feed) | Rarely updated; main news feed carries the announcements |
| Council of the EU press releases (feed) | Works, but mostly foreign affairs; add if wanted |
| European Parliament ITRE and ENVI committees | Feeds refuse automated readers |
| European Parliament open data API | Works, but gives no titles or status for procedures |
| Bundesnetzagentur EEG and gas feeds | 100 to 200 undated entries of auction dates and routine notices |
| Bundesregierung news (feed) | General government news, little energy content |
| De Tijd, Belgian politics (feed) | General politics; energy stories already come from the energy section |
| Fluxys, FEBEG, EnergyVille, BDEW, DIW, dena | No feed found; not worth an AI search each |
| Search topics "EU ETS prices and reforms" and "Belgian energy policy decisions" | Removed to save AI searches; the feeds above cover them |

## Adding a source

1. Look for a feed first (often `/rss`, `/feed`, or a link in the page footer) and add it
   under `feeds:` in `config/feeds.yaml`. Add `keywords: true` if the feed is not
   energy-specific.
2. Only if there is no feed, add it under `search_sources:` with its website domain and
   raise `max_searches` for that category by one at most.

## AI models

Set in `config/feeds.yaml` under `models:`, by their OpenRouter names. Chosen on
2026-11-18 from OpenRouter's price list, among models that support what the job needs.
The choice rests on price and listed features; no quality comparison was run.

| Task | First choice | Fallback | Price of first choice per million tokens |
|---|---|---|---|
| Summaries | DeepSeek V4.1 Flash | GPT-6 Luna | $0.05 in, $0.20 out |
| Web search | GPT-6 Luna | Claude Haiku 5.5 | $0.10 in, $0.50 out |
