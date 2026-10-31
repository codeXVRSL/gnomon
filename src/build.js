const fs=require('fs');const LV=require('./levels.js');const run=require('./test.js');const S=require('./runall.js');
LV.forEach((lv,i)=>{const sc=S[lv.name];if(sc){const r=run(i,sc);lv.par=Math.round(r.st.hours*10)/10;const flat=JSON.stringify(sc.map(x=>x[0]));lv.uses={flip:/F/.test(flat),pin:/P/.test(flat)};if(!r.won)console.log('WARN not won',lv.name);}});
const eng=fs.readFileSync('engine.js','utf8').replace(/if \(typeof module[^\n]*\n/,'');
let t=fs.readFileSync('template.html','utf8').replace('/*__ENGINE__*/',eng).replace('/*__LEVELS__*/','const LEVELS = '+JSON.stringify(LV)+';');
fs.writeFileSync('../out/gnomon.html',t);
// standalone build for real hosting: full document skeleton (the artifact host adds this itself)
let body=t; const headBits=[];
body=body.replace(/<title>[\s\S]*?<\/title>\n?/, m=>{headBits.push(m.trim());return '';});
body=body.replace(/<meta name="claude:viewport-fit-sides"[^>]*>\n?/, '');
body=body.replace(/<link [^>]*>\n?/g, m=>{headBits.push(m.trim());return '';});
const head='<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">\n<meta name="theme-color" content="#191529">\n<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="mobile-web-app-capable" content="yes">\n<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n<meta name="description" content="Gnomon — a two-world pixel platformer on a sundial clock.">\n'+headBits.join('\n')+'\n<style>html{color-scheme:dark;height:100%;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px);box-sizing:border-box}body{margin:0;height:100%;font:14px system-ui,sans-serif;overscroll-behavior:none}img{max-width:100%}[hidden]{display:none!important}</style>\n</head>\n<body>\n';
fs.writeFileSync('../out/standalone.html', head+body+'\n</body>\n</html>\n');
console.log('standalone written');console.log('built',t.length);
