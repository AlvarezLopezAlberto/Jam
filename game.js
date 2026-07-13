'use strict';
/* ============================================================
   ¡ÁTOMO LOCO! — clicker/idle pixel art mobile-first
   Basado en las mecánicas de Elemental Incremental, destilado
   al loop adictivo de Cookie Clicker / Mucho Taco.
   ============================================================ */

/* ---------- catálogo de partículas (edificios) ---------- */
/* La ficción del motor: eres una NEBULOSA. La masa (protones/neutrones)
   calienta la nube por contracción gravitatoria; tus taps excitan electrones
   que reemiten radiación; las ondas de choque de supernovas vecinas comprimen
   la nube (así se dispara el colapso real); los núcleos densos encienden
   protoestrellas. Protones y neutrones además se ENTREGAN en el colapso. */
const BUILDINGS = [
  { id:'proton',   name:'PROTÓN',   baseCost:15,     eps:1,    tap:0, mult:0,   color:'#ff2e88',
    info:'+1/s · masa que calienta' },
  { id:'electron', name:'ELECTRÓN', baseCost:100,    eps:0,    tap:1, mult:0,   color:'#29f3ff',
    info:'+1 por tap · radiación' },
  { id:'neutrino', name:'ONDA DE CHOQUE', baseCost:1500, eps:0, tap:0, mult:.10, color:'#ffd93b',
    info:'+10% a TODO · comprime la nube' },
  { id:'neutron',  name:'NEUTRÓN',  baseCost:12000,  eps:30,   tap:0, mult:0,   color:'#b14aed',
    info:'+30/s · masa pesada' },
  { id:'fusion',   name:'PROTO ESTRELLA', baseCost:200000, eps:400, tap:0, mult:0, color:'#ff7a2e',
    info:'+400/s · un núcleo ya arde' },
];
const COST_GROWTH = 1.15;
const PRESTIGE_UNIT = 1e6;      // energía total por átomo de H (raíz)
const PARTICLES_PER_H = 25;     // partículas entregadas por H extra en el colapso

/* ---------- tabla de elementos (meta de largo plazo) ---------- */
/* NUCLEOSÍNTESIS REAL: los átomos se ganan (H por colapso, el resto por
   fusión en la estrella o rayos cósmicos). Descubrir un elemento da +25%
   a todo, permanente. La escalera alfa sube hasta el Fe. */
const ELEMENT_BONUS = 1.25;
const ELEMENTS = [
  { z:1,  sym:'H',  name:'HIDRÓGENO', color:'#29f3ff', via:'☀ COLAPSO de la nebulosa' },
  { z:2,  sym:'He', name:'HELIO',     color:'#ffd93b', via:'fusión 4 H (10 M°)' },
  { z:3,  sym:'Li', name:'LITIO',     color:'#ff2e88', via:'🌠 rayo cósmico (espalación)' },
  { z:4,  sym:'Be', name:'BERILIO',   color:'#7dff6a', via:'🌠 rayo cósmico (espalación)' },
  { z:5,  sym:'B',  name:'BORO',      color:'#ff7a2e', via:'🌠 rayo cósmico (espalación)' },
  { z:6,  sym:'C',  name:'CARBONO',   color:'#c9c9dd', via:'triple-alfa: 3 He (100 M°)' },
  { z:7,  sym:'N',  name:'NITRÓGENO', color:'#b14aed', via:'ciclo CNO: C+H (120 M°)' },
  { z:8,  sym:'O',  name:'OXÍGENO',   color:'#ff4f4f', via:'C+He (200 M°)' },
  { z:10, sym:'Ne', name:'NEÓN',      color:'#ff6fd8', via:'O+He (350 M°)' },
  { z:12, sym:'Mg', name:'MAGNESIO',  color:'#9dffb0', via:'Ne+He (600 M°)' },
  { z:14, sym:'Si', name:'SILICIO',   color:'#ffb86b', via:'Mg+He (1K M°)' },
  { z:16, sym:'S',  name:'AZUFRE',    color:'#fff06b', via:'Si+He (1.6K M°)' },
  { z:18, sym:'Ar', name:'ARGÓN',     color:'#8be9fd', via:'S+He (2.6K M°)' },
  { z:20, sym:'Ca', name:'CALCIO',    color:'#f2f2f2', via:'Ar+He (4.1K M°)' },
  { z:22, sym:'Ti', name:'TITANIO',   color:'#b0c4de', via:'Ca+He (6.6K M°)' },
  { z:24, sym:'Cr', name:'CROMO',     color:'#9fe2bf', via:'Ti+He (10.5K M°)' },
  { z:26, sym:'Fe', name:'HIERRO',    color:'#d08770', via:'Cr+He (17K M°)' },
];
const ELEM = {}; ELEMENTS.forEach(e=>ELEM[e.sym]=e);

/* recetas de fusión: consumen átomos, exigen temperatura, DEVUELVEN energía
   (la fusión es exotérmica… hasta el hierro, que no paga) */
const RECIPES = [
  { out:'He', in:{H:4},       temp:10,    refund:5e4,     note:'cadena protón-protón' },
  { out:'C',  in:{He:3},      temp:100,   refund:4e5,     note:'triple-alfa ¡se salta Li·Be·B!' },
  { out:'N',  in:{C:1,H:1},   temp:120,   refund:6e5,     note:'ciclo CNO' },
  { out:'O',  in:{C:1,He:1},  temp:200,   refund:1.6e6,   note:'escalera alfa' },
  { out:'Ne', in:{O:1,He:1},  temp:350,   refund:6e6,     note:'escalera alfa' },
  { out:'Mg', in:{Ne:1,He:1}, temp:600,   refund:2.5e7,   note:'escalera alfa' },
  { out:'Si', in:{Mg:1,He:1}, temp:1000,  refund:1e8,     note:'escalera alfa' },
  { out:'S',  in:{Si:1,He:1}, temp:1600,  refund:4e8,     note:'escalera alfa' },
  { out:'Ar', in:{S:1,He:1},  temp:2600,  refund:1.6e9,   note:'escalera alfa' },
  { out:'Ca', in:{Ar:1,He:1}, temp:4100,  refund:6.4e9,   note:'escalera alfa' },
  { out:'Ti', in:{Ca:1,He:1}, temp:6600,  refund:2.56e10, note:'escalera alfa' },
  { out:'Cr', in:{Ti:1,He:1}, temp:10500, refund:1e11,    note:'escalera alfa' },
  { out:'Fe', in:{Cr:1,He:1}, temp:17000, refund:0,       note:'el hierro NO paga · así mueren las estrellas' },
];

/* temperatura: se enfría a la mitad cada 10 h, nunca bajo el piso */
const COOL_HALFLIFE_S = 36000;
const HEAT_K = 50;   // costo por grado = HEAT_K × (T+1)²  → acumulado ≈ K·T³/3
function heatCostPerDegree(T){ return HEAT_K * Math.pow(T+1, 2); }
/* invierte la integral: cuánta temperatura compra un presupuesto B desde T0 */
function tempAfterSpend(T0, B){
  return Math.cbrt(Math.pow(T0+1, 3) + B*3/HEAT_K) - 1;
}

/* ---------- logros ---------- */
const ACHIEVEMENTS = [
  { id:'tap1',     name:'¡Big Bang!',          test:s=>s.taps>=1,           msg:'Tu primer tap' },
  { id:'tap500',   name:'Dedos de plasma',     test:s=>s.taps>=500,         msg:'500 taps' },
  { id:'proton1',  name:'Materia bariónica',   test:s=>s.counts.proton>=1,  msg:'Primer protón' },
  { id:'proton25', name:'Sopa de quarks',      test:s=>s.counts.proton>=25, msg:'25 protones' },
  { id:'elec10',   name:'Nube electrónica',    test:s=>s.counts.electron>=10, msg:'10 electrones' },
  { id:'neutrino1',name:'Eco de supernova',    test:s=>s.counts.neutrino>=1,  msg:'Primera onda de choque' },
  { id:'neutron1', name:'Carga neutral',       test:s=>s.counts.neutron>=1,   msg:'Primer neutrón' },
  { id:'fusion1',  name:'¡Es una estrella!',   test:s=>s.counts.fusion>=1,    msg:'Primera protoestrella' },
  { id:'e1k',      name:'Kiloelectronvoltio',  test:s=>s.total>=1e3,  msg:'1K de energía total' },
  { id:'e1m',      name:'Megajulio',           test:s=>s.total>=1e6,  msg:'1M de energía total' },
  { id:'e1b',      name:'Supernova',           test:s=>s.total>=1e9,  msg:'1B de energía total' },
  { id:'quark1',   name:'Cazador de quarks',   test:s=>s.quarks>=1,   msg:'Atrapaste un quark dorado' },
  { id:'fever1',   name:'¡FUSIÓN NUCLEAR!',    test:s=>s.fevers>=1,   msg:'Primera fusión' },
  { id:'prestige1',name:'Colapso gravitacional', test:s=>s.hEver>=1, msg:'Tu nebulosa colapsó en Hidrógeno' },
  { id:'elem1',    name:'¡Elemental!',         test:s=>forgedCount(s)>=1,  msg:'Primer elemento descubierto' },
  { id:'fusion2',  name:'Encendido estelar',   test:s=>!!s.seen.fusedOnce, msg:'Primera fusión nuclear' },
  { id:'elem5',    name:'Media escalera',      test:s=>forgedCount(s)>=5,  msg:'5 elementos descubiertos' },
  { id:'cosmic1',  name:'Mensajero galáctico', test:s=>!!s.seen.cosmic,    msg:'Espalación por rayo cósmico' },
  { id:'elem10',   name:'Señor del Neón',      test:s=>forgedCount(s)>=10, msg:'10 elementos descubiertos' },
  { id:'fe1',      name:'Corazón de hierro',   test:s=>!!(s.elements&&s.elements.Fe), msg:'Fusionaste HIERRO' },
  { id:'elem17',   name:'Alquimista estelar',  test:s=>forgedCount(s)>=17, msg:'¡Los 17 elementos!' },
];
function forgedCount(s){ return Object.keys((s||S).elements||{}).length; }

/* ---------- estado ---------- */
const SAVE_KEY = 'atomoLocoSave_v3';

function defaultState(){
  const counts = {};
  BUILDINGS.forEach(b=>counts[b.id]=0);
  return {
    e:0, total:0, taps:0,
    hEver:0,   // H ganado en la vida (base del mult de colapso)
    hBase:0,   // parte "raíz de energía" ya reclamada (contabilidad del pendiente)
    atoms:{},  // inventario de átomos por símbolo (H, He, C, …)
    temp:0,    // temperatura de la estrella en M°
    tempFloor:0, // piso permanente ("núcleo degenerado")
    quarks:0, fevers:0,
    counts, elements:{}, ach:{}, seen:{}, muted:false, t:Date.now()
  };
}
let S = defaultState();

function save(){
  S.t = Date.now();
  try{ localStorage.setItem(SAVE_KEY, JSON.stringify(S)); }catch(e){}
}
function load(){
  try{
    const raw = localStorage.getItem(SAVE_KEY);
    if(!raw) return false;
    const d = JSON.parse(raw);
    S = Object.assign(defaultState(), d);
    S.counts = Object.assign(defaultState().counts, d.counts||{});
    S.elements = d.elements || {};
    S.atoms = d.atoms || {};
    return true;
  }catch(e){ return false; }
}

/* ---------- derivados ---------- */
const cnt = id => S.counts[id]||0;
function costOf(b){ return Math.ceil(b.baseCost * Math.pow(COST_GROWTH, cnt(b.id))); }
/* el mult de colapso usa el H GANADO EN LA VIDA:
   gastarlo en elementos nunca te debilita */
function prestigeMult(){ return 1 + S.hEver*0.10; }
function elementsMult(){ return Math.pow(ELEMENT_BONUS, forgedCount()); }
function globalMult(){
  let m = 1;
  BUILDINGS.forEach(b=>{ if(b.mult) m += b.mult*cnt(b.id); });
  return m * prestigeMult() * elementsMult();
}
function baseEps(){
  let e = 0;
  BUILDINGS.forEach(b=>{ e += b.eps*cnt(b.id); });
  return e;
}
function frenzyOn(){ return now() < buffs.frenzyUntil; }
function feverOn(){ return now() < buffs.feverUntil; }
/* el calor de la estrella también alimenta al motor: +0.5% por M° */
function tempMult(){ return 1 + 0.005*S.temp; }
function eps(){ return baseEps() * globalMult() * tempMult() * (frenzyOn()?7:1); }
function tapValue(){
  let t = 1;
  BUILDINGS.forEach(b=>{ t += b.tap*cnt(b.id); });
  return t * globalMult() * (feverOn()?5:1) * (frenzyOn()?7:1);
}
/* COLAPSO: la parte base sale de la energía total (raíz), y ENTREGAR tus
   partículas (protones+neutrones) suma H extra — se convierten literalmente
   en el hidrógeno que te llevas. Solo disponible cuando la base ≥ 1. */
function colapsoBase(){
  return Math.floor(Math.sqrt(S.total / PRESTIGE_UNIT)) - S.hBase;
}
function colapsoBonus(){
  return Math.floor((cnt('proton') + cnt('neutron')) / PARTICLES_PER_H);
}
function pendingH(){
  return colapsoBase() >= 1 ? colapsoBase() + colapsoBonus() : 0;
}

/* ---------- utilidades ---------- */
const now = () => performance.now();
const $ = id => document.getElementById(id);
const SUFF = ['','K','M','B','T','Qa','Qi','Sx','Sp'];
function fmt(n){
  if(n < 1000) return Math.floor(n).toString();
  let i = 0;
  while(n >= 1000 && i < SUFF.length-1){ n/=1000; i++; }
  return (n>=100? n.toFixed(0) : n>=10? n.toFixed(1) : n.toFixed(2)) + SUFF[i];
}
function vibrate(ms){ if(navigator.vibrate) try{navigator.vibrate(ms);}catch(e){} }

/* ---------- audio (síntesis, cero assets) ---------- */
let AC = null;
function audio(){ if(!AC) AC = new (window.AudioContext||window.webkitAudioContext)(); return AC; }
function blip(freq, dur=0.06, type='square', vol=0.12){
  if(S.muted) return;
  try{
    const ac = audio();
    if(ac.state==='suspended') ac.resume();
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime+dur);
    o.connect(g); g.connect(ac.destination);
    o.start(); o.stop(ac.currentTime+dur);
  }catch(e){}
}
function sndTap(combo){ blip(300 + Math.min(combo,40)*18, .05, 'square', .09); }
function sndBuy(){ blip(220,.07,'triangle',.15); setTimeout(()=>blip(440,.09,'triangle',.15),60); }
function sndGold(){ [523,659,784,1047].forEach((f,i)=>setTimeout(()=>blip(f,.12,'square',.14), i*70)); }
function sndFever(){ [262,330,392,523,659].forEach((f,i)=>setTimeout(()=>blip(f,.1,'sawtooth',.12), i*55)); }
function sndAch(){ blip(880,.08,'triangle',.12); setTimeout(()=>blip(1175,.12,'triangle',.12),80); }

/* ---------- canvas pixel-art ---------- */
const stage = $('stage'), cv = $('cv'), ctx = cv.getContext('2d');
const LOGICAL_W = 180;             // resolución interna (look pixelado real)
let LW = LOGICAL_W, LH = 320, view = {w:0,h:0,scale:1};

function resize(){
  view.w = stage.clientWidth; view.h = stage.clientHeight;
  if(view.w < 10 || view.h < 10) return;   // layout aún no listo
  view.scale = view.w / LOGICAL_W;
  LW = LOGICAL_W;
  LH = Math.max(120, Math.round(view.h / view.scale));
  cv.width = LW; cv.height = LH;
  ctx.imageSmoothingEnabled = false;
  initStars();
}
window.addEventListener('resize', resize);
new ResizeObserver(resize).observe(stage);

/* estrellas de fondo */
let stars = [];
function initStars(){
  stars = [];
  const n = Math.floor(LW*LH/300);
  for(let i=0;i<n;i++){
    stars.push({ x:Math.random()*LW, y:Math.random()*LH,
      tw:Math.random()*Math.PI*2, sp:.5+Math.random()*2,
      c:['#5e3f9e','#8a6fd0','#ffd93b','#29f3ff'][Math.floor(Math.random()*4)] });
  }
}

/* pool de partículas de tap */
const parts = [];
function burst(x,y,color,n=10,power=1){
  for(let i=0;i<n;i++){
    if(parts.length>220) parts.shift();
    const a = Math.random()*Math.PI*2, v = (18+Math.random()*45)*power;
    parts.push({ x,y, vx:Math.cos(a)*v, vy:Math.sin(a)*v-25, life:1,
      sz:1+Math.random()*2.5, c:color });
  }
}

/* núcleo: cluster de bolas rosa/morado, crece con el progreso */
let blob = [];
function nucleusBalls(){
  const owned = BUILDINGS.reduce((a,b)=>a+cnt(b.id),0);
  return Math.min(24, 5 + Math.floor(Math.sqrt(owned)));
}
/* paleta del núcleo según la evolución estelar (tier 0-3) */
const STAR_PALETTES = [
  ['#ff2e88','#ff6fb1','#b14aed'],   // nebulosa rosa
  ['#ffd93b','#ff9d2e','#ff6fb1'],   // estrella joven (quema H→He)
  ['#fff6c8','#ffd93b','#ff7a2e'],   // madura (C, O, Ne…)
  ['#cfe8ff','#ffffff','#8be9fd'],   // gigante azul-blanca (Si→Fe)
];
function rebuildBlob(){
  const n = nucleusBalls();
  if(blob.length===n) return;
  blob = [];
  const pal = STAR_PALETTES[typeof starTier==='function' ? starTier() : 0];
  for(let i=0;i<n;i++){
    const a = Math.random()*Math.PI*2, r = i===0?0:(2+Math.random()*9);
    blob.push({ dx:Math.cos(a)*r, dy:Math.sin(a)*r*0.9,
      r:4.5+Math.random()*2.5,
      c:pal[i%pal.length] });
  }
  blob.sort((a,b)=>a.dy-b.dy);
}

let squash = 0;          // spring del núcleo al tocar
let nucPulse = 0;

function nucleusCenter(){ return { x:LW/2, y:LH*0.44 }; }
function nucleusRadius(){ return 16 + nucleusBalls()*0.6; }

function draw(t){
  /* fondo */
  const fever = feverOn();
  ctx.fillStyle = fever ? '#2b0a3d' : '#14082b';
  ctx.fillRect(0,0,LW,LH);

  /* estrellas */
  for(const s of stars){
    const a = 0.35 + 0.65*Math.abs(Math.sin(t/700*s.sp + s.tw));
    ctx.globalAlpha = a;
    ctx.fillStyle = s.c;
    ctx.fillRect(s.x|0, s.y|0, 1, 1);
  }
  ctx.globalAlpha = 1;

  const c = nucleusCenter();
  const R = nucleusRadius();
  const sq = 1 + squash;

  /* halo pulsante */
  nucPulse = (nucPulse + 0.02) % (Math.PI*2);
  const halo = R + 6 + Math.sin(nucPulse)*2 + (fever?4:0);
  ctx.globalAlpha = fever ? .30 : .16;
  /* el halo toma el color del último elemento forjado — progreso visible */
  ctx.fillStyle = fever ? '#ffd93b' : (lastForgedColor() || '#ff2e88');
  pxCircle(c.x, c.y, halo);
  ctx.globalAlpha = 1;

  /* anillos de órbita — uno por tipo de partícula poseída */
  const rings = BUILDINGS.filter(b=>cnt(b.id)>0);
  rings.forEach((b,ri)=>{
    const rr = R + 10 + ri*9;
    ctx.globalAlpha = .25;
    ctx.strokeStyle = b.color;
    dashEllipse(c.x, c.y, rr, rr*0.55, t/1000 + ri);
    ctx.globalAlpha = 1;
    /* satélites orbitando */
    const dots = Math.min(6, 1+Math.floor(Math.log2(1+cnt(b.id))));
    for(let d=0; d<dots; d++){
      const ang = t/(900 - ri*120) + d*(Math.PI*2/dots) + ri*1.7;
      const px = c.x + Math.cos(ang)*rr;
      const py = c.y + Math.sin(ang)*rr*0.55;
      ctx.fillStyle = b.color;
      ctx.fillRect((px-1.5)|0, (py-1.5)|0, 3, 3);
      ctx.globalAlpha = .5;
      ctx.fillRect((px-0.5)|0, (py-2.5)|0, 1, 1);
      ctx.globalAlpha = 1;
    }
  });

  /* núcleo (cluster) */
  rebuildBlob();
  for(const b of blob){
    const bx = c.x + b.dx*sq, by = c.y + b.dy*(2-sq)*0.9;
    ctx.fillStyle = '#5e1240';
    pxCircle(bx, by+1, b.r*sq+1);
    ctx.fillStyle = b.c;
    pxCircle(bx, by, b.r*sq);
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    pxCircle(bx - b.r*0.35, by - b.r*0.35, b.r*0.3);
  }

  /* chispas de neutrino sobre el núcleo */
  if(cnt('neutrino')>0 && Math.random()<0.15){
    const a = Math.random()*Math.PI*2, rr = Math.random()*R;
    sparks.push({x:c.x+Math.cos(a)*rr, y:c.y+Math.sin(a)*rr*0.8, life:1});
  }
  for(let i=sparks.length-1;i>=0;i--){
    const s = sparks[i]; s.life -= 0.06;
    if(s.life<=0){ sparks.splice(i,1); continue; }
    ctx.globalAlpha = s.life;
    ctx.fillStyle = '#ffd93b';
    const sz = s.life*3;
    ctx.fillRect((s.x-sz/2)|0, s.y|0, sz|0||1, 1);
    ctx.fillRect(s.x|0, (s.y-sz/2)|0, 1, sz|0||1);
  }
  ctx.globalAlpha = 1;

  /* partículas de tap */
  for(let i=parts.length-1;i>=0;i--){
    const p = parts[i];
    p.life -= 0.03;
    if(p.life<=0){ parts.splice(i,1); continue; }
    p.x += p.vx/60; p.y += p.vy/60; p.vy += 90/60;
    ctx.globalAlpha = Math.min(1,p.life*1.5);
    ctx.fillStyle = p.c;
    const s = Math.max(1, p.sz*p.life);
    ctx.fillRect(p.x|0, p.y|0, s|0||1, s|0||1);
  }
  ctx.globalAlpha = 1;

  /* muelle del squash */
  squash += (0 - squash)*0.25;
}

const sparks = [];

function pxCircle(x,y,r){
  /* círculo por scanlines -> bordes pixelados nítidos */
  const ri = Math.max(1, Math.round(r));
  for(let dy=-ri; dy<=ri; dy++){
    const w = Math.floor(Math.sqrt(ri*ri - dy*dy));
    ctx.fillRect((x-w)|0, (y+dy)|0, w*2+1, 1);
  }
}
function dashEllipse(x,y,rx,ry,rot){
  const steps = 40;
  ctx.fillStyle = ctx.strokeStyle;
  for(let i=0;i<steps;i++){
    if(i%2) continue;
    const a = rot + i*(Math.PI*2/steps);
    ctx.fillRect((x+Math.cos(a)*rx)|0, (y+Math.sin(a)*ry)|0, 1, 1);
  }
}

/* ---------- combo / fiebre ---------- */
const buffs = { feverUntil:0, frenzyUntil:0 };
let heat = 0, lastTapT = 0;
const FEVER_MS = 8000;

function addHeat(){
  if(feverOn()) return;
  heat = Math.min(100, heat + 6);
  if(heat >= 100){
    buffs.feverUntil = now() + FEVER_MS;
    S.fevers++;
    heat = 0;
    stage.classList.add('fever');
    $('fever-label').hidden = false;
    shake();
    sndFever();
    vibrate([30,40,30]);
    const c = nucleusCenter();
    burst(c.x, c.y, '#ffd93b', 40, 2);
    burst(c.x, c.y, '#ff2e88', 30, 1.6);
  }
}

/* ---------- input: TAP ---------- */
function stageToLogical(ev){
  const r = cv.getBoundingClientRect();
  return { x:(ev.clientX - r.left)/view.scale, y:(ev.clientY - r.top)/view.scale,
           sx:ev.clientX - r.left, sy:ev.clientY - r.top };
}

let comboShown = 0;
cv.addEventListener('pointerdown', ev=>{
  ev.preventDefault();
  const p = stageToLogical(ev);
  doTap(p);
}, {passive:false});

function doTap(p){
  const v = tapValue();
  S.e += v; S.total += v; S.taps++;
  squash = 0.35;
  addHeat();
  lastTapT = now();
  comboShown++;

  const c = nucleusCenter();
  burst(p.x, p.y, ['#ffd93b','#ff2e88','#29f3ff'][S.taps%3], feverOn()?16:8, feverOn()?1.6:1);
  spawnFloater(p.sx, p.sy, '+'+fmt(v), feverOn()?'big':'');
  sndTap(comboShown);
  vibrate(8);
  popEnergy();
}

/* ---------- números flotantes ---------- */
const floaters = $('floaters');
function spawnFloater(x,y,txt,cls=''){
  if(floaters.children.length > 28) floaters.removeChild(floaters.firstChild);
  const el = document.createElement('div');
  el.className = 'floater '+cls;
  el.textContent = txt;
  el.style.left = Math.round(x - 14 + (Math.random()*18-9)) + 'px';
  el.style.top  = Math.round(y - 18) + 'px';
  floaters.appendChild(el);
  setTimeout(()=>el.remove(), 900);
}

/* ---------- HUD ---------- */
let popT = 0;
function popEnergy(){
  const el = $('energy');
  el.classList.add('pop');
  clearTimeout(popT);
  popT = setTimeout(()=>el.classList.remove('pop'), 90);
}
function refreshHud(){
  $('energy').textContent = '⚡'+fmt(S.e);
  $('eps').textContent = fmt(eps())+' /s' + (frenzyOn()?' 🔥x7':'');
  const pb = $('protium-badge');
  if(S.hEver>0){ pb.hidden = false; $('protium-n').textContent = fmt(S.atoms.H||0); }
}

/* ---------- tienda ---------- */
const shopEl = $('shop');
const shopNodes = {};
function iconFor(b, size=32){
  const c = document.createElement('canvas');
  c.width = 16; c.height = 16;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  drawIcon(g, b.id, b.color);
  return c;
}
function drawIcon(g, id, color){
  g.clearRect(0,0,16,16);
  const ball = (x,y,r,col)=>{
    g.fillStyle = col;
    for(let dy=-r;dy<=r;dy++){
      const w = Math.floor(Math.sqrt(r*r-dy*dy));
      g.fillRect(x-w, y+dy, w*2+1, 1);
    }
  };
  if(id==='proton'){
    ball(8,8,5,'#7a0f3d'); ball(8,7,4.5,color); ball(6,6,1.5,'#ffd0e4');
  }else if(id==='electron'){
    g.fillStyle = color;
    for(let i=0;i<24;i++){ const a=i/24*Math.PI*2; g.fillRect(8+Math.round(Math.cos(a)*6), 8+Math.round(Math.sin(a)*4),1,1); }
    ball(11,5,2,color); ball(8,8,2,'#fff');
  }else if(id==='neutrino'){
    g.fillStyle = color;
    g.fillRect(7,2,2,12); g.fillRect(2,7,12,2);
    g.fillRect(5,5,1,1); g.fillRect(10,5,1,1); g.fillRect(5,10,1,1); g.fillRect(10,10,1,1);
  }else if(id==='neutron'){
    ball(8,8,5,'#3b2a52'); ball(8,7,4.5,color); ball(6,6,1.5,'#e7d6ff');
  }else{
    ball(8,8,6,'#8a2a00'); ball(8,8,5,color); ball(8,8,3,'#ffd93b'); ball(7,7,1,'#fff');
    g.fillStyle = color;
    g.fillRect(1,8,2,1); g.fillRect(13,8,2,1); g.fillRect(8,1,1,2); g.fillRect(8,13,1,2);
  }
}
function buildShop(){
  shopEl.innerHTML = '';
  BUILDINGS.forEach(b=>{
    const d = document.createElement('button');
    d.className = 'shop-item locked';
    d.appendChild(iconFor(b));
    const nm = document.createElement('div'); nm.className='s-name'; nm.textContent='???';
    const cost = document.createElement('div'); cost.className='s-cost';
    const info = document.createElement('div'); info.className='s-info';
    const count = document.createElement('div'); count.className='s-count'; count.hidden = true;
    d.append(nm, cost, info, count);
    d.addEventListener('pointerdown', ev=>{ ev.preventDefault(); buy(b, d); }, {passive:false});
    shopEl.appendChild(d);
    shopNodes[b.id] = { d, nm, cost, info, count, revealed:false };
  });
}
function buy(b, node){
  const c = costOf(b);
  if(S.e < c || !shopNodes[b.id].revealed) return;
  S.e -= c;
  S.counts[b.id]++;
  node.classList.remove('bought'); void node.offsetWidth;
  node.classList.add('bought');
  sndBuy();
  vibrate(15);
  const ctr = nucleusCenter();
  burst(ctr.x, ctr.y, b.color, 18, 1.4);
  refreshShop(); refreshHud();
}
function refreshShop(){
  BUILDINGS.forEach(b=>{
    const n = shopNodes[b.id];
    if(!n.revealed && S.total >= b.baseCost*0.4){
      n.revealed = true;
      n.nm.textContent = b.name;
      n.info.textContent = b.info;
      n.d.style.borderColor = b.color;
    }
    if(!n.revealed){ n.cost.textContent='?'; return; }
    n.d.classList.remove('locked');
    const c = costOf(b);
    n.cost.textContent = '⚡'+fmt(c);
    n.d.classList.toggle('cant', S.e < c);
    const q = cnt(b.id);
    n.count.hidden = q===0;
    n.count.textContent = q;
  });
}

/* ---------- quark dorado (evento aleatorio) ---------- */
const quarkEl = $('quark');
let quarkNext = 0, quarkAlive = false, quarkT0 = 0, quarkPath = null;
(function initQuark(){
  const c = document.createElement('canvas');
  c.width = 16; c.height = 16;
  const g = c.getContext('2d');
  g.fillStyle = '#ffd93b';
  /* estrella pixelada */
  g.fillRect(7,1,2,14); g.fillRect(1,7,14,2);
  g.fillRect(4,4,8,8);
  g.fillStyle = '#ff7a2e'; g.fillRect(6,6,4,4);
  g.fillStyle = '#fff';    g.fillRect(7,5,2,2);
  quarkEl.appendChild(c);
})();
function scheduleQuark(){ quarkNext = now() + (45 + Math.random()*60)*1000; }
function maybeQuark(t){
  if(quarkAlive){
    const dt = (t - quarkT0)/1000;
    if(dt > 7){ hideQuark(); return; }
    const x = quarkPath.x0 + (quarkPath.x1-quarkPath.x0)*(dt/7);
    const y = quarkPath.y + Math.sin(dt*2.4)*30;
    quarkEl.style.transform = `translate(${x}px, ${y}px)`;
    return;
  }
  if(t > quarkNext && S.total > 200){
    quarkAlive = true; quarkT0 = t;
    const fromLeft = Math.random()<0.5;
    quarkPath = {
      x0: fromLeft? -50 : view.w+50,
      x1: fromLeft? view.w+50 : -50,
      y: 40 + Math.random()*(view.h*0.5)
    };
    quarkEl.hidden = false;
  }
}
function hideQuark(){ quarkAlive = false; quarkEl.hidden = true; scheduleQuark(); }
quarkEl.addEventListener('pointerdown', ev=>{
  ev.preventDefault();
  if(!quarkAlive) return;
  S.quarks++;
  const r = cv.getBoundingClientRect();
  const sx = ev.clientX - r.left, sy = ev.clientY - r.top;
  sndGold(); vibrate([20,30,20]); shake();
  /* espalación: si tienes C u O y te falta Li/Be/B, el rayo cósmico
     puede partir un núcleo (así se hace el litio real) */
  const missing = ['Li','Be','B'].filter(s=>!S.elements[s]);
  const fuel = atomsOf('C')>0 ? 'C' : (atomsOf('O')>0 ? 'O' : null);
  const roll = Math.random();
  if(missing.length && fuel && roll < 0.34){
    const target = missing[Math.floor(Math.random()*missing.length)];
    S.atoms[fuel]--;
    S.atoms[target] = atomsOf(target) + 1;
    S.seen.cosmic = 1;
    discover(target);
    spawnFloater(sx, sy, '¡'+target+'!', 'gold');
    toast('🌠 ¡ESPALACIÓN! El rayo cósmico partió tu '+fuel+' en '+target);
  }else if(roll < (missing.length && fuel ? 0.67 : 0.5)){
    const gain = Math.max(eps()*60, tapValue()*40);
    S.e += gain; S.total += gain;
    spawnFloater(sx, sy, '+'+fmt(gain)+'!', 'gold');
  }else{
    buffs.frenzyUntil = now() + 20000;
    spawnFloater(sx, sy, '¡FRENESÍ x7!', 'gold');
  }
  burst(sx/view.scale, sy/view.scale, '#ffd93b', 30, 2);
  hideQuark();
}, {passive:false});

/* ---------- COLAPSO (prestigio) ---------- */
$('prestige-btn').addEventListener('click', ()=>{
  const p = pendingH();
  if(p<1) return;
  const bonus = colapsoBonus();
  const particles = cnt('proton') + cnt('neutron');
  showModal('☀ COLAPSO GRAVITACIONAL',
    `La nebulosa colapsa bajo su propia gravedad…<br><br>`+
    `Tus <b>${particles} protones y neutrones</b> se convierten en`+
    `<br><b style="font-size:14px">${p} átomo${p>1?'s':''} de HIDRÓGENO</b>`+
    (bonus>0 ? `<br>(${p-bonus} por energía + ${bonus} por tus partículas)` : '')+
    `<br><br>Ganas <b>+${p*10}% a TODO, para siempre</b>`+
    `<br>y con H forjas <b>ELEMENTOS</b> en la ⭐ ESTRELLA`,
    [
      { label:'¡COLAPSAR!', cb:()=>{ doColapso(p); } },
      { label:'Aún no', alt:true, cb:()=>{} },
    ]);
});
function doColapso(p){
  S.hBase += colapsoBase();   // antes de vaciar contadores
  S.atoms.H = (S.atoms.H||0) + p;
  S.hEver += p;
  discover('H');
  S.e = 0;
  BUILDINGS.forEach(b=>S.counts[b.id]=0);
  heat = 0; buffs.feverUntil = 0; buffs.frenzyUntil = 0;
  blob = [];
  Object.values(shopNodes).forEach(n=>{ n.revealed=false; n.d.classList.add('locked'); n.nm.textContent='???'; n.info.textContent=''; });
  stage.classList.remove('fever');
  shake(); sndGold(); vibrate([40,60,40]);
  const c = nucleusCenter();
  burst(c.x, c.y, '#ffd93b', 60, 2.5);
  toast('☀ ¡'+p+' HIDRÓGENO! +'+(p*10)+'% permanente');
  if(!S.seen.forgeHint){
    S.seen.forgeHint = 1;
    setTimeout(()=>toast('⭐ Con tu H forja ELEMENTOS — tab ESTRELLA abajo'), 2500);
  }
  refreshShop(); refreshHud(); save();
}
function refreshPrestige(){
  const p = pendingH();
  const btn = $('prestige-btn');
  if(p>=1){
    btn.hidden = false; btn.textContent = '☀ COLAPSO +'+p+' H';
    if(!S.seen.prestigeReady){
      S.seen.prestigeReady = 1;
      toast('☀ ¡La nebulosa puede COLAPSAR! Toca el botón dorado ↑');
      sndAch();
    }
  }
  else btn.hidden = true;
}

/* ---------- pantallas: motor / elementos ---------- */
let screen = 'motor';
function setScreen(m){
  screen = m;
  $('stage').hidden = m !== 'motor';
  $('shop').hidden = m !== 'motor';
  $('screen-elements').hidden = m !== 'elements';
  $('tab-motor').classList.toggle('active', m === 'motor');
  $('tab-elements').classList.toggle('active', m === 'elements');
  if(m === 'elements') refreshElements();
  blip(m==='elements'? 520 : 392, .06, 'triangle', .1);
}
$('tab-motor').addEventListener('click', ()=>setScreen('motor'));
$('tab-elements').addEventListener('click', ()=>setScreen('elements'));
/* atajo: tocar el badge H del HUD lleva a la estrella */
$('protium-badge').addEventListener('click', ()=>setScreen('elements'));

/* ---------- la estrella: átomos, temperatura y fusión ---------- */
const elNodes = [];
const recipeNodes = [];
const atomsOf = sym => S.atoms[sym]||0;

function discover(sym){
  if(S.elements[sym]) return;
  S.elements[sym] = 1;
  const el = ELEM[sym];
  toast('🧪 ¡NUEVO ELEMENTO: '+el.name+'! +25% a todo, permanente');
  sndAch(); vibrate([20,30,20]);
  const d = elNodes[ELEMENTS.indexOf(el)];
  if(d){ d.classList.remove('just-forged'); void d.offsetWidth; d.classList.add('just-forged'); }
  blob = [];   // el núcleo del motor cambia de paleta
  save();
}
function lastForgedColor(){
  let c = null;
  ELEMENTS.forEach(e=>{ if(S.elements[e.sym]) c = e.color; });
  return c;
}
/* tier visual de la estrella según lo fundido: nebulosa → joven → madura → azul */
function starTier(){
  if(['Si','S','Ar','Ca','Ti','Cr','Fe'].some(s=>S.elements[s])) return 3;
  if(['C','N','O','Ne','Mg'].some(s=>S.elements[s])) return 2;
  if(S.elements.He) return 1;
  return 0;
}

/* --- calentamiento (mantener presionado) --- */
let heating = false;
const heatBtn = $('heat-btn');
heatBtn.addEventListener('pointerdown', ev=>{ ev.preventDefault(); heating = true; }, {passive:false});
['pointerup','pointerleave','pointercancel'].forEach(ev=>
  heatBtn.addEventListener(ev, ()=>{ heating = false; }));
let heatBlipAcc = 0;
function heatTick(dt){
  if(!heating || screen!=='elements') return;
  const pour = Math.max(2000, eps()*8) * dt;   // energía vertida este frame
  const budget = Math.min(pour, S.e);
  if(budget <= 0) return;
  S.temp = tempAfterSpend(S.temp, budget);
  S.e -= budget;
  heatBlipAcc += dt;
  if(heatBlipAcc > 0.18){ heatBlipAcc = 0; blip(180 + S.temp%400, .04, 'sawtooth', .05); }
}
/* --- enfriamiento: mitad cada 10 h, nunca bajo el piso --- */
function coolTick(dtSeconds){
  if(S.temp > S.tempFloor){
    S.temp = Math.max(S.tempFloor, S.temp * Math.pow(0.5, dtSeconds/COOL_HALFLIFE_S));
  }
}

/* --- recetas --- */
function recipeVisible(r){
  return Object.keys(r.in).every(k=>S.elements[k]);   // conoces los ingredientes
}
function canRun(r){
  if(S.temp < r.temp) return 'frio';
  for(const k in r.in) if(atomsOf(k) < r.in[k]) return 'atomos';
  return 'ok';
}
function runRecipe(r, times){
  let done = 0;
  for(let i=0;i<times;i++){
    if(canRun(r)!=='ok') break;
    for(const k in r.in) S.atoms[k] -= r.in[k];
    S.atoms[r.out] = atomsOf(r.out) + 1;
    done++;
  }
  if(!done) return;
  const refund = r.refund * done;
  if(refund>0){ S.e += refund; S.total += refund; }
  if(!S.seen['rx_'+r.out]){
    S.seen['rx_'+r.out] = 1;
    /* núcleo degenerado: el piso térmico sube para siempre */
    S.tempFloor = Math.max(S.tempFloor, Math.floor(r.temp*0.75));
  }
  S.seen.fusedOnce = 1;
  discover(r.out);
  sndBuy(); vibrate(15);
  const node = recipeNodes.find(n=>n.r===r);
  if(node){ node.d.classList.remove('bought'); void node.d.offsetWidth; node.d.classList.add('bought'); }
  refreshStar(); refreshHud(); save();
}

/* --- construcción de UI --- */
function buildElements(){
  const grid = $('elements-grid');
  grid.innerHTML = '';
  ELEMENTS.forEach((el,i)=>{
    const d = document.createElement('button');
    d.className = 'el-tile locked';
    d.style.setProperty('--tile-c', el.color);
    d.innerHTML = `<span class="el-num">${el.z}</span><span class="el-sym">${el.sym}</span><span class="el-cost"></span>`;
    d.addEventListener('click', ()=>elementTapped(i));
    grid.appendChild(d);
    elNodes[i] = d;
  });
  const rc = $('recipes');
  rc.innerHTML = '';
  recipeNodes.length = 0;
  RECIPES.forEach(r=>{
    const d = document.createElement('div');
    d.className = 'recipe hidden-r';
    const io = Object.entries(r.in).map(([k,v])=>v+' '+k).join(' + ');
    d.innerHTML =
      `<div class="r-body"><div class="r-io">${io} → <b>${r.out}</b></div>`+
      `<div class="r-meta">🌡 ${fmt(r.temp)} M° · ${r.refund>0?'+⚡'+fmt(r.refund):'sin energía'} · ${r.note}</div></div>`+
      `<div class="r-btns"></div>`;
    const btns = d.querySelector('.r-btns');
    [1,10].forEach(n=>{
      const b = document.createElement('button');
      b.textContent = '×'+n;
      b.addEventListener('pointerdown', ev=>{ ev.preventDefault(); runRecipe(r,n); }, {passive:false});
      btns.appendChild(b);
    });
    rc.appendChild(d);
    recipeNodes.push({ r, d, btns:[...btns.children] });
  });
}

function elementTapped(i){
  const el = ELEMENTS[i];
  const known = !!S.elements[el.sym];
  showModal((known?el.sym+' · ':'')+ (known?el.name:'¿?'),
    `Z=${el.z}<br><br>`+
    (known
      ? `Tienes: <b>${fmt(atomsOf(el.sym))} átomo${atomsOf(el.sym)===1?'':'s'}</b><br>Origen: <b>${el.via}</b><br><br>+25% activo ✓`
      : `Sin descubrir.<br>Pista: <b>${el.via}</b>`),
    [{ label:'OK', cb:()=>{} }]);
}

/* --- refresco de la pantalla estrella --- */
function refreshStar(){
  $('el-wallet').textContent = 'H × '+fmt(atomsOf('H'));
  $('el-progress').textContent = forgedCount()+'/'+ELEMENTS.length;
  $('el-mult').textContent = '×'+elementsMult().toFixed(2)+' A TODO';

  /* temperatura */
  $('temp-val').textContent = '🌡 '+fmt(Math.floor(S.temp))+' M°';
  const nextR = RECIPES.find(r=>recipeVisible(r) && S.temp < r.temp);
  $('temp-next').textContent = nextR ? (nextR.out+' a '+fmt(nextR.temp)+' M°') : '¡máximo alcanzado!';
  const goal = nextR ? nextR.temp : Math.max(S.temp,1);
  $('temp-fill').style.width = Math.min(100, S.temp/goal*100)+'%';
  $('temp-floor').textContent = 'piso permanente: '+fmt(Math.floor(S.tempFloor))+' M° · se enfría a la mitad cada 10 h';

  /* recetas */
  let anyReady = false;
  recipeNodes.forEach(({r,d,btns})=>{
    const vis = recipeVisible(r);
    d.classList.toggle('hidden-r', !vis);
    if(!vis) return;
    const st = canRun(r);
    d.classList.toggle('hot', S.temp >= r.temp);
    d.classList.toggle('ready', st==='ok');
    btns.forEach(b=>b.disabled = st!=='ok');
    if(st==='ok') anyReady = true;
  });

  /* tiles */
  ELEMENTS.forEach((el,i)=>{
    const d = elNodes[i];
    const cost = d.querySelector('.el-cost');
    d.classList.remove('locked','can','forged');
    if(S.elements[el.sym]){
      d.classList.add('forged');
      cost.textContent = '×'+fmt(atomsOf(el.sym));
    }else{
      d.classList.add('locked');
      cost.textContent = '?';
    }
  });

  /* aviso en el tab: fusión lista o H por reclamar */
  $('tab-elements').querySelector('.nav-dot').hidden = !(anyReady || pendingH()>=1);

  /* hint dinámico: el siguiente paso, siempre */
  const hint = $('elements-hint');
  const pend = pendingH();
  if(!S.elements.H){
    const target = Math.pow(S.hBase+1, 2) * PRESTIGE_UNIT;
    const pct = Math.min(99, Math.floor(S.total/target*100));
    hint.textContent = pend>=1
      ? pend+' H por reclamar → botón ☀ COLAPSO en el motor'
      : 'Consigue H: llega a '+fmt(target)+' de energía total y COLAPSA — vas al '+pct+'%';
  }else if(anyReady){
    hint.textContent = '¡FUSIONA! Las recetas verdes están listas';
  }else if(nextR && S.temp < nextR.temp && Object.keys(nextR.in).every(k=>atomsOf(k)>=nextR.in[k])){
    hint.textContent = 'Mantén 🔥 CALENTAR hasta '+fmt(nextR.temp)+' M° para fundir '+nextR.out;
  }else if(atomsOf('H') < 4 && pend >= 1){
    hint.textContent = pend+' H por reclamar → botón ☀ COLAPSO en el motor';
  }else if(atomsOf('H') < 4){
    hint.textContent = 'Junta H colapsando la nebulosa (4 H = 1 He) — tus protones y neutrones dan H extra';
  }else{
    hint.textContent = 'Acumula átomos y calor: la escalera alfa sube hasta el HIERRO';
  }
}
/* alias para el resto del código */
const refreshElements = refreshStar;
const toastQ = [];
let toastBusy = false;
function toast(msg){
  toastQ.push(msg);
  if(!toastBusy) nextToast();
}
function nextToast(){
  const el = $('toast');
  if(toastQ.length===0){ toastBusy=false; el.hidden=true; return; }
  toastBusy = true;
  el.textContent = toastQ.shift();
  el.hidden = false;
  setTimeout(nextToast, 2300);
}
function checkAchievements(){
  for(const a of ACHIEVEMENTS){
    if(S.ach[a.id]) continue;
    if(a.test(S)){
      S.ach[a.id] = 1;
      toast('🏆 '+a.name+' — '+a.msg);
      sndAch();
    }
  }
}

/* ---------- modal ---------- */
function showModal(title, html, buttons){
  $('modal-title').textContent = title;
  $('modal-body').innerHTML = html;
  const bx = $('modal-buttons');
  bx.innerHTML = '';
  buttons.forEach(b=>{
    const btn = document.createElement('button');
    btn.textContent = b.label;
    if(b.alt) btn.className = 'alt';
    btn.addEventListener('click', ()=>{ $('modal-back').hidden = true; b.cb(); });
    bx.appendChild(btn);
  });
  $('modal-back').hidden = false;
}

/* ---------- shake ---------- */
function shake(){
  stage.classList.remove('shake'); void stage.offsetWidth;
  stage.classList.add('shake');
}

/* ---------- mute ---------- */
$('mute').addEventListener('click', ()=>{
  S.muted = !S.muted;
  $('mute').classList.toggle('off', S.muted);
  save();
});

/* ---------- ganancias offline ---------- */
function offlineGains(){
  const away = (Date.now() - S.t)/1000;
  if(away < 120) return;
  const rate = baseEps() * globalMult();
  if(rate <= 0) return;
  const capped = Math.min(away, 6*3600);
  const gain = rate * capped * 0.5;
  S.e += gain; S.total += gain;
  const mins = Math.floor(capped/60);
  showModal('😴 ¡VOLVISTE!',
    `Tus partículas trabajaron <b>${mins} min</b> sin ti y produjeron<br><br><b style="font-size:14px">⚡${fmt(gain)}</b>`,
    [{ label:'¡GENIAL!', cb:()=>{} }]);
}

/* ---------- loop principal ---------- */
let lastT = now(), accInc = 0, accSave = 0, accUi = 0;
function frame(t){
  if(window.__pause){ requestAnimationFrame(frame); return; }
  const dt = Math.min(0.1, (t - lastT)/1000);
  lastT = t;

  /* ingreso pasivo */
  S.e += eps()*dt;
  S.total += eps()*dt;

  /* la estrella: se enfría siempre, se calienta si mantienes el botón */
  coolTick(dt);
  heatTick(dt);

  /* decaimiento del combo */
  if(!feverOn() && t - lastTapT > 500){
    heat = Math.max(0, heat - 20*dt);
    if(t - lastTapT > 1200) comboShown = 0;
  }
  $('combo-bar').style.width = (feverOn()? 100 : heat) + '%';

  /* fin de fiebre */
  if(!feverOn() && stage.classList.contains('fever')){
    stage.classList.remove('fever');
    $('fever-label').hidden = true;
  }
  /* etiqueta de frenesí */
  const bl = $('buff-label');
  if(frenzyOn()){
    bl.hidden = false;
    bl.textContent = '🔥 FRENESÍ x7 · '+Math.ceil((buffs.frenzyUntil-t)/1000)+'s';
  } else bl.hidden = true;

  if(screen === 'motor'){
    maybeQuark(t);
    draw(t);
  }

  accUi += dt;
  if(accUi > 0.2){
    accUi = 0;
    refreshHud(); refreshShop(); refreshPrestige(); refreshElements(); checkAchievements();
  }
  accSave += dt;
  if(accSave > 10){ accSave = 0; save(); }

  requestAnimationFrame(frame);
}

/* ---------- arranque ---------- */
function main(){
  const had = load();
  if(had){
    /* enfriamiento offline: la estrella siguió perdiendo calor sin ti */
    const away = Math.max(0, (Date.now() - S.t)/1000);
    coolTick(away);
  }
  buildShop();
  buildElements();
  resize();
  scheduleQuark();
  $('mute').classList.toggle('off', S.muted);
  if(had) offlineGains();
  refreshHud(); refreshShop(); refreshPrestige();
  requestAnimationFrame(frame);
}
document.addEventListener('visibilitychange', ()=>{ if(document.hidden) save(); });
window.addEventListener('pagehide', save);
main();
