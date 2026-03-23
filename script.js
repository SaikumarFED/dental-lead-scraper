/* ── Config ────────────────────────────────────────────────────── */
const API_URL = 'https://dental-lead-scraper-api.onrender.com/scrape'; // ← change to your Render URL when deployed

/* ── DOM refs ──────────────────────────────────────────────────── */
const urlInput      = document.getElementById('urlInput');
const urlCount      = document.getElementById('urlCount');
const scrapeBtn     = document.getElementById('scrapeBtn');
const loader        = document.getElementById('loader');
const loaderMsg     = document.getElementById('loaderMsg');
const resultsSection= document.getElementById('resultsSection');
const resultCount   = document.getElementById('resultCount');
const resultsBody   = document.getElementById('resultsBody');
const downloadBtn   = document.getElementById('downloadBtn');

let currentLeads = [];

/* ── URL counter ───────────────────────────────────────────────── */
urlInput.addEventListener('input', () => {
  const urls = parseUrls(urlInput.value);
  urlCount.textContent = `${urls.length} URL${urls.length !== 1 ? 's' : ''} detected`;
});

function parseUrls(text) {
  return text.split('\n')
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

/* ── Scrape ────────────────────────────────────────────────────── */
scrapeBtn.addEventListener('click', async () => {
  const urls = parseUrls(urlInput.value);
  if (!urls.length) {
    alert('Please paste at least one URL.');
    return;
  }

  // Reset UI
  scrapeBtn.disabled = true;
  loader.classList.remove('hidden');
  resultsSection.classList.add('hidden');
  resultsBody.innerHTML = '';
  currentLeads = [];

  const messages = [
    `Scraping ${urls.length} dental practice${urls.length > 1 ? 's' : ''}…`,
    'Visiting homepages, /contact and /about…',
    'Extracting emails, phones and Instagram…',
    'Generating AI-personalised openers…',
    'Almost there, polishing results…',
  ];
  let mi = 0;
  loaderMsg.textContent = messages[mi];
  const msgInterval = setInterval(() => {
    mi = (mi + 1) % messages.length;
    loaderMsg.textContent = messages[mi];
  }, 2800);

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ websites: urls }),
    });

    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    const leads = await res.json();
    currentLeads = leads;
    renderTable(leads);
  } catch (err) {
    alert(`Error: ${err.message}\n\nMake sure the Flask backend is running on http://localhost:5000`);
  } finally {
    clearInterval(msgInterval);
    loader.classList.add('hidden');
    scrapeBtn.disabled = false;
  }
});

/* ── Render table ──────────────────────────────────────────────── */
function renderTable(leads) {
  resultsBody.innerHTML = '';

  leads.forEach((lead, i) => {
    const tr = document.createElement('tr');

    const website = escHtml(lead.website || '');
    const email   = escHtml(lead.email   || '');
    const phone   = escHtml(lead.phone   || '');
    const ig      = lead.instagram || '';
    const opener  = escHtml(lead.personalization || '');

    tr.innerHTML = `
      <td class="row-num">${i + 1}</td>
      <td class="website"><a href="${website}" target="_blank" rel="noopener">${shortUrl(website)}</a></td>
      <td class="email">${email || '<span class="empty">—</span>'}</td>
      <td class="phone">${phone || '<span class="empty">—</span>'}</td>
      <td class="ig">${ig
        ? `<a href="${escHtml(ig)}" target="_blank" rel="noopener">@${igHandle(ig)}</a>`
        : '<span class="empty">—</span>'
      }</td>
      <td class="opener">${opener || '<span class="empty">—</span>'}</td>
    `;
    resultsBody.appendChild(tr);
  });

  resultCount.textContent = `${leads.length} lead${leads.length !== 1 ? 's' : ''} extracted`;
  resultsSection.classList.remove('hidden');
  resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function shortUrl(url) {
  return url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
}

function igHandle(url) {
  return url.replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '');
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── Download CSV ──────────────────────────────────────────────── */
downloadBtn.addEventListener('click', () => {
  if (!currentLeads.length) return;

  const headers = ['Website', 'Email', 'Phone', 'Instagram', 'AI Opener'];
  const rows = currentLeads.map(l => [
    l.website        || '',
    l.email          || '',
    l.phone          || '',
    l.instagram      || '',
    l.personalization|| '',
  ]);

  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `dental-leads-${datestamp()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

function datestamp() {
  return new Date().toISOString().slice(0, 10);
}

// Wake Render on page load
fetch('https://dental-lead-scraper-api.onrender.com').catch(() => {});
