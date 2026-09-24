import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { PetMood } from './pet-play';

const assets = new Map<string, Promise<ArrayBuffer>>();
function load(species: 'cat' | 'dog') {
  const url = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/models/pets/${species}.glb`;
  let promise = assets.get(url);
  if (!promise) {
    promise = fetch(url).then(response => { if (!response.ok) throw new Error('Pet model unavailable'); return response.arrayBuffer(); }).catch(error => { assets.delete(url); throw error; });
    assets.set(url, promise);
  }
  return promise.then(bytes => new GLTFLoader().parseAsync(bytes, `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/models/pets/`));
}

/** Cache downloads, but parse independent bindings: this asset includes a scaled skin root. */
export async function createPetModel(species: 'cat' | 'dog') {
  const asset = await load(species);
  const model = asset.scene;
  const root = new THREE.Group();
  const bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3());
  model.position.sub(new THREE.Vector3(center.x, bounds.min.y, center.z));
  root.add(model);
  root.scale.setScalar(2.05 / size.y);
  const materials: THREE.Material[] = [];
  const meshes: THREE.Mesh[] = [];
  model.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    meshes.push(object);
    object.castShadow = true;
    object.receiveShadow = true;
    object.frustumCulled = false;
    const originals = Array.isArray(object.material) ? object.material : [object.material];
    const copies = originals.map(original => {
      const mat = original;
      if (mat instanceof THREE.MeshStandardMaterial) {
        mat.metalness = 0;
        mat.roughness = Math.max(.72, mat.roughness);
        mat.envMapIntensity = .3;
      }
      materials.push(mat);
      return mat;
    });
    object.material = Array.isArray(object.material) ? copies : copies[0];
  });
  // Fine shell fur follows the actual skinned mesh and its existing coat map.
  // Restrict it to the cat's body: eyes and whiskers must stay crisp.
  if (species === 'cat') for (const mesh of meshes) {
    if (!(mesh instanceof THREE.SkinnedMesh) || Array.isArray(mesh.material) || mesh.material.name !== 'cat_diffuse') continue;
    for (let layer = 1; layer <= 5; layer++) {
      const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
      const fraction = layer / 5;
      mat.side = THREE.FrontSide;
      mat.onBeforeCompile = shader => {
        shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vFurUv;')
          .replace('#include <begin_vertex>', `#include <begin_vertex>\nvFurUv = uv; transformed += normal * ${size.y * .016 * fraction};`);
        shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vFurUv;')
          .replace('#include <alphatest_fragment>', `#include <alphatest_fragment>\nvec2 cell = vFurUv * 850.0; vec2 cellId = floor(cell); float strand = fract(sin(dot(cellId, vec2(127.1, 311.7))) * 43758.5453); if (strand < ${.32 + fraction * .58} || length(fract(cell) - .5) > ${.47 - fraction * .19}) discard;`);
      };
      mat.customProgramCacheKey = () => `pet-fur-${layer}`;
      materials.push(mat);
      const shell = new THREE.SkinnedMesh(mesh.geometry, mat);
      shell.position.copy(mesh.position); shell.quaternion.copy(mesh.quaternion); shell.scale.copy(mesh.scale);
      shell.bindMode = mesh.bindMode;
      shell.bind(mesh.skeleton, mesh.bindMatrix);
      shell.frustumCulled = false;
      mesh.parent!.add(shell);
    }
  }
  const mixer = new THREE.AnimationMixer(model);
  const actions = new Map(asset.animations.map(clip => [clip.name, mixer.clipAction(clip)]));
  const bones: { bone: THREE.Bone; position: THREE.Vector3; rotation: THREE.Quaternion }[] = [];
  model.traverse(object => { if (object instanceof THREE.Bone) bones.push({ bone: object, position: object.position.clone(), rotation: object.quaternion.clone() }); });
  let current: THREE.AnimationAction | undefined;
  let lastMood: PetMood | undefined;
  const find = (pattern: RegExp) => bones.find(({ bone }) => pattern.test(bone.name))?.bone;
  const head = find(species === 'cat' ? /Wolf_Neck_Top/ : /^head_jnt/);
  const legs = species === 'cat'
    ? [/Wolf_l_FrontLeg_Hip/, /Wolf_r_FrontLeg_Hip/, /Wolf_l_HindLeg_Hip/, /Wolf_r_HindLeg_Hip/].map(find)
    : [/^L_shoulder_jnt/, /^R_shoulder_jnt/, /^L_hip_jnt/, /^R_hip_jnt/].map(find);
  function update(mood: PetMood, time: number, dt: number, reduced: boolean) {
    const running = mood === 'walk' || mood === 'run';
    const clip = species === 'cat' ? 'Animation' : mood === 'sleep' ? 'play_dead' : mood === 'sit' ? 'sitting' : mood === 'wave' || mood === 'groom' ? 'shake' : mood === 'roll' ? 'rollover' : 'standing';
    const next = actions.get(clip);
    if (next && next !== current) {
      next.reset().play();
      if (current) current.crossFadeTo(next, reduced ? 0 : .25, false);
      current = next;
    }
    // Restore additive offsets before sampling, including bones absent from a clip.
    for (const {bone, position, rotation} of bones) { bone.position.copy(position); bone.quaternion.copy(rotation); }
    if (reduced || mood === 'sleep') {
      if (current) { current.paused = true; current.time = species === 'dog' ? (mood === 'sleep' ? 5 : 3) : 1; }
      mixer.update(0);
    } else { if (current) current.paused = false; mixer.update(dt); }
    // Save the sampled pose, so procedural offsets cannot accumulate.
    for (const entry of bones) { entry.position.copy(entry.bone.position); entry.rotation.copy(entry.bone.quaternion); }
    const t = reduced ? 0 : time;
    if (head && !running && mood !== 'roll') head.rotateZ(Math.sin(t * .65) * .025);
    if (running) legs.forEach((bone, index) => {
      if (bone) bone.rotateX(Math.sin(t * (mood === 'run' ? 13 : 8) + (index === 0 || index === 3 ? 0 : Math.PI)) * .42);
    });
    if (species === 'cat') {

      if (mood === 'wave' || mood === 'groom') legs[0]?.rotateX(-.85 + Math.sin(t * 5) * .12);
    }
    // Held pets tuck their paws; keep authored facial motion and tail animation.
    if (mood === 'held') legs.forEach(bone => bone?.rotateX(.2));
    root.position.y = reduced ? 0 : mood === 'jump' || mood === 'happy' ? Math.abs(Math.sin(t * 4)) * .3 : running ? Math.abs(Math.sin(t * 8)) * .035 : 0;
    root.rotation.x = mood === 'held' ? -.12 : 0;
    root.rotation.z = species === 'cat' && mood === 'sleep' ? Math.PI / 2 : species === 'cat' && mood === 'roll' && !reduced ? Math.sin(t * 2) * Math.PI : 0;
    root.position.x = species === 'cat' && mood === 'sleep' ? .85 : 0;
    if (species === 'cat' && mood === 'sleep') root.position.y = .44;
    if (species === 'cat' && mood === 'roll') {
      const angle = root.rotation.z;
      root.position.x = Math.sin(angle);
      root.position.y += Math.abs(Math.cos(angle)) + .44 * Math.abs(Math.sin(angle)) - Math.cos(angle);
    }
    if (mood !== lastMood && reduced) mixer.update(0);
    lastMood = mood;
  }
  function dispose() {
    mixer.stopAllAction(); mixer.uncacheRoot(model);
    const textures = new Set<THREE.Texture>();
    for (const mat of materials) { for (const value of Object.values(mat)) if (value instanceof THREE.Texture) textures.add(value); mat.dispose(); }
    textures.forEach(texture => { const image = texture.source.data; if (typeof ImageBitmap !== 'undefined' && image instanceof ImageBitmap) image.close(); texture.dispose(); });
    new Set(meshes.map(mesh => mesh.geometry)).forEach(geometry => geometry.dispose());
    model.traverse(object => { if (object instanceof THREE.SkinnedMesh) object.skeleton.dispose(); });
    root.removeFromParent();
  }
  return { root, update, dispose };
}
