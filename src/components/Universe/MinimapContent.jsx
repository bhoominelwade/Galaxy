import { useRef, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import MinimapDot from './MinimapDot';

const MinimapContent = ({ mainCamera, galaxyPositions, selectedGalaxy }) => {
  const { scene, camera, raycaster } = useThree();
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
      // Add navigation logic here if needed
    }
  }, [raycaster, scene, mainCamera]);

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

export default MinimapContent;