import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const UniverseReveal = ({ active }) => {
  const meshRef = useRef();
  const numberOfStars = 5000; // Increased for better coverage
  const { camera } = useThree();
  
  const [geometry, material] = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(numberOfStars * 6);
    const colors = new Float32Array(numberOfStars * 6);
    const velocities = new Float32Array(numberOfStars * 3);
    
    const starColors = [
      new THREE.Color('#FFFFFF'),
      new THREE.Color('#B0C4DE'),
      new THREE.Color('#E6E6FA'),
      new THREE.Color('#87CEEB'), // Added sky blue
      new THREE.Color('#ADD8E6')  // Added light blue
    ];

    // Initial setup - all stars start near center
    for (let i = 0; i < numberOfStars; i++) {
      const baseIndex = i * 6;
      const velocityIndex = i * 3;
      
      // Start in tight sphere around center
      const radius = Math.random() * 10;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      
      // Initial positions (clustered near center)
      positions[baseIndex] = radius * Math.sin(phi) * Math.cos(theta);
      positions[baseIndex + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[baseIndex + 2] = radius * Math.cos(phi);
      
      // Trail starts at same position
      positions[baseIndex + 3] = positions[baseIndex];
      positions[baseIndex + 4] = positions[baseIndex + 1];
      positions[baseIndex + 5] = positions[baseIndex + 2];
      
      // Calculate velocity vector (outward from center)
      const speed = 1 + Math.random() * 2;
      velocities[velocityIndex] = Math.sin(phi) * Math.cos(theta) * speed;
      velocities[velocityIndex + 1] = Math.sin(phi) * Math.sin(theta) * speed;
      velocities[velocityIndex + 2] = Math.cos(phi) * speed;
      
      // Color assignment
      const color = starColors[Math.floor(Math.random() * starColors.length)];
      const brightness = 0.7 + Math.random() * 0.3;
      
      // Star colors
      colors[baseIndex] = color.r * brightness;
      colors[baseIndex + 1] = color.g * brightness;
      colors[baseIndex + 2] = color.b * brightness;
      
      // Trail colors (fainter)
      colors[baseIndex + 3] = color.r * brightness * 0.3;
      colors[baseIndex + 4] = color.g * brightness * 0.3;
      colors[baseIndex + 5] = color.b * brightness * 0.3;
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('velocity', new THREE.Float32BufferAttribute(velocities, 3));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    return [geometry, material];
  }, []);

  useFrame((state, delta) => {
    if (!active || !meshRef.current) return;

    const positions = meshRef.current.geometry.attributes.position.array;
    const velocities = meshRef.current.geometry.attributes.velocity.array;
    const speed = delta * 60;
    
    for (let i = 0; i < numberOfStars; i++) {
      const baseIndex = i * 6;
      const velocityIndex = i * 3;
      
      // Update star position
      positions[baseIndex] += velocities[velocityIndex] * speed;
      positions[baseIndex + 1] += velocities[velocityIndex + 1] * speed;
      positions[baseIndex + 2] += velocities[velocityIndex + 2] * speed;
      
      // Calculate trail length based on distance
      const distanceFromCenter = Math.sqrt(
        positions[baseIndex] * positions[baseIndex] +
        positions[baseIndex + 1] * positions[baseIndex + 1] +
        positions[baseIndex + 2] * positions[baseIndex + 2]
      );
      
      // Trail length increases with distance
      const trailLength = Math.min(100, 20 + distanceFromCenter * 0.1);
      
      // Update trail position
      positions[baseIndex + 3] = positions[baseIndex] - velocities[velocityIndex] * trailLength;
      positions[baseIndex + 4] = positions[baseIndex + 1] - velocities[velocityIndex + 1] * trailLength;
      positions[baseIndex + 5] = positions[baseIndex + 2] - velocities[velocityIndex + 2] * trailLength;
      
      // Reset stars that go too far
      if (distanceFromCenter > 1000) {
        // Reset to center with new random direction
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        
        positions[baseIndex] = 0;
        positions[baseIndex + 1] = 0;
        positions[baseIndex + 2] = 0;
        positions[baseIndex + 3] = 0;
        positions[baseIndex + 4] = 0;
        positions[baseIndex + 5] = 0;
        
        // New velocity direction
        const speed = 1 + Math.random() * 2;
        velocities[velocityIndex] = Math.sin(phi) * Math.cos(theta) * speed;
        velocities[velocityIndex + 1] = Math.sin(phi) * Math.sin(theta) * speed;
        velocities[velocityIndex + 2] = Math.cos(phi) * speed;
      }
    }

    meshRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return active ? <lineSegments ref={meshRef} geometry={geometry} material={material} /> : null;
};

export default React.memo(UniverseReveal);