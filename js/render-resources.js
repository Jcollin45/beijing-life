// Renderer-neutral identities for GPU resources.
//
// This registry deliberately owns neither WebGL nor WebGPU handles. It gives an object one
// page-local generation id after a backend has completed its own creation transaction; packets and
// the other backend can then name that generation without carrying a WebGLTexture across the seam.
// Storage is lazy because ordinary WebGL sessions do not load this file, and source/VM probes that
// only inspect the API should not allocate the maps either.
const RenderResources = (() => {
  'use strict';

  const VERSION = 1, MAX_LIVE = 4096, MAX_LABEL = 96, MAX_KIND = 32;
  let state = 'idle', reason = '', lastError = '', sequence = 0;
  let handles = null, records = null;
  let claims = 0, reuses = 0, retires = 0, rejections = 0, highWater = 0;

  const objectHandle = value => value !== null && typeof value === 'object';
  const validKind = value => typeof value === 'string' && value.length > 0 &&
    value.length <= MAX_KIND;
  const validLabel = value => value === undefined ||
    (typeof value === 'string' && value.length <= MAX_LABEL);
  const validId = value => Number.isSafeInteger(value) && value > 0;

  function reject(why) {
    rejections++;
    lastError = why;
    return 0;
  }

  function makeRecord(kind, label) {
    const record = Object.create(null);
    record.kind = kind;
    record.label = label === undefined ? '' : label;
    return Object.freeze(record);
  }

  function ensureStorage() {
    if (handles) return;
    // Publish the pair only after both constructors succeed. An allocation failure between them
    // must leave the next claim looking at an entirely uninitialised registry, not half a pair.
    const nextHandles = new WeakMap();
    const nextRecords = new Map();
    handles = nextHandles;
    records = nextRecords;
  }

  function claim(handle, kind = 'texture', label) {
    if (state === 'stopped') return 0;
    if (!objectHandle(handle)) return reject('handle-must-be-object');
    // An existing generation is idempotent, but its type cannot be rewritten. Do not inspect a
    // repeated label: metadata is descriptive, not a back door through which a hostile toString or
    // getter may run after the identity already exists.
    if (handles) {
      const known = handles.get(handle);
      if (known) {
        const record = records.get(known);
        // Keep the weak handle entry after retirement as an allocation-free tombstone. A missing
        // live record means this exact backend handle generation can never be claimed again.
        if (!record) return reject('resource-handle-retired');
        if (!validKind(kind) || record.kind !== kind)
          return reject('resource-kind-mismatch');
        reuses++;
        return known;
      }
    }

    // Primitive-only metadata makes label handling independent of prototypes and coercion hooks.
    if (!validKind(kind)) return reject('invalid-resource-kind');
    if (!validLabel(label)) return reject('invalid-resource-label');
    if (records && records.size >= MAX_LIVE) return reject('live-resource-limit');
    if (sequence >= Number.MAX_SAFE_INTEGER) return reject('resource-id-exhausted');

    const next = sequence + 1;
    try {
      ensureStorage();
      const record = makeRecord(kind, label);
      records.set(next, record);
      try { handles.set(handle, next); }
      catch (err) { records.delete(next); throw err; }
      sequence = next;
      claims++;
      highWater = Math.max(highWater, records.size);
      state = 'active';
      reason = lastError = '';
      return next;
    } catch (_) {
      return reject('resource-registry-allocation');
    }
  }

  // Lookup is intentionally non-creating. A packet normaliser may ask about arbitrary material
  // slots, including unresolved strings, without turning those questions into registry ownership.
  function id(handle) {
    if (state === 'stopped' || !handles || !records || !objectHandle(handle)) return 0;
    const resourceId = handles.get(handle) || 0;
    return resourceId && records.has(resourceId) ? resourceId : 0;
  }

  function live(resourceId, kind) {
    if (state === 'stopped' || !records || !validId(resourceId)) return false;
    const record = records.get(resourceId);
    if (!record) return false;
    if (kind === undefined) return true;
    return validKind(kind) && record.kind === kind;
  }

  function retire(handle) {
    if (state === 'stopped' || !handles || !records || !objectHandle(handle)) return 0;
    const resourceId = handles.get(handle) || 0;
    if (!resourceId || !records.has(resourceId)) return 0;
    // Removing the only live record retires the generation before returning. The allocation-free
    // WeakMap entry remains as a weak tombstone: id() hides it, and claim() refuses its revival.
    records.delete(resourceId);
    retires++;
    return resourceId;
  }

  // A graceful trim is allowed only after every owner has retired its resource. Like forced
  // disposal it is terminal: async work holding this module cannot recreate a registry later.
  function trim() {
    if (state === 'stopped') return false;
    if (records && records.size) return false;
    handles = records = null;
    state = 'stopped';
    reason = 'trimmed';
    lastError = '';
    return true;
  }

  function dispose() {
    if (state === 'stopped') return false;
    handles = records = null;
    state = 'stopped';
    reason = 'disposed';
    lastError = '';
    return true;
  }

  function status() {
    // Null-prototype output cannot acquire a hostile inherited toJSON method, and contains no
    // object handles or registry records. It is safe for diagnostics to stringify directly.
    const out = Object.create(null);
    out.version = VERSION;
    out.state = state;
    out.reason = reason;
    out.lastError = lastError;
    out.storage = !!handles;
    out.maxLive = MAX_LIVE;
    out.maxLabel = MAX_LABEL;
    out.maxKind = MAX_KIND;
    out.nextId = state !== 'stopped' && sequence < Number.MAX_SAFE_INTEGER ? sequence + 1 : 0;
    out.issued = sequence;
    out.live = records ? records.size : 0;
    out.highWater = highWater;
    out.claims = claims;
    out.reuses = reuses;
    out.retires = retires;
    out.rejections = rejections;
    return out;
  }

  const api = Object.create(null);
  Object.assign(api,{VERSION,MAX_LIVE,MAX_LABEL,claim,id,live,retire,trim,dispose,status});
  return Object.freeze(api);
})();
