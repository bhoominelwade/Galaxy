// Enhanced WebGL handler with performance monitoring
import { useState, useEffect, useCallback } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

const WebGL = () => {
  const { gl, invalidate, scene, camera } = useThree();
  const [lastFrameTime, setLastFrameTime] = useState(0);
  const [frameCount, setFrameCount] = useState(0);

  // Performance monitoring
  const checkPerformance = useCallback(() => {
    const currentTime = performance.now();
    if (lastFrameTime) {
      const delta = currentTime - lastFrameTime;
      if (delta > 50) { // Frame took longer than 20fps
        console.warn('Performance warning: Frame time:', delta.toFixed(2), 'ms');
        // Reduce detail level if needed
        scene.traverse((object) => {
          if (object.geometry) {
            object.geometry.dispose();
          }
        });
        
        // Force garbage collection if available
        if (typeof window.gc === 'function') {
          window.gc();
        }
      }
    }
    setLastFrameTime(currentTime);
    setFrameCount(prev => prev + 1);
  }, [lastFrameTime, scene]);

  // Enhanced context loss handler
  const handleContextLost = useCallback((event) => {
    event.preventDefault();
    console.warn('WebGL context lost');
    
    // Notify any active WebSocket connections to pause updates
    if (window.wsConnection) {
      window.wsConnection.send(JSON.stringify({
        type: 'pause',
        reason: 'context_lost'
      }));
    }
  }, []);

  // Enhanced context restoration
  const handleContextRestored = useCallback(() => {
    console.log('WebGL context restored');
    
    if (gl) {
      // Reinitialize renderer with optimized settings
      gl.setSize(gl.domElement.width, gl.domElement.height);
      gl.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // Limit pixel ratio
      gl.shadowMap.enabled = true;
      gl.shadowMap.type = THREE.PCFSoftShadowMap;
      
      // Enable performance optimizations
      gl.powerPreference = 'high-performance';
      gl.antialias = false; // Disable antialiasing if performance is critical
      
      // Resume WebSocket updates
      if (window.wsConnection) {
        window.wsConnection.send(JSON.stringify({
          type: 'resume',
          reason: 'context_restored'
        }));
      }
      
      invalidate();
    }
  }, [gl, invalidate]);

  useEffect(() => {
    if (!gl?.domElement) return;

    const canvas = gl.domElement;
    
    // Apply initial optimizations
    gl.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
    gl.powerPreference = 'high-performance';
    
    // Setup performance monitoring
    let animationFrameId;
    const animate = () => {
      checkPerformance();
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    // Event listeners
    canvas.addEventListener('webglcontextlost', handleContextLost, false);
    canvas.addEventListener('webglcontextrestored', handleContextRestored, false);

    return () => {
      cancelAnimationFrame(animationFrameId);
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
    };
  }, [gl, handleContextLost, handleContextRestored, checkPerformance]);

  return null;
};

// Optimized transaction processing middleware
export const createTransactionProcessor = (wsConnection) => {
  let processingQueue = [];
  let isProcessing = false;
  const maxBatchSize = 50; // Process max 50 transactions at once
  
  const processQueue = async () => {
    if (isProcessing || processingQueue.length === 0) return;
    
    isProcessing = true;
    const batch = processingQueue.splice(0, maxBatchSize);
    
    try {
      const uniqueTransactions = new Map();
      batch.forEach(tx => {
        if (!uniqueTransactions.has(tx.hash)) {
          uniqueTransactions.set(tx.hash, tx);
        }
      });
      
      // Process unique transactions
      const transactions = Array.from(uniqueTransactions.values());
      window.dispatchEvent(new CustomEvent('newTransactions', {
        detail: { transactions }
      }));
      
    } catch (error) {
      console.error('Error processing transaction batch:', error);
      // Re-add failed transactions to queue
      processingQueue.unshift(...batch);
    }
    
    isProcessing = false;
    if (processingQueue.length > 0) {
      setTimeout(processQueue, 100); // Process next batch after 100ms
    }
  };
  
  return {
    addTransaction: (transaction) => {
      processingQueue.push(transaction);
      processQueue();
    },
    clearQueue: () => {
      processingQueue = [];
      isProcessing = false;
    }
  };
};

export default WebGL;