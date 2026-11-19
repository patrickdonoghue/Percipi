// Shrinks the animated Sketchfab models for the web (run by hand when a source changes).
//   node scripts/optimize-models.mjs <path-to-gltf-transform-cli-folder>
// Reads the originals in assets-src/models/, keeps only the animations we use,
// drops textures we don't need, and writes small GLBs to public/models/.
// Needs @gltf-transform/core + cli (installed in a scratch folder, not in this project).
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';

const toolDir = process.argv[2];
if (!toolDir) throw new Error('pass the folder where @gltf-transform/cli is installed');
const require = createRequire(path.join(path.resolve(toolDir), 'package.json'));
const { NodeIO } = require('@gltf-transform/core');
const { ALL_EXTENSIONS } = require('@gltf-transform/extensions');
const { prune, dedup } = require('@gltf-transform/functions');
const cli = path.join(path.resolve(toolDir), 'node_modules/.bin/gltf-transform');

const MODELS = [
  { src: 'assets-src/models/bearded_man_-_low_poly_animated/scene.gltf', out: 'public/models/man.glb', keep: ['walk', 'idle'], texture: 512 },
  { src: 'assets-src/models/stylized_low_poly_german_shepherd/scene.gltf', out: 'public/models/dog.glb', keep: ['Idle1', 'IdleEarTwitch', 'WalkCycle'] },
];

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
for (const m of MODELS) {
  const doc = await io.read(m.src);
  const root = doc.getRoot();
  for (const a of root.listAnimations()) if (!m.keep.includes(a.getName())) a.dispose();
  for (const mat of root.listMaterials()) {
    mat.setNormalTexture(null);
    mat.setMetallicRoughnessTexture(null);
    mat.setMetallicFactor(0);
    mat.setRoughnessFactor(0.85);
  }
  await doc.transform(prune(), dedup());
  const tmp = m.out.replace('.glb', '.tmp.glb');
  await io.write(tmp, doc);
  if (m.texture) {
    execFileSync(cli, ['resize', tmp, tmp, '--width', String(m.texture), '--height', String(m.texture)], { stdio: 'inherit' });
  }
  // Drop redundant animation keyframes, then anything left unused.
  execFileSync(cli, ['resample', tmp, tmp], { stdio: 'inherit' });
  execFileSync(cli, ['prune', tmp, tmp], { stdio: 'inherit' });
  execFileSync('mv', [tmp, m.out]);
  console.log('wrote', m.out);
}
