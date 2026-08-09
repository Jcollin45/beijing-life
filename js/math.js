// Minimal 4x4 matrix / vector math. Column-major, same layout as GLSL mat4.
const M = {
  ident(o = new Float32Array(16)) {
    o.fill(0); o[0] = o[5] = o[10] = o[15] = 1; return o;
  },
  // out = a * b  (apply b first, then a)
  mul(a, b, o = new Float32Array(16)) {
    for (let c = 0; c < 4; c++) {
      const b0 = b[c * 4], b1 = b[c * 4 + 1], b2 = b[c * 4 + 2], b3 = b[c * 4 + 3];
      o[c * 4]     = a[0] * b0 + a[4] * b1 + a[8]  * b2 + a[12] * b3;
      o[c * 4 + 1] = a[1] * b0 + a[5] * b1 + a[9]  * b2 + a[13] * b3;
      o[c * 4 + 2] = a[2] * b0 + a[6] * b1 + a[10] * b2 + a[14] * b3;
      o[c * 4 + 3] = a[3] * b0 + a[7] * b1 + a[11] * b2 + a[15] * b3;
    }
    return o;
  },
  trans(x, y, z, o = new Float32Array(16)) { M.ident(o); o[12] = x; o[13] = y; o[14] = z; return o; },
  scale(x, y, z, o = new Float32Array(16)) { M.ident(o); o[0] = x; o[5] = y; o[10] = z; return o; },
  rotY(a, o = new Float32Array(16)) {
    M.ident(o); const c = Math.cos(a), s = Math.sin(a);
    o[0] = c; o[2] = -s; o[8] = s; o[10] = c; return o;
  },
  rotX(a, o = new Float32Array(16)) {
    M.ident(o); const c = Math.cos(a), s = Math.sin(a);
    o[5] = c; o[6] = s; o[9] = -s; o[10] = c; return o;
  },
  rotZ(a, o = new Float32Array(16)) {
    M.ident(o); const c = Math.cos(a), s = Math.sin(a);
    o[0] = c; o[1] = s; o[4] = -s; o[5] = c; return o;
  },
  // translate * rotY * scale — the transform used by nearly every prop
  trs(x, y, z, ry, sx, sy, sz) {
    const c = Math.cos(ry), s = Math.sin(ry), o = new Float32Array(16);
    o[0] = c * sx;  o[1] = 0;   o[2] = -s * sx; o[3] = 0;
    o[4] = 0;       o[5] = sy;  o[6] = 0;       o[7] = 0;
    o[8] = s * sz;  o[9] = 0;   o[10] = c * sz; o[11] = 0;
    o[12] = x; o[13] = y; o[14] = z; o[15] = 1;
    return o;
  },
  // Parallel projection, for the sun. Sunlight arrives as a parallel beam, so the camera that
  // renders the shadow map has no perspective in it at all.
  ortho(l, r, b, t, near, far, o = new Float32Array(16)) {
    o.fill(0);
    o[0] = 2 / (r - l); o[5] = 2 / (t - b); o[10] = -2 / (far - near);
    o[12] = -(r + l) / (r - l); o[13] = -(t + b) / (t - b);
    o[14] = -(far + near) / (far - near); o[15] = 1;
    return o;
  },
  persp(fovy, aspect, near, far, o = new Float32Array(16)) {
    const f = 1 / Math.tan(fovy / 2); o.fill(0);
    o[0] = f / aspect; o[5] = f; o[11] = -1;
    o[10] = (far + near) / (near - far);
    o[14] = (2 * far * near) / (near - far);
    return o;
  },
  lookAt(eye, tgt, o = new Float32Array(16)) {
    let zx = eye[0] - tgt[0], zy = eye[1] - tgt[1], zz = eye[2] - tgt[2];
    let l = Math.hypot(zx, zy, zz) || 1; zx /= l; zy /= l; zz /= l;
    // x = normalize(cross(up, z)), with up = (0,1,0). The three lines that used to sit here
    // computed xx/xy/xz from a hardcoded zero vector and were overwritten on the next line without
    // ever being read.
    //
    // Straight up is the right up for every camera in this game, but the cross product vanishes
    // when the view is exactly vertical — and a view straight down at a floor is one keypress away
    // in the studio. That gave a zero-length x, a divide guarded to 1, and a view matrix of NaNs
    // that blanked the canvas with no error anywhere. Roll to a sideways up when it happens: a
    // camera looking straight down still has to decide which way is north, and any answer beats
    // none.
    let xx, xy, xz;
    if (Math.abs(zy) > 0.99999) { xx = 1; xy = 0; xz = 0; }
    else {
      xx = zz; xy = 0; xz = -zx;
      l = Math.hypot(xx, xy, xz) || 1; xx /= l; xy /= l; xz /= l;
    }
    const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    o[0] = xx; o[1] = yx; o[2] = zx; o[3] = 0;
    o[4] = xy; o[5] = yy; o[6] = zy; o[7] = 0;
    o[8] = xz; o[9] = yz; o[10] = zz; o[11] = 0;
    o[12] = -(xx * eye[0] + xy * eye[1] + xz * eye[2]);
    o[13] = -(yx * eye[0] + yy * eye[1] + yz * eye[2]);
    o[14] = -(zx * eye[0] + zy * eye[1] + zz * eye[2]);
    o[15] = 1;
    return o;
  },
  // project a world point with a view-projection matrix -> {x,y,w} in clip space
  project(m, x, y, z) {
    return {
      x: m[0] * x + m[4] * y + m[8]  * z + m[12],
      y: m[1] * x + m[5] * y + m[9]  * z + m[13],
      w: m[3] * x + m[7] * y + m[11] * z + m[15],
    };
  },
};
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
