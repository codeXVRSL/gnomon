const run = require('./test.js'); const LV = require('./levels.js');
function rep(a,b,n){const o=[];for(let i=0;i<n;i++){o.push(a,b)}return o}
const E_ = require('./engine.js');
const hawkNear = s => { const b = s.enemies[0]; return !s.s.gone && s.s.ground && Math.abs(b.x + E_.castDx(s.t) - s.s.x) < 14; };
const fr_ = s => s.t - Math.floor(s.t);
const hawkNear2 = s => s.enemies.some(b => { const bx = b.x + E_.castDx(s.t), by = 168 - b.y - 8; return !s.s.gone && s.s.ground && Math.abs(bx - s.s.x) < 14 && Math.abs(by - s.s.y) < 14; });
const S = {
 'Crescent B': [['R',s=>s.p.x>=75],['W',s=>{const p=E_.pressedSet(E_.parse(LV[LV.findIndex(l=>l.name==='Crescent B')]),s);return (p.has('A')&&p.has('B'))||s.t>3}],['R',s=>s.p.x>=132],['RJ',8],['RJX',1],['RJ',8],['R',s=>s.p.x>=200||s.p.ground&&s.p.x>=190],['RJ',10],['UX',1],['',8],['R',600]],
 'Night Walk B': [['R',s=>s.p.x>=130||s.t>6.9],['W',s=>s.sleeping],['R',s=>s.s.x>=80],['RJ',30],['R',s=>s.s.x>=148],['F',1],['',40],['R',s=>s.s.x>=172],['F',1],['',40],['R',s=>s.s.x>=230],['W',s=>s.day==2||s.won],['',30]],
 'Epilogue': [['R',s=>s.p.x>=110],['RP',1],['R',s=>s.p.x>=147||s.t>6.9],['W',s=>[...E_.pressedSet(E_.parse(LV[LV.findIndex(l=>l.name==='Epilogue')]),s)].includes('A')||s.t>6.8],['R',s=>s.p.x>=206||s.t>6.95],['W',s=>s.sleeping],['R',s=>s.s.x>=236],['W',s=>s.day==2],['',20],['R',s=>s.p.x>=252],['RJ',30],['R',600]],
 'Hawk Hours B': [['R',s=>s.p.x>=132],['RJ',8],['RJX',1],['RJ',8],['RX',1],...Array.from({length:4},()=>[['R',s=>hawkNear2(s)||s.won],['RJ',24]]).flat(),['R',600]],
 'High Noon B': [['R',s=>s.p.x>=22],['RJ',30],['R',s=>s.p.x>=70],['RJ',10],['UX',1],['',8],['R',s=>s.p.ground],['R',s=>s.p.x>=100],['RJ',30],['R',s=>s.p.x>=150],['',s=>!s.s.gone&&s.t>3.76||s.t>6.9],['R',s=>s.p.x>=171||s.t>6.9],['',s=>s.t>=3.9],['R',600]],
 'Two Nights': [['W',s=>s.sleeping],['R',s=>s.s.x>=120],['RJ',30],['R',s=>s.s.x>=180],['W',s=>s.day==2],['W',s=>s.sleeping],['R',s=>s.s.x>=250],['RJ',30],['R',s=>s.s.x>=324],['W',s=>s.day==3||s.won],['',30]],
 'Night Flip': [['W',s=>s.sleeping],['R',s=>s.s.x>=70],['F',1],['',40],['R',s=>s.s.x>=110],['F',1],['',40],['R',s=>s.s.x>=206],['W',s=>s.day==2||s.won],['',30]],
 'Night Walk': [['R',s=>s.p.x>=130||s.t>6.9],['W',s=>s.sleeping],['R',s=>s.s.x>=86],['RJ',30],['R',s=>s.s.x>=150],['RJ',30],['R',s=>s.s.x>=204],['W',s=>s.day==2||s.won],['',30]],
 'Moonlamps': [['W',s=>s.sleeping],['R',s=>s.s.x>=56],['RJ',30],['R',s=>s.s.x>=130],['RJ',30],['R',s=>s.s.x>=228],['W',s=>s.day==2||s.won],['',30]],
 'In the Shade': [['R',s=>s.p.x>=80],['W',s=>s.t>=1.7],['R',s=>s.p.x>=96],['RJ',30],['R',600]],
  'Three Nights': [['W',s=>s.sleeping],['R',s=>s.s.x>=120],['RJ',30],['R',s=>s.s.x>=180],['W',s=>s.day==2],['W',s=>s.sleeping],['R',s=>s.s.x>=300],['W',s=>s.day==3],['W',s=>s.sleeping],['R',s=>s.s.x>=390],['RJ',30],['R',s=>s.s.x>=430],['W',s=>s.day==4||s.won],['R',600]],
  'Upside Midnight': [['R',s=>s.p.x>=100],['W',s=>s.sleeping],['F',1],['',40],['R',s=>s.s.x>=118],['F',1],['',40],['R',s=>s.s.x>=200],['W',s=>s.day==2],['R',400]],
  'Lamplit Night': [['W',s=>s.sleeping],['R',s=>s.s.x>=56],['RJ',30],['R',s=>s.s.x>=80],['RJ',30],['R',s=>s.s.x>=166],['RJ',30],['R',s=>s.s.x>=228],['W',s=>s.day==2||s.won],['',30]],
  'Backward Noon': [['R',s=>s.p.x>=110],['F',1],['',40],...Array.from({length:12},(_, k)=>[k%2?'R':'L',k%2?(s=>s.p.x>=110||s.t<=2.6):(s=>s.p.x<=50||s.t<=2.6)]),['R',s=>s.p.x>=110],['F',1],['',40],['W',s=>E_.pressedSet(E_.parse(LV[LV.findIndex(l=>l.name==='Backward Noon')]),s).has('A')||s.t>6.9],['R',600]],
  'Two Lanterns': [['R',s=>s.enemies.some(e=>e.x>s.p.x-4&&e.x-s.p.x<36)],['RJ',30],['R',s=>s.enemies.some(e=>e.x>s.p.x-4&&e.x-s.p.x<24)],['RJ',30],['R',900]],
  'Under the Chime': [['R',s=>s.p.x>=48],['W',s=>s.t>1&&s.t%1>=0.05&&s.t%1<0.15],['R',s=>s.p.x>=140],['W',s=>s.t>2&&s.t%1>=0.05&&s.t%1<0.15],['R',900]],
  'Mirror Hours': [['R',s=>s.p.x>=46],['RJ',30],['R',s=>s.p.x>=130],['W',s=>s.t>=3.2],['RJ',30],['R',600]],
  'Stone Nights': [['R',s=>s.p.x>=96],['W',s=>s.t>=3.6],['R',s=>s.p.x>=170],['W',s=>s.sleeping],['R',s=>s.s.x>=200],['W',s=>s.day==2&&!s.sleeping],['R',600]],
  'Two Locks': [['R',s=>s.p.x>=200],['W',s=>s.t>=4.75],['R',600]],
 'Bright Staff': [['R',s=>s.p.x>=40],['RP',1],['R',s=>s.p.x>=99||s.t>9],['W',s=>{const p=E_.pressedSet(E_.parse(LV[LV.findIndex(l=>l.name==='Bright Staff')]),s);return (p.has('A')&&p.has('B'))||s.t>6.9}],['RM',1500]],
 'Plant at Dusk': [['R',s=>s.p.x>=70],['RP',1],['R',s=>s.atG],['W',1500]],
 'Plant the Hour B': [['R',s=>s.p.x>=84],['RP',1],['R',s=>s.p.x>=146||s.won],['W',s=>[...E_.pressedSet(E_.parse(LV[LV.findIndex(l=>l.name==='Plant the Hour B')]),s)].includes('A')||s.t>6.9],['R',300]],
 'Meet at Dusk B': [['R',s=>s.p.x>=110],['W',s=>s.t>=3.8],['R',s=>s.atG],['W',900]],
 'Passing Cloud B': [['R',s=>s.p.x>=122],['W',s=>!s.s.gone&&s.t>2.2],['R',s=>s.p.x>=254||s.t>6.9],['W',s=>!s.s.gone&&s.t>4.8],['R',600]],
 'In the Shade B': [['R',s=>s.p.x>=36],['RJ',30],['R',s=>s.p.x>=80],['',s=>s.t>=1.9],['R',s=>s.p.x>=96],['RJ',30],['R',600]],
 'Last Light': [['R',s=>s.p.x>=46],['RJ',30],['R',s=>s.p.x>=164],['RJ',12],['RUX',1],['R',20],['R',s=>s.p.x>=230],['RJ',14],['RX',1],['R',s=>s.p.x>=380],['RJ',12],['RUX',1],['R',20],['R',s=>s.p.x>=488],['RJ',25],['R',s=>s.p.x>=548],['RJ',25],['R',600]],
 'Chime Run': [['R',s=>s.p.x>=56],['',s=>fr_(s)<0.25&&fr_(s)>0.02],['R',s=>s.p.x>=246],['RJ',8],['R',6],['LJ',1],['L',6],['LJ',1],['R',1],['RJ',40],['R',s=>s.p.x>=380],['',s=>fr_(s)<0.25&&fr_(s)>0.02],['R',s=>s.p.x>=500],['RJ',30],['R',600]],
 'Eclipse B': [['R',s=>s.p.x>=72],['W',s=>s.t>=2.05],['R',s=>s.p.x>=124],['RJ',30],['R',s=>s.p.x>=172],['RJ',12],['RUX',1],['R',8],['RX',1],['R',s=>s.p.x>=276||s.won],['RJ',16],['R',600]],
 'Tower Clock B': [['R',s=>s.p.x>=96],['RJ',30],['R',s=>s.p.x>=152],['RJ',12],['RJUX',1],['',s=>s.p.ground],['R',s=>s.p.x>=184],['RJ',8],['RX',1],['R',s=>s.p.x>=255||s.t>6.9],['',s=>s.t>=5.0||s.t>=6.9],['R',600]],
 'Tower Clock': [['R',s=>s.p.x>=111],['W',s=>s.t>=5.0],['R',900]],
 'Crescent': [['R',s=>s.p.x>=75],['W',s=>s.t>=1.7],['R',900]],
 'Hawk Hours': [...Array.from({length:5},()=>[['R',s=>hawkNear(s)],['RJ',30]]).flat(),['R',900]],
 'The Hour Hand': [['W',s=>s.s.x<=46],['R',600]],
 'High Noon': [['R',s=>s.p.x>=104],['W',s=>!s.s.gone&&s.t>3.6],['R',600]],
 'Passing Cloud': [['R',s=>s.p.x>=134],['W',s=>!s.s.gone&&s.t>2.25],['R',600]],
 'Meet at Dusk': [['R',s=>s.atG],['W',900]],
 'Two Worlds': [['R',1500]],
 'Mirror Steps': [['R',s=>s.p.x>=46],['RJ',30],['R',s=>s.p.x>=130],['RJ',30],['R',600]],
 'Plant the Hour': [['R',s=>s.p.x>=84],['RP',1],['R',900]],
 'Turn the Dial': [['R',s=>s.p.x>=80],['F',1],['',40],['R',s=>s.p.x>=131],['RJ',30],['R',s=>s.p.x>=180],['',20],['F',1],['',40],['R',600]],
 'Bright Water': [['R',s=>s.p.x>=99||s.t>9],['W',s=>s.t>=4.9],['RM',1500]],
 'Old Still Water': [['R',s=>s.p.x>=40], ['RM',s=>s.s.x>=122], ['RMP',s=>s.p.x>=100], ['RP',s=>s.p.x>=118], ['R',600]],
 'Backward Sun': [['F',1],['',40],['R',s=>s.p.x>=96],['L',s=>s.p.x<=60],['R',s=>s.p.x>=96],['L',s=>s.t<=2.2||s.p.x<=30],['R',s=>s.p.x>=96],['F',1],['',40],['R',600]],
 "Yesterday's Cloud": [['F',1],['',40],...Array.from({length:12},()=>[['R',s=>s.p.x>=96||s.t<=1.45],['L',s=>s.p.x<=60||s.t<=1.45]]).flat(),['R',s=>s.p.x>=98],['W',s=>!s.s.gone&&s.t<0.98],['F',1],['',40],['R',600]],
 'Eclipse': [['R',s=>s.p.x>=72],['W',s=>s.t>=2.05],['R',s=>s.p.x>=154],['RJ',22],['R',s=>s.p.x>=234],['RJ',22],['R',s=>s.p.x>=330],['RJ',22],['R',400]],
 'Stone Hours': [['R',s=>s.p.x>=84],['W',s=>s.t>=3.5],['R',900]],
 'Sunstones': [['L',s=>s.p.x<=100],['W',s=>s.t>=5.6],['L',900]],
 'Hour Chime': [['R',s=>s.p.x>=58],['W',s=>s.t>=2.0],['R',s=>s.p.x>=142],['W',s=>s.t>=4.0],['R',900]],
 'Falling Stones': [['R',s=>s.p.x>=46],['RP',1],['R',900]],
 'Spring Tide': [['R',s=>s.s.x>=110],['RJ',30],['R',600]],
 'Upside Dusk': [['R',s=>s.p.x>=100],['W',s=>s.sleeping],['F',1],['',40],['R',s=>s.s.x>=190],['W',s=>s.day==2],['F',1],['',40],['R',400]],
 'Gnomon': [['F',1],['',40],['R',s=>s.p.x>=100],['F',1],['',40],['R',s=>s.p.x>=106],['RP',1],['R',s=>s.p.x>=166||s.t>6.9],['W',s=>(s.t-Math.floor(s.t))<0.15],['R',600]],
};
S['The Deep Dial'] = [['RM',s=>s.p.x>=88],['W',s=>(s.s.x>84&&s.s.x<106)||s.t>6],['R',s=>s.p.x>=112],['R',s=>s.p.x>=150],['',25],['F',1],['',40],['RJ',s=>s.p.x>=190],['F',1],['',40],['R',s=>s.p.x>=218],['W',s=>(s.t-Math.floor(s.t))<0.08],['R',s=>s.p.x>=296],['W',s=>s.sleeping],['R',s=>s.s.x>=336],['W',s=>s.day==2||s.won],['R',s=>s.p.x>=380],['W',s=>s.t>=1.05],['R',s=>s.p.x>=444],['RJ',22],['R',900]];
S['Lantern Walk'] = [['R',s=>s.enemies[0].x<s.p.x+16],['RJ',30],['R',600]];
S['Late Light'] = S['Last Light'];
module.exports = S;
if (require.main === module) LV.forEach((lv, i) => { const sc = S[lv.name]; if (!sc) return console.log(i+1, lv.name, 'NO SCRIPT'); const r = run(i, sc); const naive = run(i, [['R', 1200]]); console.log((i+1+'').padStart(2), lv.name.padEnd(16), r.won ? 'WON ' : 'FAIL', 'hrs', r.st.hours.toFixed(1), '| naive', naive.won ? 'wins!' : 'fails', r.won ? '' : r.log.slice(-2).join(' ; ')); });
