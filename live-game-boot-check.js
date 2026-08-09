'use strict';

// Minimal, tracked GitHub-runner acceptance check. It deliberately has no dependency on the
// dot-prefixed local harness files, which are ignored by the repository. A disposable hosted
// Chrome loads the real index, waits for the loader, presses PLAY, enters Campus, and reports the
// exact visible boot message and runtime exceptions when any stage fails.
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const CHROME = process.env.CHROME || '/usr/bin/google-chrome';
const GAME_URL = process.env.GAME_URL || 'http://127.0.0.1:8000/index.html';
const DEBUG_PORT = 12000 + Math.floor(Math.random() * 12000);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'beijing-life-cloud-'));
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let chrome;

async function waitJson(url, tries = 600) {
  for (let i = 0; i < tries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
    } catch (_) {}
    await sleep(100);
  }
  throw new Error(`Chrome DevTools did not start within ${tries / 10}s`);
}

async function main() {
  chrome = spawn(CHROME, [
    '--headless=new', '--no-first-run', '--disable-default-apps', '--mute-audio',
    '--autoplay-policy=no-user-gesture-required', '--enable-webgl', '--ignore-gpu-blocklist',
    '--use-angle=swiftshader-webgl', '--enable-unsafe-swiftshader',
    `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${profile}`,
    '--window-size=1280,800', 'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });

  let chromeError = '';
  chrome.stderr.on('data', chunk => { chromeError += chunk; });
  const tabs = await waitJson(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
  const tab = tabs.find(item => item.type === 'page');
  if (!tab) throw new Error('Chrome opened no page target');

  const socket = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });

  let sequence = 0;
  const pending = new Map();
  const errors = [];
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const waiter = pending.get(message.id);
      if (!waiter) return;
      pending.delete(message.id);
      if (message.error) waiter.reject(new Error(message.error.message));
      else waiter.resolve(message.result);
      return;
    }
    if (message.method === 'Runtime.exceptionThrown') {
      const detail = message.params.exceptionDetails;
      errors.push([detail.text, detail.exception &&
        (detail.exception.description || detail.exception.value)].filter(Boolean).join(' | '));
    }
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
      const text = (message.params.args || []).map(arg =>
        arg.value !== undefined ? arg.value : (arg.description || arg.type)).join(' ');
      if (text) errors.push(`console.error: ${text}`);
    }
    if (message.method === 'Log.entryAdded' && /error/i.test(message.params.entry.level || '')) {
      const entry = message.params.entry;
      if (!/favicon/i.test((entry.url || '') + (entry.text || ''))) errors.push(entry.text);
    }
  });

  function send(method, params = {}, timeoutMs = 180000) {
    return new Promise((resolve, reject) => {
      const id = ++sequence;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`${method} timed out after ${timeoutMs / 1000}s`));
      }, timeoutMs);
      pending.set(id, {
        resolve(value) { clearTimeout(timer); resolve(value); },
        reject(error) { clearTimeout(timer); reject(error); },
      });
      socket.send(JSON.stringify({ id, method, params }));
    });
  }

  async function evaluate(expression, timeoutMs) {
    const response = await send('Runtime.evaluate', {
      expression, returnByValue: true, awaitPromise: true,
    }, timeoutMs);
    if (response.exceptionDetails) {
      const detail = response.exceptionDetails;
      throw new Error([detail.text, detail.exception && detail.exception.description]
        .filter(Boolean).join(' | '));
    }
    return response.result.value;
  }

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable');
  await send('Page.navigate', { url: GAME_URL });

  let loader = null;
  for (let i = 0; i < 900; i++) {
    loader = await evaluate(`(() => {
      const boot=document.getElementById('boot');
      const start=document.getElementById('start');
      return {
        game:!!window.__game,
        bootOn:!!(boot&&boot.classList.contains('on')),
        bootWhat:(document.getElementById('bootWhat')||{}).textContent||'',
        startText:start&&start.textContent||'',
        startDisabled:!!(start&&start.disabled),
      };
    })()`, 15000).catch(error => ({ evaluateError: error.message }));
    if (loader.game || loader.bootOn) break;
    await sleep(100);
  }

  if (!loader || !loader.game || loader.bootOn) {
    throw new Error(`loader did not produce a playable game: ${JSON.stringify(loader)}`);
  }
  if (loader.startDisabled) throw new Error(`PLAY remained disabled: ${JSON.stringify(loader)}`);

  const startResult = await evaluate(`(() => {
    const start=document.getElementById('start');
    try { start.click(); return {clicked:true}; }
    catch(error) { return {clicked:false,error:error.stack||error.message}; }
  })()`);
  await sleep(1800);
  const entered = await evaluate(`(() => ({
    ...(${JSON.stringify(startResult)}),
    playing:document.body.classList.contains('playing'),
    introGone:document.getElementById('intro').classList.contains('gone'),
    startDisabled:document.getElementById('start').disabled,
    place:window.__game&&window.__game.state().place,
    bootOn:document.getElementById('boot').classList.contains('on'),
    bootWhat:document.getElementById('bootWhat').textContent||'',
  }))()`);
  if (!entered.clicked || !entered.playing || !entered.introGone || entered.bootOn)
    throw new Error(`PLAY did not enter the game: ${JSON.stringify(entered)}`);

  const campus = await evaluate(`(async()=>{
    try {
      window.__game.setPlace('campus',{x:-11.4,z:-9.35,yaw:0});
      await new Promise(resolve=>setTimeout(resolve,1800));
      const scene=window.__game.scene();
      return {ok:true,place:window.__game.state().place,props:scene.props.length,
        things:scene.things.length,solids:scene.solids.length};
    } catch(error) { return {ok:false,error:error.stack||error.message}; }
  })()`, 30000);
  if (!campus.ok || campus.place !== 'campus')
    throw new Error(`Campus entry failed: ${JSON.stringify(campus)}`);

  const lateErrors = errors.filter(text => !/favicon|autoplay|Download the React/i.test(text));
  const report = { loader, entered, campus, errors: lateErrors.slice(0, 12) };
  console.log(JSON.stringify(report, null, 2));
  if (lateErrors.length) throw new Error(`runtime errors: ${lateErrors.join(' || ')}`);
  socket.close();
}

main().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
}).finally(async () => {
  if (chrome) {
    chrome.kill('SIGTERM');
    await sleep(500);
    if (chrome.exitCode === null) chrome.kill('SIGKILL');
  }
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch (_) {}
});
