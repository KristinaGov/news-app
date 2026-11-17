# Energy Briefing

A personal daily news briefing on EU, German and Belgian energy and environment policy,
installable on an iPhone as a home-screen app.

## How it works

- **Daily job** (`.github/workflows/daily.yml`, about 06:00 Brussels time) runs
  `scripts/build_briefing.py`. It reads the RSS feeds in `config/feeds.yaml`, has Claude
  web-search the sources that have no feed, then has Claude merge duplicates, summarise in
  English, label the document type and rate each story 1-5 against `config/profile.md`.
  The result is committed to `docs/data/<date>.json`.
- **App** (`docs/`) is a static page served by GitHub Pages. Tabs: Today (headlines for all
  categories), one tab per category (detailed summaries), Notes.
- **Notes and feedback** are written from the phone to a separate private repository:
  `notes/<YYYY-MM>.json` and `feedback.json`. The daily job reads them to tune the ratings.

Source links are only shown if they came from a feed or a search result; anything else the
model produces is dropped.

## Setup

1. **Create two GitHub repositories**: a public one for this project (e.g. `news-app`) and
   a private, empty one for notes (e.g. `news-notes`).
2. **Push this folder** to the public repository.
3. **Enable Pages**: public repo → Settings → Pages → Deploy from a branch → `main`, folder `/docs`.
4. **Create a fine-grained token**: GitHub → Settings → Developer settings → Fine-grained
   tokens. Repository access: only the notes repo. Permissions: Contents → Read and write.
5. **Add secrets and variables** in the public repo → Settings → Secrets and variables → Actions:
   - Secret `ANTHROPIC_API_KEY`: your Anthropic API key.
   - Secret `NOTES_TOKEN`: the token from step 4.
   - Variable `NOTES_REPO`: `your-user/news-notes`.
   - Optional variable `NEWS_MODEL`: defaults to `claude-opus-5-5`. `claude-sonnet-5-5` or
     `claude-haiku-5-5` are cheaper.
6. **Run the job once**: Actions → Daily briefing → Run workflow.
7. **On the iPhone**: open `https://your-user.github.io/news-app/` in Safari → Share → Add to
   Home Screen. Open the app, tap ⚙, enter `your-user/news-notes` and the token from step 4.

## Tuning

- `config/profile.md`: what interests you. Ratings stay at a neutral 3 until this is filled in.
- `config/feeds.yaml`: feeds, search-only sources, keywords and the daily search cap.
- 👍 / 👎 and saved notes feed into the next day's ratings.

## Run locally

Needs Python 3.10 or newer.

    pip install -r requirements.txt
    ANTHROPIC_API_KEY=... python scripts/build_briefing.py
    python -m http.server -d docs 8000
