/* Localized handbook navigation and lazy ranked search over the complete public Markdown inventory. */
const assets = new URL('.', document.currentScript.src);
const docsRoot = new URL('../../', assets);
const input = document.getElementById('docs-search');
const count = document.getElementById('docs-count');
const directory = document.getElementById('docs-directory');
const results = document.getElementById('docs-results');
const picker = document.getElementById('docs-language');
let copy, navigation, index, epoch = 0, stored;
try { stored = localStorage.getItem('veyndo-docs-language'); } catch {}
let locale = (new URLSearchParams(location.search).get('locale') || stored || navigator.language).slice(0, 2);
if (!['en', 'de', 'fr', 'es'].includes(locale)) locale = 'en';
const text = (key, number) => (copy?.[locale]?.[key] || copy?.en?.[key] || key).replace('{count}', number ?? '');
const normalize = value => value.toLocaleLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
const aliases = { wissen: 'knowledge', bestellungen: 'orders', kunden: 'customers', produkte: 'products', rechte: 'permissions', sprachen: 'languages', steuern: 'tax', versand: 'shipping', zahlungen: 'payments' };
function translate() {
  document.querySelectorAll('[data-docs-copy]').forEach(el => { el.textContent = text(el.dataset.docsCopy); });
  navigation.groups.forEach(group => {
    document.querySelectorAll(`[data-group-title="${group.id}"]`).forEach(el => { el.textContent = group.title[locale]; });
    document.querySelectorAll(`[data-group-description="${group.id}"]`).forEach(el => { el.textContent = group.description[locale]; });
  });
  picker.value = locale;
  picker.setAttribute('aria-label', text('language'));
  if (input) { input.placeholder = text('placeholder'); count.textContent = text('documents', count.dataset.documentCount); }
  // The original English article language remains explicit to readers and assistive technology.
  if (!document.querySelector('.docs-article')) document.documentElement.lang = locale;
}
async function search() {
  const turn = ++epoch, query = normalize(input.value.trim());
  results.replaceChildren(); directory.hidden = Boolean(query);
  if (!query) { count.textContent = text('documents', count.dataset.documentCount); return; }
  count.textContent = text('loading');
  try {
    index ??= fetch(new URL('search.json', docsRoot)).then(r => { if (!r.ok) throw new Error('Search unavailable'); return r.json(); });
    const rows = await index;
    if (turn !== epoch) return;
    const words = query.split(/\s+/).map(word => aliases[word] || word);
    const matches = rows.map(row => {
      const title = normalize(row.title), source = normalize(row.source), body = normalize(row.text);
      if (!words.every(word => `${title} ${source} ${body}`.includes(word))) return null;
      return { row, score: words.reduce((n, word) => n + (title.includes(word) ? 12 : 0) + (source.includes(word) ? 5 : 0), 0) - (source.includes('/history/') || source.includes('/assets/') ? 20 : 0) };
    }).filter(Boolean).sort((a, b) => b.score - a.score);
    count.textContent = text('matches', matches.length);
    if (!matches.length) { results.textContent = text('none'); return; }
    const list = document.createElement('ul'); list.className = 'docs-search-results';
    for (const { row } of matches.slice(0, 40)) {
      const item = document.createElement('li'), link = document.createElement('a'), note = document.createElement('small'), excerpt = document.createElement('p');
      link.href = new URL(row.url.replace(/^docs\//, ''), docsRoot).href; link.textContent = row.title;
      note.textContent = row.source; excerpt.textContent = row.description;
      item.append(note, link, excerpt); list.append(item);
    }
    results.append(list);
  } catch {
    if (turn !== epoch) return;
    index = undefined; directory.hidden = false; count.textContent = text('failed');
  }
}
Promise.all(['docs-copy.json', 'docs-navigation.json'].map(name => fetch(new URL(name, assets)).then(r => {
  if (!r.ok) throw new Error('Navigation unavailable'); return r.json();
}))).then(([words, groups]) => {
  copy = words; navigation = groups; translate();
  picker.addEventListener('change', () => {
    locale = picker.value; translate();
    try { localStorage.setItem('veyndo-docs-language', locale); } catch {}
    const url = new URL(location.href); url.searchParams.set('locale', locale); history.replaceState(null, '', url);
    if (input?.value.trim()) void search();
  });
}).catch(() => { /* All English content and chapter links work without JavaScript. */ });
input?.addEventListener('input', search);
if (matchMedia('(max-width: 980px)').matches) document.querySelector('.docs-menu')?.removeAttribute('open');
