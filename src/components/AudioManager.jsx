import React, { useEffect, useRef, useState } from 'react';

const AudioManager = ({ hyperspaceActive }) => {
  const backgroundMusicRef = useRef(null);
  const hyperspaceSoundRef = useRef(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Initialize audio on component mount
  useEffect(() => {
    // Initialize background music
    backgroundMusicRef.current = new Audio();
    backgroundMusicRef.current.src = '/audio/background.mp3';
    backgroundMusicRef.current.loop = true;
    backgroundMusicRef.current.volume = 0.8;
    backgroundMusicRef.current.preload = 'auto';
    
    // Initialize hyperspace sound
    hyperspaceSoundRef.current = new Audio();
    hyperspaceSoundRef.current.src = '/audio/hyperspace.mp3';
    hyperspaceSoundRef.current.volume = 0.9;
    hyperspaceSoundRef.current.preload = 'auto';

    // Add loading event listeners
    const handleBackgroundLoaded = () => {
      console.log('Background music loaded');
    };

    const handleHyperspaceLoaded = () => {
      console.log('Hyperspace sound loaded');
    };

    backgroundMusicRef.current.addEventListener('canplaythrough', handleBackgroundLoaded);
    hyperspaceSoundRef.current.addEventListener('canplaythrough', handleHyperspaceLoaded);

    return () => {
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.removeEventListener('canplaythrough', handleBackgroundLoaded);
      }
      if (hyperspaceSoundRef.current) {
        hyperspaceSoundRef.current.removeEventListener('canplaythrough', handleHyperspaceLoaded);
      }
    };
  }, []);

  // Handle user interaction to start audio
  useEffect(() => {
    const handleUserInteraction = async () => {
      try {
        if (!isReady && backgroundMusicRef.current) {
          const playPromise = backgroundMusicRef.current.play();
          if (playPromise !== undefined) {
            await playPromise;
            setIsReady(true);
            console.log('Audio playback started successfully');
          }
        }
      } catch (error) {
        console.log('Playback failed:', error);
      }
    };

    const interactions = ['click', 'touchstart', 'keydown'];
    interactions.forEach(event => 
      document.addEventListener(event, handleUserInteraction, { once: true })
    );

    return () => {
      interactions.forEach(event => 
        document.removeEventListener(event, handleUserInteraction)
      );
    };
  }, [isReady]);

  // Handle hyperspace sound effect
  useEffect(() => {
    if (!hyperspaceSoundRef.current || !isReady || isMuted) return;

    const handleHyperspace = async () => {
      try {
        if (hyperspaceActive) {
          hyperspaceSoundRef.current.currentTime = 0;
          const playPromise = hyperspaceSoundRef.current.play();
          if (playPromise !== undefined) {
            await playPromise;
          }
        } else {
          hyperspaceSoundRef.current.pause();
          hyperspaceSoundRef.current.currentTime = 0;
        }
      } catch (error) {
        console.error('Hyperspace sound playback error:', error);
      }
    };

    handleHyperspace();
  }, [hyperspaceActive, isReady, isMuted]);

  // Handle muting
  useEffect(() => {
    if (backgroundMusicRef.current) {
      backgroundMusicRef.current.volume = isMuted ? 0 : 0.8;
    }
    if (hyperspaceSoundRef.current) {
      hyperspaceSoundRef.current.volume = isMuted ? 0 : 0.9;
    }
  }, [isMuted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.pause();
        backgroundMusicRef.current = null;
      }
      if (hyperspaceSoundRef.current) {
        hyperspaceSoundRef.current.pause();
        hyperspaceSoundRef.current = null;
      }
    };
  }, []);

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: 1000
    }}>
      <button
        onClick={() => setIsMuted(!isMuted)}
        style={{
          background: 'transparent',
          border: 'none',
          padding: '10px',
          width: '44px',
          height: '44px',
          color: 'white',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px',
          transition: 'transform 0.3s'
        }}
        onMouseOver={(e) => e.target.style.transform = 'scale(1.1)'}
        onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
        aria-label={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? '🔇' : '🔊'}
      </button>
    </div>
  );
};

export default AudioManager;