import React, { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

const MINIMUM_PLANET_SIZE = 2;
const ROTATION_SPEED = 0.01;
const NUMBER_OF_TEXTURES = 13;

// Create and preload textures
const textureLoader = new THREE.TextureLoader();
const textures = Array.from({ length: NUMBER_OF_TEXTURES }, (_, i) => {
  const texture = textureLoader.load(`/textures/tex${i + 1}.jpg`);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
});

// Keep track of last assigned texture index
let lastAssignedIndex = 0;

const PlanetMesh = ({ transaction, onHover, isSelected = false, isHighlighted = false }) => {
  const planetRef = useRef();
  const [hovered, setHovered] = useState(false);
  
  const planetSize = useMemo(() => {
    return Math.max(MINIMUM_PLANET_SIZE, transaction?.amount ? transaction.amount / 1000 : MINIMUM_PLANET_SIZE);
  }, [transaction]);

  // Sequential texture assignment
  const textureIndex = useMemo(() => {
    if (!transaction) return 0;
    
    // Increment and cycle through textures
    lastAssignedIndex = (lastAssignedIndex + 1) % NUMBER_OF_TEXTURES;
    return lastAssignedIndex;
  }, [transaction]);

  useFrame(() => {
    if (planetRef.current) {
      planetRef.current.rotation.y += ROTATION_SPEED;
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
          map={textures[textureIndex]}
          metalness={0.2}
          roughness={0.8}
        />
      </mesh>

      {/* Point Light for local illumination */}
      <pointLight
        position={[planetSize * 2, 0, 0]}
        intensity={0.5}
        distance={planetSize * 6}
        color="#ffffff"
      />

      {(hovered || isSelected || isHighlighted) && (
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
      )}
    </group>
  );
};

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