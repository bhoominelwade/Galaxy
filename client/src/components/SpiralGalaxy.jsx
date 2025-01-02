import { useRef, useState, memo, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import ZoomedGalaxy from './ZoomedGalaxy';
import '../styles/galaxy.css';
import { PREFIXES, SUFFIXES, GALAXY_COLORS } from './GalaxyStyles';

const FIXED_GALAXY_SIZE = 8;
const MINIMAL_RINGS = 4;
const NAME_OPACITY_BASE = 0.7;
const HOVER_THRESHOLD = 200;

const galaxyNameCache = new Map();

const generateGalaxyName = (key) => {
  if (galaxyNameCache.has(key)) return galaxyNameCache.get(key);

  const prefix = PREFIXES[Math.floor(Math.random() * PREFIXES.length)];
  const number = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  const suffix = Math.random() < 0.3 ? 
    SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)] : '';
  
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
  lodLevel = 'HIGH',
  isMuted  // Add this prop
}) => {
  const { camera } = useThree();
  const groupRef = useRef();
  const [nameOpacity, setNameOpacity] = useState(NAME_OPACITY_BASE);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [hoveredPlanet, setHoveredPlanet] = useState(null);
  const [hoverSound] = useState(() => new Audio('/audio/glow2.mp3'));
  const hoverTimerRef = useRef(null);

  const safeColorIndex = Math.abs(colorIndex) % GALAXY_COLORS.length;
  const colorScheme = GALAXY_COLORS[safeColorIndex] || GALAXY_COLORS[0];

  const galaxyKey = useMemo(() => `galaxy-${position.join('-')}`, [position]);
  const galaxyName = useMemo(() => generateGalaxyName(galaxyKey), [galaxyKey]);

  useEffect(() => {
    hoverSound.volume = 0.2;
    hoverSound.loop = true;
  }, [hoverSound]);

  useEffect(() => {
    if (groupRef.current && !isInitialized) {
      setNameOpacity(NAME_OPACITY_BASE);
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
    const rings = [];
    const baseRadius = FIXED_GALAXY_SIZE;
    const coreColor = new THREE.Color(colorScheme.core).multiplyScalar(isHovered ? 4 : 1.5);

    for (let i = 0; i < MINIMAL_RINGS; i++) {
      const radius = ((i + 1) / MINIMAL_RINGS) * baseRadius;
      const ringColor = new THREE.Color(colorScheme.arms[i % colorScheme.arms.length])
        .multiplyScalar(isHovered ? 3 : 1.2);
      
      rings.push({
        radius,
        color: ringColor,
        glowColor: ringColor.clone().multiplyScalar(isHovered ? 2 : 0.8)
      });
    }
    
    return rings;
  };

  const handleGalaxyClick = (e) => {
    e.stopPropagation();
    if (!isSelected) onClick();
  };

  const handlePointerEnter = () => {
    if (isSelected) return;
    
    if (!isMuted) {
      hoverTimerRef.current = setTimeout(() => {
        setIsHovered(true);
        hoverSound.play().catch(err => console.log('Audio play failed:', err));
      }, HOVER_THRESHOLD);
    }
  };

  // Update volume effect
  useEffect(() => {
    hoverSound.volume = isMuted ? 0 : 0.2;
  }, [isMuted, hoverSound]);

  const handlePointerLeave = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setIsHovered(false);
    hoverSound.pause();
    hoverSound.currentTime = 0;
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
      hoverSound.pause();
    };
  }, [hoverSound]);

  return (
    <group ref={groupRef} position={position}>
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
        <>
          <mesh 
            onClick={handleGalaxyClick}
            onPointerEnter={(e) => {
              e.stopPropagation();
              handlePointerEnter();
              document.body.style.cursor = 'pointer';
            }}
            onPointerLeave={(e) => {
              e.stopPropagation();
              handlePointerLeave();
              document.body.style.cursor = 'auto';
            }}
          >
            <sphereGeometry args={[isHovered ? 2 : 1.5, 32, 32]} />
            <meshPhysicalMaterial 
              color={colorScheme.core}
              emissive={colorScheme.core}
              emissiveIntensity={isHovered ? 4 : 2}
              metalness={0.2}
              roughness={0.3}
              clearcoat={1}
            />
          </mesh>
   
          {isHovered && (
            <pointLight
              color={colorScheme.core}
              intensity={50}
              distance={160} 
              decay={1.5}
            />
          )}
   
          <mesh>
            <sphereGeometry args={[isHovered ? 2.4 : 1.9, 32, 32]} />
            <meshBasicMaterial
              color={colorScheme.core}
              transparent
              opacity={0.12}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
   
          {!isSelected && isInitialized && (
            <Html
              position={[FIXED_GALAXY_SIZE * 0.8, FIXED_GALAXY_SIZE * 0.3, 0]}
              style={{
                transform: 'translate(0, -50%)',
                opacity: nameOpacity,
                transition: 'opacity 0.3s ease-out'
              }}
              onClick={handleGalaxyClick}
            >
              <div className="galaxy-label-container">
                <div className="galaxy-name">{galaxyName}</div>
                <div 
                  className="galaxy-underline" 
                  style={{
                    backgroundColor: colorScheme.core,
                    boxShadow: `0 0 ${isHovered ? '25px' : '10px'} ${colorScheme.core}`,
                    opacity: isHovered ? 1 : 0.8
                  }}
                />
              </div>
            </Html>
          )}
        </>
      )}
    </group>
   );
};

export default memo(SpiralGalaxy);