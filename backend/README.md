# AnimeSwipe backend — Stage 1

## Requirements
- Python 3.10+

## Setup (Windows PowerShell)
```powershell
cd backend
py -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Setup (macOS / Linux)
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Try it
- Health: http://127.0.0.1:8000/health
- Trending: http://127.0.0.1:8000/api/anime/trending
- Search: http://127.0.0.1:8000/api/anime/search?q=naruto
- Interactive API docs: http://127.0.0.1:8000/docs

AniList public GraphQL endpoint: https://graphql.anilist.co
This stage only reads public anime metadata. User accounts, swipe history and ratings are later stages.
