import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';


function distortGeometry(geometry, amount = 0.08) {
  const position = geometry.attributes.position;
  const vertex = new THREE.Vector3();

  for (let i = 0; i < position.count; i++) {
    vertex.fromBufferAttribute(position, i);
    const scale = 1 + (Math.random() - 0.5) * amount;
    vertex.multiplyScalar(scale);
    position.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }

  position.needsUpdate = true;
  geometry.computeVertexNormals();
}

try {
  const canvas = document.getElementById('bg-canvas');
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x050816, 5.5, 14);

  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 4.8);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true
  });

  // Lenis Smooth Scroll Initialization
  const lenis = new Lenis({
    lerp: 0.1,
    wheelMultiplier: 1.1,
    smoothWheel: true
  });

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 768 ? 1.25 : 1.8));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.42, // Increased strength
    1.05, // Radius
    0.65  // Lowered threshold to pick up more highlights
  );
  composer.addPass(bloomPass);

  scene.add(new THREE.AmbientLight(0xffffff, 0.28));

  const keyLight = new THREE.DirectionalLight(0xd9e7ff, 2.2);
  keyLight.position.set(2.8, 1.5, 4.2);
  scene.add(keyLight);

  const cyanLight = new THREE.PointLight(0x63dfff, 5.5, 16);
  cyanLight.position.set(-2.6, -0.4, 3.2);
  scene.add(cyanLight);

  const magentaLight = new THREE.PointLight(0xcf7dff, 5.6, 16);
  magentaLight.position.set(2.6, 1.4, 1.8);
  scene.add(magentaLight);

  const crystalGroup = new THREE.Group();
  scene.add(crystalGroup);

  // v2: Parallax Starfield Layer
  const starCount = 800;
  const starGeo = new THREE.BufferGeometry();
  const starPositions = new Float32Array(starCount * 3);
  for(let i=0; i<starCount; i++) {
    const i3 = i * 3;
    starPositions[i3] = (Math.random() - 0.5) * 25;
    starPositions[i3+1] = (Math.random() - 0.5) * 20;
    starPositions[i3+2] = (Math.random() - 1.0) * 8; 
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0x63dfff,
    size: 0.035,
    transparent: true,
    opacity: 0.4,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending
  });
  const starfield = new THREE.Points(starGeo, starMat);
  scene.add(starfield);

  const outerGeo = new THREE.IcosahedronGeometry(1.05, 0); // Sharp facets
  const innerGeo = new THREE.IcosahedronGeometry(1.0, 1);
  const nebulaGeo = new THREE.IcosahedronGeometry(0.85, 3);
  const bloomGeo = new THREE.IcosahedronGeometry(1.25, 1);

  distortGeometry(outerGeo, 0.12);
  distortGeometry(innerGeo, 0.08);

  outerGeo.userData.original = outerGeo.attributes.position.array.slice();
  innerGeo.userData.original = innerGeo.attributes.position.array.slice();

  const outerMat = new THREE.MeshPhysicalMaterial({
    color: 0xbfd2ff,
    metalness: 0.1,
    roughness: 0.05,
    transmission: 0.95,
    thickness: 2.0,
    transparent: true,
    opacity: 0.9,
    ior: 1.45,
    reflectivity: 1,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    iridescence: 0.9,
    emissive: 0x4a22aa,
    emissiveIntensity: 0.2
  });

  const innerMat = new THREE.MeshBasicMaterial({
    color: 0x8de8ff,
    transparent: true,
    opacity: 0.17,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const edgeMat = new THREE.LineBasicMaterial({
    color: 0xf0f6ff,
    transparent: true,
    opacity: 0.28
  });

  const haloMat = new THREE.MeshBasicMaterial({
    color: 0x9fdcff,
    transparent: true,
    opacity: 0.07,
    blending: THREE.AdditiveBlending,
    wireframe: true,
    depthWrite: false
  });

  const nebulaMat = new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.BackSide,
    uniforms: {
      time: { value: 0 },
      colorA: { value: new THREE.Color(0x63dfff) },
      colorB: { value: new THREE.Color(0xb58cff) }
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormal;
      void main() {
        vUv = uv;
        vNormal = normal;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform vec3 colorA;
      uniform vec3 colorB;
      varying vec3 vNormal;
      varying vec2 vUv;
      
      float noise(vec3 p) {
        return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
      }

      void main() {
        float n = noise(vNormal * 2.0 + vUv.xyx * 0.5 + time * 0.4);
        float dist = length(vNormal.xy);
        vec3 core = vec3(0.8, 0.4, 1.0); // Purple core
        vec3 color = mix(colorA, colorB, n * 0.5 + 0.5);
        color = mix(color, core, (1.0 - dist) * 0.4);
        gl_FragColor = vec4(color, 0.5 * n);
      }
    `
  });

  const sparkleGeo = new THREE.BufferGeometry();
  const sparkleCount = 400;
  const sparklePos = new Float32Array(sparkleCount * 3);
  for(let i=0; i<sparkleCount; i++) {
    const r = 0.8 * Math.pow(Math.random(), 0.5);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    sparklePos[i*3] = r * Math.sin(phi) * Math.cos(theta);
    sparklePos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
    sparklePos[i*3+2] = r * Math.cos(phi);
  }
  sparkleGeo.setAttribute('position', new THREE.BufferAttribute(sparklePos, 3));
  const sparkleMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.015,
    transparent: true,
    blending: THREE.AdditiveBlending
  });

  const nebulaMesh = new THREE.Mesh(nebulaGeo, nebulaMat);
  const sparklePoints = new THREE.Points(sparkleGeo, sparkleMat);
  
  const tailCount = 600;
  const tailGeo = new THREE.BufferGeometry();
  const tailPos = new Float32Array(tailCount * 3);
  const tailMeta = [];
  for(let i=0; i<tailCount; i++) {
    tailMeta.push({
      x: 0, y: 0, z: 0,
      life: Math.random(),
      speed: 0.01 + Math.random() * 0.02,
      offset: Math.random() * 10
    });
  }
  tailGeo.setAttribute('position', new THREE.BufferAttribute(tailPos, 3));
  const tailMat = new THREE.PointsMaterial({
    color: 0x8fe7ff,
    size: 0.02,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending
  });
  const tailPoints = new THREE.Points(tailGeo, tailMat);
  scene.add(tailPoints);

  const outerCrystal = new THREE.Mesh(outerGeo, outerMat);
  const innerCrystal = new THREE.Mesh(innerGeo, innerMat);
  const edgeLines = new THREE.LineSegments(new THREE.EdgesGeometry(outerGeo), edgeMat);
  
  crystalGroup.add(outerCrystal);
  crystalGroup.add(innerCrystal);
  crystalGroup.add(nebulaMesh);
  crystalGroup.add(sparklePoints);
  crystalGroup.add(edgeLines);

  const dustCount = window.innerWidth < 768 ? 1200 : 2500;
  const dustPositions = new Float32Array(dustCount * 3);
  const dustMetadata = [];

  for (let i = 0; i < dustCount; i++) {
    const i3 = i * 3;
    const r = 2.0 + Math.random() * 8.0;
    const theta = Math.random() * Math.PI * 2;
    const phi = (Math.random() - 0.5) * Math.PI * 0.4;

    dustPositions[i3] = r * Math.cos(theta);
    dustPositions[i3 + 1] = r * Math.sin(phi);
    dustPositions[i3 + 2] = r * Math.sin(theta) - 5;
    
    dustMetadata.push({
      radius: r,
      angle: theta,
      speed: 0.1 + Math.random() * 0.3,
      yOffset: dustPositions[i3 + 1]
    });
  }

  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));

  const dustMaterial = new THREE.PointsMaterial({
    size: 0.02,
    transparent: true,
    opacity: 0.45,
    color: 0x8fe7ff,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const dust = new THREE.Points(dustGeometry, dustMaterial);
  scene.add(dust);

  const shardGroup = new THREE.Group();
  const shardPalette = [0x8fe9ff, 0xb58cff, 0xffffff, 0x7dbbff];
  const shardTotal = window.innerWidth < 768 ? 26 : 58;

  for (let i = 0; i < shardTotal; i++) {
    const shard = new THREE.Mesh(
      new THREE.TetrahedronGeometry(0.03 + Math.random() * 0.12, 0),
      new THREE.MeshBasicMaterial({
        color: shardPalette[i % shardPalette.length],
        transparent: true,
        opacity: 0.35 + Math.random() * 0.45
      })
    );

    const angle = Math.random() * Math.PI * 2;
    const radius = 1.6 + Math.random() * 1.9;
    const lift = (Math.random() - 0.5) * 1.8;

    shard.position.set(
      Math.cos(angle) * radius,
      lift,
      Math.sin(angle) * radius * 0.8
    );

    shard.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );

    shard.userData = {
      spinX: (Math.random() - 0.5) * 0.018,
      spinY: (Math.random() - 0.5) * 0.022,
      bobOffset: Math.random() * Math.PI * 2,
      baseY: shard.position.y
    };

    shardGroup.add(shard);
  }

  scene.add(shardGroup);

  const mouse = new THREE.Vector2(0, 0);
  const targetRot = new THREE.Vector2(0, 0);
  let scrollProgress = 0;

  window.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    targetRot.x = mouse.y * 0.22;
    targetRot.y = mouse.x * 0.35;
  });

  // Lenis-Powered Scroll Logic
  lenis.on('scroll', ({ progress }) => {
    scrollProgress = progress;

    const hero = document.getElementById('hero-content');
    if (hero) {
      const opacity = Math.max(0, 1 - scrollProgress * 3.5);
      const translateY = Math.min(60, scrollProgress * 180);
      hero.style.opacity = opacity.toFixed(3);
      hero.style.transform = `translateY(${translateY}px)`;
    }

    document.querySelectorAll('.project-card').forEach((card, i) => {
      const rect = card.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.9 && !card.classList.contains('is-visible')) {
        setTimeout(() => card.classList.add('is-visible'), i * 150);
      }
    });
  });

  const clock = new THREE.Clock();

  requestAnimationFrame(() => {
    document.getElementById('hero-content').classList.add('is-visible');
  });

  function animateHeroCrystal(time) {
    if (nebulaMat) nebulaMat.uniforms.time.value = time;
    sparkleMat.opacity = 0.4 + Math.sin(time * 3.0) * 0.2;
    
    const outerPositions = outerGeo.attributes.position.array;
    // Removed slow per-vertex logic for performance, sharp facets don't need distortion
  }

  function animate() {
    const t = clock.getElapsedTime();
    const intro = Math.min(t / 1.2, 1);

    // Sync Lenis per frame
    lenis.raf(t * 1000);

    animateHeroCrystal(t);

    // Responsive Scaling Logic
    const isMobile = window.innerWidth < 768;
    const responsiveScale = isMobile ? 0.65 : 1.0;

    // Refined Thresholds: Triggering even earlier to close the gap
    const p1 = Math.max(0, Math.min(1, (scrollProgress - 0.005) * 5.5));
    const p2 = Math.max(0, Math.min(1, (scrollProgress - 0.52) * 6.5));
    
    // Core Positioning
    const targetX = THREE.MathUtils.lerp(1.35, 0.0, p1);
    const targetZ = THREE.MathUtils.lerp(0.0, -0.8, p1);
    
    // Phase-Specific Y Logic: Robust Sinking
    const targetY = THREE.MathUtils.lerp(0.14, 0.0, p1);
    const sinkAmount = THREE.MathUtils.lerp(0, 1.8, p2);
    const finalY = targetY - sinkAmount; 
    
    const finalScale = THREE.MathUtils.lerp(1.0, 1.55, p2) * responsiveScale;
    const finalZ = THREE.MathUtils.lerp(targetZ, -0.2, p2);
    
    crystalGroup.position.x = targetX + mouse.x * 0.2;
    crystalGroup.position.y = finalY + Math.sin(t * 0.9) * 0.12 + mouse.y * 0.16;
    crystalGroup.position.z = finalZ;
    crystalGroup.scale.setScalar(finalScale);

    // Animate Starfield Parallax
    const starPos = starfield.geometry.attributes.position.array;
    for(let i=0; i<starCount; i++) {
        const i3 = i * 3;
        starPos[i3+1] -= scrollProgress * 0.02; // Scroll-linked drift
        if(starPos[i3+1] < -12) starPos[i3+1] = 12;
    }
    starfield.geometry.attributes.position.needsUpdate = true;
    starfield.rotation.y = t * 0.04;

    // Visibility Control: Consistent presence
    crystalGroup.visible = true;

    // Background Image Blending
    const bgImage = document.getElementById('bg-projects-image');
    if (bgImage) {
      bgImage.style.opacity = Math.max(p1, p2).toFixed(3);
    }

    // Interstitial Title Animation (Fades between Section 1 and 2)
    const titleEl = document.getElementById('interstitial-title');
    if (titleEl) {
      const peak = 0.12; // Moved earlier to match tightened layout
      const range = 0.18; 
      const dist = Math.abs(scrollProgress - peak);
      const intensity = Math.max(0, 1 - (dist / range));
      const eased = Math.pow(intensity, 2.0); // Softer curve
      titleEl.style.opacity = (eased * 0.18).toFixed(3); // More vibrant ghostly presence
      titleEl.style.transform = `scale(${0.97 + eased * 0.03}) translateZ(0)`;
    }

    // Animate Tails
    const tailPosArr = tailPoints.geometry.attributes.position.array;
    for(let i=0; i<tailCount; i++) {
      const m = tailMeta[i];
      m.life -= m.speed;
      if(m.life <= 0) {
        m.life = 1.0;
        m.x = crystalGroup.position.x + (Math.random() - 0.5) * 0.4;
        m.y = crystalGroup.position.y - 0.2;
        m.z = crystalGroup.position.z;
      }
      m.y -= 0.03;
      m.x += Math.sin(t * 2.0 + m.offset) * 0.01;
      
      const i3 = i * 3;
      tailPosArr[i3] = m.x;
      tailPosArr[i3+1] = m.y;
      tailPosArr[i3+2] = m.z;
    }
    tailPoints.geometry.attributes.position.needsUpdate = true;
    tailMat.opacity = 0.3 + Math.sin(t * 4) * 0.1;

    // Smooth Card Drift in the main loop
    document.querySelectorAll('.project-card.is-visible').forEach((card, i) => {
      const dx = Math.sin(t * 0.6 + i) * 18;
      const dy = Math.cos(t * 0.5 + i) * 14;
      // We apply drift via a separate CSS variable or combine it carefully
      card.style.setProperty('--drift-x', `${dx}px`);
      card.style.setProperty('--drift-y', `${dy}px`);
    });

    crystalGroup.rotation.x += (targetRot.x - crystalGroup.rotation.x) * 0.05;
    crystalGroup.rotation.y += ((t * 0.3 + targetRot.y) - crystalGroup.rotation.y) * 0.05;
    crystalGroup.rotation.z = Math.sin(t * 0.45) * 0.05;

    outerMat.opacity = 0.42 + intro * 0.4;
    outerMat.emissiveIntensity = 0.1 + Math.sin(t * 1.8) * 0.03;
    outerMat.iridescence = 0.78 + Math.sin(t * 1.1) * 0.07;
    edgeMat.opacity = 0.22 + Math.sin(t * 1.4) * 0.06;
    innerCrystal.scale.setScalar(1 + Math.sin(t * 1.2) * 0.025);

    if (typeof nebulaMesh !== 'undefined') {
      nebulaMesh.rotation.y = t * 0.12;
      nebulaMesh.rotation.z = Math.sin(t * 0.5) * 0.1;
    }
    if (typeof sparklePoints !== 'undefined') {
      sparklePoints.rotation.y = -t * 0.08;
    }

    dust.rotation.y = t * 0.03;
    dust.rotation.z = t * 0.012;
    shardGroup.rotation.y = t * 0.08;

    const dustPosArr = dust.geometry.attributes.position.array;
    for(let i=0; i<dustCount; i++) {
      const meta = dustMetadata[i];
      meta.angle += meta.speed * 0.02;
      meta.radius -= 0.005; // Spiral inward
      if (meta.radius < 0.5) meta.radius = 8.0; // Reset to outer rim
      
      const i3 = i * 3;
      dustPosArr[i3] = meta.radius * Math.cos(meta.angle);
      dustPosArr[i3+1] = meta.yOffset + Math.sin(t + meta.angle) * 0.1;
      dustPosArr[i3+2] = meta.radius * Math.sin(meta.angle) - 5;
    }
    dust.geometry.attributes.position.needsUpdate = true;

    shardGroup.children.forEach((shard) => {
      shard.rotation.x += shard.userData.spinX;
      shard.rotation.y += shard.userData.spinY;
      shard.position.y = shard.userData.baseY + Math.sin(t * 1.2 + shard.userData.bobOffset) * 0.08;
    });

    camera.position.x += ((mouse.x * 0.18) - camera.position.x) * 0.04;
    camera.position.y += ((mouse.y * 0.1) - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);

    composer.render();
    requestAnimationFrame(animate);
  }

  animate();


  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
    resizeFeatured();
    resizeTrailCanvas();
  });

  const magneticElements = document.querySelectorAll('.magnetic');
  magneticElements.forEach((element) => {
    element.addEventListener('mousemove', (event) => {
      const rect = element.getBoundingClientRect();
      const offsetX = event.clientX - rect.left - rect.width / 2;
      const offsetY = event.clientY - rect.top - rect.height / 2;
      const isButton = element.classList.contains('hero-button');
      const strength = isButton ? 0.18 : 0.12;
      const rotateStrength = isButton ? 0 : 0.006;
      const tx = offsetX * strength;
      const ty = offsetY * strength - (isButton ? 2 : 0);
      const rx = rotateStrength ? offsetY * -rotateStrength : 0;
      const ry = rotateStrength ? offsetX * rotateStrength : 0;
      element.style.transform = `translate3d(${tx}px, ${ty}px, 0) rotateX(${rx}deg) rotateY(${ry}deg)`;
    });

    element.addEventListener('mouseleave', () => {
      element.style.transform = '';
    });
  });

  const cursor = document.getElementById('cursor');
  const follower = document.getElementById('cursor-follower');
  const trailCanvas = document.getElementById('trail-canvas');
  const trailCtx = trailCanvas.getContext('2d');
  const trailPoints = [];
  const ribbonPoints = [];
  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let followerX = mouseX;
  let followerY = mouseY;

  function resizeTrailCanvas() {
    trailCanvas.width = window.innerWidth;
    trailCanvas.height = window.innerHeight;
  }

  resizeTrailCanvas();

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    cursor.style.left = `${mouseX}px`;
    cursor.style.top = `${mouseY}px`;

    trailPoints.push({ x: mouseX, y: mouseY, life: 1, size: 10 + Math.random() * 8 });
    ribbonPoints.push({ x: mouseX, y: mouseY });

    if (ribbonPoints.length > (window.innerWidth < 768 ? 24 : 40)) ribbonPoints.shift();
    if (trailPoints.length > (window.innerWidth < 768 ? 18 : 36)) trailPoints.shift();
  });

  function animateCursor() {
    followerX += (mouseX - followerX) * 0.12;
    followerY += (mouseY - followerY) * 0.12;
    follower.style.left = `${followerX}px`;
    follower.style.top = `${followerY}px`;

    trailCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);

    if (ribbonPoints.length > 2) {
      trailCtx.beginPath();

      for (let i = 0; i < ribbonPoints.length - 1; i++) {
        const p = ribbonPoints[i];
        const next = ribbonPoints[i + 1];
        const midX = (p.x + next.x) / 2;
        const midY = (p.y + next.y) / 2;

        if (i === 0) trailCtx.moveTo(p.x, p.y);
        trailCtx.quadraticCurveTo(p.x, p.y, midX, midY);
      }

      trailCtx.strokeStyle = 'rgba(120,200,255,0.7)';
      trailCtx.lineWidth = window.innerWidth < 768 ? 3.5 : 6;
      trailCtx.lineCap = 'round';
      trailCtx.lineJoin = 'round';
      trailCtx.shadowBlur = 30;
      trailCtx.shadowColor = 'rgba(120,200,255,0.6)';
      trailCtx.stroke();
    }

    for (let i = 0; i < trailPoints.length; i++) {
      const point = trailPoints[i];
      trailCtx.beginPath();
      trailCtx.arc(point.x, point.y, point.size * point.life, 0, Math.PI * 2);
      trailCtx.fillStyle = `rgba(145,205,255,${point.life * 0.25})`;
      trailCtx.fill();
      point.life *= 0.92;
    }

    while (trailPoints.length && trailPoints[0].life < 0.05) {
      trailPoints.shift();
    }

    requestAnimationFrame(animateCursor);
  }

  animateCursor();

  document.querySelectorAll('a, button, .project-card, .hero-button').forEach((el) => {
    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      el.style.transform = `translateY(-10px) scale(1.03) rotateX(${y * -6}deg) rotateY(${x * 6}deg)`;
    });

    el.addEventListener('mouseleave', () => {
      el.style.transform = '';
    });

    el.addEventListener('mouseenter', () => {
      cursor.classList.add('active');
      follower.classList.add('active');
      // Depth of Field Focus Effect
      document.body.classList.add('is-focused');
      canvas.style.filter = 'blur(6px) saturate(0.8)';
      document.getElementById('bg-projects-image').style.filter = 'blur(8px) brightness(0.7)';
      document.getElementById('interstitial-title').style.filter = 'blur(10px) opacity(0.2)';
    });

    el.addEventListener('mouseleave', () => {
      cursor.classList.remove('active');
      follower.classList.remove('active');
      // Remove Focus Effect
      document.body.classList.remove('is-focused');
      canvas.style.filter = '';
      document.getElementById('bg-projects-image').style.filter = '';
      document.getElementById('interstitial-title').style.filter = '';
    });
  });

  window.dispatchEvent(new Event('scroll'));
  document.title = 'Cinematic Portfolio';
} catch (error) {
  console.error(error);
}
