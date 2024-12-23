import React, { useEffect, useRef, useState } from 'react';

const AudioManager = ({ hyperspaceActive, isMapExpanded, selectedGalaxy, onBackToUniverse }) => {
  const backgroundMusicRef = useRef(null);
  const hyperspaceSoundRef = useRef(null);
  const [isMuted, setIsMuted] = useState(true); // Start muted
  const [isReady, setIsReady] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    backgroundMusicRef.current = new Audio('/audio/background.mp3');
    backgroundMusicRef.current.loop = true;
    backgroundMusicRef.current.volume = 0;  // Start with volume 0
    
    hyperspaceSoundRef.current = new Audio('/audio/hyperspace.mp3');
    hyperspaceSoundRef.current.volume = 0;  // Start with volume 0

    const startAudio = async () => {
      try {
        if (backgroundMusicRef.current && !isReady) {
          await backgroundMusicRef.current.play();
          setIsReady(true);
        }
      } catch (error) {
        console.error('Initial audio playback failed:', error);
      }
    };

    // Start audio and immediately mute it
    startAudio();

    return () => {
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.pause();
      }
      if (hyperspaceSoundRef.current) {
        hyperspaceSoundRef.current.pause();
      }
    };
  }, []);

  useEffect(() => {
    if (!hyperspaceSoundRef.current || !isReady || isMuted) return;

    if (hyperspaceActive) {
      hyperspaceSoundRef.current.currentTime = 0;
      hyperspaceSoundRef.current.play().catch(console.error);
    } else {
      hyperspaceSoundRef.current.pause();
      hyperspaceSoundRef.current.currentTime = 0;
    }
  }, [hyperspaceActive, isReady, isMuted]);

  const handleClick = () => {
    if (selectedGalaxy) {
      onBackToUniverse();
      return;
    }

    setIsMuted(!isMuted);
    
    if (backgroundMusicRef.current) {
      backgroundMusicRef.current.volume = isMuted ? 0.8 : 0;
    }
    if (hyperspaceSoundRef.current) {
      hyperspaceSoundRef.current.volume = isMuted ? 0.9 : 0;
    }
  };

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
        style={{ fontSize: '1.2em', transition: 'all 0.1s ease-in-out' }}
      />
    </button>
  );
};

export default AudioManager;