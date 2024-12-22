import React, { useEffect, useRef, useState } from 'react';

const AudioManager = ({ hyperspaceActive, isMapExpanded, selectedGalaxy, onBackToUniverse }) => {
  const backgroundMusicRef = useRef(null);
  const hyperspaceSoundRef = useRef(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

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
            setIsPlaying(true);
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

  // Handle button click
  const handleClick = () => {
    if (selectedGalaxy) {
      onBackToUniverse();
    } else {
      setIsMuted(!isMuted);
      if (!isMuted) {
        // Muting
        if (backgroundMusicRef.current) {
          backgroundMusicRef.current.volume = 0;
        }
        if (hyperspaceSoundRef.current) {
          hyperspaceSoundRef.current.volume = 0;
        }
      } else {
        // Unmuting
        if (backgroundMusicRef.current) {
          backgroundMusicRef.current.volume = 0.8;
        }
        if (hyperspaceSoundRef.current) {
          hyperspaceSoundRef.current.volume = 0.9;
        }
      }
    }
  };

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

  const expanded = typeof isMapExpanded === 'boolean' ? isMapExpanded : false;

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'absolute',
        left: '20px',
        top: expanded ? '230px' : '90px',
        padding: '10px',
        background: 'rgba(0, 0, 0, 0.3)',
        color: isHovered ? '#24D2FB' : 'white',
        border: `1px solid ${isHovered ? '#24D2FB' : 'rgba(255, 255, 255, 0.2)'}`,
        borderRadius: '50px',
        cursor: 'pointer',
        backdropFilter: 'blur(4px)',
        transition: 'all 0.4s ease-in-out',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '55px',
        height: '55px',
        zIndex: 1,
      }}
    >
      <i 
        className={selectedGalaxy ? "ri-arrow-left-line" : (isMuted ? "ri-volume-mute-line" : "ri-volume-up-line")}
        style={{ 
          fontSize: '1.2em',
          transition: 'all 0.1s ease-in-out'
        }}
      />
    </button>
  );
};

export default AudioManager;