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
    const positions = new Float32Array(20000 * 5);
    const colors = new Float32Array(20000 * 5);
    const velocities = new Float32Array(20000 * 3);
    
    const starColors = [
      new THREE.Color('#FFE87C'),  // Yellow
      new THREE.Color('#B39DDB'),  // Purple
      new THREE.Color('#FFFFFF'),  // White
      new THREE.Color('#64B5F6'),  // Blue
    ];

    for (let i = 0; i < positions.length; i += 3) {
      positions[i] = (Math.random() - 0.5) * 4000;
      positions[i + 1] = (Math.random() - 0.5) * 4000;
      positions[i + 2] = (Math.random() - 0.5) * 4000;

      const phi = Math.random() * Math.PI * 2;
      const theta = Math.random() * Math.PI;
      const speed = Math.random() * 2 + 1;
      
      velocities[i] = Math.sin(theta) * Math.cos(phi) * speed;
      velocities[i + 1] = Math.sin(theta) * Math.sin(phi) * speed;
      velocities[i + 2] = Math.cos(theta) * speed;

      const color = starColors[Math.floor(Math.random() * starColors.length)];
      colors[i] = color.r;
      colors[i + 1] = color.g;
      colors[i + 2] = color.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Create star-shaped point texture
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    
    // Function to draw a star shape
    const drawStar = (ctx, cx, cy, spikes, outerRadius, innerRadius) => {
      let rot = Math.PI / 2 * 3;
      let x = cx;
      let y = cy;
      const step = Math.PI / spikes;

      ctx.beginPath();
      ctx.moveTo(cx, cy - outerRadius);

      for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
      }
      
      ctx.lineTo(cx, cy - outerRadius);
      ctx.closePath();
    };

    // Clear canvas
    ctx.clearRect(0, 0, 32, 32);
    
    // Create gradient for the star
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = gradient;
    
    // Draw star shape
    drawStar(ctx, 16, 16, 4, 16,8);
    ctx.fill();
    
    const texture = new THREE.CanvasTexture(canvas);

    const coreMaterial = new THREE.PointsMaterial({
      size: 3,
      map: texture,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    const glowMaterial = new THREE.PointsMaterial({
      size: 6,
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
        
        positions[i] += vel[i] * baseSpeed;
        positions[i + 1] += vel[i + 1] * baseSpeed;
        positions[i + 2] += vel[i + 2] * baseSpeed;

        const distance = Math.sqrt(
          positions[i] * positions[i] + 
          positions[i + 1] * positions[i + 1] + 
          positions[i + 2] * positions[i + 2]
        );

        if (distance > 2000) {
          positions[i] = 0;
          positions[i + 1] = 0;
          positions[i + 2] = 0;

          const phi = Math.random() * Math.PI * 2;
          const theta = Math.random() * Math.PI;
          const speed = Math.random() * 2 + 1;
          
          vel[i] = Math.sin(theta) * Math.cos(phi) * speed;
          vel[i + 1] = Math.sin(theta) * Math.sin(phi) * speed;
          vel[i + 2] = Math.cos(theta) * speed;
        }

        vel[i] *= 1.01;
        vel[i + 1] *= 1.01;
        vel[i + 2] *= 1.01;
      }

      materials[0].size = 2 + transitionProgress * 4;
      materials[1].size = 4 + transitionProgress * 8;
    } else {
      transitionStartRef.current = null;
      materials[0].size = 3;
      materials[1].size = 6;
    }

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