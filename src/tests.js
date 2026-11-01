// one-command regression check: rules (runall), random inputs (fuzz) and a headless browser smoke test
const { execSync } = require('child_process');
const out = execSync('node runall.js', { cwd: __dirname }).toString();
const fails = out.split('\n').filter(l => /FAIL|NO SCRIPT/.test(l)), naive = out.split('\n').filter(l => /naive wins/.test(l) && !/Two Worlds/.test(l));
console.log('runall:', out.split('\n').filter(l => / WON /.test(l)).length, 'won', fails.length ? 'FAILS: ' + fails.join(' | ') : '', naive.length ? 'NAIVE WINS: ' + naive.join(' | ') : '');
console.log(execSync('RUNS=4 node fuzz.js', { cwd: __dirname }).toString().trim().split('\n').pop());
(async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 900, height: 700 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + require('path').resolve(__dirname, '../out/gnomon.html') + '?test'); await p.waitForTimeout(600);
  const step = async (n, f) => { try { await f(); console.log('ok  ', n); } catch (e) { console.log('FAIL', n, e.message.split('\n')[0]); errs.push(n); } };
  const menu = () => p.evaluate(() => { window.__gnomon.hideCard(); [...document.querySelectorAll('button')].find(x => /levels/i.test(x.textContent)).click(); });
  await step('win card', async () => { await p.evaluate(() => { window.__gnomon.hideCard(); window.__gnomon.load(0); window.__gnomon.win(); }); await p.waitForSelector('#card h2'); });
  await step('menu', async () => { await menu(); await p.waitForSelector('.lv-btn'); });
  for (const id of ['statsBtn', 'assistBtn', 'howBtn', 'editBtn']) await step(id, async () => { await menu(); await p.click('#' + id); await p.waitForTimeout(150); if (await p.evaluate(() => document.getElementById('overlay').hidden)) throw new Error('card did not open'); });
  await step('editor play', async () => { await menu(); await p.click('#editBtn'); await p.waitForTimeout(150); await p.click('#edPlay'); await p.waitForTimeout(300); if (!(await p.evaluate(() => document.getElementById('overlay').hidden))) throw new Error('custom stage did not start'); });
  await step('play 120 frames', async () => { await p.evaluate(() => { window.__gnomon.hideCard(); window.__gnomon.load(3); window.__gnomon.keys.r = 1; }); await p.waitForTimeout(2000); });
  console.log(errs.length ? 'browser errors: ' + errs.join(' | ') : 'browser: no errors'); await b.close(); process.exit(errs.length || fails.length ? 1 : 0);
})();
