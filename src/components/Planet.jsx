import { useRef, useState, useMemo } from 'react';
import { Html, useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Define orbit radiuses for different transaction ranges
const ORBIT_RANGES = [
  { min: 0, max: 100, radius: 6 },      // Closer inner orbit
  { min: 100, max: 200, radius: 9 },
  { min: 200, max: 300, radius: 12 },
  { min: 300, max: 400, radius: 15 },
  { min: 400, max: 500, radius: 18 },
  { min: 500, max: Infinity, radius: 21 }  // Smaller maximum radius
];

const getOrbitForAmount = (amount) => {
  return ORBIT_RANGES.find(range => amount >= range.min && amount < range.max) || ORBIT_RANGES[0];
};

const Planet = ({ transaction, position, baseSize = 1, orbitIndex = 0 }) => {
  const meshRef = useRef();
  const ringsRef = useRef();
  const [hovered, setHovered] = useState(false);
  
  // Adjust size calculation
  const size = baseSize * (0.6 + Math.log10(transaction.amount + 1) / 3);
  
  // Load and configure textures
  const textures = useTexture({
    map: '/textures/tex1.jpg',
    normalMap: '/textures/tex2.jpg',
    roughnessMap: '/textures/tex3.jpg',
    aoMap: '/textures/tex4.jpg',
  });

  // Enhance texture settings
  Object.values(textures).forEach(texture => {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
    texture.minFilter = THREE.LinearMipMapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
  });

  // Animation remains the same
  useFrame(({ clock }) => {
    if (meshRef.current) {
      const time = clock.getElapsedTime();
      meshRef.current.rotation.y = time * 0.1;
      
      // Get base orbit parameters
      const orbit = getOrbitForAmount(transaction.amount);
      
      // Create unique but stable random values for this planet
      const seed = transaction.hash ? 
        transaction.hash.split('').reduce((a, b) => a + b.charCodeAt(0), 0) : 
        orbitIndex * 1000;
      
      // Use the seed to generate consistent random values
      const randomVal = (seed * 9301 + 49297) % 233280;
      const rnd = randomVal / 233280;
  
      // Adjust orbit radius with some randomness
      const radiusVariation = Math.sin(seed) * 1.5;  // More variation
      const baseRadius = orbit.radius + radiusVariation;
      
      // Vary the orbit speed based on radius and a random factor
      const speedVariation = 0.5 + rnd * 0.5;
      const orbitSpeed = (0.05 * speedVariation) / Math.sqrt(baseRadius);
  
      // Create more random starting positions
      const startAngle = (seed % 360) * Math.PI / 180;
      const angle = time * orbitSpeed + startAngle;
      
      // Add vertical variation
      const heightVariation = (Math.sin(seed) * 2) * (baseRadius / orbit.radius);
      
      // Add some elliptical variation to the orbit
      const ellipticalFactor = 0.8 + (rnd * 0.4);
      
      meshRef.current.position.x = Math.cos(angle) * baseRadius * ellipticalFactor;
      meshRef.current.position.y = heightVariation;
      meshRef.current.position.z = Math.sin(angle) * baseRadius;
    }
    
    if (ringsRef.current) {
      ringsRef.current.rotation.z = clock.getElapsedTime() * 0.05;
    }
  });

  // Generate a unique color for each planet based on transaction amount
  // Generate a unique color for each planet based on multiple factors
  const planetColor = useMemo(() => {
  // Create a unique seed from transaction properties
  const seed = transaction.hash ? 
    transaction.hash.split('').reduce((a, b) => a + b.charCodeAt(0), 0) : 
    orbitIndex * 1000;
  
  // Use both amount and seed to generate color
  const hue = ((transaction.amount * seed) % 360) / 360;
  const saturation = 0.5 + (seed % 1000) / 2000;  // 0.5 to 1.0
  const lightness = 0.4 + (seed % 1000) / 2500;   // 0.4 to 0.8
  
  return new THREE.Color().setHSL(hue, saturation, lightness);
}, [transaction.hash, transaction.amount, orbitIndex]);

  return (
    <group position={position}>
      {/* Planet light source */}
      <pointLight
        color={planetColor}
        intensity={0.5}
        distance={5}
        decay={2}
      />

      {/* Main Planet Body */}
      <mesh
        ref={meshRef}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[size, 32, 32]} />
        <meshStandardMaterial
          {...textures}
          color={planetColor}
          metalness={0.3}
          roughness={0.6}
          normalScale={new THREE.Vector2(2, 2)}
          aoMapIntensity={0.5}
          emissive={planetColor}
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Enhanced atmosphere glow */}
      <mesh scale={[1.3, 1.3, 1.3]}>
        <sphereGeometry args={[size, 32, 32]} />
        <meshPhongMaterial
          color={planetColor}
          transparent
          opacity={0.15}
          depthWrite={false}
          side={THREE.BackSide}
          emissive={planetColor}
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Second atmosphere layer for stronger glow */}
      <mesh scale={[1.4, 1.4, 1.4]}>
        <sphereGeometry args={[size, 32, 32]} />
        <meshPhongMaterial
          color={planetColor}
          transparent
          opacity={0.1}
          depthWrite={false}
          side={THREE.BackSide}
          emissive={planetColor}
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Enhanced rings for larger transactions */}
      {transaction.amount > 500 && (
        <group ref={ringsRef} rotation={[Math.PI / 4, 0, 0]}>
          <mesh>
            <torusGeometry args={[size * 1.8, size * 0.2, 32, 100]} />
            <meshStandardMaterial
              color={planetColor}
              metalness={0.5}
              roughness={0.4}
              transparent
              opacity={0.6}
              emissive={planetColor}
              emissiveIntensity={0.1}
            />
          </mesh>
        </group>
      )}

      {/* Info tooltip */}
      {hovered && (
        <Html>
          <div style={{
            background: 'rgba(0,0,0,0.9)',
            padding: '12px',
            borderRadius: '8px',
            color: 'white',
            width: '180px',
            textAlign: 'left',
            border: `2px solid ${planetColor.getStyle()}`,
            boxShadow: `0 0 20px ${planetColor.getStyle()}`
          }}>
            <div style={{ 
              fontSize: '1.1em', 
              fontWeight: 'bold',
              color: planetColor.getStyle()
            }}>
              Amount: {transaction.amount.toFixed(2)}
            </div>
            <div style={{ marginTop: '4px', opacity: 0.8 }}>
              Time: {new Date(transaction.timestamp).toLocaleTimeString()}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
};

export default Planet;