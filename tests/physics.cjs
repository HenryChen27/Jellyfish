// Run with: node tests/physics.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Matter = require('../js/matter.min.js');
const root = path.join(__dirname, '..');

function game() {
  let now = 1;
  const context = vm.createContext({
    Matter, console, performance: { now: () => now },
    window: {},
    SessionSave: { write: () => true, clear() {} },
    queueMicrotask: fn => fn(),
    document: { readyState: 'loading', addEventListener() {} },
    requestAnimationFrame() {},
    setTimeout() {},
  });
  vm.runInContext(fs.readFileSync(path.join(root, 'js/config.js'), 'utf8'), context);
  // Expose closure internals only in this test, and skip canvas drawing.
  const source = fs.readFileSync(path.join(root, 'js/game.js'), 'utf8')
    .replace('render(timestamp);', '')
    .replace('  // --- Start ---', `
      globalThis.testGame = { G, initPhysics, setupCollisionHandler,
        createJellyfishBody, addJellyfishItem, triggerMerge, dropJellyfish, loop, drawJellyfish };
      // --- Start ---`);
  vm.runInContext(source, context);
  const api = context.testGame;
  api.initPhysics();
  api.setupCollisionHandler();
  api.G.assets = { images: {}, audio: {} };
  api.G.phase = 'playing';
  api.add = (x, y, level) => {
    const body = api.createJellyfishBody(x, y, level);
    const item = api.addJellyfishItem(body, level);
    Matter.Composite.add(api.G.engine.world, body);
    item.bodyInWorld = true;
    return item;
  };
  api.advance = (seconds, fps) => {
    for (let i = 0; i < Math.round(seconds * fps); i++) {
      now += 1000 / fps;
      api.loop(now);
    }
  };
  return api;
}

for (const merge of [false, true, 'floor']) {
  const api = game();
  const sounds = [];
  for (const key of ['click', 'form1', 'form2']) {
    api.G.assets.audio[key] = { cloneNode: () => ({ play: () => {
      sounds.push(key); return Promise.resolve();
    } }) };
  }
  if (merge !== 'floor') api.add(1100, 1300, merge ? 2 : 4);
  api.G.dropLevel = 2;
  api.G.clipX = 1100;
  api.dropJellyfish();
  api.advance(8, 60);
  assert.deepEqual(sounds, ['click', merge === true ? 'form2' : 'form1']);
  console.log(merge === 'floor' ? 'Drop: first floor contact plays form1 once'
    : merge ? 'Drop: click then merge sound' : 'Drop: click then non-merge form1 once');
}

for (const fps of [30, 60, 120, 144]) {
  const api = game();
  const items = [api.add(1292, 1150, 10), api.add(1292, 700, 9), api.add(1292, 300, 8)];
  api.advance(15, fps);
  assert.equal(api.G.phase, 'playing');
  assert.ok(items.every(item => item.body.isSleeping), `${fps}fps stack must sleep`);
  const poses = items.map(item => JSON.stringify([item.body.position, item.body.angle]));
  api.advance(3, fps);
  assert.deepEqual(items.map(item => JSON.stringify([item.body.position, item.body.angle])), poses);
  const top = items[2];
  api.add(top.body.position.x, top.body.position.y - 250, 1);
  let woke = false;
  Matter.Events.on(top.body, 'sleepEnd', () => { woke = true; });
  api.advance(2, fps);
  assert.ok(woke, 'new impacts must wake the stack');
  console.log(`${fps}fps: stack settles, remains still, and wakes on impact`);
}

{
  const api = game();
  const layout = [
    [880, 1340, 4, 0], [915, 1190, 3, 0], [1045, 1310, 6, 0],
    [1250, 1250, 7, 0.5], [1225, 1380, 1, 0], [1310, 1380, 2, 1.5],
    [1430, 1340, 3, 0], [1525, 1380, 1, 0], [1640, 1280, 7, 0],
    [1735, 1380, 1, 0],
  ];
  for (const [x, y, level, angle] of layout) {
    const item = api.add(x, y, level);
    Matter.Body.setAngle(item.body, angle);
  }
  api.advance(20, 60);
  assert.ok(api.G.items.every(i => i.body.isSleeping), 'recording-like mixed pile must settle');
  const poses = api.G.items.map(i => JSON.stringify([i.body.position, i.body.angle]));
  api.advance(3, 60);
  assert.deepEqual(api.G.items.map(i => JSON.stringify([i.body.position, i.body.angle])), poses);
  console.log('Recording-like mixed pile: sleeps and stays still');
}

{
  const api = game();
  const a = api.add(1100, 1300, 4);
  const b = api.add(1300, 1300, 4);
  const supported = api.add(1200, 1100, 8);
  Matter.Sleeping.set(supported.body, true);
  api.triggerMerge(a.body, b.body);
  assert.equal(supported.body.isSleeping, false, 'merge must wake unsupported bodies');
  api.advance(0.5, 60);
  assert.equal(api.G.merges.length, 0);
  assert.ok(api.G.items.some(item => item.level === 5 && item.bodyInWorld));
  console.log('Merge: wakes support stack and creates the next level');
}

for (let seed = 1; seed <= 12; seed++) {
  const api = game();
  let state = seed;
  const random = () => ((state = (state * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let n = 0; n < 25; n++) {
    api.add(920 + random() * 730, 350, 1 + Math.floor(random() * 5));
    api.advance(0.5, 60);
  }
  api.advance(20, 60);
  const awake = api.G.items.filter(i => !i.body.isSleeping);
  assert.equal(awake.length, 0, `drop sequence ${seed} must settle`);
  const poses = api.G.items.map(i => JSON.stringify([i.body.position, i.body.angle]));
  api.advance(3, 60);
  assert.deepEqual(api.G.items.map(i => JSON.stringify([i.body.position, i.body.angle])), poses);
  assert.ok(api.G.items.every(i => i.body.position.x >= 811 && i.body.position.x <= 1773
    && i.body.position.y <= 1414), 'fish must remain inside the bin');
  console.log('Drop sequence', seed, ': settled and stationary');
}

{
  const api = game();
  const item = api.add(1200, 1300, 11);
  const calls = [];
  const ctx = new Proxy({}, {
    get: (_, key) => (...args) => { calls.push([key, ...args]); },
    set: () => true,
  });
  api.drawJellyfish(ctx, item);
  api.advance(0.1, 144);
  item.previousPose = { x: item.body.position.x, y: item.body.position.y, angle: item.body.angle };
  calls.length = 0;
  api.drawJellyfish(ctx, item);
  assert.deepEqual(calls.find(call => call[0] === 'translate'), ['translate', item.body.position.x, item.body.position.y]);
  assert.deepEqual(calls.find(call => call[0] === 'scale'), ['scale', 1, 1]);
  item.previousPose = { x: 1000, y: 1000, angle: 0 };
  api.G.physicsAccumulator = (1000 / 120) / 2;
  calls.length = 0;
  api.drawJellyfish(ctx, item);
  assert.deepEqual(calls.find(call => call[0] === 'translate'),
    ['translate', (1000 + item.body.position.x) / 2, (1000 + item.body.position.y) / 2]);
  console.log('Render: no artificial bobbing or scale pulse');
}
