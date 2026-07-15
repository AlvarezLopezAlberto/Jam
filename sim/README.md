# sim/ — agente que juega ¡Átomo Loco! para balancearlo

Simulador headless + agente jugador. Se usó para encontrar las estrategias que
rompían el juego (pre-balance divergía a `Infinity/NaN` en ~90 min de juego
óptimo) y para verificar los fixes.

## Uso

```bash
node sim/run.js 7 1,2        # compara estrategias: 7 días simulados, seeds 1 y 2
node sim/trace.js '{"name":"x","collapseMode":"total"}' 12   # traza 12 h activas
```

## Archivos

- **engine.js** — réplica 1:1 de las reglas de `game.js` sin DOM (edificios,
  fiebre, quark, colapso total/parcial, calor/surge, recetas, novas, lab,
  offline). ⚠️ Las constantes están duplicadas: **si cambias balance en
  `game.js`, espejéalo aquí**.
- **agent.js** — política parametrizada: taps/s, compras greedy por Δingreso/costo,
  timing de colapso (total / "bomba parcial" / híbrido), goteo de calor con
  sobrecarga, fusión por lotes subiendo la escalera alfa, farmeo de refunds,
  novas y laboratorio. Horario humano: sesiones activas + app cerrada.
- **run.js** — enfrenta estrategias y saca tabla de hitos (mediana por seeds).
  La columna `ROTO` marca si el estado llegó a `Infinity/NaN`.
- **trace.js** — snapshots de un run para depurar curvas.

## Qué encontró (resumen)

| Exploit | Mecanismo | Fix aplicado |
|---|---|---|
| Cadena de novas | `dust = atoms/200` lineal sin tope → exponencial | raíz + tope `2(novas+1)` |
| Bomba parcial | `round(k·B/N)=0` → H sin subir `hBase` | `max(1, …)` |
| Breeder de refunds | refund sumaba a `total` → H gratis hasta hBase≈2000 | refund solo a `e` |
| Horno infinito | `tempMult` sin tope → eps ∝ ∛banco | tope en 17000 M° |
| Treadmill de colapso | `sqrt(total)` → ingreso de H ∝ todos los mults | raíz 4ª |
| Fe trivial | `(novas+1)²` no seguía el ritmo del H | `2^novas` |
| Muro del lab | `×5^n` → Og costaba 3e30 ⚡ | `×2^n` |
