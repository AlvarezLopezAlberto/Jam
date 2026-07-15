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
2. **Compra potenciadores de la nebulosa** (barra inferior, estilo Mucho Taco — cada uno con física real detrás):
   - Protón `15⚡` → +1/s (su masa calienta la nube por contracción gravitatoria)
   - Electrón `100⚡` → +1 por tap (tus taps los excitan y reemiten radiación)
   - Onda de choque `1.5K⚡` → +10% a TODO (las supernovas vecinas comprimen la nebulosa — el disparador real del colapso)
   - Neutrón `12K⚡` → +30/s (masa pesada)
   - Protoestrella `200K⚡` → +400/s (un núcleo denso que ya arde)
3. **Combo → FUSIÓN**: taps rápidos llenan la barra; al 100% → 8s de ×5 con pantalla en modo fiebre.
4. **Quark dorado**: cruza la pantalla cada 45–105s → ráfaga de energía o FRENESÍ ×7 por 20s.
5. **☀ COLAPSO (prestigio)**: a 1M de energía total la nebulosa puede colapsar → tus protones y neutrones **se convierten en átomos de HIDRÓGENO** (así nacen las estrellas). `H = floor((total/1e6)^¼) + floor((protones+neutrones)/25)`. Cada H ganado da +10% permanente (sobre el total ganado en la vida — gastarlo nunca te debilita). *(Raíz 4ª, no cuadrada: con sqrt el juego óptimo ganaba millones de H/hora y divergía — verificado con el agente de `sim/`.)*
6. **⭐ ESTRELLA (pantalla 2, la meta)**: administra el calor y fusiona la tabla periódica con **nucleosíntesis real**:
   - **Temperatura**: mantén 🔥 CALENTAR para verter energía (costo ≈ 50·T² por grado). Se **enfría a la mitad cada 10 h** (también offline), pero cada receta nueva sube tu **piso permanente** al 75% de su umbral ("núcleo degenerado").
   - **Recetas** (consumen átomos, exigen M°, y DEVUELVEN energía — la fusión es exotérmica): 4H→He (10 M°), triple-alfa 3He→C (100 M°), ciclo CNO C+H→N, y la escalera alfa C→O→Ne→Mg→Si→S→Ar→Ca→Ti→Cr→**Fe** (17K M°, reembolso 0: *el hierro no paga, por eso mueren las estrellas*). El reembolso es energía **utilizable pero no cuenta para el colapso** (si contara, fusionar "criaba" H gratis y el prestigio se rompía).
   - El calor retroalimenta al motor (+0.5% ⚡/s por M°) **con tope en 17000 M°** (×86): más allá del hierro, calentar ya no rinde.
   - **Li/Be/B** no se fusionan: solo el 🌠 rayo cósmico (quark dorado) los crea por **espalación**, partiendo un C u O tuyo — como en el universo real.
   - Cada elemento descubierto: **+25% a todo, multiplicativo y permanente** (17 elementos = ×44). El calor además da +0.5% de energía/s por M°. El núcleo del motor evoluciona de nebulosa rosa → estrella joven → madura → gigante azul según lo que fundas.
7. **Offline**: al volver, tus partículas produjeron al 50% (cap 6h) con modal de bienvenida.

## Las tres pantallas

- **⚛ MOTOR** — la nebulosa: núcleo, taps, tienda de partículas, quark dorado, colapso. La acción.
- **⭐ ESTRELLA** — la forja visual: una estrella pixel art viva (color por temperatura, capas de cebolla por receta dominada, corona pulsante). La fusión se entiende **sin texto**: el reactor muestra la receta como pictograma (4 bolitas H → bolita He), el gauge lleva un tick de color con la meta térmica de la receta elegida, y al fusionar los átomos VUELAN al núcleo, flash, y el producto sale disparado. Feedback de error también visual: frío = gauge parpadea azul; faltan átomos = las bolitas tiemblan en rojo.
- **🧪 TABLA** — la colección: **los 118 elementos**, coloreados por categoría química (alcalinos, transición, lantánidos…). Cada tile no descubierto muestra un icono de DÓNDE se consigue (🌠 rayo cósmico / 💥 supernova / 🔬 laboratorio / ? fusión). Tap en un tile = ficha del elemento con su origen.

## Cómo se consiguen los 118 (nucleosíntesis real)

| Bloque | Elementos | Cómo |
|---|---|---|
| Big Bang / colapso | H | ☀ COLAPSO de la nebulosa |
| Rayos cósmicos | Li, Be, B | 🌠 espalación (quark dorado) |
| Fusión estelar | escalera alfa He→Fe | recetas de la ⭐ ESTRELLA |
| Subproductos de quema | F, Na, Al, P, Cl, K, Sc, V, Mn | 25% de chispa al fusionar su vecino |
| Supernova | Z 27–92 (Co→U, 66 elementos) | 💥 cada explosión suelta `2+✦+novas previas` aleatorios |
| Laboratorio humano | Z 93–118 (Np→Og, 26 sintéticos) | 🔬 se abre con los 92 naturales; costo ⚡10T ×2 c/u |

Bono por descubrimiento: +25% los primeros 17, +10% del 18 en adelante (multiplicativo). La tabla completa: **×2 extra permanente**.

## El lenguaje táctil (igual en todas las pantallas)

**TAP = acción · MANTENER = evento cósmico.**
- Motor: tap al átomo = energía · **mantener el átomo** = COLAPSO **segmentado**: el anillo se divide en N segmentos (1 por H pendiente). Soltar antes = **colapso parcial** (solo intercambias los H asegurados: se consumen sus 25 partículas c/u y tu energía/maquinaria sobrevive). Completar la circunferencia = colapso total clásico (todo se convierte). La carga se frena hacia el final (easing) para darte tiempo de decidir, y las partículas absorbidas (protones rosas, neutrones morados) crecen en intensidad — cada segmento cruzado suena, vibra y suelta un "+1 H".

## Calor pasivo: el hidrógeno es combustible

Cada átomo de H genera calor pasivo (escala **√H × 1.5e-4 M°/s** — equilibrio ≈ √H × 7.8 M° sobre el piso, se acumula en horas: es el mecanismo idle, **y también corre offline**: al volver, la temperatura se resuelve con la forma cerrada del equilibrio calor/enfriamiento). Solo el H lo hace, como en las estrellas de secuencia principal — y crea el tradeoff central: fusionar 4H→He te da elementos pero **consume tus calentadores**. El gauge lo indica: `▲` vertiendo energía · `♨` el H sostiene el calor · `▼` enfriándose.
- Estrella: tap a la estrella = inyectar calor · **mantener la estrella** (cuando el badge 💥 está listo) = SUPERNOVA.
- La fusión vive en un **bottom sheet** arrastrable: asomado muestra el botón FUSIONAR; ampliado, el reactor pictográfico y los chips de recetas.

## 💥 Supernova (prestigio mayor)

Exige un **núcleo de hierro de ESTA generación**: la nova N necesita `2^(N−1) Fe` fusionados (1, 2, 4, 8… — cada explosión es más difícil, completar la tabla es una gesta). Con el núcleo listo, la estrella se vuelve gigante roja inestable; **mantén presionada la estrella** para cargarla (2.8s, anillo de progreso + materia cayendo) y detonarla: **cinemático estilo Outer Wilds** — implosión temblando, flash blanco, ondas de choque en bandas de color y ~170 escombros con los colores de TUS elementos descubiertos, y la protoestrella renaciendo. Pierdes energía/partículas/átomos/calor (piso térmico conserva 25%), conservas la colección, ganas **✦ Polvo Estelar** (+75% c/u; el botín escala con la **raíz** de tus átomos acumulados y tiene tope `2×(novas+1)` — sin ese tope, acumular H hacía el polvo exponencial y el juego divergía) y `2+✦` elementos pesados del pool natural.

## Hoja de ruta (Los Tres Actos)

Rediseño en curso hacia **nucleosíntesis estelar real** (ver plan de los tres actos):
1. **Acto 1 — Nebulosa** ✅: Protium→Hidrógeno, prestigio→Colapso (entregas tus partículas).
2. **Acto 2 — Estrella** ✅: temperatura con enfriamiento (vida media 10h, piso permanente), recetas de fusión reales (4H→He, 3He→C, escalera alfa hasta Fe), Li/Be/B por rayos cósmicos.
3. **Acto 3 — Supernova** ✅: prestigio mayor al llegar al hierro; Polvo Estelar + elementos pesados (r-process). Incluye el rediseño a 3 pantallas con la estrella como escena visual de fusión.

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
