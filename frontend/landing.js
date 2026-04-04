/* ============================================================
   ChatWithPDF — Landing Page JS
   GSAP ScrollTrigger + Three.js canvas backgrounds
   ============================================================ */

gsap.registerPlugin(ScrollTrigger);

/* ============================================================
   TYPEWRITER — hero title
   ============================================================ */
const words   = ['Documents.', 'Research.', 'Reports.', 'Thesis.', 'Textbooks.'];
let wordIndex = 0;
let charIndex = 0;
let deleting  = false;
const el      = document.getElementById('typewriter');

function type() {
  const word    = words[wordIndex];
  const speed   = deleting ? 60 : 100;
  const pause   = deleting ? 0  : 1800;

  el.textContent = deleting
    ? word.slice(0, charIndex--)
    : word.slice(0, charIndex++);

  if (!deleting && charIndex === word.length + 1) {
    setTimeout(() => { deleting = true; type(); }, pause);
    return;
  }
  if (deleting && charIndex === -1) {
    deleting  = false;
    charIndex = 0;
    wordIndex = (wordIndex + 1) % words.length;
  }
  setTimeout(type, speed);
}
type();

/* ============================================================
   THREE.JS — HERO CANVAS
   ============================================================ */
(function heroCanvas() {
  const canvas   = document.getElementById('hero-canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.setClearColor(0x080810, 1);

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 100);
  camera.position.z = 20;

  /* Subtle lighting */
  scene.add(new THREE.AmbientLight(0xffffff, 0.2));
  const ptLight = new THREE.PointLight(0x6366f1, 3, 60);
  ptLight.position.set(5, 5, 5);
  scene.add(ptLight);

  /* Particles */
  const count    = 300;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i*3]   = (Math.random() - 0.5) * 50;
    positions[i*3+1] = (Math.random() - 0.5) * 30;
    positions[i*3+2] = (Math.random() - 0.5) * 20;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  scene.add(new THREE.Points(geo, new THREE.PointsMaterial({
    color: 0x6366f1, size: 0.06, transparent: true, opacity: 0.5
  })));

  /* Wireframe shapes */
  const shapes = [];
  const geos   = [
    new THREE.IcosahedronGeometry(1.2, 0),
    new THREE.OctahedronGeometry(1, 0),
    new THREE.TorusGeometry(1, 0.35, 8, 12),
  ];
  for (let i = 0; i < 14; i++) {
    const mesh = new THREE.Mesh(
      geos[i % geos.length],
      new THREE.MeshPhongMaterial({
        color: 0x6366f1, wireframe: true,
        transparent: true, opacity: Math.random() * 0.12 + 0.04,
      })
    );
    const s = Math.random() * 1.2 + 0.4;
    mesh.scale.setScalar(s);
    mesh.position.set(
      (Math.random() - 0.5) * 30,
      (Math.random() - 0.5) * 16,
      (Math.random() - 0.5) * 8
    );
    mesh.userData = {
      ry: (Math.random() - 0.5) * 0.008,
      rx: (Math.random() - 0.5) * 0.005,
      oy: mesh.position.y,
      phase: Math.random() * Math.PI * 2,
    };
    scene.add(mesh);
    shapes.push(mesh);
  }

  /* Mouse parallax */
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener('mousemove', e => {
    mouse.tx = (e.clientX / innerWidth  - 0.5) * 1.2;
    mouse.ty = (e.clientY / innerHeight - 0.5) * 0.8;
  });

  const clock = new THREE.Clock();
  (function tick() {
    requestAnimationFrame(tick);
    const t = clock.getElapsedTime();
    mouse.x += (mouse.tx - mouse.x) * 0.05;
    mouse.y += (mouse.ty - mouse.y) * 0.05;
    camera.position.x = mouse.x;
    camera.position.y = -mouse.y;
    camera.lookAt(0, 0, 0);
    shapes.forEach(m => {
      m.rotation.y += m.userData.ry;
      m.rotation.x += m.userData.rx;
      m.position.y  = m.userData.oy + Math.sin(t * 0.4 + m.userData.phase) * 1;
    });
    ptLight.intensity = 2.5 + Math.sin(t * 1.5) * 0.8;
    renderer.render(scene, camera);
  })();

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
})();

/* ============================================================
   THREE.JS — CTA CANVAS (simpler, just particles)
   ============================================================ */
(function ctaCanvas() {
  const canvas   = document.getElementById('cta-canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.setClearColor(0x05050f, 1);

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 100);
  camera.position.z = 18;

  scene.add(new THREE.AmbientLight(0xffffff, 0.15));
  const pl = new THREE.PointLight(0x6366f1, 4, 60);
  scene.add(pl);

  const count = 500;
  const pos   = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i*3]   = (Math.random() - 0.5) * 50;
    pos[i*3+1] = (Math.random() - 0.5) * 30;
    pos[i*3+2] = (Math.random() - 0.5) * 15;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(geo, new THREE.PointsMaterial({
    color: 0x818cf8, size: 0.07, transparent: true, opacity: 0.6,
  })));

  const clock = new THREE.Clock();
  (function tick() {
    requestAnimationFrame(tick);
    const t = clock.getElapsedTime();
    pl.position.set(Math.sin(t) * 8, Math.cos(t * 0.7) * 6, 5);
    renderer.render(scene, camera);
  })();

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
})();

/* ============================================================
   GSAP — HERO entrance animation
   ============================================================ */
const heroTl = gsap.timeline({ defaults: { ease: 'power3.out' } });
heroTl
  .from('.hero-badge',    { y: 30, opacity: 0, duration: 0.7, delay: 0.3 })
  .from('.hero-title',    { y: 40, opacity: 0, duration: 0.8 }, '-=0.4')
  .from('.hero-sub',      { y: 30, opacity: 0, duration: 0.7 }, '-=0.5')
  .from('.hero-btns',     { y: 24, opacity: 0, duration: 0.6 }, '-=0.4')
  .from('.hero-stats',    { y: 20, opacity: 0, duration: 0.5 }, '-=0.3')
  .from('.float-card',    { y: 20, opacity: 0, duration: 0.6, stagger: 0.15 }, '-=0.4')
  .from('.hero-scroll-hint', { opacity: 0, duration: 0.5 }, '-=0.2');

/* ============================================================
   GSAP SCROLL — Feature Section 1
   ============================================================ */
gsap.from('#feat1-left', {
  scrollTrigger: {
    trigger: '#feat1-left',
    start: 'top 75%',
  },
  x: -60, opacity: 0, duration: 1, ease: 'power3.out',
});
gsap.from('#feat1-right', {
  scrollTrigger: {
    trigger: '#feat1-right',
    start: 'top 75%',
  },
  x: 60, opacity: 0, duration: 1, ease: 'power3.out',
});

/* ============================================================
   GSAP SCROLL — Feature Section 2
   ============================================================ */
gsap.from('#feat2-right', {
  scrollTrigger: {
    trigger: '#feat2-right',
    start: 'top 75%',
  },
  x: -60, opacity: 0, duration: 1, ease: 'power3.out',
});
gsap.from('#feat2-left', {
  scrollTrigger: {
    trigger: '#feat2-left',
    start: 'top 75%',
  },
  x: 60, opacity: 0, duration: 1, ease: 'power3.out',
});

/* ============================================================
   GSAP SCROLL — CTA Section (like chess section3)
   Overlay + text slides up as user scrolls into section
   ============================================================ */
const ctaOverlay = document.getElementById('cta-overlay');

ScrollTrigger.create({
  trigger: '#cta-section',
  start:   'top 60%',
  onEnter: () => {
    ctaOverlay.classList.add('visible');

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl
      .to(ctaOverlay,     { opacity: 1,   duration: 0.6 })
      .to('#cta-eyebrow', { y: 0, opacity: 1, duration: 0.7 }, '-=0.3')
      .to('#cta-title',   { y: 0, opacity: 1, duration: 0.9 }, '-=0.5')
      .to('#cta-sub',     { y: 0, opacity: 1, duration: 0.7 }, '-=0.5')
      .to('#cta-btn',     { y: 0, opacity: 1, duration: 0.6 }, '-=0.4');
  },
  once: true,
});
