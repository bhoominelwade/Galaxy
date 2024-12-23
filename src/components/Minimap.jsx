// MapNavigation.js
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import '../styles/MapNavigation.css';

const MinimapDot = ({ position, size = 1, color = '#ffffff', onClick }) => (
  <mesh position={position} onClick={onClick}>
    <sphereGeometry args={[size, 8, 8]} />
    <meshBasicMaterial color={color} transparent opacity={0.8} />
    <pointLight distance={5} intensity={0.5} color={color} />
  </mesh>
);

const MinimapContent = ({ mainCamera, galaxyPositions, onNavigate, selectedGalaxy, controlsRef }) => {
  const { scene, raycaster } = useThree();
  const positionMarker = useRef();
  
  useFrame(() => {
    if (positionMarker.current && mainCamera) {
      const scaleFactor = 0.1;
      positionMarker.current.position.set(
        mainCamera.position.x * scaleFactor,
        0.5,
        mainCamera.position.z * scaleFactor
      );
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
      
      // Integrated navigation logic
      if (mainCamera && controlsRef.current) {
        const duration = 1000;
        const startPosition = {
          x: mainCamera.position.x,
          y: mainCamera.position.y,
          z: mainCamera.position.z
        };
        const startTarget = controlsRef.current.target.clone();
        const startTime = Date.now();

        const animate = () => {
          const now = Date.now();
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          
          mainCamera.position.set(
            startPosition.x + (worldPosition[0] - startPosition.x) * eased,
            startPosition.y + (worldPosition[0] - startPosition.y) * eased,
            startPosition.z + (worldPosition[0] - startPosition.z) * eased
          );
          
          controlsRef.current.target.set(
            0,
            worldPosition[0],
            worldPosition[0]
          );
          
          controlsRef.current.update();
          
          if (progress < 1) {
            requestAnimationFrame(animate);
          }
        };
        
        animate();
      }
      
      onNavigate(worldPosition);
    }
  }, [raycaster, scene, onNavigate, mainCamera, controlsRef]);

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

const MapNavigation = ({ 
  mainCamera, 
  controlsRef,
  galaxyPositions, 
  onNavigate, 
  selectedGalaxy, 
  onExpandChange = () => {}
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const minimapCameraRef = useRef();

  useEffect(() => {
    onExpandChange(isOpen);
  }, [isOpen, onExpandChange]);

  return (
    <div className={`map-nav ${isOpen ? 'expanded' : ''}`}>
      <button 
        className="map-nav__button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle navigation map"
      >
        <i className={isOpen ? "ri-close-line" : "ri-radar-line"}></i>
      </button>
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
            controlsRef={controlsRef}
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