const run = require('./test.js'); const LV = require('./levels.js');
function rep(a,b,n){const o=[];for(let i=0;i<n;i++){o.push(a,b)}return o}
const S = {
 'The Hour Hand': [['W',s=>s.s.x<=46],['R',600]],
 'High Noon': [['R',s=>s.p.x>=104],['W',s=>!s.s.gone&&s.t>3.6],['R',600]],
 'Two Worlds': [['R',1500]],
 'Mirror Steps': [['R',s=>s.p.x>=46],['RJ',30],['R',s=>s.p.x>=130],['RJ',30],['R',600]],
 'Hold Still': [['R',s=>s.s.x>=46],['RP',900]],
 'Turn the Dial': [['R',s=>s.p.x>=80],['F',1],['',40],['R',s=>s.p.x>=131],['RJ',30],['R',s=>s.p.x>=180],['F',1],['',40],['R',600]],
 'Still Water': [['R',s=>s.p.x>=40], ['RM',s=>s.s.x>=122], ['RMP',s=>s.p.x>=100], ['RP',s=>s.p.x>=118], ['R',600]],
 'Backward Sun': [['F',1],['',40],['R',s=>s.p.x>=96],['L',s=>s.p.x<=60],['R',s=>s.p.x>=96],['L',s=>s.t<=2.2||s.p.x<=30],['R',s=>s.p.x>=96],['F',1],['',40],['R',600]],
 'Stone Hours': [['R',s=>s.p.x>=84],['W',s=>s.t>=3.5],['R',900]],
 'Sunstones': [['L',s=>s.p.x<=100],['W',s=>s.t>=5.6],['L',900]],
 'Hour Chime': [['R',s=>s.p.x>=58],['W',s=>s.t>=2.0],['R',s=>s.p.x>=142],['W',s=>s.t>=4.0],['R',900]],
 'Falling Stones': [['R',s=>s.s.x>=68],['RP',900]],
 'Spring Tide': [['R',s=>s.s.x>=110],['RJ',30],['R',600]],
 'Upside Dusk': [['R',s=>s.p.x>=100],['W',s=>s.sleeping],['F',1],['',40],['R',s=>s.s.x>=190],['W',s=>s.day==2],['F',1],['',40],['R',400]],
 'Gnomon': [['F',1],['',40],['R',s=>s.p.x>=100],['F',1],['',40],['R',s=>s.s.x>=130],['RP',s=>s.p.x>=170],['W',s=>s.sleeping],['R',s=>s.s.x>=214],['W',s=>s.day==2||s.won]],
};
S['The Deep Dial'] = [['RM',s=>s.s.x>=92],['RMP',s=>s.p.x>=88],['RP',s=>s.p.x>=112],['R',s=>s.p.x>=150],['',25],['F',1],['',40],['R',s=>s.p.x>=190],['F',1],['',40],['R',s=>s.p.x>=218],['W',s=>(s.t-Math.floor(s.t))<0.08],['R',s=>s.p.x>=296],['W',s=>s.sleeping],['R',s=>s.s.x>=336],['W',s=>s.day==2||s.won]];
S['Lantern Walk'] = [['R',s=>s.enemies[0].x<s.p.x+16],['RJ',30],['R',600]];
module.exports = S;
if (require.main === module) LV.forEach((lv, i) => { const sc = S[lv.name]; if (!sc) return console.log(i+1, lv.name, 'NO SCRIPT'); const r = run(i, sc); const naive = run(i, [['R', 1200]]); console.log((i+1+'').padStart(2), lv.name.padEnd(16), r.won ? 'WON ' : 'FAIL', 'hrs', r.st.hours.toFixed(1), '| naive', naive.won ? 'wins!' : 'fails', r.won ? '' : r.log.slice(-2).join(' ; ')); });
