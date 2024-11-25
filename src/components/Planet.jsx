import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

const PLANET_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD',
  '#D4A5A5', '#9B90C2', '#A3C6C4', '#E6B89C', '#FE9968'
];

const TEXTURE_PATHS = [
  '/textures/mars',
  '/textures/jupiter',
  '/textures/neptune',
  '/textures/mercury',
  '/textures/venus',
  '/textures/uranus',
  '/textures/tex2',
  '/textures/tex4'
];

const ORBIT_RANGES = [
  { min: 0, max: 50, radius: 8 },    // Increased starting radius
  { min: 50, max: 100, radius: 13 },
  { min: 100, max: 150, radius: 18 },
  { min: 150, max: 200, radius: 23 },
  { min: 200, max: 250, radius: 28 },
  { min: 250, max: 300, radius: 33 }
];

const FIXED_PLANET_SIZE = 2.5;

const Planet = ({ transaction, position, baseSize = 1, orbitIndex, colorIndex = 0, onHover, isHighlighted = false }) => {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);
  const [texture, setTexture] = useState(null);
  const textureLoader = useMemo(() => new THREE.TextureLoader(), []);

  const hashNum = parseInt(transaction.hash.slice(-8), 16);
  const hashBasedRandom = (seed = 1) => ((hashNum * seed) % 100000) / 100000;
  const planetColor = PLANET_COLORS[hashNum % PLANET_COLORS.length];

  // Simplified texture loading - removing fallback to prevent partial loading states
  useEffect(() => {
    const textureIndex = hashNum % TEXTURE_PATHS.length;
    const basePath = TEXTURE_PATHS[textureIndex];

    textureLoader.load(
      `${basePath}.jpg`,
      (loadedTexture) => {
        loadedTexture.wrapS = loadedTexture.wrapT = THREE.RepeatWrapping;
        loadedTexture.minFilter = THREE.LinearFilter;
        loadedTexture.magFilter = THREE.LinearFilter;
        loadedTexture.encoding = THREE.sRGBEncoding;
        loadedTexture.needsUpdate = true;
        setTexture(loadedTexture);
      },
      undefined,
      () => {
        // If texture fails to load, just use color
        setTexture(null);
      }
    );

    return () => {
      if (texture) {
        texture.dispose();
      }
    };
  }, [transaction.hash, textureLoader]);

  // Animation for highlighted planets
  useEffect(() => {
    if (isHighlighted && meshRef.current) {
      const highlightAnimation = () => {
        const time = Date.now() * 0.001;
        if (meshRef.current) {
          meshRef.current.scale.setScalar(1 + Math.sin(time * 4) * 0.1);
        }
        requestAnimationFrame(highlightAnimation);
      };
      const animationId = requestAnimationFrame(highlightAnimation);
      return () => cancelAnimationFrame(animationId);
    }
  }, [isHighlighted]);

  const handleClick = (e) => {
    e.stopPropagation();
    window.open(`https://solscan.io/tx/${transaction.hash}`, '_blank');
  };

  const handlePointerOver = (e) => {
    e.stopPropagation();
    setHovered(true);
    if (onHover) onHover(true);
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = (e) => {
    e.stopPropagation();
    setHovered(false);
    if (onHover) onHover(false);
    document.body.style.cursor = 'auto';
  };

  // Simplified material with stronger base visibility
  const material = useMemo(() => (
    <meshPhysicalMaterial
      map={texture}
      color={planetColor}
      emissive={isHighlighted ? '#ffffff' : (hovered ? planetColor : planetColor)}
      emissiveIntensity={isHighlighted ? 1 : (hovered ? 0.5 : 0.2)}
      metalness={0.4}
      roughness={0.7}
      clearcoat={0.3}
      clearcoatRoughness={0.25}
      normalScale={new THREE.Vector2(1, 1)}
      envMapIntensity={1.0}
    />
  ), [texture, planetColor, hovered, isHighlighted]);

  return (
    <group position={position}>
      {/* Main planet */}
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        renderOrder={1}
      >
        <sphereGeometry args={[baseSize, 32, 32]} />
        {material}
      </mesh>

      {/* Glow effect */}
      <mesh scale={[baseSize * 1.2, baseSize * 1.2, baseSize * 1.2]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial
          color={planetColor}
          transparent
          opacity={isHighlighted || hovered ? 0.2 : 0.1}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Additional light for highlighted/hovered state */}
      {(isHighlighted || hovered) && (
        <pointLight
          distance={15}
          intensity={isHighlighted ? 2 : 1}
          color={isHighlighted ? '#ffffff' : planetColor}
        />
      )}

      {/* Info tooltip */}
      {hovered && (
        <Html>
          <div className="transaction-info">
            <div className="transaction-id">TX: {transaction.hash}</div>
            <div className="transaction-amount">Amount: {transaction.amount}</div>
            <div className="click-info">Click to view on Solscan</div>
          </div>
        </Html>
      )}
    </group>
  );
};

export default Planet;