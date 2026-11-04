const DATA_PATH = import.meta.env.BASE_URL + 'emulatorjs/data/';

const input = document.getElementById('rom-input');
const slot = document.getElementById('slot');
const picker = document.getElementById('picker');
const stage = document.getElementById('stage');
const errorBox = document.getElementById('error');
const changeBtn = document.getElementById('change');
const urlForm = document.getElementById('url-form');
const urlInput = document.getElementById('url-input');
const urlBtn = document.getElementById('url-btn');

const VALID = /\.(gba|zip|7z)$/i;

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.hidden = false;
}

function startGame(file) {
  if (!VALID.test(file.name)) {
    showError('Ese archivo no parece un ROM de GBA. Elige un .gba (o un .zip que lo contenga).');
    return;
  }
  launch(file, file.name);
}

async function startFromUrl(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error();
  } catch {
    showError('La URL no es válida. Debe empezar por https://');
    return;
  }

  const name = decodeURIComponent(url.pathname.split('/').pop() || 'juego.gba');
  if (!VALID.test(name)) {
    showError('La URL debe apuntar a un archivo .gba (o .zip).');
    return;
  }

  urlBtn.disabled = true;
  urlBtn.textContent = 'Descargando…';
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    launch(await res.blob(), name);
  } catch {
    showError('No se pudo descargar el ROM. Comprueba el enlace y que el servidor permita CORS.');
  } finally {
    urlBtn.disabled = false;
    urlBtn.textContent = 'Cargar desde URL';
  }
}

function launch(blob, fileName) {
  errorBox.hidden = true;
  const url = URL.createObjectURL(blob);

  picker.hidden = true;
  stage.hidden = false;

  window.EJS_player = '#game';
  window.EJS_core = 'gba';
  window.EJS_gameUrl = url;
  window.EJS_gameName = fileName.replace(/\.[^.]+$/, '');
  window.EJS_pathtodata = DATA_PATH;
  window.EJS_startOnLoaded = true;
  window.EJS_language = 'es-ES';
  window.EJS_color = '#4b3f8f';
  window.EJS_threads = false;

  const script = document.createElement('script');
  script.src = DATA_PATH + 'loader.js';
  script.onerror = () => {
    stage.hidden = true;
    picker.hidden = false;
    showError('No se pudo cargar el emulador. Revisa tu conexión e inténtalo de nuevo.');
  };
  document.body.appendChild(script);
}

input.addEventListener('change', () => {
  if (input.files[0]) startGame(input.files[0]);
});

['dragenter', 'dragover'].forEach((ev) =>
  slot.addEventListener(ev, (e) => {
    e.preventDefault();
    slot.classList.add('is-over');
  })
);
['dragleave', 'drop'].forEach((ev) =>
  slot.addEventListener(ev, (e) => {
    e.preventDefault();
    slot.classList.remove('is-over');
  })
);
slot.addEventListener('drop', (e) => {
  const file = e.dataTransfer?.files?.[0];
  if (file) startGame(file);
});

slot.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    input.click();
  }
});

changeBtn.addEventListener('click', () => location.reload());

urlForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (urlInput.value.trim()) startFromUrl(urlInput.value.trim());
});

const romParam = new URLSearchParams(location.search).get('rom');
if (romParam) {
  urlInput.value = romParam;
  startFromUrl(romParam);
}
