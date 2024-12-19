import React, { useEffect, useRef, useState } from 'react';

const AudioManager = ({ hyperspaceActive }) => {
  const backgroundMusicRef = useRef(null);
  const hyperspaceSoundRef = useRef(null);
  const [isMuted, setIsMuted] = useState(false);

  // Initialize and start background music immediately on component mount
  useEffect(() => {
    try {
      // Initialize background music
      backgroundMusicRef.current = new Audio('public/audio/background.mp3');
      backgroundMusicRef.current.loop = true;
      backgroundMusicRef.current.volume = 1;
      
      // Initialize hyperspace sound
      hyperspaceSoundRef.current = new Audio('public/audio/hyperspace.mp3');
      hyperspaceSoundRef.current.volume = 1;
      
      // Start background music immediately
      const playBackgroundMusic = async () => {
        try {
          await backgroundMusicRef.current.play();
        } catch (err) {
          console.error('Background music autoplay failed:', err);
        }
      };
      playBackgroundMusic();
    } catch (err) {
      console.error('Audio initialization error:', err);
    }
  }, []); // Empty dependency array ensures this runs once on mount

  // Handle hyperspace sound effect - only play during transition
  useEffect(() => {
    if (!hyperspaceSoundRef.current || isMuted) return;

    if (hyperspaceActive) {
      // Play hyperspace sound when animation starts
      hyperspaceSoundRef.current.currentTime = 0;
      hyperspaceSoundRef.current.play().catch(err => {
        console.error('Hyperspace sound playback failed:', err);
      });
    } else {
      // Stop hyperspace sound when animation ends
      hyperspaceSoundRef.current.pause();
      hyperspaceSoundRef.current.currentTime = 0;
    }
  }, [hyperspaceActive, isMuted]);

  // Handle muting for all sounds
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
          background: 'rgba(0, 0, 0, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          borderRadius: '4px',
          padding: '10px',
          width: '44px',
          height: '44px',
          color: 'white',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px',
          transition: 'background-color 0.3s'
        }}
        onMouseOver={(e) => e.target.style.background = 'rgba(0, 0, 0, 0.9)'}
        onMouseOut={(e) => e.target.style.background = 'rgba(0, 0, 0, 0.7)'}
      >
        {isMuted ? '🔇' : '🔊'}
      </button>
    </div>
  );
};

export default AudioManager;