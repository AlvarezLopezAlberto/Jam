'use strict';
/* ============================================================
   AGENTE que juega ¡ÁTOMO LOCO! sobre el engine headless.
   Una política parametrizada decide: taps, compras, colapsos
   (total / bomba parcial), calor, fusiones, novas y lab.
   ============================================================ */
const { Game, BUILDINGS, RECIPES, PARTICLES_PER_H } = require('./engine');

const HOUR = 3600, DAY = 86400;

const DEFAULTS = {
  name: 'base',
  tapRate: 6,                 // taps/s cuando está activo en el motor
  catchQuarks: true,
  /* horario: ciclo activo/offline (móvil: la app se cierra) */
  activeSec: 20*60,           // 20 min de sesión
  offlineSec: 100*60,         // 100 min cerrada
  /* compras */
  paybackHorizon: 600,        // compra si se paga sola en < N s de ingreso
  buyFrac: 0.6,               // no gastar más de esta fracción del banco por pasada
  /* colapso */
  collapseMode: 'total',      // 'total' | 'pump' | 'hybrid' | 'none'
  minPending: 1,              // espera a tener al menos N H para colapso total
  pumpProtonBudget: 0.5,      // fracción del banco a quemar en protones antes de bombear
  /* estrella */
  heatWhenBank: 3,            // vierte cuando el banco cubre N× el costo hasta la meta
  useSurge: true,
  targetRecipe: 'auto',       // sube la escalera
  hReserve: 0,                // H que nunca fusiona (calor pasivo / botín de nova)
  fuseChain: true,            // encadena He→C→…→Fe cada visita
  novaAsap: true,
  novaMinAtoms: 0,            // espera a tener N átomos para más ✦/botín
  starShare: 0.35,            // fracción del tiempo activo en la pantalla estrella
};

/* costo integral de subir la temperatura de T0 a T1 (sin surge) */
function heatBudget(T0, T1){
  if(T1 <= T0) return 0;
  return 50/3 * (Math.pow(T1+1,3) - Math.pow(T0+1,3));
}

class Agent {
  constructor(game, policy){
    this.g = game;
    this.p = Object.assign({}, DEFAULTS, policy);
    this.tapAcc = 0;
    this.milestones = {};       // nombre → t
  }

  mark(name){
    if(this.milestones[name] === undefined) this.milestones[name] = this.g.t;
  }

  /* ingreso efectivo ⚡/s: pasivo + taps (con duty de fiebre) */
  effIncome(){
    const g = this.g, p = this.p;
    const feverDuty = p.tapRate >= 4 ? 8/10.8 : 0;
    const tapAvg = g.tapValue() / (g.feverOn()?5:1) * (1 + 4*feverDuty);
    return g.eps() + (1-p.starShare) * p.tapRate * tapAvg;
  }

  /* Δ ingreso efectivo por segundo si compro 1 unidad de b */
  incomeDelta(b){
    const g = this.g, p = this.p;
    const dutyMotor = (1 - p.starShare);
    const income = () => {
      /* promedio: eps + taps con duty de fiebre (~8s cada ~10.8s tapeando) */
      const feverDuty = p.tapRate >= 4 ? 8/10.8 : 0;
      const tapAvg = g.tapValue() / (g.feverOn()?5:1) * (1 + 4*feverDuty);
      return g.eps() + dutyMotor * p.tapRate * tapAvg;
    };
    const before = income();
    g.S.counts[b.id]++;
    const after = income();
    g.S.counts[b.id]--;
    return after - before;
  }

  buyPass(){
    const g = this.g, p = this.p;
    const floorBank = g.S.e * (1 - p.buyFrac);
    for(let guard=0; guard<200; guard++){
      let best = null, bestRatio = 0;
      for(const b of BUILDINGS){
        if(g.S.total < b.baseCost*0.4) continue;      // aún oculto
        const c = g.costOf(b);
        if(c > g.S.e - floorBank && c > g.S.e) continue;
        const d = this.incomeDelta(b);
        /* valor extra del protón/neutrón: alimenta el bono de colapso */
        const ratio = d / c;
        if(ratio > bestRatio){ bestRatio = ratio; best = b; }
      }
      if(!best) break;
      const c = g.costOf(best);
      if(c > g.S.e) break;
      const d = this.incomeDelta(best);
      const incomeNow = g.eps() + (1-p.starShare)*p.tapRate*g.tapValue();
      if(d <= 0) break;
      if(c / Math.max(d, 1e-9) > p.paybackHorizon && c > g.S.e*0.05) break;
      if(!g.buy(best.id)) break;
    }
  }

  /* --- colapso --- */
  maybeCollapse(){
    const g = this.g, p = this.p;
    if(p.collapseMode === 'none') return;
    const base = g.colapsoBase();
    if(base < 1) return;
    /* cadencia humana: un colapso (hold de 2-6 s) máx. cada N s activos */
    const cd = p.collapseCooldown ?? 90;
    if(this.lastCollapseAt !== undefined && g.activeSeconds - this.lastCollapseAt < cd) return;
    /* compuerta de valor: colapsar destruye el banco. Si hay un proyecto de
       calor activo, primero gasta el banco (verter/comprar) y colapsa después. */
    const pend = g.pendingH();
    const relGain = 0.1*pend / g.prestigeMult();
    const target = g.S.elements.H ? this.targetRecipe() : null;
    const heatNeed = target ? heatBudget(g.S.temp, target.temp) : 0;
    if(heatNeed > 0){
      const bankSpent = g.S.e < this.effIncome()*45;
      if(!bankSpent && relGain < (p.relGainMin ?? 0.005)*10) return;
    }else{
      const fuelHungry = g.atomsOf('H') < (p.hFuelLow ?? 2000);
      if(relGain < (p.relGainMin ?? 0.005) && !fuelHungry) return;
    }

    if(p.collapseMode === 'total' || p.collapseMode === 'hybrid'){
      const pend = g.pendingH();
      if(pend >= p.minPending){
        /* costo en tiempo del hold */
        const N = pend;
        g.activeSeconds += g.holdTimeFor(N, N);
        g.colapsoTotal();
        this.lastCollapseAt = g.activeSeconds;
        this.mark('primerColapso');
        return;
      }
    }
    if(p.collapseMode === 'pump' || p.collapseMode === 'hybrid'){
      /* BOMBA PARCIAL: compra protones baratos → asegura k segmentos
         con round(k*B/N)==0 → hBase NO sube → repetible.  */
      const budget = g.S.e * p.pumpProtonBudget;
      let spent = 0;
      const pb = BUILDINGS[0]; // proton
      while(spent + g.costOf(pb) <= budget && g.S.total >= pb.baseCost*0.4){
        const c = g.costOf(pb);
        if(!g.buy('proton')) break;
        spent += c;
      }
      const B = g.colapsoBase();
      const N = B + g.colapsoBonus();
      if(N < 2) return;
      /* mayor k tal que round(k*B/N) === 0  →  k < N/(2B) */
      let k = Math.ceil(N/(2*B)) - 1;
      while(k >= 1 && Math.round(k*B/N) !== 0) k--;
      if(k >= 1){
        g.activeSeconds += g.holdTimeFor(k, N);
        g.colapsoPartial(k);
        this.lastCollapseAt = g.activeSeconds;
        this.mark('primerColapso');
      }else if(p.collapseMode === 'pump'){
        /* sin margen: colapso total de respaldo */
        g.activeSeconds += g.holdTimeFor(N, N);
        g.colapsoTotal();
        this.lastCollapseAt = g.activeSeconds;
        this.mark('primerColapso');
      }
    }
  }

  /* --- estrella: receta objetivo y calor --- */
  targetRecipe(){
    const g = this.g;
    /* prioridad: el peldaño MÁS BARATO aún no descubierto (subir la escalera);
       si toda la escalera está, apunta al Fe (núcleo de nova) */
    for(const r of RECIPES){
      if(!g.S.elements[r.out] && g.recipeVisible(r)) return r;
    }
    let target = null;
    for(const r of RECIPES){
      if(g.recipeVisible(r)) target = r;
    }
    return target;
  }

  /* receta que produce `sym` (o null) */
  recipeFor(sym){ return RECIPES.find(r=>r.out===sym) || null; }

  /* fabrica hasta `qty` de `sym` recursivamente (fusiona insumos si hacen falta).
     Devuelve cuántos logró. Respeta la reserva de H. */
  make(sym, qty, depth=0){
    const g = this.g, p = this.p;
    if(depth > 16) return 0;
    const rsv0 = (this.g.S.elements.Fe ? p.hReserve : 0);
    let have = g.atomsOf(sym) - (sym==='H' ? rsv0 : 0);
    if(have >= qty) return qty;
    const r = this.recipeFor(sym);
    if(!r || g.S.temp < r.temp) return Math.max(0, have);
    let guard = 0;
    while(have < qty && guard++ < 10000){
      /* asegura insumos de UNA corrida */
      let ok = true;
      for(const k in r.in){
        const got = this.make(k, r.in[k], depth+1);
        if(got < r.in[k]){ ok = false; break; }
      }
      if(!ok) break;
      if(g.fuse(r, 1) < 1) break;
      have = g.atomsOf(sym) - (sym==='H' ? rsv0 : 0);
    }
    return Math.max(0, Math.min(qty, have));
  }

  fusePass(){
    const g = this.g, p = this.p;
    if(!p.fuseChain) return;
    /* 1) descubre lo más alto alcanzable: intenta 1 unidad de cada peldaño
       de arriba hacia abajo (descubrimiento = +25% permanente) */
    for(let i=RECIPES.length-1; i>=0; i--){
      const r = RECIPES[i];
      if(g.S.elements[r.out]) continue;
      if(!g.recipeVisible(r)) continue;
      if(g.S.temp < r.temp) continue;
      this.make(r.out, 1);
      if(g.S.elements.Fe) this.mark('hierro');
    }
    /* 2) núcleo de Fe para la nova — ANTES del farmeo (usa stock de Cr/He) */
    const feR = this.recipeFor('Fe');
    if(g.S.elements.Fe && !g.novaReady() && g.S.temp >= feR.temp){
      const faltan = g.novaFeNeeded() - g.atomsOf('Fe');
      if(faltan > 0){
        if(faltan <= 4000) this.make('Fe', g.novaFeNeeded());
        else this.ladderFarm(feR, faltan);
      }
    }
    /* 3) hoard: con el núcleo de Fe listo y un objetivo de botín, NO quemes
       H — déjalo acumular para el novaGain (√átomos, tope 2(novas+1)) */
    if(p.novaMinAtoms && g.novaReady()){
      const atoms = Object.values(g.S.atoms).reduce((a,b)=>a+(b||0),0);
      /* 'cap' = acumula justo para saturar el tope de dust de ESTA nova */
      const goal = p.novaMinAtoms === 'cap'
        ? 200*Math.pow(2*(g.S.novas+1)-1, 2) : p.novaMinAtoms;
      if(atoms < goal) return;
    }
    /* 4) farmea la MEJOR receta con refund alcanzable — POR LOTES.
       Escalera: cada unidad de un peldaño i cuesta (3+i) He = 4(3+i) H. */
    let best = null, bestVal = 0;
    for(const r of RECIPES){
      if(!g.recipeVisible(r) || g.S.temp < r.temp || r.refund<=0) continue;
      if(r.refund > bestVal){ bestVal = r.refund; best = r; }
    }
    if(best) this.ladderFarm(best);
  }

  /* farmeo por lotes del peldaño `target` de la escalera (o He/N) */
  ladderFarm(target, capUnits = 20000){
    const g = this.g, p = this.p;
    const CHAIN = ['C','O','Ne','Mg','Si','S','Ar','Ca','Ti','Cr','Fe'];
    const rsv = g.S.elements.Fe ? p.hReserve : 0;
    const availH = () => g.atomsOf('H') - rsv;
    if(target.out === 'He'){
      const n = Math.min(capUnits, Math.floor(availH()/4));
      if(n>0) g.fuse(target, n);
      return;
    }
    if(target.out === 'N'){
      const heR = this.recipeFor('He'), cR = this.recipeFor('C');
      const n = Math.min(capUnits, Math.floor(availH()/13));
      if(n<1) return;
      g.fuse(heR, Math.max(0, 3*n - Math.max(0,g.atomsOf('He'))));
      g.fuse(cR, Math.max(0, n - g.atomsOf('C')));
      g.fuse(target, Math.min(n, g.atomsOf('C'), availH()));
      return;
    }
    const idx = CHAIN.indexOf(target.out);
    if(idx < 0) return;
    const hePerUnit = 3 + idx;              // C=3He, +1 He por peldaño
    const hPerUnit = 4 * hePerUnit;
    let n = Math.min(capUnits, Math.floor(availH()/hPerUnit));
    if(n < 1) return;
    /* He en lote (usa stock existente primero) */
    const heNeed = Math.max(0, hePerUnit*n - g.atomsOf('He'));
    const heR = this.recipeFor('He');
    if(heNeed > 0) g.fuse(heR, heNeed);
    n = Math.min(n, Math.floor(g.atomsOf('He')/hePerUnit) + (g.atomsOf(target.out)?0:0));
    if(n < 1) return;
    /* sube la escalera en lotes */
    const cR = this.recipeFor('C');
    const cNeed = Math.max(0, n - g.atomsOf('C'));
    if(cNeed > 0) g.fuse(cR, cNeed);
    let carry = Math.min(n, g.atomsOf('C'));
    for(let i=1; i<=idx && carry>0; i++){
      const r = this.recipeFor(CHAIN[i]);
      if(g.S.temp < r.temp) return;
      carry = g.fuse(r, carry);
    }
  }

  starActive(dt){
    const g = this.g, p = this.p;
    const target = this.targetRecipe();
    if(!target) return;
    const need = heatBudget(g.S.temp, target.temp);
    if(need <= 0) return;
    if(g.surgeOn()){
      g.pourHold(dt);
    }else if(p.useSurge){
      /* tapea para cargar la sobrecarga (8 por tap, ~13 taps) */
      const taps = Math.floor(p.tapRate * dt);
      for(let i=0;i<taps;i++) g.pourTap();
    }else{
      g.pourHold(dt);
    }
  }

  maybeNova(){
    const g = this.g, p = this.p;
    if(!g.novaReady()) return;
    if(!p.novaAsap) return;
    const atoms = Object.values(g.S.atoms).reduce((a,b)=>a+(b||0),0);
    const goal = p.novaMinAtoms === 'cap'
      ? 200*Math.pow(2*(g.S.novas+1)-1, 2) : p.novaMinAtoms;
    if(atoms < goal) return;
    g.activeSeconds += 2.8;
    g.supernova();
    this.mark('nova'+g.S.novas);
  }

  maybeLab(){
    const g = this.g;
    while(g.labUnlocked() && g.nextLab() && g.S.e >= g.labCost()*1.2){
      g.labSynth();
    }
  }

  /* --- un segundo de juego ACTIVO --- */
  activeSecond(){
    const g = this.g, p = this.p;
    const DT = 0.25;
    const onStar = g.S.elements.H && (this.starTimer = ((this.starTimer||0)+1)) % 100 < p.starShare*100;
    for(let i=0;i<4;i++){
      if(!onStar){
        /* motor: tapear + quark */
        this.tapAcc += p.tapRate * DT;
        const n = Math.floor(this.tapAcc);
        if(n > 0){ this.tapAcc -= n; g.tapMotor(n); }
        if(p.catchQuarks && g.quarkAlive && (g.t - g.quarkT0) > 0.8){
          g.catchQuark();
        }
      }else{
        this.starActive(DT);
      }
      g.step(DT);
    }
    g.activeSeconds += 1;
    /* decisiones 1/s (fusión pesada: cada 5 s) */
    this.buyPass();
    this.maybeCollapse();
    this.fuseTimer = (this.fuseTimer||0) + 1;
    if(g.S.temp >= 10 && this.fuseTimer >= 5){
      this.fuseTimer = 0;
      this.fusePass();
    }
    this.maybeNova();
    this.maybeLab();

    /* hitos */
    if(!isFinite(g.S.total) || !isFinite(g.S.hEver)) this.mark('roto');
    if(g.S.hEver >= 1) this.mark('H1');
    if(g.S.hEver >= 10) this.mark('H10');
    if(g.S.hEver >= 100) this.mark('H100');
    if(g.S.elements.He) this.mark('helio');
    if(g.S.elements.Fe) this.mark('hierro');
    if(g.forgedCount() >= 17) this.mark('elem17');
    if(g.forgedCount() >= 92) this.mark('nat92');
    if(g.forgedCount() >= 118) this.mark('all118');
  }

  /* juega `horizon` segundos siguiendo el horario */
  play(horizon, snapshotEvery = HOUR){
    const g = this.g, p = this.p;
    const snaps = [];
    let nextSnap = 0;
    while(g.t < horizon){
      if(this.milestones.roto !== undefined){ g.t = horizon; break; }   // juego NaN: nada más que medir
      /* sesión activa */
      const sessionEnd = g.t + p.activeSec;
      while(g.t < sessionEnd && g.t < horizon){
        this.activeSecond();
        if(g.t >= nextSnap){ snaps.push(g.snapshot()); nextSnap += snapshotEvery; }
      }
      if(this.milestones.roto !== undefined){ g.t = horizon; break; }
      if(g.t >= horizon) break;
      /* cierre de la app */
      if(p.offlineSec > 0){
        g.offline(Math.min(p.offlineSec, horizon - g.t));
        /* al volver: decisiones inmediatas */
        this.buyPass(); this.maybeCollapse(); this.fusePass(); this.maybeNova(); this.maybeLab();
        if(g.t >= nextSnap){ snaps.push(g.snapshot()); nextSnap += snapshotEvery; }
      }
    }
    snaps.push(g.snapshot());
    return { snaps, milestones: this.milestones };
  }
}

module.exports = { Agent, DEFAULTS, heatBudget, HOUR, DAY };
