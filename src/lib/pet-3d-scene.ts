import * as THREE from 'three';
import type { PetGameScene, PetMood } from './pet-play';
import { createPetModel } from './pet-model';

export type PetRenderState = { mood: PetMood; heading: number; game?: PetGameScene };

export async function createPetScene(canvas: HTMLCanvasElement, species: 'cat' | 'dog', gameMode: boolean, signal?: AbortSignal) {
  const pet = await createPetModel(species);
  if (signal?.aborted) { pet.dispose(); throw new DOMException('Cancelled', 'AbortError'); }
  let renderer: THREE.WebGLRenderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' }); }
  catch (error) { pet.dispose(); throw error; }
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-2.2, 2.2, 2.2, -2.2, .1, 40);
  camera.position.set(0, gameMode ? 5.5 : 2.5, gameMode ? 8 : 6);
  camera.lookAt(0, gameMode ? .5 : 1.05, 0);
  scene.add(new THREE.HemisphereLight(0xfff9ef, 0xb4a6a0, 1.8));
  const light = new THREE.DirectionalLight(0xffebd2, 2.5); light.position.set(-3, 7, 5); light.castShadow = true;
  light.shadow.mapSize.set(512, 512); light.shadow.camera.left = -6; light.shadow.camera.right = 6;
  light.shadow.camera.top = 6; light.shadow.camera.bottom = -6; light.shadow.normalBias = .04; scene.add(light);
  const rim = new THREE.DirectionalLight(0xcddfff, 1.25); rim.position.set(4, 3, -3); scene.add(rim);
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
  function geometry<T extends THREE.BufferGeometry>(value: T): T { geometries.add(value); return value; }
  function material(color: number, roughness = .8) { const value = new THREE.MeshStandardMaterial({ color, roughness }); materials.add(value); return value; }
  const cream = material(0xffebce);
  const sphere = geometry(new THREE.SphereGeometry(1, 24, 16));
  function ellipsoid(parent: THREE.Object3D, mat: THREE.Material, position: [number, number, number], scale: [number, number, number]) {
    const mesh = new THREE.Mesh(sphere, mat); mesh.position.set(...position); mesh.scale.set(...scale); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  const anchor = new THREE.Group(); scene.add(anchor); anchor.add(pet.root);
  const shadowMaterial = new THREE.ShadowMaterial({ opacity: .16 }); materials.add(shadowMaterial);
  const floor = new THREE.Mesh(geometry(new THREE.PlaneGeometry(30, 30)), shadowMaterial); floor.rotation.x = -Math.PI / 2; floor.position.y = .015; floor.receiveShadow = true; scene.add(floor);
  const scenery = new THREE.Group(); scene.add(scenery);
  const grass = material(0xb6ce9f), leaf = material(0x87ae7b), trunk = material(0x987451), lilac = material(0xc5b2d9), ballMaterial = material(0xe7c86f), starMaterial = material(0xffd76d, .4);
  const ground = new THREE.Mesh(geometry(new THREE.CylinderGeometry(4.8, 4.8, .2, 48)), grass); ground.scale.z = .62; ground.position.y = -.08; ground.receiveShadow = true; scenery.add(ground);
  const border = new THREE.Mesh(geometry(new THREE.TorusGeometry(4.65, .065, 6, 64)), cream); border.rotation.x = Math.PI / 2; border.scale.y = .62; border.position.y = .025; scenery.add(border);
  const trees = [17, 50, 83].map(percent => {
    const tree = new THREE.Group(); tree.position.set((percent / 100 - .5) * 9.6, 0, -.5); scenery.add(tree);
    const stem = new THREE.Mesh(geometry(new THREE.CylinderGeometry(.08, .12, .8, 8)), trunk); stem.position.y = .4; tree.add(stem);
    ellipsoid(tree, leaf, [0, 1.0, 0], [.52, .6, .5]); ellipsoid(tree, grass, [.17, 1.35, .03], [.34, .38, .33]); return tree;
  });
  for (const x of [-3.8, 3.8]) for (let i = 0; i < 3; i++) ellipsoid(scenery, i % 2 ? lilac : cream, [x + i * .09, .13, 1.15 + i * .2], [.13, .1, .13]);
  const ball = new THREE.Group(); scenery.add(ball); ellipsoid(ball, ballMaterial, [0, 0, 0], [.22, .22, .22]);
  const seam = new THREE.Mesh(geometry(new THREE.TorusGeometry(.22, .015, 5, 24)), cream); seam.rotation.x = .6; ball.add(seam);
  const shape = new THREE.Shape();
  for (let i = 0; i <= 10; i++) { const a = i * Math.PI / 5 + Math.PI / 2, radius = i % 2 ? .16 : .35; if (!i) shape.moveTo(Math.cos(a) * radius, Math.sin(a) * radius); else shape.lineTo(Math.cos(a) * radius, Math.sin(a) * radius); }
  const star = new THREE.Mesh(geometry(new THREE.ExtrudeGeometry(shape, { depth: .13, bevelEnabled: true, bevelSize: .035, bevelThickness: .035, bevelSegments: 2, steps: 1 })), starMaterial); scenery.add(star);
  scenery.visible = gameMode;
  let halfHeight = 2.2, lastMood: PetMood = 'idle', poseStart = 0, yaw = -.3;
  const smooth = (a: number, b: number, dt: number) => THREE.MathUtils.lerp(a, b, 1 - Math.exp(-dt * 12));
  function update(state: PetRenderState, time: number, dt: number, reduced: boolean) {
    const { game } = state;
    if (reduced) dt = 1;
    const mood = game?.moving ? 'run' : game?.complete ? 'happy' : state.mood;
    if (mood !== lastMood) { lastMood = mood; poseStart = time; }
    const t = reduced ? 0 : time - poseStart;
    pet.update(mood, t, dt, reduced);
    let heading = state.heading + (mood === 'spin' ? t * 2 : 0);
    if (game) {
      const targetX = (game.position / 100 - .5) * 9.6;
      if (Math.abs(anchor.position.x - targetX) > .1) heading = targetX > anchor.position.x ? 1.2 : -1.2;
      anchor.position.x = reduced ? targetX : smooth(anchor.position.x, targetX, dt * .3); anchor.scale.setScalar(.7);
      anchor.visible = game.game !== 'hide' || game.found;
      trees.forEach((tree, i) => { tree.visible = game.game === 'hide'; tree.scale.setScalar(game.searched.includes(i) ? .76 : 1); });
      ball.visible = game.game === 'fetch'; ball.position.set((game.target / 100 - .5) * 9.6, .26 + (game.moving && !reduced ? Math.abs(Math.sin(time * 7)) * .5 : 0), .3);
      star.visible = game.game === 'stars' && !game.complete;
      const top = game.score % 2 ? .22 : .44;
      star.position.set((game.target / 100 - .5) * 9.6, .5 + ((.5 - top) * 2 * halfHeight) / .848, 0);
      star.rotation.y = reduced ? .2 : time * 1.5;
    } else { anchor.scale.setScalar(1); anchor.visible = true; }
    let delta = (heading - yaw + Math.PI) % (Math.PI * 2); if (delta < 0) delta += Math.PI * 2; delta -= Math.PI;
    yaw += delta * (reduced ? 1 : 1 - Math.exp(-dt * 8)); anchor.rotation.y = yaw;
    renderer.render(scene, camera);
  }
  function resize(width: number, height: number) {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5)); renderer.setSize(width, height, false);
    const aspect = width / Math.max(1, height), halfWidth = gameMode ? 4.8 : 1.8;
    halfHeight = halfWidth / aspect; camera.left = -halfWidth; camera.right = halfWidth; camera.top = halfHeight; camera.bottom = -halfHeight; camera.updateProjectionMatrix();
  }
  function dispose() { pet.dispose(); geometries.forEach(item => item.dispose()); materials.forEach(item => item.dispose()); light.shadow.map?.dispose(); renderer.dispose(); renderer.forceContextLoss(); }
  return { update, resize, dispose };
}
