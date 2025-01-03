import { useCallback, useEffect } from 'react';
import * as THREE from 'three';

export const useKeyboardControls = ({ controlsRef, mainCameraRef }) => {
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
  }, [controlsRef, mainCameraRef]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
};