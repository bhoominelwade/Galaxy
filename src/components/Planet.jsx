// Planet.jsx
import React, { useRef, useState, useMemo, useEffect } from 'react';
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

const PlanetMesh = ({ planetType, transaction, onHover, isSelected = false, isHighlighted = false }) => {
  const planetRef = useRef();
  const glowRef = useRef();
  const [hovered, setHovered] = useState(false);
  const [glowOpacity, setGlowOpacity] = useState(0);

  const baseSize = calculatePlanetSize(transaction?.amount);
  const scaleFactor = isSelected ? 1 : 0.6;
  const planetSize = baseSize * scaleFactor;

  // Generate a consistent color based on transaction hash
  const planetColor = useMemo(() => {
    if (!transaction?.hash) return new THREE.Color(0x4169E1); // Default blue
    const hash = parseInt(transaction.hash.slice(-6), 16);
    const hue = (hash % 360) / 360;
    const saturation = 0.7;
    const lightness = 0.6;
    const color = new THREE.Color().setHSL(hue, saturation, lightness);
    return color;
  }, [transaction?.hash]);

  // Glow effect parameters
  const glowSize = planetSize * 1.2;
  const glowColor = isHighlighted ? new THREE.Color(0x00ffff) : planetColor.clone().multiplyScalar(1.2);

  useFrame((state) => {
    if (planetRef.current) {
      planetRef.current.rotation.y += ROTATION_SPEED;
    }
    
    if (glowRef.current && (isHighlighted || hovered)) {
      const time = state.clock.getElapsedTime();
      const pulseScale = 1 + Math.sin(time * 2) * 0.05;
      glowRef.current.scale.set(pulseScale, pulseScale, pulseScale);
    }
  });

  useEffect(() => {
    setGlowOpacity(isHighlighted || hovered ? 0.7 : 0);
  }, [isHighlighted, hovered]);

  return (
    <group>
      {/* Glow sphere */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[glowSize, 32, 32]} />
        <meshBasicMaterial
          color={glowColor}
          transparent
          opacity={glowOpacity}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Main planet sphere */}
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
          color={planetColor}
          metalness={0.4}
          roughness={0.7}
          emissive={isHighlighted ? glowColor : planetColor}
          emissiveIntensity={isHighlighted ? 0.5 : 0.2}
        />
      </mesh>

      {/* Ambient light for highlighted/hovered planets */}
      {(isHighlighted || hovered) && (
        <pointLight
          color={glowColor}
          intensity={2}
          distance={planetSize * 10}
          decay={2}
        />
      )}

      {/* Planet's base light */}
      <pointLight
        position={[planetSize * 2, 0, 0]}
        intensity={0.8}
        distance={planetSize * 8}
        color={planetColor}
      />

      {/* Tooltip */}
      {(hovered || isHighlighted) && transaction && (
        <Html>
          <div style={{
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
            border: `1px solid ${isHighlighted ? '#00ffff33' : 'rgba(255, 255, 255, 0.1)'}`,
            boxShadow: isHighlighted ? '0 0 10px #00ffff33' : 'none'
          }}>
            <span style={{ opacity: 0.7 }}>TX: {transaction.hash?.slice(0, 8)}...</span>
            <span style={{ 
              backgroundColor: isHighlighted ? 'rgba(0, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
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
        isHighlighted={isHighlighted}
      />
    </group>
  );
};

export default Planet;