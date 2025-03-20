import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';

// Create context for signaling service
const WebRTCContext = createContext(null);

/**
 * Custom hook to access WebRTC context
 */
export const useWebRTC = () => {
  const context = useContext(WebRTCContext);
  if (!context) {
    throw new Error('useWebRTC must be used within a WebRTCProvider');
  }
  return context;
};

/**
 * Provider component that connects to the signaling service
 * and shares connection with child components
 */
export const WebRTCProvider = ({ 
  signalingUrl = 'wss://signaling.hyades.clusters.easlab.co.uk/',
  children,
  reconnectInterval = 3000,
  onConnectionStatus
}) => {
  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [peers, setPeers] = useState([]);
  
  // Use a simple local peer ID like the working WebRTCClient
  const localPeerId = "Trainer"//useRef(`ReactClient-${Math.floor(Math.random() * 10000)}`).current;

  // Refs for WebSocket and timers
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const messageListenersRef = useRef([]);

  // Register a message listener
  const registerMessageListener = (listener) => {
    messageListenersRef.current.push(listener);
    return () => {
      messageListenersRef.current = messageListenersRef.current.filter(l => l !== listener);
    };
  };

  // Connect to signaling server - simplified to match WebRTCClient
  const connectToSignalingServer = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }

    console.log(`Connecting to ${signalingUrl} with peer ID ${localPeerId}`);
    
    try {
      wsRef.current = new WebSocket(signalingUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connection opened');
        setIsConnected(true);
        setError(null);
        if (onConnectionStatus) onConnectionStatus('connected');
        
        // Send peer announcement immediately like WebRTCClient does
        console.log(`Sending NEWPEER: ${localPeerId}`);
        sendSignalingMessage('NEWPEER', localPeerId, 'ALL', `New peer ${localPeerId}`);
      };

      wsRef.current.onmessage = (event) => {
        console.log('Received message:', event.data);
        
        // Handle the message in this component
        handleSignalingMessage(event.data);
        
        // Also notify all registered listeners
        messageListenersRef.current.forEach(listener => {
          try {
            listener(event.data);
          } catch (e) {
            console.error('Error in message listener:', e);
          }
        });
      };

      wsRef.current.onerror = (err) => {
        console.error('WebSocket error:', err);
        setError('Connection error');
        if (onConnectionStatus) onConnectionStatus('error', err);
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket connection closed');
        setIsConnected(false);
        if (onConnectionStatus) onConnectionStatus('disconnected');
        reconnectTimerRef.current = setTimeout(connectToSignalingServer, reconnectInterval);
      };
    } catch (err) {
      console.error('Failed to connect:', err);
      setError(`Failed to connect: ${err.message}`);
      if (onConnectionStatus) onConnectionStatus('error', err);
      reconnectTimerRef.current = setTimeout(connectToSignalingServer, reconnectInterval);
    }
  };

  // Simplified message sender like in WebRTCClient
  const sendSignalingMessage = (type, sender, receiver, message) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const signalMessage = `${type}|${sender}|${receiver}|${message}`;
      console.log('Sending message:', signalMessage);
      wsRef.current.send(signalMessage);
      return true;
    }
    return false;
  };

  // Handle signaling messages - same pattern as WebRTCClient but for the context
  const handleSignalingMessage = (message) => {
    const parts = message.split('|');
    if (parts.length < 4) {
      console.warn('Invalid message format received:', message);
      return;
    }

    const type = parts[0];
    const senderPeerId = parts[1];
    const receiverPeerId = parts[2];
    const payload = parts.slice(3).join('|');

    // Filter messages meant for us or for everyone
    if (receiverPeerId !== 'ALL' && receiverPeerId !== localPeerId) return;

    switch (type) {
      case 'NEWPEER':
        // Add new peer to the list if not already present and send ACK
        if (senderPeerId !== localPeerId) {
          console.log(`NEWPEER from ${senderPeerId}`);
          setPeers(prevPeers => {
            if (!prevPeers.includes(senderPeerId)) {
              // Send ACK and add to peers list
              sendSignalingMessage('NEWPEERACK', localPeerId, senderPeerId, 'ACK');
              return [...prevPeers, senderPeerId];
            }
            // Still send ACK even if already in list
            sendSignalingMessage('NEWPEERACK', localPeerId, senderPeerId, 'ACK');
            return prevPeers;
          });
        }
        break;
        
      case 'NEWPEERACK':
        // Add peer that acknowledged us to the list
        if (senderPeerId !== localPeerId) {
          console.log(`NEWPEERACK from ${senderPeerId}`);
          setPeers(prevPeers => {
            if (!prevPeers.includes(senderPeerId)) {
              return [...prevPeers, senderPeerId];
            }
            return prevPeers;
          });
        }
        break;
        
      case 'DISPOSE':
        // Remove peer from list
        if (senderPeerId !== localPeerId) {
          console.log(`DISPOSE from ${senderPeerId}`);
          setPeers(prevPeers => prevPeers.filter(id => id !== senderPeerId));
        }
        break;
        
      default:
        // Other messages will be handled by individual stream components
        break;
    }
  };

  // Simple disconnect like in WebRTCClient
  const disconnect = () => {
    console.log('Disconnecting...');
    
    if (wsRef.current) {
      // Notify all peers that we're leaving
      sendSignalingMessage('DISPOSE', localPeerId, 'ALL', 'Client disconnecting');
      
      // Close the connection
      try {
        wsRef.current.close();
      } catch (error) {
        console.error('Error closing WebSocket:', error);
      }
      wsRef.current = null;
    }
    
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    
    setIsConnected(false);
    setPeers([]);
    messageListenersRef.current = [];
  };

  // Simple connect/disconnect on mount/unmount like in WebRTCClient
  useEffect(() => {
    connectToSignalingServer();
    
    return () => {
      disconnect();
    };
  }, [signalingUrl]);

  // Context value
  const contextValue = {
    isConnected,
    error,
    peers,
    localPeerId,
    sendSignalingMessage,
    signalingUrl,
    registerMessageListener
  };

  return (
    <WebRTCContext.Provider value={contextValue}>
      {children}
    </WebRTCContext.Provider>
  );
};

WebRTCProvider.propTypes = {
  signalingUrl: PropTypes.string,
  children: PropTypes.node.isRequired,
  reconnectInterval: PropTypes.number,
  onConnectionStatus: PropTypes.func
};

export default WebRTCContext; 