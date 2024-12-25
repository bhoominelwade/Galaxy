import { useRef, useState, memo, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import ZoomedGalaxy from './ZoomedGalaxy';
import '../styles/galaxy.css';
import { PREFIXES, SUFFIXES, GALAXY_COLORS } from './GalaxyStyles';

const LOD_LEVELS = {
 LOW: { segments: 16, ringSegments: 32 },
 MEDIUM: { segments: 24, ringSegments: 48 },
 HIGH: { segments: 32, ringSegments: 64 }
};

const FIXED_GALAXY_SIZE = 8;
const MINIMAL_RINGS = 4;
const NAME_OPACITY_BASE = 0.7;
const MAX_RENDER_DISTANCE = 200;
const galaxyNameCache = new Map();

const generateGalaxyName = (key) => {
 if (galaxyNameCache.has(key)) return galaxyNameCache.get(key);
 const prefix = PREFIXES[Math.floor(Math.random() * PREFIXES.length)];
 const number = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
 const suffix = Math.random() < 0.3 ? SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)] : '';
 const name = `${prefix}-${number}${suffix ? `-${suffix}` : ''}`;
 galaxyNameCache.set(key, name);
 return name;
};

const SpiralGalaxy = ({ transactions, position, onClick, isSelected, colorIndex = 0, highlightedHash, lodLevel = 'MEDIUM' }) => {
 const { camera } = useThree();
 const groupRef = useRef();
 const [nameOpacity, setNameOpacity] = useState(NAME_OPACITY_BASE);
 const [isInitialized, setIsInitialized] = useState(false);
 const [hoveredPlanet, setHoveredPlanet] = useState(null);

 const safeColorIndex = Math.abs(colorIndex) % GALAXY_COLORS.length;
 const colorScheme = GALAXY_COLORS[safeColorIndex] || GALAXY_COLORS[0];
 const settings = LOD_LEVELS[lodLevel] || LOD_LEVELS.MEDIUM;

 const galaxyKey = useMemo(() => `galaxy-${position.join('-')}`, [position]);
 const galaxyName = useMemo(() => generateGalaxyName(galaxyKey), [galaxyKey]);

 useEffect(() => {
   if (groupRef.current && !isInitialized) {
     setNameOpacity(NAME_OPACITY_BASE);
     setIsInitialized(true);
   }
 }, [isInitialized]);

 useFrame(() => {
   if (!groupRef.current || !isInitialized) return;

   const distance = groupRef.current.position.distanceTo(camera.position);
   if (distance > MAX_RENDER_DISTANCE) return;

   const opacity = Math.max(0.5, Math.min(0.9, 40 / distance));
   setNameOpacity(opacity);
   
   const rotationSpeed = isSelected ? 
     0.03 * (50 / Math.max(distance, 1)) : 
     0.1 * (50 / Math.max(distance, 1));
   groupRef.current.rotation.y += rotationSpeed * 0.01;
 });

 const createMinimalGalaxy = () => {
   const rings = [];
   const baseRadius = FIXED_GALAXY_SIZE;

   for (let i = 0; i < MINIMAL_RINGS; i++) {
     const radius = ((i + 1) / MINIMAL_RINGS) * baseRadius;
     const ringColor = new THREE.Color(colorScheme.arms[i % colorScheme.arms.length])
       .multiplyScalar(1.1);
     rings.push({
       radius,
       color: ringColor,
       glowColor: ringColor.clone().multiplyScalar(0.7)
     });
   }
   return rings;
 };

 const handleGalaxyClick = (e) => {
   e.stopPropagation();
   if (!isSelected) onClick();
 };

 return (
   <group 
     ref={groupRef} 
     position={position}
     onClick={handleGalaxyClick}
     style={{ cursor: !isSelected ? 'pointer' : 'default' }}
   >
     <mesh onClick={handleGalaxyClick}>
       <sphereGeometry args={[isSelected ? 2 : 0.8, settings.segments, settings.segments]} />
       <meshBasicMaterial color={colorScheme.core} transparent opacity={0.8} />
     </mesh>
     
     <mesh onClick={handleGalaxyClick}>
       <sphereGeometry args={[isSelected ? 2.2 : 1, settings.segments, settings.segments]} />
       <meshBasicMaterial
         color={colorScheme.core}
         transparent
         opacity={0.3}
         blending={THREE.AdditiveBlending}
       />
       <pointLight color={colorScheme.core} intensity={2} distance={40} decay={2} />
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
         <group key={`ring-${index}`} onClick={handleGalaxyClick}>
           <mesh rotation={[Math.PI / 2, 0, 0]}>
             <ringGeometry args={[ring.radius - 0.1, ring.radius + 0.1, settings.ringSegments]} />
             <meshBasicMaterial 
               color={ring.color}
               transparent
               opacity={0.6}
               side={THREE.DoubleSide}
               blending={THREE.AdditiveBlending}
             />
           </mesh>
         </group>
       ))
     )}

     {!isSelected && isInitialized && distance <= MAX_RENDER_DISTANCE && (
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
               boxShadow: `0 0 8px ${colorScheme.core}`
             }}
           />
         </div>
       </Html>
     )}
   </group>
 );
};

export default memo(SpiralGalaxy);