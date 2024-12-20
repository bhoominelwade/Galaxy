import { useRef, useMemo, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import Planet from './Planet';

// Base orbit definitions with realistic tilts
// Base ranges for orbit generation
const BASE_ORBIT_RANGES = [
  { baseRadius: 12, minRadius: 10, maxRadius: 15, tilt: 3.4, eccentricity: 0.02 },   // Mercury-like
  { baseRadius: 20, minRadius: 18, maxRadius: 24, tilt: 2.2, eccentricity: 0.007 },  // Venus-like
  { baseRadius: 28, minRadius: 25, maxRadius: 32, tilt: 0, eccentricity: 0.017 },    // Earth-like
  { baseRadius: 36, minRadius: 33, maxRadius: 40, tilt: 1.9, eccentricity: 0.093 },  // Mars-like
  { baseRadius: 44, minRadius: 41, maxRadius: 48, tilt: 1.3, eccentricity: 0.048 },  // Jupiter-like
  { baseRadius: 52, minRadius: 49, maxRadius: 56, tilt: 2.5, eccentricity: 0.054 }   // Saturn-like
];

const CORE_COLOR = new THREE.Color('#FDB813');
const GLOW_COLOR = new THREE.Color('#FFE5B4');

// Shader code remains the same as before
const glowVertexShader = `
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = viewPosition.xyz;
    gl_Position = projectionMatrix * viewPosition;
  }
`;

const glowFragmentShader = `
  uniform vec3 color;
  uniform float intensity;
  uniform float falloff;
  uniform float maxRadius;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  void main() {
    float distanceFromCenter = length(vViewPosition) / maxRadius;
    float viewAngle = abs(dot(normalize(-vViewPosition), vNormal));
    float glow = pow(1.0 - viewAngle, falloff) * intensity;
    glow *= smoothstep(1.0, 0.0, distanceFromCenter);
    gl_FragColor = vec4(color, glow);
  }
`;

// Function to generate realistic orbital paths
const generateOrbitPath = (baseRadius, tilt, eccentricity, segments = 128, seed = 0) => {
  const points = [];
  const semiMinorAxis = baseRadius * Math.sqrt(1 - eccentricity * eccentricity);
  const center = baseRadius * eccentricity;
  
  // Create rotation matrices for tilt
  const tiltMatrix = new THREE.Matrix4().makeRotationX(THREE.MathUtils.degToRad(tilt));
  
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    
    // Calculate elliptical orbit position
    const r = (baseRadius * (1 - eccentricity * eccentricity)) / 
              (1 + eccentricity * Math.cos(angle));
    
    let x = r * Math.cos(angle);
    let y = 0;
    let z = r * Math.sin(angle);
    
    // Apply tilt rotation
    const point = new THREE.Vector3(x, y, z);
    point.applyMatrix4(tiltMatrix);
    
    points.push(point);
  }
  
  return points;
};

const generateOrbitRanges = (safeColorIndex) => {
  // Use safeColorIndex as a seed for consistent randomness per galaxy
  const systemScale = 1 + (Math.sin(safeColorIndex * 1000) * 0.3);
  
  return BASE_ORBIT_RANGES.map((base, index) => {
    // Generate a unique random value for each orbit using the safeColorIndex as seed
    const randomSeed = Math.sin(safeColorIndex * 1000 + index * 100);
    const normalizedRandom = (randomSeed + 1) / 2; // Convert to 0-1 range
    
    // Calculate random radius within min-max bounds
    const minRadius = base.minRadius * systemScale;
    const maxRadius = base.maxRadius * systemScale;
    const randomRadius = minRadius + (normalizedRandom * (maxRadius - minRadius));
    
    return {
      ...base,
      radius: randomRadius,
      points: generateOrbitPath(
        randomRadius,
        base.tilt,
        base.eccentricity,
        128,
        safeColorIndex + index
      )
    };
  });
};

const getPositionOnOrbit = (orbitPoints, progress) => {
  const index = Math.floor(progress * (orbitPoints.length - 1));
  const nextIndex = (index + 1) % orbitPoints.length;
  const fraction = progress * (orbitPoints.length - 1) - index;
  
  const point = orbitPoints[index].clone();
  const nextPoint = orbitPoints[nextIndex].clone();
  
  return point.lerp(nextPoint, fraction);
};

const ZoomedGalaxy = ({ 
  colorScheme, 
  transactions, 
  safeColorIndex, 
  highlightedHash, 
  setHoveredPlanet,
  lodLevel = 'HIGH' 
}) => {
  const { gl, scene, camera } = useThree();
  const coreRef = useRef();
  const glowRefs = useRef([]);
  const composerRef = useRef();
  const orbitLinesRef = useRef([]);

  // Generate orbits based on safeColorIndex
  const orbitRanges = useMemo(() => 
    generateOrbitRanges(safeColorIndex),
    [safeColorIndex]
  );

  // Post-processing setup
  useEffect(() => {
    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      2.0,
      0.4,
      0.85
    );
    bloomPass.threshold = 0.0;
    bloomPass.strength = 2.0;
    bloomPass.radius = 0.5;

    const composer = new EffectComposer(gl);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);
    composerRef.current = composer;

    return () => {
      composer.dispose();
    };
  }, [scene, camera, gl]);

  // Animation frame updates
  useFrame((state) => {
    if (coreRef.current) {
      coreRef.current.rotation.y += 0.0005;
    }
    glowRefs.current.forEach((ref, index) => {
      if (ref) {
        ref.rotation.y += 0.0005;
        ref.rotation.z += 0.0002;
      }
    });
    if (composerRef.current) {
      composerRef.current.render();
    }
  });

  // Galaxy arm geometry
  const galaxyGeometry = useMemo(() => {
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
    
    return { points, particleColors, sizes };
  }, [colorScheme, safeColorIndex]);

  // Planet positioning
  const planetPositions = useMemo(() => {
    const MIN_SEPARATION = 3;
    const occupiedSpaces = new Set();
    const positions = [];
    const visibleCount = Math.min(transactions.length, 30);
    
    const topTransactions = [...transactions]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, visibleCount)
      .filter(tx => tx.amount > 0);
    
    for (let i = 0; i < topTransactions.length; i++) {
      const tx = topTransactions[i];
      if (!tx) continue;
      
      const orbitIndex = Math.floor(i / (topTransactions.length / orbitRanges.length));
      const orbit = orbitRanges[orbitIndex % orbitRanges.length];
      
      // Calculate position on orbit with slight variation
      const progress = (i / topTransactions.length);
      const position = getPositionOnOrbit(orbit.points, progress);
      
      const gridX = Math.round(position.x / MIN_SEPARATION);
      const gridZ = Math.round(position.z / MIN_SEPARATION);
      const spaceKey = `${gridX},${gridZ}`;
      
      if (!occupiedSpaces.has(spaceKey)) {
        occupiedSpaces.add(spaceKey);
        positions.push({
          transaction: tx,
          position: [position.x, position.y, position.z],
          orbitIndex
        });
      }
    }
  
    return positions;
  }, [transactions, orbitRanges]);

  // Glow layer generation
  const glowLayers = useMemo(() => {
    const layers = [];
    const numLayers = 4;
    
    for (let i = 0; i < numLayers; i++) {
      const scale = 1 + (i * 1.2);
      const intensity = 0.8 - (i * 0.15);
      const falloff = 2.5 + (i * 1.0);
      
      layers.push({
        scale,
        intensity,
        falloff,
        radius: orbitRanges[0].radius * (scale / numLayers)
      });
    }
    
    return layers;
  }, [orbitRanges]);

  // Orbit line geometries
  const orbitGeometries = useMemo(() => 
    orbitRanges.map(orbit => {
      const geometry = new THREE.BufferGeometry().setFromPoints(orbit.points);
      return geometry;
    }), 
    [orbitRanges]
  );

  return (
    <>
      {/* Core */}
      <group>
        <mesh ref={coreRef}>
          <icosahedronGeometry args={[2, 15]} />
          <meshBasicMaterial
            color={CORE_COLOR}
            transparent
            opacity={1.0}
          />
          <pointLight 
            color={CORE_COLOR} 
            intensity={3.0}
            distance={50}
            decay={2}
          />
        </mesh>

        {/* Glow layers */}
        {glowLayers.map((layer, index) => (
          <mesh
            key={`glow-${index}`}
            ref={el => glowRefs.current[index] = el}
            scale={[layer.scale, layer.scale, layer.scale]}
          >
            <sphereGeometry args={[2, 32, 32]} />
            <shaderMaterial
              uniforms={{
                color: { value: GLOW_COLOR },
                intensity: { value: layer.intensity },
                falloff: { value: layer.falloff },
                maxRadius: { value: layer.radius }
              }}
              vertexShader={glowVertexShader}
              fragmentShader={glowFragmentShader}
              transparent={true}
              side={THREE.BackSide}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        ))}

        {/* Corona */}
        <mesh>
          <sphereGeometry args={[2.2, 32, 32]} />
          <meshBasicMaterial
            color={GLOW_COLOR}
            transparent
            opacity={0.3}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
        <mesh>
          <sphereGeometry args={[2.5, 32, 32]} />
          <meshBasicMaterial
            color={GLOW_COLOR}
            transparent
            opacity={0.1}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>

      {/* Galaxy points */}
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={galaxyGeometry.points.length}
            array={new Float32Array(galaxyGeometry.points.flatMap(p => [p.x, p.y, p.z]))}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={galaxyGeometry.particleColors.length / 3}
            array={new Float32Array(galaxyGeometry.particleColors)}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-size"
            count={galaxyGeometry.sizes.length}
            array={new Float32Array(galaxyGeometry.sizes)}
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

      {/* Orbit lines */}
      {orbitGeometries.map((geometry, i) => (
        <line key={`orbit-${i}`} ref={el => orbitLinesRef.current[i] = el}>
          <bufferGeometry attach="geometry" {...geometry} />
          <lineBasicMaterial
            attach="material"
            color="#FFF8E7"
            transparent
            opacity={0.2}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </line>
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

      {/* Lighting */}
      <ambientLight intensity={1} />
      <pointLight position={[0, 30, 0]} intensity={2} distance={100} />
      <pointLight position={[0, -30, 0]} intensity={2} distance={100} />
      <pointLight position={[30, 0, 0]} intensity={2} distance={100} />
      <pointLight position={[-30, 0, 0]} intensity={2} distance={100} />
    </>
  );
};

export default ZoomedGalaxy;