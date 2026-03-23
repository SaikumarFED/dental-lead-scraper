from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
from bs4 import BeautifulSoup
import re

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=False)

@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    return response
# ── Email helpers ─────────────────────────────────────────────────────────────
FAKE_PREFIXES = {"test", "example", "noreply", "no-reply", "donotreply",
                 "admin", "webmaster", "info", "mail", "email", "support",
                 "contact", "hello", "hi", "sample", "user", "demo"}

EMAIL_RE  = re.compile(r'[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}')
PHONE_RE  = re.compile(
    r'(\+?1[\s\-.]?)?\(?\d{3}\)?[\s\-.]?\d{3}[\s\-.]?\d{4}'
)
IG_HREF_RE = re.compile(r'instagram\.com/[^/"\'?#\s]+', re.I)

def clean_email(email: str) -> bool:
    email = email.lower()
    if any(ext in email for ext in ['.png', '.jpg', '.gif', '.css', '.js']):
        return False
    local = email.split('@')[0]
    return local not in FAKE_PREFIXES

def clean_phone(phone: str) -> str:
    digits = re.sub(r'\D', '', phone)
    if len(digits) == 11 and digits.startswith('1'):
        digits = digits[1:]
    if len(digits) == 10:
        return f"({digits[:3]}) {digits[3:6]}-{digits[6:]}"
    return phone.strip()

def extract_instagram(soup) -> str | None:
    for tag in soup.find_all('a', href=True):
        href = tag['href']
        if 'instagram.com' in href.lower():
            m = IG_HREF_RE.search(href)
            if m:
                return 'https://' + m.group(0).rstrip('/')
    return None

def scrape_url(url: str) -> dict:
    """Return {emails, phones, instagram} extracted from a single URL."""
    emails, phones, instagram = set(), set(), None
    try:
        headers = {
            'User-Agent': (
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
                'AppleWebKit/537.36 (KHTML, like Gecko) '
                'Chrome/122.0.0.0 Safari/537.36'
            )
        }
        resp = requests.get(url, headers=headers, timeout=10)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, 'html.parser')

        text = soup.get_text(' ')
        raw_html = resp.text

        for e in EMAIL_RE.findall(raw_html):
            if clean_email(e):
                emails.add(e.lower())

        for p in PHONE_RE.findall(text):
            phones.add(clean_phone(p if isinstance(p, str) else p[0]))

        if not instagram:
            instagram = extract_instagram(soup)

    except Exception:
        pass

    return {'emails': emails, 'phones': phones, 'instagram': instagram}

def merge_results(*results) -> dict:
    emails = set()
    phones = set()
    instagram = None
    for r in results:
        emails.update(r.get('emails', set()))
        phones.update(r.get('phones', set()))
        if not instagram:
            instagram = r.get('instagram')
    return {
        'email': ', '.join(sorted(emails)) or '',
        'phone': ', '.join(sorted(phones)) or '',
        'instagram': instagram or '',
    }

# ── Free personalization (no API key needed) ──────────────────────────────────
def generate_personalization(url: str) -> str:
    name = url.replace("https://", "").replace("http://", "").replace("www.", "").split(".")[0].capitalize()
    return f"Quick question — are you currently missing patient calls after hours at {name}?"

# ── Endpoint ──────────────────────────────────────────────────────────────────
@app.route('/scrape', methods=['POST'])
def scrape():
    data = request.get_json(force=True)
    websites = data.get('websites', [])
    if not websites:
        return jsonify({'error': 'No websites provided'}), 400

    output = []
    for raw in websites:
        website = raw.strip()
        if not website:
            continue
        if not website.startswith(('http://', 'https://')):
            website = 'https://' + website

        base = website.rstrip('/')
        pages = [base, base + '/contact', base + '/about']

        parts = [scrape_url(p) for p in pages]
        merged = merge_results(*parts)
        merged['website'] = website

        # Free personalization
        merged['personalization'] = generate_personalization(website)

        output.append(merged)

    return jsonify(output)


if __name__ == '__main__':
    app.run(debug=True, port=5000)
