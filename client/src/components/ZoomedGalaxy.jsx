import React, { useRef, useMemo, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import Planet from './Planet';

const BASE_ORBIT_RANGES = [
  { minRadius: 10, maxRadius: 15, tilt: 3.4 },
  { minRadius: 18, maxRadius: 24, tilt: 2.2 },
  { minRadius: 25, maxRadius: 32, tilt: 1.8 },
  { minRadius: 33, maxRadius: 40, tilt: 1.9 },
  { minRadius: 41, maxRadius: 48, tilt: 1.3 },
  { minRadius: 49, maxRadius: 56, tilt: 2.5 }
];

const generateOrbitPath = (baseRadius, tilt, segments = 128, seed = 0) => {
  const points = [];
  const random = (x) => Math.sin(seed * 1000 + x * 100) * 0.5 + 0.5;
  const ellipticalStretch = 0.1 + random(0) * 0.2;
  const verticalTilt = random(1) * Math.PI * 0.15;
  
  const tiltMatrix = new THREE.Matrix4().makeRotationX(THREE.MathUtils.degToRad(tilt + random(2) * 10));
  const planarMatrix = new THREE.Matrix4().makeRotationY(verticalTilt);
  
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const r = baseRadius * (1 + Math.sin(angle) * ellipticalStretch);
    
    let x = r * Math.cos(angle);
    let y = Math.sin(angle * 2) * baseRadius * 0.05;
    let z = r * Math.sin(angle);
    
    const point = new THREE.Vector3(x, y, z);
    point.applyMatrix4(tiltMatrix);
    point.applyMatrix4(planarMatrix);
    
    points.push(point);
  }
  
  return points;
};

const getPositionOnOrbit = (points, progress) => {
  if (!points || points.length === 0) {
    return new THREE.Vector3(0, 0, 0);
  }

  const safeProgress = Math.max(0, Math.min(1, progress));
  const index = Math.floor(safeProgress * (points.length - 1));
  const nextIndex = (index + 1) % points.length;
  const fraction = safeProgress * (points.length - 1) - index;

  if (!points[index] || !points[nextIndex]) {
    return points[0] ? points[0].clone() : new THREE.Vector3(0, 0, 0);
  }

  const point = points[index].clone();
  const nextPoint = points[nextIndex].clone();
  
  return point.lerp(nextPoint, fraction);
};

const ZoomedGalaxy = ({ 
  colorScheme, 
  transactions, 
  safeColorIndex = 0, 
  highlightedHash,
  setHoveredPlanet,
  lodLevel = 'HIGH' 
}) => {
  const { gl, scene, camera } = useThree();
  const coreRef = useRef();
  const glowRef = useRef();
  const composerRef = useRef();

  const orbitRanges = useMemo(() => {
    try {
      return BASE_ORBIT_RANGES.map((base, index) => {
        const baseRadius = base.minRadius + (base.maxRadius - base.minRadius) * Math.random();
        const points = generateOrbitPath(baseRadius, base.tilt, 128, index + safeColorIndex);
        
        if (!points || points.length === 0) {
          return null;
        }

        return {
          ...base,
          radius: baseRadius,
          points: points
        };
      }).filter(Boolean);
    } catch (error) {
      console.error('Error generating orbit ranges:', error);
      return [];
    }
  }, [safeColorIndex]);

  const planetPositions = useMemo(() => {
    if (!orbitRanges || orbitRanges.length === 0 || !transactions || !transactions.length) {
      return [];
    }

    const positions = [];
    
    for (let i = 0; i < transactions.length; i++) {
      const tx = transactions[i];
      if (!tx) continue;
      
      const orbitIndex = Math.floor(i / (transactions.length / orbitRanges.length));
      const orbit = orbitRanges[orbitIndex % orbitRanges.length];
      
      if (!orbit || !orbit.points) {
        continue;
      }

      const hashValue = tx.hash ? parseInt(tx.hash.slice(-4), 16) : 0;
      const randomOffset = (hashValue % 100) / 1000;
      const progress = ((i / transactions.length) + randomOffset) % 1;
      
      try {
        const position = getPositionOnOrbit(orbit.points, progress);
        positions.push({
          transaction: tx,
          position: [position.x, position.y, position.z],
          orbitIndex
        });
      } catch (error) {
        console.error('Error positioning planet:', error);
      }
    }
    
    return positions;
  }, [transactions, orbitRanges]);

  useEffect(() => {
    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.5,
      0.4,
      0.85
    );
    
    const composer = new EffectComposer(gl);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);
    composerRef.current = composer;

    return () => {
      composer.dispose();
    };
  }, [scene, camera, gl]);

  useFrame(() => {
    if (coreRef.current) {
      coreRef.current.rotation.y += 0.005;
    }
    if (glowRef.current) {
      glowRef.current.rotation.y -= 0.003;
    }
    if (composerRef.current) {
      composerRef.current.render();
    }
  });

  return (
    <>
      <group>
        <mesh ref={coreRef}>
          <icosahedronGeometry args={[2, 15]} />
          <meshStandardMaterial
            color={colorScheme?.core}
            emissive={colorScheme?.core}
            emissiveIntensity={0.5}
          />
          <pointLight 
            color={colorScheme?.core}
            intensity={3.0}
            distance={50}
            decay={2}
          />
        </mesh>

        <mesh ref={glowRef} scale={[1.2, 1.2, 1.2]}>
          <sphereGeometry args={[2, 32, 32]} />
          <meshStandardMaterial
            color={colorScheme?.core}
            transparent
            opacity={0.3}
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
            opacity={0.2}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </line>
      ))}

      {planetPositions.map(({ transaction, position }, index) => (
        <Planet
          key={transaction.hash}
          transaction={transaction}
          position={position}
          isHighlighted={transaction.hash === highlightedHash}
          onHover={(isHovered) => setHoveredPlanet(isHovered ? transaction : null)}
          lodLevel={lodLevel}
        />
      ))}

      <ambientLight intensity={0.5} />
      <pointLight position={[0, 30, 0]} intensity={2} distance={100} />
      <pointLight position={[0, -30, 0]} intensity={2} distance={100} />
    </>
  );
};

export default React.memo(ZoomedGalaxy);