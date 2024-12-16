import { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';

const DynamicStarfield = memo(() => {
  // Create static stars once
  const [geometry, material] = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(8000 * 3); // Reduced to 2000 stars
    const colors = new Float32Array(8000 * 3);
    
    // Create stars in a large cube volume
    for (let i = 0; i < positions.length; i += 3) {
      // Random position in a cube
      positions[i] = (Math.random() - 0.5) * 2000;
      positions[i + 1] = (Math.random() - 0.5) * 2000;
      positions[i + 2] = (Math.random() - 0.5) * 2000;
      
      // Very subtle brightness variation
      const brightness = Math.random() * 0.5 + 0.8;
      colors[i] = colors[i + 1] = colors[i + 2] = brightness;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 1.0,         // Smaller stars
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: false,  // Disabled to keep stars small
      depthWrite: false
    });

    return [geometry, material];
  }, []);

  return <points geometry={geometry} material={material} />;
});

export default DynamicStarfield;
