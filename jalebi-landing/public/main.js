import * as THREE from 'three';

// ─── Ambient particle background (full page) ──────────────────────────────
const bgCanvas = document.getElementById('bg-canvas');
const bgRenderer = new THREE.WebGLRenderer({ canvas: bgCanvas, alpha: true, antialias: true });
bgRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
bgRenderer.setSize(window.innerWidth, window.innerHeight);

const bgScene = new THREE.Scene();
const bgCamera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
bgCamera.position.z = 20;

const particleCount = 220;
const positions = new Float32Array(particleCount * 3);
for (let i = 0; i < particleCount; i++) {
  positions[i * 3] = (Math.random() - 0.5) * 60;
  positions[i * 3 + 1] = (Math.random() - 0.5) * 60;
  positions[i * 3 + 2] = (Math.random() - 0.5) * 30 - 5;
}
const particleGeo = new THREE.BufferGeometry();
particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
const particleMat = new THREE.PointsMaterial({
  color: 0xff9a3c,
  size: 0.14,
  transparent: true,
  opacity: 0.55,
  sizeAttenuation: true,
});
const particles = new THREE.Points(particleGeo, particleMat);
bgScene.add(particles);

function animateBg() {
  requestAnimationFrame(animateBg);
  particles.rotation.y += 0.0006;
  particles.rotation.x += 0.0002;
  bgRenderer.render(bgScene, bgCamera);
}
animateBg();

window.addEventListener('resize', () => {
  bgCamera.aspect = window.innerWidth / window.innerHeight;
  bgCamera.updateProjectionMatrix();
  bgRenderer.setSize(window.innerWidth, window.innerHeight);
});

// ─── Hero 3D jalebi (procedural spiral tube) ───────────────────────────────
const stage = document.getElementById('jalebi-stage');

const heroRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
heroRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
stage.appendChild(heroRenderer.domElement);

const heroScene = new THREE.Scene();
const heroCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
heroCamera.position.set(0, 0, 9);

const ambient = new THREE.AmbientLight(0xffffff, 0.4);
heroScene.add(ambient);
const key = new THREE.PointLight(0xfff2d6, 6, 30);
key.position.set(4, 5, 7);
heroScene.add(key);
const rim = new THREE.PointLight(0xff5f2e, 3, 30);
rim.position.set(-5, -3, 4);
heroScene.add(rim);
const fill = new THREE.PointLight(0xffe0a3, 2, 30);
fill.position.set(0, -4, 5);
heroScene.add(fill);

// A real jalebi is piped as a rosette of overlapping loops (a hypotrochoid
// traces this shape naturally), with the batter crossing over/under itself
// as it's piped — approximated here with a z-oscillation so the coils
// visibly weave in front of and behind each other.
class JalebiCurve extends THREE.Curve {
  getPoint(t) {
    const R = 2.4, r = 0.95, d = 1.9;
    const loops = 6; // number of times the small circle rolls around
    const theta = t * Math.PI * 2 * loops;
    const k = (R - r) / r;
    const x = (R - r) * Math.cos(theta) + d * Math.cos(k * theta);
    const y = (R - r) * Math.sin(theta) - d * Math.sin(k * theta);
    const z = Math.sin(theta * 1.5) * 0.9 + Math.cos(theta * 0.7) * 0.4;
    return new THREE.Vector3(x * 0.55, y * 0.55, z);
  }
}

const curve = new JalebiCurve();
const tubeGeo = new THREE.TubeGeometry(curve, 500, 0.38, 20, false);
const tubeMat = new THREE.MeshPhysicalMaterial({
  color: 0xff7f1f,
  emissive: 0xe8590c,
  emissiveIntensity: 0.45,
  roughness: 0.12,
  metalness: 0.05,
  clearcoat: 1,
  clearcoatRoughness: 0.1,
  sheen: 1,
  sheenColor: 0xffd28a,
});
const jalebi = new THREE.Mesh(tubeGeo, tubeMat);
heroScene.add(jalebi);

// glossy syrup highlight shell — thin, bright, additive-feeling sheen
const shellMat = new THREE.MeshPhysicalMaterial({
  color: 0xfff0cf,
  roughness: 0.02,
  metalness: 0.1,
  clearcoat: 1,
  transparent: true,
  opacity: 0.28,
});
const shell = new THREE.Mesh(new THREE.TubeGeometry(curve, 500, 0.4, 20, false), shellMat);
heroScene.add(shell);

// Static base tilt so the coils read as 3D from the very first frame,
// not only once the user moves the mouse over the canvas.
jalebi.rotation.set(0.55, 0.5, 0);
shell.rotation.copy(jalebi.rotation);

let targetRotX = 0.55;
let targetRotY = 0.5;
let mouseX = 0, mouseY = 0;

window.addEventListener('mousemove', (e) => {
  mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
  mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
});

function resizeHero() {
  const w = stage.clientWidth || 1;
  const h = stage.clientHeight || 1;
  heroRenderer.setSize(w, h);
  heroCamera.aspect = w / h;
  heroCamera.updateProjectionMatrix();
}
resizeHero();
window.addEventListener('resize', resizeHero);

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function animateHero() {
  requestAnimationFrame(animateHero);
  if (!prefersReducedMotion) {
    jalebi.rotation.z += 0.004;
    shell.rotation.z += 0.004;
    targetRotY = 0.5 + mouseX * 0.3;
    targetRotX = 0.55 + mouseY * 0.15;
    jalebi.rotation.y += (targetRotY - jalebi.rotation.y) * 0.04;
    jalebi.rotation.x += (targetRotX - jalebi.rotation.x) * 0.04;
    shell.rotation.y = jalebi.rotation.y;
    shell.rotation.x = jalebi.rotation.x;
  }
  heroRenderer.render(heroScene, heroCamera);
}
animateHero();

// ─── Scroll reveal ─────────────────────────────────────────────────────────
const revealTargets = document.querySelectorAll('.feature-card, .why-copy, .why-visual, .download-card');
revealTargets.forEach((el) => { el.style.opacity = '0'; el.style.transform = 'translateY(24px)'; el.style.transition = 'opacity 0.7s ease, transform 0.7s ease'; });

const io = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
      io.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });
revealTargets.forEach((el) => io.observe(el));
