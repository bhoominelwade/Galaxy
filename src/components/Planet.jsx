// Planet.js
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

const TEXTURE_PATHS = [
  '/textures/tex1.jpg',
  '/textures/tex2.jpg',
  '/textures/tex3.jpg',
  '/textures/tex4.jpg',
  '/textures/tex5.jpg',
  '/textures/tex6.jpg',
  '/textures/tex7.jpg',
  '/textures/tex8.jpg',
  '/textures/tex9.jpg',
  '/textures/tex10.jpg',
  '/textures/tex11.jpg',
  '/textures/tex12.jpg',
  '/textures/tex13.jpg',
  '/textures/tex14.jpg',
  '/textures/tex15.jpg',
  '/textures/tex16.jpg',
  '/textures/mars.jpg',
  '/textures/moon.jpg',
  '/textures/venus.jpg',
  '/textures/earthskin.jpeg',
  '/textures/saturnskin.jpeg',
  '/textures/jupiter.jpg',
  '/textures/neptune.jpg'
];

// Create a texture loader instance outside components to be reused
const textureLoader = new THREE.TextureLoader();
const textureCache = new Map();

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

const PlanetMesh = ({ planetType, transaction, onHover, isSelected = false }) => {
  const planetRef = useRef();
  const [hovered, setHovered] = useState(false);
  const [texture, setTexture] = useState(null);

  const baseSize = calculatePlanetSize(transaction?.amount);
  const scaleFactor = isSelected ? 1 : 0.6;
  const planetSize = baseSize * scaleFactor;

  // Enhanced texture loading with caching and fallback
  useMemo(() => {
    const loadTexture = () => {
      // Generate a consistent random index based on transaction hash
      const randomIndex = transaction?.hash 
        ? parseInt(transaction.hash.slice(-8), 16) % TEXTURE_PATHS.length 
        : Math.floor(Math.random() * TEXTURE_PATHS.length);
      
      const texturePath = TEXTURE_PATHS[randomIndex];

      // Check cache first
      if (textureCache.has(texturePath)) {
        setTexture(textureCache.get(texturePath));
        return;
      }

      // Load texture with fallback
      textureLoader.load(
        texturePath,
        (loadedTexture) => {
          textureCache.set(texturePath, loadedTexture);
          setTexture(loadedTexture);
        },
        undefined,
        () => {
          // If texture fails to load, try another random texture
          const fallbackPath = TEXTURE_PATHS[Math.floor(Math.random() * TEXTURE_PATHS.length)];
          textureLoader.load(
            fallbackPath,
            (fallbackTexture) => {
              textureCache.set(fallbackPath, fallbackTexture);
              setTexture(fallbackTexture);
            }
          );
        }
      );
    };

    loadTexture();
  }, [transaction?.hash, planetType.name]);

  useFrame(() => {
    if (planetRef.current) {
      planetRef.current.rotation.y += ROTATION_SPEED;
    }
  });

  if (!texture) return null;

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

      <pointLight
        position={[planetSize * 2, 0, 0]}
        intensity={0.5}
        distance={planetSize * 6}
        color="#40E0D0"
      />

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