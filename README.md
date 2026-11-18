# Energy Briefing

A personal daily news briefing on EU, German and Belgian energy and environment policy,
installable on an iPhone as a home-screen app.




## Tuning

- `config/profile.md`: what interests you. Ratings stay at a neutral 3 until this is filled in.
- `config/feeds.yaml`: feeds, search-only sources, keywords, search days and caps, the AI
  models, and the legislation tracker's keywords.
- `SOURCES.md`: every source and whether it is read by RSS or by AI search.
- Token use: each day's file in `docs/data/` records the tokens, web searches and cost
  (`usage`). To spend less, shorten `search_sources` or the `search.weekdays` list.
- 👍 / 👎 and saved notes feed into the next day's ratings.

## Run locally

Needs Python 3.10 or newer.

    pip install -r requirements.txt
    OPENROUTER_API_KEY=... python scripts/build_briefing.py
    python -m http.server -d docs 8000
