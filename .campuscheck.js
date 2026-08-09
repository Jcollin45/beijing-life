// Runtime acceptance check for the expanded university campus.
// Requires the normal local server (`python3 serve.py 8000`).
require('./.harness-env.js');
const { spawn } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');
const ENV = require('./.harness-env.js');
const GATE = require('./.render-gate.js');
const PORT = ENV.devPort('CAMPUS_CHECK_PORT');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'campus-check-'));
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let chrome;

async function devtools(url, tries = 300) {
  for (let i = 0; i < tries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) return await response.json();
    } catch (_) {}
    await sleep(100);
  }
  throw new Error('campus check: Chrome DevTools did not start');
}

async function main() {
  await GATE.acquire('campuscheck');
  chrome = GATE.reap(spawn(ENV.CHROME, ENV.flags(PORT, profile), { stdio: 'ignore' }));
  const tab = (await devtools(`http://127.0.0.1:${PORT}/json/list`))
    .find(entry => entry.type === 'page');
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });

  let sequence = 0;
  const pending = new Map(), errors = [];
  ws.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const waiter = pending.get(message.id);
      if (!waiter) return;
      pending.delete(message.id);
      message.error ? waiter.reject(new Error(message.error.message)) : waiter.resolve(message.result);
      return;
    }
    if (message.method === 'Runtime.exceptionThrown') {
      const d = message.params.exceptionDetails;
      errors.push(d.exception && (d.exception.description || d.exception.value) || d.text);
    }
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
      errors.push((message.params.args || []).map(arg =>
        arg.value !== undefined ? arg.value : (arg.description || arg.type)).join(' '));
    }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true });
    if (result.exceptionDetails) throw new Error(
      result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Page.navigate', { url: ENV.URL });
  let booted = false;
  for (let i = 0; i < 240 && !booted; i++) {
    booted = await evaluate('typeof window.__game === "object"').catch(() => false);
    if (!booted) await sleep(250);
  }
  if (!booted) throw new Error('campus check: game did not boot');
  await evaluate("(document.getElementById('start') || {}).click?.()");
  await evaluate("window.__game.setPlace('campus')");
  await sleep(900);

  const report = await evaluate(`(() => {
    const scene = Campus;
    const contract = window.CampusContract;
    const STEP = .25, BODY = .30, FOCUS_CLEAR = .35;
    const failures = [], checks = [];
    const check = (name, ok, detail = '') => {
      checks.push({name, ok:!!ok, detail:ok ? '' : String(detail)});
      if (!ok) failures.push(detail ? name + ': ' + detail : name);
    };
    const near = (a,b,e=.011) => Math.abs(a-b) <= e;
    const hasSolid = (x0,x1,z0,z1) => scene.solids.some(s =>
      near(s.x0,x0) && near(s.x1,x1) && near(s.z0,z0) && near(s.z1,z1));
    const safe = (x,z,r=BODY) =>
      scene.zones.some(q => x >= q.x0+r && x <= q.x1-r && z >= q.z0+r && z <= q.z1-r) &&
      !scene.solids.some(s => !s.open && x > s.x0-r && x < s.x1+r && z > s.z0-r && z < s.z1+r);

    check('layout contract exists', !!contract);
    check('layout version is 2', contract?.layoutVersion === 2, contract?.layoutVersion);
    check('campus bounds are exact', contract && contract.x0 === -48 && contract.x1 === 48 &&
      contract.z0 === -13 && contract.z1 === 67, JSON.stringify(contract));
    check('canonical spawn is exact', contract && near(contract.spawn.x,-11.4) &&
      near(contract.spawn.z,-9.35) && near(contract.spawn.yaw,0), JSON.stringify(contract?.spawn));
    check('all six fit modules registered once', (() => {
      const rows = window.CampusFits?.rows || [];
      return ['boundary','academic','west','east','furniture','life'].every(id =>
        rows.filter(row => row.id === id).length === 1);
    })(), JSON.stringify((window.CampusFits?.rows || []).map(row => row.id)));
    check('seven overlapping walk zones built', scene.zones.length === 7, scene.zones.length);
    check('every walk zone has a light triple', scene.zones.every(z =>
      Array.isArray(z.light) && z.light.length === 3 && z.light.every(Number.isFinite)));
    check('roomAt fallback returns an object with light', (() => {
      const room = scene.roomAt(999,999,'campus-core');
      return room && room.id === 'campus-core' && Array.isArray(room.light);
    })());

    const major = [
      ['B01',-19.20,13.20,51.80,63.20], ['B02',29.80,43.20,37.80,62.20],
      ['B03',-43.20,-28.80,-7.20,12.20], ['B04',29.80,43.20,-9.20,7.20],
      ['B05',-43.20,-28.80,23.80,36.20], ['B06',-43.20,-27.80,39.80,62.20],
      ['B07',29.80,43.20,22.80,34.20], ['B08',6.20,12.60,-12.60,-6.80],
    ];
    for (const [id,x0,x1,z0,z1] of major)
      check(id + ' exact body solid', hasSolid(x0,x1,z0,z1));
    const walls = [
      [-48,-7.75,-13.18,-12.82], [1.75,48,-13.18,-12.82],
      [-48.18,-47.82,-13,17], [-48.18,-47.82,23,67],
      [47.82,48.18,-13,17], [47.82,48.18,23,67],
      [-48,31,66.82,67.18], [39,48,66.82,67.18], [31,39,66.70,67.05],
    ];
    walls.forEach((v,i) => check('wall/gate solid ' + (i+1), hasSolid(...v)));
    check('no major building AABBs overlap', major.every((a,i) => major.slice(i+1).every(b =>
      a[2] <= b[1] || b[2] <= a[1] || a[4] <= b[3] || b[4] <= a[3])));

    const expectedThings = ['教学楼','教室','书桌','打印','图书馆','食堂','售货机','煎饼','大学',
      '自行车','布告板','篮球场','宿舍','地铁站','校园地图','学生服务中心','行政楼','实验楼',
      '活动中心','校医院','校园快递柜','跑道'];
    for (const label of expectedThings)
      check('interaction exists: ' + label, scene.things.some(t => t.hz === label));
    check('four interactive benches', scene.things.filter(t => t.hz === '长椅').length === 4,
      scene.things.filter(t => t.hz === '长椅').length);
    check('five interactive fountains', scene.things.filter(t => t.hz === '饮水机').length === 5,
      scene.things.filter(t => t.hz === '饮水机').length);
    check('every campus interaction has vocabulary', scene.things.every(t => Vocab.get(t.hz)),
      scene.things.filter(t => !Vocab.get(t.hz)).map(t => t.hz).join(', '));
    check('library portal uses the authored interior arrival', (() => {
      const t = scene.things.find(q => q.hz === '图书馆');
      return t?.exit?.place === 'library' && near(t.exit.at.x,1.4) && near(t.exit.at.z,-3.3);
    })());
    check('campus classroom action enters the classroom', window.__game.USE['教室']?.go === 'classroom');
    check('campus library action enters the library', window.__game.USE['图书馆']?.go === 'library');
    check('classroom door returns to its exact campus arrival', (() => {
      const t = Classroom.things.find(q => q.exit?.place === 'campus');
      return t && near(t.exit.at.x,-3) && near(t.exit.at.z,47.20) && near(t.exit.at.yaw,0);
    })());
    check('library door returns to its exact campus arrival', (() => {
      const t = Library.things.find(q => q.exit?.place === 'campus');
      return t && near(t.exit.at.x,27.20) && near(t.exit.at.z,50) &&
        near(t.exit.at.yaw,Math.PI/2);
    })());
    check('University Town metro exit uses the canonical campus spawn', (() => {
      const s = Metro.STATIONS.find(q => q.hz === '大学城');
      return s?.out?.place === 'campus' && near(s.out.at.x,-11.40) &&
        near(s.out.at.z,-9.35) && near(s.out.at.yaw,0);
    })());

    const campusCast = [
      { id:'xiaozhou_student', spots:[
        [7,11,-5,-7.5,Math.PI,'wait'], [11,13,-24,2.5,-Math.PI/2,'wait'],
        [13,17,27,50,Math.PI/2,'wait'], [17,22,3,29,Math.PI,'wait'] ] },
      { id:'campus-teacher-chen-laoshi', spots:[
        [8,12,-3,47,Math.PI,'wait'], [12,14,-26,30,-Math.PI/2,'wait'],
        [14,18,-8,45,0,'wait'] ] },
      { id:'campus-student-xiao-li', spots:[
        [8,11,-10.5,13.2,Math.PI,'wait'], [11,12,-24,1,-Math.PI/2,'wait'],
        [12,14,36,11,Math.PI*.15,'wait'], [14,18,6,31,0,'wait'],
        [18,22,36,13,Math.PI*.15,'wait'] ] },
    ];
    const campusNPCs = window.__game.NPCS.filter(n => n.place === 'campus' && n.campusStatic);
    check('campus has exactly three static NPCs', campusNPCs.length === 3,
      campusNPCs.map(n => n.rig || n.unavailableRig).join(', '));
    for (const expected of campusCast) {
      const n = campusNPCs.find(q => q.rig === expected.id);
      check('campus static rig exists: ' + expected.id, !!n,
        campusNPCs.map(q => [q.rig,q.unavailableRig].filter(Boolean).join('/')).join(', '));
      check('campus schedule is exact: ' + expected.id, !!n && n.spots.length === expected.spots.length &&
        n.spots.every((s,i) => {
          const e=expected.spots[i];
          return near(s.h0,e[0]) && near(s.h1,e[1]) && near(s.at[0],e[2]) &&
            near(s.at[1],e[3]) && near(s.face,e[4]) && s.act === e[5];
        }), n ? JSON.stringify(n.spots) : 'missing rig');
    }
    check('scene stays under the prop ceiling', scene.props.length <= 3200, scene.props.length);
    check('all hard interaction focuses clear solids by 0.35 m', scene.things.every(t =>
      !scene.solids.some(s => !s.open && t.focus[0] > s.x0-FOCUS_CLEAR &&
        t.focus[0] < s.x1+FOCUS_CLEAR && t.focus[1] > s.z0-FOCUS_CLEAR &&
        t.focus[1] < s.z1+FOCUS_CLEAR)), scene.things.filter(t => scene.solids.some(s => !s.open &&
          t.focus[0] > s.x0-FOCUS_CLEAR && t.focus[0] < s.x1+FOCUS_CLEAR &&
          t.focus[1] > s.z0-FOCUS_CLEAR && t.focus[1] < s.z1+FOCUS_CLEAR)).map(t => t.hz).join(', '));

    const x0 = -52, x1 = 52, z0 = -17, z1 = 71;
    const nx = Math.round((x1-x0)/STEP)+1, nz = Math.round((z1-z0)/STEP)+1;
    const key = (ix,iz) => iz*nx+ix;
    const point = (ix,iz) => [x0+ix*STEP,z0+iz*STEP];
    const nearestSafe = (x,z) => {
      const cx=Math.round((x-x0)/STEP), cz=Math.round((z-z0)/STEP);
      for (let ring=0; ring<12; ring++) for (let dz=-ring;dz<=ring;dz++)
        for (let dx=-ring;dx<=ring;dx++) {
          if (Math.max(Math.abs(dx),Math.abs(dz)) !== ring) continue;
          const ix=cx+dx, iz=cz+dz;
          if (ix<0||ix>=nx||iz<0||iz>=nz) continue;
          const p=point(ix,iz); if (safe(p[0],p[1])) return [ix,iz];
        }
      return null;
    };
    const start = nearestSafe(contract.spawn.x,contract.spawn.z), reached = new Uint8Array(nx*nz);
    const queue = start ? [start] : [];
    if (start) reached[key(start[0],start[1])] = 1;
    for (let head=0;head<queue.length;head++) {
      const [ix,iz]=queue[head];
      for (const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const ax=ix+dx, az=iz+dz;
        if (ax<0||ax>=nx||az<0||az>=nz||reached[key(ax,az)]) continue;
        const p=point(ax,az); if (!safe(p[0],p[1])) continue;
        reached[key(ax,az)]=1; queue.push([ax,az]);
      }
    }
    const reachable = (x,z) => {
      const cell=nearestSafe(x,z);
      return !!cell && !!reached[key(cell[0],cell[1])] &&
        Math.hypot(point(cell[0],cell[1])[0]-x,point(cell[0],cell[1])[1]-z) <= .55;
    };
    check('spawn enters the occupancy graph', !!start);
    check('all interaction focuses are flood-fill reachable', scene.things.every(t =>
      reachable(t.focus[0],t.focus[1])), scene.things.filter(t =>
        !reachable(t.focus[0],t.focus[1])).map(t => t.hz).join(', '));
    check('classroom return is flood-fill reachable', reachable(-3,47.2));
    check('library return is flood-fill reachable', reachable(27.2,50));
    check('metro focus is flood-fill reachable', reachable(-11.4,-9.15));
    check('all seven zones join the same reachable component', scene.zones.every(z =>
      reachable((z.x0+z.x1)/2,(z.z0+z.z1)/2)));

    // Integration acceptance runs in this harness's disposable Chrome profile. It deliberately
    // exercises the public game seam and the real save/load path instead of duplicating their rules.
    const game = window.__game;
    const district = {};
    for (const p of ['campus','classroom','library']) {
      game.setPlace(p, p === 'campus' ? contract.spawn : undefined);
      district[p] = game.hereStation();
    }
    game.setPlace('campus',contract.spawn);
    check('campus, classroom and library all map to University Town',
      district.campus === '大学城' && district.classroom === '大学城' &&
      district.library === '大学城', JSON.stringify(district));

    const useAt = thing => {
      if (!thing || !Array.isArray(thing.focus)) return false;
      game.P.x=thing.focus[0]; game.P.z=thing.focus[1];
      game.P.vx=game.P.vz=0;
      game.startUse(thing);
      const began = !!game.state().doing;
      game.stopUse(true);
      return began;
    };
    const toastText = () => document.getElementById('toast')?.textContent || '';
    const service = scene.things.find(t => t.hz === '学生服务中心');
    check('student-id profile starts clean', game.state().campusLife.studentId === false &&
      !game.state().bought.includes('学生证') && !CinemaSys.hasStudentId(),
      JSON.stringify({campusLife:game.state().campusLife,bought:game.state().bought}));
    const firstBegan = useAt(service);
    const firstState = game.state(), firstToast = toastText(), firstSave = game.saved();
    check('student service first issuance completes', firstBegan &&
      firstState.campusLife.studentId === true &&
      firstState.bought.filter(v => v === '学生证').length === 1 &&
      firstToast.includes('学生证办好了'),
      JSON.stringify({began:firstBegan,state:firstState.campusLife,toast:firstToast}));
    check('first issuance saves the durable campus flag',
      firstSave?.campusLife?.studentId === true, JSON.stringify(firstSave?.campusLife));
    check('cinema sees the newly issued student card', CinemaSys.hasStudentId());
    const repeatBegan = useAt(service);
    const repeatState = game.state(), repeatToast = toastText();
    check('student service repeat issuance is idempotent', repeatBegan &&
      repeatState.campusLife.studentId === true &&
      repeatState.bought.filter(v => v === '学生证').length === 1 &&
      repeatToast.includes('已经办过了'),
      JSON.stringify({began:repeatBegan,count:repeatState.bought.filter(v => v === '学生证').length,
        toast:repeatToast}));

    const lockerDef = game.USE['校园快递柜'];
    const locker = scene.things.find(t => t.hz === '校园快递柜');
    const homeBefore = JSON.stringify(game.HomeLife.toSave());
    const lockerBegan = useAt(locker);
    const homeAfter = JSON.stringify(game.HomeLife.toSave());
    const apartmentHooks = ['parcelTake','mailTake','mailbox','parcel','delivery'];
    check('campus locker has no apartment parcel hooks', lockerDef &&
      apartmentHooks.every(k => !Object.prototype.hasOwnProperty.call(lockerDef,k)),
      JSON.stringify(lockerDef));
    check('campus locker completion leaves HomeLife unchanged', lockerBegan && homeAfter === homeBefore,
      lockerBegan ? 'HomeLife changed' : 'campus locker action did not start');

    const SAVEKEY = 'bjlife.save.v1';
    const seed = game.saved();
    if (seed) {
      const laterPurchases = Array.from({length:30},(_,i) => 'campus-check-purchase-' + (i+1));
      const clipped = ['学生证',...laterPurchases].slice(-24);
      seed.bought=clipped;
      seed.campusLife={studentId:true};
      seed.place='campus'; seed.x=contract.spawn.x; seed.z=contract.spawn.z;
      seed.yaw=contract.spawn.yaw; seed.layouts={campus:contract.layoutVersion};
      localStorage.setItem(SAVEKEY,JSON.stringify(seed));
      check('30 later purchases clip the card from the saved purchase window',
        seed.bought.length === 24 && !seed.bought.includes('学生证'),
        JSON.stringify(seed.bought));
      game.loadNow();
      const bridged = game.state();
      check('save/reload rehydrates one card from campusLife after 30 purchases',
        bridged.campusLife.studentId === true &&
        bridged.bought.filter(v => v === '学生证').length === 1 &&
        laterPurchases.slice(-24).every(v => bridged.bought.includes(v)),
        JSON.stringify({campusLife:bridged.campusLife,bought:bridged.bought}));
      check('cinema bridge survives the clipped-purchase reload',
        CinemaSys.hasStudentId() && CinemaSys.offerState().available === true);

      const legacy = game.saved();
      legacy.place='campus'; legacy.x=40; legacy.z=60; legacy.yaw=1.234;
      delete legacy.layouts;
      localStorage.setItem(SAVEKEY,JSON.stringify(legacy));
      game.loadNow();
      check('pre-layout-v2 campus save migrates to the canonical spawn',
        game.where() === 'campus' && near(game.P.x,contract.spawn.x) &&
        near(game.P.z,contract.spawn.z) && near(game.P.yaw,contract.spawn.yaw),
        JSON.stringify({place:game.where(),x:game.P.x,z:game.P.z,yaw:game.P.yaw}));
      game.saveNow();
      check('migrated campus save records layout version 2',
        game.saved()?.layouts?.campus === 2, JSON.stringify(game.saved()?.layouts));
    } else {
      check('30-purchase save/reload bridge has a seed save', false, 'student issuance did not save');
      check('pre-layout-v2 migration has a seed save', false, 'student issuance did not save');
    }

    return {checks, failures, stats:{props:scene.props.length,things:scene.things.length,
      solids:scene.solids.length,blockers:scene.blockers.length,lights:scene.lights.length,
      reachableCells:queue.length}};
  })()`);

  for (const check of report.checks) {
    if (!check.ok) console.log('FAIL ' + check.name + (check.detail ? ' — ' + check.detail : ''));
  }
  for (const error of errors) console.log('FAIL browser error — ' + String(error).split('\n')[0]);
  const passed = report.checks.filter(check => check.ok).length;
  const total = report.checks.length + errors.length;
  console.log(JSON.stringify(report.stats));
  console.log(`\n${passed}/${total} checks passed`);
  if (report.failures.length || errors.length) process.exitCode = 1;
  ws.close();
}

main().catch(error => {
  console.error('FAIL ' + (error.stack || error.message));
  process.exitCode = 2;
}).finally(async () => {
  if (chrome) {
    chrome.kill('SIGTERM');
    await sleep(500);
    if (chrome.exitCode === null) chrome.kill('SIGKILL');
  }
  try { fs.rmSync(profile, {recursive:true, force:true}); } catch (_) {}
  GATE.release();
});
