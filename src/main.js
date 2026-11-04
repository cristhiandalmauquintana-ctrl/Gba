const BASE = import.meta.env.BASE_URL;
const STORE_URL = BASE + 'store/';

const SYSTEMS = {
  gba: { name: 'Game Boy Advance', short: 'GBA', color: '#5b4bd6' },
  nes: { name: 'NES', short: 'NES', color: '#c0392b' },
  snes: { name: 'Super Nintendo', short: 'SNES', color: '#6c7a89' },
  gb: { name: 'Game Boy / Color', short: 'GB', color: '#2e8b57' },
  segaMD: { name: 'Sega Genesis', short: 'MD', color: '#1f6fb2' },
};

const EXT = {
  gba: 'gba', nes: 'nes', sfc: 'snes', smc: 'snes',
  gb: 'gb', gbc: 'gb', md: 'segaMD', gen: 'segaMD', smd: 'segaMD',
};

// ---------- utilidades ----------
const $ = (s) => document.querySelector(s);

function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) el.setAttribute(k, v);
  }
  for (const kid of kids.flat()) el.append(kid instanceof Node ? kid : document.createTextNode(kid));
  return el;
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
    games.sort((a, b) => a.title.localeCompare(b.title));

    if (!games.length) {
      list.replaceChildren(h('p', { class: 'muted' }, 'Aún no hay juegos aquí. Instala uno desde la Tienda o agrega tu propio ROM.'));
      return;
    }
    list.replaceChildren(
      ...games.map((g) =>
        h(
          'article',
          { class: 'card' },
          h('span', { class: 'badge', style: `background:${SYSTEMS[g.system]?.color || '#555'}` }, SYSTEMS[g.system]?.short || '?'),
          h('h3', {}, g.title),
          h('p', { class: 'meta' }, g.source === 'store' ? `${g.author} · ${g.license}` : 'Archivo propio (solo en este navegador)'),
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
                  if (confirm(`¿Eliminar "${g.title}" de este navegador?`)) {
                    await delGame(g.id);
                    render();
                  }
                },
              },
              'Eliminar'
            )
          )
        )
      )
    );
  }

  openWin(title, h('div', {}, toolbar, msg, list));
  render();
}

// ---------- Tienda ----------
const REQUIRED = ['id', 'title', 'system', 'file', 'author', 'license', 'sourceUrl'];

function isValid(g) {
  if (!g || typeof g !== 'object') return false;
  if (!REQUIRED.every((k) => typeof g[k] === 'string' && g[k].trim())) return false;
  if (!/^[a-z0-9-]+$/.test(g.id)) return false;
  if (!(g.system in SYSTEMS)) return false;
  if (!/^https?:\/\//.test(g.sourceUrl)) return false;
  if (g.file.startsWith('/') || g.file.includes('..')) return false;
  return true;
}

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

  const valid = games.filter(isValid);
  const hidden = games.length - valid.length;
  const installed = new Set((await allGames()).map((g) => g.id));

  const cards = valid.map((g) => {
    const key = 'store-' + g.id;
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
        const res = await fetch(STORE_URL + g.file);
        if (!res.ok) throw new Error();
        const record = {
          id: key, title: g.title, system: g.system, name: g.file.split('/').pop(),
          blob: await res.blob(), source: 'store', author: g.author, license: g.license,
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

    return h(
      'article',
      { class: 'card' },
      h('span', { class: 'badge', style: `background:${SYSTEMS[g.system].color}` }, SYSTEMS[g.system].short),
      h('h3', {}, g.title),
      g.description ? h('p', {}, g.description) : '',
      h('p', { class: 'meta' }, `Autor: ${g.author}`),
      h('p', { class: 'meta' }, `Licencia: ${g.license} · `, h('a', { href: g.sourceUrl, target: '_blank', rel: 'noopener noreferrer' }, 'Fuente')),
      h('div', { class: 'actions' }, btn)
    );
  });

  body.replaceChildren(
    cards.length ? h('div', { class: 'cards' }, cards) : h('p', { class: 'muted' }, 'La tienda está vacía por ahora.'),
    hidden ? h('p', { class: 'muted' }, `${hidden} juego(s) ocultos por no tener autor, licencia o fuente completos.`) : ''
  );
}

// ---------- escritorio ----------
const apps = [
  { label: 'Tienda', short: '🛒', color: '#e08a1e', open: openStore },
  { label: 'Mis juegos', short: '🎮', color: '#3a7bd5', open: () => openLibrary() },
  ...Object.entries(SYSTEMS).map(([id, s]) => ({
    label: s.name, short: s.short, color: s.color, open: () => openLibrary(id),
  })),
];

$('#icons').replaceChildren(
  ...apps.map((a) =>
    h(
      'button',
      { class: 'icon', type: 'button', onclick: a.open },
      h('span', { class: 'icon-img', style: `background:${a.color}` }, a.short),
      h('span', { class: 'icon-label' }, a.label)
    )
  )
);

function tick() {
  $('#clock').textContent = new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
}
tick();
setInterval(tick, 30000);
