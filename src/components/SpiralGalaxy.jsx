import { useRef, useMemo, useState, memo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import Planet from './Planet';
import '../styles/galaxy.css';
import { PREFIXES, SUFFIXES, GALAXY_COLORS } from './GalaxyStyles';

const ORBIT_RANGES = [
  { radius: 12, width: 0.05 },
  { radius: 20, width: 0.05 },
  { radius: 28, width: 0.05 },
  { radius: 36, width: 0.05 },
  { radius: 44, width: 0.05 },
  { radius: 52, width: 0.05 }
];

const FIXED_GALAXY_SIZE = 8;

const generateGalaxyName = () => {
  const prefix = PREFIXES[Math.floor(Math.random() * PREFIXES.length)];
  const number = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  const suffix = Math.random() < 0.3 ? SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)] : '';
  return `${prefix} ${number} ${suffix}`.trim();
};

const SpiralGalaxy = ({ transactions, position, onClick, isSelected, colorIndex = 0, highlightedHash, lodLevel = 'HIGH' }) => {
  const { camera } = useThree();
  const groupRef = useRef();
  const [nameOpacity, setNameOpacity] = useState(0.7);
  const [isInitialized, setIsInitialized] = useState(false);
  const [hoveredPlanet, setHoveredPlanet] = useState(null);
  const safeColorIndex = Math.abs(colorIndex) % GALAXY_COLORS.length;
  const colorScheme = GALAXY_COLORS[safeColorIndex] || GALAXY_COLORS[0];
  const galaxyName = useMemo(() => generateGalaxyName(), []);

  useEffect(() => {
    if (groupRef.current && !isInitialized) {
      setNameOpacity(0.7);
      setIsInitialized(true);
    }
  }, [isInitialized]);

  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => b.amount - a.amount);
  }, [transactions]);

  useFrame(() => {
    if (groupRef.current && isInitialized) {
      const distance = groupRef.current.position.distanceTo(camera.position);
      const opacity = Math.max(0.5, Math.min(0.7, 40 / distance));
      setNameOpacity(opacity);
      
      const rotationSpeed = isSelected ? 0.05 : 0.2;
      groupRef.current.rotation.y += rotationSpeed * 0.02;
    }
  });

  const createGalaxyGeometry = useMemo(() => {
    if (!colorScheme || !colorScheme.arms) return { points: [], particleColors: [], sizes: [] };
    
    if (isSelected) {
      const points = [];
      const particleColors = [];
      const sizes = [];
      
      const numPoints = 3000;
      const numArms = 2 + (safeColorIndex % 3);
      const spiralRadius = 30;
      const armWidth = 1.5;
      
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
          sizes.push(0.03);
        }
      }
      
      return { points, particleColors, sizes, type: 'spiral' };
    } else {
      // For zoomed out view
      const numRings = 4;
      const rings = [];
      const baseRadius = FIXED_GALAXY_SIZE;

      for (let i = 0; i < numRings; i++) {
        const radius = ((i + 1) / numRings) * baseRadius;
        const ringColor = new THREE.Color(colorScheme.arms[i % colorScheme.arms.length]);
        ringColor.multiplyScalar(1.5);
        
        rings.push({
          radius,
          color: ringColor,
          glowColor: ringColor.clone().multiplyScalar(0.8)
        });
      }
      
      return { rings, type: 'rings' };
    }
  }, [isSelected, colorScheme, safeColorIndex]);

  const planetPositions = useMemo(() => {
    if (!isSelected) return [];
  
    console.log('Calculating planet positions for', transactions.length, 'transactions');
  
    const MIN_SEPARATION = 3;
    const occupiedSpaces = new Set();
    const positions = [];
    // Reduce max planets to 30, and prioritize highest value transactions
    const visibleCount = Math.min(transactions.length, 30);  // Changed from 200 to 30
    
    // Sort by amount and take only top transactions
    const topTransactions = sortedTransactions
      .slice(0, visibleCount)
      .filter(tx => tx.amount > 0); // Filter out zero-value transactions
    
    for (let i = 0; i < topTransactions.length; i++) {
      const tx = topTransactions[i];
      if (!tx) {
        console.warn('Missing transaction at index', i);
        continue;
      }
      
      let foundValidPosition = false;
      let attempts = 0;
      
      // Distribute planets more evenly across orbits
      const orbitIndex = Math.floor(i / (topTransactions.length / ORBIT_RANGES.length));
      const orbit = ORBIT_RANGES[orbitIndex % ORBIT_RANGES.length];
      
      while (!foundValidPosition && attempts < 20) { // Reduced max attempts
        const angle = (i / topTransactions.length) * Math.PI * 2 + (Math.random() * 0.5); // More ordered distribution
        const radiusVariation = (Math.random() - 0.5) * orbit.width;
        const radius = orbit.radius + radiusVariation;
        
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        
        const gridX = Math.round(x / MIN_SEPARATION);
        const gridZ = Math.round(z / MIN_SEPARATION);
        const spaceKey = `${gridX},${gridZ}`;
        
        if (!occupiedSpaces.has(spaceKey)) {
          occupiedSpaces.add(spaceKey);
          positions.push({
            transaction: tx,
            position: [x, 0, z],
            orbitIndex
          });
          foundValidPosition = true;
        }
        
        attempts++;
      }
    }
  
    console.log('Generated positions for', positions.length, 'planets');
    return positions;
  }, [sortedTransactions, isSelected, transactions.length]);

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

      {/* Galaxy Geometry */}
      {createGalaxyGeometry.type === 'spiral' ? (
        <points>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={createGalaxyGeometry.points.length}
              array={new Float32Array(createGalaxyGeometry.points.flatMap(p => [p.x, p.y, p.z]))}
              itemSize={3}
            />
            <bufferAttribute
              attach="attributes-color"
              count={createGalaxyGeometry.particleColors.length / 3}
              array={new Float32Array(createGalaxyGeometry.particleColors)}
              itemSize={3}
            />
            <bufferAttribute
              attach="attributes-size"
              count={createGalaxyGeometry.sizes.length}
              array={new Float32Array(createGalaxyGeometry.sizes)}
              itemSize={1}
            />
          </bufferGeometry>
          <pointsMaterial
            vertexColors
            size={0.02}
            transparent
            opacity={0.5}
            sizeAttenuation
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </points>
      ) : (
        createGalaxyGeometry.rings.map((ring, index) => (
          <group key={`ring-${index}`}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[ring.radius - 0.1, ring.radius + 0.1, 64]} />
              <meshBasicMaterial 
                color={ring.color}
                transparent
                opacity={1}
                side={THREE.DoubleSide}
                blending={THREE.AdditiveBlending}
              />
            </mesh>

            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[ring.radius - 0.4, ring.radius + 0.4, 64]} />
              <meshBasicMaterial 
                color={ring.glowColor}
                transparent
                opacity={0.5}
                side={THREE.DoubleSide}
                blending={THREE.AdditiveBlending}
              />
            </mesh>

            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[ring.radius - 0.8, ring.radius + 0.8, 64]} />
              <meshBasicMaterial 
                color={ring.glowColor}
                transparent
                opacity={0.2}
                side={THREE.DoubleSide}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
          </group>
        ))
      )}

      {isSelected && (
        <>
          <ambientLight intensity={1} />
          <pointLight position={[0, 30, 0]} intensity={2} distance={100} />
          <pointLight position={[0, -30, 0]} intensity={2} distance={100} />
          <pointLight position={[30, 0, 0]} intensity={2} distance={100} />
          <pointLight position={[-30, 0, 0]} intensity={2} distance={100} />

          {ORBIT_RANGES.map((orbit, i) => (
            <group key={`orbit-${i}`} renderOrder={0}>
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <ringGeometry args={[orbit.radius - orbit.width/2, orbit.radius + orbit.width/2, 128]} />
                <meshBasicMaterial 
                  transparent 
                  opacity={0.8}
                  color="#FFF8E7"
                  side={THREE.DoubleSide}
                  blending={THREE.AdditiveBlending}
                  depthWrite={false}
                />
              </mesh>
              
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

      {!isSelected && isInitialized && (
        <Html
          position={[FIXED_GALAXY_SIZE * 0.8, FIXED_GALAXY_SIZE * 0.3, 0]}
          style={{
            transform: 'translate(0, -50%)',
            opacity: nameOpacity,
            transition: 'opacity 0.3s ease-out'
          }}
        >
          <div className="galaxy-label-container">
            <div className="galaxy-name">
              {galaxyName}
            </div>
            <div className="galaxy-underline" />
          </div>
        </Html>
      )}
    </group>
  );
};

export default memo(SpiralGalaxy);