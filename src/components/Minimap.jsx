// src/components/Minimap.jsx

import React, { useRef, useCallback } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';

// MinimapDot Component
const MinimapDot = ({ position, size = 1, color = '#ffffff', onClick }) => (
  <mesh position={position} onClick={onClick}>
    <sphereGeometry args={[size, 8, 8]} />
    <meshBasicMaterial color={color} transparent opacity={0.8} />
    <pointLight distance={5} intensity={0.5} color={color} />
  </mesh>
);

// MinimapContent Component
const MinimapContent = ({ mainCamera, galaxyPositions, onNavigate, selectedGalaxy }) => {
  const { scene, raycaster } = useThree();
  const positionMarker = useRef();
  
  useFrame(() => {
    if (positionMarker.current && mainCamera) {
      const scaleFactor = 0.1;
      positionMarker.current.position.set(
        mainCamera.position.x * scaleFactor,
        0,
        mainCamera.position.z * scaleFactor
      );
      positionMarker.current.position.y = 0.5;
    }
  });

  const handleClick = useCallback((event) => {
    const intersects = raycaster.intersectObjects(scene.children, true);
    if (intersects.length > 0) {
      const point = intersects[0].point;
      const scaleFactor = 10;
      const worldPosition = [
        point.x * scaleFactor,
        mainCamera?.position.y || 50,
        point.z * scaleFactor
      ];
      onNavigate(worldPosition);
    }
  }, [raycaster, scene, onNavigate, mainCamera]);

  return (
    <>
      <ambientLight intensity={0.5} />
      
      <Stars 
        radius={100}
        depth={50}
        count={1000}
        factor={2}
        saturation={0}
        fade={true}
        speed={0.5}
      />

      <mesh ref={positionMarker}>
        <sphereGeometry args={[1.5, 16, 16]} />
        <meshBasicMaterial 
          color="#ff4444" 
          transparent 
          opacity={0.8}
          depthTest={false}
        />
        <pointLight distance={10} intensity={1} color="#ff4444" />
      </mesh>

      {galaxyPositions.map((pos, index) => (
        <MinimapDot
          key={index}
          position={[pos[0] * 0.1, 0, pos[2] * 0.1]}
          size={selectedGalaxy === index ? 1.8 : 1.2}
          color={selectedGalaxy === index ? '#00ffff' : '#ffffff'}
        />
      ))}

      <mesh rotation={[-Math.PI / 2, 0, 0]} onClick={handleClick}>
        <planeGeometry args={[1000, 1000]} />
        <meshBasicMaterial visible={false} />
      </mesh>
    </>
  );
};

// Main Minimap Component
export const Minimap = ({ mainCamera, galaxyPositions, onNavigate, selectedGalaxy }) => {
  const minimapCameraRef = useRef();
  const minimapSize = { width: 180, height: 180 };
  
  return (
    <div
      style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        width: minimapSize.width,
        height: minimapSize.height,
        background: 'rgba(0,0,0,0.7)',
        border: '2px solid rgba(255,255,255,0.15)',
        borderRadius: '10px',
        overflow: 'hidden',
        boxShadow: '0 0 20px rgba(0,0,0,0.5)',
        backdropFilter: 'blur(5px)'
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: '5px',
          background: 'rgba(255,255,255,0.1)',
          color: 'rgba(255,255,255,0.8)',
          fontSize: '10px',
          textAlign: 'center',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}
      >
        Navigation Map
      </div>
      <Canvas 
        camera={{ 
          position: [0, 100, 200],
          fov: 60,
          far: 5000,
          near: 0.1
        }} 
        onCreated={({ camera }) => {
          minimapCameraRef.current = camera;
        }}
      >
        <MinimapContent 
          mainCamera={mainCamera}
          galaxyPositions={galaxyPositions}
          onNavigate={onNavigate}
          selectedGalaxy={selectedGalaxy}
        />
      </Canvas>
    </div>
  );
};

export default Minimap;