import * as THREE from 'three';
import type { PetGameScene, PetMood } from './pet-play';

export type PetRenderState = { mood: PetMood; heading: number; game?: PetGameScene };

export function createPetScene(canvas: HTMLCanvasElement, species: 'cat' | 'dog', gameMode: boolean) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-2.2, 2.2, 2.2, -2.2, .1, 40);
  camera.position.set(0, gameMode ? 5.5 : 3, gameMode ? 8 : 6);
  camera.lookAt(0, gameMode ? .5 : 1.2, 0);
  scene.add(new THREE.HemisphereLight(0xfff9ef, 0xb4a6a0, 1.8));
  const light = new THREE.DirectionalLight(0xffebd2, 2.5); light.position.set(-3, 7, 5); light.castShadow = true;
  light.shadow.mapSize.set(512, 512); light.shadow.camera.left = -6; light.shadow.camera.right = 6;
  light.shadow.camera.top = 6; light.shadow.camera.bottom = -6; light.shadow.normalBias = .04; scene.add(light);
  const rim = new THREE.DirectionalLight(0xcddfff, 1.25); rim.position.set(4, 3, -3); scene.add(rim);
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
  function geometry<T extends THREE.BufferGeometry>(value: T): T { geometries.add(value); return value; }
  function material(color: number, roughness = .8) { const value = new THREE.MeshStandardMaterial({ color, roughness }); materials.add(value); return value; }
  const fur = material(species === 'cat' ? 0xe9a653 : 0xcf965c), cream = material(0xffebce), dark = material(0x382824, .35), pink = material(0xe994a0), brown = material(0x986138), white = material(0xffffff, .25), collar = material(0x71a7a0), gold = material(0xefc65d, .35);
  // A small, deterministic coat texture adds fine fur grain without thousands of hairs.
  const textures: THREE.Texture[] = [];
  function coatTexture(striped:boolean) {
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;
    const context=canvas.getContext('2d')!;
    context.fillStyle=species==='cat'?'#d5a06b':'#bd9065';context.fillRect(0,0,512,512);
    let seed=37;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<18000;i++){
      const x=random()*512,y=random()*512;
      context.strokeStyle=random()>.5?'rgba(255,240,210,.17)':'rgba(87,54,30,.12)';
      context.lineWidth=.6;context.beginPath();context.moveTo(x,y);context.lineTo(x+1+random()*2,y+3+random()*6);context.stroke();
    }
    if(striped)for(let i=0;i<9;i++){
      context.strokeStyle='rgba(93,55,27,.32)';context.lineWidth=9+i%3*3;context.lineCap='round';context.beginPath();
      const x=i*64;context.moveTo(x-12,140);context.bezierCurveTo(x+25,220,x-12,285,x+10,365);context.stroke();
    }
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;textures.push(texture);return texture;
  }
  fur.color.set(0xffffff);fur.map=coatTexture(false);fur.bumpMap=fur.map;fur.bumpScale=.018;
  const coat=fur.clone();materials.add(coat);coat.map=coatTexture(species==='cat');coat.bumpMap=coat.map;
  const iris=material(species==='cat'?0x9ba965:0x875931,.32);
  const sphere = geometry(new THREE.SphereGeometry(1, 24, 16));
  function ellipsoid(parent: THREE.Object3D, mat: THREE.Material, position: [number, number, number], scale: [number, number, number]) {
    const mesh = new THREE.Mesh(sphere, mat); mesh.position.set(...position); mesh.scale.set(...scale); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  const anchor = new THREE.Group(), rig = new THREE.Group(), torso = new THREE.Group(); scene.add(anchor); anchor.add(rig); rig.add(torso);
  ellipsoid(torso, coat, [0, .98, -.21], [.51, .55, .94]);
  ellipsoid(torso, cream, [0, 1.06, .53], [.35, .42, .12]);
  const head = new THREE.Group(); head.position.set(0, 1.54, .66); head.scale.setScalar(species==='cat'?.88:.91); torso.add(head);
  ellipsoid(head, fur, [0, 0, 0], [.62, .55, .56]);
  for(const side of [-1,1])ellipsoid(head, cream, [side*.16, -.23, .48], [.24, .19, species==='cat'?.2:.31]);
  ellipsoid(head, species==='cat'?pink:dark, [0, -.17, species==='cat'?.68:.82], [.09, .055, .06]);
  const eyes = [-1, 1].map(side => {
    const eye = ellipsoid(head, dark, [side * .265, .04, .54], [.085, .115, .045]);
    ellipsoid(eye, iris, [0,0,.68],[.82,.86,.6]);
    ellipsoid(eye,dark,[0,0,1.13],[species==='cat'?.24:.52,.73,.2]);
    ellipsoid(eye, white, [.23, .3, 1.28], [.23, .22, .12]);
    return eye;
  });
  const ears:THREE.Object3D[]=[];
  for (const side of [-1, 1]) {
    if (species === 'cat') {
      const ear = new THREE.Mesh(geometry(new THREE.ConeGeometry(.24, .6, 3)), fur); ear.position.set(side * .47, .56, -.02); ear.rotation.z = side * -.15; head.add(ear); ears.push(ear);
      const inner = new THREE.Mesh(geometry(new THREE.ConeGeometry(.14, .36, 3)), pink); inner.position.set(side * .47, .59, .12); inner.rotation.z = side * -.15; head.add(inner);
      for (let i = 0; i < 2; i++) {
        const whisker = new THREE.Mesh(geometry(new THREE.CylinderGeometry(.012, .012, .4, 5)), cream); whisker.rotation.z = side * (1.35 + i * .35); whisker.position.set(side * .57, -.23 - i * .075, .52); head.add(whisker);
      }
    } else {
      const ear = ellipsoid(head, brown, [side * .65, -.09, -.03], [.22, .57, .25]); ear.rotation.z = side * .18; ears.push(ear);
    }
  }
  if(species==='cat') {
    for(const x of [-.17,0,.17]){
      const stripe=new THREE.Mesh(geometry(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(x,.43,.34),new THREE.Vector3(x*.8,.32,.46),new THREE.Vector3(x*.7,.21,.52)]),8,.025,5,false)),brown);head.add(stripe);
    }
  }
  const mouth = new THREE.Mesh(geometry(new THREE.TorusGeometry(.12, .012, 5, 16, Math.PI)), brown); mouth.rotation.z = Math.PI; mouth.position.set(0, -.3, species==='cat'?.66:.77); head.add(mouth);
  const band = new THREE.Mesh(geometry(new THREE.TorusGeometry(.37, .06, 8, 28)), collar); band.rotation.x = Math.PI / 2; band.position.set(0, 1.22, .5); torso.add(band);
  ellipsoid(torso, gold, [0, 1.12, .82], [.095, .105, .025]);
  const legs: THREE.Group[] = [];
  for (const z of [.43, -.58]) for (const x of [-.39, .39]) {
    const leg = new THREE.Group(); leg.position.set(x, .75, z); rig.add(leg);
    ellipsoid(leg, fur, [0, -.25, 0], [.16, .35, .19]); ellipsoid(leg, cream, [0, -.56, .07], [.19, .14, .26]); for(const toe of [-.1,0,.1])ellipsoid(leg,cream,[toe,-.57,.25],[.065,.095,.1]); legs.push(leg);
  }
  const tail = new THREE.Group(); tail.position.set(0, 1.03, -.8); torso.add(tail);
  const tailCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(.13, .25, -.35), new THREE.Vector3(.24, .7, -.5), new THREE.Vector3(.17, .87, -.38)]);
  const tailMesh = new THREE.Mesh(geometry(new THREE.TubeGeometry(tailCurve, 16, species === 'cat' ? .115 : .16, 8, false)), fur); tailMesh.castShadow = true; tail.add(tailMesh);
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
    const held=mood==='held';
    const t = reduced ? .55 : time - poseStart, running = mood === 'run' || mood === 'walk', sleep = mood === 'sleep', sitting = mood === 'sit' || mood === 'wave' || mood === 'groom';
    const phase = t * (mood === 'run' ? 15 : 9), jump = mood === 'jump' || mood === 'happy', roll = mood === 'roll';
    rig.position.y = smooth(rig.position.y, held ? .2 : sleep ? -.4 : roll ? .08 : sitting ? -.19 : jump ? Math.abs(Math.sin(t * 4)) * .65 : running ? Math.abs(Math.sin(phase)) * .065 : 0, dt);
    rig.rotation.z = smooth(rig.rotation.z, roll ? Math.sin(t * 2) * Math.PI : sleep ? .12 : 0, dt);
    if (roll) { rig.position.y = 1.2 - Math.cos(rig.rotation.z) * 1.2; rig.position.x = Math.sin(rig.rotation.z) * 1.2; } else rig.position.x = smooth(rig.position.x, 0, dt);
    rig.rotation.x = smooth(rig.rotation.x, held ? -.12 : sleep ? -.18 : 0, dt);
    torso.rotation.x = smooth(torso.rotation.x, sitting ? -.22 : 0, dt);
    torso.scale.y = smooth(torso.scale.y, sleep ? .75 : 1 + (!reduced ? Math.sin(t * 2) * .012 : 0), dt);
    head.rotation.x = smooth(head.rotation.x, sleep ? .3 : mood === 'groom' ? .3 + Math.sin(t * 5) * .08 : running ? -.08 : 0, dt);
    head.rotation.z = smooth(head.rotation.z, mood === 'wave' ? -.14 : !reduced && !running ? Math.sin(t * 1.4) * .045 : 0, dt);
    legs.forEach((leg, i) => {
      let angle = running ? Math.sin(phase + (i === 0 || i === 3 ? 0 : Math.PI)) * .65 : held ? .22+Math.sin(t*3+i)*.08 : sleep ? -1.2 : sitting && i >= 2 ? -1.1 : 0;
      if ((mood === 'wave' || mood === 'groom') && i === 0) angle = -1.7 + Math.sin(t * 6) * .25;
      leg.rotation.x = smooth(leg.rotation.x, angle, dt);
      leg.rotation.z = smooth(leg.rotation.z, mood === 'wave' && i === 0 ? -.5 : 0, dt);
    });
    head.rotation.y=smooth(head.rotation.y,!reduced&&!running&&!sleep?Math.sin(t*.65)*.13:0,dt);
    ears.forEach((ear,i)=>{ear.rotation.x=!reduced ? (running?Math.sin(phase)*.1:Math.pow(Math.max(0,Math.sin(t*.8+i)),18)*.13):0;});
    const blink = !reduced && Math.sin(time * 1.1) > .994;
    eyes.forEach(eye => { eye.scale.y = sleep || blink ? .018 : .115; });
    tail.rotation.z = sleep || reduced ? .1 : Math.sin(t * (mood === 'happy' || mood === 'play' ? 10 : 4)) * .35;
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
  function dispose() { textures.forEach(item=>item.dispose()); geometries.forEach(item => item.dispose()); materials.forEach(item => item.dispose()); light.shadow.map?.dispose(); renderer.dispose(); renderer.forceContextLoss(); }
  return { update, resize, dispose };
}
