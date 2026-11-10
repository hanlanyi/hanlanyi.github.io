// One-off generator for static/data/land.json: an even grid of points that fall on land,
// used to draw the dotted globe on the About page.
// Source: Natural Earth 110m land (public domain). Usage:
//   node scripts/make-land-dots.mjs path/to/ne_110m_land.geojson
import fs from 'node:fs';

const STEP = 2; // degrees between rows
const geo = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const polygons = geo.features.flatMap((f) => (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates));
const boxes = polygons.map((rings) => {
  const xs = rings[0].map((p) => p[0]), ys = rings[0].map((p) => p[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
});

const inRing = (x, y, ring) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
const onLand = (x, y) => polygons.some((rings, k) => {
  const b = boxes[k];
  if (x < b[0] || y < b[1] || x > b[2] || y > b[3]) return false;
  return inRing(x, y, rings[0]) && !rings.slice(1).some((hole) => inRing(x, y, hole));
});

const dots = [];
for (let lat = -88; lat <= 88; lat += STEP) {
  // fewer points per row near the poles, so spacing on the sphere stays even
  const n = Math.max(1, Math.round((360 / STEP) * Math.cos((lat * Math.PI) / 180)));
  for (let i = 0; i < n; i++) {
    const lon = -180 + (360 * (i + 0.5)) / n;
    if (onLand(lon, lat)) dots.push(Math.round(lon * 10) / 10, lat);
  }
}
fs.mkdirSync(new URL('../static/data/', import.meta.url), { recursive: true });
fs.writeFileSync(new URL('../static/data/land.json', import.meta.url), JSON.stringify(dots));
console.log(`${dots.length / 2} land dots`);
