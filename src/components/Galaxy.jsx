import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

// Planet with orbit animation
const OrbitingPlanet = ({ transaction, orbitRadius, orbitSpeed, size, orbitOffset = 0 }) => {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);
  const time = useRef(orbitOffset);

  useFrame(() => {
    time.current += orbitSpeed;
    if (meshRef.current) {
      // Calculate orbital position
      meshRef.current.position.x = Math.cos(time.current) * orbitRadius;
      meshRef.current.position.z = Math.sin(time.current) * orbitRadius;
      // Self rotation
      meshRef.current.rotation.y += 0.01;
    }
  });

  return (
    <mesh
      ref={meshRef}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <sphereGeometry args={[size, 32, 32]} />
      <meshPhongMaterial
        color={hovered ? '#ffaa44' : '#4488ff'}
        emissive={hovered ? '#ff8822' : '#000000'}
        emissiveIntensity={hovered ? 0.5 : 0}
        metalness={0.3}
        roughness={0.7}
      />
      {hovered && (
        <Html>
          <div style={{
            background: 'rgba(0,0,0,0.8)',
            padding: '8px',
            borderRadius: '4px',
            color: 'white',
            transform: 'translateX(20px)'
          }}>
            <div>Amount: {transaction.amount.toFixed(2)}</div>
            <div>Time: {new Date(transaction.timestamp).toLocaleTimeString()}</div>
          </div>
        </Html>
      )}
    </mesh>
  );
};

// Spiral arm component
const GalaxyArm = ({ rotation, transactions, startIndex, count }) => {
  const particles = useRef();
  
  useFrame(() => {
    if (particles.current) {
      particles.current.rotation.y += 0.001;
    }
  });

  return (
    <group rotation={[0, rotation, 0]} ref={particles}>
      {transactions.slice(startIndex, startIndex + count).map((tx, index) => {
        const angle = (index / count) * Math.PI * 2;
        const radius = 3 + (index * 0.5);
        const orbitRadius = radius * 0.8;
        return (
          <OrbitingPlanet
            key={tx.hash}
            transaction={tx}
            orbitRadius={orbitRadius}
            orbitSpeed={0.001 / Math.sqrt(radius)}
            size={0.2 + (tx.amount / 2000)}
            orbitOffset={angle}
          />
        );
      })}
    </group>
  );
};

// Main Galaxy component
export const SpiralGalaxy = ({ transactions, position, onClick, isSelected }) => {
  const galaxyRef = useRef();
  const totalAmount = transactions.reduce((sum, tx) => sum + tx.amount, 0);

  useFrame(() => {
    if (galaxyRef.current && !isSelected) {
      galaxyRef.current.rotation.y += 0.001;
    }
  });

  // When selected, show detailed view with planets in spiral arms
  if (isSelected) {
    const armCount = 2;
    const transPerArm = Math.ceil(transactions.length / armCount);

    return (
      <group position={position} ref={galaxyRef}>
        {/* Central bright core */}
        <mesh>
          <sphereGeometry args={[1.5, 32, 32]} />
          <meshPhongMaterial
            color="#ffaa44"
            emissive="#ff8822"
            emissiveIntensity={0.5}
            transparent
            opacity={0.7}
          />
        </mesh>

        {/* Spiral arms with orbiting planets */}
        {Array.from({ length: armCount }).map((_, i) => (
          <GalaxyArm
            key={i}
            rotation={((Math.PI * 2) / armCount) * i}
            transactions={transactions}
            startIndex={i * transPerArm}
            count={transPerArm}
          />
        ))}
      </group>
    );
  }

  // Unselected view - compact galaxy
  return (
    <group position={position} ref={galaxyRef} onClick={onClick}>
      {/* Galaxy core */}
      <mesh>
        <sphereGeometry args={[2, 32, 32]} />
        <meshPhongMaterial
          color="#ffaa44"
          emissive="#ff8822"
          emissiveIntensity={0.3}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Galaxy disk */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2, 4, 32]} />
        <meshPhongMaterial
          color="#ffaa44"
          emissive="#ff8822"
          emissiveIntensity={0.2}
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>

      <Html>
        <div style={{
          background: 'rgba(0,0,0,0.8)',
          padding: '8px',
          borderRadius: '4px',
          color: 'white',
          transform: 'translateY(-30px)',
          textAlign: 'center'
        }}>
          Total: {totalAmount.toFixed(2)}
          <br/>
          Transactions: {transactions.length}
        </div>
      </Html>
    </group>
  );
};