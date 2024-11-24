import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import Planet from './Planet';
import '../styles/galaxy.css';


const GALAXY_COLORS = [
  {  // Deep Blue Nebula
    core: '#1e3799',
    arms: ['#0c2461', '#0a3d62', '#3c6382', '#60a3bc'],
    dust: '#0a3d62'
  },
  {  // Purple Nebula
    core: '#341f97',
    arms: ['#5f27cd', '#341f97', '#222f3e', '#4834d4'],
    dust: '#2c2c54'
  },
  {  // Red Nebula
    core: '#b71540',
    arms: ['#6F1E51', '#833471', '#eb2f06', '#4c0525'],
    dust: '#6F1E51'
  },
  {  // Teal Nebula
    core: '#006266',
    arms: ['#01a3a4', '#00464a', '#204969', '#25CCF7'],
    dust: '#004445'
  },
  {  // Cosmic Purple
    core: '#5758BB',
    arms: ['#2c003e', '#512b58', '#2c003e', '#482980'],
    dust: '#2c003e'
  }
];

const ORBIT_RANGES = [
  { min: 0, max: 100, radius: 6 },      // Closer inner orbit
  { min: 100, max: 200, radius: 9 },
  { min: 200, max: 300, radius: 12 },
  { min: 300, max: 400, radius: 15 },
  { min: 400, max: 500, radius: 18 },
  { min: 500, max: Infinity, radius: 21 }  // Smaller maximum radius
];

// Cool sci-fi galaxy name generator components
const PREFIXES = ['NGC', 'IC', 'Messier', 'UGC', 'Andromeda', 'Omega', 'Alpha', 'Nova', 'Nexus', 'Vega'];
const SUFFIXES = ['Prime', 'Major', 'Minor', 'X', 'Beta', 'Tau', 'Delta', 'Sigma'];
const DESCRIPTORS = ['Cluster', 'Nebula', 'Vortex', 'Spiral', 'Cloud', 'System', 'Void', 'Matrix'];
const NUMBERS = () => Math.floor(Math.random() * 9999).toString().padStart(4, '0');

const generateGalaxyName = () => {
  const usePrefix = Math.random() < 0.7;
  const useSuffix = Math.random() < 0.3;
  const useDescriptor = Math.random() < 0.5;
  const useNumber = Math.random() < 0.8;

  let name = '';
  if (usePrefix) name += `${PREFIXES[Math.floor(Math.random() * PREFIXES.length)]} `;
  if (useNumber) name += `${NUMBERS()} `;
  if (useDescriptor) name += `${DESCRIPTORS[Math.floor(Math.random() * DESCRIPTORS.length)]} `;
  if (useSuffix) name += SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)];
  return name.trim();
};

const SpiralGalaxy = ({ transactions, position, onClick, isSelected, colorIndex = 0 }) => {
  const groupRef = useRef();
  const colorScheme = GALAXY_COLORS[colorIndex % GALAXY_COLORS.length];  // Renamed from colors to colorScheme
  const galaxyName = useMemo(() => generateGalaxyName(), []);

  // Enhanced spiral arm geometry
  const createSpiralGeometry = () => {
    const points = [];
    const particleColors = [];
    const sizes = [];
    const numPoints = isSelected ? 6000 : 2000;
    const numArms = 2 + (colorIndex % 3);
    const spiralRadius = isSelected ? 25 : 8;    // Match maximum orbit + buffer
    const armWidth = isSelected ? 1.5 : 0.4;     // Adjusted arm width
    
    for (let arm = 0; arm < numArms; arm++) {
      const armOffset = (arm * Math.PI * 2) / numArms;
      const armColor = new THREE.Color(colorScheme.arms[arm % colorScheme.arms.length]);
      
      for (let i = 0; i < numPoints / numArms; i++) {
        const angle = (i / (numPoints / numArms)) * Math.PI * 4 + armOffset;
        const radius = (i / (numPoints / numArms)) * spiralRadius;
        
        // Create denser particle clusters along orbit paths
        const nearestOrbit = ORBIT_RANGES.find(orbit => Math.abs(orbit.radius - radius) < 1);
        const spreadFactor = nearestOrbit ? 0.3 : radius / spiralRadius;
        const spread = armWidth * spreadFactor;
        
        const x = Math.cos(angle) * radius + (Math.random() - 0.5) * spread;
        const z = Math.sin(angle) * radius + (Math.random() - 0.5) * spread;
        const y = (Math.random() - 0.5) * spread * 0.2;  // Flatter galaxy
        
        points.push(new THREE.Vector3(x, y, z));
        
        // Enhanced color blending
        const distanceFromCore = radius / spiralRadius;
        const mixedColor = armColor.clone().lerp(
          new THREE.Color(colorScheme.core), 
          Math.pow((1 - distanceFromCore), 2) * 0.7
        );
        
        if (nearestOrbit) {
          // Brighter particles along orbit paths
          mixedColor.multiplyScalar(1.5);
        }
        
        particleColors.push(mixedColor.r, mixedColor.g, mixedColor.b);
        
        // Variable particle sizes
        const baseSize = isSelected ? 0.03 : 0.06;
        const sizeVariation = nearestOrbit ? 0.8 : (Math.random() * 0.3 + 0.7);
        const distanceFactor = 1 - (radius / spiralRadius);
        sizes.push(baseSize * sizeVariation * (distanceFactor * 0.6 + 0.4));
      }
    }
    
    return { points, particleColors, sizes };
  };

  const { points, particleColors, sizes } = useMemo(() => createSpiralGeometry(), [isSelected, colorIndex]);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.getElapsedTime() * (isSelected ? 0.1 : 0.2);
    }
  });

  return (
    <group ref={groupRef} position={position} onClick={onClick}>
      {/* Enhanced Galaxy core */}
      <mesh>
        <sphereGeometry args={[isSelected ? 1.5 : 0.8, 32, 32]} />
        <meshBasicMaterial 
          color={colorScheme.core}
          transparent
          opacity={0.9}
        />
        {/* Core glow */}
        <pointLight color={colorScheme.core} intensity={0.5} distance={3} />
      </mesh>

      {/* Spiral arms with enhanced rendering */}
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={points.length}
            array={new Float32Array(points.flatMap(p => [p.x, p.y, p.z]))}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={particleColors.length / 3}
            array={new Float32Array(particleColors)}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-size"
            count={sizes.length}
            array={new Float32Array(sizes)}
            itemSize={1}
          />
        </bufferGeometry>
        <pointsMaterial
          vertexColors
          size={isSelected ? 0.02 : 0.08}
          transparent
          opacity={isSelected ? 0.5 : 0.8}  // Reduced opacity when selected
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      {/* New Orbital System and Planets */}
      {isSelected && (
        <>
          {/* Orbit indicators */}
          {ORBIT_RANGES.map(orbit => (
            <mesh key={orbit.radius} rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[orbit.radius, orbit.radius + 0.05, 64]} />
              <meshBasicMaterial transparent opacity={0.2} color="#ffffff" />
            </mesh>
          ))}

          {/* Additional lighting for planets */}
          <ambientLight intensity={0.4} />
          <pointLight position={[0, 10, 0]} intensity={0.8} distance={50} />
          <pointLight position={[0, -10, 0]} intensity={0.8} distance={50} />
          
          {/* Planets */}
          <group>
            {transactions.map((tx, i) => (
              <Planet
                key={tx.hash}
                transaction={tx}
                position={[0, 0, 0]}
                baseSize={0.8}
                orbitIndex={i}
              />
            ))}
          </group>
        </>
      )}

      {/* HTML overlays */}
      {!isSelected && (
        <>
          <Html>
            <div className="galaxy-info">
              <div className="galaxy-stats">
                Σ {transactions.reduce((sum, tx) => sum + tx.amount, 0).toFixed(1)}
              </div>
            </div>
          </Html>
          <Html>
            <div className="galaxy-name-container">
              <div className="galaxy-name">
                {galaxyName}
              </div>
            </div>
          </Html>
        </>
      )}
    </group>
  );
};

export default SpiralGalaxy;