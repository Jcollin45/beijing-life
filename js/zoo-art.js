// Zoo art-direction orchestrator.
//
// The district modules deliberately own rendering only.  The expansion blueprint remains the
// authority for paths, walls, collision, interactions and schedules; this layer gives each part
// of the zoo a recognisable ecological composition without being able to break those contracts.
const ZooArt = (() => {
  'use strict';

  const CONTRACT = Object.freeze({
    version: 1,
    outdoorModules: Object.freeze([
      Object.freeze({ global: 'ZooArtCore',           id: 'core',           maxProps: 75 }),
      Object.freeze({ global: 'ZooArtWest',           id: 'west',           maxProps: 80 }),
      Object.freeze({ global: 'ZooArtCentral',        id: 'central',        maxProps: 65 }),
      Object.freeze({ global: 'ZooArtEast',           id: 'east',           maxProps: 80 }),
      Object.freeze({ global: 'ZooArtInfrastructure', id: 'infrastructure', maxProps: 80 }),
    ]),
    tropicalModules: Object.freeze([
      Object.freeze({ global: 'ZooArtTropical', id: 'tropical', maxProps: 360 }),
    ]),
    // The authored revision-2 scene already sits close to its original construction budget.
    // This explicit allowance is for the visual-remaster layer; the tighter 2,300 simultaneously
    // visible-prop cap remains unchanged and is still enforced by district chunking.
    outdoorArtPropAllowance: 380,
  });

  function globalModule(name) {
    // Top-level `const` bindings from classic scripts live in the global lexical environment but
    // are intentionally not properties of `window`, so resolve the six known modules directly.
    const mod = name === 'ZooArtCore' ?
      (typeof ZooArtCore !== 'undefined' ? ZooArtCore : null) :
      name === 'ZooArtWest' ?
        (typeof ZooArtWest !== 'undefined' ? ZooArtWest : null) :
      name === 'ZooArtCentral' ?
        (typeof ZooArtCentral !== 'undefined' ? ZooArtCentral : null) :
      name === 'ZooArtEast' ?
        (typeof ZooArtEast !== 'undefined' ? ZooArtEast : null) :
      name === 'ZooArtInfrastructure' ?
        (typeof ZooArtInfrastructure !== 'undefined' ? ZooArtInfrastructure : null) :
      name === 'ZooArtTropical' ?
        (typeof ZooArtTropical !== 'undefined' ? ZooArtTropical : null) : null;
    if (!mod || typeof mod.build !== 'function')
      throw new Error(`ZooArt: required module ${name} is missing`);
    return mod;
  }

  function finiteProp(p) {
    return p && p.m && p.color && [...p.m].every(Number.isFinite) &&
      [...p.color].every(Number.isFinite);
  }

  function run(B, rows, context) {
    const protectedCounts = {
      solids: B.solids.length,
      blockers: B.blockers.length,
      things: B.things.length,
      lights: B.lights.length,
    };
    const allProps = [], allIds = [], modules = {};

    for (const row of rows) {
      const start = B.props.length;
      const result = globalModule(row.global).build(B, context) || {};
      const added = B.props.slice(start);
      if (added.length > row.maxProps)
        throw new Error(`ZooArt: ${row.id} emitted ${added.length}/${row.maxProps} props`);
      if (result.props && (result.props.length !== added.length ||
          result.props.some((p, i) => p !== added[i])))
        throw new Error(`ZooArt: ${row.id} returned a non-canonical prop list`);

      const ids = [];
      for (const p of added) {
        if (!finiteProp(p)) throw new Error(`ZooArt: ${row.id} emitted invalid geometry`);
        if (!p.blueprintId || !/^ART-/.test(p.blueprintId))
          throw new Error(`ZooArt: ${row.id} prop is missing a stable ART-* ID`);
        if (p.tag || p.dynamic || p.glow || p.alphaGroup ||
            (p.alpha !== undefined && p.alpha < .999))
          throw new Error(`ZooArt: ${p.blueprintId} violates the render-only opaque contract`);
        if (!(Number.isFinite(p.zooLodMax) && p.zooLodMax > 0 && p.zooLodMax <= 34))
          throw new Error(`ZooArt: ${p.blueprintId} needs zooLodMax <= 34`);
        ids.push(p.blueprintId);
      }
      if (result.ids && (result.ids.length !== ids.length ||
          result.ids.some((id, i) => id !== ids[i])))
        throw new Error(`ZooArt: ${row.id} returned a non-canonical ID list`);

      allProps.push(...added); allIds.push(...ids);
      modules[row.id] = Object.freeze({ props: added.length, ids: Object.freeze(ids.slice()) });
    }

    if (new Set(allIds).size !== allIds.length)
      throw new Error('ZooArt: duplicate stable art IDs');
    for (const [key, before] of Object.entries(protectedCounts))
      if (B[key].length !== before)
        throw new Error(`ZooArt: render-only modules changed ${key}`);

    return Object.freeze({
      props: Object.freeze(allProps.slice()),
      ids: Object.freeze(allIds.slice()),
      modules: Object.freeze(modules),
    });
  }

  function buildOutdoor(B, context = {}) {
    return run(B, CONTRACT.outdoorModules, Object.freeze({ ...context, scope: 'outdoor' }));
  }

  function buildTropical(B, context = {}) {
    return run(B, CONTRACT.tropicalModules, Object.freeze({ ...context, scope: 'tropical' }));
  }

  return Object.freeze({ CONTRACT, buildOutdoor, buildTropical });
})();
