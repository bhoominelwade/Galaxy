import { useRef, useState, memo, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import ZoomedGalaxy from './ZoomedGalaxy';
import '../styles/galaxy.css';
import { PREFIXES, SUFFIXES, GALAXY_COLORS } from './GalaxyStyles';

const FIXED_GALAXY_SIZE = 8;

// Map to store galaxy names by their positions
const galaxyNameCache = new Map();

const generateGalaxyName = (key) => {
  if (galaxyNameCache.has(key)) {
    return galaxyNameCache.get(key);
  }

  const prefix = PREFIXES[Math.floor(Math.random() * PREFIXES.length)];
  const number = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  const suffix = Math.random() < 0.3 ? SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)] : '';
  const name = `${prefix}-${number}${suffix ? `-${suffix}` : ''}`;
  
  galaxyNameCache.set(key, name);
  return name;
};

const SpiralGalaxy = ({ 
  transactions, 
  position, 
  onClick, 
  isSelected, 
  colorIndex = 0, 
  highlightedHash, 
  lodLevel = 'HIGH' 
}) => {
  const { camera } = useThree();
  const groupRef = useRef();
  const [nameOpacity, setNameOpacity] = useState(0.7);
  const [isInitialized, setIsInitialized] = useState(false);
  const [hoveredPlanet, setHoveredPlanet] = useState(null);
  const safeColorIndex = Math.abs(colorIndex) % GALAXY_COLORS.length;
  const colorScheme = GALAXY_COLORS[safeColorIndex] || GALAXY_COLORS[0];

  const galaxyKey = useMemo(() => `galaxy-${position.join('-')}`, [position]);
  const galaxyName = useMemo(() => generateGalaxyName(galaxyKey), [galaxyKey]);

  useEffect(() => {
    if (groupRef.current && !isInitialized) {
      setNameOpacity(0.7);
      setIsInitialized(true);
    }
  }, [isInitialized]);

  useFrame(() => {
    if (groupRef.current && isInitialized) {
      const distance = groupRef.current.position.distanceTo(camera.position);
      const opacity = Math.max(0.5, Math.min(0.9, 40 / distance));
      setNameOpacity(opacity);
      
      const rotationSpeed = isSelected ? 0.05 : 0.2;
      groupRef.current.rotation.y += rotationSpeed * 0.02;
    }
  });

  const createMinimalGalaxy = () => {
    const numRings = 4;
    const rings = [];
    const baseRadius = FIXED_GALAXY_SIZE;
    const coreColor = new THREE.Color(colorScheme.core);
    coreColor.multiplyScalar(1.5); // Make core brighter

    for (let i = 0; i < numRings; i++) {
      const radius = ((i + 1) / numRings) * baseRadius;
      const ringColor = new THREE.Color(colorScheme.arms[i % colorScheme.arms.length]);
      ringColor.multiplyScalar(1.2); // Slightly increase arm brightness
      
      rings.push({
        radius,
        color: ringColor,
        glowColor: ringColor.clone().multiplyScalar(0.8)
      });
    }
    
    return rings;
  };

  return (
    <group ref={groupRef} position={position} onClick={onClick}>
      {/* Core with enhanced glow */}
      <mesh>
        <sphereGeometry args={[isSelected ? 2 : 0.8, 32, 32]} />
        <meshBasicMaterial 
          color={colorScheme.core}
          transparent
          opacity={0.9}
        />
      </mesh>
      
      {/* Core glow */}
      <mesh>
        <sphereGeometry args={[isSelected ? 2.2 : 1, 32, 32]} />
        <meshBasicMaterial
          color={colorScheme.core}
          transparent
          opacity={0.4}
          blending={THREE.AdditiveBlending}
        />
        <pointLight color={colorScheme.core} intensity={3} distance={50} decay={2} />
      </mesh>

      {isSelected ? (
        <ZoomedGalaxy
          colorScheme={colorScheme}
          transactions={transactions}
          safeColorIndex={safeColorIndex}
          highlightedHash={highlightedHash}
          setHoveredPlanet={setHoveredPlanet}
          lodLevel={lodLevel}
        />
      ) : (
        createMinimalGalaxy().map((ring, index) => (
          <group key={`ring-${index}`}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[ring.radius - 0.1, ring.radius + 0.1, 64]} />
              <meshBasicMaterial 
                color={ring.color}
                transparent
                opacity={0.8}
                side={THREE.DoubleSide}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
          </group>
        ))
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
            <div className="galaxy-underline" 
              style={{
                backgroundColor: colorScheme.core,
                boxShadow: `0 0 10px ${colorScheme.core}`
              }}
            />
          </div>
        </Html>
      )}
    </group>
  );
};

export default memo(SpiralGalaxy);