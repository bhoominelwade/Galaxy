// MapNavigation.js
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';
import '../styles/MapNavigation.css';

const MinimapDot = React.memo(({ position, size = 1, color = '#ffffff', onClick }) => (
  <mesh position={position} onClick={onClick}>
    <sphereGeometry args={[size, 8, 8]} />
    <meshBasicMaterial color={color} transparent opacity={0.8} />
    <pointLight distance={5} intensity={0.5} color={color} />
  </mesh>
));

const PositionMarker = React.memo(({ mainCamera }) => {
  const markerRef = useRef();
  const materialRef = useRef(new THREE.MeshBasicMaterial({
    color: 0xff0000,  // Pure bright red
    transparent: true,
    opacity: 1,
    depthTest: false
  }));
  
  useFrame(() => {
    if (markerRef.current && mainCamera) {
      const scaleFactor = 0.1;
      markerRef.current.position.set(
        mainCamera.position.x * scaleFactor,
        0.5,
        mainCamera.position.z * scaleFactor
      );
    }
  });

  return (
    <group ref={markerRef}>
      <mesh>
        <cylinderGeometry args={[3.5, 3.5, 1.5, 32]} />
        <primitive object={materialRef.current} attach="material" />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.6, 4.2, 32]} />
        <meshBasicMaterial 
          color="#ff3333"
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.2, 3.4, 32]} />
        <meshBasicMaterial 
          color="#ff0000"
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh position={[0, -1.5, 0]} rotation={[0, 0, Math.PI]}>
        <coneGeometry args={[2, 3, 32]} />
        <primitive object={materialRef.current} attach="material" />
      </mesh>

      <pointLight distance={20} intensity={4} color="#ff0000" position={[0, 2, 0]} />
      <pointLight distance={15} intensity={3} color="#ff3333" position={[0, -2, 0]} />
      
      {/* Added extra glow lights */}
      <pointLight distance={25} intensity={2} color="#ff6666" position={[0, 0, 0]} />
    </group>
  );
});

const MinimapContent = ({ mainCamera, galaxyPositions, onNavigate, selectedGalaxy, controlsRef }) => {
  const { scene, raycaster } = useThree();

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
      
      if (mainCamera && controlsRef.current) {
        const duration = 1000;
        const startPosition = {
          x: mainCamera.position.x,
          y: mainCamera.position.y,
          z: mainCamera.position.z
        };
        const startTime = Date.now();

        const animate = () => {
          const now = Date.now();
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          
          mainCamera.position.set(
            startPosition.x + (worldPosition[0] - startPosition.x) * eased,
            startPosition.y + (worldPosition[1] - startPosition.y) * eased,
            startPosition.z + (worldPosition[2] - startPosition.z) * eased
          );
          
          controlsRef.current.target.set(
            worldPosition[0],
            0,
            worldPosition[2]
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

  const galaxyMarkers = useMemo(() => (
    galaxyPositions.map((pos, index) => (
      <MinimapDot
        key={index}
        position={[pos[0] * 0.1, 0, pos[2] * 0.1]}
        size={selectedGalaxy === index ? 1.8 : 1.2}
        color={selectedGalaxy === index ? '#00ffff' : '#ffffff'}
      />
    ))
  ), [galaxyPositions, selectedGalaxy]);

  return (
    <>
      <ambientLight intensity={0.3} />
      <Stars 
        radius={100}
        depth={50}
        count={500}
        factor={2}
        saturation={0}
        fade={true}
        speed={0.2}
      />
      <PositionMarker mainCamera={mainCamera} />
      {galaxyMarkers}
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