import { memo, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const DynamicStarfield = memo(({ hyperspaceActive }) => {
  const pointsRef = useRef();
  const glowPointsRef = useRef();
  const velocitiesRef = useRef();
  const transitionStartRef = useRef(null);
  
  const [geometry, materials, velocities] = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(900000 * 3);
    const velocities = new Float32Array(600000 * 3);
    // Define colors array that was missing
    const colors = new Float32Array(900000 * 3);
    
    // Enhanced color distribution for denser starfield
    const starColors = [
      { color: new THREE.Color('#FFFFFF'), weight: 65 },    // White stars
      { color: new THREE.Color('#BBDDFF'), weight: 20 },    // Blue-white
      { color: new THREE.Color('#99CCFF'), weight: 10 },    // Blue
      { color: new THREE.Color('#AADDFF'), weight: 3 },     // Bright blue
      { color: new THREE.Color('#FFEECC'), weight: 1.5 },   // Slight yellow tinge
      { color: new THREE.Color('#FFE4B5'), weight: 0.5 }    // Pale golden
    ];
    
    const totalWeight = starColors.reduce((sum, type) => sum + type.weight, 0);
    const colorProbabilities = starColors.map(type => type.weight / totalWeight);

    const spaceRange = 5000;

    for (let i = 0; i < positions.length; i += 3) {
      // Position calculation
      positions[i] = (Math.random() - 0.5) * spaceRange;
      positions[i + 1] = (Math.random() - 0.5) * spaceRange;
      positions[i + 2] = (Math.random() - 0.5) * spaceRange;

      // Velocity calculation
      const phi = Math.random() * Math.PI * 2;
      const theta = Math.random() * Math.PI;
      const speed = Math.random() * 2 + 1;
      
      velocities[i] = Math.sin(theta) * Math.cos(phi) * speed;
      velocities[i + 1] = Math.sin(theta) * Math.sin(phi) * speed;
      velocities[i + 2] = Math.cos(theta) * speed;

      // Color selection with cumulative probability
      const rand = Math.random();
      let cumulative = 0;
      let selectedColor = starColors[0].color;
      
      for (let j = 0; j < colorProbabilities.length; j++) {
        cumulative += colorProbabilities[j];
        if (rand <= cumulative) {
          selectedColor = starColors[j].color;
          break;
        }
      }

      colors[i] = selectedColor.r;
      colors[i + 1] = selectedColor.g;
      colors[i + 2] = selectedColor.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Create star texture
    const canvas = document.createElement('canvas');
    canvas.width = 150;
    canvas.height = 150;
    const ctx = canvas.getContext('2d');

    // Helper function for drawing spikes
    const drawSpike = (ctx, x, y, length, width, intensity, angle = 0) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      
      const gradient = ctx.createLinearGradient(0, -length, 0, length);
      gradient.addColorStop(0, `rgba(255, 255, 255, 0)`);
      gradient.addColorStop(0.3, `rgba(255, 255, 255, ${intensity * 0.1})`);
      gradient.addColorStop(0.4, `rgba(255, 255, 255, ${intensity * 0.4})`);
      gradient.addColorStop(0.5, `rgba(255, 255, 255, ${intensity})`);
      gradient.addColorStop(0.6, `rgba(255, 255, 255, ${intensity * 0.4})`);
      gradient.addColorStop(0.7, `rgba(255, 255, 255, ${intensity * 0.1})`);
      gradient.addColorStop(1, `rgba(255, 255, 255, 0)`);
      
      ctx.beginPath();
      ctx.strokeStyle = gradient;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.moveTo(0, -length);
      ctx.lineTo(0, length);
      ctx.stroke();
      ctx.restore();
    };

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Helper function for drawing glow
    const drawGlow = (radius, alpha) => {
      const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, radius);
      gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
      gradient.addColorStop(0.2, `rgba(230, 240, 255, ${alpha * 0.8})`);
      gradient.addColorStop(0.5, `rgba(200, 220, 255, ${alpha * 0.4})`);
      gradient.addColorStop(0.8, `rgba(180, 200, 255, ${alpha * 0.2})`);
      gradient.addColorStop(1, 'rgba(150, 180, 255, 0)');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    // Draw multiple glow layers
    drawGlow(64, 0.2);
    drawGlow(48, 0.3);
    drawGlow(32, 0.4);
    drawGlow(24, 0.5);

    const center = canvas.width / 2;
    
    // Draw main spikes
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      drawSpike(ctx, center, center, 60, 2, 1.0, angle);
      drawSpike(ctx, center, center, 58, 1.5, 0.7, angle + 0.02);
    }

    // Draw secondary spikes
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2 + Math.PI / 4;
      drawSpike(ctx, center, center, 45, 1, 0.5, angle);
    }

    // Draw star core
    const coreGradient = ctx.createRadialGradient(center, center, 0, center, center, 8);
    coreGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    coreGradient.addColorStop(0.3, 'rgba(240, 248, 255, 0.8)');
    coreGradient.addColorStop(0.5, 'rgba(220, 235, 255, 0.6)');
    coreGradient.addColorStop(0.7, 'rgba(200, 220, 255, 0.4)');
    coreGradient.addColorStop(1, 'rgba(180, 200, 255, 0)');

    ctx.beginPath();
    ctx.fillStyle = coreGradient;
    ctx.arc(center, center, 8, 0, Math.PI * 2);
    ctx.fill();

    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    // Create materials
    const coreMaterial = new THREE.PointsMaterial({
      size: 2.5,
      map: texture,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    const glowMaterial = new THREE.PointsMaterial({
      size: 5,
      map: texture,
      vertexColors: true,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    return [geometry, [coreMaterial, glowMaterial], velocities];
  }, []);

  velocitiesRef.current = velocities;

  useFrame((state, delta) => {
    if (!pointsRef.current || !glowPointsRef.current) return;

    const positions = pointsRef.current.geometry.attributes.position.array;
    const currentTime = state.clock.getElapsedTime();

    if (hyperspaceActive) {
      if (transitionStartRef.current === null) {
        transitionStartRef.current = currentTime;
      }

      const transitionProgress = Math.min((currentTime - transitionStartRef.current) * 2, 1);
      const baseSpeed = delta * 200 * transitionProgress;

      for (let i = 0; i < positions.length; i += 3) {
        const vel = velocitiesRef.current;
        
        // Update positions
        positions[i] += vel[i] * baseSpeed;
        positions[i + 1] += vel[i + 1] * baseSpeed;
        positions[i + 2] += vel[i + 2] * baseSpeed;

        // Check if star needs to be reset
        const distance = Math.sqrt(
          positions[i] * positions[i] + 
          positions[i + 1] * positions[i + 1] + 
          positions[i + 2] * positions[i + 2]
        );

        if (distance > 3000) {
          // Reset position
          positions[i] = 0;
          positions[i + 1] = 0;
          positions[i + 2] = 0;

          // Generate new velocity
          const phi = Math.random() * Math.PI * 2;
          const theta = Math.random() * Math.PI;
          const speed = Math.random() * 2 + 1;
          
          vel[i] = Math.sin(theta) * Math.cos(phi) * speed;
          vel[i + 1] = Math.sin(theta) * Math.sin(phi) * speed;
          vel[i + 2] = Math.cos(theta) * speed;
        }

        // Increase velocity
        vel[i] *= 1.01;
        vel[i + 1] *= 1.01;
        vel[i + 2] *= 1.01;
      }

      // Update material sizes based on transition
      materials[0].size = 2 + transitionProgress * 4;
      materials[1].size = 4 + transitionProgress * 8;
    } else {
      // Reset when not in hyperspace
      transitionStartRef.current = null;
      materials[0].size = 3;
      materials[1].size = 5;
    }

    // Mark geometry for update
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
    glowPointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <>
      <points ref={pointsRef} geometry={geometry} material={materials[0]} />
      <points ref={glowPointsRef} geometry={geometry} material={materials[1]} />
    </>
  );
});

export default DynamicStarfield;