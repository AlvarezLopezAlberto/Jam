'use strict';
/* traza una sola estrategia con progreso por hora simulada */
const { Game } = require('./engine');
const { Agent, HOUR } = require('./agent');

const st = JSON.parse(process.argv[2] || '{"name":"activo-total","collapseMode":"total"}');
const hours = parseFloat(process.argv[3] || '6');

const g = new Game(1);
const a = new Agent(g, st);
let nextP = 0;
const t0 = Date.now();
while(g.t < hours*HOUR){
  a.activeSecond();
  if(g.t >= nextP){
    const s = g.snapshot();
    console.log(`[${(Date.now()-t0)/1000}s real] t=${(g.t/3600).toFixed(2)}h e=${s.e.toExponential(2)} total=${s.total.toExponential(2)} hEver=${s.hEver} temp=${s.temp} floor=${s.floor} elem=${s.elements} H=${s.H} mult=${s.mult.toExponential(2)}`);
    nextP += HOUR/4;
  }
  if(Date.now()-t0 > 60000){ console.log('REAL TIMEOUT'); break; }
  if(g.t >= a.p.activeSec && a.p.offlineSec){ /* solo sesión activa en trace */ }
}
