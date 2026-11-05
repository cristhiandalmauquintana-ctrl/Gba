const BASE = import.meta.env.BASE_URL;
const STORE_URL = BASE + 'store/';

const SYSTEMS = {
  gba: { name: 'Game Boy Advance', short: 'GBA', color: '#6c5ce7' },
  nes: { name: 'NES', short: 'NES', color: '#d63031' },
  snes: { name: 'Super Nintendo', short: 'SNES', color: '#636e72' },
  gb: { name: 'Game Boy / Color', short: 'GB', color: '#00a86b' },
  segaMD: { name: 'Sega Genesis', short: 'MD', color: '#0984e3' },
};

const EXT = {
  gba: 'gba', nes: 'nes', sfc: 'snes', smc: 'snes',
  gb: 'gb', gbc: 'gb', md: 'segaMD', gen: 'segaMD', smd: 'segaMD',
};

// ---------- íconos (SVG) ----------
const D = '#2b2250';
const ICONS = {
  gba: `<svg viewBox="0 0 48 48"><rect x="4" y="13" width="40" height="22" rx="9" fill="#fff"/><rect x="17" y="17" width="14" height="14" rx="2" fill="${D}"/><path d="M9 24h6M12 21v6" stroke="${D}" stroke-width="2.4" stroke-linecap="round"/><circle cx="38" cy="22" r="2.2" fill="${D}"/><circle cx="35" cy="27" r="2.2" fill="${D}"/></svg>`,
  nes: `<svg viewBox="0 0 48 48"><rect x="4" y="14" width="40" height="20" rx="4" fill="#fff"/><path d="M12 19v10M7 24h10" stroke="#3a2a2a" stroke-width="3.2" stroke-linecap="round"/><rect x="20" y="27" width="5" height="2.4" rx="1.2" fill="#3a2a2a"/><rect x="27" y="27" width="5" height="2.4" rx="1.2" fill="#3a2a2a"/><circle cx="34" cy="25" r="2.8" fill="#d63031"/><circle cx="40" cy="25" r="2.8" fill="#d63031"/></svg>`,
  snes: `<svg viewBox="0 0 48 48"><rect x="4" y="15" width="40" height="18" rx="9" fill="#fff"/><path d="M13 19v10M8 24h10" stroke="#4b525a" stroke-width="3" stroke-linecap="round"/><circle cx="35" cy="20" r="2.3" fill="#f1c40f"/><circle cx="35" cy="28" r="2.3" fill="#3b82f6"/><circle cx="31" cy="24" r="2.3" fill="#27ae60"/><circle cx="39" cy="24" r="2.3" fill="#e74c3c"/></svg>`,
  gb: `<svg viewBox="0 0 48 48"><rect x="12" y="4" width="24" height="40" rx="4" fill="#fff"/><rect x="16" y="8" width="16" height="14" rx="1.5" fill="#1d4d38"/><path d="M19 28v8M15 32h8" stroke="#1d4d38" stroke-width="2.6" stroke-linecap="round"/><circle cx="31" cy="30" r="2.2" fill="#1d4d38"/><circle cx="27" cy="35" r="2.2" fill="#1d4d38"/></svg>`,
  segaMD: `<svg viewBox="0 0 48 48"><rect x="4" y="16" width="40" height="16" rx="8" fill="#fff"/><path d="M13 20v8M9 24h8" stroke="#0b3c66" stroke-width="2.8" stroke-linecap="round"/><circle cx="27" cy="25" r="2.4" fill="#0b3c66"/><circle cx="33" cy="25" r="2.4" fill="#0b3c66"/><circle cx="39" cy="25" r="2.4" fill="#0b3c66"/></svg>`,
  store: `<svg viewBox="0 0 48 48"><path d="M18 17v-3a6 6 0 0 1 12 0v3" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/><path d="M11 17h26l-2 25H13z" fill="#fff"/><path d="M24 25v10M19 30h10" stroke="#d97706" stroke-width="3" stroke-linecap="round"/></svg>`,
  lib: `<svg viewBox="0 0 48 48"><rect x="8" y="8" width="14" height="14" rx="4" fill="#fff"/><rect x="26" y="8" width="14" height="14" rx="4" fill="#fff" opacity=".7"/><rect x="8" y="26" width="14" height="14" rx="4" fill="#fff" opacity=".7"/><rect x="26" y="26" width="14" height="14" rx="4" fill="#fff"/></svg>`,
};

// ---------- utilidades ----------
const $ = (s) => document.querySelector(s);

function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v; // solo para los SVG de ICONS
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) el.setAttribute(k, v);
  }
  for (const kid of kids.flat()) el.append(kid instanceof Node ? kid : document.createTextNode(kid));
  return el;
}

function iconEl(cls, color, svg) {
  return h('span', { class: cls, style: `--c:${color}`, html: svg });
}

function sysIcon(system) {
  const s = SYSTEMS[system];
  return iconEl('mini', s ? s.color : '#555', ICONS[system] || ICONS.lib);
}

// ---------- almacenamiento local (IndexedDB) ----------
function openDb() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open('retro-os', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('games', { keyPath: 'id' });
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

async function tx(mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction('games', mode);
    const req = fn(t.objectStore('games'));
    t.oncomplete = () => resolve(req?.result);
    t.onerror = () => reject(t.error);
  });
}

const putGame = (g) => tx('readwrite', (s) => s.put(g));
const allGames = () => tx('readonly', (s) => s.getAll());
const delGame = (id) => tx('readwrite', (s) => s.delete(id));

// ---------- ventana ----------
const win = $('#win');
const winBody = $('#win-body');

function openWin(title, node, flush = false) {
  $('#win-title').textContent = title;
  winBody.classList.toggle('flush', flush);
  winBody.replaceChildren(node);
  win.hidden = false;
}

function closeWin() {
  win.hidden = true;
  winBody.replaceChildren(); // al quitar el iframe se detiene el emulador
}

$('#win-close').addEventListener('click', closeWin);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !win.hidden) closeWin();
});

// ---------- jugar ----------
function play(game) {
  const frame = h('iframe', {
    class: 'player',
    src: `${BASE}player.html?id=${encodeURIComponent(game.id)}`,
    allow: 'fullscreen; gamepad; autoplay',
    title: game.title,
  });
  openWin(game.title, frame, true);
}

// ---------- Mis juegos ----------
function openLibrary(filter) {
  const title = filter ? SYSTEMS[filter].name : 'Mis juegos';
  const list = h('div', { class: 'cards' });
  const msg = h('p', { class: 'error', role: 'alert' });

  const select = h(
    'select',
    { class: 'select', 'aria-label': 'Sistema' },
    h('option', { value: 'auto' }, 'Sistema: automático'),
    Object.entries(SYSTEMS).map(([id, s]) => h('option', { value: id }, s.name))
  );
  if (filter) select.value = filter;

  const picker = h('input', {
    type: 'file',
    hidden: '',
    accept: '.gba,.nes,.sfc,.smc,.gb,.gbc,.md,.gen,.smd,.zip',
    onchange: async () => {
      const file = picker.files[0];
      if (!file) return;
      const ext = file.name.split('.').pop().toLowerCase();
      const system = select.value !== 'auto' ? select.value : EXT[ext];
      if (!system) {
        msg.textContent = 'No reconozco ese formato. Elige el sistema en el menú y vuelve a intentarlo.';
        return;
      }
      msg.textContent = '';
      await putGame({
        id: 'local-' + Date.now(),
        title: file.name.replace(/\.[^.]+$/, ''),
        system,
        name: file.name,
        blob: file,
        source: 'local',
      });
      picker.value = '';
      render();
    },
  });

  const toolbar = h(
    'div',
    { class: 'toolbar' },
    select,
    h('button', { class: 'btn', type: 'button', onclick: () => picker.click() }, '＋ Agregar mi ROM'),
    picker
  );

  async function render() {
    let games = await allGames();
    if (filter) games = games.filter((g) => g.system === filter);
    games.sort((a, b) => (a.title || '').localeCompare(b.title || ''));

    if (!games.length) {
      list.replaceChildren(h('p', { class: 'muted' }, 'Aún no hay juegos aquí. Instala uno desde la Tienda o agrega tu propio ROM.'));
      return;
    }
    list.replaceChildren(
      ...games.map((g) => {
        const metaText =
          g.source === 'store'
            ? [g.author, g.license].filter(Boolean).join(' · ') || 'Tienda'
            : 'Archivo propio (solo en este navegador)';
        const displayTitle = g.title || g.name || 'Sin título';
        return h(
          'article',
          { class: 'card' },
          h('div', { class: 'card-head' }, sysIcon(g.system), h('h3', {}, displayTitle)),
          h('p', { class: 'meta' }, metaText),
          h(
            'div',
            { class: 'actions' },
            h('button', { class: 'btn', type: 'button', onclick: () => play(g) }, 'Jugar'),
            h(
              'button',
              {
                class: 'btn ghost',
                type: 'button',
                onclick: async () => {
                  if (confirm(`¿Eliminar "${displayTitle}" de este navegador?`)) {
                    await delGame(g.id);
                    render();
                  }
                },
              },
              'Eliminar'
            )
          )
        );
      })
    );
  }

  openWin(title, h('div', {}, toolbar, msg, list));
  render();
}

// ---------- Tienda (sin validación: todo se muestra e intenta instalar) ----------
async function openStore() {
  const body = h('div', {}, h('p', { class: 'muted' }, 'Cargando catálogo…'));
  openWin('Tienda', body);

  let games;
  try {
    const res = await fetch(STORE_URL + 'catalog.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error();
    games = (await res.json()).games;
    if (!Array.isArray(games)) throw new Error();
  } catch {
    body.replaceChildren(h('p', { class: 'error' }, 'No se pudo cargar el catálogo. Revisa public/store/catalog.json.'));
    return;
  }

  const installed = new Set((await allGames()).map((g) => g.id));

  const cards = games.map((g, idx) => {
    // id estable aunque el catálogo no lo traiga
    const key = 'store-' + (g.id || (g.file ? g.file.replace(/[^a-z0-9]+/gi, '-') : 'item-' + idx));
    const btn = h('button', { class: 'btn', type: 'button' });

    const setPlay = (record) => {
      btn.textContent = 'Jugar';
      btn.disabled = false;
      btn.onclick = () => play(record);
    };

    const install = async () => {
      btn.disabled = true;
      btn.textContent = 'Instalando…';
      try {
        if (!g.file) throw new Error('sin archivo');
        const res = await fetch(STORE_URL + g.file);
        if (!res.ok) throw new Error();
        const record = {
          id: key,
          title: g.title || g.file.split('/').pop().replace(/\.[^.]+$/, ''),
          system: g.system || 'gba',
          name: g.file.split('/').pop(),
          blob: await res.blob(),
          source: 'store',
          author: g.author || '',
          license: g.license || '',
        };
        await putGame(record);
        setPlay(record);
      } catch {
        btn.disabled = false;
        btn.textContent = 'Error, reintentar';
      }
    };

    if (installed.has(key)) {
      btn.textContent = 'Jugar';
      btn.onclick = async () => play((await allGames()).find((x) => x.id === key));
    } else {
      btn.textContent = 'Instalar';
      btn.onclick = install;
    }

    const displayTitle = g.title || (g.file ? g.file.split('/').pop() : 'Sin título');
    const metaParts = [];
    if (g.author) metaParts.push(`Autor: ${g.author}`);
    if (g.license) metaParts.push(`Licencia: ${g.license}`);

    return h(
      'article',
      { class: 'card' },
      h('div', { class: 'card-head' }, sysIcon(g.system), h('h3', {}, displayTitle)),
      g.description ? h('p', {}, g.description) : '',
      metaParts.length ? h('p', { class: 'meta' }, metaParts.join(' · ')) : '',
      g.sourceUrl
        ? h('p', { class: 'meta' }, h('a', { href: g.sourceUrl, target: '_blank', rel: 'noopener noreferrer' }, 'Fuente'))
        : '',
      h('div', { class: 'actions' }, btn)
    );
  });

  body.replaceChildren(
    cards.length ? h('div', { class: 'cards' }, cards) : h('p', { class: 'muted' }, 'La tienda está vacía por ahora.')
  );
}

// ---------- escritorio y dock ----------
function appButton(cls, a) {
  return h(
    'button',
    { class: cls, type: 'button', onclick: a.open },
    iconEl('icon-img', a.color, a.icon),
    h('span', { class: 'icon-label' }, a.label)
  );
}

const dockApps = [
  { label: 'Tienda', icon: ICONS.store, color: '#f59e0b', open: openStore },
  { label: 'Mis juegos', icon: ICONS.lib, color: '#3b82f6', open: () => openLibrary() },
];

const consoleApps = Object.entries(SYSTEMS).map(([id, s]) => ({
  label: s.name, icon: ICONS[id], color: s.color, open: () => openLibrary(id),
}));

$('#icons').replaceChildren(...consoleApps.map((a) => appButton('icon', a)));
$('#dock').replaceChildren(...dockApps.map((a) => appButton('dock-item', a)));

function tick() {
  const now = new Date();
  $('#clock').textContent = now.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  $('#date').textContent = now.toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' });
}
tick();
setInterval(tick, 30000);
