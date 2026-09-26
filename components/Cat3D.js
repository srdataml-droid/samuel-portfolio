'use client';

import { useEffect, useRef } from 'react';

/**
 * The meadow cat, in 3D.
 *
 * The painted 2D cat stays on the page as the "brain": it is made invisible
 * but keeps walking the path, taking clicks and strokes, and computing where
 * it is looking. Each frame this component reads that state (position,
 * facing, mood classes, eased gaze) and poses a rigged 3D cat to match, then
 * adds behaviour a flat painting cannot do: turning round in 3D, a head that
 * swivels toward you, a tail that flows segment by segment, blinks, ear
 * flicks, breathing, yawns and a meow when tapped.
 *
 * Model: "Toon Cat FREE" by Omabuarts Studio, CC BY 4.0, recoloured to the
 * site cat (see scripts/recolor-3d-cat.mjs and lib/catMaterial.js).
 * Loaded only when the meadow scrolls into view; falls back to the painted
 * cat when WebGL is unavailable or motion is reduced or paused.
 */
export default function Cat3D({ root, onReady }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const host = root.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    let disposed = false;
    let cleanup = () => {};
    const io = new IntersectionObserver(async ([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      try {
        cleanup = await start(host, canvas, () => disposed);
        if (!disposed) onReady?.(true);
      } catch (error) {
        console.warn('3D cat unavailable, keeping the painted cat.', error);
        onReady?.(false);
      }
    }, { rootMargin: '200px' });
    io.observe(canvas);
    return () => { disposed = true; io.disconnect(); cleanup(); onReady?.(false); };
  }, [root, onReady]);

  return <canvas ref={canvasRef} className="cat3d-canvas" aria-hidden="true" />;
}

async function start(host, canvas, isDisposed) {
  const THREE = await import('three');
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
  const { makeCatMaterial } = await import('@/lib/catMaterial');
  if (isDisposed()) return () => {};

  const stage = canvas.parentElement;
  const traveller = stage.querySelector('.meadow-traveller');
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // Orthographic camera in CSS pixels (y up), so the cat can be placed exactly where the painted cat is.
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(0, 1, 1, 0, -5000, 5000);
  camera.position.z = 1000;
  scene.add(new THREE.HemisphereLight(0xffffff, 0xc9ceb0, 1.15));
  const sun = new THREE.DirectionalLight(0xfff4e2, 1.35); // the painting's low sun, upper right: warm but not tinting
  sun.position.set(0.7, 0.8, 0.6);
  scene.add(sun);

  const [gltf, palette] = await Promise.all([
    new GLTFLoader().loadAsync('/cat/3d/toon-cat.glb'),
    new THREE.TextureLoader().loadAsync('/cat/3d/palette.png'),
  ]);
  if (isDisposed()) { renderer.dispose(); return () => {}; }
  palette.flipY = false;
  palette.colorSpace = THREE.SRGBColorSpace;
  palette.magFilter = THREE.NearestFilter;

  // Normalise: longest side 1, paws at y 0, centred. The model faces +z.
  const model = gltf.scene;
  const raw = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
  model.scale.setScalar(1 / Math.max(raw.x, raw.y, raw.z));
  const box = new THREE.Box3().setFromObject(model);
  const centre = box.getCenter(new THREE.Vector3());
  model.position.set(-centre.x, -box.min.y, -centre.z);
  let meshSize = 1;
  model.traverse((o) => {
    if (!o.isMesh) return;
    o.geometry.computeBoundingBox();
    const s = o.geometry.boundingBox.getSize(new THREE.Vector3());
    meshSize = Math.max(s.x, s.y, s.z);
  });
  const material = makeCatMaterial(THREE, palette, meshSize);
  model.traverse((o) => { if (o.isMesh) { o.material = material; o.frustumCulled = false; } });

  const yawGroup = new THREE.Group(); yawGroup.add(model);
  const tiltGroup = new THREE.Group(); tiltGroup.add(yawGroup);
  tiltGroup.rotation.x = 0.2; // seen from slightly above, like the painting
  scene.add(tiltGroup);

  const bone = (name) => model.getObjectByName(name);
  const B = {
    neck: bone('neck_017'), head: bone('head_018'), mouth: bone('mouth_021'),
    earL: bone('earL_019'), earR: bone('earR_020'), eyeL: bone('eyeL_022'), eyeR: bone('eyeR_023'),
    spine: bone('spine01_012'),
    tail: ['tail_07', 'tail01_08', 'tail02_09', 'tail03_010', 'tailend_011'].map(bone),
    foot: bone('footFL_016'),
  };
  const bones = []; model.traverse((o) => { if (o.isBone) bones.push(o); });

  const mixer = new THREE.AnimationMixer(model);
  const clip = gltf.animations[0];
  const walk = mixer.clipAction(clip);
  walk.play();

  // A standing pose: the average of every pose in the walk cycle (legs come to rest under the body).
  const sums = new Map(bones.map((b) => [b, new THREE.Vector4()]));
  const SAMPLES = 24;
  for (let i = 0; i < SAMPLES; i++) {
    mixer.setTime((i / SAMPLES) * clip.duration);
    for (const b of bones) {
      const q = b.quaternion; const s = sums.get(b);
      const sign = s.lengthSq() > 0 && (s.x * q.x + s.y * q.y + s.z * q.z + s.w * q.w) < 0 ? -1 : 1;
      s.add(new THREE.Vector4(q.x * sign, q.y * sign, q.z * sign, q.w * sign));
    }
  }
  const stand = new Map(bones.map((b) => { const s = sums.get(b).normalize(); return [b, new THREE.Quaternion(s.x, s.y, s.z, s.w)]; }));

  // How fast a planted paw sweeps backwards in model units per second: the walk's ground speed.
  let groundSpeed = 0.35;
  {
    const parent = model.parent; parent.remove(model); model.updateMatrixWorld(true);
    const pos = []; const dt = clip.duration / 60; const v = new THREE.Vector3();
    for (let i = 0; i <= 60; i++) { mixer.setTime(i * dt); model.updateMatrixWorld(true); B.foot.getWorldPosition(v); pos.push(v.clone()); }
    const minY = Math.min(...pos.map((p) => p.y));
    const speeds = [];
    for (let i = 1; i < pos.length; i++) if (pos[i].y < minY + 0.012) speeds.push(Math.abs(pos[i].z - pos[i - 1].z) / dt);
    speeds.sort((a, b) => a - b);
    if (speeds.length) groundSpeed = speeds[Math.floor(speeds.length / 2)];
    parent.add(model);
  }


  // ---- per-frame state ----
  const ease = (current, target, dt, tau) => current + (target - current) * (1 - Math.exp(-dt / tau));
  const rand = (a, b) => a + Math.random() * (b - a);
  let yaw = 1.1, walkW = 0, lastX = null, speed = 0;
  let headYaw = 0, headPitch = 0, mouth = 0, eyes = 1, earBack = 0, spineDip = 0, tailLift = 0;
  let nextBlink = rand(2, 5), blinkT = -1;
  const flick = { L: { next: rand(3, 8), t: -1 }, R: { next: rand(4, 9), t: -1 } };
  let nextYawn = rand(25, 45), yawnT = -1, meowT = -1, wasWaving = false, idleFor = 0;
  let clock = 0, frame = 0, last = performance.now(), size = { w: 0, h: 0 };

  const resize = () => {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (w === size.w && h === size.h) return;
    size = { w, h };
    renderer.setSize(w, h, false);
    camera.left = 0; camera.right = w; camera.top = h; camera.bottom = 0; camera.updateProjectionMatrix();
  };

  const tick = (now) => {
    frame = requestAnimationFrame(tick);
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    const cls = host.classList;
    const paused = document.documentElement.dataset.motion === 'paused' || cls.contains('cat-still');
    if (paused || document.hidden || host.dataset.inView === 'false') return;
    clock += dt;
    resize();

    // Where the (invisible) painted cat is: follow it exactly.
    const sr = stage.getBoundingClientRect(), tr = traveller.getBoundingClientRect();
    const x = tr.left - sr.left + tr.width * 0.5;
    const pawY = size.h - (tr.top - sr.top + tr.height * 0.908);
    const scale = tr.width * 0.92;
    tiltGroup.position.set(x, pawY, 0);
    tiltGroup.scale.setScalar(scale);
    if (lastX !== null && dt > 0) speed = ease(speed, Math.abs(x - lastX) / dt, dt, 0.08);
    lastX = x;

    const walking = cls.contains('cat-walk');
    const facingLeft = cls.contains('cat-facing-left');
    const purring = cls.contains('cat-purr');
    const alert = cls.contains('cat-alert');
    const stretching = cls.contains('cat-stretch');
    const waving = cls.contains('cat-wave');
    const slowBlink = cls.contains('cat-slowblink');

    // Body facing: near-profile while walking, turned a little toward you while standing.
    // Turning round passes through facing the viewer, a real 3D turn.
    const targetYaw = (facingLeft ? -1 : 1) * (walking ? 1.32 : 1.02);
    yaw = ease(yaw, targetYaw, dt, walking ? 0.18 : 0.35);
    yawGroup.rotation.y = yaw;

    // Walk cycle: blend in while travelling; paws keep pace with the ground (no skating).
    walkW = ease(walkW, walking ? 1 : 0, dt, 0.15);
    walk.timeScale = walking ? Math.max(0.2, speed / Math.max(1, groundSpeed * scale)) : 0;
    mixer.update(dt);
    for (const b of bones) { const walkPose = b.quaternion.clone(); b.quaternion.copy(stand.get(b)).slerp(walkPose, walkW); }

    // ---- head: looks where the painted cat's eased gaze points (pointer, or idle glances) ----
    const ex = parseFloat(host.style.getPropertyValue('--eye-x')) || 0;
    const ey = parseFloat(host.style.getPropertyValue('--eye-y')) || 0;
    const lookYaw = Math.atan2(ex * 1.0, 0.8) - yaw;               // 0 when the pointer is at its face: looks at you
    const reach = walking ? 0.55 : 1;
    headYaw = ease(headYaw, Math.max(-1.2, Math.min(1.2, lookYaw)) * reach, dt, 0.12);
    headPitch = ease(headPitch, ey * 0.45 * reach, dt, 0.12);

    // ---- moods ----
    idleFor = walking || waving || purring || stretching ? 0 : idleFor + dt;
    if (yawnT < 0 && !walking && !purring && idleFor > 8 && clock > nextYawn) { yawnT = 0; nextYawn = clock + rand(30, 55); }
    if (stretching && yawnT < 0) yawnT = 0;
    if (waving && !wasWaving) meowT = 0;
    wasWaving = waving;

    let mouthT = 0, eyesT = 1, earT = alert ? -0.14 : 0, dipT = 0, liftT = alert ? 0.1 : 0, pitchExtra = 0, rollExtra = 0;
    if (purring) { eyesT = 0.22; earT = 0.45; liftT = 0.28; rollExtra = 0.12; }
    if (yawnT >= 0) {
      yawnT += dt;
      const p = yawnT < 0.9 ? yawnT / 0.9 : yawnT < 1.7 ? 1 : Math.max(0, 1 - (yawnT - 1.7) / 0.8);
      mouthT = 0.7 * p; eyesT = Math.min(eyesT, 1 - 0.9 * p); earT = Math.max(earT, 0.4 * p); pitchExtra = -0.35 * p;
      dipT = stretching ? 0.16 * p : 0; liftT = Math.max(liftT, 0.25 * p);
      if (yawnT > 2.5) yawnT = -1;
    }
    if (meowT >= 0) {
      meowT += dt;
      const a = Math.max(0, Math.sin(Math.min(meowT / 0.35, 1) * Math.PI)) * 0.3;
      const b = meowT > 0.45 ? Math.max(0, Math.sin(Math.min((meowT - 0.45) / 0.5, 1) * Math.PI)) * 0.45 : 0;
      mouthT = Math.max(mouthT, a, b); rollExtra = 0.18 * Math.min(1, meowT * 3); eyesT = Math.min(eyesT, 0.85);
      if (meowT > 1.1) meowT = -1;
    }
    // Blinks: quick and random; slow and deliberate when someone lingers.
    if (blinkT < 0 && clock > nextBlink) { blinkT = 0; nextBlink = clock + rand(2.5, 6.5); }
    if (blinkT >= 0) { blinkT += dt; eyesT = Math.min(eyesT, blinkT < 0.06 ? 1 - blinkT / 0.06 : Math.min(1, (blinkT - 0.06) / 0.1)); if (blinkT > 0.16) blinkT = -1; }
    if (slowBlink) eyesT = Math.min(eyesT, 0.12);

    mouth = ease(mouth, mouthT, dt, 0.08);
    eyes = ease(eyes, eyesT, dt, slowBlink ? 0.25 : 0.03);
    earBack = ease(earBack, earT, dt, 0.15);
    spineDip = ease(spineDip, dipT, dt, 0.3);
    tailLift = ease(tailLift, liftT, dt, 0.4);

    // ---- apply on top of the pose ----
    const breath = Math.sin(clock * Math.PI * 2 / (purring ? 2.2 : 4.4)) * 0.018;
    B.spine.rotateX(spineDip + breath);
    B.neck.rotateY(headYaw * 0.35); B.neck.rotateZ(headPitch * 0.3);
    B.head.rotateY(headYaw * 0.65); B.head.rotateZ(headPitch * 0.7 + pitchExtra); B.head.rotateX(rollExtra);
    B.mouth.rotateX(mouth);
    const eyeScale = Math.max(0.1, eyes);
    B.eyeL.scale.set(1, eyeScale, 1); B.eyeR.scale.set(1, eyeScale, 1);
    for (const [side, earBone] of [['L', B.earL], ['R', B.earR]]) {
      const f = flick[side];
      if (f.t < 0 && clock > f.next) { f.t = 0; f.next = clock + rand(4, 10); }
      let twitch = 0;
      if (f.t >= 0) { f.t += dt; twitch = Math.sin(Math.min(f.t / 0.22, 1) * Math.PI) * 0.4; if (f.t > 0.22) f.t = -1; }
      earBone.rotateX(earBack + twitch);
    }
    // Tail: a wave that travels from base to tip. Lazy when idle, counterbalancing when walking,
    // a nervous tip-twitch when alert, raised and slow when purring.
    const period = alert ? 0.5 : walking ? clip.duration / Math.max(walk.timeScale, 0.2) : purring ? 4 : 3.2;
    const amp = alert ? 0.1 : walking ? 0.1 : purring ? 0.07 : 0.15;
    B.tail.forEach((t, i) => {
      const tipBoost = alert && i >= 3 ? 3.2 : 1;
      t.rotateY(Math.sin(clock * Math.PI * 2 / period - i * 0.7) * amp * tipBoost);
      t.rotateX(i === 0 ? tailLift : i >= 3 ? tailLift * 0.6 : 0);
    });

    renderer.render(scene, camera);
  };
  frame = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(frame);
    mixer.stopAllAction();
    renderer.dispose();
    material.dispose();
    palette.dispose();
  };
}
