import React from 'react';
import { X, MousePointer2, Move, RotateCcw, Search, Filter, Map } from 'lucide-react';
import '../styles/welcome.css';

const Welcome = ({ onClose }) => {  // Accept onClose prop
  const features = [
    {
      title: 'Pan',
      description: 'Right-click and drag to move around the scene',
      icon: <Move className="icon icon-blue" />
    },
    {
      title: 'Zoom',
      description: 'Use mouse scroll wheel to zoom in and out',
      icon: <MousePointer2 className="icon icon-green" />
    },
    {
      title: 'Rotate',
      description: 'Left-click and drag to rotate the view',
      icon: <RotateCcw className="icon icon-purple" />
    },
    {
      title: 'Search Caretakers',
      description: 'Use the search box in the top-right corner to find specific transactions',
      icon: <Search className="icon icon-pink" />
    },
    {
      title: 'Highlight Trees',
      description: 'Selected transactions will be highlighted in vibrant colors for easy identification',
      icon: <Filter className="icon icon-rose" />
    },
    {
      title: 'Navigation Map',
      description: 'Use the mini-map to quickly navigate through the universe',
      icon: <Map className="icon icon-amber" />
    }
  ];

  return (
    <div className="welcome-overlay">
      <div className="welcome-modal">
        <div className="welcome-header">
          <h1 className="welcome-title">Welcome to Celestia</h1>
          <p className="welcome-subtitle">
            Navigate, explore, and search the interconnected trees landscape
          </p>
          <button onClick={onClose} className="close-button">
            <X className="icon" />
          </button>
        </div>

        <div className="features-grid">
          {features.map((feature) => (
            <div key={feature.title} className="feature-card">
              <div className="feature-header">
                {feature.icon}
                <h3 className="feature-title">{feature.title}</h3>
              </div>
              <p className="feature-description">{feature.description}</p>
            </div>
          ))}
        </div>

        <button onClick={onClose} className="start-button">
          Start Exploring
        </button>
      </div>
    </div>
  );
};

export default Welcome;