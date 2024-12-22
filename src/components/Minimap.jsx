import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import '../styles/MapNavigation.css';

//MinimapDot - Represents a point of interest on the minimap

const MinimapDot = ({ position, size = 1, color = '#ffffff', onClick }) => (
  <mesh position={position} onClick={onClick}>
    <sphereGeometry args={[size, 8, 8]} />
    <meshBasicMaterial color={color} transparent opacity={0.8} />
    <pointLight distance={5} intensity={0.5} color={color} />
  </mesh>
);

//MinimapContent - Renders the interactive map content
const MinimapContent = ({ mainCamera, galaxyPositions, onNavigate, selectedGalaxy }) => {
  const { scene, raycaster } = useThree();
  const positionMarker = useRef();
  
  // Update position marker to follow main camera
  useFrame(() => {
    if (positionMarker.current && mainCamera) {
      const scaleFactor = 0.1; // Scale down main world coordinates for minimap
      positionMarker.current.position.set(
        mainCamera.position.x * scaleFactor,
        0.5, // Fixed height for marker
        mainCamera.position.z * scaleFactor
      );
    }
  });

  // Handle minimap click navigation
  const handleClick = useCallback((event) => {
    const intersects = raycaster.intersectObjects(scene.children, true);
    if (intersects.length > 0) {
      const point = intersects[0].point;
      const scaleFactor = 10; // Scale up minimap coordinates for main world
      const worldPosition = [
        point.x * scaleFactor,
        mainCamera?.position.y || 50, // Maintain current height or default
        point.z * scaleFactor
      ];
      onNavigate(worldPosition);
    }
  }, [raycaster, scene, onNavigate, mainCamera]);

  return (
    <>
      <ambientLight intensity={0.5} />
      
      {/* Background starfield */}
      <Stars 
        radius={100}
        depth={50}
        count={1000}
        factor={2}
        saturation={0}
        fade={true}
        speed={0.5}
      />

      {/* Current position marker */}
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

      {/* Galaxy position markers */}
      {galaxyPositions.map((pos, index) => (
        <MinimapDot
          key={index}
          position={[pos[0] * 0.1, 0, pos[2] * 0.1]}
          size={selectedGalaxy === index ? 1.8 : 1.2}
          color={selectedGalaxy === index ? '#00ffff' : '#ffffff'}
        />
      ))}

      {/* Invisible click plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} onClick={handleClick}>
        <planeGeometry args={[1000, 1000]} />
        <meshBasicMaterial visible={false} />
      </mesh>
    </>
  );
};


//MapNavigation - Main navigation component
const MapNavigation = ({ 
  mainCamera, 
  galaxyPositions, 
  onNavigate, 
  selectedGalaxy, 
  onExpandChange = () => {}
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const minimapCameraRef = useRef();

  // Notify parent component of expansion state changes
  useEffect(() => {
    onExpandChange(isOpen);
  }, [isOpen, onExpandChange]);

  return (
    <div className={`map-nav ${isOpen ? 'expanded' : ''}`}>
      {/* Toggle button */}
      <button 
        className="map-nav__button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle navigation map"
      >
        <i className={isOpen ? "ri-close-line" : "ri-radar-line"}></i>
      </button>
      
      {/* Map content */}
      <div className="map-nav__content">
        <div className="minimap-title">Navigation Map</div>
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
    </div>
  );
};

export default MapNavigation;