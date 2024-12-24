// WebGLContextHandler.js
import { useEffect, useCallback } from 'react';
import { useThree } from '@react-three/fiber';

const WebGL = () => {
  const { gl, invalidate } = useThree();

  // Handle context loss
  const handleContextLost = useCallback((event) => {
    event.preventDefault();
    console.warn('WebGL context lost, attempting to restore...', {
      timestamp: new Date().toISOString(),
      canvas: event.target,
      reason: event.statusMessage || 'Unknown reason'
    });
  }, []);

  // Handle context restoration
  const handleContextRestored = useCallback(() => {
    console.log('WebGL context restored, reinitializing renderer...');
    
    if (gl) {
      // Reinitialize renderer settings
      gl.setSize(gl.domElement.width, gl.domElement.height);
      gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      gl.shadowMap.enabled = true;
      
      // Force a re-render
      invalidate();
    }
  }, [gl, invalidate]);

  // Handle context creation errors
  const handleContextCreationError = useCallback((event) => {
    console.error('WebGL context creation failed:', {
      timestamp: new Date().toISOString(),
      error: event.statusMessage,
      browser: navigator.userAgent
    });
  }, []);

  useEffect(() => {
    if (!gl?.domElement) {
      console.error('WebGL context not available');
      return;
    }

    const canvas = gl.domElement;
    
    // Add event listeners with error boundaries
    try {
      canvas.addEventListener('webglcontextlost', handleContextLost, false);
      canvas.addEventListener('webglcontextrestored', handleContextRestored, false);
      canvas.addEventListener('webglcontextcreationerror', handleContextCreationError, false);
    } catch (error) {
      console.error('Error setting up WebGL event listeners:', error);
    }

    // Clean up function
    return () => {
      try {
        canvas.removeEventListener('webglcontextlost', handleContextLost);
        canvas.removeEventListener('webglcontextrestored', handleContextRestored);
        canvas.removeEventListener('webglcontextcreationerror', handleContextCreationError);
      } catch (error) {
        console.error('Error cleaning up WebGL event listeners:', error);
      }
    };
  }, [gl, handleContextLost, handleContextRestored, handleContextCreationError]);

  return null;
};

export default WebGL;