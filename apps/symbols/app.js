/* Symbol directory — no framework, no build step. */
(() => {
  'use strict';

  const VIEWBOX = '0 0 120 80';
  const LANGS = ['cs', 'en', 'ru', 'pl'];
  const UI = {
    cs: {
      title: 'Značky IEC 60617',
      search: 'Hledat značku, např. zásuvka, jistič, stykač…',
      all: 'Vše',
      empty: 'Nic nenalezeno. Zkuste jiné slovo nebo jinou kategorii.',
      count: n => `${n} ${n === 1 ? 'značka' : n < 5 ? 'značky' : 'značek'}`,
      note: 'Všechny značky jsou převzaty z tabulek IEC 60617 — grafika je vektorizována přímo ze ' +
            'zdrojového dokumentu, nikoli překreslena. U každé značky je uvedena strana zdroje. ' +
            'Anglický název je původní znění normy, ostatní jazyky jsou překlad.',
    },
    en: {
      title: 'IEC 60617 symbols',
      search: 'Search a symbol, e.g. socket, breaker, contactor…',
      all: 'All',
      empty: 'Nothing found. Try another word or category.',
      count: n => `${n} symbol${n === 1 ? '' : 's'}`,
      note: 'Every symbol is taken from the IEC 60617 symbol tables — the artwork is vectorised from ' +
            'the source document, not redrawn. Each card cites the source page. English wording is ' +
            "the standard's own; the other languages are translations.",
    },
    ru: {
      title: 'Обозначения IEC 60617',
      search: 'Поиск обозначения, напр. розетка, выключатель, контактор…',
      all: 'Все',
      empty: 'Ничего не найдено. Попробуйте другое слово или категорию.',
      count: n => {
        const t = n % 100 > 4 && n % 100 < 21 ? 5 : n % 10;
        return `${n} ${t === 1 ? 'обозначение' : t > 1 && t < 5 ? 'обозначения' : 'обозначений'}`;
      },
      note: 'Все обозначения взяты из таблиц IEC 60617 — графика векторизована непосредственно из ' +
            'исходного документа, а не перерисована. На каждой карточке указана страница источника. ' +
            'Английское название — формулировка стандарта, остальные языки — перевод.',
    },
    pl: {
      title: 'Symbole IEC 60617',
      search: 'Szukaj symbolu, np. gniazdo, wyłącznik, stycznik…',
      all: 'Wszystko',
      empty: 'Nic nie znaleziono. Spróbuj innego słowa lub kategorii.',
      count: n => {
        const t = n % 100 > 11 && n % 100 < 15 ? 5 : n % 10;
        return `${n} ${n === 1 ? 'symbol' : t > 1 && t < 5 ? 'symbole' : 'symboli'}`;
      },
      note: 'Wszystkie symbole pochodzą z tablic IEC 60617 — grafika jest wektoryzowana bezpośrednio ' +
            'z dokumentu źródłowego, a nie przerysowana. Każda karta podaje stronę źródła. Nazwa ' +
            'angielska to brzmienie normy, pozostałe języki są tłumaczeniem.',
    },
  };

  const browser = (navigator.language || '').toLowerCase().slice(0, 2);
  let lang = localStorage.getItem('sym.lang') || (LANGS.includes(browser) ? browser : 'en');
  if (!UI[lang]) lang = 'en';
  let cat = 'all';
  let query = '';
  let data = { categories: [], symbols: [] };

  const $ = s => document.querySelector(s);
  const grid = $('#grid'), cats = $('#cats'), count = $('#count'), empty = $('#empty');
  const q = $('#q'), clear = $('#clear');

  /* ---------------------------------------------------------------- search */
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Most people here type on a Latin keyboard, so the Russian names go into
  // the index transliterated as well: "rozetka" then finds "розетка".
  const CYR = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
    и: 'i', й: 'j', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
    с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh',
    щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'ju', я: 'ja',
  };
  const translit = s => s.replace(/[\u0400-\u04ff]/g, c => CYR[c] || '');

  function haystack(s) {
    if (!s._h) {
      const all = [...LANGS.map(l => s.name[l] || ''), s.kw.en || '', s.note || '', s.ref, s.id];
      const text = norm(all.join(' '));
      s._h = `${text} ${translit(text)}`;
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
    // the symbol paths are filled shapes drawn in currentColor, so the file
    // carries a colour for them to resolve against
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX}" width="240" height="160" ` +
      `color="#000" role="img" aria-label="${esc(s.name[lang])}">` +
      `<title>${esc(s.name.en)} — ${esc(s.name.cs)}</title>${s.svg}</svg>`;
  }

  const esc = s => s.replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));

  function render() {
    const t = UI[lang];
    const list = data.symbols.filter(matches);
    const html = list.map(s => `
      <figure class="card" data-id="${s.id}">
        <svg viewBox="${VIEWBOX}" role="img" aria-label="${esc(s.name[lang])}">${s.svg}</svg>
        <figcaption>
          <div class="n">${esc(s.name[lang])}</div>
          ${lang === 'en' ? '' : `<div class="alt">${esc(s.name.en)}</div>`}
          ${s.note ? `<div class="note">${esc(s.note)}</div>` : ''}
          ${s.ref ? `<div class="ref">${esc(s.ref)}</div>` : ''}
        </figcaption>
        <div class="dl">
          <button type="button" data-dl="svg">SVG</button>
          <button type="button" data-dl="png">PNG</button>
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
    document.title = t.title;
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
