import React, { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

const STANDARD_PLANET_SIZE = 0.4;
const MAX_PLANET_SIZE = 3;
const MIN_PLANET_SIZE = 0.5;
const ROTATION_SPEED = 0.01;
const SIZE_THRESHOLD = 10000;

const PLANET_TYPES = [
  { name: 'mercury', orbitRadius: 33, speed: 5 },
  { name: 'venus', orbitRadius: 48, speed: 3 },
  { name: 'earth', orbitRadius: 55, speed: 4 },
  { name: 'mars', orbitRadius: 72, speed: 2 },
  { name: 'jupiter', orbitRadius: 90, speed: 0.8 },
  { name: 'saturn', orbitRadius: 120, speed: 0.5 },
  { name: 'uranus', orbitRadius: 140, speed: 0.4 },
  { name: 'neptune', orbitRadius: 180, speed: 0.2 }
];

// Planet name components
const PLANET_PREFIXES = [
  'Cosmo', 'Pulsar', 'Solstice', 'Carina', 'Indus', 'Nova', 'Vega', 'Lyra',
  'Hydra', 'Orion', 'Andromeda', 'Phoenix', 'Draco', 'Aquila', 'Centauri'
];

const PLANET_NUMBERS = Array.from({ length: 10000 }, (_, i) => 
  String(i).padStart(4, '0')
);

const calculatePlanetSize = (amount) => {
  if (!amount) return STANDARD_PLANET_SIZE;
  
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  const logValue = Math.log10(numericAmount + 1);
  const logThreshold = Math.log10(SIZE_THRESHOLD);
  
  let size;
  if (numericAmount >= SIZE_THRESHOLD) {
    size = MAX_PLANET_SIZE;
  } else {
    const normalizedSize = logValue / logThreshold;
    size = MIN_PLANET_SIZE + (normalizedSize * (MAX_PLANET_SIZE - MIN_PLANET_SIZE));
  }
  
  return Math.max(MIN_PLANET_SIZE, Math.min(MAX_PLANET_SIZE, size));
};

const formatAmount = (amount) => {
  if (amount >= 1e9) return `${(amount / 1e9).toFixed(1)}B`;
  if (amount >= 1e6) return `${(amount / 1e6).toFixed(1)}M`;
  if (amount >= 1e3) return `${(amount / 1e3).toFixed(1)}K`;
  return amount.toFixed(1);
};

const generatePlanetName = (hash) => {
  if (!hash) return 'Unknown-0000';
  
  const prefixIndex = parseInt(hash.slice(0, 4), 16) % PLANET_PREFIXES.length;
  const numberValue = parseInt(hash.slice(4, 8), 16) % 10000;
  
  return `${PLANET_PREFIXES[prefixIndex]}-${PLANET_NUMBERS[numberValue]}`;
};

const generatePlanetColor = (hash) => {
  if (!hash) return new THREE.Color(0x4169E1); // Default royal blue
  
  // Use hash to generate consistent colors for the same transaction
  const hue = parseInt(hash.slice(-6), 16) / 0xffffff;
  const saturation = 0.5 + (parseInt(hash.slice(0, 2), 16) / 512);
  const lightness = 0.3 + (parseInt(hash.slice(2, 4), 16) / 512);
  
  const color = new THREE.Color();
  color.setHSL(hue, saturation, lightness);
  return color;
};

const PlanetLabel = ({ hash, position, planetSize }) => {
  const planetName = useMemo(() => generatePlanetName(hash), [hash]);
  
  return (
    <group position={position}>
      <Html
        transform
        style={{
          transition: 'all 0.2s',
          opacity: 0.8,
          transform: 'scale(1.0)',
          zIndex: 1
        }}
        position={[planetSize * 1.3, 0, 0]}
        center
        distanceFactor={5}
        sprite
        renderOrder={1}
        className="planet-label"
      >
        <div className="select-none pointer-events-none" style={{
          color: '#8494b4',
          fontSize: '2.5rem',
          fontFamily: 'monospace',
          whiteSpace: 'nowrap',
          textAlign: 'left',
          textShadow: '0 0 10px rgba(132, 148, 180, 0.3)',
          transform: 'scale(1.8)',
          userSelect: 'none'
        }}>
          {planetName}
        </div>
      </Html>
    </group>
  );
};

const PlanetMesh = ({ planetType, transaction, onHover, isSelected = false }) => {
  const planetRef = useRef();
  const [hovered, setHovered] = useState(false);
  
  const baseSize = calculatePlanetSize(transaction?.amount) || 1;
  const scaleFactor = isSelected ? 1.2 : 1;
  const planetSize = baseSize * scaleFactor;

  const material = useMemo(() => {
    const baseColor = generatePlanetColor(transaction?.hash);
    
    return new THREE.MeshPhysicalMaterial({
      color: baseColor,
      metalness: 0.1,
      roughness: 0.7,
      clearcoat: 0.3,
      clearcoatRoughness: 0.4,
      emissive: baseColor.clone().multiplyScalar(0.2),
      envMapIntensity: 0.8,
    });
  }, [transaction?.hash]);

  useFrame((state) => {
    if (planetRef.current) {
      planetRef.current.rotation.y += ROTATION_SPEED;
      
      if (hovered) {
        planetRef.current.rotation.y += ROTATION_SPEED * 0.5;
      }
    }
  });

  return (
    <group>
      <ambientLight intensity={0.2} />
      
      <directionalLight 
        position={[5, 5, 5]} 
        intensity={1} 
        castShadow 
      />

      <mesh
        ref={planetRef}
        castShadow
        receiveShadow
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
        <sphereGeometry args={[planetSize, 64, 64]} />
        <primitive object={material} attach="material" />
      </mesh>

      {/* Atmosphere effect */}
      <mesh scale={[planetSize * 1.05, planetSize * 1.05, planetSize * 1.05]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial
          color={material.color}
          transparent
          opacity={0.1}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Planet lighting */}
      <pointLight
        position={[planetSize * 1.5, planetSize * 1.5, planetSize * 1.5]}
        intensity={1}
        distance={planetSize * 10}
        decay={2}
      />
      
      <pointLight
        position={[-planetSize * 1.5, -planetSize * 1.5, -planetSize * 1.5]}
        intensity={0.5}
        distance={planetSize * 8}
        color="#40E0D0"
        decay={2}
      />

      {/* Info tooltip on hover */}
      {(hovered || isSelected) && transaction && (
        <Html>
          <div style={{
            background: 'rgba(0, 0, 0, 0.8)',
            padding: '8px 12px',
            borderRadius: '4px',
            whiteSpace: 'nowrap',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            color: 'white',
            fontSize: '12px',
            fontFamily: 'monospace',
            backdropFilter: 'blur(4px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            transform: 'translateY(-20px)',
            pointerEvents: 'none',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
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
          </div>
        </Html>
      )}
    </group>
  );
};

const Planet = ({ transaction, position, onHover, isHighlighted = false, lodLevel = 'HIGH', isSelected = false }) => {
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
        isSelected={isSelected}
      />
      <PlanetLabel 
        hash={transaction?.hash}
        position={[0, 0, 0]}
        planetSize={calculatePlanetSize(transaction?.amount)}
      />
    </group>
  );
};

export default Planet;