const fs = require('fs');
const h = fs.readFileSync('C:/Users/Boyo/Desktop/澎科大NPU/頭足類遊戲.html', 'utf8');
const m = h.match(/<script>([\s\S]*?)<\/script>/);
let src = m[1];
const texts = [];
function makeCtx() {
  const noop = () => {};
  const state = { globalAlpha: 1, font: '', fillStyle: '#000', strokeStyle: '#000', textAlign: 'left', textBaseline: 'alphabetic', lineWidth: 1, shadowColor: '', shadowBlur: 0 };
  return new Proxy({}, {
    get(t, k) {
      if (k in state) return state[k];
      switch (k) {
        case 'measureText': return (s) => ({ width: String(s).length * (parseInt(((state.font.match(/(\d+)px/) || ['', '10'])[1])) || 10) });
        case 'fillText': return (s, x, y) => texts.push({ s: String(s), x: Math.round(x), y: Math.round(y), font: state.font });
        case 'save': case 'restore': case 'beginPath': case 'closePath': case 'fill': case 'stroke':
        case 'moveTo': case 'lineTo': case 'arcTo': case 'arc': case 'quadraticCurveTo': case 'fillRect': case 'clearRect':
        case 'translate': case 'scale': case 'clip': case 'setTransform': case 'strokeText': case 'drawImage': case 'rect': case 'strokeRect':
          return noop;
        case 'createLinearGradient': return () => ({ addColorStop: noop });
        case 'createRadialGradient': return () => ({ addColorStop: noop });
        case 'createPattern': return () => ({});
        case 'canvas': return {};
      }
      return noop;
    },
    set(t, k, v) { state[k] = v; return true; }
  });
}
global.ctx = makeCtx();
global.canvas = { width: 960, height: 600, getContext: () => ctx, style: {}, getBoundingClientRect: () => ({ left:0, top:0, width:960, height:600 }), addEventListener: () => {}, getContext2d: () => {} };
global.document = { getElementById: () => canvas, addEventListener: () => {}, removeEventListener: () => {}, createElement: () => ({}), body: { appendChild: () => {} } };
global.window = { addEventListener: () => {}, innerWidth: 1000, innerHeight: 700, devicePixelRatio: 1 };
global.localStorage = { _d:{}, getItem(k){ return this._d[k]||null; }, setItem(k,v){ this._d[k]=String(v); }, removeItem(k){ delete this._d[k]; } };
global.requestAnimationFrame = () => 0;
global.performance = { now: () => Date.now() };
global.navigator = { userAgent: 'node' };
global.AudioContext = function(){
  const osc = { connect:()=>{}, start:()=>{}, stop:()=>{}, frequency:{ value:0, setValueAtTime:()=>{}, exponentialRampToValueAtTime:()=>{} }, type:'' };
  return {
    createGain: () => ({ gain: { value:0, setValueAtTime:()=>{}, exponentialRampToValueAtTime:()=>{}, setTargetAtTime:()=>{} }, connect:()=>{} }),
    currentTime:0, destination:{}, state:'running', resume:()=>{},
    createBuffer: () => ({ getChannelData: () => new Float32Array(2), sampleRate: 48000 }),
    createBufferSource: () => ({ connect:()=>{}, start:()=>{}, stop:()=>{}, loop:false, buffer:null }),
    createOscillator: () => osc,
    createBiquadFilter: () => ({ connect:()=>{}, type:'', frequency:{ value:0, setValueAtTime:()=>{}, exponentialRampToValueAtTime:()=>{} } })
  };
};
global.webkitAudioContext = undefined;

eval(src + '\n;global.SPECIES = SPECIES; global.LEVELS = LEVELS; global.GameState = GameState; global.Ceph = Ceph; global.Game = Game; global.CFG = CFG; global.SHOP = SHOP; global.saveState = saveState;');
const g = global.window.__game;
let failures = 0;
function check(cond, label) {
  if (cond) console.log('PASS: ' + label);
  else { failures++; console.log('FAIL: ' + label); }
}
function countTarget() {
  const sid = g.level.mission.sid;
  return g.creatures.filter(c => c.spec && c.spec.id === sid).length;
}

/* ============ G1: 每個正式關卡 startLevel 後，目標物種實際生成 ≥ requiredCount+1 ============ */
let g1Ok = true;
for (const L of global.LEVELS) {
  g.startLevel(L.levelId - 1);
  const alive = countTarget();
  if (alive < L.requiredCount + 1) { g1Ok = false; console.log('  L' + L.levelId + ' target=' + L.mission.sid + ' req=' + L.mission.n + ' spawned=' + alive); }
}
check(g1Ok, 'G1 全部 15 關：目標物種 active 數 >= requiredCount+1');

/* ============ G2: required=2 → active target >= 3（白魷/小卷 xiaoquan） ============ */
g.startLevel(0);   // L1: mission { sid:'xiaoquan', n:2 }
check(countTarget() >= 3, 'G2 required=2 → active xiaoquan >= 3 (got ' + countTarget() + ')');

/* ============ G3: required=1（合成關） → active target >= 2 ============ */
{
  const base = Object.assign({}, global.LEVELS[0]);
  base.mission = { sid: 'xiaoquan', n: 1 };
  base.requiredCount = 1;
  base.spawnCount = 2;
  g.level = base; g.levelIndex = 0;
  g.creatures = []; g.rocks = []; g.targetSpawned = 0;
  g.state = 'play';
  g.ensureTargetQuota();
  check(countTarget() >= 2, 'G3 required=1 → active target >= 2 (got ' + countTarget() + ')');
}

/* ============ G4: HUD target id == 實際 spawn target id（同一 canonical id） ============ */
{
  let hudOk = true;
  for (const L of global.LEVELS) {
    g.startLevel(L.levelId - 1);
    const hudSpec = global.SPECIES.find(s => s.id === L.mission.sid);       // drawHUD 使用方式
    const spawnSpec = global.SPECIES.find(s => s.id === L.mission.sid);     // spawnCeph 使用方式
    if (!hudSpec || !spawnSpec || hudSpec.id !== spawnSpec.id) hudOk = false;
    if (L.targetSpecies !== L.mission.sid) hudOk = false;                   // 雙欄位一致
  }
  check(hudOk, 'G4 HUD target id === spawn target id === targetSpecies（全部關卡）');
}

/* ============ G5: 白魷（小卷）/小管/鎖管 名稱/別名不造成 ID mismatch ============ */
{
  let ok = true;
  const canonical = { '白魷（小卷）': 'xiaoquan', '小管': 'suoguan' };
  for (const name in canonical) {
    const sp = global.SPECIES.find(s => s.id === canonical[name]);
    if (!sp) ok = false;
    else if (sp.name !== name) { ok = false; console.log('  name mismatch: id=' + sp.id + ' name=' + sp.name); }
  }
  /* mission.sid 全部都能解析到 SPECIES 的 canonical id */
  for (const L of global.LEVELS) {
    if (!global.SPECIES.some(s => s.id === L.mission.sid)) { ok = false; console.log('  unresolvable sid in L' + L.levelId + ': ' + L.mission.sid); }
  }
  /* 驗證使用 xiaoquan/suoguan 的關卡確實生成該 ID 的個體 */
  g.startLevel(1);   // L2 suoguan
  if (g.level.mission.sid !== 'suoguan' || countTarget() < 1) ok = false;
  g.startLevel(14);  // L15 xiaoquan n=10
  if (g.level.mission.sid !== 'xiaoquan' || countTarget() < global.LEVELS[14].requiredCount + 1) ok = false;
  check(ok, 'G5 白魷/小管 mission 名稱↔ID 對映正確且生成數量達標');
}

/* ============ G6: 目標被捕捉/移除後維持可完成（maintainTargetQuota 補生成） ============ */
{
  g.startLevel(0);            // xiaoquan n=2, spawnCount=3
  const before = countTarget();
  const t = g.creatures.find(c => c.spec && c.spec.id === 'xiaoquan');
  check(before >= 3 && !!t, 'G6 開局 xiaoquan 存在（' + before + '）');
  g.removeCeph(t);            // 模擬逃脫/移除，未完成任務
  g.levelCatch = {};          // 尚未捕獲任何目標
  g.missionDone = false;
  g.maintainTargetQuota();
  check(countTarget() >= 3, 'G6 移除 1 隻目標後，maintainTargetQuota 補回（got ' + countTarget() + '）');
  /* 捕獲達標後不再補（完成） */
  g.levelCatch['xiaoquan'] = 2;
  g.missionDone = true;
  const n1 = countTarget();
  g.maintainTargetQuota();
  check(countTarget() === n1, 'G6 missionDone 後不再補生成');
}

/* ============ G7: 非目標物種的環境權重仍正常運作 ============ */
{
  const countSpawned = () => {
    const seen = new Set();
    for (let i = 0; i < 400; i++) { const c = g.spawnCeph(); if (c) seen.add(c.spec.id); }
    return seen;
  };
  /* 正式遊玩：目標權重已達上限時不再生成目標（卡死 targetSpawned），其餘物種照原環境規則出現 */
  g.state = 'play';
  g.levelIndex = 0; g.level = global.LEVELS[0];
  g.creatures = []; g.targetSpawned = 999;
  const seen = countSpawned();
  check(!seen.has('xiaoquan'), 'G7 harbor/play: 目標已達上限時不再生成（xiaoquan 不進池）');
  const others = [...seen].filter(id => id !== 'xiaoquan');
  check(others.length >= 3, 'G7 harbor: 非目標物種仍會隨機出現（' + others.join(',') + '）');
  /* habitatW 加權仍然生效：harbor 中 habitatW=0 的物種（giantsq/vampire）以低權重出現，
     且高權重物種（zhangyu/duanxiao/nini）出現率高於低權重者 */
  const freq = new Map();
  for (let i = 0; i < 1500; i++) { const c = g.spawnCeph(); if (c) freq.set(c.spec.id, (freq.get(c.spec.id) || 0) + 1); }
  const highIds = ['zhangyu', 'duanxiao', 'nini'];
  const lowIds = ['giantsq', 'vampire'];
  const highSum = highIds.reduce((a, id) => a + (freq.get(id) || 0), 0);
  const lowSum = lowIds.reduce((a, id) => a + (freq.get(id) || 0), 0);
  check(highSum > lowSum, 'G7 harbor: 高habitatW物種出現率高於低habitatW（high=' + highSum + ' low=' + lowSum + '）');
}

/* ============ G8: 測試模式保證指定物種生成 >= 1（不會 0 隻） ============ */
{
  g.test.active = true;
  g.test.cfg = { levelIndex: 0, speciesIdx: 1, timeOfDay: 'night', season: 'summer', probability: 1.0, infiniteTime: true, infinitePoints: true, infiniteConserve: true };
  g.startTest();
  const sid = g.level.mission.sid;
  const cnt = g.creatures.filter(c => c.spec && c.spec.id === sid).length;
  check(cnt >= 1, 'G8 測試模式指定物種生成 >= 1（got ' + cnt + '，sid=' + sid + '）');
  check(g.level.mission.sid === global.SPECIES[1].id, 'G8 測試 mission.sid 使用 canonical id');
  g.test.active = false;
}

console.log('\n' + (failures ? 'FAILURES: ' + failures : 'ALL TARGET-GUARANTEE CHECKS PASSED'));
process.exit(failures ? 1 : 0);
