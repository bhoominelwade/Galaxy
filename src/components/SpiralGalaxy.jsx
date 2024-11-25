import { useRef, useMemo, useState, useEffect, useCallback } from 'react';
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

const ORBIT_RANGES = [
  { min: 0, max: 50, radius: 8 },    // Increased starting radius
  { min: 50, max: 100, radius: 13 },
  { min: 100, max: 150, radius: 18 },
  { min: 150, max: 200, radius: 23 },
  { min: 200, max: 250, radius: 28 },
  { min: 250, max: 300, radius: 33 }
];

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

const SpiralGalaxy = ({ transactions, position, onClick, isSelected, colorIndex = 0, highlightedHash }) => {
  const groupRef = useRef();
  const [hoveredPlanet, setHoveredPlanet] = useState(null);
  const colorScheme = GALAXY_COLORS[colorIndex % GALAXY_COLORS.length];
  const galaxyName = useMemo(() => generateGalaxyName(), []);

  const debugPlanet = useCallback((tx, index, position, orbitIndex) => {
    console.log('🪐 Planet Debug:', {
      hash: tx.hash.slice(0, 8) + '...',
      amount: tx.amount,
      index: index,
      position: position,
      orbitIndex: orbitIndex
    });
  }, []);

  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => a.amount - b.amount);
  }, [transactions]);

  const createSpiralGeometry = useMemo(() => {
    const points = [];
    const particleColors = [];
    const sizes = [];
    const numPoints = isSelected ? 6000 : 2000;
    const numArms = 2 + (colorIndex % 3);
    const spiralRadius = isSelected ? 30 : 8;
    const armWidth = isSelected ? 1.5 : 0.4;
    
    for (let arm = 0; arm < numArms; arm++) {
      const armOffset = (arm * Math.PI * 2) / numArms;
      const armColor = new THREE.Color(colorScheme.arms[arm % colorScheme.arms.length]);
      
      for (let i = 0; i < numPoints / numArms; i++) {
        const angle = (i / (numPoints / numArms)) * Math.PI * 4 + armOffset;
        const radius = (i / (numPoints / numArms)) * spiralRadius;
        
        const nearestOrbit = ORBIT_RANGES.find(orbit => Math.abs(orbit.radius - radius) < 1);
        const spreadFactor = nearestOrbit ? 0.3 : radius / spiralRadius;
        const spread = armWidth * spreadFactor;
        
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
        
        const baseSize = isSelected ? 0.03 : 0.06;
        const sizeVariation = nearestOrbit ? 0.8 : (Math.random() * 0.3 + 0.7);
        const distanceFactor = 1 - (radius / spiralRadius);
        sizes.push(baseSize * sizeVariation * (distanceFactor * 0.6 + 0.4));
      }
    }
    
    return { points, particleColors, sizes };
  }, [isSelected, colorIndex, colorScheme]);

  const planetPositions = useMemo(() => {
    const MIN_PLANET_SEPARATION = 4; // Minimum distance between planets
    const positions = [];
  
    return sortedTransactions.map((tx, index) => {
      const totalOrbits = ORBIT_RANGES.length;
      const planetsPerOrbit = Math.ceil(sortedTransactions.length / totalOrbits);
      const orbitIndex = Math.floor(index / planetsPerOrbit);
      const orbit = ORBIT_RANGES[Math.min(orbitIndex, ORBIT_RANGES.length - 1)];
      
      const planetsInThisOrbit = Math.min(planetsPerOrbit, sortedTransactions.length - orbitIndex * planetsPerOrbit);
      const positionInOrbit = index % planetsPerOrbit;
      
      // Spread planets evenly around orbit with minimum separation
      const baseAngleOffset = (Math.PI * 2 * positionInOrbit) / planetsInThisOrbit;
      let angleOffset = baseAngleOffset;
      
      // Add some controlled randomness to height but maintain bounds
      const maxHeight = 2;
      const heightVariation = (Math.cos(angleOffset * 3) * maxHeight) / 2;
      
      // Add slight radius variation but ensure minimum separation
      const maxRadiusVariation = MIN_PLANET_SEPARATION / 2;
      const radiusVariation = (Math.sin(angleOffset * 5) * maxRadiusVariation) / 2;
      
      // Calculate final position
      const finalRadius = orbit.radius + radiusVariation;
      const position = {
        transaction: tx,
        radius: finalRadius,
        angle: angleOffset,
        height: heightVariation,
        orbitIndex: orbitIndex
      };
      
      positions.push(position);
      return position;
    });
  }, [sortedTransactions]);

  useEffect(() => {
    if (isSelected) {
      console.log('🌌 Galaxy Debug Info:');
      console.log('Total transactions:', transactions.length);
      console.log('Transaction ranges:', {
        min: Math.min(...transactions.map(tx => tx.amount)),
        max: Math.max(...transactions.map(tx => tx.amount)),
        total: transactions.reduce((sum, tx) => sum + tx.amount, 0)
      });
      
      planetPositions.forEach((pos, idx) => {
        const position = [
          Math.cos(pos.angle) * pos.radius,
          pos.height,
          Math.sin(pos.angle) * pos.radius
        ];
        debugPlanet(pos.transaction, idx, position, pos.orbitIndex);
      });
    }
  }, [isSelected, transactions, planetPositions, debugPlanet]);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      const rotationSpeed = isSelected ? 0.05 : 0.2;
      groupRef.current.rotation.y = clock.getElapsedTime() * rotationSpeed;
    }
  });

  return (
    <group ref={groupRef} position={position} onClick={onClick}>
      {/* Galaxy Core */}
      <mesh>
        <sphereGeometry args={[isSelected ? 2 : 0.8, 32, 32]} />
        <meshBasicMaterial 
          color={colorScheme.core}
          transparent
          opacity={0.9}
        />
        <pointLight color={colorScheme.core} intensity={2} distance={50} />
      </mesh>

      {/* Spiral Arms */}
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

      {/* Selected Galaxy Content */}
      {isSelected && (
        <>
          <ambientLight intensity={1} />
          <pointLight position={[0, 30, 0]} intensity={2} distance={100} />
          <pointLight position={[0, -30, 0]} intensity={2} distance={100} />
          <pointLight position={[30, 0, 0]} intensity={2} distance={100} />
          <pointLight position={[-30, 0, 0]} intensity={2} distance={100} />

          {/* Planet Orbit Rings */}
          {ORBIT_RANGES.map((orbit, i) => (
            <mesh key={`orbit-${i}`} rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[orbit.radius, orbit.radius + 0.2, 64]} />
              <meshBasicMaterial 
                transparent 
                opacity={0.3} 
                color="#ffffff" 
                side={THREE.DoubleSide}
              />
            </mesh>
          ))}

          {/* Planets */}
          {planetPositions.map(({ transaction, radius, angle, height, orbitIndex }, index) => (
          <Planet
            key={transaction.hash}
            transaction={transaction}
            position={[
              Math.cos(angle) * radius,
              height,
              Math.sin(angle) * radius
            ]}
            baseSize={2.5}
            orbitIndex={orbitIndex}
            colorIndex={index}
            isHighlighted={transaction.hash === highlightedHash}
            onHover={(isHovered) => setHoveredPlanet(isHovered ? transaction : null)}
          />
        ))}
        </>
      )}

      {/* Galaxy Labels */}
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

export default SpiralGalaxy;