// Places that are not built until somebody stands in them.
//
// Eighteen rooms were constructed at load, every time, whoever you were and wherever you were
// going. That is where the boot went: of 471ms of script evaluation, 440 was scene construction,
// and 160 of it was the shopping centre alone — a three-storey building with a void through two
// decks, built in full so that a player waking up in a flat in 朝阳区 could not see it. The flat
// itself costs 14.
//
// So a place becomes a promise to build a place. `Lazy('Mall', () => {...})` hands back a proxy
// that looks exactly like the module until the first time anything actually asks it a question,
// at which point the body runs once and every access from then on goes straight through. Nothing
// in a scene file changes except the two lines that wrap it: the body is the same body, it just
// runs later, and for most rooms on most sessions it never runs at all.
//
// What forces a build is worth knowing, because the point is to not do it by accident:
//   - reading any property (`Mall.things`, `Metro.STATIONS`)
//   - `in`, `Object.keys`, spreading it
// What does not:
//   - naming it (`PLACES.mall = Mall`), passing it around, `typeof Mall !== 'undefined'`
// The registry below is what the boot check talks to, so a stale build is still caught without
// building anything: index.html hands over the keys a module owes, and they are verified against
// the real thing the moment it is finally built rather than at load.
const Lazy = (() => {

  const REG = {};        // name -> { build, mod, expect }

  // The traps. `real()` is the only place construction happens, and everything below funnels
  // through it, so there is exactly one door and it is easy to put a breakpoint on.
  function make(name) {
    const rec = REG[name];
    const real = () => {
      if (rec.mod) return rec.mod;
      if (rec.building)
        throw new Error(`Lazy: ${name} asked for itself while it was still being built`);
      rec.building = true;
      const t = performance.now();
      try {
        rec.mod = rec.build();
      } finally {
        rec.building = false;
      }
      if (!rec.mod || typeof rec.mod !== 'object')
        throw new Error(`Lazy: ${name} built nothing usable`);
      rec.ms = +(performance.now() - t).toFixed(1);
      // Who asked. A room that builds itself during boot is a bug of exactly the kind this file
      // exists to remove, and it is invisible without the stack that reached it: `Lazy.why('Mall')`
      // names the line that touched a shopping centre before anybody had walked into one.
      rec.stack = (new Error().stack || '').split('\n').slice(2, 7).join('\n');
      // The integrity check, moved from load time to build time. Same list, same failure, just
      // asked at the only moment it can be asked without paying for the answer up front.
      if (rec.expect) {
        const missing = rec.expect.filter(k => rec.mod[k] === undefined);
        if (missing.length) {
          const err = `${name} is a stale or partial build — missing ${missing.join(', ')}`;
          if (typeof Lazy.onstale === 'function') Lazy.onstale(err);
          else throw new Error(err);
        }
      }
      for (const fn of rec.after || []) fn(rec.mod);
      rec.after = null;
      return rec.mod;
    };
    rec.real = real;

    return new Proxy({}, {
      get(_, k) {
        // Asked before anything else so that code can check whether a room exists yet without
        // that question being the thing that builds it.
        if (k === '__lazyName') return name;
        if (k === '__lazyBuilt') return !!rec.mod;
        return real()[k];
      },
      set(_, k, v) { real()[k] = v; return true; },
      has(_, k) { return k in real(); },
      deleteProperty(_, k) { delete real()[k]; return true; },
      ownKeys() { return Reflect.ownKeys(real()); },
      getOwnPropertyDescriptor(_, k) {
        const d = Reflect.getOwnPropertyDescriptor(real(), k);
        // The target is an empty extensible object, so a descriptor it does not have may only be
        // reported as configurable. Module literals are configurable anyway; this keeps the proxy
        // invariant true even if one day one is not.
        if (d) d.configurable = true;
        return d;
      },
      defineProperty(_, k, d) { Object.defineProperty(real(), k, d); return true; },
      getPrototypeOf() { return Object.getPrototypeOf(real()); },
    });
  }

  function Lazy(name, build) {
    if (REG[name]) throw new Error(`Lazy: ${name} registered twice`);
    REG[name] = { build, mod: null, expect: null, after: [] };
    return make(name);
  }

  // What the module owes, from index.html's NEEDS table. Verified at build.
  Lazy.expect = (name, keys) => { if (REG[name]) REG[name].expect = keys; };
  Lazy.knows = name => !!REG[name];
  Lazy.built = name => !!(REG[name] && REG[name].mod);
  Lazy.names = () => Object.keys(REG);
  // Run something the first time a place is built — or now, if it already has been. This is how
  // the roster gets its people into rooms that do not exist yet.
  Lazy.onBuild = (name, fn) => {
    const rec = REG[name];
    if (!rec) return false;
    if (rec.mod) { fn(rec.mod); return true; }
    rec.after.push(fn);
    return true;
  };
  // Force one, or all of them — the screenshot and audit harnesses want every room whether or
  // not anybody walked into it.
  Lazy.force = name => (REG[name] ? REG[name].real() : null);
  Lazy.forceAll = () => { for (const k in REG) REG[k].real(); };
  Lazy.cost = () => Object.keys(REG).reduce((o, k) => (o[k] = REG[k].ms || 0, o), {});
  Lazy.why = name => (REG[name] && REG[name].stack) || null;

  return Lazy;
})();
