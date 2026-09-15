/* Symbol directory — no framework, no build step. */
(() => {
  'use strict';

  const VIEWBOX = '0 0 120 80';
  const UI = {
    cs: {
      title: 'Značky elektro',
      search: 'Hledat značku, např. zásuvka, chránič, RCD…',
      all: 'Vše',
      empty: 'Nic nenalezeno. Zkuste jiné slovo nebo jinou kategorii.',
      count: n => `${n} ${n === 1 ? 'značka' : n < 5 ? 'značky' : 'značek'}`,
      note: 'Grafické tvary podle ČSN EN 60617 / IEC 60617 a ČSN EN 60617-11 (výkresy elektrických instalací). ' +
            'Pro projektovou dokumentaci vždy ověřte platné znění normy u ČAS (agentura-cas.cz).',
      svg: 'SVG', png: 'PNG',
    },
    en: {
      title: 'Electrical symbols',
      search: 'Search a symbol, e.g. socket, RCD, breaker…',
      all: 'All',
      empty: 'Nothing found. Try another word or category.',
      count: n => `${n} symbol${n === 1 ? '' : 's'}`,
      note: 'Graphical forms follow ČSN EN 60617 / IEC 60617 and ČSN EN 60617-11 (installation drawings). ' +
            'For project documentation always verify against the current standard text (agentura-cas.cz).',
      svg: 'SVG', png: 'PNG',
    },
  };

  let lang = localStorage.getItem('sym.lang') ||
    ((navigator.language || '').toLowerCase().startsWith('cs') ? 'cs' : 'en');
  if (!UI[lang]) lang = 'cs';
  let cat = 'all';
  let query = '';
  let data = { categories: [], symbols: [] };

  const $ = s => document.querySelector(s);
  const grid = $('#grid'), cats = $('#cats'), count = $('#count'), empty = $('#empty');
  const q = $('#q'), clear = $('#clear');

  /* ---------------------------------------------------------------- search */
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  function haystack(s) {
    if (!s._h) {
      s._h = norm([s.name.en, s.name.cs, s.kw.en, s.kw.cs, s.ref, s.id].join(' '));
    }
    return s._h;
  }

  function matches(s) {
    if (cat !== 'all' && s.cat !== cat) return false;
    if (!query) return true;
    const h = haystack(s);
    return query.split(/\s+/).every(t => h.includes(t));
  }

  /* ---------------------------------------------------------------- render */
  function svgMarkup(s) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX}" width="240" height="160" ` +
      `fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ` +
      `role="img" aria-label="${esc(s.name[lang])}">${s.svg}</svg>`;
  }

  const esc = s => s.replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));

  function render() {
    const t = UI[lang];
    const other = lang === 'cs' ? 'en' : 'cs';
    const list = data.symbols.filter(matches);
    const html = list.map(s => `
      <figure class="card" data-id="${s.id}">
        <svg viewBox="${VIEWBOX}" role="img" aria-label="${esc(s.name[lang])}">${s.svg}</svg>
        <figcaption>
          <div class="n">${esc(s.name[lang])}</div>
          <div class="alt">${esc(s.name[other])}</div>
          ${s.ref ? `<div class="ref">${esc(s.ref)}</div>` : ''}
        </figcaption>
        <div class="dl">
          <button type="button" data-dl="svg">${t.svg}</button>
          <button type="button" data-dl="png">${t.png}</button>
        </div>
      </figure>`).join('');
    grid.innerHTML = html;
    count.textContent = t.count(list.length);
    empty.hidden = list.length > 0;
    empty.textContent = t.empty;
  }

  function renderCats() {
    const t = UI[lang];
    cats.innerHTML = [{ id: 'all', [lang]: t.all }, ...data.categories]
      .map(c => `<button type="button" data-cat="${c.id}" class="${c.id === cat ? 'on' : ''}">${esc(c[lang])}</button>`)
      .join('');
  }

  function applyLang() {
    const t = UI[lang];
    document.documentElement.lang = lang;
    document.title = t.title + ' – ČSN EN 60617';
    $('h1').textContent = t.title;
    q.placeholder = t.search;
    $('footer p').textContent = t.note;
    document.querySelectorAll('.lang button').forEach(b => b.classList.toggle('on', b.dataset.lang === lang));
    renderCats();
    render();
  }

  /* -------------------------------------------------------------- download */
  function download(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function fileName(s, ext) {
    return `${s.id}-${norm(s.name.cs).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.${ext}`;
  }

  function downloadSVG(s) {
    download(new Blob([svgMarkup(s)], { type: 'image/svg+xml;charset=utf-8' }), fileName(s, 'svg'));
  }

  function downloadPNG(s) {
    const scale = 8; // 960 × 640 px
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = 120 * scale;
      c.height = 80 * scale;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      c.toBlob(b => download(b, fileName(s, 'png')), 'image/png');
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgMarkup(s));
  }

  /* ---------------------------------------------------------------- events */
  let timer;
  q.addEventListener('input', () => {
    clear.hidden = !q.value;
    clearTimeout(timer);
    timer = setTimeout(() => { query = norm(q.value.trim()); render(); }, 60);
  });
  clear.addEventListener('click', () => {
    q.value = ''; query = ''; clear.hidden = true; q.focus(); render();
  });
  cats.addEventListener('click', e => {
    const b = e.target.closest('button[data-cat]');
    if (!b) return;
    cat = b.dataset.cat;
    renderCats();
    render();
  });
  document.querySelector('.lang').addEventListener('click', e => {
    const b = e.target.closest('button[data-lang]');
    if (!b) return;
    lang = b.dataset.lang;
    localStorage.setItem('sym.lang', lang);
    applyLang();
  });
  grid.addEventListener('click', e => {
    const b = e.target.closest('button[data-dl]');
    if (!b) return;
    const id = b.closest('.card').dataset.id;
    const s = data.symbols.find(x => x.id === id);
    if (!s) return;
    b.dataset.dl === 'svg' ? downloadSVG(s) : downloadPNG(s);
  });

  /* ------------------------------------------------------------------ load */
  fetch('data/symbols.json')
    .then(r => r.json())
    .then(j => { data = j; applyLang(); })
    .catch(() => { empty.hidden = false; empty.textContent = 'data/symbols.json'; });
})();
