import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const GalaxyCulling = ({ galaxies, onVisibleGalaxiesChange, calculateGalaxyPosition }) => {
  useFrame(({ camera }) => {
    if (!galaxies.length) return;
    
    const newVisible = galaxies.filter((galaxy, index) => {
      const pos = calculateGalaxyPosition(index, galaxies.length);
      const distance = new THREE.Vector3(...pos).distanceTo(camera.position);
      return distance < 1000;
    });
    
    onVisibleGalaxiesChange(newVisible);
  });

  return null;
};

export default GalaxyCulling;