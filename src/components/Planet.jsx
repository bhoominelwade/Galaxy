import React, { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

const STANDARD_PLANET_SIZE = 1.2; // Base size for medium transactions
const MAX_PLANET_SIZE = 2.5;    // Maximum size cap
const MIN_PLANET_SIZE = 0.6;    // Minimum size cap
const ROTATION_SPEED = 0.01;
const MEDIA_PREFIX = 'https://brynmtchll.github.io/codepen-assets/solar-system/';
const SIZE_THRESHOLD = 10000; // Threshold for max size

const PLANET_TYPES = [
  {
    name: 'mercury',
    orbitRadius: 33,
    speed: 5,
  },
  {
    name: 'venus',
    orbitRadius: 48,
    speed: 3,
  },
  {
    name: 'earth',
    orbitRadius: 55,
    speed: 4,
  },
  {
    name: 'mars',
    orbitRadius: 72,
    speed: 2,
  },
  {
    name: 'jupiter',
    orbitRadius: 90,
    speed: 0.8,
  },
  {
    name: 'saturn',
    orbitRadius: 120,
    speed: 0.5,
    hasRings: true,
    ringColors: ['#3b2d27', '#876f5b', '#735c49', '#5e4a3d', '#3b2d27', '#241f1e', '#241f1e', '#735c49', '#735c49', '#735c49', '#5e4a3d', '#5e4a3d', '#3b2d27', '#3b2d27', '#3b2d27']
  },
  {
    name: 'uranus',
    orbitRadius: 140,
    speed: 0.4,
  },
  {
    name: 'neptune',
    orbitRadius: 180,
    speed: 0.2,
  }
];

const calculatePlanetSize = (amount) => {
  if (!amount) return STANDARD_PLANET_SIZE;
  
  // Convert to number if it's a string
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  // If amount exceeds threshold, return max size
  if (numericAmount >= SIZE_THRESHOLD) {
    return MAX_PLANET_SIZE;
  }
  
  // For amounts below threshold, use log scale with smooth scaling
  const logValue = Math.log10(numericAmount + 1);
  const logThreshold = Math.log10(SIZE_THRESHOLD);
  const normalizedSize = logValue / logThreshold;
  
  // Calculate size with smooth scaling
  const size = MIN_PLANET_SIZE + (normalizedSize * (MAX_PLANET_SIZE - MIN_PLANET_SIZE));
  
  return Math.max(MIN_PLANET_SIZE, Math.min(MAX_PLANET_SIZE, size));
};

const formatAmount = (amount) => {
  if (amount >= 1e9) return `${(amount / 1e9).toFixed(1)}B`;
  if (amount >= 1e6) return `${(amount / 1e6).toFixed(1)}M`;
  if (amount >= 1e3) return `${(amount / 1e3).toFixed(1)}K`;
  return amount.toFixed(1);
};

const createGridTexture = () => {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  ctx.fillStyle = 'transparent';
  ctx.fillRect(0, 0, size, size);
  
  ctx.strokeStyle = 'rgba(64, 224, 208, 0.15)';
  ctx.lineWidth = 0.3;
  
  for (let i = 0; i <= size; i += 16) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.stroke();
  }
  
  for (let i = 0; i <= size; i += 16) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
  }
  
  return new THREE.CanvasTexture(canvas);
};

const PlanetMesh = ({ planetType, transaction, onHover }) => {
  if (!planetType) return null;

  const planetRef = useRef();
  const glowRef = useRef();
  const ringsRef = useRef();
  const [hovered, setHovered] = useState(false);

  const planetSize = calculatePlanetSize(transaction?.amount);
  const ringScaleFactor = planetSize / STANDARD_PLANET_SIZE;

  const texture = useMemo(() => {
    const textureLoader = new THREE.TextureLoader();
    return textureLoader.load(
      `${MEDIA_PREFIX}${planetType.name}.jpeg`,
      undefined,
      undefined,
      (err) => console.error('Error loading texture:', err)
    );
  }, [planetType.name]);
  
  const gridTexture = useMemo(() => createGridTexture(), []);
  
  useFrame(() => {
    if (planetRef.current) {
      planetRef.current.rotation.y += ROTATION_SPEED;
    }
    if (glowRef.current) {
      glowRef.current.rotation.y -= ROTATION_SPEED * 0.5;
    }
    if (ringsRef.current) {
      ringsRef.current.rotation.z += ROTATION_SPEED * 0.5;
    }
  });

  return (
    <group>
      <mesh
        ref={planetRef}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          if (onHover) onHover(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
          if (onHover) onHover(false);
          document.body.style.cursor = 'auto';
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (transaction?.hash) {
            window.open(`https://solscan.io/tx/${transaction.hash}`, '_blank');
          }
        }}
      >
        <sphereGeometry args={[planetSize, 32, 32]} />
        <meshStandardMaterial
          map={texture}
          metalness={0.3}
          roughness={0.7}
        />
      </mesh>

      <mesh ref={glowRef} scale={[1.02, 1.02, 1.02]}>
        <sphereGeometry args={[planetSize, 32, 32]} />
        <meshPhongMaterial
          map={gridTexture}
          transparent={true}
          opacity={0.9}
          emissive="#40E0D0"
          emissiveIntensity={0.9}
          side={THREE.FrontSide}
          depthWrite={false}
        />
      </mesh>

      <mesh scale={[1.1, 1.1, 1.1]}>
        <sphereGeometry args={[planetSize, 32, 32]} />
        <meshPhongMaterial
          color="#40E0D0"
          transparent={true}
          opacity={0.2}
          emissive="#40E0D0"
          emissiveIntensity={0.7}
          side={THREE.FrontSide}
          depthWrite={false}
        />
      </mesh>

      {planetType.hasRings && planetType.ringColors.map((color, i) => (
        <mesh 
          key={i}
          ref={ringsRef}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[
            (STANDARD_PLANET_SIZE + 1 + (i * 0.3)) * ringScaleFactor,
            (STANDARD_PLANET_SIZE + 1.5 + (i * 0.3)) * ringScaleFactor,
            32
          ]} />
          <meshStandardMaterial
            color={color}
            side={THREE.DoubleSide}
            transparent={true}
            opacity={0.8}
            metalness={0.3}
            roughness={0.7}
          />
        </mesh>
      ))}

      <pointLight
        position={[planetSize * 2, 0, 0]}
        intensity={0.5}
        distance={planetSize * 6}
        color="#40E0D0"
      />

      {hovered && transaction && (
        <Html>
          <div 
            style={{
              background: 'rgba(0, 0, 0, 0.8)',
              padding: '8px 12px',
              borderRadius: '4px',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'white',
              fontSize: '12px',
              fontFamily: 'monospace',
              backdropFilter: 'blur(4px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <span style={{ opacity: 0.7 }}>TX: {transaction.hash?.slice(0, 8)}...</span>
            <span style={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              padding: '2px 6px',
              borderRadius: '3px',
              fontWeight: 'bold'
            }}>
              {formatAmount(transaction.amount)}
            </span>
          </div>
        </Html>
      )}
    </group>
  );
};

const Planet = ({ transaction, position, onHover, isHighlighted = false, lodLevel = 'HIGH' }) => {
  const getPlanetType = () => {
    if (!transaction?.hash) return PLANET_TYPES[0];
    const hashNum = parseInt(transaction.hash.slice(-8), 16) || 0;
    return PLANET_TYPES[hashNum % PLANET_TYPES.length];
  };

  return (
    <group position={position}>
      <PlanetMesh
        planetType={getPlanetType()}
        transaction={transaction}
        onHover={onHover}
      />
    </group>
  );
};

export default Planet;