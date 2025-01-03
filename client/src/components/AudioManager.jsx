import React, { useEffect, useRef, useState } from 'react';

const AudioManager = ({ hyperspaceActive, isMapExpanded, selectedGalaxy, onBackToUniverse }) => {
  const backgroundMusicRef = useRef(null);
  const hyperspaceSoundRef = useRef(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    // Initialize audio objects
    backgroundMusicRef.current = new Audio('/audio/background.mp3');
    backgroundMusicRef.current.loop = true;
    hyperspaceSoundRef.current = new Audio('/audio/hyperspace.mp3');
    
    // Set initial volumes
    backgroundMusicRef.current.volume = 0.8;
    hyperspaceSoundRef.current.volume = 0.9;

    return () => {
      backgroundMusicRef.current?.pause();
      hyperspaceSoundRef.current?.pause();
    };
  }, []);

  useEffect(() => {
    if (!hyperspaceSoundRef.current || isMuted) return;

    if (hyperspaceActive) {
      hyperspaceSoundRef.current.currentTime = 0;
      hyperspaceSoundRef.current.play().catch(console.error);
    } else {
      hyperspaceSoundRef.current.pause();
      hyperspaceSoundRef.current.currentTime = 0;
    }
  }, [hyperspaceActive, isMuted]);

  const handleClick = async () => {
    if (selectedGalaxy) {
      onBackToUniverse();
      return;
    }

    const newMutedState = !isMuted;
    setIsMuted(newMutedState);

    if (newMutedState) {
      backgroundMusicRef.current?.pause();
      hyperspaceSoundRef.current?.pause();
    } else {
      try {
        await backgroundMusicRef.current?.play();
      } catch (error) {
        console.error('Audio playback failed:', error);
        setIsMuted(true);
      }
    }
  };

  const expanded = Boolean(isMapExpanded);

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
        style={{ fontSize: '1.2em' }}
      />
    </button>
  );
};

export default AudioManager;