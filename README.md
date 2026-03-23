# 🦷 AI Dental Lead Scraper

Extract emails, phone numbers, Instagram profiles, and AI-written cold-email openers from dental practice websites — instantly.

---

## 📁 File Structure

```
dental-scraper/
├── app.py            ← Flask backend (scraping + AI)
├── requirements.txt  ← Python dependencies
├── render.yaml       ← Render deployment config
├── index.html        ← Frontend UI
├── style.css         ← Dark industrial styles
└── script.js         ← Frontend logic + CSV export
```

---

## 🖥️ Running Locally

### 1. Clone / copy files

Put all files in a folder, e.g. `dental-scraper/`.

### 2. Set up Python environment

```bash
cd dental-scraper
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Add your Anthropic API key

```bash
export ANTHROPIC_API_KEY="sk-ant-..."   # Mac/Linux
set ANTHROPIC_API_KEY=sk-ant-...        # Windows CMD
```

### 4. Start the backend

```bash
python app.py
# Runs on http://localhost:5000
```

### 5. Open the frontend

Open `index.html` directly in your browser (double-click), or serve it:

```bash
# Quick one-liner (Python built-in server)
python -m http.server 3000
# Then visit http://localhost:3000
```

---

## ☁️ Deploying Backend → Render (Free)

1. Push your project to a **GitHub repo**
2. Go to [render.com](https://render.com) → **New → Web Service**
3. Connect your GitHub repo
4. Fill in:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app`
   - **Environment**: Python 3
5. Under **Environment Variables**, add:
   - Key: `ANTHROPIC_API_KEY`
   - Value: your key (`sk-ant-...`)
6. Click **Deploy**
7. Copy your Render URL (e.g. `https://dental-scraper-api.onrender.com`)
8. In `script.js`, update line 2:
   ```js
   const API_URL = 'https://dental-scraper-api.onrender.com/scrape';
   ```

> ⚠️ Free Render instances spin down after 15 min of inactivity. First request may take ~30s to wake up.

---

## 🌐 Deploying Frontend → Vercel (Free)

1. Put `index.html`, `style.css`, and `script.js` in a folder (e.g. `frontend/`)
2. Make sure `API_URL` in `script.js` points to your Render URL
3. Push to GitHub
4. Go to [vercel.com](https://vercel.com) → **Add New Project**
5. Import your repo
6. Framework Preset: **Other**
7. Root directory: `frontend/` (or root if files are at root)
8. Click **Deploy**

That's it — Vercel detects static files automatically.

---

## 🔍 What Gets Scraped

For each URL, the scraper visits:
- `https://example.com` (homepage)
- `https://example.com/contact`
- `https://example.com/about`

And extracts:
| Field | Method |
|---|---|
| **Email** | Regex on raw HTML, cleaned & deduplicated |
| **Phone** | Regex on page text, US format normalised |
| **Instagram** | Anchor tag `href` containing `instagram.com` |
| **AI Opener** | Claude Sonnet writes a 2-sentence cold-email intro |

### Email filtering removes:
- `test@`, `example@`, `noreply@`, `admin@`, `webmaster@`, and similar fake/system addresses
- Emails embedded in image filenames, CSS, or JS paths

---

## ⚙️ API Reference

### `POST /scrape`

**Request body:**
```json
{
  "websites": [
    "https://brigstonedental.com",
    "https://smileclinicnyc.com"
  ]
}
```

**Response:**
```json
[
  {
    "website": "https://brigstonedental.com",
    "email": "hello@brigstonedental.com",
    "phone": "(212) 555-0182",
    "instagram": "https://instagram.com/brigstone_dental",
    "personalization": "I noticed Brigstone Dental's website doesn't list your services clearly or have an online booking button — two quick wins that could convert more visitors. I'd love to share a 5-minute audit that shows exactly what's costing you new patients."
  }
]
```

---

## 💡 Tips

- **Bulk runs**: Paste 20–50 URLs at a time for best results
- **Slow sites**: Scraper has a 10s timeout and fails silently — you'll get partial data
- **CSV**: Click "Download CSV" to export all leads with AI openers for outreach
- **CORS**: Flask-CORS is enabled for all origins — lock it down in production if needed

---

## 📦 Dependencies

| Package | Purpose |
|---|---|
| `flask` | Web server & REST endpoint |
| `flask-cors` | Allow frontend to call backend |
| `requests` | HTTP page fetching |
| `beautifulsoup4` | HTML parsing |
| `anthropic` | Claude AI for personalized openers |
| `gunicorn` | Production WSGI server (Render) |
