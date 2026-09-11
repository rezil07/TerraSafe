import { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';

// Real NASA Blue Marble textures from unpkg (CORS-enabled CDN)
const EARTH_DAY = 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg';
const EARTH_TOPO = 'https://unpkg.com/three-globe/example/img/earth-topology.png';
const EARTH_WATER = 'https://unpkg.com/three-globe/example/img/earth-water.png';

// Procedural cloud texture — soft, wispy cloud layer
function createCloudTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.fillRect(0, 0, 2048, 1024);

  // Cloud bands and swirls
  for (let i = 0; i < 120; i++) {
    const x = Math.random() * 2048;
    const y = Math.random() * 1024;
    const w = Math.random() * 200 + 80;
    const h = Math.random() * 60 + 30;
    const opacity = Math.random() * 0.4 + 0.15;

    const grad = ctx.createRadialGradient(x, y, 0, x, y, w);
    grad.addColorStop(0, `rgba(255,255,255,${opacity})`);
    grad.addColorStop(0.5, `rgba(255,255,255,${opacity * 0.5})`);
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.random() * Math.PI);
    ctx.scale(1, h / w);
    ctx.beginPath();
    ctx.arc(0, 0, w, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Wispy streaks
  for (let i = 0; i < 40; i++) {
    const y = Math.random() * 1024;
    const opacity = Math.random() * 0.2 + 0.05;
    ctx.strokeStyle = `rgba(255,255,255,${opacity})`;
    ctx.lineWidth = Math.random() * 8 + 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x < 2048; x += 20) {
      ctx.lineTo(x, y + Math.sin(x * 0.01 + i) * 15);
    }
    ctx.stroke();
  }

  return new THREE.CanvasTexture(canvas);
}

// Atmospheric glow shader — fresnel-based rim light
const atmosphereVertexShader = `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const atmosphereFragmentShader = `
  varying vec3 vNormal;
  void main() {
    float intensity = pow(0.72 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
    vec3 glow = vec3(0.0, 0.6, 1.0) * intensity;
    gl_FragColor = vec4(glow, intensity * 0.9);
  }
`;

function EarthMesh({ autoRotate }: { autoRotate: boolean }) {
  const earthRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);

  const [dayMap, topoMap, waterMap] = useLoader(THREE.TextureLoader, [
    EARTH_DAY,
    EARTH_TOPO,
    EARTH_WATER,
  ]);

  const cloudTexture = useMemo(() => createCloudTexture(), []);

  useMemo(() => {
    dayMap.colorSpace = THREE.SRGBColorSpace;
    dayMap.anisotropy = 8;
    topoMap.anisotropy = 4;
  }, [dayMap, topoMap]);

  useFrame((_, delta) => {
    if (autoRotate && earthRef.current) {
      earthRef.current.rotation.y += delta * 0.05;
    }
    if (autoRotate && cloudsRef.current) {
      cloudsRef.current.rotation.y += delta * 0.065;
    }
  });

  return (
    <group>
      {/* Earth — high detail with real NASA textures */}
      <mesh ref={earthRef}>
        <sphereGeometry args={[2, 128, 128]} />
        <meshPhongMaterial
          map={dayMap}
          bumpMap={topoMap}
          bumpScale={0.08}
          specularMap={waterMap}
          specular={new THREE.Color(0x3a7a9a)}
          shininess={14}
        />
      </mesh>

      {/* Cloud layer — drifting, semi-transparent */}
      <mesh ref={cloudsRef} scale={1.012}>
        <sphereGeometry args={[2, 64, 64]} />
        <meshPhongMaterial
          map={cloudTexture}
          transparent
          opacity={0.35}
          depthWrite={false}
        />
      </mesh>

      {/* Inner atmosphere glow — cyan fresnel */}
      <mesh scale={1.08}>
        <sphereGeometry args={[2, 64, 64]} />
        <shaderMaterial
          vertexShader={atmosphereVertexShader}
          fragmentShader={atmosphereFragmentShader}
          transparent
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Outer atmosphere — broader, dimmer halo */}
      <mesh scale={1.22}>
        <sphereGeometry args={[2, 32, 32]} />
        <shaderMaterial
          vertexShader={atmosphereVertexShader}
          fragmentShader={atmosphereFragmentShader}
          transparent
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          opacity={0.4}
        />
      </mesh>

      {/* Subtle lat/long grid */}
      <mesh scale={1.003}>
        <sphereGeometry args={[2, 36, 18]} />
        <meshBasicMaterial
          color={0x00f5ff}
          wireframe
          transparent
          opacity={0.03}
        />
      </mesh>
    </group>
  );
}

function EarthFallback() {
  return (
    <mesh>
      <sphereGeometry args={[2, 32, 32]} />
      <meshPhongMaterial color={0x0d3548} />
    </mesh>
  );
}

interface EarthProps {
  autoRotate?: boolean;
  className?: string;
}

export function Earth({ autoRotate = true, className = '' }: EarthProps) {
  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 0.3, 5.5], fov: 42 }}
        gl={{
          antialias: true,
          alpha: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 0.9,
        }}
        dpr={[1, 2]}
      >
        {/* Key light — sunlight from one side */}
        <directionalLight position={[5, 2, 4]} intensity={2.5} color={0xfff4e8} />
        {/* Fill light — cool blue from opposite side */}
        <directionalLight position={[-4, -1, -3]} intensity={0.35} color={0x4488ff} />
        {/* Ambient — very dim so shadows are deep */}
        <ambientLight intensity={0.08} />

        <Suspense fallback={<EarthFallback />}>
          <EarthMesh autoRotate={autoRotate} />
        </Suspense>

        <Stars
          radius={80}
          depth={60}
          count={4000}
          factor={3}
          saturation={0}
          fade
          speed={0.3}
        />

        <OrbitControls
          enableZoom
          enablePan={false}
          minDistance={3.2}
          maxDistance={9}
          dampingFactor={0.06}
          enableDamping
          rotateSpeed={0.45}
          zoomSpeed={0.7}
        />
      </Canvas>
    </div>
  );
}
