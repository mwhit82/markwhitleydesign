import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Run against a production preview or published site: SITE_URL=https://... node scripts/test-workspace.mjs
const base = process.env.SITE_URL || 'http://localhost:3002';
const page = async path => {
  const response = await fetch(new URL(path, base));
  assert.equal(response.status, 200, path);
  return response.text();
};
for (const [path, destination] of Object.entries({
  '/work': '/?view=design', '/playground': '/?view=games',
  '/photography': '/?view=photography', '/contact': '/?profile=open', '/about': '/?profile=open',
})) {
  const response = await fetch(new URL(path, base), { redirect: 'manual' });
  assert.equal(response.status, 308, path);
  assert.equal(response.headers.get('location'), destination, path);
}
console.log('✓ Legacy listing and contact routes redirect to the shared homepage');
const design = await page('/');
assert.match(design, /Selected design/);
assert.doesNotMatch(design, /Illustrative wireframe|Concept illustration/);
assert.equal((design.match(/class="interfaceMockup"/g) || []).length, 12, 'Every Design card has reference-style artwork');
assert.match(design, /<a[^>]*href="\/\?view=design"[^>]*>Mark Whitley<\/a>/, 'Name returns to Design');
assert.equal((design.match(/data-build-card=/g) || []).length, 12);
const projectLinks = [...new Set([...design.matchAll(/href="(\/work\/[^"?]+)"/g)].map(match => match[1]))];
assert.equal(projectLinks.length, 11);
for (const path of projectLinks) {
  const html = await page(path);
  assert.match(html, /<h1/, path);
}
console.log('✓ All 12 design cards and 11 internal project routes remain available');
const games = await page('/?view=games');
assert.match(games, /<title>Games \| Mark Whitley<\/title>/);
assert.equal((games.match(/data-build-card=/g) || []).length, 5);
for (const path of [...new Set([...games.matchAll(/href="(\/playground\/[^"?]+)"/g)].map(match => match[1]))]) {
  const html = await page(path);
  if (path.endsWith('/pocket-racers-vr')) assert.match(html, /Meta Quest — Coming soon/);
  else assert.doesNotMatch(html, /aria-label="Main navigation"/, path);
}
console.log('✓ Game destinations, full-screen shells and Pocket Racers fallback work');
const photos = await page('/?view=photography');
const manifest = JSON.parse(await readFile(new URL('../data/photography-generated.json', import.meta.url)));
assert.equal((photos.match(/data-build-card=/g) || []).length, Math.min(24, manifest.photos.length));
assert.match(photos, /<title>Photography \| Mark Whitley<\/title>/);
assert.match(photos, /property="og:image"/);
assert.match(photos, /rel="canonical" href="https:\/\/markwhitley.design\/\?view=photography"/);
assert.match(photos, /type="image\/avif"/);
assert.match(photos, /Focal length:/);
assert.doesNotMatch(photos, /original photography coming soon/);
for (const asset of ['/icon.svg', '/favicon.ico', '/apple-icon.png', '/brand/claude.svg', '/brand/codex.svg']) {
  assert.equal((await fetch(new URL(asset, base))).status, 200, asset);
}
console.log('✓ Photography metadata, responsive variants, camera labels and brand assets are available');
