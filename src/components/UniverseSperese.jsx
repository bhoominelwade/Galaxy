// UniverseSpheres.jsx
import { useState, useEffect, useRef, memo, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const UniverseSpheres = memo(({ selectedGalaxy, hyperspaceActive }) => {
  const groupRef = useRef();
  const rotationRef = useRef(0);
  const [textureError, setTextureError] = useState(false);
  const fadeStartTimeRef = useRef(null);
  const opacityRef = useRef(1);
  const previousHyperspaceRef = useRef(hyperspaceActive);
  const fadeModeRef = useRef(null); // 'in' or 'out'
  
  const texture = useMemo(() => {
    const tex = new THREE.TextureLoader().load(
      '/textures/nub2.jpg',
      undefined,
      undefined,
      (error) => {
        console.warn('Texture failed to load:', error);
        setTextureError(true);
      }
    );
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    return tex;
  }, []);

  useFrame(({ clock, camera }) => {
    if (groupRef.current) {
      // Update position and rotation
      groupRef.current.position.copy(camera.position);
      rotationRef.current += 0.0001;
      groupRef.current.rotation.y = rotationRef.current;
      
      // Detect transition changes
      if (hyperspaceActive !== previousHyperspaceRef.current) {
        fadeStartTimeRef.current = clock.elapsedTime;
        fadeModeRef.current = hyperspaceActive ? 'out' : 'in';
        previousHyperspaceRef.current = hyperspaceActive;
      }
      
      // Handle fading
      if (fadeStartTimeRef.current !== null) {
        const fadeElapsed = clock.elapsedTime - fadeStartTimeRef.current;
        const fadeDuration = 0.5; // Half second fade
        
        if (fadeModeRef.current === 'out') {
          opacityRef.current = Math.max(0, 1 - (fadeElapsed / fadeDuration));
        } else {
          opacityRef.current = Math.min(1, fadeElapsed / fadeDuration);
        }
        
        // Update material opacities
        groupRef.current.children.forEach(child => {
          if (child.material) {
            child.material.opacity = child.material.baseOpacity * opacityRef.current;
          }
        });
        
        // Reset fade when complete
        if (fadeElapsed >= fadeDuration) {
          fadeStartTimeRef.current = null;
          fadeModeRef.current = null;
        }
      }
      
      // Only hide when selected and not transitioning back
      groupRef.current.visible = !selectedGalaxy || fadeModeRef.current === 'in';
    }
  });

  // Store base opacity values on mount
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.children.forEach(child => {
        if (child.material) {
          child.material.baseOpacity = child.material.opacity;
        }
      });
    }
  }, []);

  return (
    <group ref={groupRef} renderOrder={-2000}>
      {/* Deep space background layer */}
      <mesh>
        <sphereGeometry args={[1000, 16, 16]} />
        <meshBasicMaterial
          color="#000033"
          side={THREE.BackSide}
          depthWrite={false}
          depthTest={false}
          fog={false}
          transparent={true}
          opacity={0.8}
        />
      </mesh>

      {/* Enhanced base color layer */}
      <mesh>
        <sphereGeometry args={[1000, 16, 16]} />
        <meshBasicMaterial
          color="#000000"
          side={THREE.BackSide}
          transparent={true}
          opacity={0.5}
          depthWrite={false}
          depthTest={false}
          blending={THREE.AdditiveBlending}
          fog={false}
        />
      </mesh>

      {/* Nebula layer */}
      {!textureError && (
        <mesh>
          <sphereGeometry args={[1000, 16, 16]} />
          <meshBasicMaterial
            map={texture}
            side={THREE.BackSide}
            transparent={true}
            opacity={0.4}
            depthWrite={false}
            depthTest={false}
            blending={THREE.AdditiveBlending}
            fog={false}
          />
        </mesh>
      )}
    </group>
  );
});

export default UniverseSpheres;