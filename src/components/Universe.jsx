import { useState, useEffect, useRef, useCallback } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import SpiralGalaxy from './SpiralGalaxy';
import Planet from './Planet';

const MinimapDot = ({ position, size = 1, color = '#ffffff', onClick }) => (
  <mesh position={position} onClick={onClick}>
    <sphereGeometry args={[size, 8, 8]} />
    <meshBasicMaterial color={color} transparent opacity={0.8} />
    <pointLight distance={5} intensity={0.5} color={color} />
  </mesh>
);

const Minimap = ({ mainCamera, galaxyPositions, onNavigate, selectedGalaxy }) => {
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
          position: [0, 200, 0],
          fov: 50,
          near: 1,
          far: 1000,
          rotation: [-Math.PI / 2, 0, 0]
        }}
        style={{ cursor: 'pointer' }}
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

const MinimapContent = ({ mainCamera, galaxyPositions, onNavigate, selectedGalaxy }) => {
  const { scene, camera, raycaster, pointer } = useThree();
  const positionMarker = useRef();
  
  useFrame(() => {
    if (positionMarker.current && mainCamera) {
      // Match the same scale factor used for galaxy positions (0.1)
      const scaleFactor = 0.1;
      
      // Update marker position based on main camera position
      positionMarker.current.position.set(
        mainCamera.position.x * scaleFactor,
        0,  // Keep at plane level
        mainCamera.position.z * scaleFactor
      );

      // Ensure the marker is always visible
      positionMarker.current.position.y = 0.5;
    }
  });

  const handleClick = useCallback((event) => {
    const intersects = raycaster.intersectObjects(scene.children, true);
    if (intersects.length > 0) {
      const point = intersects[0].point;
      // Use the same scale factor for click navigation (inverse of display scale)
      const scaleFactor = 10; // 1/0.1
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

      {/* Position marker (red dot) */}
      <mesh ref={positionMarker}>
        <sphereGeometry args={[1.5, 16, 16]} />
        <meshBasicMaterial 
          color="#ff4444" 
          transparent 
          opacity={0.8}
          // Ensure the marker is always visible on top
          depthTest={false}
        />
        <pointLight distance={10} intensity={1} color="#ff4444" />
      </mesh>

      {/* Galaxy dots */}
      {galaxyPositions.map((pos, index) => (
        <MinimapDot
          key={index}
          position={[pos[0] * 0.1, 0, pos[2] * 0.1]}
          size={selectedGalaxy === index ? 1.8 : 1.2}
          color={selectedGalaxy === index ? '#00ffff' : '#ffffff'}
        />
      ))}

      {/* Click detection plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} onClick={handleClick}>
        <planeGeometry args={[1000, 1000]} />
        <meshBasicMaterial visible={false} />
      </mesh>
    </>
  );
};

const NavButton = ({ label, onClick, style = {} }) => (
  <button
    style={{
      width: '40px',
      height: '40px',
      background: 'rgba(255,255,255,0.1)',
      border: '1px solid rgba(255,255,255,0.2)',
      borderRadius: '5px',
      color: 'white',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '20px',
      transition: 'all 0.3s ease',
      ...style
    }}
    onClick={onClick}
    onMouseDown={(e) => {
      e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
    }}
    onMouseUp={(e) => {
      e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
    }}
  >
    {label}
  </button>
);

const Universe = () => {
  const [galaxies, setGalaxies] = useState([]);
  const [solitaryPlanets, setSolitaryPlanets] = useState([]);
  const [selectedGalaxy, setSelectedGalaxy] = useState(null);
  const [loading, setLoading] = useState(true);
  const mainCameraRef = useRef();
  const controlsRef = useRef();

  const handleKeyDown = useCallback((e) => {
    if (!controlsRef.current || !mainCameraRef.current) return;
    
    const camera = mainCameraRef.current;
    const moveSpeed = 10;
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    
    camera.getWorldDirection(forward);
    right.crossVectors(forward, camera.up);
    
    forward.y = 0;
    forward.normalize();
    right.normalize();

    switch(e.key) {
      case 'ArrowUp':
      case 'w':
        camera.position.add(forward.multiplyScalar(moveSpeed));
        break;
      case 'ArrowDown':
      case 's':
        camera.position.add(forward.multiplyScalar(-moveSpeed));
        break;
      case 'ArrowLeft':
      case 'a':
        camera.position.add(right.multiplyScalar(-moveSpeed));
        break;
      case 'ArrowRight':
      case 'd':
        camera.position.add(right.multiplyScalar(moveSpeed));
        break;
      case 'q':
        camera.position.y += moveSpeed;
        break;
      case 'e':
        camera.position.y -= moveSpeed;
        break;
    }
    
    controlsRef.current.target.set(camera.position.x, 0, camera.position.z);
    controlsRef.current.update();
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  
  

  const groupTransactionsIntoGalaxies = (transactions) => {
    const sortedTransactions = [...transactions].sort((a, b) => b.amount - a.amount);
    const galaxies = [];
    let currentGalaxy = [];
    let currentSum = 0;
    const MAX_GALAXY_AMOUNT = 700;
    let remainingPlanets = [];
  
    for (const tx of sortedTransactions) {
      if (currentSum + tx.amount <= MAX_GALAXY_AMOUNT) {
        currentGalaxy.push(tx);
        currentSum += tx.amount;
      } else {
        if (currentGalaxy.length > 0) {
          galaxies.push({
            transactions: currentGalaxy,
            totalAmount: currentSum
          });
        }
        currentGalaxy = [tx];
        currentSum = tx.amount;
      }
    }
  
    if (currentGalaxy.length > 0) {
      if (currentSum >= 200) {
        galaxies.push({
          transactions: currentGalaxy,
          totalAmount: currentSum
        });
      } else {
        remainingPlanets.push(...currentGalaxy);
      }
    }
  
    return { galaxies, solitaryPlanets: remainingPlanets };
  };

  const calculateGalaxyPosition = (index, total) => {
    const minRadius = 35;
    const maxRadius = 70;
    const verticalSpread = 35;
    const spiralFactor = 3;
    
    const randomRadius = minRadius + Math.random() * (maxRadius - minRadius);
    const randomVerticalOffset = (Math.random() - 0.5) * verticalSpread;
    const randomSpread = (Math.random() - 0.5) * 25;
    
    const baseAngle = (index / total) * Math.PI * spiralFactor;
    const randomAngleOffset = (Math.random() - 0.5) * 1.0;
    const finalAngle = baseAngle + randomAngleOffset;
    
    const xSpread = (Math.random() - 0.5) * 20;
    const ySpread = (Math.random() - 0.5) * 15;
    const zSpread = (Math.random() - 0.5) * 20;
    
    const x = Math.cos(finalAngle) * (randomRadius + index * 2) + randomSpread;
    const y = randomVerticalOffset + Math.sin(baseAngle * 2) * (verticalSpread / 1.5);
    const z = Math.sin(finalAngle) * (randomRadius + index * 2) + randomSpread;

    const jitter = 8;
    return [
      x + xSpread + (Math.random() - 0.5) * jitter,
      y + ySpread + (Math.random() - 0.5) * jitter,
      z + zSpread + (Math.random() - 0.5) * jitter
    ];
  };

  const handleMinimapNavigate = useCallback((newPosition) => {
    if (controlsRef.current && mainCameraRef.current) {
      const camera = mainCameraRef.current;
      const controls = controlsRef.current;
      const duration = 1000;
      const startPosition = {
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z
      };
      const startTime = Date.now();

      const animate = () => {
        const now = Date.now();
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        
        camera.position.set(
          startPosition.x + (newPosition[0] - startPosition.x) * eased,
          startPosition.y + (newPosition[1] - startPosition.y) * eased,
          startPosition.z + (newPosition[2] - startPosition.z) * eased
        );
        
        controls.target.set(camera.position.x, 0, camera.position.z);
        controls.update();
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      
      animate();
    }
  }, []);

  useEffect(() => {
    const fetchAndProcessTransactions = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/transactions');
        const data = await response.json();
        const { galaxies: galaxyGroups, solitaryPlanets: remainingPlanets } = 
          groupTransactionsIntoGalaxies(data);
        setGalaxies(galaxyGroups);
        setSolitaryPlanets(remainingPlanets);
        setLoading(false);
      } catch (error) {
        console.error('Error:', error);
        setLoading(false);
      }
    };

    fetchAndProcessTransactions();
  }, []);

  const galaxyPositions = galaxies.map((_, index) => 
    calculateGalaxyPosition(index, galaxies.length)
  );

  // In your Universe component, update the Canvas and OrbitControls settings:

return (
  <div style={{ width: '100vw', height: '100vh', background: '#000000' }}>
    <Canvas 
      camera={{ 
        position: [0, 50, 100], 
        fov: 65,
        far: 2000,
        near: 0.1
      }} 
      onCreated={({ camera }) => {
        mainCameraRef.current = camera;
      }}
    >
      <ambientLight intensity={0.4} /> {/* Increased ambient light */}
      <pointLight position={[10, 10, 10]} intensity={1.2} /> {/* Increased point light */}
      
      <Stars 
        radius={200}
        depth={60}
        count={5000}
        factor={10}
        saturation={1}
        fade={true}
        speed={0.3}
      />
      
      <Stars 
        radius={150}
        depth={50}
        count={2000}
        factor={15}
        saturation={1}
        fade={true}
        speed={0.2}
      />

      {selectedGalaxy ? (
        <SpiralGalaxy 
          transactions={selectedGalaxy.transactions}
          position={[0, 0, 0]}
          isSelected={true}
          colorIndex={galaxies.findIndex(g => g === selectedGalaxy)}
        />
      ) : (
        <>
          {galaxies.map((galaxy, index) => (
            <SpiralGalaxy
              key={index}
              transactions={galaxy.transactions}
              position={calculateGalaxyPosition(index, galaxies.length)}
              onClick={() => setSelectedGalaxy(galaxy)}
              isSelected={false}
              colorIndex={index}
            />
          ))}

          {solitaryPlanets.map((tx, index) => (
            <Planet
              key={tx.hash}
              transaction={tx}
              position={calculateGalaxyPosition(
                index + galaxies.length,
                solitaryPlanets.length + galaxies.length
              )}
              size={0.5 + (tx.amount / 1000)}
              colorIndex={index}
            />
          ))}
        </>
      )}

      <OrbitControls 
        ref={controlsRef}
        enableZoom={true}
        maxDistance={selectedGalaxy ? 40 : 300}
        minDistance={selectedGalaxy ? 15 : 30}
        autoRotate={!selectedGalaxy}
        autoRotateSpeed={0.3}
        maxPolarAngle={Math.PI * 0.75}
        minPolarAngle={Math.PI * 0.25}
        zoomSpeed={1}
        rotateSpeed={0.5}
        enableDamping={true}
        dampingFactor={0.05}
      />
    </Canvas>

    <Minimap 
      mainCamera={mainCameraRef.current}
      galaxyPositions={galaxyPositions}
      onNavigate={handleMinimapNavigate}
      selectedGalaxy={selectedGalaxy ? galaxies.indexOf(selectedGalaxy) : null}
    />

    {selectedGalaxy && (
      <button
        style={{
          position: 'absolute',
          top: '20px',
          left: '220px',
          padding: '10px 20px',
          background: 'rgba(255,255,255,0.1)',
          color: 'white',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '5px',
          cursor: 'pointer',
          backdropFilter: 'blur(10px)',
          transition: 'all 0.3s ease',
          ':hover': {
            background: 'rgba(255,255,255,0.2)'
          }
        }}
        onClick={() => {
          setSelectedGalaxy(null);
          if (mainCameraRef.current && controlsRef.current) {
            mainCameraRef.current.position.set(0, 50, 100);
            controlsRef.current.target.set(0, 0, 0);
            controlsRef.current.update();
          }
        }}
      >
        Back to Universe
      </button>
    )}
  </div>
); 
}

export default Universe;
