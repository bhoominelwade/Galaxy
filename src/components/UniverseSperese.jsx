import { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';

const UniverseSpheres = memo(({ selectedGalaxy }) => {
  const groupRef = useRef();
  const rotationRef = useRef(0);
  const [textureError, setTextureError] = useState(false);
  
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

  useFrame(({camera}) => {
    if (groupRef.current) {
      groupRef.current.position.copy(camera.position);
      rotationRef.current += 0.0001;
      groupRef.current.rotation.y = rotationRef.current;
      groupRef.current.visible = !selectedGalaxy;
    }
  });

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
        />
      </mesh>

      {/* Enhanced base color layer for better visibility */}
      <mesh>
        <sphereGeometry args={[1000, 16, 16]} />
        <meshBasicMaterial
          color="#000000"
          side={THREE.BackSide}
          transparent={true}
          opacity={0.3}
          depthWrite={false}
          depthTest={false}
          blending={THREE.AdditiveBlending}
          fog={false}
        />
      </mesh>

      {/* Nebula layer with error handling */}
      {!textureError && (
        <mesh>
          <sphereGeometry args={[1000, 16, 16]} />
          <meshBasicMaterial
            map={texture}
            side={THREE.BackSide}
            transparent={true}
            opacity={0.5}
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