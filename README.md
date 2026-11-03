# Emulador GBA en el navegador

Emulador de Game Boy Advance que corre 100 % en el navegador (EmulatorJS + mGBA).
Cada persona elige su propio archivo `.gba`; el archivo se queda en su equipo y no se sube a ningún servidor.

## Probar en StackBlitz

1. Sube este proyecto a GitHub.
2. Abre `https://stackblitz.com/github/TU_USUARIO/TU_REPO`.

## Ejecutar en local

```bash
npm install
npm run dev
```

## Publicar en GitHub Pages

```bash
npm run build
```

Publica la carpeta `dist` (por ejemplo con la acción `actions/deploy-pages`).

## Controles

| GBA | Teclado |
|-----|---------|
| Cruceta | Flechas |
| A / B | X / Z |
| Start / Select | Enter / Shift |

En móvil aparecen controles táctiles automáticamente.

## Aviso legal

Este repositorio **no incluye ROMs** y no debe incluirlas (el `.gitignore` bloquea `*.gba`).
Usa solo juegos que poseas legítimamente. Para demos públicas, usa ROMs homebrew de libre distribución.

Pokémon y los nombres de juegos son marcas de sus respectivos propietarios; este proyecto no está afiliado a ellos.
