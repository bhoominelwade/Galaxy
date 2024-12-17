// Planet.js
import React, { useRef, useState, useMemo,isHighlighted } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

const STANDARD_PLANET_SIZE = 0.4;
const MAX_PLANET_SIZE = 3;
const MIN_PLANET_SIZE = 0.5;
const ROTATION_SPEED = 0.01;
const MEDIA_PREFIX = 'https://brynmtchll.github.io/codepen-assets/solar-system/';
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

const createGridTexture = () => {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  ctx.fillStyle = 'transparent';
  ctx.fillRect(0, 0, size, size);
  
  ctx.strokeStyle = 'rgba(64, 224, 208, 0.15)';
  ctx.lineWidth = 0.1;
  
  for (let i = 0; i <= size; i += 16) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
  }
  
  return new THREE.CanvasTexture(canvas);
};

const PlanetMesh = ({ planetType, transaction, onHover, isSelected = false }) => {
  const planetRef = useRef();
  const glowRef = useRef();
  const [hovered, setHovered] = useState(false);

  const baseSize = calculatePlanetSize(transaction?.amount);
  const scaleFactor = isSelected ? 1 : 0.6;
  const planetSize = baseSize * scaleFactor;

  const texture = useMemo(() => {
    const textureLoader = new THREE.TextureLoader();
    return textureLoader.load(`${MEDIA_PREFIX}${planetType.name}.jpeg`);
  }, [planetType.name]);
  
  const gridTexture = useMemo(() => createGridTexture(), []);
  
  useFrame(() => {
    if (planetRef.current) {
      planetRef.current.rotation.y += ROTATION_SPEED;
    }
    if (glowRef.current) {
      glowRef.current.rotation.y -= ROTATION_SPEED * 0.5;
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
          emissive={isHighlighted ? "#ffffff" : "#000000"}
          emissiveIntensity={isHighlighted ? 0.5 : 0}
        />
      </mesh>
  
      <mesh ref={glowRef} scale={[1.02, 1.02, 1.02]}>
        <sphereGeometry args={[planetSize, 32, 32]} />
        <meshPhongMaterial
          map={gridTexture}
          transparent={true}
          opacity={isHighlighted ? 0.3 : 0.1}
          emissive={isHighlighted ? "#ffffff" : "#40E0D0"}
          emissiveIntensity={isHighlighted ? 0.6 : 0.1}
          side={THREE.FrontSide}
          depthWrite={false}
        />
      </mesh>
  
      <mesh scale={[1.1, 1.1, 1.1]}>
        <sphereGeometry args={[planetSize, 32, 32]} />
        <meshPhongMaterial
          color={isHighlighted ? "#ffffff" : "#40E0D4"}
          transparent={true}
          opacity={isHighlighted ? 0.4 : 0.15}
          emissive={isHighlighted ? "#ffffff" : "#40E0D4"}
          emissiveIntensity={isHighlighted ? 0.7 : 0.2}
          side={THREE.FrontSide}
          depthWrite={false}
        />
      </mesh>
  
      {isHighlighted && (
        <>
          <mesh scale={[1.2, 1.2, 1.2]}>
            <sphereGeometry args={[planetSize, 32, 32]} />
            <meshBasicMaterial
              color="#ffffff"
              transparent={true}
              opacity={0.5}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
  
          <mesh scale={[1.4, 1.4, 1.4]}>
            <sphereGeometry args={[planetSize, 32, 32]} />
            <meshBasicMaterial
              color="#ffffff"
              transparent={true}
              opacity={0.3}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
  
          <mesh scale={[1.6, 1.6, 1.6]}>
            <sphereGeometry args={[planetSize, 32, 32]} />
            <meshBasicMaterial
              color="#ffffff"
              transparent={true}
              opacity={0.1}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
  
          <pointLight 
            position={[planetSize * 2, 0, 0]} 
            intensity={3} 
            distance={planetSize * 15}
            color="#ffffff"
          />
          <pointLight 
            position={[-planetSize * 2, 0, 0]} 
            intensity={3} 
            distance={planetSize * 15}
            color="#ffffff"
          />
          <pointLight 
            position={[0, planetSize * 2, 0]} 
            intensity={3} 
            distance={planetSize * 15}
            color="#ffffff"
          />
        </>
      )}
  
      {hovered && transaction && (
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
            border: '1px solid rgba(255, 255, 255, 0.1)',
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
    </group>
  );
};

export default Planet;