# ¡ÁTOMO LOCO! ⚛️

Clicker/idle mobile-first en pixel art, basado en las mecánicas de
[Elemental Incremental](https://superspruce.github.io/Elemental-Incremental/)
destilado al loop adictivo de Cookie Clicker / Mucho Taco. Una sola pantalla,
cero assets externos, carga instantánea.

## Cómo correr

Es 100% estático — cualquier servidor sirve:

```
python -m http.server 8123
# → http://localhost:8123
```

O súbelo tal cual a GitHub Pages / Netlify. En móvil: "Añadir a pantalla de inicio"
lo abre fullscreen (meta apple-mobile-web-app).

## El loop

1. **TAP al átomo** → +energía (números flotantes, partículas, squash, blip que sube de tono con el combo).
2. **Compra partículas** (barra inferior, estilo Mucho Taco):
   - Protón `15⚡` → +1/s (ingreso pasivo)
   - Electrón `100⚡` → +1 por tap
   - Neutrino `1.5K⚡` → +10% a TODO
   - Neutrón `12K⚡` → +30/s
   - Reactor `200K⚡` → +400/s
3. **Combo → FUSIÓN**: taps rápidos llenan la barra; al 100% → 8s de ×5 con pantalla en modo fiebre.
4. **Quark dorado**: cruza la pantalla cada 45–105s → ráfaga de energía o FRENESÍ ×7 por 20s.
5. **☀ COLAPSO (prestigio)**: a 1M de energía total la nebulosa puede colapsar → tus protones y neutrones **se convierten en átomos de HIDRÓGENO** (así nacen las estrellas). `H = floor(sqrt(total/1e6)) + floor((protones+neutrones)/25)`. Cada H ganado da +10% permanente (sobre el total ganado en la vida — gastarlo nunca te debilita).
6. **Elementos (pantalla ⭐ ESTRELLA, la meta)**: con H forjas la tabla periódica **en orden** — H(1) → He(3) → Li(6) → … → Ne(95). Cada elemento: **+25% a todo, multiplicativo y permanente** (los 10 = ×9.3). El halo del núcleo toma el color del último elemento forjado, y un punto rosa pulsa en el tab cuando puedes forjar.
7. **Offline**: al volver, tus partículas produjeron al 50% (cap 6h) con modal de bienvenida.

## Las dos pantallas

- **⚛ MOTOR** — la nebulosa: núcleo, taps, tienda de partículas, quark dorado, colapso. La acción.
- **⭐ ESTRELLA** — la colección/meta: grid de elementos estilo tabla periódica, cartera de H, progreso y multiplicador total. El motivo para volver.

## Hoja de ruta (Los Tres Actos)

Rediseño en curso hacia **nucleosíntesis estelar real** (ver plan de los tres actos):
1. **Acto 1 — Nebulosa** ✅: Protium→Hidrógeno, prestigio→Colapso (entregas tus partículas).
2. **Acto 2 — Estrella**: temperatura con enfriamiento (vida media 10h, piso permanente), recetas de fusión reales (4H→He, 3He→C, escalera alfa hasta Fe), Li/Be/B por rayos cósmicos.
3. **Acto 3 — Supernova**: prestigio mayor al llegar al hierro; Polvo Estelar + elementos pesados (r-process).

## Psicología aplicada (la investigación → el diseño)

| Principio (Cookie Clicker/Mucho Taco) | Implementación aquí |
|---|---|
| Skinner box: feedback inmediato por acción | Número flotante + burst de partículas + sonido + squash + vibración háptica en CADA tap |
| Recompensa variable (golden cookie) | Quark dorado con recompensa aleatoria (50/50 ráfaga o frenesí) |
| Automatización satisfactoria (las abuelas) | Protones/neutrones/reactor produciendo solos, visibles orbitando el núcleo |
| Meta siempre a 30s | Costos ×1.15; ítems se revelan como "???" al acercarte (curiosity gap) |
| Progreso visible | El núcleo CRECE con tus compras; cada tipo de partícula añade un anillo orbital |
| Prestigio | Protium: +10% permanente, botón dorado pulsante cuando está disponible |
| Sesión corta con clímax | Modo FUSIÓN (combo) = subidón cada ~1 min de juego activo |
| Retención | Ganancias offline + logros toast (14) |

## Stack / rendimiento

- Vanilla JS + Canvas a **180px de ancho lógico** escalado con `image-rendering: pixelated`
  → pixel art real y dibujado baratísimo (mobile 60fps).
- Pixel art 100% procedural (núcleo, órbitas, estrellas, iconos, quark) — **cero requests de imágenes**.
- Audio sintetizado con WebAudio — cero archivos de sonido.
- Única dependencia externa: fuente *Press Start 2P* (Google Fonts, `display=swap`).
- Save en localStorage (autosave 10s + al ocultar pestaña).

## Archivos

- `index.html` — estructura (HUD, stage, tienda, modales)
- `style.css` — tema pixel (paleta rosa/cian/amarillo sobre morado), animaciones CSS
- `game.js` — todo el juego (~600 líneas)

## Ideas siguientes (post-MVP)

- Deuterium como segunda capa de prestigio (protones+neutrones), sinergia Protium×Deuterium como el original
- Upgrades puntuales (no repetibles) para decisiones estratégicas
- Skins del núcleo por hitos (H → He → Li… tabla periódica como colección)
- Sonido de fondo chiptune con toggle separado
