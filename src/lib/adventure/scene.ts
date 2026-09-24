import * as THREE from 'three';
import { createPetModel } from '../pet-model';
import { BED, COINS, COUNTER, DOCK, GATE, ISLAND, PLATE, ROOM, SNACK, SWITCH, WALLS, gateOpen, isDocked, type Game, type Point, type Species } from './game';

export type View = { resize: (w: number, h: number) => void; render: (state: Game, dt: number, reduced: boolean) => void; pick: (x: number, y: number, elevated: boolean) => Point | null; dispose: () => void };
export async function createScene(canvas: HTMLCanvasElement, zh: boolean, mapOnly: boolean, signal: AbortSignal): Promise<View> {
  if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
  if (mapOnly) return createMap(canvas, zh);
  const context = canvas.getContext('webgl2', { alpha: false, antialias: true });
  if (!context) return createMap(canvas, zh);
  const renderer = new THREE.WebGLRenderer({ canvas, context, antialias: true });
  renderer.setClearColor(0xf4e9d8); renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-8, 8, 6, -6, .1, 80);
  camera.position.set(7, 18, 17); camera.lookAt(7, 0, 4.8);
  const resources: { dispose: () => void }[] = [];
  const own = <T extends { dispose: () => void }>(value: T): T => { resources.push(value); return value; };
  scene.add(new THREE.HemisphereLight(0xfff5df, 0xa7b4c1, 2.3));
  const sun = new THREE.DirectionalLight(0xffe8c0, 3.3); sun.position.set(-4, 14, 5); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14 }); sun.shadow.normalBias = .04; scene.add(sun);
  const mat = (color: number) => own(new THREE.MeshStandardMaterial({ color, roughness: .82 }));
  const mint = mat(0x547c72), cream = mat(0xf5ebd9), wood = mat(0xd4a976), dark = mat(0x324853), white = mat(0xfffaf1), peach = mat(0xe7956d), brass = mat(0xcba363), blue = mat(0x759cab);
  function box(x: number, y: number, z: number, w: number, h: number, d: number, material: THREE.Material, parent: THREE.Object3D = scene) {
    const mesh = new THREE.Mesh(own(new THREE.BoxGeometry(w, h, d)), material); mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  function cylinder(x: number, y: number, z: number, radius: number, height: number, material: THREE.Material, parent: THREE.Object3D = scene) {
    const mesh = new THREE.Mesh(own(new THREE.CylinderGeometry(radius, radius, height, 24)), material); mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  function label(text: string, x: number, y: number, z: number, width = 1.7) {
    const c = document.createElement('canvas'); c.width = 384; c.height = 96;
    const ctx = c.getContext('2d')!; ctx.fillStyle = '#fffcf3ee'; ctx.beginPath(); ctx.roundRect(2, 2, 380, 92, 34); ctx.fill();
    ctx.fillStyle = '#35514c'; ctx.font = '600 34px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 192, 49);
    const texture = own(new THREE.CanvasTexture(c)); texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(own(new THREE.SpriteMaterial({ map: texture, depthTest: false }))); sprite.position.set(x, y, z); sprite.scale.set(width, width / 4, 1); sprite.renderOrder = 9; scene.add(sprite); return sprite;
  }
  const tile = document.createElement('canvas'); tile.width = tile.height = 128; const tc = tile.getContext('2d')!;
  tc.fillStyle = '#e4d7bf'; tc.fillRect(0, 0, 128, 128); tc.fillStyle = '#f1e7d3'; tc.fillRect(1, 1, 62, 62); tc.fillRect(65, 65, 62, 62); tc.fillStyle = '#ded5c3'; tc.fillRect(65, 1, 62, 62); tc.fillRect(1, 65, 62, 62);
  const tileTexture = own(new THREE.CanvasTexture(tile)); tileTexture.colorSpace = THREE.SRGBColorSpace; tileTexture.wrapS = tileTexture.wrapT = THREE.RepeatWrapping; tileTexture.repeat.set(7, 5);
  const floor = new THREE.Mesh(own(new THREE.PlaneGeometry(14, 10)), own(new THREE.MeshStandardMaterial({ map: tileTexture, roughness: 1 }))); floor.rotation.x = -Math.PI / 2; floor.position.set(7, -.02, 5); floor.receiveShadow = true; scene.add(floor);
  box(7, -.20, 5, 14.25, .3, 10.25, wood);
  box(7, .8, .25, 14, 1.6, .22, cream); box(.25, .5, 5, .2, 1, 9.7, cream);
  // Shallow cabinets leave a clear, readable playable counter above them.
  for (let x = 1.2; x < 8.4; x += 1.15) {
    box(x, .47, 1.38, 1.1, .94, 1.6, mint); box(x, .56, 2.19, .86, .62, .035, mint); box(x, .76, 2.24, .32, .045, .065, brass);
  }
  box(4.55, 1.02, 1.38, 8, .12, 1.74, wood);
  box(1.45, 1.095, 1.25, .95, .025, .8, dark); cylinder(1.45, 1.13, 1.25, .3, .04, white);
  box(2.5, 1.1, .85, .08, .4, .08, brass); box(2.67, 1.3, .85, .35, .06, .08, brass);
  box(9.35, .98, 1.25, 1.18, 1.96, 1.45, blue); box(9.35, 1.12, 2, 1.08, .035, .035, cream); box(9.8, 1.5, 2.03, .055, .42, .055, brass);
  box(ISLAND.x + ISLAND.w / 2, .46, ISLAND.z + ISLAND.h / 2, ISLAND.w, .92, ISLAND.h, mint);
  box(6.3, .98, 4.775, 2.05, .12, 1.6, wood); cylinder(6.3, 1.1, 4.7, .3, .12, cream); cylinder(6.3, 1.19, 4.7, .15, .08, peach);
  // Pantry half-walls and a gate whose glowing strip matches the pressure pad.
  for (const wall of WALLS) box(wall.x + wall.w / 2, .45, wall.z + wall.h / 2, wall.w, .9, wall.h, cream);
  const door = new THREE.Group(); scene.add(door);
  for (let z = 5.25; z < 6.9; z += .25) box(10.45, .45, z, .065, .9, .055, mint, door);
  box(10.45, .87, 6.05, .07, .08, 1.75, wood, door);
  const plateMat = mat(0xe2ae61); const plate = cylinder(PLATE.x, .025, PLATE.z, .62, .06, plateMat);
  const plateLabel = label(zh ? '狗狗留在这里' : 'Dog: stay here', PLATE.x, .75, PLATE.z + .65, 2);
  label(zh ? '储藏间' : 'Pantry', 12.1, 1.3, .6, 1.6);
  const dockMat = own(new THREE.MeshBasicMaterial({ color: 0xe9ac45, transparent: true, opacity: .55, side: THREE.DoubleSide }));
  const dock = new THREE.Mesh(own(new THREE.RingGeometry(.48, .56, 40)), dockMat); dock.rotation.x = -Math.PI / 2; dock.position.set(DOCK.x, .04, DOCK.z); scene.add(dock);
  label(zh ? '凳子停这里' : 'Stool goes here', DOCK.x, .5, DOCK.z, 1.7);
  const stool = new THREE.Group(); scene.add(stool);
  cylinder(0, .59, 0, .43, .13, peach, stool);
  for (const x of [-.27, .27]) for (const z of [-.27, .27]) { box(x, .28, z, .08, .55, .08, wood, stool); cylinder(x, .07, z, .1, .12, dark, stool); }
  const switchMat = mat(0xe4ae65); box(SWITCH.x, 1.17, SWITCH.z, .5, .24, .42, dark); cylinder(SWITCH.x, 1.32, SWITCH.z, .15, .08, switchMat);
  label(zh ? '猫咪按电源' : 'Cat: power on', SWITCH.x, 1.9, SWITCH.z, 1.9);
  const snack = new THREE.Group(); scene.add(snack); snack.position.set(SNACK.x, .02, SNACK.z);
  cylinder(0, .34, 0, .3, .58, peach, snack); cylinder(0, .66, 0, .34, .08, cream, snack);
  for (let i = 0; i < 5; i++) { const c = cylinder(Math.cos(i) * .14, .72, Math.sin(i) * .14, .095, .035, wood, snack); c.rotation.z = .2; }
  const snackLabel = label(zh ? '秘密零食罐' : 'The treat jar', SNACK.x, 1.25, SNACK.z, 1.8);
  const bed = cylinder(BED.x, .1, BED.z, 1.15, .2, mint); bed.scale.z = .78;
  const cushion = cylinder(BED.x, .22, BED.z, .91, .1, cream); cushion.scale.z = .78;
  label(zh ? '带零食一起回家' : 'Both pets return here', BED.x, .85, 9.35, 2.5);
  const coins = COINS.map(p => { const mesh = cylinder(p.x, .45, p.z, .16, .06, brass); mesh.rotation.x = Math.PI / 2; return mesh; });
  const robot = new THREE.Group(); scene.add(robot); cylinder(0, .16, 0, .37, .26, dark, robot); cylinder(0, .3, 0, .32, .035, blue, robot); box(0, .24, .35, .28, .045, .04, white, robot);
  const coneShape = new THREE.Shape(); coneShape.moveTo(0, 0); for (let i = -12; i <= 12; i++) { const a = i / 12 * .87; coneShape.lineTo(Math.sin(a) * 2.7, -Math.cos(a) * 2.7); } coneShape.closePath();
  const coneMat = own(new THREE.MeshBasicMaterial({ color: 0xeeb84b, transparent: true, opacity: .18, side: THREE.DoubleSide, depthWrite: false }));
  const cone = new THREE.Mesh(own(new THREE.ShapeGeometry(coneShape)), coneMat); cone.rotation.x = -Math.PI / 2; cone.position.y = .035; robot.add(cone);
  const ringMat = own(new THREE.MeshBasicMaterial({ color: 0x61bda1, side: THREE.DoubleSide, transparent: true, opacity: .9 }));
  const ring = new THREE.Mesh(own(new THREE.RingGeometry(.45, .5, 40)), ringMat); ring.rotation.x = -Math.PI / 2; scene.add(ring);
  const actors = { cat: new THREE.Group(), dog: new THREE.Group() }; scene.add(actors.cat, actors.dog);
  const petModels: Partial<Record<Species, Awaited<ReturnType<typeof createPetModel>>>> = {};
  let disposed = false;
  const previous = { cat: { x: -10, z: -10 }, dog: { x: -10, z: -10 } };
  const modelLoads = (['cat', 'dog'] as const).map(async species => {
    try {
      const model = await createPetModel(species);
      if (disposed || signal.aborted) { model.dispose(); return; }
      petModels[species] = model; const scale = new THREE.Group(); scale.scale.setScalar(.4); scale.add(model.root); actors[species].add(scale);
    } catch {
      if (disposed || signal.aborted) return;
      const texture = own(new THREE.TextureLoader().load(`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/models/pets/${species}.webp`)); texture.colorSpace = THREE.SRGBColorSpace;
      const portrait = new THREE.Sprite(own(new THREE.SpriteMaterial({ map: texture }))); portrait.scale.set(1.05, 1.05, 1); portrait.position.y = .55; actors[species].add(portrait);
    }
  });
  // Scenery can render and input stays responsive while the two actors arrive.
  void Promise.allSettled(modelLoads);
  const raycaster = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
  function resize(w: number, h: number) {
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5)); renderer.setSize(w, h, false);
    const aspect = w / Math.max(h, 1), halfWidth = Math.max(7.6, 5.8 * aspect), halfHeight = halfWidth / aspect;
    camera.left = -halfWidth; camera.right = halfWidth; camera.top = halfHeight; camera.bottom = -halfHeight; camera.updateProjectionMatrix();
  }
  return {
    resize,
    render(s, dt, reduced) {
      stool.position.set(s.stool.x, 0, s.stool.z); door.position.y = gateOpen(s) ? -.95 : 0;
      plateMat.color.setHex(gateOpen(s) ? 0x73bea0 : 0xe2ae61); switchMat.color.setHex(s.powered ? 0x73bea0 : 0xe4ae65);
      plateLabel.visible = s.powered && !s.snack; dockMat.opacity = isDocked(s) || s.powered ? .14 : .65;
      snack.visible = !s.snack; snackLabel.visible = !s.snack;
      coins.forEach((mesh, i) => { mesh.visible = !s.coins[i]; mesh.position.y = .4 + (reduced ? 0 : Math.sin(s.elapsed * 2 + i) * .08); mesh.rotation.z = reduced ? 0 : s.elapsed; });
      robot.position.set(s.robot.x, 0, s.robot.z); robot.rotation.y = s.robot.heading; cone.visible = s.powered; coneMat.color.setHex(s.alert > 40 ? 0xe36d55 : 0xeeb84b);
      for (const species of ['cat', 'dog'] as const) {
        const p = s.pets[species], moving = Math.hypot(p.x - previous[species].x, p.z - previous[species].z) > .002;
        const actor = actors[species]; actor.position.set(p.x, p.y, p.z); actor.rotation.y = p.heading;
        petModels[species]?.update(s.won ? 'happy' : moving ? 'walk' : 'idle', s.elapsed, dt, reduced);
        previous[species] = { x: p.x, z: p.z };
      }
      const p = s.pets[s.active]; ring.position.set(p.x, p.y + .04, p.z); renderer.render(scene, camera);
    },
    pick(x, y, elevated) {
      raycaster.setFromCamera(new THREE.Vector2(x * 2 - 1, 1 - y * 2), camera); plane.constant = elevated ? -1.1 : 0;
      return raycaster.ray.intersectPlane(plane, hit) ? { x: hit.x, z: hit.z } : null;
    },
    dispose() { disposed = true; Object.values(petModels).forEach(p => p.dispose()); resources.forEach(r => r.dispose()); sun.shadow.map?.dispose(); renderer.dispose(); renderer.forceContextLoss(); },
  };
}

/** A playable low-power map, also available when WebGL is unavailable. */
function createMap(canvas: HTMLCanvasElement, zh: boolean): View {
  const context = canvas.getContext('2d'); if (!context) throw new Error('Canvas unavailable');
  const ctx: CanvasRenderingContext2D = context;
  let width = 1, height = 1, unit = 1, left = 0, top = 0;
  const imgs = { cat: new Image(), dog: new Image() };
  for (const species of ['cat', 'dog'] as const) imgs[species].src = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/models/pets/${species}.webp`;
  const rect = (r: { x: number; z: number; w: number; h: number }, color: string) => { ctx.fillStyle = color; ctx.fillRect(left + r.x * unit, top + r.z * unit, r.w * unit, r.h * unit); };
  function circle(p: Point, radius: number, color: string) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(left + p.x * unit, top + p.z * unit, radius * unit, 0, Math.PI * 2); ctx.fill(); }
  function text(value: string, p: Point) { ctx.fillStyle = '#284e43'; ctx.font = `600 ${Math.max(9, unit * .28)}px system-ui`; ctx.textAlign = 'center'; ctx.fillText(value, left + p.x * unit, top + p.z * unit); }
  return {
    resize(w, h) { width = w; height = h; canvas.width = w * Math.min(devicePixelRatio, 2); canvas.height = h * Math.min(devicePixelRatio, 2); ctx.setTransform(canvas.width / w, 0, 0, canvas.height / h, 0, 0); unit = Math.min(w / 15, h / 11); left = (w - ROOM.w * unit) / 2; top = (h - ROOM.h * unit) / 2; },
    render(s) {
      ctx.clearRect(0, 0, width, height); ctx.fillStyle = '#f4e9d8'; ctx.fillRect(0, 0, width, height);
      rect({ x: 0, z: 0, w: 14, h: 10 }, '#e5dac2');
      for (const r of [COUNTER, ISLAND, { x: 8.76, z: .525, w: 1.18, h: 1.45 }, ...WALLS]) rect(r, '#648b7e');
      if (!gateOpen(s)) rect(GATE, '#c17e5c');
      circle(BED, 1.1, '#a7cbb9'); circle(DOCK, .55, isDocked(s) ? '#9ac4af' : '#e7b966'); circle(PLATE, .6, gateOpen(s) ? '#69b491' : '#d5ad63');
      circle(s.stool, .43, '#c78366'); circle(SWITCH, .24, s.powered ? '#4aab7b' : '#e4b556');
      if (!s.snack) { circle(SNACK, .35, '#dc9760'); text('🍪', SNACK); }
      COINS.forEach((p, i) => { if (!s.coins[i]) circle(p, .17, '#eab949'); });
      if (s.powered) { ctx.fillStyle = '#ecb24744'; ctx.beginPath(); ctx.moveTo(left + s.robot.x * unit, top + s.robot.z * unit); ctx.arc(left + s.robot.x * unit, top + s.robot.z * unit, 2.7 * unit, Math.PI / 2 - s.robot.heading - .87, Math.PI / 2 - s.robot.heading + .87); ctx.closePath(); ctx.fill(); }
      circle(s.robot, .37, '#415668');
      text(zh ? '电源' : 'Power', { ...SWITCH, z: .85 }); text(zh ? '门垫' : 'Pad', { ...PLATE, z: PLATE.z + 1 }); text(zh ? '回家' : 'Home', { x: 1.7, z: 9.65 });
      for (const species of ['cat', 'dog'] as const) {
        const p = s.pets[species]; if (s.active === species) circle(p, .55, '#68b49d66');
        const img = imgs[species]; if (img.complete && img.naturalWidth) ctx.drawImage(img, left + (p.x - .5) * unit, top + (p.z - .8) * unit, unit, unit); else text(species === 'cat' ? '🐈' : '🐕', p);
      }
    },
    pick(x, y) { return { x: (x * width - left) / unit, z: (y * height - top) / unit }; },
    dispose() {},
  };
}
