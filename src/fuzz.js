const E = require('./engine.js'); const LV = require('./levels.js');
let seed = 12345; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
let errors = 0, frames = 0, deaths = 0, wins = 0;
for (let li = 0; li < LV.length; li++) {
  for (let run = 0; run < 12; run++) {
    const L = E.parse(LV[li]); const st = E.init(L);
    let keys = {}; 
    for (let f = 0; f < 3000; f++) {
      if (f % 7 === 0) keys = { l: rnd() < .3, r: rnd() < .5, jump: rnd() < .15, jumpHeld: rnd() < .5, wait: rnd() < .2, pin: rnd() < .15, flip: rnd() < .05 };
      try { E.update(L, st, keys); } catch (e) { errors++; console.log('ERR level', li + 1, 'frame', f, e.message); break; }
      frames++;
      if (st.events.includes('death')) deaths++;
      // invariants
      const p = st.p, s = st.s;
      if (!isFinite(p.x) || !isFinite(p.y) || !isFinite(s.x) || !isFinite(s.y)) { errors++; console.log('NaN level', li + 1); break; }
      if (!st.won && !st.sleeping && p.y > E.HZ + 20) { errors++; console.log('player below horizon without death', li + 1, p.y); break; }
      if (st.won) { wins++; break; }
    }
  }
}
console.log('frames', frames, 'deaths', deaths, 'wins', wins, 'errors', errors);
