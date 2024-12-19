import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const HyperspaceTunnel = ({ active, galaxyPosition = [0, 0, 0] }) => {
  const meshRef = useRef();
  const numberOfStars = 3000; // More stars for better effect
  const { camera } = useThree();
  const velocityRef = useRef(new THREE.Vector3());

  const [geometry, material] = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(numberOfStars * 6);
    const colors = new Float32Array(numberOfStars * 6);
    
    const starColors = [
      new THREE.Color('#FFFFFF'), // Pure white
      new THREE.Color('#B0C4DE'), // Light steel blue
      new THREE.Color('#E6E6FA'), // Lavender
      new THREE.Color('#F0F8FF'), // Alice blue
    ];

    for (let i = 0; i < numberOfStars; i++) {
      const baseIndex = i * 6;
      
      // Distribute stars in a wide spherical shell around camera
      const radius = 50 + Math.random() * 800; // Much wider distribution
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      
      positions[baseIndex] = radius * Math.sin(phi) * Math.cos(theta);
      positions[baseIndex + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[baseIndex + 2] = radius * Math.cos(phi);
      
      // Initial trail position same as star
      positions[baseIndex + 3] = positions[baseIndex];
      positions[baseIndex + 4] = positions[baseIndex + 1];
      positions[baseIndex + 5] = positions[baseIndex + 2];
      
      // Color assignment with distance-based brightness
      const color = starColors[Math.floor(Math.random() * starColors.length)];
      const distanceFactor = 1 - (radius / 450); // Stars fade with distance
      const brightness = (0.6 + Math.random() * 0.4) * distanceFactor;
      
      // Star is brighter at front
      colors[baseIndex] = color.r * brightness;
      colors[baseIndex + 1] = color.g * brightness;
      colors[baseIndex + 2] = color.b * brightness;
      // Trail fades out
      colors[baseIndex + 3] = color.r * brightness * 0.1;
      colors[baseIndex + 4] = color.g * brightness * 0.1;
      colors[baseIndex + 5] = color.b * brightness * 0.1;
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    return [geometry, material];
  }, []);

  useEffect(() => {
    if (active) {
      // Set travel direction
      velocityRef.current.set(...galaxyPosition)
        .sub(camera.position)
        .normalize()
        .multiplyScalar(8); // Faster speed
    }
  }, [active, camera, galaxyPosition]);

  useFrame((state, delta) => {
    if (!active || !meshRef.current) return;

    const positions = meshRef.current.geometry.attributes.position.array;
    const speed = delta * 100; // Base movement speed
    
    for (let i = 0; i < numberOfStars; i++) {
      const baseIndex = i * 6;
      
      // Move star position
      positions[baseIndex] += velocityRef.current.x * speed;
      positions[baseIndex + 1] += velocityRef.current.y * speed;
      positions[baseIndex + 2] += velocityRef.current.z * speed;
      
      // Calculate trail length based on speed and position
      const distanceFromCenter = Math.sqrt(
        positions[baseIndex] * positions[baseIndex] +
        positions[baseIndex + 1] * positions[baseIndex + 1] +
        positions[baseIndex + 2] * positions[baseIndex + 2]
      );
      
      // Longer trails for closer stars
      const trailLength = Math.min(200, 50 + (400 / (1 + distanceFromCenter * 0.01)));
      
      // Update trail end position
      positions[baseIndex + 3] = positions[baseIndex] - velocityRef.current.x * trailLength;
      positions[baseIndex + 4] = positions[baseIndex + 1] - velocityRef.current.y * trailLength;
      positions[baseIndex + 5] = positions[baseIndex + 2] - velocityRef.current.z * trailLength;
      
      // Reset stars that go too far
      if (distanceFromCenter > 800) {
        // Reset to a random position in a shell behind the camera
        const radius = 50 + Math.random() * 200;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        
        const newX = radius * Math.sin(phi) * Math.cos(theta);
        const newY = radius * Math.sin(phi) * Math.sin(theta);
        const newZ = -radius * Math.cos(phi); // Behind camera
        
        positions[baseIndex] = newX;
        positions[baseIndex + 1] = newY;
        positions[baseIndex + 2] = newZ;
        positions[baseIndex + 3] = newX;
        positions[baseIndex + 4] = newY;
        positions[baseIndex + 5] = newZ;
      }
    }

    meshRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return active ? <lineSegments ref={meshRef} geometry={geometry} material={material} /> : null;
};

export default React.memo(HyperspaceTunnel);