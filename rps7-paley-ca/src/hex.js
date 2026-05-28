// hex.js
// Pointy-top hexagonal grid using odd-r offset coordinates.
// Storage is a flat array indexed by r*cols + c.
//
// Geometry (radius = HEX):
//   width  = sqrt(3) * HEX        (horizontal step between columns)
//   height = 2 * HEX
//   vstep  = 1.5 * HEX            (vertical step between rows)
//   odd rows are shifted right by width/2

export function makeHexGrid(cols, rows, hex) {
  const HW = Math.sqrt(3) * hex;
  const VS = 1.5 * hex;
  const size = cols * rows;

  const idx = (c, r) => r * cols + c;
  const inBounds = (c, r) => c >= 0 && c < cols && r >= 0 && r < rows;

  // Fill the provided length-6 array of [c,r] pairs with neighbor coords.
  const neighbors = (c, r, out) => {
    const o = r & 1; // odd-r shift
    out[0][0] = c - 1;     out[0][1] = r;
    out[1][0] = c + 1;     out[1][1] = r;
    out[2][0] = c - 1 + o; out[2][1] = r - 1;
    out[3][0] = c + o;     out[3][1] = r - 1;
    out[4][0] = c - 1 + o; out[4][1] = r + 1;
    out[5][0] = c + o;     out[5][1] = r + 1;
    return out;
  };

  // Cell center in pixels (with small margin baked in).
  const centerOf = (c, r) => {
    const ox = (r & 1) ? HW / 2 : 0;
    return [c * HW + ox + HW / 2 + 2, r * VS + hex + 3];
  };

  // Inverse: pixel -> nearest cell (approximate, fine for a brush).
  const cellAt = (px, py) => {
    const r = Math.round((py - hex - 3) / VS);
    if (r < 0 || r >= rows) return [-1, -1];
    const ox = (r & 1) ? HW / 2 : 0;
    const c = Math.round((px - ox - HW / 2 - 2) / HW);
    if (c < 0 || c >= cols) return [-1, -1];
    return [c, r];
  };

  const corners = (cx, cy) => {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 2; // pointy-top
      pts.push([cx + hex * Math.cos(a), cy + hex * Math.sin(a)]);
    }
    return pts;
  };

  return { cols, rows, hex, HW, VS, size, idx, inBounds, neighbors, centerOf, cellAt, corners };
}
