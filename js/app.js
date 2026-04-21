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

function sculptSoftHeroGeometry(geometry, amount = 0.12) {
  const position = geometry.attributes.position;
  const vertex = new THREE.Vector3();

  for (let i = 0; i < position.count; i++) {
    vertex.fromBufferAttribute(position, i);
    const n = vertex.clone().normalize();
    const wave =
      Math.sin(n.x * 5.2 + n.y * 2.1) * 0.045 +
      Math.cos(n.y * 4.7 - n.z * 3.2) * 0.035 +
      Math.sin((n.x + n.z) * 6.4) * 0.025;
    const stretch = 1 + wave * amount;

    vertex.x *= stretch * 0.94;
    vertex.y *= stretch * 1.12;
    vertex.z *= stretch * 0.98;
    position.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }

  position.needsUpdate = true;
  geometry.computeVertexNormals();
}

function createInternalFacetGeometry(width = 0.42, height = 0.64) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array([
    0, height * 0.58, 0,
    -width * 0.58, -height * 0.44, 0,
    width * 0.64, -height * 0.34, 0
  ]);

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function smoothStep(value) {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

try {
  const canvas = document.getElementById('bg-canvas');
  const heroSection = document.querySelector('.hero-overlay');
  const heroContent = document.getElementById('hero-content');
  const bgImage = document.getElementById('bg-projects-image');
  const bgVideo = document.getElementById('bg-projects-video');
  const projectsSection = document.getElementById('projects');
  const titleEl = document.getElementById('interstitial-title');
  const modelStageIndicator = document.getElementById('model-stage-indicator');
  const motionToggle = document.getElementById('motion-toggle');
  const caseModal = document.getElementById('case-study');
  const projectCards = Array.from(document.querySelectorAll('.project-card'));
  const revealItems = Array.from(document.querySelectorAll('.reveal-item'));
  const navLinks = Array.from(document.querySelectorAll('.nav-link'));
  const navSections = navLinks
    .map((link) => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);
  const storySections = [
    {
      id: 'hero',
      element: heroSection,
      x: 1.34,
      y: 0.14,
      z: 0.0,
      scale: 1.0,
      rotX: -0.08,
      spin: 0.18,
      tilt: 0.05,
      energy: 0.65,
      bloom: 1.08,
      stageLabel: 'Origin',
      stageName: 'Creative Core'
    },
    {
      id: 'projects',
      element: document.getElementById('projects'),
      x: 0.02,
      y: -0.04,
      z: -0.58,
      scale: 1.32,
      rotX: 0.22,
      spin: 0.72,
      tilt: -0.16,
      energy: 1.15,
      bloom: 1.24,
      stageLabel: 'Orbit',
      stageName: 'Selected Work'
    },
    {
      id: 'featured',
      element: document.getElementById('featured'),
      x: -1.18,
      y: 0.08,
      z: -0.18,
      scale: 1.08,
      rotX: 0.04,
      spin: 0.34,
      tilt: 0.2,
      energy: 0.9,
      bloom: 1.16,
      stageLabel: 'Focus',
      stageName: 'Case Study Lens'
    },
    {
      id: 'about',
      element: document.getElementById('about'),
      x: 1.12,
      y: -0.18,
      z: -0.42,
      scale: 0.92,
      rotX: -0.16,
      spin: 0.12,
      tilt: -0.08,
      energy: 0.52,
      bloom: 0.92,
      stageLabel: 'Signal',
      stageName: 'About The Craft'
    },
    {
      id: 'capabilities',
      element: document.getElementById('capabilities'),
      x: 0.0,
      y: 0.38,
      z: -0.84,
      scale: 1.48,
      rotX: 0.34,
      spin: 0.88,
      tilt: 0.0,
      energy: 1.25,
      bloom: 1.32,
      stageLabel: 'System',
      stageName: 'Capabilities'
    },
    {
      id: 'process',
      element: document.getElementById('process'),
      x: -1.08,
      y: -0.34,
      z: -0.26,
      scale: 0.86,
      rotX: 0.12,
      spin: 0.46,
      tilt: 0.26,
      energy: 0.8,
      bloom: 1.04,
      stageLabel: 'Trajectory',
      stageName: 'Process'
    },
    {
      id: 'contact',
      element: document.getElementById('contact'),
      x: 0.0,
      y: -0.82,
      z: 0.16,
      scale: 1.18,
      rotX: -0.28,
      spin: 0.22,
      tilt: 0.0,
      energy: 1.0,
      bloom: 1.22,
      stageLabel: 'Converge',
      stageName: 'Contact Point'
    }
  ].filter((stage) => stage.element);
  const visibleProjectCards = [];
  const caseStudies = {
    quantum: {
      title: 'Quantum Echo',
      summary: 'A launch-page direction built around glow, pacing, and a product reveal that feels discovered rather than simply shown.',
      role: 'Frontend animation, visual direction, interaction prototyping',
      stack: 'Three.js, shader-style materials, semantic HTML, responsive CSS',
      focus: 'Bioluminescent atmosphere, scroll timing, and premium reveal choreography',
      notes: [
        ['Challenge', 'Make an abstract product feel tangible without relying on heavy copy or generic hero sections.'],
        ['Interaction', 'The page uses staged motion and a responsive artifact to create a sense of proximity as the visitor scrolls.'],
        ['Result', 'A high-impact concept suitable for a product teaser, campaign microsite, or creative technology launch.']
      ]
    },
    fractal: {
      title: 'Fractal Soul',
      summary: 'An editorial concept for a visually rich story that still needs hierarchy, rhythm, and readable long-form sections.',
      role: 'UI direction, layout system, responsive composition',
      stack: 'HTML, CSS grid, motion states, image-led art direction',
      focus: 'Crystalline layout language, typography, and narrative pacing',
      notes: [
        ['Challenge', 'Balance expressive visuals with content that can still be scanned quickly.'],
        ['Interaction', 'Layered cards and restrained reveal states guide attention without overpowering the text.'],
        ['Result', 'A direction that can scale into an article, brand story, or digital magazine feature.']
      ]
    },
    synapse: {
      title: 'Synapse Flow',
      summary: 'A systems interface prototype for structured content, neural maps, and generative product storytelling.',
      role: 'Product UI, interaction model, component direction',
      stack: 'Responsive CSS, stateful interface patterns, motion tokens',
      focus: 'Information density, connection mapping, and generative visual systems',
      notes: [
        ['Challenge', 'Represent complex relationships without making the interface feel clinical or overloaded.'],
        ['Interaction', 'Cards, metadata, and motion cues create a structured path through technical content.'],
        ['Result', 'A strong direction for AI tools, dashboards, research products, or systems-facing landing pages.']
      ]
    },
    void: {
      title: 'Void Dream',
      summary: 'A spatial portfolio concept where one cinematic artifact becomes the visual guide through work, process, and contact.',
      role: '3D web direction, motion choreography, frontend implementation',
      stack: 'Three.js, EffectComposer, Lenis, canvas cursor effects, responsive CSS',
      focus: 'Section-aware hero motion, readable case flow, and atmospheric depth',
      notes: [
        ['Challenge', 'Create a memorable portfolio without letting the 3D scene reduce content clarity.'],
        ['Interaction', 'The hero model changes position, scale, glow, and energy based on the active page section.'],
        ['Result', 'A cohesive scroll-led portfolio experience with stronger identity and clearer conversion points.']
      ]
    }
  };
  let lastFocusedElement = null;
  let viewportWidth = window.innerWidth;
  let viewportHeight = window.innerHeight;
  let isMobileViewport = viewportWidth < 768;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let motionReduced = localStorage.getItem('portfolio-motion') === 'reduced' || prefersReducedMotion;
  let projectsVideoReady = false;

  function syncMotionPreference() {
    document.body.classList.toggle('motion-reduced', motionReduced);
    if (motionToggle) {
      motionToggle.setAttribute('aria-pressed', String(motionReduced));
      motionToggle.textContent = motionReduced ? 'Motion Off' : 'Motion';
    }
    if (bgVideo && motionReduced) {
      bgVideo.pause();
    }
  }

  syncMotionPreference();

  if (bgVideo) {
    bgVideo.pause();
    bgVideo.addEventListener('loadedmetadata', () => {
      projectsVideoReady = Number.isFinite(bgVideo.duration) && bgVideo.duration > 0;
      updateProjectsVideoBackground();
    });
  }

  function getProjectsVideoState() {
    if (!projectsSection) return { progress: 0, visibility: 0 };

    const rect = projectsSection.getBoundingClientRect();
    const progress = clamp01((viewportHeight - rect.top) / (viewportHeight + rect.height));
    const entering = clamp01((viewportHeight - rect.top) / (viewportHeight * 0.58));
    const leaving = clamp01(rect.bottom / (viewportHeight * 0.58));
    const visibility = Math.min(entering, leaving);

    return { progress, visibility };
  }

  function updateProjectsVideoBackground() {
    const { progress, visibility } = getProjectsVideoState();
    const visibleOpacity = motionReduced ? 0.18 : 0.54;

    if (bgVideo) {
      bgVideo.style.opacity = (visibility * visibleOpacity).toFixed(3);

      if (projectsVideoReady && !motionReduced) {
        const targetTime = Math.min(bgVideo.duration - 0.05, Math.max(0, bgVideo.duration * progress));
        if (Math.abs(bgVideo.currentTime - targetTime) > 0.045) {
          try {
            bgVideo.currentTime = targetTime;
          } catch (error) {
            projectsVideoReady = false;
          }
        }
      }
    }

    if (bgImage) {
      bgImage.style.opacity = (0.16 + visibility * 0.18).toFixed(3);
    }
  }

  if (motionToggle) {
    motionToggle.addEventListener('click', () => {
      motionReduced = !motionReduced;
      localStorage.setItem('portfolio-motion', motionReduced ? 'reduced' : 'full');
      syncMotionPreference();
      debrisTrail.length = 0;
    });
  }

  function openCaseStudy(caseId, trigger) {
    const study = caseStudies[caseId];
    if (!caseModal || !study) return;

    lastFocusedElement = trigger;
    caseModal.querySelector('#case-modal-title').textContent = study.title;
    caseModal.querySelector('#case-modal-summary').textContent = study.summary;
    caseModal.querySelector('#case-modal-role').textContent = study.role;
    caseModal.querySelector('#case-modal-stack').textContent = study.stack;
    caseModal.querySelector('#case-modal-focus').textContent = study.focus;

    const notes = caseModal.querySelector('#case-modal-notes');
    notes.innerHTML = study.notes
      .map(([heading, copy]) => `<article><h3>${heading}</h3><p>${copy}</p></article>`)
      .join('');

    caseModal.classList.add('is-open');
    caseModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('case-modal-open');
    caseModal.querySelector('.case-modal-close').focus();
  }

  function closeCaseStudy() {
    if (!caseModal || !caseModal.classList.contains('is-open')) return;

    caseModal.classList.remove('is-open');
    caseModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('case-modal-open');
    if (lastFocusedElement) lastFocusedElement.focus();
  }

  projectCards.forEach((card) => {
    card.addEventListener('click', (event) => {
      event.preventDefault();
      openCaseStudy(card.dataset.case, card);
    });
  });

  if (caseModal) {
    caseModal.querySelectorAll('[data-case-close]').forEach((closeControl) => {
      closeControl.addEventListener('click', closeCaseStudy);
    });
  }

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeCaseStudy();
  });

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x050816, 5.5, 14);

  const camera = new THREE.PerspectiveCamera(45, viewportWidth / viewportHeight, 0.1, 100);
  camera.position.set(0, 0, 4.8);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance'
  });

  // Lenis Smooth Scroll Initialization
  const lenis = new Lenis({
    lerp: 0.1,
    wheelMultiplier: 1.1,
    smoothWheel: true
  });

  function getRenderPixelRatio() {
    const cap = isMobileViewport ? 1.08 : 1.35;
    return Math.min(window.devicePixelRatio || 1, motionReduced ? 1 : cap);
  }

  renderer.setSize(viewportWidth, viewportHeight);
  renderer.setPixelRatio(getRenderPixelRatio());
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(viewportWidth, viewportHeight),
    motionReduced ? 0.75 : 1.18,
    0.82,
    0.72
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
  const starCount = motionReduced ? 180 : (isMobileViewport ? 260 : 520);
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

  const outerGeo = new THREE.IcosahedronGeometry(1.08, isMobileViewport ? 2 : 3);
  const innerGeo = new THREE.IcosahedronGeometry(0.76, isMobileViewport ? 1 : 2);
  const nebulaGeo = new THREE.IcosahedronGeometry(0.9, isMobileViewport ? 1 : 2);
  const bloomGeo = new THREE.IcosahedronGeometry(1.24, isMobileViewport ? 2 : 3);

  sculptSoftHeroGeometry(outerGeo, 1.0);
  sculptSoftHeroGeometry(innerGeo, 0.65);

  outerGeo.userData.original = outerGeo.attributes.position.array.slice();
  innerGeo.userData.original = innerGeo.attributes.position.array.slice();

  const outerMat = new THREE.MeshPhysicalMaterial({
    color: 0xaecaff,
    metalness: 0.05,
    roughness: 0.045,
    transmission: 0.96,
    thickness: 4.6,
    transparent: true,
    opacity: 0.68,
    ior: 1.74,
    reflectivity: 1.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.035,
    iridescence: 0.95,
    emissive: 0x3441ff,
    emissiveIntensity: 0.16,
    sheen: 0.8,
    sheenColor: 0x8fe7ff,
    sheenRoughness: 0.2,
    flatShading: true
  });

  const innerMat = new THREE.MeshBasicMaterial({
    color: 0x76f3ff,
    transparent: true,
    opacity: 0.3,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    wireframe: false
  });

  const edgeMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      opacity: { value: 0.2 },
      colorA: { value: new THREE.Color(0xf0f6ff) },
      colorB: { value: new THREE.Color(0x75f4ff) }
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewPosition;

      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vViewPosition = -mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform float opacity;
      uniform vec3 colorA;
      uniform vec3 colorB;
      varying vec3 vNormal;
      varying vec3 vViewPosition;

      void main() {
        vec3 viewDir = normalize(vViewPosition);
        float rim = 1.0 - max(dot(normalize(vNormal), viewDir), 0.0);
        rim = smoothstep(0.18, 0.92, rim);
        vec3 color = mix(colorB, colorA, rim);
        gl_FragColor = vec4(color, rim * opacity);
      }
    `
  });

  const haloMat = new THREE.MeshBasicMaterial({
    color: 0x9fdcff,
    transparent: true,
    opacity: 0.1,
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
  const sparkleCount = motionReduced ? 120 : (isMobileViewport ? 160 : 280);
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
  const contourGroup = new THREE.Group();
  const contourMat = new THREE.MeshBasicMaterial({
    color: 0x9feeff,
    transparent: true,
    opacity: 0.08,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.08 + i * 0.09, 0.006, 12, 160), contourMat.clone());
    ring.rotation.set(
      Math.PI * (0.22 + i * 0.12),
      Math.PI * (0.18 + i * 0.17),
      Math.PI * (0.1 + i * 0.24)
    );
    contourGroup.add(ring);
  }

  const facetGroup = new THREE.Group();
  const facetPalette = [0x8ff4ff, 0xb58cff, 0xff7ab0, 0xffffff];
  const facetTotal = isMobileViewport ? 7 : 12;

  for (let i = 0; i < facetTotal; i++) {
    const facet = new THREE.Mesh(
      createInternalFacetGeometry(0.32 + Math.random() * 0.38, 0.44 + Math.random() * 0.46),
      new THREE.MeshBasicMaterial({
        color: facetPalette[i % facetPalette.length],
        transparent: true,
        opacity: 0.18 + Math.random() * 0.14,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
        side: THREE.DoubleSide
      })
    );
    const normal = new THREE.Vector3(
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5
    ).normalize();

    facet.position.copy(normal.multiplyScalar(0.1 + Math.random() * 0.36));
    facet.lookAt(normal.multiplyScalar(2));
    facet.rotation.z += Math.random() * Math.PI;
    facet.userData = {
      baseOpacity: facet.material.opacity,
      spin: (Math.random() - 0.5) * 0.003,
      pulseOffset: Math.random() * Math.PI * 2
    };
    facetGroup.add(facet);
  }

  const heroFacetPalette = [0x8ff4ff, 0xb58cff, 0xff7ab0, 0x76f3ff];
  for (let i = 0; i < 6; i++) {
    const heroFacet = new THREE.Mesh(
      createInternalFacetGeometry(0.42 + Math.random() * 0.34, 0.52 + Math.random() * 0.42),
      new THREE.MeshBasicMaterial({
        color: heroFacetPalette[i % heroFacetPalette.length],
        transparent: true,
        opacity: 0.16 + Math.random() * 0.08,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
        side: THREE.DoubleSide
      })
    );

    heroFacet.position.set(
      (Math.random() - 0.5) * 0.75,
      (Math.random() - 0.5) * 0.7,
      0.32 + Math.random() * 0.22
    );
    heroFacet.rotation.set(
      (Math.random() - 0.5) * 0.46,
      (Math.random() - 0.5) * 0.42,
      Math.random() * Math.PI
    );
    heroFacet.userData = {
      baseOpacity: heroFacet.material.opacity,
      spin: (Math.random() - 0.5) * 0.002,
      pulseOffset: Math.random() * Math.PI * 2
    };
    facetGroup.add(heroFacet);
  }
  
  const tailCount = motionReduced ? 140 : (isMobileViewport ? 220 : 380);
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
  const edgeLines = new THREE.Mesh(bloomGeo, edgeMat);
  const facetWire = new THREE.Mesh(outerGeo.clone(), haloMat);
  
  crystalGroup.add(outerCrystal);
  crystalGroup.add(innerCrystal);
  crystalGroup.add(nebulaMesh);
  crystalGroup.add(facetGroup);
  crystalGroup.add(sparklePoints);
  crystalGroup.add(edgeLines);
  crystalGroup.add(facetWire);
  crystalGroup.add(contourGroup);

  const dustCount = motionReduced ? 600 : (isMobileViewport ? 800 : 1500);
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
  const shardTotal = motionReduced ? 18 : (isMobileViewport ? 28 : 58);

  for (let i = 0; i < shardTotal; i++) {
    const shardColor = shardPalette[i % shardPalette.length];
    const shard = new THREE.Mesh(
      new THREE.TetrahedronGeometry(0.035 + Math.random() * 0.15, 0),
      new THREE.MeshPhysicalMaterial({
        color: shardColor,
        transparent: true,
        opacity: 0.72,
        metalness: 0.2,
        roughness: 0.08,
        transmission: 0.92,
        thickness: 0.8,
        iridescence: 0.9,
        emissive: shardColor,
        emissiveIntensity: 0.12
      })
    );

    const angle = Math.random() * Math.PI * 2;
    const radius = 1.45 + Math.random() * 2.55;
    const lift = (Math.random() - 0.5) * 2.15;

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
      baseY: shard.position.y,
      radius: radius,
      angle: angle,
      angularSpeed: (0.005 + Math.random() * 0.015)
    };

    shardGroup.add(shard);
  }

  scene.add(shardGroup);

  const mouse = new THREE.Vector2(0, 0);
  const targetRot = new THREE.Vector2(0, 0);
  let scrollProgress = 0;
  let animationFrame = 0;
  let resizeTimer;
  let activeModelStageId = 'hero';
  let transitionSurge = 0;
  const modelState = {
    x: 1.34,
    y: 0.14,
    z: 0.0,
    scale: 1.0,
    rotX: -0.08,
    spin: 0.18,
    tilt: 0.05,
    energy: 0.65,
    bloom: 1.08
  };

  function getHeroModelTarget() {
    let target = storySections[0];
    let strongestWeight = -Infinity;
    const focusY = viewportHeight * 0.48;

    storySections.forEach((stage) => {
      const rect = stage.element.getBoundingClientRect();
      const center = rect.top + rect.height * 0.5;
      const distance = Math.abs(center - focusY);
      const sectionReach = Math.max(viewportHeight * 0.72, rect.height * 0.42);
      const weight = 1 - distance / sectionReach;

      if (weight > strongestWeight && rect.bottom > 0 && rect.top < viewportHeight) {
        strongestWeight = weight;
        target = stage;
      }
    });

    if (target.id !== activeModelStageId) {
      activeModelStageId = target.id;
      transitionSurge = 1;

      if (modelStageIndicator) {
        const label = modelStageIndicator.querySelector('span');
        const name = modelStageIndicator.querySelector('strong');
        if (label) label.textContent = target.stageLabel;
        if (name) name.textContent = target.stageName;
      }
    }

    return target;
  }

  function followModelTarget(target, t) {
    const sectionRect = target.element.getBoundingClientRect();
    const localProgress = smoothStep((viewportHeight - sectionRect.top) / (viewportHeight + sectionRect.height));
    const responsiveScale = isMobileViewport ? 0.66 : 1.0;
    const motionFactor = motionReduced ? 0.28 : 1;
    const surge = transitionSurge * motionFactor;
    const dramaX = Math.sin(localProgress * Math.PI) * target.tilt * 0.48 * motionFactor;
    const dramaY = Math.sin(localProgress * Math.PI * 2) * target.energy * 0.12 * motionFactor;
    const dramaZ = -Math.sin(localProgress * Math.PI) * target.energy * 0.22 * motionFactor;

    const desired = {
      x: target.x + dramaX + mouse.x * (0.1 + target.energy * 0.08) * motionFactor,
      y: target.y + dramaY + Math.sin(t * (0.72 + target.energy * 0.12)) * (0.07 + target.energy * 0.035) * motionFactor + mouse.y * 0.12 * motionFactor,
      z: target.z + dramaZ + surge * 0.22,
      scale: (target.scale + surge * 0.18) * responsiveScale,
      rotX: target.rotX + mouse.y * 0.16 * motionFactor,
      spin: target.spin * motionFactor,
      tilt: target.tilt,
      energy: target.energy * (motionReduced ? 0.48 : 1) + surge * 0.45,
      bloom: (motionReduced ? 0.72 : target.bloom) + surge * 0.2
    };

    const ease = 0.055 + target.energy * 0.012;
    Object.keys(modelState).forEach((key) => {
      modelState[key] += (desired[key] - modelState[key]) * ease;
    });

    transitionSurge *= 0.94;
  }

  window.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / viewportWidth) * 2 - 1;
    mouse.y = -(event.clientY / viewportHeight) * 2 + 1;

    targetRot.x = mouse.y * 0.22;
    targetRot.y = mouse.x * 0.35;
  }, { passive: true });

  // Lenis-Powered Scroll Logic
  lenis.on('scroll', ({ progress }) => {
    scrollProgress = progress;

    if (heroContent) {
      const opacity = Math.max(0, 1 - scrollProgress * 3.5);
      const translateY = Math.min(60, scrollProgress * 180);
      heroContent.style.opacity = opacity.toFixed(3);
      heroContent.style.transform = `translateY(${translateY}px)`;
    }

    updateProjectsVideoBackground();

    projectCards.forEach((card, i) => {
      const rect = card.getBoundingClientRect();
      if (rect.top < viewportHeight * 0.9 && !card.classList.contains('is-visible')) {
        setTimeout(() => {
          card.classList.add('is-visible');
          if (!visibleProjectCards.includes(card)) visibleProjectCards.push(card);
        }, i * 150);
      }
    });

    revealItems.forEach((item) => {
      if (!item.classList.contains('is-visible') && item.getBoundingClientRect().top < viewportHeight * 0.86) {
        item.classList.add('is-visible');
      }
    });

    let activeSectionId = navSections[0]?.id;
    navSections.forEach((section) => {
      const rect = section.getBoundingClientRect();
      if (rect.top <= viewportHeight * 0.36 && rect.bottom > viewportHeight * 0.24) {
        activeSectionId = section.id;
      }
    });

    navLinks.forEach((link) => {
      link.classList.toggle('is-active', link.getAttribute('href') === `#${activeSectionId}`);
    });
  });

  const clock = new THREE.Clock();

  requestAnimationFrame(() => {
    if (heroContent) heroContent.classList.add('is-visible');
  });

  function animateHeroCrystal(time) {
    if (nebulaMat) nebulaMat.uniforms.time.value = time;
    sparkleMat.opacity = 0.4 + Math.sin(time * 3.0) * 0.2;
  }

  function animate() {
    if (document.hidden) {
      requestAnimationFrame(animate);
      return;
    }

    animationFrame++;
    const t = clock.getElapsedTime();
    const intro = Math.min(t / 1.2, 1);

    // Sync Lenis per frame
    lenis.raf(t * 1000);

    animateHeroCrystal(t);

    const modelTarget = getHeroModelTarget();
    followModelTarget(modelTarget, t);

    crystalGroup.position.x = modelState.x;
    crystalGroup.position.y = modelState.y;
    crystalGroup.position.z = modelState.z;
    crystalGroup.scale.setScalar(modelState.scale);

    // Animate Starfield Parallax
    starfield.position.y = -scrollProgress * 1.5;
    starfield.rotation.y = t * 0.04;

    // Visibility Control: Consistent presence
    crystalGroup.visible = true;

    updateProjectsVideoBackground();

    // Interstitial Title Animation (Fades between Section 1 and 2)
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
    tailPoints.visible = !motionReduced;
    const tailPosArr = tailPoints.geometry.attributes.position.array;
    if (!motionReduced) {
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
    }
    tailMat.opacity = 0.3 + Math.sin(t * 4) * 0.1;

    // Smooth Card Drift in the main loop
    visibleProjectCards.forEach((card, i) => {
      const dx = Math.sin(t * 0.48 + i) * 8;
      const dy = Math.cos(t * 0.42 + i) * 6;
      // We apply drift via a separate CSS variable or combine it carefully
      card.style.setProperty('--drift-x', `${dx}px`);
      card.style.setProperty('--drift-y', `${dy}px`);
    });

    crystalGroup.rotation.x += (modelState.rotX + targetRot.x - crystalGroup.rotation.x) * 0.055;
    const storySpin = scrollProgress * Math.PI * (4.2 + modelState.energy * 3.4);
    const pulseRoll = Math.sin(t * (0.42 + modelState.energy * 0.1)) * (0.04 + modelState.energy * 0.04);
    crystalGroup.rotation.y += ((t * modelState.spin + targetRot.y + storySpin) - crystalGroup.rotation.y) * 0.052;
    crystalGroup.rotation.z = modelState.tilt + pulseRoll;

    // v2.2: Bioluminescent Heartbeat (60BPM / 1Hz breathing)
    const heartbeat = Math.sin(t * 2.2) * 0.5 + 0.5; // Smooth 0-1 pulse
    outerMat.opacity = 0.28 + intro * 0.16 + heartbeat * 0.05 + modelState.energy * 0.025;
    outerMat.emissiveIntensity = 0.16 + heartbeat * 0.16 + modelState.energy * 0.14;
    edgeMat.uniforms.opacity.value = 0.22 + heartbeat * 0.16 + modelState.energy * 0.08;
    bloomPass.strength += ((motionReduced ? 0.72 : modelState.bloom) - bloomPass.strength) * 0.04;
    innerCrystal.scale.setScalar(1 + Math.sin(t * (1.0 + modelState.energy * 0.24)) * 0.02 + heartbeat * 0.01);
    facetWire.rotation.y = -t * 0.05;
    facetWire.rotation.z = Math.sin(t * 0.34) * 0.04;
    facetWire.material.opacity = 0.08 + heartbeat * 0.04 + modelState.energy * 0.018;
    facetGroup.children.forEach((facet) => {
      facet.rotation.z += facet.userData.spin * (0.8 + modelState.energy);
      facet.material.opacity = facet.userData.baseOpacity + heartbeat * 0.06 + Math.sin(t * 1.35 + facet.userData.pulseOffset) * 0.035;
    });
    contourGroup.children.forEach((ring, index) => {
      ring.rotation.z += 0.0018 + index * 0.0008;
      ring.material.opacity = 0.045 + heartbeat * 0.035 + index * 0.01;
    });

    if (typeof nebulaMesh !== 'undefined') {
      nebulaMesh.rotation.y = t * 0.12;
      nebulaMesh.rotation.z = Math.sin(t * 0.5) * 0.1;
    }
    if (typeof sparklePoints !== 'undefined') {
      sparklePoints.rotation.y = -t * 0.08;
    }

    // High-Fidelity Vortex Physics
    const vortexSpeedMultiplier = motionReduced ? 0.28 : 0.85 + scrollProgress * 1.2 + modelState.energy * 1.15;
    dust.rotation.y = t * 0.03 * vortexSpeedMultiplier;
    shardGroup.visible = !motionReduced;

    if (animationFrame % (isMobileViewport ? 3 : 2) === 0) {
      const dustPosArr = dust.geometry.attributes.position.array;
      for(let i=0; i<dustCount; i++) {
        const meta = dustMetadata[i];
        meta.angle += meta.speed * 0.03 * vortexSpeedMultiplier;

        const i3 = i * 3;
        dustPosArr[i3] = meta.radius * Math.cos(meta.angle);
        dustPosArr[i3+1] = meta.yOffset + Math.sin(t * 0.8 + meta.angle) * 0.15;
        dustPosArr[i3+2] = meta.radius * Math.sin(meta.angle) - 5;
      }
      dust.geometry.attributes.position.needsUpdate = true;
    }

    shardGroup.children.forEach((shard) => {
      const sd = shard.userData;
      sd.angle += sd.angularSpeed * vortexSpeedMultiplier;

      // Orbital Vortex Math
      shard.position.x = Math.cos(sd.angle) * sd.radius;
      shard.position.z = Math.sin(sd.angle) * sd.radius * 0.8;
      shard.position.y = sd.baseY + Math.sin(t * 1.2 + sd.bobOffset) * 0.1;

      shard.rotation.x += sd.spinX * vortexSpeedMultiplier;
      shard.rotation.y += sd.spinY * vortexSpeedMultiplier;
    });

    camera.position.x += ((mouse.x * 0.18) - camera.position.x) * 0.04;
    camera.position.y += ((mouse.y * 0.1) - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);

    composer.render();
    requestAnimationFrame(animate);
  }

  animate();


  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      viewportWidth = window.innerWidth;
      viewportHeight = window.innerHeight;
      isMobileViewport = viewportWidth < 768;

      camera.aspect = viewportWidth / viewportHeight;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(getRenderPixelRatio());
      renderer.setSize(viewportWidth, viewportHeight);
      composer.setSize(viewportWidth, viewportHeight);
      resizeTrailCanvas();
    }, 120);
  });

  const magneticElements = document.querySelectorAll('.magnetic');
  magneticElements.forEach((element) => {
    let magneticFrame = null;

    element.addEventListener('mousemove', (event) => {
      if (magneticFrame) return;

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

      magneticFrame = requestAnimationFrame(() => {
        element.style.transform = `translate3d(${tx}px, ${ty}px, 0) rotateX(${rx}deg) rotateY(${ry}deg)`;
        magneticFrame = null;
      });
    });

    element.addEventListener('mouseleave', () => {
      if (magneticFrame) {
        cancelAnimationFrame(magneticFrame);
        magneticFrame = null;
      }
      element.style.transform = '';
    });
  });

  const cursor = document.getElementById('cursor');
  const follower = document.getElementById('cursor-follower');
  const trailCanvas = document.getElementById('trail-canvas');
  const trailCtx = trailCanvas.getContext('2d');
  const debrisTrail = [];
  const debrisPalette = [
    '145, 231, 255',
    '181, 140, 255',
    '255, 255, 255',
    '255, 122, 176'
  ];
  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let previousMouseX = mouseX;
  let previousMouseY = mouseY;
  let followerX = mouseX;
  let followerY = mouseY;
  let lastDebrisSpawn = 0;

  function resizeTrailCanvas() {
    trailCanvas.width = viewportWidth;
    trailCanvas.height = viewportHeight;
  }

  function spawnSpaceDebris(x, y, velocityX, velocityY) {
    if (motionReduced) return;

    const speed = Math.hypot(velocityX, velocityY);
    const maxDebris = isMobileViewport ? 56 : 96;
    const count = Math.min(isMobileViewport ? 2 : 4, 1 + Math.floor(speed / 22));
    const angle = Math.atan2(velocityY, velocityX) + Math.PI;

    for (let i = 0; i < count; i++) {
      const spread = (Math.random() - 0.5) * 1.4;
      const drift = 0.6 + Math.random() * 2.2;
      const size = 2 + Math.random() * (isMobileViewport ? 4 : 7);

      debrisTrail.push({
        x: x + (Math.random() - 0.5) * 8,
        y: y + (Math.random() - 0.5) * 8,
        vx: Math.cos(angle + spread) * drift - velocityX * 0.018,
        vy: Math.sin(angle + spread) * drift - velocityY * 0.018 + (Math.random() - 0.5) * 0.45,
        life: 1,
        decay: 0.018 + Math.random() * 0.018,
        size,
        sides: Math.random() > 0.42 ? 3 : 4,
        rotation: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.2,
        color: debrisPalette[Math.floor(Math.random() * debrisPalette.length)],
        radiusJitter: Array.from({ length: 4 }, () => 0.72 + Math.random() * 0.16),
        trail: 7 + Math.random() * 15
      });
    }

    if (debrisTrail.length > maxDebris) {
      debrisTrail.splice(0, debrisTrail.length - maxDebris);
    }
  }

  function drawDebrisShard(piece) {
    const alpha = Math.max(piece.life, 0);
    const tailX = piece.x - piece.vx * piece.trail;
    const tailY = piece.y - piece.vy * piece.trail;

    trailCtx.save();
    trailCtx.globalCompositeOperation = 'lighter';
    trailCtx.shadowBlur = alpha > 0.45 ? 10 * alpha : 0;
    trailCtx.shadowColor = `rgba(${piece.color}, ${0.55 * alpha})`;

    const streak = trailCtx.createLinearGradient(piece.x, piece.y, tailX, tailY);
    streak.addColorStop(0, `rgba(${piece.color}, ${0.34 * alpha})`);
    streak.addColorStop(1, `rgba(${piece.color}, 0)`);
    trailCtx.strokeStyle = streak;
    trailCtx.lineWidth = Math.max(1, piece.size * 0.28);
    trailCtx.beginPath();
    trailCtx.moveTo(piece.x, piece.y);
    trailCtx.lineTo(tailX, tailY);
    trailCtx.stroke();

    trailCtx.translate(piece.x, piece.y);
    trailCtx.rotate(piece.rotation);
    trailCtx.beginPath();

    for (let i = 0; i < piece.sides; i++) {
      const pointAngle = (Math.PI * 2 * i) / piece.sides;
      const radius = piece.size * piece.radiusJitter[i];
      const px = Math.cos(pointAngle) * radius;
      const py = Math.sin(pointAngle) * radius;

      if (i === 0) trailCtx.moveTo(px, py);
      else trailCtx.lineTo(px, py);
    }

    trailCtx.closePath();
    trailCtx.fillStyle = `rgba(${piece.color}, ${0.18 * alpha})`;
    trailCtx.strokeStyle = `rgba(${piece.color}, ${0.72 * alpha})`;
    trailCtx.lineWidth = 1;
    trailCtx.fill();
    trailCtx.stroke();
    trailCtx.restore();
  }

  resizeTrailCanvas();

  window.addEventListener('mousemove', (e) => {
    previousMouseX = mouseX;
    previousMouseY = mouseY;
    mouseX = e.clientX;
    mouseY = e.clientY;
    cursor.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`;

    if (e.timeStamp - lastDebrisSpawn > 18) {
      spawnSpaceDebris(mouseX, mouseY, mouseX - previousMouseX, mouseY - previousMouseY);
      lastDebrisSpawn = e.timeStamp;
    }
  });

  function animateCursor() {
    if (document.hidden) {
      requestAnimationFrame(animateCursor);
      return;
    }

    followerX += (mouseX - followerX) * 0.32;
    followerY += (mouseY - followerY) * 0.32;
    follower.style.transform = `translate3d(${followerX}px, ${followerY}px, 0) translate(-50%, -50%)`;

    trailCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);

    for (let i = debrisTrail.length - 1; i >= 0; i--) {
      const piece = debrisTrail[i];
      piece.x += piece.vx;
      piece.y += piece.vy;
      piece.vx *= 0.982;
      piece.vy = piece.vy * 0.982 + 0.006;
      piece.rotation += piece.spin;
      piece.life -= piece.decay;

      if (piece.life <= 0) {
        debrisTrail.splice(i, 1);
        continue;
      }

      drawDebrisShard(piece);
    }

    requestAnimationFrame(animateCursor);
  }

  animateCursor();

  const interactiveElements = document.querySelectorAll('a, button, .project-card, .hero-button');
  interactiveElements.forEach((el) => {
    el.addEventListener('mouseleave', () => {
      el.style.transform = '';
    });

    el.addEventListener('mouseenter', () => {
      cursor.classList.add('active');
      follower.classList.add('active');
      // Depth of Field Focus Effect
      document.body.classList.add('is-focused');
      canvas.style.filter = 'blur(6px) saturate(0.8)';
      if (bgImage) bgImage.style.filter = 'blur(8px) brightness(0.7)';
      if (titleEl) titleEl.style.filter = 'blur(10px) opacity(0.2)';
    });

    el.addEventListener('mouseleave', () => {
      cursor.classList.remove('active');
      follower.classList.remove('active');
      // Remove Focus Effect
      document.body.classList.remove('is-focused');
      canvas.style.filter = '';
      if (bgImage) bgImage.style.filter = '';
      if (titleEl) titleEl.style.filter = '';
    });
  });

  window.dispatchEvent(new Event('scroll'));
  document.title = 'Cinematic Portfolio';
} catch (error) {
  console.error(error);
}
