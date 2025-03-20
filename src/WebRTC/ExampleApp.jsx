import React, { useState } from 'react';
import WebRTCClient from './WebRTCClient';
import './ExampleApp.css';

const ExampleApp = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [signalingUrl, setSignalingUrl] = useState('ws://localhost:3000');

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
      </div>

      <div className="webrtc-container">
        {isConnected ? (
          <WebRTCClient 
            signalingUrl={signalingUrl}
            autoConnect={true}
            reconnectInterval={3000}
            statusDisplayTime={3000}
          />
        ) : (
          <div className="placeholder">Click Connect to start streaming</div>
        )}
      </div>
    </div>
  );
};

export default ExampleApp; 