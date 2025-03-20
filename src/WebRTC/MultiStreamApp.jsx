import React, { useState, useEffect } from 'react';
import { WebRTCProvider, useWebRTC } from './WebRTCContext';
import WebRTCStream from './WebRTCStream';
import './WebRTCClient.css';

// Component to display all available streams
const StreamsGrid = () => {
  const { peers } = useWebRTC();
  const [selectedPeer, setSelectedPeer] = useState(null);
  
  // No peers connected yet
  if (peers.length === 0) {
    return (
      <div className="webrtc-streams-grid">
        <div className="empty-state">
          <h3>No peers connected</h3>
          <p>Waiting for peers to connect...</p>
        </div>
      </div>
    );
  }
  
  // Render all streams, but apply different styling based on selection
  return (
    <div className="webrtc-streams-grid">
      {peers.map(peerId => {
        const isSelected = selectedPeer === peerId;
        const containerClass = isSelected 
          ? "stream-container single" 
          : "stream-container";
        
        // Only render selected peer when one is selected
        if (selectedPeer && !isSelected) {
          return null;
        }
        
        return (
          <div 
            key={peerId}
            className={containerClass}
            onClick={() => !isSelected && setSelectedPeer(peerId)}
          >
            <WebRTCStream 
              peerId={peerId} 
              showLabel={true}
            />
            
            {isSelected && (
              <button 
                className="back-button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPeer(null);
                }}
              >
                Back to Grid
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Main app component
const MultiStreamApp = () => {
  const [signalingUrl, setSignalingUrl] = useState('ws://localhost:3000');
  const [isConnected, setIsConnected] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('');

  // Handle connection status updates
  const handleConnectionStatus = (status, error) => {
    console.log('Connection status:', status);
    setConnectionStatus(status);
    
    if (error) {
      console.error('Connection error:', error);
    }
  };

  return (
    <div className="example-app">
      <div className="controls">
        <input 
          type="text" 
          value={signalingUrl} 
          onChange={(e) => setSignalingUrl(e.target.value)} 
          placeholder="WebSocket URL"
        />
        <button 
          onClick={() => setIsConnected(!isConnected)}
        >
          {isConnected ? 'Disconnect' : 'Connect'}
        </button>
        <div className="connection-status">
          Status: {connectionStatus || 'Not connected'}
        </div>
      </div>

      <div className="webrtc-container">
        {isConnected ? (
          <WebRTCProvider 
            signalingUrl={signalingUrl}
            onConnectionStatus={handleConnectionStatus}
          >
            <StreamsGrid />
          </WebRTCProvider>
        ) : (
          <div className="placeholder">Click Connect to start streaming</div>
        )}
      </div>
    </div>
  );
};

export default MultiStreamApp; 