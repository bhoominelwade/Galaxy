import { memo } from 'react';
import { Stars } from '@react-three/drei';

const StableStars = memo(() => (
  <>
    <Stars 
      radius={200}
      depth={60}
      count={5000}
      factor={10}
      saturation={1}
      fade={true}
      speed={0.3}
    />
    <Stars 
      radius={150}
      depth={50}
      count={2000}
      factor={15}
      saturation={1}
      fade={true}
      speed={0.2}
    />
  </>
));

export default StableStars;