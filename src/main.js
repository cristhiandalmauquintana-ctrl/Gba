// Emulador GBA en el navegador usando EmulatorJS (núcleo mGBA).
// El ROM lo elige la persona usuaria y se carga localmente como blob: nunca se sube a ningún sitio.

const DATA_PATH = 'https://cdn.emulatorjs.org/stable/data/';

const input = document.getElementById('rom-input');
const slot = document.getElementById('slot');
const picker = document.getElementById('picker');
const stage = document.getElementById('stage');
const errorBox = document.getElementById('error');
const changeBtn = document.getElementById('change');

const VALID = /\.(gba|zip|7z)$/i;

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.hidden = false;
}

function startGame(file) {
  errorBox.hidden = true;

  if (!VALID.test(file.name)) {
    showError('Ese archivo no parece un ROM de GBA. Elige un .gba (o un .zip que lo contenga).');
    return;
  }

  const url = URL.createObjectURL(file);

  picker.hidden = true;
  stage.hidden = false;

  // Configuración global que lee el loader de EmulatorJS
  window.EJS_player = '#game';
  window.EJS_core = 'gba';
  window.EJS_gameUrl = url;
  window.EJS_gameName = file.name.replace(/\.[^.]+$/, '');
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

// Arrastrar y soltar
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

// Accesibilidad: abrir el selector con Enter/Espacio
slot.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    input.click();
  }
});

// EmulatorJS no se puede reiniciar limpiamente, así que recargamos la página
changeBtn.addEventListener('click', () => location.reload());
