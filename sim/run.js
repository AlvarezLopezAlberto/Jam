'use strict';
/* Runner: enfrenta estrategias y compara hitos.
   uso: node sim/run.js [días] */
const { Game } = require('./engine');
const { Agent, HOUR, DAY } = require('./agent');

const days = parseFloat(process.argv[2] || '7');
const HORIZON = days * DAY;

function fmt(n){
  if(n === undefined || n === null) return '—';
  if(n < 1000) return n.toFixed(n<10?2:0);
  const S = ['','K','M','B','T','Qa','Qi','Sx','Sp','Oc','No','Dc'];
  let i = 0; while(n >= 1000 && i < S.length-1){ n/=1000; i++; }
  return (n>=100?n.toFixed(0):n>=10?n.toFixed(1):n.toFixed(2)) + S[i];
}
function ft(sec){
  if(sec === undefined) return '—';
  if(sec < 60) return sec.toFixed(0)+'s';
  if(sec < 3600) return (sec/60).toFixed(1)+'m';
  if(sec < DAY) return (sec/3600).toFixed(1)+'h';
  return (sec/DAY).toFixed(1)+'d';
}

const STRATEGIES = [
  { name:'casual', tapRate:2, catchQuarks:true, activeSec:5*60, offlineSec:115*60,
    collapseMode:'total', starShare:0.3 },
  { name:'activo-total', collapseMode:'total', minPending:1 },
  { name:'bomba-parcial', collapseMode:'pump', pumpProtonBudget:0.5 },
  { name:'hibrido', collapseMode:'hybrid', pumpProtonBudget:0.5 },
  { name:'refund-rush', collapseMode:'total', minPending:1, starShare:0.55, heatWhenBank:2 },
  { name:'hoard-nova', collapseMode:'hybrid', hReserve:400, novaMinAtoms:400 },
  { name:'colapso-avaro', collapseMode:'total', relGainMin:0.05 },
  { name:'sin-novas', collapseMode:'total', novaAsap:false },
];

const seeds = (process.argv[3]||'1,2,3').split(',').map(Number);
const MS = ['primerColapso','H10','H100','helio','hierro','nova1','nat92','all118','roto'];

const results = [];
for(const st of STRATEGIES){
  const runs = [];
  for(const seed of seeds){
    const g = new Game(seed);
    const a = new Agent(g, st);
    const r = a.play(HORIZON);
    runs.push({ snap: g.snapshot(), ms: r.milestones, g });
  }
  /* mediana simple por hito */
  const med = arr => { const s=[...arr].sort((a,b)=>a-b); return s[Math.floor(s.length/2)]; };
  const msMed = {};
  for(const m of MS){
    const vals = runs.map(r=>r.ms[m]).filter(v=>v!==undefined);
    if(vals.length === runs.length) msMed[m] = med(vals);
    else if(vals.length) msMed[m] = med(vals); // parcial: igual reporta
  }
  const nColl = g => g.log.filter(e=>e.kind==='colapsoTotal'||e.kind==='colapsoParcial').length;
  results.push({ name: st.name,
    ms: msMed,
    hEver: med(runs.map(r=>r.snap.hEver)),
    elements: med(runs.map(r=>r.snap.elements)),
    dust: med(runs.map(r=>r.snap.novas)),
    eps: med(runs.map(r=>r.snap.eps)),
    mult: med(runs.map(r=>r.snap.mult)),
    total: med(runs.map(r=>r.snap.total)),
    active: med(runs.map(r=>r.snap.activeSeconds)),
    colapsos: med(runs.map(r=>nColl(r.g))),
  });
}

console.log('=== ¡ÁTOMO LOCO! — resultados a '+days+' días (mediana de '+seeds.length+' seeds) ===\n');
const cols = ['estrategia','1erColapso','H10','H100','He','Fe','nova1','nat92','118','ROTO','hEver','elem','novas','colapsos','mult','activo'];
const rows = results.map(r=>[
  r.name, ft(r.ms.primerColapso), ft(r.ms.H10), ft(r.ms.H100), ft(r.ms.helio), ft(r.ms.hierro),
  ft(r.ms.nova1), ft(r.ms.nat92), ft(r.ms.all118), ft(r.ms.roto),
  fmt(r.hEver), String(r.elements), String(r.dust), fmt(r.colapsos), fmt(r.mult), ft(r.active),
]);
const widths = cols.map((c,i)=>Math.max(c.length, ...rows.map(r=>r[i].length)));
console.log(cols.map((c,i)=>c.padEnd(widths[i])).join('  '));
console.log(widths.map(w=>'-'.repeat(w)).join('  '));
rows.forEach(r=>console.log(r.map((v,i)=>v.padEnd(widths[i])).join('  ')));
