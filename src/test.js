const E = require('./engine.js'); const LV = require('./levels.js');
// script: [[keys, until], ...] keys: R L J W P(pin hold) F(flip, edge on first frame) ; until: frames or fn(st)
function run(i, script, rec) {
  const L = E.parse(LV[i]); const st = E.init(L); let f = 0; const log = [];
  for (const [keys, until] of script) {
    let n = 0, first = true;
    for (;;) {
      if (typeof until === 'number' ? n >= until : until(st)) break;
      if (n > 4000) { log.push('timeout ' + keys); break; }
      const inp = { l: keys.includes('L'), r: keys.includes('R'), jump: (keys.includes('J') && first) || (keys.includes('M') && n % 8 === 0), jumpHeld: keys.includes('J') || (keys.includes('M') && n % 8 < 5), wait: keys.includes('W'), pin: keys.includes('P'), flip: keys.includes('F') && first, up: keys.includes('U'), down: keys.includes('D'), view: keys.includes('V') && first, dash: keys.includes('X') && first };
      first = false;
      if (rec) rec.push(['l', 'r', 'jump', 'jumpHeld', 'wait', 'pin', 'flip', 'dash', 'up', 'down'].reduce((m, k, b) => m | (inp[k] ? 1 << b : 0), 0));
      E.update(L, st, inp); n++; f++;
      for (const ev of st.events) if (!['jump', 'land', 'hour', 'chime', 'crumble', 'spring', 'checkpoint', 'swim', 'view', 'hour', 'rewind'].includes(ev)) log.push(`${ev}@f${f} t=${st.t.toFixed(2)} g${st.grav} p=${st.p.x.toFixed(0)},${st.p.y.toFixed(0)} s=${st.s.x.toFixed(0)},${st.s.y.toFixed(0)} h${st.s.h} pin${st.pin | 0}`);
      if (st.won) return { won: true, f, st, log };
      if (st.events.includes('death')) return { won: false, f, st, log };
    }
  }
  return { won: false, f, st, log };
}
module.exports = run;
if (require.main === module) {
  const i = +process.argv[2]; const sc = eval(process.argv[3]);
  const r = run(i, sc); console.log(r.won ? 'WON' : 'FAIL', 'frames', r.f, 't', r.st.t.toFixed(2), 'day', r.st.day, 'g', r.st.grav, 'p', r.st.p.x.toFixed(1), r.st.p.y.toFixed(1), 's', r.st.s.x.toFixed(1), r.st.s.y.toFixed(1), 'h', r.st.s.h, 'shards', r.st.shardsGot); console.log(r.log.join('\n'));
}
