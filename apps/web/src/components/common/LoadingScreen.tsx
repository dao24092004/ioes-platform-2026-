import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useUIStore } from '@/app/store/uiStore';

interface LoadingScreenProps {
  isLoading: boolean;
  isFirstVisit?: boolean;
  onLoadingComplete?: () => void;
}

const loadingTexts = [
  'Loading knowledge...',
  'Preparing your courses...',
  'Connecting to AI Mentor...',
  'Almost ready...',
  'Welcome to IOES!',
];

/**
 * Mounts a self-contained Three.js scene into the given container.
 * Returns a cleanup function that disposes everything (call on unmount).
 */
function mountThreeScene(container: HTMLDivElement, isDark: boolean) {
  const width = container.clientWidth;
  const height = container.clientHeight;

  // --- Renderer -----------------------------------------------------------
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  // --- Scene / Camera -------------------------------------------------------
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
  camera.position.set(0, 0, 9);

  // --- Lights - adapt to theme ---------------------------------------------
  const ambientColor = isDark ? 0x334155 : 0xffffff;
  const ambientIntensity = isDark ? 1.4 : 1.8;
  const ambient = new THREE.AmbientLight(ambientColor, ambientIntensity);
  scene.add(ambient);

  const keyLightColor = isDark ? 0x38bdf8 : 0x3b82f6;
  const keyLightIntensity = isDark ? 12 : 15;
  const keyLight = new THREE.PointLight(keyLightColor, keyLightIntensity, 20);
  keyLight.position.set(4, 3, 5);
  scene.add(keyLight);

  const rimLightColor = isDark ? 0x8b5cf6 : 0x6366f1;
  const rimLightIntensity = isDark ? 10 : 12;
  const rimLight = new THREE.PointLight(rimLightColor, rimLightIntensity, 20);
  rimLight.position.set(-4, -2, 4);
  scene.add(rimLight);

  // --- Core: glowing icosahedron (wireframe + solid glass layer) -----------
  const coreGroup = new THREE.Group();

  const coreGeo = new THREE.IcosahedronGeometry(1.4, 1);
  const coreColor = isDark ? 0x0ea5e9 : 0x2563eb;
  const coreEmissive = isDark ? 0x0ea5e9 : 0x3b82f6;
  const coreMat = new THREE.MeshStandardMaterial({
    color: coreColor,
    emissive: coreEmissive,
    emissiveIntensity: isDark ? 0.55 : 0.4,
    metalness: 0.3,
    roughness: 0.25,
    transparent: true,
    opacity: isDark ? 0.55 : 0.7,
  });
  const coreMesh = new THREE.Mesh(coreGeo, coreMat);
  coreGroup.add(coreMesh);

  const wireColor = isDark ? 0x67e8f9 : 0x60a5fa;
  const wireGeo = new THREE.IcosahedronGeometry(1.55, 1);
  const wireMat = new THREE.MeshBasicMaterial({
    color: wireColor,
    wireframe: true,
    transparent: true,
    opacity: isDark ? 0.5 : 0.6,
  });
  const wireMesh = new THREE.Mesh(wireGeo, wireMat);
  coreGroup.add(wireMesh);

  scene.add(coreGroup);

  // --- Orbit rings at different 3D tilts (real depth, not CSS) --------------
  const ringDefs = isDark
    ? [
        { radius: 2.4, tube: 0.02, color: 0x22d3ee, tiltX: 1.1, tiltZ: 0.2, speed: 0.006 },
        { radius: 2.9, tube: 0.015, color: 0x818cf8, tiltX: -0.7, tiltZ: 1.0, speed: -0.0045 },
        { radius: 3.4, tube: 0.012, color: 0xc084fc, tiltX: 0.4, tiltZ: -1.2, speed: 0.0035 },
      ]
    : [
        { radius: 2.4, tube: 0.02, color: 0x3b82f6, tiltX: 1.1, tiltZ: 0.2, speed: 0.006 },
        { radius: 2.9, tube: 0.015, color: 0x6366f1, tiltX: -0.7, tiltZ: 1.0, speed: -0.0045 },
        { radius: 3.4, tube: 0.012, color: 0x8b5cf6, tiltX: 0.4, tiltZ: -1.2, speed: 0.0035 },
      ];

  const rings: THREE.Mesh[] = ringDefs.map(def => {
    const geo = new THREE.TorusGeometry(def.radius, def.tube, 8, 96);
    const mat = new THREE.MeshBasicMaterial({
      color: def.color,
      transparent: true,
      opacity: isDark ? 0.55 : 0.65,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = def.tiltX;
    mesh.rotation.z = def.tiltZ;
    scene.add(mesh);
    return mesh;
  });

  // A small satellite orb riding one of the rings for visual interest
  const satelliteGeo = new THREE.SphereGeometry(0.09, 16, 16);
  const satelliteColor = isDark ? 0x22d3ee : 0x3b82f6;
  const satelliteMat = new THREE.MeshStandardMaterial({
    color: satelliteColor,
    emissive: satelliteColor,
    emissiveIntensity: isDark ? 1.2 : 1.0,
  });
  const satellite = new THREE.Mesh(satelliteGeo, satelliteMat);
  scene.add(satellite);

  // --- Particle field with real depth (z varies) -----------------------------
  const PARTICLE_COUNT = 260;
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const radius = 4 + Math.random() * 5;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = radius * Math.cos(phi);
  }
  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const particleColor = isDark ? 0x60a5fa : 0x3b82f6;
  const particleMat = new THREE.PointsMaterial({
    color: particleColor,
    size: 0.045,
    transparent: true,
    opacity: isDark ? 0.7 : 0.8,
    sizeAttenuation: true,
  });
  const particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  // --- Animation loop ---------------------------------------------------------
  let frameId = 0;
  let t = 0;

  const animate = () => {
    t += 0.01;

    coreGroup.rotation.y += 0.006;
    coreGroup.rotation.x = Math.sin(t * 0.5) * 0.15;
    wireMesh.rotation.y -= 0.003;

    rings.forEach((ring, i) => {
      ring.rotation.z += ringDefs[i].speed;
    });

    // Satellite rides the first ring's path in 3D
    const ringDef = ringDefs[0];
    const angle = t * 0.9;
    const x = Math.cos(angle) * ringDef.radius;
    const y = Math.sin(angle) * ringDef.radius;
    const tilted = new THREE.Vector3(x, y, 0).applyEuler(
      new THREE.Euler(ringDef.tiltX, 0, ringDef.tiltZ)
    );
    satellite.position.copy(tilted);

    // Gentle camera drift for parallax
    camera.position.x = Math.sin(t * 0.3) * 0.8;
    camera.position.y = Math.cos(t * 0.25) * 0.5;
    camera.lookAt(0, 0, 0);

    particles.rotation.y += 0.0008;

    renderer.render(scene, camera);
    frameId = requestAnimationFrame(animate);
  };
  animate();

  // --- Resize handling ---------------------------------------------------------
  const handleResize = () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };
  window.addEventListener('resize', handleResize);

  // --- Cleanup -------------------------------------------------------------------
  return () => {
    cancelAnimationFrame(frameId);
    window.removeEventListener('resize', handleResize);
    [coreGeo, wireGeo, satelliteGeo, particleGeo, ...rings.map(r => r.geometry)].forEach(g =>
      g.dispose()
    );
    [coreMat, wireMat, satelliteMat, particleMat, ...rings.map(r => r.material as THREE.Material)].forEach(m =>
      m.dispose()
    );
    renderer.dispose();
    if (renderer.domElement.parentElement === container) {
      container.removeChild(renderer.domElement);
    }
  };
}

interface ThreeCoreProps {
  isDark: boolean;
}

const ThreeCore: React.FC<ThreeCoreProps> = ({ isDark }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;
    const cleanup = mountThreeScene(mountRef.current, isDark);
    return cleanup;
  }, [isDark]);

  return <div ref={mountRef} className="w-full h-full" />;
};

// Loading texts cho các lần sau
const returningLoadingTexts = [
  'Welcome back...',
  'Loading your data...',
  'Almost there...',
];

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ isLoading, isFirstVisit = true, onLoadingComplete }) => {
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const [progress, setProgress] = useState(0);
  const [textIndex, setTextIndex] = useState(0);
  const [textKey, setTextKey] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  // Chọn texts phù hợp với loại visit
  const activeTexts = isFirstVisit ? loadingTexts : returningLoadingTexts;

  useEffect(() => {
    if (!isLoading) {
      setIsExiting(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        onLoadingComplete?.();
      }, 700);
      return () => clearTimeout(timer);
    }

    setIsExiting(false);
    setProgress(0);
    setTextIndex(0);
  }, [isLoading, onLoadingComplete]);

  useEffect(() => {
    if (!isLoading) return;

    // Lần đầu: progress chậm hơn, text chậm hơn
    // Lần sau: progress nhanh hơn, text nhanh hơn
    const progressSpeed = isFirstVisit ? 250 : 50;
    const textSpeed = isFirstVisit ? 1400 : 600;
    const progressStep = isFirstVisit ? 8 : 35;

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        // Đảm bảo progress luôn fill đủ 100% trước khi loading kết thúc
        const increment = isFirstVisit 
          ? Math.random() * progressStep + 3 
          : Math.min(100, prev + progressStep + Math.random() * 10);
        return Math.min(increment, 100);
      });
    }, progressSpeed);

    const textInterval = setInterval(() => {
      setTextIndex(prev => (prev + 1) % activeTexts.length);
      setTextKey(prev => prev + 1);
    }, textSpeed);

    return () => {
      clearInterval(progressInterval);
      clearInterval(textInterval);
    };
  }, [isLoading, isFirstVisit, activeTexts.length]);

  if (!isVisible) return null;

  // Theme-adaptive colors
  const backgroundStyle = isDark
    ? { background: 'radial-gradient(ellipse at 50% 40%, #1e293b 0%, #0f172a 55%, #060a14 100%)' }
    : { background: 'radial-gradient(ellipse at 50% 40%, #f0f9ff 0%, #e0f2fe 40%, #f8fafc 100%)' };

  const textPrimary = isDark ? 'from-blue-400 via-cyan-400 to-purple-400' : 'from-blue-600 via-indigo-500 to-purple-600';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';
  const textAccent = isDark ? 'text-cyan-400' : 'text-blue-600';
  const progressBg = isDark ? 'bg-slate-800/80' : 'bg-slate-200/80';
  const progressBorder = isDark ? 'border-slate-700/50' : 'border-slate-300/50';
  const percentText = isDark ? 'text-slate-500' : 'text-slate-500';
  const linkText = isDark ? 'text-slate-500' : 'text-slate-400';
  const linkHover = isDark ? 'hover:text-cyan-400' : 'hover:text-blue-600';

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden transition-all duration-700 ${
        isExiting ? 'opacity-0 scale-110 blur-sm' : 'opacity-100 scale-100 blur-0'
      }`}
      style={backgroundStyle}
    >
      <style>{`
        @keyframes ioes-shimmer {
          0%   { transform: translateX(-120%); }
          100% { transform: translateX(220%); }
        }
        @keyframes ioes-text-in {
          0%   { opacity: 0; transform: translateY(6px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .ioes-text-anim { animation: ioes-text-in 0.4s ease-out; }
      `}</style>

      {/* Background grid - adapt to theme */}
      <div className={`absolute inset-0 ${isDark ? 'opacity-[0.08]' : 'opacity-[0.06]'}`}>
        <div
          className="w-full h-full"
          style={{
            backgroundImage: isDark
              ? `linear-gradient(rgba(59, 130, 246, 0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.4) 1px, transparent 1px)`
              : `linear-gradient(rgba(59, 130, 246, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.3) 1px, transparent 1px)`,
            backgroundSize: '50px 50px',
            maskImage: 'radial-gradient(ellipse at 50% 45%, black 0%, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(ellipse at 50% 45%, black 0%, transparent 75%)',
          }}
        />
      </div>

      {/* Main content */}
      <div className="relative flex flex-col items-center min-h-[600px]">
        {/* Real WebGL 3D scene */}
        <div className="relative w-[420px] h-[420px] mb-6">
          <ThreeCore isDark={isDark} />
        </div>

        {/* IOES Logo Text */}
        <div className="text-center mb-8 -mt-6">
          <h1 className={`text-7xl font-bold bg-gradient-to-r ${textPrimary} bg-clip-text text-transparent tracking-tight`}>
            IOES
          </h1>
          <p className={`${textSecondary} text-lg mt-2 tracking-[0.4em] uppercase`}>Platform</p>
        </div>

        {/* Loading text */}
        <div className={`mb-6 flex items-center justify-center ${isFirstVisit ? 'h-8' : 'h-6'}`}>
          <p key={textKey} className={`${isFirstVisit ? `${textAccent} text-xl font-medium` : `${textAccent.replace('400', '600').replace('cyan', 'blue')} text-lg font-medium`} ioes-text-anim`}>
            {activeTexts[textIndex]}
          </p>
        </div>

        {/* Progress bar */}
        <div className={`${isFirstVisit ? 'w-96 h-2' : 'w-72 h-1.5'} ${progressBg} rounded-full overflow-hidden relative border ${progressBorder}`}>
          <div
            className="h-full rounded-full transition-all duration-300 ease-out relative overflow-hidden"
            style={{
              width: `${Math.min(progress, 100)}%`,
              background: isDark ? 'linear-gradient(90deg, #3b82f6, #06b6d4, #8b5cf6)' : 'linear-gradient(90deg, #2563eb, #3b82f6, #6366f1)',
              boxShadow: isDark ? '0 0 20px rgba(6, 182, 212, 0.6)' : '0 0 20px rgba(59, 130, 246, 0.5)',
            }}
          >
            <div
              className="absolute inset-y-0 w-1/3"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
                animation: 'ioes-shimmer 1.6s linear infinite',
              }}
            />
          </div>
        </div>

        <p className={`${isFirstVisit ? 'text-slate-500 text-sm mt-3' : 'text-slate-500 text-xs mt-2'} font-mono tabular-nums`}>
          {Math.min(Math.round(progress), 100)}%
        </p>
      </div>

      {/* Bottom links */}
      <div className={`absolute bottom-10 flex gap-8 ${linkText} text-sm`}>
          <span className={`${linkHover} cursor-pointer transition-colors`}>Privacy</span>
          <span className={`${linkHover} cursor-pointer transition-colors`}>Terms</span>
          <span className={`${linkHover} cursor-pointer transition-colors`}>Support</span>
      </div>

      {/* Corner decorations - hide in light mode */}
      {isDark && (
        <>
          <div className="absolute top-6 left-6 w-20 h-20 border-l-2 border-t-2 border-cyan-500/30 rounded-tl-xl" />
          <div className="absolute top-6 right-6 w-20 h-20 border-r-2 border-t-2 border-blue-500/30 rounded-tr-xl" />
          <div className="absolute bottom-6 left-6 w-20 h-20 border-l-2 border-b-2 border-purple-500/30 rounded-bl-xl" />
          <div className="absolute bottom-6 right-6 w-20 h-20 border-r-2 border-b-2 border-indigo-500/30 rounded-br-xl" />
        </>
      )}
    </div>
  );
};

export default LoadingScreen;
