// Two worlds, one clock — v3: gravity flip, pin, traps
const TS = 12, ROWS = 14, HALF = 7, HZ = HALF * TS;
const PHYS = { g: 0.3, gFall: 0.42, gHang: 0.14, hangV: 0.9, jump: 4.6, run: 1.65, accel: 0.42, decel: 0.55, airAccel: 0.3, airDecel: 0.1, maxFall: 5.5, coyote: 6, buffer: 6, spring: 7.2, corner: 3 };
// Celeste-style moves: wall slide + wall jump (alternate walls to climb), and the Sun Dash: 8 directions, refills on the ground, costs half an hour
const WALL = { slide: 1.3, jumpX: 2.3, jumpY: 4.3, lock: 9 };
const DASH = { v: 3.6, frames: 9, cost: 0.5, endUp: 0.45, refillCd: 150 };
const HOUR_PX = 60, WAIT_RATE = 1 / 40, NOON = 3.5, NOON_GAP = 0.25, DUSK = 7, DAY_TOTAL = 10, FLIP_COST = 0.5;
const WATER = { g: 0.08, maxFall: 1.0, run: 0.8, stroke: 1.6, strokeCd: 8, exit: 3.3 };
const PW = 8, PH = 11, SW = 8, SH = 11, NIGHT_H = 11;
const CAST_K = 18; // px the sun slides a shadow per hour (±63 px over the day)
const ENEMY_SPEED = 60, EW = 8, EH = 8, LANTERN_R = 10; // enemies move per hour of game time // px of slab drift per hour
const PIN_MAX = 140, PIN_DRAIN = 1, PIN_REFILL = 0.4;
const STAFF_W = 4, STAFF_H = 22; // the gnomon staff you plant: its shadow is a post in the world below
const MARK_K = 12; // px per hour the shadow's hour mark slides east
const CRUMBLE_SHAKE = 22, CRUMBLE_GONE = 130;
const CHIME_WARN = 0.6, CHIME_ON = 0.75; // fraction of the hour

function parse(def) {
  const rows = def.map, W = Math.max(...rows.map(r => r.length));
  const grid = rows.map(r => r.padEnd(W, '.').split(''));
  let start = null; const lamps = [], shards = [], stones = [], enemies = [], casters = [], marks = [], crystals = [], flags = [];
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < W; x++) {
    const c = grid[y][x];
    if (c === 'S') { start = [x, y]; grid[y][x] = '.'; }
    if (c === '*') lamps.push([x * TS + TS / 2, y * TS + TS / 2]);
    if (c === 'o') { shards.push([x, y]); grid[y][x] = '.'; }
    if (c === '=' && y < HALF) stones.push([x, y]);
    if ((c === 'h' || c === 'H') && y >= HALF) { enemies.push({ kind: 'hound', world: 'bot', x: x * TS + 2, y: y * TS, dir: c === 'H' ? 1 : -1 }); grid[y][x] = '.'; }
    if ((c === 'y' || c === 'Y') && y < HALF) { enemies.push({ kind: 'bird', world: 'top', x: x * TS + 2, y: y * TS + 2, dir: c === 'Y' ? 1 : -1 }); grid[y][x] = '.'; }
    if (c === 'k' && y >= HALF) { marks.push([x, y]); grid[y][x] = '.'; }
    if (c === 'r' && y < HALF) { crystals.push([x, y]); grid[y][x] = '.'; }
    if (c === 'f' && y < HALF) { flags.push([x, y]); grid[y][x] = '.'; }
    if (c === '#' && def.cast && y < HALF - 1) casters.push([x, y]);
    if ((c === 'l' || c === 'L') && y < HALF) { enemies.push({ kind: 'lantern', world: 'top', x: x * TS + 2, y: y * TS + TS - EH, dir: c === 'L' ? 1 : -1 }); grid[y][x] = '.'; }
  }
  return { def, grid, W, PX: W * TS, start, lamps, shards, stones, enemies, casters, marks, crystals, flags, dashOK: def.dash !== false, shadowGoal: rows.slice(HALF).some(r => r.includes('g') || r.includes('k')), lampR: def.lampR ?? 20, hourPx: def.hourPx ?? HOUR_PX };
}

function shadowHeight(t) { return SH; } // the shadow keeps its size; the sun moves it sideways instead
let CLOUDS = []; // hour ranges when a cloud covers the sun (set per level)
const overcast = t => CLOUDS.some(([a, b]) => t > a && t < b);
let ECLIPSE = null; // [start, end] hours: the moon covers the sun and the two worlds trade places
let ECL_DAY = 0, CUR_DAY = 1; // eclipseDay: the eclipse only comes on that day
const eclipsed = t => !!ECLIPSE && (!ECL_DAY || CUR_DAY === ECL_DAY) && t > ECLIPSE[0] && t < ECLIPSE[1];
let PARTIAL = null; // [a, b]: a crescent sun casts two thin shadows
const crescent = t => !!PARTIAL && t > PARTIAL[0] && t < PARTIAL[1];
const isGone = t => t < DUSK && !eclipsed(t) && (Math.abs(t - NOON) < NOON_GAP || overcast(t));
const frac = t => t - Math.floor(t);
const chimeState = t => { const f = frac(t); return f >= CHIME_ON ? 2 : f >= CHIME_WARN ? 1 : 0; };
const morningSolid = t => t < NOON;           // 'm'
const eveningSolid = t => t >= NOON;          // 'e' (incl. night)

const castDx = t => (NOON - t) * CAST_K;
// everything the sun casts into the world below: sunstones, (in cast stages) every block above the ground, and your planted staff
function slabs(L, st, t = st.t) {
  if (t >= DUSK || isGone(t) || eclipsed(t)) return [];
  if (!L.stones.length && !L.casters.length && !st.staff) return [];
  const dx = castDx(t), out = [];
  for (const [tx, ty] of L.stones) out.push({ x: tx * TS + dx, y: (ROWS - 1 - ty) * TS, w: TS, h: TS, kind: 'stone' });
  for (const [tx, ty] of L.casters) out.push({ x: tx * TS + dx, y: (ROWS - 1 - ty) * TS, w: TS, h: TS, kind: 'cast' });
  if (st.staff) out.push({ x: st.staff.x + dx, y: ROWS * TS - st.staff.base, w: STAFF_W, h: STAFF_H, kind: 'staff' });
  return out;
}
// the shadow's hour mark slides east through the day, like the numbers on a sundial face
function markRects(L, t) { const tt = Math.min(t, DUSK); return L.marks.map(([tx, ty]) => ({ x: tx * TS + (tt - NOON) * MARK_K, y: ty * TS, w: TS, h: TS })); }
// a second, fainter shadow cast the other way: by sunlight bouncing off water, or by a crescent sun
function echoOf(L, st) {
  const p = st.p, t = st.t;
  if (st.sleeping || t >= DUSK || isGone(t) || eclipsed(t) || st.grav < 0) return null;
  let kind = null;
  if (crescent(t)) kind = 'crescent';
  else { const under = forTiles(p.x + 1, p.y + PH, PW - 2, TS, (tx, ty) => ty < HALF && tileAt(L, tx, ty) === '~'); if (under || inWater(L, 'top', p, PW, PH)) kind = 'water'; }
  if (!kind) return null;
  const x = Math.max(0, Math.min(L.PX - SW, p.x - castDx(t))), pr = new Set();
  for (let y = HZ; y <= ROWS * TS - SH; y += 2) if (!overlap(L, st, 'bot', x, y, SW, SH, pr, true)) return { x, y, kind };
  return null;
}
function rectHit(r, x, y, w, h) { return x < r.x + r.w && x + w > r.x && y < r.y + r.h && y + h > r.y; }
function tileAt(L, tx, ty) { if (tx < 0 || tx >= L.W) return '#'; if (ty < 0 || ty >= ROWS) return '#'; return L.grid[ty][tx]; }

function forTiles(x, y, w, h, fn) {
  const x0 = Math.floor(x / TS), x1 = Math.floor((x + w - 0.01) / TS), y0 = Math.floor(y / TS), y1 = Math.floor((y + h - 0.01) / TS);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (fn(tx, ty) === true) return true;
  return false;
}
function pressedSet(L, st) {
  const set = new Set(); const s = st.s, p = st.p;
  forTiles(p.x, p.y, PW, PH, (tx, ty) => { const c = tileAt(L, tx, ty); if (c >= 'a' && c <= 'd' && ty < HALF) set.add(c.toUpperCase()); });
  if (!s.gone) forTiles(s.x, s.y, SW, s.h, (tx, ty) => { const c = tileAt(L, tx, ty); if (c >= 'a' && c <= 'd' && ty >= HALF) set.add(c.toUpperCase()); });
  const shade = (x, y, w, h) => forTiles(x + 1, y + 1, w - 2, h - 2, (tx, ty) => { const c = tileAt(L, tx, ty); if (c >= 'a' && c <= 'd' && ty >= HALF) set.add(c.toUpperCase()); });
  for (const r of slabs(L, st)) shade(r.x, r.y, r.w, r.h);
  if (st.echo) shade(st.echo.x, st.echo.y, SW, SH);
  return set;
}
function overlapsShadowTile(st, tx, ty) {
  const s = st.s; if (s.gone) return false; return s.x + 0.01 < (tx + 1) * TS && s.x + SW - 0.01 > tx * TS && s.y + 0.01 < (ty + 1) * TS && s.y + s.h - 0.01 > ty * TS;
}
function inWater(L, world, b, w, h) {
  const cx = b.x + w / 2, cy = b.y + h / 2; const tx = Math.floor(cx / TS), ty = Math.floor(cy / TS);
  if (world === 'top' ? ty >= HALF : ty < HALF) return false;
  return tileAt(L, tx, ty) === '~';
}
function overlapsPlayerTile(st, tx, ty) {
  const p = st.p; return p.x + 0.01 < (tx + 1) * TS && p.x + PW - 0.01 > tx * TS && p.y + 0.01 < (ty + 1) * TS && p.y + PH - 0.01 > ty * TS;
}
function crumbleGone(st, tx, ty) { const c = st.crumble[tx + ',' + ty]; return c && c.gone > 0; }
function solid(L, st, world, tx, ty, pr) {
  if (world === 'top') { if (ty >= HALF) return false; if (ty < 0) return true; }
  else { if (ty < HALF) return false; }
  const c = tileAt(L, tx, ty);
  if (c === '#' || c === '*' || c === '=') return true;
  if (c === 'c') return !crumbleGone(st, tx, ty);
  if (c === 'm') return morningSolid(st.t) && st.t < DUSK;
  if (c === 'e') return eveningSolid(st.t);
  if (c >= 'A' && c <= 'D') return !(pr.has(c) || (world === 'top' ? overlapsPlayerTile(st, tx, ty) : overlapsShadowTile(st, tx, ty)));
  return false;
}
function overlap(L, st, world, x, y, w, h, pr) {
  if (world === 'bot') for (const r of slabs(L, st)) if (r.kind !== 'staff' && rectHit(r, x, y, w, h)) return true; // the staff's thin shadow presses plates but does not block
  return forTiles(x, y, w, h, (tx, ty) => solid(L, st, world, tx, ty, pr));
}
function tryMove(L, st, world, b, w, h, dx, dy, pr) {
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 0.5));
  let hitX = false, hitY = false;
  for (let i = 0; i < n; i++) {
    if (dx) { const nx = b.x + dx / n; if (!overlap(L, st, world, nx, b.y, w, h, pr)) b.x = nx; else { hitX = true; dx = 0; } }
    if (dy) { const ny = b.y + dy / n; if (!overlap(L, st, world, b.x, ny, w, h, pr)) b.y = ny; else { hitY = true; dy = 0; } }
  }
  return { hitX, hitY };
}
// if the body is pushed into a solid that just appeared (evening stone, crumble return), nudge it out or kill
function squeezed(L, st, world, b, w, h, pr) { return overlap(L, st, world, b.x, b.y, w, h, pr); }

function spawnShadow(L, st, x) {
  const s = st.s, pr = new Set(); const h = s.h; x = Math.max(0, Math.min(L.PX - SW, Math.round(x)));
  const dirY = st.grav > 0 ? 1 : -1; // normal: shadow ground is HZ (top of its world); flipped: bottom
  for (let r = 0; r <= 24; r++) for (const sg of r ? [-1, 1] : [1]) {
    const nx = x + sg * r;
    const ys = []; for (let y = HZ; y <= ROWS * TS - h; y += 2) ys.push(y);
    if (dirY < 0) ys.reverse();
    for (const y of ys) if (!overlap(L, st, 'bot', nx, y, SW, h, pr)) { s.x = nx; s.y = y; s.vy = 0; return; }
  }
  s.x = x; s.y = HZ + TS;
}
function warpPlayer(L, st, x) {
  const p = st.p, pr = pressedSet(L, st);
  for (let r = 0; r <= 24; r++) for (const sg of r ? [-1, 1] : [1]) {
    const nx = Math.max(0, Math.min(L.PX - PW, x + sg * r));
    const ys = []; for (let y = HZ - PH; y >= 0; y -= 1) ys.push(y);
    if (st.grav < 0) ys.reverse();
    for (const y of ys) if (!overlap(L, st, 'top', nx, y, PW, PH, pr)) { p.x = nx; p.y = y; p.vx = 0; p.vy = 0; return; }
  }
}

function init(L) {
  PARTIAL = L.def.partial || null;
  CLOUDS = L.def.clouds || []; ECLIPSE = L.def.eclipse || null; ECL_DAY = L.def.eclipseDay || 0; CUR_DAY = 1;
  const t = L.def.startHour ?? 1;
  const st = {
    t, day: 1, frame: 0, sleeping: t >= DUSK, won: false, deaths: 0, events: [], hours: 0, grav: 1,
    pin: PIN_MAX, pinned: false, flipLock: 0, crumble: {}, got: L.shards.map(() => false), shardsGot: 0,
    p: { x: L.start[0] * TS + 2, y: L.start[1] * TS + TS - PH, vx: 0, vy: 0, ground: false, coyote: 0, land: 0 },
    s: { x: 0, y: HZ + TS, vy: 0, ground: false, coyote: 0, h: shadowHeight(t), gone: isGone(t), land: 0 },
    jumpBuf: 0, face: 1, swimCd: 0, enemies: L.enemies.map(e => ({ ...e })), staff: null, pinPrev: false, echo: null, dashes: 1, dashT: 0, dashV: [0, 0], dashCost: 0, wallLock: 0, lastWall: 0, crystalCd: L.crystals.map(() => 0), flagsHit: L.flags.map(() => false),
  };
  spawnShadow(L, st, st.p.x + castDx(t));
  st.check = snapshot(st); st.check0 = st.check;
  return st;
}
function snapshot(st) { return JSON.parse(JSON.stringify({ ...st, check: null, check0: null, events: [] })); }
function restore(st) { const c0 = st.check0; const c = JSON.parse(JSON.stringify(st.check)); const deaths = st.deaths + 1; Object.assign(st, c); st.check0 = c0; st.check = snapshot(c); st.deaths = deaths; st.pendingCheck = false; st.events = ['death']; }
function checkpoint(st) { st.pendingCheck = true; }
function safeToCheckpoint(L, st) { if (st.sleeping) return st.s.ground; return st.dashT === 0 && st.p.ground && !st.pinned && (st.s.gone || st.s.ground) && !Object.keys(st.crumble).length; }

function bodyGround(L, st, world, b, w, h, pr, gdir) { return overlap(L, st, world, b.x, b.y + 0.5 * gdir, w, h, pr); }

// input: {l, r, up, down, jump (edge), jumpHeld, wait, pin (held), flip (edge), view (edge)}
function update(L, st, inp) {
  st.events = [];
  PARTIAL = L.def.partial || null;
  CLOUDS = L.def.clouds || []; ECLIPSE = L.def.eclipse || null; ECL_DAY = L.def.eclipseDay || 0; CUR_DAY = st.day;
  if (st.won) return;
  st.frame++;
  const p = st.p, s = st.s;
  let pr = pressedSet(L, st);
  if (inp.jump) st.jumpBuf = PHYS.buffer; else if (st.jumpBuf > 0) st.jumpBuf--;
  if (st.flipLock > 0) st.flipLock--;
  const dir = (inp.r ? 1 : 0) - (inp.l ? 1 : 0);
  if (dir) st.face = dir;
  const px0 = p.x, sx0 = s.x;
  const pg = st.grav, sg = -st.grav; // gravity direction per body (+1 = down the screen)

  // grounded checks
  p.ground = bodyGround(L, st, 'top', p, PW, PH, pr, pg);
  s.ground = !s.gone && bodyGround(L, st, 'bot', s, SW, s.h, pr, sg);

  // ---- gravity flip (only while standing) ----
  if (inp.flip && st.flipLock === 0) {
    const can = st.sleeping ? s.ground : p.ground;
    if (can) { st.grav = -st.grav; st.flipLock = 8; p.vy = 0; s.vy = 0; p.vx = 0; const fdir = (!st.sleeping && st.grav < 0) ? -1 : 1; st.t = Math.max(0, st.t + FLIP_COST * fdir); st.hours += FLIP_COST; st.events.push('flip'); p.ground = false; s.ground = false; p.coyote = 0; s.coyote = 0; }
    else st.events.push('noflip');
  }
  const pgn = st.grav, sgn = -st.grav;

  // ---- pin ----
  // ---- gnomon staff: tap to plant it where you stand, tap again to pull it back ----
  st.pinned = false;
  if (inp.pin && !st.pinPrev) {
    if (st.staff) { st.staff = null; st.events.push('staffup'); }
    else if (!st.sleeping && p.ground && st.grav > 0) {
      const sx = Math.round(st.face > 0 ? p.x + PW + 1 : p.x - STAFF_W - 1), base = Math.round(p.y + PH); // planted just in front of you
      const cast = { x: sx + castDx(st.t), y: ROWS * TS - base, w: STAFF_W, h: STAFF_H };
      { st.staff = { x: sx, base }; st.events.push('staff'); }
    } else st.events.push('noplant');
  }
  st.pinPrev = !!inp.pin;

  // ---- crumble tick ----
  for (const k in st.crumble) { const c = st.crumble[k]; if (c.shake > 0) { c.shake--; if (c.shake === 0) { c.gone = CRUMBLE_GONE; st.events.push('crumble'); } } else if (c.gone > 0) { c.gone--; if (c.gone === 0) delete st.crumble[k]; } }
  const standOn = (world, b, w, h, gdir) => forTiles(b.x, b.y + (gdir > 0 ? h : -1), w, 1, (tx, ty) => { if (tileAt(L, tx, ty) === 'c' && (world === 'top' ? ty < HALF : ty >= HALF) && !crumbleGone(st, tx, ty)) { const k = tx + ',' + ty; if (!st.crumble[k]) st.crumble[k] = { shake: CRUMBLE_SHAKE, gone: 0 }; } });
  if (p.ground && !st.sleeping) standOn('top', p, PW, PH, pgn);
  if (s.ground && !st.pinned) standOn('bot', s, SW, s.h, sgn);

  const landP = p.land, landS = s.land;
  // ---- Sun Dash ----
  if (st.wallLock > 0) st.wallLock--;
  for (let k = 0; k < st.crystalCd.length; k++) if (st.crystalCd[k] > 0) st.crystalCd[k]--;
  if (inp.dash && L.dashOK && !st.sleeping && st.dashes > 0 && st.dashT === 0) {
    let dx = (inp.r ? 1 : 0) - (inp.l ? 1 : 0), dy = ((inp.down ? 1 : 0) - (inp.up ? 1 : 0)) * pgn;
    if (!dx && !dy) dx = st.face;
    const n = Math.hypot(dx, dy); st.dashV = [dx / n * DASH.v, dy / n * DASH.v];
    st.dashT = DASH.frames; st.dashes--; st.dashCost += DASH.cost; st.jumpBuf = 0; p.jumping = false; s.jumping = false;
    st.events.push('dash');
  }
  if (st.dashT > 0 && !st.sleeping) {
    st.dashT--;
    const [vx, vy] = st.dashV;
    p.vx = vx; p.vy = vy;
    const rp = tryMove(L, st, 'top', p, PW, PH, vx, vy, pr);
    if (rp.hitY && vy * pgn < 0) cornerCorrect(L, st, 'top', p, PW, PH, vy, pr);
    if (!s.gone && !st.pinned) { s.vx = vx; s.vy = -vy; tryMove(L, st, 'bot', s, SW, s.h, vx, -vy, pr); }
    if (st.dashT === 0) { if (vy * pgn < 0) p.vy = vy * DASH.endUp; else p.vy = vy * 0.6; p.vx = Math.sign(vx) * Math.min(Math.abs(vx), PHYS.run * 1.15); s.vy = -p.vy; }
  } else if (!st.sleeping) {
    if (p.ground && st.dashT === 0) { st.dashes = 1; st.lastWall = 0; }
  }
  if (!st.sleeping) L.crystals.forEach(([tx, ty], k) => { if (st.crystalCd[k] === 0 && st.dashes === 0 && p.x < tx * TS + 11 && p.x + PW > tx * TS + 1 && p.y < ty * TS + 11 && p.y + PH > ty * TS + 1) { st.dashes = 1; st.crystalCd[k] = DASH.refillCd; st.events.push('refill'); } });
  const dashing = st.dashT > 0 && !st.sleeping;
  if (!st.sleeping && !dashing) {
    p.coyote = p.ground ? PHYS.coyote : Math.max(0, p.coyote - 1);
    if (!s.gone) s.coyote = s.ground ? PHYS.coyote : Math.max(0, s.coyote - 1);
    const pw = inWater(L, 'top', p, PW, PH), sw = !s.gone && inWater(L, 'bot', s, SW, s.h);
    if (st.swimCd > 0) st.swimCd--;
    let jumped = false;
    if (st.jumpBuf > 0) {
      if (pw) { if (st.swimCd === 0) { const deep = inWater(L, 'top', { x: p.x, y: p.y - 4 * pgn }, PW, PH); const near = !inWater(L, 'top', { x: p.x, y: p.y - 9 * pgn }, PW, PH); const wall = dir && overlap(L, st, 'top', p.x + dir * 2, p.y, PW, PH, pr); if (deep || wall) { p.vy = -(wall && near ? WATER.exit : WATER.stroke) * pgn; p.jumping = false; jumped = true; st.swimCd = WATER.strokeCd; st.events.push('swim'); } } }
      else if (p.coyote > 0) { p.vy = -PHYS.jump * pgn; p.coyote = 0; p.jumping = true; jumped = true; }
      else {
        // wall jump: push off a wall you are touching; climb by alternating walls
        const side = overlap(L, st, 'top', p.x + 2, p.y, PW, PH, pr) ? 1 : overlap(L, st, 'top', p.x - 2, p.y, PW, PH, pr) ? -1 : 0;
        if (side && side !== st.lastWall) {
          p.vx = -side * WALL.jumpX; p.vy = -WALL.jumpY * pgn; p.jumping = true; jumped = true; st.wallLock = WALL.lock; st.lastWall = side; st.face = -side;
          if (!s.gone && !st.pinned) { const ss = overlap(L, st, 'bot', s.x + 2 * side, s.y, SW, s.h, pr); if (ss || s.coyote > 0) { s.vy = -WALL.jumpY * sgn; s.jumping = true; s.coyote = 0; } }
          st.events.push('walljump');
        }
      }
      if (!s.gone && !st.pinned && !st.events.includes('walljump')) {
        if (sw) { if (st.swimCd === 0 || jumped) { const deep = inWater(L, 'bot', { x: s.x, y: s.y - 4 * sgn }, SW, s.h); const near = !inWater(L, 'bot', { x: s.x, y: s.y - 9 * sgn }, SW, s.h); const wall = dir && overlap(L, st, 'bot', s.x + dir * 2, s.y, SW, s.h, pr); if (deep || wall) { s.vy = -(wall && near ? WATER.exit : WATER.stroke) * sgn; s.jumping = false; jumped = true; st.swimCd = WATER.strokeCd; } } }
        else if (s.coyote > 0) { s.vy = -PHYS.jump * sgn; s.coyote = 0; s.jumping = true; jumped = true; }
      }
      if (jumped) { st.jumpBuf = 0; if (!st.events.includes('swim')) st.events.push('jump'); }
    }
    // variable jump
    if (!inp.jumpHeld && p.jumping && p.vy * pgn < -1.6) p.vy = -1.6 * pgn;
    if (!inp.jumpHeld && s.jumping && s.vy * sgn < -1.6) s.vy = -1.6 * sgn;
    // player: accelerate, asymmetric gravity, corner nudge
    p.vx = steer(p.vx, st.wallLock > 0 && dir === st.lastWall ? 0 : dir, p.ground, pw);
    p.vy = pw ? waterClamp(p.vy + WATER.g * pgn, pgn) : fallClamp(p.vy + gravityFor(p.vy, pgn, inp.jumpHeld, p.jumping) * pgn, pgn);
    // wall slide: pressing into a wall while falling slows you down
    if (!pw && dir && !p.ground && p.vy * pgn > WALL.slide && overlap(L, st, 'top', p.x + dir * 2, p.y, PW, PH, pr)) { p.vy = WALL.slide * pgn; st.sliding = dir; } else st.sliding = 0;
    const wasAir = !p.ground;
    const rp = tryMove(L, st, 'top', p, PW, PH, p.vx, p.vy, pr);
    if (rp.hitX) p.vx = 0;
    if (rp.hitY) {
      if (p.vy * pgn < 0 && cornerCorrect(L, st, 'top', p, PW, PH, p.vy, pr)) { /* slipped past the corner, keep rising */ }
      else { if (wasAir && p.vy * pgn > 2) { p.land = 8; st.events.push('land'); } p.vy = 0; p.jumping = false; }
    }
    // shadow mirrors the same stride
    if (!s.gone && !st.pinned) {
      s.vy = sw ? waterClamp(s.vy + WATER.g * sgn, sgn) : fallClamp(s.vy + gravityFor(s.vy, sgn, inp.jumpHeld, s.jumping) * sgn, sgn);
      const wasAirS = !s.ground;
      const svx = sw ? Math.sign(p.vx) * Math.min(Math.abs(p.vx), WATER.run) : (pw ? dir * PHYS.run * (Math.abs(p.vx) > 0 || dir ? 1 : 0) : p.vx);
      const rs = tryMove(L, st, 'bot', s, SW, s.h, svx, s.vy, pr);
      if (rs.hitY) { if (s.vy * sgn < 0 && cornerCorrect(L, st, 'bot', s, SW, s.h, s.vy, pr)) {} else { if (wasAirS && s.vy * sgn > 2) s.land = 8; s.vy = 0; s.jumping = false; } }
    }
  } else {
    // night: player sleeps (still obeys gravity), shadow walks alone
    p.vy = fallClamp(p.vy + PHYS.g * pgn, pgn);
    const rp = tryMove(L, st, 'top', p, PW, PH, 0, p.vy, pr); if (rp.hitY) p.vy = 0;
    s.coyote = s.ground ? PHYS.coyote : Math.max(0, s.coyote - 1);
    const sw = inWater(L, 'bot', s, SW, s.h);
    if (st.swimCd > 0) st.swimCd--;
    if (st.jumpBuf > 0) {
      if (sw) { if (st.swimCd === 0) { const deep = inWater(L, 'bot', { x: s.x, y: s.y - 4 * sgn }, SW, s.h); const near = !inWater(L, 'bot', { x: s.x, y: s.y - 9 * sgn }, SW, s.h); const wall = dir && overlap(L, st, 'bot', s.x + dir * 2, s.y, SW, s.h, pr); if (deep || wall) { s.vy = -(wall && near ? WATER.exit : WATER.stroke) * sgn; st.swimCd = WATER.strokeCd; st.jumpBuf = 0; st.events.push('swim'); } } }
      else if (s.coyote > 0) { s.vy = -PHYS.jump * sgn; s.coyote = 0; s.jumping = true; st.jumpBuf = 0; st.events.push('jump'); }
    }
    if (!inp.jumpHeld && s.jumping && s.vy * sgn < -1.6) s.vy = -1.6 * sgn;
    s.vx = steer(s.vx || 0, dir, s.ground, sw);
    s.vy = sw ? waterClamp(s.vy + WATER.g * sgn, sgn) : fallClamp(s.vy + gravityFor(s.vy, sgn, inp.jumpHeld, s.jumping) * sgn, sgn);
    const wasAirS = !s.ground;
    const rs = tryMove(L, st, 'bot', s, SW, s.h, s.vx, s.vy, pr);
    if (rs.hitX) s.vx = 0; if (rs.hitY) { if (wasAirS && s.vy * sgn > 2) { s.land = 8; st.events.push('land'); } s.vy = 0; s.jumping = false; }
  }
  if (p.land > 0 && landP === p.land) p.land--; if (s.land > 0 && landS === s.land) s.land--;

  // ---- springs ----
  const springHit = (world, b, w, h, gdir) => forTiles(b.x + 1, b.y + (gdir > 0 ? h - 2 : 0), w - 2, 2, (tx, ty) => tileAt(L, tx, ty) === '^' && (world === 'top' ? ty < HALF : ty >= HALF));
  const sunUp = st.t < DUSK ? Math.sin(Math.PI * st.t / DUSK) : 0; // springs drink sunlight: strongest at noon, while shade-springs are strongest at dawn and dusk
  const pSpring = PHYS.spring * (0.82 + 0.28 * sunUp), sSpring = PHYS.spring * (1.1 - 0.28 * sunUp);
  if (!st.sleeping && p.vy * pgn >= 0 && springHit('top', p, PW, PH, pgn)) { p.vy = -pSpring * pgn; p.jumping = false; st.events.push('spring'); }
  if (!s.gone && !st.pinned && s.vy * sgn >= 0 && springHit('bot', s, SW, s.h, sgn)) { s.vy = -sSpring * sgn; s.jumping = false; st.events.push('spring'); }

  // ---- clock: time moves only when something moves ----
  const moved = dashing ? 0 : st.sleeping ? Math.abs(s.x - sx0) : Math.max(Math.abs(p.x - px0), s.gone || st.pinned ? 0 : Math.abs(s.x - sx0));
  const dt = moved / L.hourPx + (inp.wait ? WAIT_RATE * HOUR_PX / L.hourPx : 0) + st.dashCost + (!st.sleeping && L.def.sunRate ? L.def.sunRate / 60 : 0); st.dashCost = 0; // sunset runs: here the sun does not wait for you
  const t0 = st.t;
  const tdir = (!st.sleeping && st.grav < 0) ? -1 : 1;
  st.t = Math.max(0, st.t + dt * tdir); st.hours += dt;
  // ---- the sun moves, so the shadow slides west (pinned, sleeping or vanished shadows stay) ----
  if (!s.gone && !st.pinned && !st.sleeping && st.t < DUSK && !eclipsed(st.t) && !eclipsed(t0)) { const d = castDx(st.t) - castDx(t0); if (d) { const T = st.t; st.t = t0; tryMove(L, st, 'bot', s, SW, s.h, d, 0, pr); st.t = T; } }
  // ---- enemies walk only as the hours pass (SUPERHOT rule) ----
  const edt = dt; // flips and view costs do not teleport enemies
  if (edt > 0) for (const e of st.enemies) {
    const gd = e.world === 'top' ? 1 : -1; // gravity direction of its world
    const step = e.dir * ENEMY_SPEED * edt;
    const nx = e.x + step;
    const footY = gd > 0 ? e.y + EH : e.y - 1;
    const aheadX = e.dir > 0 ? nx + EW - 1 : nx;
    const wall = overlap(L, st, e.world, nx, e.y, EW, EH, pr);
    const floor = e.kind === 'bird' || forTiles(aheadX, footY, 1, 1, (tx, ty) => solid(L, st, e.world, tx, ty, pr));
    if (wall || !floor || nx < 0 || nx + EW > L.PX) e.dir = -e.dir; else e.x = nx;
  }

  // ---- phase transitions ----
  if (!st.sleeping) {
    if (!s.gone && isGone(st.t) && !isGone(t0)) { s.gone = true; st.events.push(overcast(st.t) ? 'cloud' : 'noon'); }
    if (s.gone && !isGone(st.t)) { s.gone = false; s.h = shadowHeight(st.t); spawnShadow(L, st, p.x + castDx(st.t)); st.events.push('resync'); checkpoint(st); }
    if (st.t >= DUSK && L.def.duskFail) { st.check = st.check0; restore(st); st.events.push('dusk'); return; }
    if (st.t >= DUSK) { st.sleeping = true; s.gone = false; st.events.push('nightfall'); fitShadow(L, st, NIGHT_H); checkpoint(st); }
  } else if (st.t >= DAY_TOTAL) {
    st.t -= DAY_TOTAL; st.day++; CUR_DAY = st.day; st.sleeping = false;
    warpPlayer(L, st, s.x); s.gone = isGone(st.t); if (!s.gone) spawnShadow(L, st, p.x + castDx(st.t)); fitShadow(L, st, shadowHeight(st.t));
    st.events.push('dawn'); checkpoint(st);
  }
  if (!st.sleeping && !s.gone && eclipsed(st.t) && !eclipsed(t0)) {
    // totality: you and your shadow trade places
    const bx = p.x, sx = s.x;
    warpPlayer(L, st, sx); spawnShadow(L, st, bx);
    st.events.push('eclipse'); checkpoint(st);
  }
  if (!s.gone && !st.sleeping) fitShadow(L, st, shadowHeight(st.t));
  if (Math.floor(st.t) !== Math.floor(t0) && st.t < DUSK) st.events.push('hour');
  if (chimeState(t0) < 2 && chimeState(st.t) === 2 && st.t > t0) st.events.push('chime');
  if (st.t < t0 && Math.floor(st.t * 4) !== Math.floor(t0 * 4)) st.events.push('rewind');

  { const had = !!st.echo; st.echo = echoOf(L, st); if (st.echo && !had) st.events.push(st.echo.kind === 'crescent' ? 'crescent' : 'reflect'); }
  L.flags.forEach(([tx, ty], k) => { if (!st.flagsHit[k] && !st.sleeping && Math.abs(p.x + PW / 2 - (tx * TS + 6)) < 8 && p.y < (ty + 1) * TS && p.y + PH > ty * TS - 12) { st.flagsHit[k] = true; st.events.push('flag'); checkpoint(st); } });
  // ---- shards ----
  L.shards.forEach(([tx, ty], i) => {
    if (st.got[i]) return;
    const cx = tx * TS + 6, cy = ty * TS + 6;
    const hit = (b, w, h) => cx > b.x - 3 && cx < b.x + w + 3 && cy > b.y - 3 && cy < b.y + h + 3;
    if ((!st.sleeping && hit(p, PW, PH)) || (!s.gone && hit(s, SW, s.h))) { st.got[i] = true; st.shardsGot++; st.events.push('shard'); }
  });

  // ---- hazards ----
  pr = pressedSet(L, st);
  const deadly = c => c === 'x' || (c === 'v' && chimeState(st.t) === 2);
  // spikes only bite on the half of the tile nearest the surface they grow from
  const hurt = (world, x, y, w, h) => forTiles(x + 1, y + 1, w - 2, h - 2, (tx, ty) => {
    if (!(world === 'top' ? ty < HALF : ty >= HALF) || !deadly(tileAt(L, tx, ty))) return false;
    const hang = spikeHangs(L, world, tx, ty);
    const zy0 = ty * TS + (hang ? 0 : TS / 2), zy1 = zy0 + TS / 2;
    return y + 1 < zy1 && y + h - 1 > zy0;
  });
  let die = null;
  if (p.y > HZ + 2 || p.y + PH < -2) die = 'fell';
  else if (hurt('top', p.x, p.y, PW, PH)) die = 'spikes';
  else if (squeezed(L, st, 'top', p, PW, PH, pr)) die = 'crushed';
  if (!die && !s.gone) {
    if (s.y + s.h < HZ - 2 || s.y > ROWS * TS + 2) die = 'shadow fell';
    else if (hurt('bot', s.x, s.y, SW, s.h)) die = 'shadow spikes';
    else if (squeezed(L, st, 'bot', s, SW, s.h, pr)) die = 'shadow crushed';
    else if (!inWater(L, 'bot', s, SW, s.h)) for (const [lx, ly] of L.lamps) {
      const cx = Math.max(s.x, Math.min(lx, s.x + SW)), cy = Math.max(s.y, Math.min(ly, s.y + s.h));
      if ((cx - lx) ** 2 + (cy - ly) ** 2 < L.lampR ** 2) { die = 'lamplight'; break; }
    }
  }
  if (!die) for (const e of st.enemies) {
    const hit = (b, w, h) => b.x + 1 < e.x + EW - 1 && b.x + w - 1 > e.x + 1 && b.y + 1 < e.y + EH - 1 && b.y + h - 1 > e.y + 1;
    if (e.kind === 'lantern') {
      if (!st.sleeping && hit(p, PW, PH)) { die = 'lantern'; break; }
      if (!s.gone && !inWater(L, 'bot', s, SW, s.h)) { // its lamplight falls into the shadow world at the mirrored spot
        const lx = e.x + EW / 2, ly = ROWS * TS - (e.y + EH / 2);
        const cx = Math.max(s.x, Math.min(lx, s.x + SW)), cy = Math.max(s.y, Math.min(ly, s.y + s.h));
        if ((cx - lx) ** 2 + (cy - ly) ** 2 < LANTERN_R ** 2) { die = 'lantern light'; break; }
      }
    } else if (e.kind === 'bird') {
      if (!s.gone && !st.sleeping && st.t < DUSK && !eclipsed(st.t)) { const bx = e.x + castDx(st.t), by = ROWS * TS - e.y - EH; if (s.x + 1 < bx + EW - 1 && s.x + SW - 1 > bx + 1 && s.y + 1 < by + EH - 1 && s.y + s.h - 1 > by + 1) { die = 'bird shadow'; break; } }
    } else if (!s.gone && hit(s, SW, s.h)) { die = 'shadow hound'; break; }
  }
  if (die) { restore(st); st.events.push(die); return; }
  if (st.pendingCheck && safeToCheckpoint(L, st)) { st.pendingCheck = false; st.check = snapshot(st); st.events.push('checkpoint'); }
  // finish: you on your dial; if the stage has a shadow dial (g), your shadow must stand on it at the same moment
  const onG = forTiles(p.x, p.y, PW, PH, (tx, ty) => ty < HALF && tileAt(L, tx, ty) === 'G');
  const onShadowG = !s.gone && (forTiles(s.x + 1, s.y, SW - 2, s.h, (tx, ty) => ty >= HALF && tileAt(L, tx, ty) === 'g') || markRects(L, st.t).some(r => rectHit(r, s.x + 2, s.y, SW - 4, s.h)));
  st.shadowGoal = L.shadowGoal; st.atG = onG; st.atShadowG = onShadowG;
  if (onG && (!L.shadowGoal || onShadowG)) { st.won = true; st.events.push('win'); }
  else if (onG && L.shadowGoal && !st.waitedG) { st.waitedG = true; st.events.push('needshadow'); }
  else if (!onG) st.waitedG = false;
}
function spikeHangs(L, world, tx, ty) {
  // 'hang' = spikes attached to the tile above (pointing down the screen)
  if (world === 'top') { if (ty === 0) return true; const up = tileAt(L, tx, ty - 1), dn = tileAt(L, tx, ty + 1); return (up === '#' && dn !== '#') || (ty + 1 === HALF && up === '#'); }
  // bottom world: spikes normally sit on the shadow floor (row HALF) pointing down
  const up = tileAt(L, tx, ty - 1), dn = ty + 1 >= ROWS ? '#' : tileAt(L, tx, ty + 1);
  if (ty === HALF || (up === '#' && ty - 1 >= HALF)) return true;
  if (dn === '#') return false;
  return true;
}
// asymmetric gravity: rise, hang at the apex while jump is held, fall faster
function gravityFor(vy, gdir, held, jumping) {
  const up = vy * gdir; // negative = rising
  if (up < 0 && Math.abs(up) < PHYS.hangV && held && jumping) return PHYS.gHang;
  return up < 0 ? PHYS.g : PHYS.gFall;
}
function steer(vx, dir, grounded, inWaterNow) {
  const max = inWaterNow ? WATER.run : PHYS.run;
  const acc = grounded ? PHYS.accel : PHYS.airAccel, dec = grounded ? PHYS.decel : PHYS.airDecel;
  if (dir) { vx += dir * acc; if (Math.abs(vx) > max) vx = max * Math.sign(vx); if (Math.sign(vx) !== dir && grounded) vx += dir * acc; }
  else { if (Math.abs(vx) <= dec) vx = 0; else vx -= Math.sign(vx) * dec; }
  return vx;
}
// nudge sideways around a corner when bumping the head on a block edge
function cornerCorrect(L, st, world, b, w, h, vy, pr) {
  for (const dx of [1, -1, 2, -2, 3, -3]) { if (!overlap(L, st, world, b.x + dx, b.y + vy, w, h, pr)) { b.x += dx; return true; } }
  return false;
}
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function fallClamp(v, gdir) { return v * gdir > PHYS.maxFall ? PHYS.maxFall * gdir : v; }
function waterClamp(v, gdir) { if (v * gdir > WATER.maxFall) return WATER.maxFall * gdir; if (v * gdir < -WATER.exit) return -WATER.exit * gdir; return v; }
function fitShadow(L, st, want) {
  const s = st.s, pr = pressedSet(L, st);
  let h = want;
  if (st.grav < 0) { // anchored at the far side: grow toward the horizon
    const bottom = s.y + s.h;
    while (h > 4 && overlap(L, st, 'bot', s.x, bottom - h, SW, h, pr)) h--;
    s.y = bottom - h; s.h = h; return;
  }
  while (h > 4 && overlap(L, st, 'bot', s.x, s.y, SW, h, pr)) h--;
  s.h = h;
}
const PHASE = t => t >= DUSK ? 'Night' : t < 0.75 ? 'Dawn' : t < 2.25 ? 'Morning' : t < NOON - NOON_GAP ? 'Forenoon' : t < NOON + NOON_GAP ? 'Noon' : t < 4.75 ? 'Afternoon' : t < 6.25 ? 'Evening' : 'Dusk';

if (typeof module !== 'undefined') module.exports = { DASH, WALL, PHYS, markRects, echoOf, crescent, STAFF_W, STAFF_H, MARK_K, eclipsed, overcast, setClouds: c => { CLOUDS = c || []; }, SH, EW, EH, LANTERN_R, slabs, castDx, spikeHangs, inWater, overlapsShadowTile, TS, ROWS, HALF, HZ, PW, PH, SW, PIN_MAX, parse, init, update, pressedSet, shadowHeight, isGone, tileAt, PHASE, DUSK, NOON, DAY_TOTAL, overlapsPlayerTile, solid, chimeState, morningSolid, eveningSolid, crumbleGone };
