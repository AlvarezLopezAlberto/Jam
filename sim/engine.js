'use strict';
/* ============================================================
   ENGINE headless de ¡ÁTOMO LOCO! — réplica exacta de las
   reglas de game.js (sin DOM/canvas/audio) para que un agente
   pueda jugar millones de segundos simulados.
   Cada fórmula está copiada 1:1 de game.js — si cambias el
   balance allí, cámbialo aquí (o mejor: extrae constantes).
   ============================================================ */

/* ---------- constantes (espejo de game.js) ---------- */
const BUILDINGS = [
  { id:'proton',   baseCost:15,     eps:1,    tap:0, mult:0 },
  { id:'electron', baseCost:100,    eps:0,    tap:1, mult:0 },
  { id:'neutrino', baseCost:1500,   eps:0,    tap:0, mult:.10 },
  { id:'neutron',  baseCost:12000,  eps:30,   tap:0, mult:0 },
  { id:'fusion',   baseCost:200000, eps:400,  tap:0, mult:0 },
];
const COST_GROWTH = 1.15;
const PRESTIGE_UNIT = 1e6;
const PARTICLES_PER_H = 25;
const FEVER_MS = 8000;
const SURGE_MS = 6000;
const COOL_HALFLIFE_S = 36000;
const HEAT_K = 50;

const RECIPES = [
  { out:'He', in:{H:4},       temp:10,    refund:5e4 },
  { out:'C',  in:{He:3},      temp:100,   refund:4e5 },
  { out:'N',  in:{C:1,H:1},   temp:120,   refund:6e5 },
  { out:'O',  in:{C:1,He:1},  temp:200,   refund:1.6e6,   by:'F' },
  { out:'Ne', in:{O:1,He:1},  temp:350,   refund:6e6,     by:'Na' },
  { out:'Mg', in:{Ne:1,He:1}, temp:600,   refund:2.5e7,   by:'Al' },
  { out:'Si', in:{Mg:1,He:1}, temp:1000,  refund:1e8,     by:'P' },
  { out:'S',  in:{Si:1,He:1}, temp:1600,  refund:4e8,     by:'Cl' },
  { out:'Ar', in:{S:1,He:1},  temp:2600,  refund:1.6e9,   by:'K' },
  { out:'Ca', in:{Ar:1,He:1}, temp:4100,  refund:6.4e9,   by:'Sc' },
  { out:'Ti', in:{Ca:1,He:1}, temp:6600,  refund:2.56e10, by:'V' },
  { out:'Cr', in:{Ti:1,He:1}, temp:10500, refund:1e11,    by:'Mn' },
  { out:'Fe', in:{Cr:1,He:1}, temp:17000, refund:0 },
];

/* tabla mínima: solo necesitamos z/sym/origin para conteos y pools */
const ALPHA_OUTS = { He:1, C:1, N:1, O:1, Ne:1, Mg:1, Si:1, S:1, Ar:1, Ca:1, Ti:1, Cr:1, Fe:1 };
const BYPRODUCT_OF = { F:1, Na:1, Al:1, P:1, Cl:1, K:1, Sc:1, V:1, Mn:1 };
const SYMS = ['H','He','Li','Be','B','C','N','O','F','Ne','Na','Mg','Al','Si','P','S','Cl','Ar','K','Ca',
  'Sc','Ti','V','Cr','Mn','Fe','Co','Ni','Cu','Zn','Ga','Ge','As','Se','Br','Kr','Rb','Sr','Y','Zr',
  'Nb','Mo','Tc','Ru','Rh','Pd','Ag','Cd','In','Sn','Sb','Te','I','Xe','Cs','Ba','La','Ce','Pr','Nd',
  'Pm','Sm','Eu','Gd','Tb','Dy','Ho','Er','Tm','Yb','Lu','Hf','Ta','W','Re','Os','Ir','Pt','Au','Hg',
  'Tl','Pb','Bi','Po','At','Rn','Fr','Ra','Ac','Th','Pa','U','Np','Pu','Am','Cm','Bk','Cf','Es','Fm',
  'Md','No','Lr','Rf','Db','Sg','Bh','Hs','Mt','Ds','Rg','Cn','Nh','Fl','Mc','Lv','Ts','Og'];
const Z = {}; SYMS.forEach((s,i)=>Z[s]=i+1);
function originOf(sym){
  if(sym==='H') return 'colapso';
  if(sym==='Li'||sym==='Be'||sym==='B') return 'cosmic';
  if(ALPHA_OUTS[sym]) return 'fusion';
  if(BYPRODUCT_OF[sym]) return 'by';
  if(Z[sym]<=92) return 'nova';
  return 'lab';
}
const NOVA_POOL = SYMS.filter(s=>originOf(s)==='nova');       // 66 elementos
const LAB_ELEMENTS = SYMS.filter(s=>originOf(s)==='lab');     // 26 sintéticos

function heatCostPerDegree(T){ return HEAT_K * Math.pow(T+1, 2); }
function tempAfterSpend(T0, B){
  return Math.cbrt(Math.pow(T0+1, 3) + B*3/HEAT_K) - 1;
}

/* ---------- RNG con semilla (reproducible) ---------- */
function mulberry32(a){
  return function(){
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/* ---------- juego ---------- */
class Game {
  constructor(seed=1){
    this.rand = mulberry32(seed);
    const counts = {}; BUILDINGS.forEach(b=>counts[b.id]=0);
    this.S = {
      e:0, total:0, taps:0,
      hEver:0, hBase:0,
      atoms:{}, temp:0, tempFloor:0,
      dust:0, novas:0,
      quarks:0, fevers:0, surges:0,
      counts, elements:{}, seen:{},
    };
    this.t = 0;                    // reloj simulado (s)
    this.buffs = { feverUntil:0, frenzyUntil:0, surgeUntil:0 };
    this.heat = 0; this.lastTapT = -1e9;
    this.starHeat = 0; this.lastStarPourT = -1e9;
    this.quarkNext = 45 + this.rand()*60;   // scheduleQuark
    this.quarkAlive = false; this.quarkT0 = 0;
    this.log = [];                 // eventos con timestamp
    this.activeSeconds = 0;        // tiempo humano invertido
  }

  ev(kind, data){ this.log.push({ t:this.t, kind, data }); }

  /* --- derivados (espejo exacto) --- */
  cnt(id){ return this.S.counts[id]||0; }
  atomsOf(sym){ return this.S.atoms[sym]||0; }
  forgedCount(){ return Object.keys(this.S.elements).length; }
  costOf(b){ return Math.ceil(b.baseCost * Math.pow(COST_GROWTH, this.cnt(b.id))); }
  prestigeMult(){ return 1 + this.S.hEver*0.10; }
  elementsMult(){
    const n = this.forgedCount();
    return Math.pow(1.25, Math.min(n,17)) * Math.pow(1.10, Math.max(0, n-17));
  }
  dustMult(){
    const all = SYMS.every(s=>this.S.elements[s]);
    return (1 + 0.75*this.S.dust) * (all ? 2 : 1);
  }
  globalMult(){
    let m = 1;
    BUILDINGS.forEach(b=>{ if(b.mult) m += b.mult*this.cnt(b.id); });
    return m * this.prestigeMult() * this.elementsMult() * this.dustMult();
  }
  baseEps(){
    let e = 0; BUILDINGS.forEach(b=>{ e += b.eps*this.cnt(b.id); });
    return e;
  }
  frenzyOn(){ return this.t < this.buffs.frenzyUntil; }
  feverOn(){ return this.t < this.buffs.feverUntil; }
  surgeOn(){ return this.t < this.buffs.surgeUntil; }
  tempMult(){ return 1 + 0.005*Math.min(this.S.temp, 17000); }
  eps(){ return this.baseEps() * this.globalMult() * this.tempMult() * (this.frenzyOn()?7:1); }
  tapValue(){
    let t = 1; BUILDINGS.forEach(b=>{ t += b.tap*this.cnt(b.id); });
    return t * this.globalMult() * (this.feverOn()?5:1) * (this.frenzyOn()?7:1);
  }
  colapsoBase(){ return Math.floor(Math.pow(this.S.total / PRESTIGE_UNIT, 0.25)) - this.S.hBase; }
  colapsoBonus(){ return Math.floor((this.cnt('proton') + this.cnt('neutron')) / PARTICLES_PER_H); }
  pendingH(){ return this.colapsoBase() >= 1 ? this.colapsoBase() + this.colapsoBonus() : 0; }
  hGenRate(){ return Math.sqrt(this.atomsOf('H')) * 1.5e-4; }
  novaFeNeeded(){ return Math.pow(2, this.S.novas); }
  novaReady(){ return this.atomsOf('Fe') >= this.novaFeNeeded(); }
  novaGain(){
    const atomsTotal = Object.values(this.S.atoms).reduce((a,b)=>a+(b||0),0);
    return Math.min(1 + Math.floor(Math.sqrt(atomsTotal/200)), 2*(this.S.novas+1));
  }
  labUnlocked(){ return SYMS.filter(s=>Z[s]<=92).every(s=>this.S.elements[s]); }
  nextLab(){ return LAB_ELEMENTS.find(s=>!this.S.elements[s]); }
  labCost(){
    const done = LAB_ELEMENTS.filter(s=>this.S.elements[s]).length;
    return 1e13 * Math.pow(2, done);
  }

  discover(sym){
    if(this.S.elements[sym]) return;
    this.S.elements[sym] = 1;
    this.ev('discover', { sym, n:this.forgedCount() });
  }

  /* --- acciones del agente --- */
  buy(id){
    const b = BUILDINGS.find(x=>x.id===id);
    const c = this.costOf(b);
    /* la tienda revela con total >= baseCost*0.4 — el agente lo respeta */
    if(this.S.total < b.baseCost*0.4) return false;
    if(this.S.e < c) return false;
    this.S.e -= c;
    this.S.counts[id]++;
    return true;
  }

  /* n taps al átomo del motor durante dt (llama desde step activo) */
  tapMotor(n){
    for(let i=0;i<n;i++){
      const v = this.tapValue();
      this.S.e += v; this.S.total += v; this.S.taps++;
      /* addHeat */
      if(!this.feverOn()){
        this.heat = Math.min(100, this.heat + 6);
        if(this.heat >= 100){
          this.buffs.feverUntil = this.t + FEVER_MS/1000;
          this.S.fevers++; this.heat = 0;
        }
      }
      this.lastTapT = this.t;
    }
  }

  /* atrapar el quark si está vivo (el agente decide) */
  catchQuark(){
    if(!this.quarkAlive) return null;
    this.S.quarks++;
    this.quarkAlive = false;
    this.quarkNext = this.t + 45 + this.rand()*60;
    const missing = ['Li','Be','B'].filter(s=>!this.S.elements[s]);
    const fuel = this.atomsOf('C')>0 ? 'C' : (this.atomsOf('O')>0 ? 'O' : null);
    const roll = this.rand();
    if(missing.length && fuel && roll < 0.34){
      const target = missing[Math.floor(this.rand()*missing.length)];
      this.S.atoms[fuel]--;
      this.S.atoms[target] = this.atomsOf(target) + 1;
      this.S.seen.cosmic = 1;
      this.discover(target);
      return 'cosmic';
    }else if(roll < (missing.length && fuel ? 0.67 : 0.5)){
      const gain = Math.max(this.eps()*60, this.tapValue()*40);
      this.S.e += gain; this.S.total += gain;
      return 'energy';
    }else{
      this.buffs.frenzyUntil = this.t + 20;
      return 'frenzy';
    }
  }

  /* COLAPSO total */
  colapsoTotal(){
    const p = this.pendingH();
    if(p < 1) return 0;
    this.S.hBase += this.colapsoBase();
    this.S.atoms.H = (this.S.atoms.H||0) + p;
    this.S.hEver += p;
    this.discover('H');
    this.S.e = 0;
    BUILDINGS.forEach(b=>this.S.counts[b.id]=0);
    this.heat = 0; this.buffs.feverUntil = 0; this.buffs.frenzyUntil = 0;
    this.ev('colapsoTotal', { h:p, hEver:this.S.hEver });
    return p;
  }

  /* COLAPSO parcial: k segmentos asegurados (espejo de doColapsoPartial) */
  colapsoPartial(k){
    const B = Math.max(0, this.colapsoBase());
    const N = B + this.colapsoBonus();
    if(this.pendingH() < 1) return 0;
    k = Math.min(k, N);
    if(k < 1) return 0;
    const frac = k / N;
    const bt = Math.min(B, Math.max(1, Math.round(k * B / N)));
    this.S.hBase += bt;
    this.S.e = Math.floor(this.S.e * (1 - frac));
    BUILDINGS.forEach(b=>{ this.S.counts[b.id] -= Math.floor(this.cnt(b.id) * frac); });
    this.S.atoms.H = (this.S.atoms.H||0) + k;
    this.S.hEver += k;
    this.discover('H');
    this.ev('colapsoParcial', { k, N, bt, hEver:this.S.hEver });
    return k;
  }

  /* tiempo de hold necesario para asegurar k de N segmentos (segundos) */
  holdTimeFor(k, N){
    const dur = Math.min(6000, 1600 + N*120);
    const pNeeded = k / N;                       // seg cruzado cuando p*N >= k
    const x = 1 - Math.pow(1 - pNeeded, 1/1.8);  // invierte el easing
    return (350 + x*dur) / 1000;
  }

  /* tap a la estrella (pourChunk) */
  pourTap(){
    const budget = Math.min(this.S.e, Math.max(1500, this.eps()*1.2, this.S.e*0.04));
    if(budget <= 0) return;
    this.S.temp = tempAfterSpend(this.S.temp, budget * (this.surgeOn()?5:1));
    this.S.e -= budget;
    /* surgeCharge */
    if(!this.surgeOn()){
      this.starHeat = Math.min(100, this.starHeat + 8);
      this.lastStarPourT = this.t;
      if(this.starHeat >= 100){
        this.buffs.surgeUntil = this.t + SURGE_MS/1000;
        this.S.surges++; this.starHeat = 0;
      }
    }
  }

  /* mantener la estrella durante dt (heatTick) */
  pourHold(dt){
    const pour = Math.max(2000, this.eps()*8, this.S.e*0.35) * dt;
    const budget = Math.min(pour, this.S.e);
    if(budget <= 0) return;
    this.S.temp = tempAfterSpend(this.S.temp, budget * (this.surgeOn()?5:1));
    this.S.e -= budget;
  }

  canRun(r){
    if(this.S.temp < r.temp) return 'frio';
    for(const k in r.in) if(this.atomsOf(k) < r.in[k]) return 'atomos';
    return 'ok';
  }
  recipeVisible(r){ return Object.keys(r.in).every(k=>this.S.elements[k]); }

  fuse(r, times){
    if(!isFinite(times) || times < 1) return 0;
    /* lote O(1): cuántas corridas caben según insumos y temperatura */
    let done = 0;
    if(this.S.temp >= r.temp){
      done = times;
      for(const k in r.in) done = Math.min(done, Math.floor(this.atomsOf(k)/r.in[k]));
      done = Math.max(0, done);
      if(done > 0){
        for(const k in r.in) this.S.atoms[k] -= r.in[k]*done;
        this.S.atoms[r.out] = this.atomsOf(r.out) + done;
      }
    }
    if(!done) return 0;
    const refund = r.refund * done;
    if(refund>0){ this.S.e += refund; }   // fix: refund NO suma a total
    if(!this.S.seen['rx_'+r.out]){
      this.S.seen['rx_'+r.out] = 1;
      this.S.tempFloor = Math.max(this.S.tempFloor, Math.floor(r.temp*0.75));
    }
    this.S.seen.fusedOnce = 1;
    this.discover(r.out);
    if(r.by){
      let k = 0;
      if(done <= 32){
        for(let i=0;i<done;i++) if(this.rand() < 0.25) k++;
      }else{
        /* aprox normal de binomial(done, .25) */
        const mu = done*0.25, sd = Math.sqrt(done*0.25*0.75);
        const u1 = Math.max(1e-12, this.rand()), u2 = this.rand();
        const z = Math.sqrt(-2*Math.log(u1))*Math.cos(2*Math.PI*u2);
        k = Math.max(0, Math.round(mu + sd*z));
      }
      if(k > 0){
        this.S.atoms[r.by] = this.atomsOf(r.by) + k;
        this.discover(r.by);
      }
    }
    this.ev('fuse', { out:r.out, done, refund });
    return done;
  }

  supernova(){
    if(!this.novaReady()) return false;
    const gain = this.novaGain();
    const missingArr = NOVA_POOL.filter(s=>!this.S.elements[s]);
    const drops = Math.min(missingArr.length, 2 + gain + this.S.novas);
    this.S.novas++;
    this.S.e = 0;
    BUILDINGS.forEach(b=>this.S.counts[b.id]=0);
    this.S.atoms = {};
    this.S.tempFloor = Math.floor(this.S.tempFloor*0.25);
    this.S.temp = this.S.tempFloor;
    this.heat = 0; this.buffs.feverUntil = 0; this.buffs.frenzyUntil = 0;
    this.S.dust += gain;
    this.S.seen.nova = 1;
    if(missingArr.length){
      for(let i=0;i<drops && missingArr.length;i++){
        const idx = Math.floor(this.rand()*missingArr.length);
        const el = missingArr.splice(idx,1)[0];
        this.S.atoms[el] = 1;
        this.discover(el);
      }
    }else{
      this.S.dust += 1;
    }
    this.ev('nova', { gain, drops, novas:this.S.novas });
    return true;
  }

  labSynth(){
    const el = this.nextLab();
    if(!el || !this.labUnlocked()) return false;
    if(this.S.e < this.labCost()) return false;
    this.S.e -= this.labCost();
    this.S.atoms[el] = 1;
    this.S.seen.lab = 1;
    this.discover(el);
    this.ev('lab', { el });
    return true;
  }

  /* --- avance del tiempo --- */
  /* step con la app ABIERTA: eps corre, H calienta, enfriamiento, quark spawnea */
  step(dt){
    const inc = this.eps()*dt;
    this.S.e += inc; this.S.total += inc;
    const hGen = this.hGenRate();
    if(hGen > 0) this.S.temp += hGen * dt;
    if(this.S.temp > this.S.tempFloor){
      this.S.temp = Math.max(this.S.tempFloor, this.S.temp * Math.pow(0.5, dt/COOL_HALFLIFE_S));
    }
    /* quark: aparece y muere solo si nadie lo toca (7s en pantalla) */
    if(!this.quarkAlive && this.t > this.quarkNext && this.S.total > 200){
      this.quarkAlive = true; this.quarkT0 = this.t;
    }
    if(this.quarkAlive && this.t - this.quarkT0 > 7){
      this.quarkAlive = false;
      this.quarkNext = this.t + 45 + this.rand()*60;
    }
    /* decaimiento del combo / sobrecarga */
    if(!this.feverOn() && this.t - this.lastTapT > 0.5)
      this.heat = Math.max(0, this.heat - 20*dt);
    if(!this.surgeOn() && this.t - this.lastStarPourT > 0.6)
      this.starHeat = Math.max(0, this.starHeat - 25*dt);
    this.t += dt;
  }

  /* app CERRADA durante `seconds`: espejo de main()+offlineGains() */
  offline(seconds){
    /* fix: enfriamiento + calor pasivo del H en forma cerrada */
    const lam = Math.LN2 / COOL_HALFLIFE_S;
    const g = this.hGenRate();
    const teq = this.S.tempFloor + g/lam;
    this.S.temp = Math.max(this.S.tempFloor, teq + (this.S.temp - teq)*Math.exp(-lam*seconds));
    if(seconds >= 120){
      const rate = this.baseEps() * this.globalMult();   // sin tempMult ni frenzy
      if(rate > 0){
        const capped = Math.min(seconds, 6*3600);
        const gain = rate * capped * 0.5;
        this.S.e += gain; this.S.total += gain;
      }
    }
    this.t += seconds;
    this.buffs.feverUntil = 0; this.buffs.frenzyUntil = 0; this.buffs.surgeUntil = 0;
    this.quarkAlive = false;
    this.quarkNext = this.t + 45 + this.rand()*60;
  }

  snapshot(){
    return {
      t: this.t,
      e: this.S.e, total: this.S.total,
      hEver: this.S.hEver, H: this.atomsOf('H'),
      temp: Math.round(this.S.temp), floor: this.S.tempFloor,
      elements: this.forgedCount(), dust: this.S.dust, novas: this.S.novas,
      eps: this.eps(), mult: this.globalMult(),
      counts: {...this.S.counts},
      activeSeconds: this.activeSeconds,
    };
  }
}

module.exports = { Game, BUILDINGS, RECIPES, SYMS, Z, NOVA_POOL, LAB_ELEMENTS,
  COST_GROWTH, PRESTIGE_UNIT, PARTICLES_PER_H, tempAfterSpend, heatCostPerDegree };
