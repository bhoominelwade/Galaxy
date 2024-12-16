import { useRef, useMemo, useState, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import Planet from './Planet';
import '../styles/galaxy.css';

const GALAXY_COLORS = [
  {
    core: '#1e3799',
    arms: ['#0c2461', '#0a3d62', '#3c6382', '#60a3bc'],
    dust: '#0a3d62'
  },
  {
    core: '#341f97',
    arms: ['#5f27cd', '#341f97', '#222f3e', '#4834d4'],
    dust: '#2c2c54'
  },
  {
    core: '#b71540',
    arms: ['#6F1E51', '#833471', '#eb2f06', '#4c0525'],
    dust: '#6F1E51'
  },
  {
    core: '#006266',
    arms: ['#01a3a4', '#00464a', '#204969', '#25CCF7'],
    dust: '#004445'
  },
  {
    core: '#5758BB',
    arms: ['#2c003e', '#512b58', '#2c003e', '#482980'],
    dust: '#2c003e'
  }
];

// Updated orbit ranges for better planet distribution
const ORBIT_RANGES = [
  { radius: 12, width: 0.1 },
  { radius: 20, width: 0.1 },
  { radius: 28, width: 0.1 },
  { radius: 36, width: 0.1 },
  { radius: 44, width: 0.1 },
  { radius: 52, width: 0.1 }
];


const PREFIXES = ['NGC', 'IC', 'Messier', 'UGC', 'Andromeda', 'Omega', 'Alpha', 'Nova', 'Nexus', 'Vega'];
const SUFFIXES = ['Prime', 'Major', 'Minor', 'X', 'Beta', 'Tau', 'Delta', 'Sigma'];
const DESCRIPTORS = ['Cluster', 'Nebula', 'Vortex', 'Spiral', 'Cloud', 'System', 'Void', 'Matrix'];

const generateGalaxyName = () => {
  const prefix = PREFIXES[Math.floor(Math.random() * PREFIXES.length)];
  const number = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  const descriptor = DESCRIPTORS[Math.floor(Math.random() * DESCRIPTORS.length)];
  const suffix = Math.random() < 0.3 ? SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)] : '';
  return `${prefix} ${number} ${descriptor} ${suffix}`.trim();
};

const SpiralGalaxy = ({ transactions, position, onClick, isSelected, colorIndex = 0, highlightedHash, lodLevel = 'HIGH' }) => {
  const groupRef = useRef();
  const [hoveredPlanet, setHoveredPlanet] = useState(null);
  const safeColorIndex = Math.abs(colorIndex) % GALAXY_COLORS.length;
  const colorScheme = GALAXY_COLORS[safeColorIndex] || GALAXY_COLORS[0];
  const galaxyName = useMemo(() => generateGalaxyName(), []);

  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => b.amount - a.amount);
  }, [transactions]);

  const createSpiralGeometry = useMemo(() => {
    if (!colorScheme || !colorScheme.arms) return { points: [], particleColors: [], sizes: [] };
    
    const points = [];
    const particleColors = [];
    const sizes = [];
    
    const numPoints = isSelected ? 6000 : 2000;
    const numArms = 2 + (safeColorIndex % 3);
    const spiralRadius = isSelected ? 30 : 8;
    const armWidth = isSelected ? 1.5 : 0.4;
    
    for (let arm = 0; arm < numArms; arm++) {
      const armOffset = (arm * Math.PI * 2) / numArms;
      const armColor = new THREE.Color(colorScheme.arms[arm % colorScheme.arms.length] || colorScheme.core);
      
      for (let i = 0; i < numPoints / numArms; i++) {
        const angle = (i / (numPoints / numArms)) * Math.PI * 4 + armOffset;
        const radius = (i / (numPoints / numArms)) * spiralRadius;
        const spread = armWidth * (radius / spiralRadius);
        
        const x = Math.cos(angle) * radius + (Math.random() - 0.5) * spread;
        const z = Math.sin(angle) * radius + (Math.random() - 0.5) * spread;
        const y = (Math.random() - 0.5) * spread * 0.2;
        
        points.push(new THREE.Vector3(x, y, z));
        
        const distanceFromCore = radius / spiralRadius;
        const mixedColor = armColor.clone().lerp(
          new THREE.Color(colorScheme.core), 
          Math.pow((1 - distanceFromCore), 2) * 0.7
        );
        
        particleColors.push(mixedColor.r, mixedColor.g, mixedColor.b);
        sizes.push(isSelected ? 0.03 : 0.08);
      }
    }
    
    return { points, particleColors, sizes };
  }, [isSelected, safeColorIndex, colorScheme]);

  const planetPositions = useMemo(() => {
    if (!isSelected) return [];

    const MIN_SEPARATION = 3;
    const occupiedSpaces = new Set();
    const positions = [];
    const visibleCount = Math.min(transactions.length, 200);
    
    function isSpaceOccupied(x, z, minSeparation) {
      const gridX = Math.round(x / minSeparation);
      const gridZ = Math.round(z / minSeparation);
      return occupiedSpaces.has(`${gridX},${gridZ}`);
    }

    function occupySpace(x, z, minSeparation) {
      const gridX = Math.round(x / minSeparation);
      const gridZ = Math.round(z / minSeparation);
      occupiedSpaces.add(`${gridX},${gridZ}`);
    }

    for (let i = 0; i < visibleCount; i++) {
      const tx = sortedTransactions[i];
      let foundValidPosition = false;
      let attempts = 0;
      
      while (!foundValidPosition && attempts < 50) {
        // Randomly select an orbit
        const orbitIndex = Math.floor(Math.random() * ORBIT_RANGES.length);
        const orbit = ORBIT_RANGES[orbitIndex];
        
        // Generate random angle
        const angle = Math.random() * Math.PI * 2;
        
        // Calculate position with some random variation within orbit width
        const radiusVariation = (Math.random() - 0.5) * orbit.width;
        const radius = orbit.radius + radiusVariation;
        
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        
        if (!isSpaceOccupied(x, z, MIN_SEPARATION)) {
          occupySpace(x, z, MIN_SEPARATION);
          positions.push({
            transaction: tx,
            position: [x, 0, z], // All planets on same y-plane
            orbitIndex
          });
          foundValidPosition = true;
        }
        
        attempts++;
      }
    }

    return positions;
  }, [sortedTransactions, isSelected]);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      const rotationSpeed = isSelected ? 0.05 : 0.2;
      groupRef.current.rotation.y = clock.getElapsedTime() * rotationSpeed;
    }
  });

  return (
    <group ref={groupRef} position={position} onClick={onClick}>
      {/* Core */}
      <mesh>
        <sphereGeometry args={[isSelected ? 2 : 0.8, 32, 32]} />
        <meshBasicMaterial 
          color={colorScheme.core}
          transparent
          opacity={0.9}
        />
        <pointLight color={colorScheme.core} intensity={2} distance={50} />
      </mesh>

      {/* Spiral arms */}
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={createSpiralGeometry.points.length}
            array={new Float32Array(createSpiralGeometry.points.flatMap(p => [p.x, p.y, p.z]))}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={createSpiralGeometry.particleColors.length / 3}
            array={new Float32Array(createSpiralGeometry.particleColors)}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-size"
            count={createSpiralGeometry.sizes.length}
            array={new Float32Array(createSpiralGeometry.sizes)}
            itemSize={1}
          />
        </bufferGeometry>
        <pointsMaterial
          vertexColors
          size={isSelected ? 0.02 : 0.08}
          transparent
          opacity={isSelected ? 0.5 : 0.8}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      {isSelected && (
        <>
          {/* Lighting */}
          <ambientLight intensity={1} />
          <pointLight position={[0, 30, 0]} intensity={2} distance={100} />
          <pointLight position={[0, -30, 0]} intensity={2} distance={100} />
          <pointLight position={[30, 0, 0]} intensity={2} distance={100} />
          <pointLight position={[-30, 0, 0]} intensity={2} distance={100} />

          {/* Orbit rings */}
         {ORBIT_RANGES.map((orbit, i) => (
  <group key={`orbit-${i}`}>
    {/* Core ring */}
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[orbit.radius - orbit.width/2, orbit.radius + orbit.width/2, 128]} />
      <meshBasicMaterial 
        transparent 
        opacity={0.8}
        color="#FFF8E7"
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
    
    {/* Inner glow layer */}
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[orbit.radius - orbit.width*2, orbit.radius + orbit.width*2, 128]} />
      <meshBasicMaterial 
        transparent 
        opacity={0.4}
        color="#FFE5B4"
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>

    {/* Middle glow layer */}
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[orbit.radius - orbit.width*4, orbit.radius + orbit.width*4, 128]} />
      <meshBasicMaterial 
        transparent 
        opacity={0.2}
        color="#FFD700"
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>

    {/* Outer glow layer */}
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[orbit.radius - orbit.width*8, orbit.radius + orbit.width*8, 128]} />
      <meshBasicMaterial 
        transparent 
        opacity={0.1}
        color="#FFF8DC"
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>

    {/* Distant glow halo */}
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[orbit.radius - orbit.width*16, orbit.radius + orbit.width*16, 128]} />
      <meshBasicMaterial 
        transparent 
        opacity={0.05}
        color="#FFFAF0"
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  </group>
))}

          {/* Planets */}
          {planetPositions.map(({ transaction, position }, index) => (
            <Planet
              key={transaction.hash}
              transaction={transaction}
              position={position}
              colorIndex={index}
              isHighlighted={transaction.hash === highlightedHash}
              onHover={(isHovered) => setHoveredPlanet(isHovered ? transaction : null)}
              lodLevel={lodLevel}
            />
          ))}
        </>
      )}

      {/* Galaxy info when not selected */}
      {!isSelected && (
        <>
          <Html position={[0, -2, 0]}>
            <div className="galaxy-info">
              <div className="galaxy-stats">
                Σ {transactions.reduce((sum, tx) => sum + tx.amount, 0).toFixed(1)}
              </div>
            </div>
          </Html>
          <Html position={[0, -4, 0]}>
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

export default memo(SpiralGalaxy);