const MinimapDot = ({ position, size = 1, color = '#ffffff', onClick }) => (
    <mesh position={position} onClick={onClick}>
      <sphereGeometry args={[size, 8, 8]} />
      <meshBasicMaterial color={color} transparent opacity={0.8} />
      <pointLight distance={5} intensity={0.5} color={color} />
    </mesh>
  );
  
  export default MinimapDot;