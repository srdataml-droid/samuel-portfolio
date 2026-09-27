'use client';

import { useEffect, useRef } from 'react';

/**
 * The 3D cat, drawn over a painted cat that stays on the page as its "brain".
 *
 * The painted cat is made invisible but keeps doing its job: it takes clicks
 * and strokes, walks the meadow path, runs the daily routine and carries the
 * mood classes (walk, sit, sleep, purr, alert, slow blink, wave). Each frame
 * this component reads that state and poses a rigged 3D cat to match, adding
 * what a flat painting cannot do: turning round in 3D, a head that turns to
 * look at you, sitting down, a tail that flows segment by segment, blinks,
 * ear flicks, breathing, yawns and a meow.
 *
 * mode="meadow": follows the painted cat along the meadow path.
 * mode="perch":  the sidebar cat, sitting in its box.
 *
 * Model: "Toon Cat FREE" by Omabuarts Studio, CC BY 4.0, recoloured to the
 * site cat (scripts/recolor-3d-cat.mjs, lib/catMaterial.js). Loads only when
 * its cat is on screen; reduced motion, Pause or no WebGL keep the painting.
 */
export default function Cat3D({ root, onReady, mode = 'meadow' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const host = root.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    let disposed = false;
    let cleanup = () => {};
    let delay = 0;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      // The sidebar is on screen from the first paint: let the page finish loading first.
      delay = window.setTimeout(async () => {
        try {
          cleanup = await start(host, canvas, mode, () => disposed);
          if (!disposed) onReady?.(true);
        } catch (error) {
          console.warn('3D cat unavailable, keeping the painted cat.', error);
          onReady?.(false);
        }
      }, mode === 'perch' ? 1200 : 0);
    }, { rootMargin: '200px' });
    io.observe(canvas);
    return () => { disposed = true; io.disconnect(); clearTimeout(delay); cleanup(); onReady?.(false); };
  }, [root, onReady, mode]);

  return <canvas ref={canvasRef} className={`cat3d-canvas cat3d-${mode}`} aria-hidden="true" />;
}

// Bone offsets (radians, local X/Y/Z) from the standing pose to a sitting pose: body pitched
// nose-up, rear legs folded under the haunch, front legs straight, head levelled, tail tucked round.
const SIT = {
  root_01: [-0.7, 0, 0],
  thighBL_03: [-1.4, 0, 0], thighBR_026: [-1.4, 0, 0],
  legupperBL_04: [1.4, 0, 0], legupperBR_027: [1.4, 0, 0],
  leglowerBL_05: [0.2, 0, 0], leglowerBR_028: [0.2, 0, 0],
  legupperFL_014: [1.0, 0, 0], legupperFR_024: [1.0, 0, 0],
  leglowerFL_015: [-0.15, 0, 0], leglowerFR_00: [-0.15, 0, 0],
  neck_017: [0.5, 0, 0],
  tail_07: [0.6, 0, 0], tail01_08: [0, 0, 0.35], tail02_09: [0, 0, 0.35], tail03_010: [0, 0, 0.35], tailend_011: [0, 0, 0.35],
};

// Lying asleep: chest lowered, rear legs folded under, front paws stretched forward,
// chin resting low, tail wrapped round the far side.
const SLEEP = {
  root_01: [0.15, 0, 0],
  thighBL_03: [-1.0, 0, 0], thighBR_026: [-1.0, 0, 0],
  legupperBL_04: [2.0, 0, 0], legupperBR_027: [2.0, 0, 0],
  leglowerBL_05: [-0.4, 0, 0], leglowerBR_028: [-0.4, 0, 0],
  legupperFL_014: [-1.4, 0, 0], legupperFR_024: [-1.4, 0, 0],
  leglowerFL_015: [0.3, 0, 0], leglowerFR_00: [0.3, 0, 0],
  neck_017: [0.8, 0, 0],
  tail_07: [-1.2, 0, 0], tail01_08: [0, 0, 0.45], tail02_09: [0, 0, 0.45], tail03_010: [0, 0, 0.45], tailend_011: [0, 0, 0.45],
};

async function start(host, canvas, mode, isDisposed) {
  const THREE = await import('three');
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
  const { makeCatMaterial } = await import('@/lib/catMaterial');
  if (isDisposed()) return () => {};

  const perch = mode === 'perch';
  const stage = perch ? canvas : canvas.parentElement;
  const traveller = perch ? null : stage.querySelector('.meadow-traveller');
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // Orthographic camera in CSS pixels (y up), so the cat can be placed exactly where the painted cat is.
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(0, 1, 1, 0, -5000, 5000);
  camera.position.z = 1000;
  scene.add(new THREE.HemisphereLight(0xffffff, 0xc9ceb0, 1.15));
  const sun = new THREE.DirectionalLight(0xfff4e2, 1.35); // the painting's low sun, upper right
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

  // Normalise: longest side 1, centred. The model faces +z.
  const model = gltf.scene;
  const raw = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
  model.scale.setScalar(1 / Math.max(raw.x, raw.y, raw.z));
  const box0 = new THREE.Box3().setFromObject(model);
  const centre0 = box0.getCenter(new THREE.Vector3());
  model.position.set(-centre0.x, 0, -centre0.z);
  let meshSize = 1;
  model.traverse((o) => {
    if (!o.isMesh) return;
    o.geometry.computeBoundingBox();
    const s = o.geometry.boundingBox.getSize(new THREE.Vector3());
    meshSize = Math.max(s.x, s.y, s.z);
  });
  const material = makeCatMaterial(THREE, palette, meshSize);
  model.traverse((o) => { if (o.isMesh) { o.material = material; o.frustumCulled = false; } });

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

  // Standing pose: the average of every pose in the walk cycle (legs come to rest under the body).
  const sums = new Map(bones.map((b) => [b, new THREE.Vector4()]));
  for (let i = 0; i < 24; i++) {
    mixer.setTime((i / 24) * clip.duration);
    for (const b of bones) {
      const q = b.quaternion; const s = sums.get(b);
      const sign = s.lengthSq() > 0 && (s.x * q.x + s.y * q.y + s.z * q.z + s.w * q.w) < 0 ? -1 : 1;
      s.add(new THREE.Vector4(q.x * sign, q.y * sign, q.z * sign, q.w * sign));
    }
  }
  const stand = new Map(bones.map((b) => { const s = sums.get(b).normalize(); return [b, new THREE.Quaternion(s.x, s.y, s.z, s.w)]; }));

  // Sitting pose, and where the ground and the middle of the cat are in each pose.
  const sit = new Map();
  const measure = (poseMap) => {
    for (const b of bones) b.quaternion.copy(poseMap.get(b));
    model.updateMatrixWorld(true);
    return new THREE.Box3().expandByObject(model, true); // precise: skinned vertices
  };
  const derive = (offsets) => {
    const out = new Map();
    for (const b of bones) b.quaternion.copy(stand.get(b));
    for (const [name, [x, y, z]] of Object.entries(offsets)) { const b = bone(name); if (b) { b.rotateX(x); b.rotateY(y); b.rotateZ(z); } }
    for (const b of bones) out.set(b, b.quaternion.clone());
    return out;
  };
  for (const [b, q] of derive(SIT)) sit.set(b, q);
  const sleep = derive(SLEEP);
  const standBox = measure(stand);
  const sitBox = measure(sit);
  const sleepBox = measure(sleep);
  const sitHeight = sitBox.max.y - sitBox.min.y;
  const sitCentre = sitBox.getCenter(new THREE.Vector3());
  const sleepCentre = sleepBox.getCenter(new THREE.Vector3());

  // How fast a planted paw sweeps backwards in model units per second: the walk's ground speed.
  let groundSpeed = 0.35;
  {
    const pos = []; const dt = clip.duration / 60; const v = new THREE.Vector3();
    for (let i = 0; i <= 60; i++) { mixer.setTime(i * dt); model.updateMatrixWorld(true); B.foot.getWorldPosition(v); pos.push(v.clone()); }
    const minY = Math.min(...pos.map((p) => p.y));
    const speeds = [];
    for (let i = 1; i < pos.length; i++) if (pos[i].y < minY + 0.012) speeds.push(Math.abs(pos[i].z - pos[i - 1].z) / dt);
    speeds.sort((a, b) => a - b);
    if (speeds.length) groundSpeed = speeds[Math.floor(speeds.length / 2)];
  }

  const yawGroup = new THREE.Group(); yawGroup.add(model);
  const tiltGroup = new THREE.Group(); tiltGroup.add(yawGroup);
  tiltGroup.rotation.x = 0.2; // seen from slightly above, like the paintings
  scene.add(tiltGroup);

  // ---- helpers ----
  const ease = (current, target, dt, tau) => current + (target - current) * (1 - Math.exp(-dt / tau));
  const rand = (a, b) => a + Math.random() * (b - a);
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const tmpQ = new THREE.Quaternion(), parentQ = new THREE.Quaternion(), tiltQ = new THREE.Quaternion();
  const axis = new THREE.Vector3(), headPos = new THREE.Vector3(), target = new THREE.Vector3();
  // Rotate a bone about an axis given in the tilt group's frame (up = y), whatever pose it is in.
  const turnBone = (b, ax, angle) => {
    if (!angle) return;
    tiltGroup.getWorldQuaternion(tiltQ);
    axis.copy(ax).applyQuaternion(tiltQ).normalize();
    b.parent.getWorldQuaternion(parentQ);
    tmpQ.setFromAxisAngle(axis, angle);
    const local = parentQ.clone().invert().multiply(tmpQ).multiply(parentQ);
    b.quaternion.premultiply(local);
    b.updateMatrixWorld(true);
  };
  const UP = new THREE.Vector3(0, 1, 0);

  // Pointer: the head aims at it for real. With no recent pointer, the painted cat's
  // eased idle glances (--eye-x / --eye-y) steer it instead.
  const pointer = { x: 0, y: 0, at: -1e9 };
  const onMove = (e) => { if (e.pointerType !== 'touch') { pointer.x = e.clientX; pointer.y = e.clientY; pointer.at = performance.now(); } };
  window.addEventListener('pointermove', onMove, { passive: true });

  // ---- per-frame state ----
  let yaw = perch ? 0.75 : 1.1, walkW = 0, sitW = perch ? 1 : 0, sleepW = 0, lastX = null, speed = 0;
  let lookYaw = 0, lookPitch = 0, mouth = 0, eyes = 1, earBack = 0, spineDip = 0, tailLift = 0, roll = 0;
  let nextBlink = rand(2, 5), blinkT = -1;
  const flick = { L: { next: rand(3, 8), t: -1 }, R: { next: rand(4, 9), t: -1 } };
  let nextYawn = rand(25, 45), yawnT = -1, meowT = -1, wasWaving = false, wasSleeping = false, idleFor = 0;
  let clock = 0, frame = 0, last = performance.now(), size = { w: 0, h: 0 }, sinceDraw = 0;

  const resize = () => {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h || (w === size.w && h === size.h)) return;
    size = { w, h };
    renderer.setSize(w, h, false);
    camera.left = 0; camera.right = w; camera.top = h; camera.bottom = 0; camera.updateProjectionMatrix();
  };

  const tick = (now) => {
    frame = requestAnimationFrame(tick);
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    const cls = host.classList;
    const paused = document.documentElement.dataset.motion === 'paused' || cls.contains('cat-still');
    const sleeping = cls.contains('cat-sleep');
    if (paused || document.hidden || host.dataset.inView === 'false') return;
    // The sidebar cat only sits, and a sleeping cat only breathes: fewer frames are plenty
    // and kinder to batteries.
    sinceDraw += dt;
    const settledAsleep = sleeping && sleepW > 0.98;
    if ((perch && sinceDraw < 1 / 30) || (settledAsleep && sinceDraw < 1 / 15)) return;
    const step = perch || settledAsleep ? sinceDraw : dt;
    sinceDraw = 0;
    clock += step;
    resize();
    if (!size.w) return;

    const walking = cls.contains('cat-walk');
    const sitting = perch || cls.contains('cat-sit');
    const facingLeft = cls.contains('cat-facing-left');
    const purring = cls.contains('cat-purr');
    const alert = cls.contains('cat-alert');
    const stretching = cls.contains('cat-stretch');
    const waving = cls.contains('cat-wave');
    const slowBlink = cls.contains('cat-slowblink');

    // ---- where the cat is and how big ----
    sitW = ease(sitW, sitting && !walking && !sleeping ? 1 : 0, step, 0.28);
    sleepW = ease(sleepW, sleeping ? 1 : 0, step, sleeping ? 0.7 : 0.35); // lies down slowly, gets up quicker
    let scale, x, groundY;
    if (perch) {
      scale = (size.h * 0.9) / sitHeight;
      x = size.w * 0.5; groundY = size.h * 0.04;
    } else {
      const sr = stage.getBoundingClientRect(), tr = traveller.getBoundingClientRect();
      x = tr.left - sr.left + tr.width * 0.5;
      groundY = size.h - (tr.top - sr.top + tr.height * 0.908);
      scale = tr.width * 0.92;
      if (lastX !== null && step > 0) speed = ease(speed, Math.abs(x - lastX) / step, step, 0.08);
      lastX = x;
    }
    tiltGroup.position.set(x, groundY, 0);
    tiltGroup.scale.setScalar(scale);
    // Keep the paws on the ground in every pose; centre the sitting cat in its box.
    const upY = standBox.min.y + (sitBox.min.y - standBox.min.y) * sitW;
    model.position.y = -(upY + (sleepBox.min.y - upY) * sleepW);
    const upZ = (perch ? sitCentre.z : 0) * sitW;
    model.position.z = -centre0.z - (upZ + ((perch ? sleepCentre.z : 0) - upZ) * sleepW);

    // ---- body facing: near-profile when walking, turned toward you when standing or sitting ----
    const targetYaw = perch ? 0.75 : (facingLeft ? -1 : 1) * (walking ? 1.32 : sitting ? 0.8 : 1.02);
    yaw = ease(yaw, targetYaw, step, walking ? 0.18 : 0.35);
    yawGroup.rotation.y = yaw;

    // ---- pose: stand <-> walk (the model's own cycle, re-timed to the real speed) <-> sit ----
    walkW = ease(walkW, walking ? 1 : 0, step, 0.15);
    walk.timeScale = walking ? Math.max(0.2, speed / Math.max(1, groundSpeed * scale)) : 0;
    mixer.update(step);
    for (const b of bones) {
      const walkPose = b.quaternion.clone();
      b.quaternion.copy(stand.get(b)).slerp(walkPose, walkW);
      if (sitW > 0.001) b.quaternion.slerp(sit.get(b), sitW);
      if (sleepW > 0.001) b.quaternion.slerp(sleep.get(b), sleepW);
    }
    model.updateMatrixWorld(true);

    // ---- moods ----
    idleFor = walking || waving || purring || stretching ? 0 : idleFor + step;
    if (yawnT < 0 && !walking && !purring && !sleeping && idleFor > 8 && clock > nextYawn) { yawnT = 0; nextYawn = clock + rand(30, 60); }
    if (stretching && yawnT < 0) yawnT = 0;
    if (wasSleeping && !sleeping) yawnT = 0; // waking up: a big yawn
    wasSleeping = sleeping;
    if (waving && !wasWaving) meowT = 0;
    wasWaving = waving;

    let mouthT = 0, eyesT = 1, earT = alert ? -0.14 : 0, dipT = 0, liftT = alert ? 0.1 : 0, pitchExtra = 0, rollT = 0;
    if (purring) { eyesT = 0.22; earT = 0.45; liftT = 0.28; rollT = 0.18; }
    if (sleeping) { eyesT = 0.08; earT = 0.3; liftT = 0; rollT = 0.1; }
    if (yawnT >= 0) {
      yawnT += step;
      const p = yawnT < 0.9 ? yawnT / 0.9 : yawnT < 1.7 ? 1 : Math.max(0, 1 - (yawnT - 1.7) / 0.8);
      mouthT = 0.7 * p; eyesT = Math.min(eyesT, 1 - 0.9 * p); earT = Math.max(earT, 0.4 * p); pitchExtra = 0.4 * p;
      dipT = stretching && !sitting ? 0.16 * p : 0; liftT = Math.max(liftT, 0.25 * p);
      if (yawnT > 2.5) yawnT = -1;
    }
    if (meowT >= 0) {
      meowT += step;
      const a = Math.max(0, Math.sin(Math.min(meowT / 0.35, 1) * Math.PI)) * 0.3;
      const b = meowT > 0.45 ? Math.max(0, Math.sin(Math.min((meowT - 0.45) / 0.5, 1) * Math.PI)) * 0.45 : 0;
      mouthT = Math.max(mouthT, a, b); rollT = 0.22 * Math.min(1, meowT * 3); eyesT = Math.min(eyesT, 0.85);
      if (meowT > 1.1) meowT = -1;
    }
    if (!sleeping && blinkT < 0 && clock > nextBlink) { blinkT = 0; nextBlink = clock + rand(2.5, 6.5); }
    if (blinkT >= 0) { blinkT += step; eyesT = Math.min(eyesT, blinkT < 0.06 ? 1 - blinkT / 0.06 : Math.min(1, (blinkT - 0.06) / 0.1)); if (blinkT > 0.16) blinkT = -1; }
    if (slowBlink) eyesT = Math.min(eyesT, 0.12);

    mouth = ease(mouth, mouthT, step, 0.08);
    eyes = ease(eyes, eyesT, step, slowBlink ? 0.25 : 0.03);
    earBack = ease(earBack, earT, step, 0.15);
    spineDip = ease(spineDip, dipT, step, 0.3);
    tailLift = ease(tailLift, liftT, step, 0.4);
    roll = ease(roll, rollT, step, 0.2);

    // ---- gaze: aim the head at the pointer (or at the idle glance), in world space ----
    B.head.getWorldPosition(headPos);
    const pointerFresh = performance.now() - pointer.at < 2500;
    if (pointerFresh) {
      const r = stage.getBoundingClientRect();
      target.set(pointer.x - r.left, size.h - (pointer.y - r.top), headPos.z + scale * 1.2);
    } else {
      const ex = parseFloat(host.style.getPropertyValue('--eye-x')) || 0;
      const ey = parseFloat(host.style.getPropertyValue('--eye-y')) || 0;
      target.set(headPos.x + ex * scale, headPos.y - ey * scale * 0.6, headPos.z + scale * 0.8);
    }
    const local = tiltGroup.worldToLocal(target.clone()).sub(tiltGroup.worldToLocal(headPos.clone()));
    const wantYaw = wrap(Math.atan2(local.x, local.z) - yaw);
    const wantPitch = Math.atan2(local.y, Math.hypot(local.x, local.z));
    const reach = (walking ? 0.5 : 1) * (1 - sleepW);
    lookYaw = ease(lookYaw, Math.max(-1.2, Math.min(1.2, wantYaw)) * reach, step, 0.12);
    lookPitch = ease(lookPitch, Math.max(-0.45, Math.min(0.55, wantPitch)) * reach, step, 0.12);
    const faceYaw = yaw + lookYaw;
    const right = new THREE.Vector3(Math.cos(faceYaw), 0, -Math.sin(faceYaw));
    const forward = new THREE.Vector3(Math.sin(faceYaw), 0, Math.cos(faceYaw));
    turnBone(B.neck, UP, lookYaw * 0.35);
    turnBone(B.neck, right, -(lookPitch * 0.3));
    turnBone(B.head, UP, lookYaw * 0.65);
    turnBone(B.head, right, -(lookPitch * 0.7 + pitchExtra));
    turnBone(B.head, forward, roll);

    // ---- the rest of the body, on top of the pose ----
    const breath = Math.sin(clock * Math.PI * 2 / (sleeping ? 5.5 : purring ? 2.2 : 4.4)) * (sleeping ? 0.03 : 0.018);
    B.spine.rotateX(spineDip + breath);
    B.mouth.rotateX(mouth);
    const eyeScale = Math.max(0.1, eyes);
    B.eyeL.scale.set(1, eyeScale, 1); B.eyeR.scale.set(1, eyeScale, 1);
    for (const [side, earBone] of [['L', B.earL], ['R', B.earR]]) {
      const f = flick[side];
      if (f.t < 0 && clock > f.next) { f.t = 0; f.next = clock + rand(4, 10); }
      let twitch = 0;
      if (f.t >= 0) { f.t += step; twitch = Math.sin(Math.min(f.t / 0.22, 1) * Math.PI) * 0.4; if (f.t > 0.22) f.t = -1; }
      earBone.rotateX(earBack + twitch);
    }
    // Tail: a wave travelling from base to tip. Lazy standing, counterbalancing walking, a flicking
    // tip when sitting, a nervous twitch when alert, raised and slow when purring.
    const period = alert ? 0.5 : walking ? clip.duration / Math.max(walk.timeScale, 0.2) : purring ? 4 : sitting ? 2.6 : 3.2;
    const amp = alert ? 0.1 : walking ? 0.1 : purring ? 0.07 : 0.15;
    const dreamTwitch = sleeping ? Math.max(0, Math.sin(clock * 0.9) - 0.93) * 6 : 1; // an occasional flick of the tail tip
    B.tail.forEach((t, i) => {
      const sitTip = sleeping ? (i >= 3 ? dreamTwitch : 0) : sitting ? (i >= 3 ? 1.4 : 0.35) : 1; // sitting cats keep the tail still and flick the tip
      const tipBoost = alert && i >= 3 ? 3.2 : 1;
      t.rotateY(Math.sin(clock * Math.PI * 2 / period - i * 0.7) * amp * tipBoost * sitTip);
      t.rotateX(i === 0 ? tailLift * (1 - sitW) : i >= 3 ? tailLift * 0.6 : 0);
    });

    renderer.render(scene, camera);
  };
  frame = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener('pointermove', onMove);
    mixer.stopAllAction();
    renderer.dispose();
    material.dispose();
    palette.dispose();
  };
}
