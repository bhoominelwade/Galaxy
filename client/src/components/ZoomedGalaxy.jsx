import React, { useRef, useMemo, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import Planet from './Planet';

const LOD_LEVELS = {
  LOW: { segments: 32, maxPlanets: 40, geometryDetail: 6 },
  MEDIUM: { segments: 48, maxPlanets: 60, geometryDetail: 8 },
  HIGH: { segments: 64, maxPlanets: 80, geometryDetail: 10 }
};

const BASE_ORBIT_RANGES = [
  { minRadius: 15, maxRadius: 20, tilt: 3.4 },  
  { minRadius: 25, maxRadius: 30, tilt: 2.2 },  
  { minRadius: 35, maxRadius: 40, tilt: 1.8 },  
  { minRadius: 45, maxRadius: 50, tilt: 1.9 },  
  { minRadius: 55, maxRadius: 60, tilt: 1.3 },  
  { minRadius: 65, maxRadius: 70, tilt: 2.5 }   
];

const MIN_PLANET_DISTANCE = 10;
const MAX_VISIBLE_DISTANCE = 150;

const generateOrbitPath = (baseRadius, tilt, lodLevel, seed = 0) => {
  const segments = LOD_LEVELS[lodLevel]?.segments || LOD_LEVELS.MEDIUM.segments;
  const points = [];
  const random = (x) => Math.sin(seed * 1000 + x * 100) * 0.5 + 0.5;
  const ellipticalStretch = 0.1 + random(0) * 0.2;
  const verticalTilt = random(1) * Math.PI * 0.15;
  
  const tiltMatrix = new THREE.Matrix4().makeRotationX(THREE.MathUtils.degToRad(tilt + random(2) * 10));
  const planarMatrix = new THREE.Matrix4().makeRotationY(verticalTilt);
  
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const r = baseRadius * (1 + Math.sin(angle) * ellipticalStretch);
    const point = new THREE.Vector3(
      r * Math.cos(angle),
      Math.sin(angle * 2) * baseRadius * 0.05,
      r * Math.sin(angle)
    );
    point.applyMatrix4(tiltMatrix).applyMatrix4(planarMatrix);
    points.push(point);
  }
  return points;
};

const findSafePosition = (orbit, baseProgress, existingPositions) => {
  const segmentSize = 1 / 20;
  let bestPosition = null;
  let bestDistance = 0;
  
  for (let attempt = 0; attempt < 20; attempt++) {
    const offset = (attempt * segmentSize) % 1;
    const progress = (baseProgress + offset) % 1;
    const position = getPositionOnOrbit(orbit.points, progress);
    const pos = [position.x, position.y, position.z];
    
    let minDistance = Infinity;
    for (const existing of existingPositions) {
      const distance = Math.sqrt(
        Math.pow(pos[0] - existing[0], 2) +
        Math.pow(pos[1] - existing[1], 2) +
        Math.pow(pos[2] - existing[2], 2)
      );
      minDistance = Math.min(minDistance, distance);
    }
    
    if (minDistance > bestDistance) {
      bestDistance = minDistance;
      bestPosition = pos;
      if (minDistance >= MIN_PLANET_DISTANCE) return pos;
    }
  }
  
  return bestPosition;
};

const getPositionOnOrbit = (points, progress) => {
  if (!points?.length) return new THREE.Vector3();
  const safeProgress = Math.max(0, Math.min(1, progress));
  const index = Math.floor(safeProgress * (points.length - 1));
  const nextIndex = (index + 1) % points.length;
  const fraction = safeProgress * (points.length - 1) - index;
  return points[index]?.clone().lerp(points[nextIndex] || points[index], fraction) || new THREE.Vector3();
};

const ZoomedGalaxy = ({ colorScheme, transactions, safeColorIndex = 0, highlightedHash, setHoveredPlanet, lodLevel = 'MEDIUM' }) => {
  const { gl, scene, camera } = useThree();
  const coreRef = useRef();
  const glowRef = useRef();
  const composerRef = useRef();

  const orbitRanges = useMemo(() => {
    return BASE_ORBIT_RANGES.map((base, index) => {
      const baseRadius = base.minRadius + (base.maxRadius - base.minRadius) * Math.random();
      const points = generateOrbitPath(baseRadius, base.tilt, lodLevel, index + safeColorIndex);
      return points?.length ? { ...base, radius: baseRadius, points } : null;
    }).filter(Boolean);
  }, [safeColorIndex, lodLevel]);

  const planetPositions = useMemo(() => {
    if (!orbitRanges?.length || !transactions?.length) return [];
    
    const maxPlanets = LOD_LEVELS[lodLevel]?.maxPlanets || LOD_LEVELS.MEDIUM.maxPlanets;
    const stride = Math.ceil(transactions.length / maxPlanets);
    const positions = [];
    const existingPositions = [];
    
    transactions
      .filter((_, i) => i % stride === 0)
      .forEach((tx, i) => {
        const orbitIndex = i % orbitRanges.length;
        const orbit = orbitRanges[orbitIndex];
        if (!orbit?.points) return;

        const baseProgress = i / (transactions.length / stride);
        const position = findSafePosition(orbit, baseProgress, existingPositions);
        
        if (position) {
          const dist = Math.sqrt(position[0] * position[0] + position[1] * position[1] + position[2] * position[2]);
          if (dist < MAX_VISIBLE_DISTANCE) {
            existingPositions.push(position);
            positions.push({
              transaction: tx,
              position,
              orbitIndex
            });
          }
        }
      });
    
    return positions;
  }, [transactions, orbitRanges, lodLevel]);

  useEffect(() => {
    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2),
      0.8,
      0.3,
      0.75
    );
    
    const composer = new EffectComposer(gl);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);
    composerRef.current = composer;

    return () => composer.dispose();
  }, [scene, camera, gl]);

  useFrame(() => {
    if (coreRef.current) coreRef.current.rotation.y += 0.002;
    if (glowRef.current) glowRef.current.rotation.y -= 0.001;
    if (composerRef.current) composerRef.current.render();
  });

  const geometryDetail = LOD_LEVELS[lodLevel]?.geometryDetail || LOD_LEVELS.MEDIUM.geometryDetail;

  return (
    <>
      <group>
        <mesh ref={coreRef}>
          <icosahedronGeometry args={[2, geometryDetail]} />
          <meshStandardMaterial
            color={colorScheme?.core}
            emissive={colorScheme?.core}
            emissiveIntensity={0.3}
          />
          <pointLight color={colorScheme?.core} intensity={2} distance={30} decay={2} />
        </mesh>

        <mesh ref={glowRef} scale={[1.2, 1.2, 1.2]}>
          <sphereGeometry args={[2, 12, 12]} />
          <meshStandardMaterial
            color={colorScheme?.core}
            transparent
            opacity={0.2}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>

      {orbitRanges.map((orbit, i) => (
        <line key={`orbit-${i}`}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={orbit.points.length}
              array={new Float32Array(orbit.points.flatMap(p => [p.x, p.y, p.z]))}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial
            color="#FFF8E7"
            transparent
            opacity={0.1}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </line>
      ))}

      {planetPositions.map(({ transaction, position }) => (
        <Planet
          key={transaction.hash}
          transaction={transaction}
          position={position}
          isHighlighted={transaction.hash === highlightedHash}
          onHover={(isHovered) => setHoveredPlanet(isHovered ? transaction : null)}
          lodLevel={lodLevel}
        />
      ))}

      <ambientLight intensity={0.3} />
      <pointLight position={[0, 25, 0]} intensity={1} distance={60} />
      <pointLight position={[0, -25, 0]} intensity={1} distance={60} />
    </>
  );
};

export default React.memo(ZoomedGalaxy);