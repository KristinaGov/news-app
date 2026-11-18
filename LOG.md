# Project log

Running record of where the Energy Briefing project stands. Newest entry first.
Read this at the start of a session; add an entry at the end.

## 2026-11-18 (night): OpenRouter models, legislation tracker

User asked for (1) the best-fitting OpenRouter models, not necessarily Claude, and (2) a
legislation overview from the Legislative Train in the EU tab. This supersedes the model
details in the two entries below. The user then said "push when ready".

- AI layer rewritten to call OpenRouter's chat completions API directly (no SDK;
  `requirements.txt` is now feedparser + pyyaml). OpenRouter key only, read from the
  secret `API`. Models live in `config/feeds.yaml` under `models:`, with a fallback each:
  summaries `deepseek/deepseek-v4.1-flash` then `openai/gpt-6-luna`; search
  `openai/gpt-6-luna` then `anthropic/claude-haiku-5.5`. Picked from OpenRouter's live
  price list by price and listed features; **no quality test was run**.
- Search now uses OpenRouter's `openrouter:web_search` tool with the Exa engine,
  restricted to each source's own domain, 600 characters per result ($0.007 per search).
- The model no longer sees or writes URLs: it cites candidates by number and the script
  attaches the links. Saves tokens and makes invented links impossible.
- Legislative Train (europarl.europa.eu/legislative-train) answers 403 to automated
  readers, so it is not read. The tracker uses the Parliament's Legislative Observatory
  (OEIL) XML export plus each file's page: COD procedures since 2024 whose title matches
  keywords (38 files on 2026-11-18). Saved to `docs/data/legislation.json`; at most 40
  status lookups per run, 2 seconds apart, unfinished files rechecked every 3 days.
- App: EU tab has a News / Legislation switch; Legislation lists files in progress or
  completed with stage, latest step, next date, committee, rapporteur and a link.
- Verified locally: end-to-end run with real feeds and real Observatory data but
  **simulated AI answers** (fallback, link checks, search parsing all behaved); app code
  parses and renders both views. Not verified before pushing: any real OpenRouter call,
  and the app on a phone.
- README: the "How it works" and "Setup" sections were removed from the file on disk
  during the session (not by Claude); left as found, only the stale lines were corrected.
- Estimated cost once running: under $1 a month, most of it search fees. Real figures
  are in each day file's `usage`.

## 2026-11-18 (evening): token use cut down, sources moved to RSS

The user's priority: **minimise token use**. RSS wherever possible, AI search only for
sources with no feed. All changes below are local, **not committed or pushed**.

- Probed every search-only source for a feed. Moved 11 to RSS: DG Environment, EUR-Lex
  (OJ L and Commission proposals), EEA, ENTSO-E, Euractiv, Federal Environment Ministry,
  Bundesnetzagentur, De Tijd Energie, L'Echo Énergie, RTBF. Now 24 RSS sources, 8 by AI
  search. Full list with reasons in `SOURCES.md` (new file, requested by the user).
- Still AI search (no usable feed): Have your say, BMWE, Agora Energiewende, CREG, Elia,
  Vlaamse Nutsregulator, FPS Economy, Brussels Times. Elia, Europarl and the Euractiv
  section feed answer 403 to automated readers; left as is, not worked around.
- Script: AI search only Mon/Wed/Fri with a 3-day lookback (`search:` in feeds.yaml), caps
  1/2/3 searches per category (was 6/5/6 daily), search topics removed. Summaries on
  `claude-haiku-5-5` (was opus), search on `claude-sonnet-5-5`. Shorter summaries,
  fewer candidates (8 per feed, 40 per category, 350 characters each). Token and search
  counts are logged and stored in each day file under `usage`.
- Script fixes found while testing feeds: relative links (ENTSO-E) are resolved; feeds
  without dates (EUR-Lex proposals, ACER, Bundesnetzagentur) are only remembered on first
  read, so old entries are not sent to the model.
- Verified: a dry run of the feed reader (no AI) parsed all 24 feeds with no errors and
  gave 46 candidates, about 5,000 tokens of input for the day. Not verified: any AI call.
- Local Python cannot run the script directly (3.9, broken SSL certificates); the dry run
  used a throwaway venv with curl for downloads.
- Next: get the user's go-ahead to commit and push (the push starts a test run), then
  watch the run and read `usage` in the day file.

## 2026-11-18 (later): switching to an OpenRouter key

- The user added an API secret to the repo, holding an **OpenRouter** key, not an
  Anthropic one. The secret is named `API` (confirmed by the user); the workflow reads it as
  `secrets.API`.
- The user could not find the Actions tab / "Run workflow" on GitHub. Direct links:
  https://github.com/KristinaGov/news-app/actions and
  https://github.com/KristinaGov/news-app/actions/workflows/daily.yml
  (the button only shows when signed in as the repo owner). No new run was started.
- Local changes, **not yet committed or pushed** (waiting for the user's go-ahead):
  - `scripts/build_briefing.py`: `make_client()` detects an `sk-or-` key and sends
    requests to OpenRouter's Anthropic-compatible endpoint (`https://openrouter.ai/api`,
    key as Bearer token, model `anthropic/claude-opus-5.5`). Reads the key from
    `OPENROUTER_API_KEY` or `ANTHROPIC_API_KEY`.
  - `.github/workflows/daily.yml`: passes both secrets; the job now also runs on a push
    that changes `scripts/`, the workflow or `requirements.txt`, so pushing tests it.
- Untested risks on OpenRouter (docs checked 2026-11-18): web search tool
  `web_search_20260209` is listed as supported; structured output
  (`messages.parse`) through that endpoint is not confirmed. If the run fails, the
  reasons land in `docs/data/<date>.json` under `errors` when at least the script got
  that far; otherwise the run log is needed.
- Next: push, watch the run via the public API, fix whatever the first run shows.

## 2026-11-18: status check, not launched yet

### What exists
- Code is complete and pushed: one commit (`b09e0d1`) on `main`, local and
  `origin` (github.com/KristinaGov/news-app, public) are in sync, working tree clean.
- GitHub Pages is on and the app shell is live at https://kristinagov.github.io/news-app/
  (index, app.js, style.css, sw.js, manifest and icon all return 200).
- The "Daily briefing" workflow is active on its 05:00 UTC schedule.

### What is not working
- **No briefing has ever been produced.** `docs/data/index.json` is still
  `{"dates": []}`, so the app shows "No briefing has been generated yet".
- **The first scheduled run failed** (2026-11-18 05:06 UTC, run 44241936292). The
  "Build briefing" step exited with code 1 and nothing was committed.
  - Probable cause, not confirmed: the `ANTHROPIC_API_KEY` secret is missing. The
    script exits before writing any file only in that case (or on a crash before the
    first save); a failure of all three categories would still have committed a day file.
  - Could not confirm: the run log and the secrets list need a GitHub login, and
    the `gh` CLI is not installed on this Mac.
- **The pipeline has never run end to end**, neither on GitHub nor locally. The first
  successful run is the real test of the Claude calls (web search, structured output).
- Local runs are not possible yet: system Python is 3.9.2 (script needs 3.10+), the
  dependencies are not installed, and no API key is set locally.

### Unknown (needs a look in the GitHub web UI)
- Whether the secrets `ANTHROPIC_API_KEY` and `NOTES_TOKEN` and the variable
  `NOTES_REPO` are set.
- Whether the private notes repo (`KristinaGov/news-notes` per the README) exists.
  The public API answers 404 for both "private" and "missing".

### Next steps to launch, in order
1. Open the failed run's log (Actions → Daily briefing → the 18 Nov run → "Build
   briefing") and read the last lines to confirm the cause.
2. Add the secret `ANTHROPIC_API_KEY` (repo → Settings → Secrets and variables → Actions).
3. Actions → Daily briefing → Run workflow. Success means a "Briefing 2026-..." commit
   appears and the app shows stories. If it fails with an API error, bring the log back
   here to fix the script.
4. Notes and feedback (can come after the first briefing; the job runs without them):
   create the private `news-notes` repo, create a fine-grained token (that repo only,
   Contents read and write), add secret `NOTES_TOKEN` and variable `NOTES_REPO`.
5. iPhone: open the site in Safari → Share → Add to Home Screen; in the app tap ⚙ and
   enter the notes repo and token; use "Test connection".
6. Fill in `config/profile.md` with the topics followed and what counts as noise.
   Until then ratings have little to go on.

### Later, not blocking
- Cost: the default model is `claude-opus-5-5`, three categories a day with up to 17 web
  searches. Set the variable `NEWS_MODEL` to `claude-sonnet-5-5` or `claude-haiku-5-5`
  to lower it. Check the Anthropic console after the first few days.
- The workflow shows a Node 20 deprecation warning for `actions/checkout@v4` and
  `actions/setup-python@v5`. It still runs; bump the versions at some point.
- Installing `gh` (`brew install gh`, then `gh auth login`) would let Claude read run
  logs and check secrets directly.
- This file is not committed. The repo is public, so committing it publishes it.
