import React, { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

// Constants
const MINIMUM_PLANET_SIZE = 2;
const ROTATION_SPEED = 0.01;
const NUMBER_OF_TEXTURES = 13;

//Create and preload planet textures
const textureLoader = new THREE.TextureLoader();
const textures = Array.from({ length: NUMBER_OF_TEXTURES }, (_, i) => {
  const texture = textureLoader.load(`/textures/tex${i + 1}.jpg`);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
});

// Track texture assignment for cycling
let lastAssignedIndex = 0;

//Tooltip component for planet information
const PlanetTooltip = ({ transaction, textureIndex }) => (
  <Html>
    <div style={{
      background: 'rgba(0, 0, 0, 0.8)',
      padding: '8px 12px',
      borderRadius: '4px',
      color: 'white',
      fontSize: '12px',
      fontFamily: 'monospace',
      whiteSpace: 'nowrap',
      transform: 'translateY(-20px)',
      pointerEvents: 'none',
      backdropFilter: 'blur(4px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
    }}>
      {transaction ? (
        <>
          <span style={{ opacity: 0.7 }}>TX: {transaction.hash?.slice(0, 8)}...</span>
          <span style={{ marginLeft: '8px' }}>
            {transaction.amount.toFixed(2)}
          </span>
        </>
      ) : 'No Transaction'}
      <span style={{ 
        marginLeft: '8px',
        padding: '2px 6px',
        background: 'rgba(64, 224, 208, 0.2)',
        borderRadius: '3px',
        fontSize: '10px'
      }}>
        tex{textureIndex + 1}
      </span>
    </div>
  </Html>
);

//PlanetMesh Component - Renders individual planet with interactions
const PlanetMesh = ({ transaction, onHover, isSelected = false, isHighlighted = false }) => {
  const planetRef = useRef();
  const [hovered, setHovered] = useState(false);
  
  // Calculate planet size based on transaction amount
  const planetSize = useMemo(() => {
    return Math.max(
      MINIMUM_PLANET_SIZE, 
      transaction?.amount ? transaction.amount / 1000 : MINIMUM_PLANET_SIZE
    );
  }, [transaction]);

  // Assign texture sequentially
  const textureIndex = useMemo(() => {
    if (!transaction) return 0;
    lastAssignedIndex = (lastAssignedIndex + 1) % NUMBER_OF_TEXTURES;
    return lastAssignedIndex;
  }, [transaction]);

  // Handle planet rotation
  useFrame(() => {
    if (planetRef.current) {
      planetRef.current.rotation.y += ROTATION_SPEED;
    }
  });

  // Event handlers
  const handlePointerOver = (e) => {
    e.stopPropagation();
    setHovered(true);
    onHover?.(true);
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = (e) => {
    e.stopPropagation();
    setHovered(false);
    onHover?.(false);
    document.body.style.cursor = 'auto';
  };

  const handleClick = (e) => {
    e.stopPropagation();
    if (transaction?.hash) {
      window.open(`https://solscan.io/tx/${transaction.hash}`, '_blank');
    }
  };

  return (
    <group>
      {/* Planet mesh */}
      <mesh
        ref={planetRef}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        <sphereGeometry args={[planetSize, 32, 32]} />
        <meshStandardMaterial
          map={textures[textureIndex]}
          metalness={0.2}
          roughness={0.8}
        />
      </mesh>

      {/* Local illumination */}
      <pointLight
        position={[planetSize * 2, 0, 0]}
        intensity={0.5}
        distance={planetSize * 6}
        color="#ffffff"
      />

      {/* Tooltip */}
      {(hovered || isSelected || isHighlighted) && (
        <PlanetTooltip 
          transaction={transaction} 
          textureIndex={textureIndex} 
        />
      )}
    </group>
  );
};

//Planet Component - Wrapper for positioning the planet in space
const Planet = ({ transaction, position, onHover, isHighlighted = false, isSelected = false }) => {
  return (
    <group position={position}>
      <PlanetMesh
        transaction={transaction}
        onHover={onHover}
        isSelected={isSelected}
        isHighlighted={isHighlighted}
      />
    </group>
  );
};

export default Planet;