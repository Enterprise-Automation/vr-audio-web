import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useWebRTC } from './WebRTCContext';
import './WebRTCClient.css';

/**
 * WebRTCStream component - handles a single peer-to-peer connection
 * Must be used within a WebRTCProvider
 */
const WebRTCStream = ({ 
  peerId,
  autoConnect = true,
  statusDisplayTime = 3000,
  showLabel = true,
}) => {
  // State variables
  const [status, setStatus] = useState('');
  const [showStatus, setShowStatus] = useState(false);
  const [showPlayButton, setShowPlayButton] = useState(false);
  const [hasVideo, setHasVideo] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [showStreamInfo, setShowStreamInfo] = useState(false);
  const [streamInfo, setStreamInfo] = useState({
    resolution: 'Unknown',
    frameRate: 'Unknown',
    audioBitrate: 'Unknown',
    videoBitrate: 'Unknown',
    codec: 'Unknown',
    iceState: 'Unknown',
    connectionState: 'Unknown'
  });

  // Get context from provider
  const { 
    localPeerId, 
    sendSignalingMessage, 
    isConnected: isSignalingConnected,
    registerMessageListener
  } = useWebRTC();

  // Refs
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const dataChannelRef = useRef(null);
  const pendingIceCandidatesRef = useRef([]);
  const statusTimeoutRef = useRef(null);
  const unregisterListenerRef = useRef(null);
  const connectionAttemptsRef = useRef(0);
  const statsIntervalRef = useRef(null);
  
  // Stats tracking refs
  const previousStatsRef = useRef({
    lastVideoBytes: 0,
    lastAudioBytes: 0,
    lastTimestamp: 0
  });

  // Display status message with auto-hiding
  const displayStatus = (message) => {
    console.log(`[${peerId}] Status: ${message}`);
    setStatus(message);
    setShowStatus(true);

    if (statusTimeoutRef.current) {
      clearTimeout(statusTimeoutRef.current);
    }

    statusTimeoutRef.current = setTimeout(() => {
      setShowStatus(false);
    }, statusDisplayTime);
  };

  // Try to play media with fallback for autoplay restrictions
  const playMedia = () => {
    const videoElement = remoteVideoRef.current;
    if (!videoElement || !videoElement.srcObject) return;

    // Save muted state to restore it
    const wasMuted = videoElement.muted;
    
    // Start muted to increase chances of autoplay success
    videoElement.muted = true;
    
    videoElement.play()
      .then(() => {
        displayStatus('Playback started');
        
        // If we have audio and weren't previously muted, try to restore
        if (hasAudio && !wasMuted) {
          setTimeout(() => {
            try {
              videoElement.muted = false;
              displayStatus('Audio enabled');
            } catch (e) {
              // Browser may still block unmuting without interaction
              displayStatus('Click to enable audio');
            }
          }, 500);
        }
      })
      .catch(e => {
        console.error("Autoplay prevented:", e);
        displayStatus('Click play button to start video');
        setShowPlayButton(true);
      });
  };

  // WebRTC peer connection
  const createPeerConnection = () => {
    if (peerConnectionRef.current) return peerConnectionRef.current;
    
    console.log(`[${peerId}] Creating new peer connection`);
    
    try {
      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      peerConnectionRef.current = peerConnection;

      // ICE candidates
      peerConnection.onicecandidate = event => {
        if (event.candidate) {
          try {
            let sdpMLineIndex = 0;
            if (event.candidate.sdpMLineIndex !== undefined) {
              if (typeof event.candidate.sdpMLineIndex === 'number') {
                sdpMLineIndex = Math.floor(event.candidate.sdpMLineIndex);
              } else {
                try {
                  sdpMLineIndex = parseInt(event.candidate.sdpMLineIndex, 10);
                  if (isNaN(sdpMLineIndex)) sdpMLineIndex = 0;
                } catch (e) {
                  sdpMLineIndex = 0;
                }
              }
            }

            const unityCandidate = {
              Candidate: event.candidate.candidate || "",
              SdpMid: event.candidate.sdpMid || "0",
              SdpMLineIndex: String(sdpMLineIndex)
            };

            console.log(`[${peerId}] Sending ICE candidate`);
            sendSignalingMessage('CANDIDATE', localPeerId, peerId, JSON.stringify(unityCandidate));
          } catch (error) {
            console.error(`[${peerId}] Error sending ICE candidate:`, error);
          }
        }
      };

      // Connection state
      peerConnection.onconnectionstatechange = () => {
        console.log(`[${peerId}] Connection state changed to: ${peerConnection.connectionState}`);
        if (peerConnection.connectionState === 'connected') {
          setIsConnected(true);
          displayStatus('WebRTC connected to ' + peerId);
          connectionAttemptsRef.current = 0;
          
          // Start collecting stats when connected - update more frequently (every second)
          if (statsIntervalRef.current) {
            clearInterval(statsIntervalRef.current);
          }
          
          // Initial stats state to show we're collecting data
          setStreamInfo(prev => ({
            ...prev,
            iceState: peerConnection.iceConnectionState || 'connecting',
            connectionState: peerConnection.connectionState || 'connected',
            resolution: 'Collecting...',
            frameRate: 'Collecting...',
            audioBitrate: 'Collecting...',
            videoBitrate: 'Collecting...',
            codec: 'Collecting...'
          }));
          
          // Shorter interval for more responsive stats
          statsIntervalRef.current = setInterval(getConnectionStats, 1000);
          
          // Call once immediately to get initial stats
          setTimeout(getConnectionStats, 200);
          
        } else if (peerConnection.connectionState === 'disconnected' ||
          peerConnection.connectionState === 'failed') {
          setIsConnected(false);
          displayStatus('Connection lost, reconnecting...');
          
          // Stop collecting stats
          if (statsIntervalRef.current) {
            clearInterval(statsIntervalRef.current);
            statsIntervalRef.current = null;
          }
          
          // Reset stats when disconnected
          setStreamInfo({
            resolution: 'Unknown',
            frameRate: 'Unknown',
            audioBitrate: 'Unknown',
            videoBitrate: 'Unknown',
            codec: 'Unknown',
            iceState: peerConnection.iceConnectionState || 'disconnected',
            connectionState: peerConnection.connectionState || 'disconnected'
          });
          
          // Limit reconnection attempts
          if (connectionAttemptsRef.current < 5) {
            connectionAttemptsRef.current++;
            setTimeout(() => createAndSendOfferToPeer(), 1000);
          } else {
            displayStatus('Connection failed after multiple attempts');
          }
        }
      };

      // ICE connection state
      peerConnection.oniceconnectionstatechange = () => {
        if (peerConnection.iceConnectionState === 'failed') {
          setIsConnected(false);
          setTimeout(() => createAndSendOfferToPeer(), 2000);
        }
      };

      // Media tracks
      peerConnection.ontrack = event => {
        console.log(`Received ${event.track.kind} track from ${peerId}`);

        if (event.track.kind === 'video') {
          setHasVideo(true);
          displayStatus('Receiving video');
        } else if (event.track.kind === 'audio') {
          setHasAudio(true);
          displayStatus('Receiving audio');
        }

        const videoElement = remoteVideoRef.current;
        if (!videoElement) return;

        // Handle new track
        if (!videoElement.srcObject) {
          // First track we've received - create new stream
          const newStream = new MediaStream();
          newStream.addTrack(event.track);
          videoElement.srcObject = newStream;

          // Initial playback (muted)
          videoElement.play().then(() => {
            displayStatus('Video playback started');
          }).catch(e => {
            console.error("Autoplay prevented:", e);
            displayStatus('Click play button to start video');
            setShowPlayButton(true);
          });
        } else {
          // We already have a stream with some tracks
          const stream = videoElement.srcObject;

          // Check if we already have this track type
          const existingTracks = event.track.kind === 'video' ?
            stream.getVideoTracks() : stream.getAudioTracks();

          if (existingTracks.length > 0) {
            // Replace existing track of the same kind
            if (event.track.kind === 'video') {
              stream.removeTrack(existingTracks[0]);
              stream.addTrack(event.track);
              console.log("Replaced existing video track");
            } else {
              // For audio, be extra careful
              stream.removeTrack(existingTracks[0]);
              stream.addTrack(event.track);
              console.log("Replaced existing audio track");
            }
          } else {
            // No existing track of this kind, just add it
            stream.addTrack(event.track);
            console.log(`Added new ${event.track.kind} track to existing stream`);
          }

          // If we just added audio and video was already playing,
          // try to unmute (need user interaction for browsers to allow this)
          if (event.track.kind === 'audio' && hasVideo) {
            // Don't unmute immediately - it can disrupt playback
            // Instead show a hint to the user
            displayStatus('Audio available - click to unmute');
          }
        }

        // Track ended handler
        event.track.onended = () => {
          displayStatus(`${event.track.kind} track ended`);

          if (event.track.kind === 'video') setHasVideo(false);
          if (event.track.kind === 'audio') setHasAudio(false);

          // Only try to reconnect if we lost all tracks
          if (!hasVideo && !hasAudio) {
            displayStatus('All tracks ended, reconnecting...');
            createAndSendOfferToPeer();
          } else {
            displayStatus(`${event.track.kind} track ended, other track still active`);
          }
        };
      };

      // Data channel
      peerConnection.ondatachannel = event => {
        const dataChannel = event.channel;
        dataChannelRef.current = dataChannel;

        dataChannel.onmessage = event => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'video_status' && data.status === 'started') {
              displayStatus('Video stream active');
            }
          } catch (e) {
            // Ignore non-JSON messages
          }
        };
      };

      // Add transceivers for receiving - ALWAYS add in the same order
      // IMPORTANT: Always add audio first, then video to maintain m-line order
      try {
        peerConnection.addTransceiver('audio', { direction: 'recvonly' });
        peerConnection.addTransceiver('video', { direction: 'recvonly' });
      } catch (e) {
        console.warn(`[${peerId}] Could not add transceivers:`, e);
      }

      return peerConnection;
    } catch (error) {
      console.error(`[${peerId}] Error creating peer connection:`, error);
      displayStatus("Failed to create connection");
      return null;
    }
  };

  // Process messages from signaling server specific to this peer
  const handleSignalingMessage = (message) => {
    const parts = message.split('|');
    if (parts.length < 4) return;

    const type = parts[0];
    const senderPeerId = parts[1];
    const receiverPeerId = parts[2];
    const payload = parts.slice(3).join('|');

    // Only process messages from the specific peer this component handles
    if (senderPeerId !== peerId && type !== 'NEWPEER' && type !== 'DISPOSE') return;

    // Only process messages meant for us or for everyone
    if (receiverPeerId !== localPeerId && receiverPeerId !== 'ALL') return;

    console.log(`[${peerId}] Processing ${type} message`);

    switch (type) {
      case 'OFFER':
        handleOffer(payload);
        break;
      case 'ANSWER':
        handleAnswer(payload);
        break;
      case 'CANDIDATE':
        handleCandidate(payload);
        break;
      case 'DISPOSE':
        if (senderPeerId === peerId) {
          cleanup();
        }
        break;
      default:
        break;
    }
  };

  // Offer handler
  const handleOffer = async (offerJson) => {
    if (!peerConnectionRef.current) {
      createPeerConnection();
    }

    try {
      let offer;
      try {
        offer = JSON.parse(offerJson);

        if (offer.SessionType && offer.SessionType.toLowerCase() === 'offer' && offer.Sdp) {
          offer = {
            type: 'offer',
            sdp: offer.Sdp
          };
        }

        if (!offer.type) {
          offer.type = 'offer';
        }

        if (!offer.sdp && offer.Sdp) {
          offer.sdp = offer.Sdp;
        }
      } catch (parseError) {
        offer = {
          type: 'offer',
          sdp: offerJson
        };
      }

      const peerConnection = peerConnectionRef.current;
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

      // Process queued candidates
      await processQueuedCandidates();

      const browserAnswer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(browserAnswer);

      const unityAnswer = {
        SessionType: "Answer",
        Sdp: browserAnswer.sdp
      };

      sendSignalingMessage('ANSWER', localPeerId, peerId, JSON.stringify(unityAnswer));
    } catch (error) {
      console.error("Error handling offer:", error);
    }
  };

  // Answer handler
  const handleAnswer = async (answerJson) => {
    if (!peerConnectionRef.current) return;

    try {
      let answer;
      try {
        answer = JSON.parse(answerJson);

        if (answer.SessionType && answer.SessionType.toLowerCase() === 'answer' && answer.Sdp) {
          answer = {
            type: 'answer',
            sdp: answer.Sdp
          };
        }

        if (!answer.type) {
          answer.type = 'answer';
        }

        if (!answer.sdp && answer.Sdp) {
          answer.sdp = answer.Sdp;
        }
      } catch (parseError) {
        answer = {
          type: 'answer',
          sdp: answerJson
        };
      }

      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
      await processQueuedCandidates();
      setIsConnected(true);
    } catch (error) {
      console.error("Error handling answer:", error);
    }
  };

  // ICE candidate handler
  const handleCandidate = async (candidateJson) => {
    if (!peerConnectionRef.current) return;

    try {
      const candidateData = JSON.parse(candidateJson);

      const candidate = {
        candidate: candidateData.Candidate || candidateData.candidate || '',
        sdpMid: candidateData.SdpMid || candidateData.sdpMid || '0'
      };

      let sdpMLineIndex = 0;

      if (candidateData.SdpMLineIndex !== undefined) {
        if (typeof candidateData.SdpMLineIndex === 'number') {
          sdpMLineIndex = candidateData.SdpMLineIndex;
        } else {
          try {
            sdpMLineIndex = parseInt(candidateData.SdpMLineIndex, 10);
          } catch (e) {
            sdpMLineIndex = 0;
          }
        }
      } else if (candidateData.sdpMLineIndex !== undefined) {
        if (typeof candidateData.sdpMLineIndex === 'number') {
          sdpMLineIndex = candidateData.sdpMLineIndex;
        } else {
          try {
            sdpMLineIndex = parseInt(candidateData.sdpMLineIndex, 10);
          } catch (e) {
            sdpMLineIndex = 0;
          }
        }
      }

      candidate.sdpMLineIndex = sdpMLineIndex;

      if (!candidate.candidate) return;

      const peerConnection = peerConnectionRef.current;
      if (!peerConnection.remoteDescription || peerConnection.remoteDescription.type === '') {
        pendingIceCandidatesRef.current.push(candidate);
      } else {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      console.error("Error handling candidate:", error);
    }
  };

  // Process queued ICE candidates
  const processQueuedCandidates = async () => {
    if (pendingIceCandidatesRef.current.length > 0) {
      const candidates = pendingIceCandidatesRef.current;
      pendingIceCandidatesRef.current = [];

      const peerConnection = peerConnectionRef.current;
      for (const candidate of candidates) {
        try {
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
          console.error("Error adding candidate:", error);
        }
      }
    }
  };

  // Create and send offer
  const createAndSendOfferToPeer = async () => {
    if (!peerConnectionRef.current) return;

    try {
      console.log(`[${peerId}] Creating and sending offer`);
      const peerConnection = peerConnectionRef.current;

      // Only add transceivers if there are none to maintain consistent m-line ordering
      if (peerConnection.getTransceivers().length === 0) {
        try {
          // IMPORTANT: Always add audio first, then video to maintain m-line order
          peerConnection.addTransceiver('audio', { direction: 'recvonly' });
          peerConnection.addTransceiver('video', { direction: 'recvonly' });
        } catch (e) {
          console.warn(`[${peerId}] Could not add transceivers during offer creation:`, e);
        }
      }

      const browserOffer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });

      await peerConnection.setLocalDescription(browserOffer);

      const unityOffer = {
        SessionType: "Offer",
        Sdp: browserOffer.sdp
      };

      sendSignalingMessage('OFFER', localPeerId, peerId, JSON.stringify(unityOffer));
    } catch (error) {
      console.error(`[${peerId}] Error creating offer:`, error);
    }
  };

  // Clean up resources
  const cleanup = () => {
    setHasVideo(false);
    setHasAudio(false);
    setShowPlayButton(false);
    setIsConnected(false);

    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    dataChannelRef.current = null;
    pendingIceCandidatesRef.current = [];

    const videoElement = remoteVideoRef.current;
    if (videoElement && videoElement.srcObject) {
      const tracks = videoElement.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoElement.srcObject = null;
    }
  };

  // Handle audio unmuting on user interaction
  const handleVideoContainerClick = () => {
    const videoElement = remoteVideoRef.current;
    if (hasAudio && videoElement && videoElement.muted) {
      videoElement.muted = false;
      displayStatus('Audio unmuted');
    }
  };

  // Register message listener for this peer
  useEffect(() => {
    if (isSignalingConnected) {
      console.log(`[${peerId}] Registering message listener`);
      // Register our message handler with the context
      unregisterListenerRef.current = registerMessageListener(handleSignalingMessage);
      
      // Create peer connection and send an initial offer
      if (autoConnect) {
        const pc = createPeerConnection();
        if (pc) {
          setTimeout(() => createAndSendOfferToPeer(), 1000);
        }
      }
    }
    
    return () => {
      // Cleanup the listener when the component unmounts
      if (unregisterListenerRef.current) {
        console.log(`[${peerId}] Unregistering message listener`);
        unregisterListenerRef.current();
      }
      cleanup();
    };
  }, [isSignalingConnected, peerId]);

  // Gather WebRTC statistics
  const getConnectionStats = async () => {
    if (!peerConnectionRef.current || !isConnected) return;
    
    try {
      const stats = await peerConnectionRef.current.getStats();
      
      let videoResolution = 'Unknown';
      let frameRate = 'Unknown';
      let videoBitrate = 'Unknown';
      let audioBitrate = 'Unknown';
      let videoCodec = 'Unknown';
      
      // Debug stats object
      console.log(`[${peerId}] Got WebRTC stats:`, Array.from(stats.values()));
      
      // Track stats objects for processing
      const inboundVideoStats = [];
      const inboundAudioStats = [];
      const videoTrackStats = [];
      const codecStats = [];
      
      // First pass - collect stat objects by type
      stats.forEach(stat => {
        if (stat.type === 'inbound-rtp' && stat.kind === 'video') {
          inboundVideoStats.push(stat);
        }
        else if (stat.type === 'inbound-rtp' && stat.kind === 'audio') {
          inboundAudioStats.push(stat);
        }
        else if (stat.type === 'track' && stat.kind === 'video') {
          videoTrackStats.push(stat);
        }
        else if (stat.type === 'codec') {
          codecStats.push(stat);
        }
      });
      
      // Process video stats
      if (inboundVideoStats.length > 0) {
        const videoStat = inboundVideoStats[0];
        console.log(`[${peerId}] Video RTP stat:`, videoStat);
        
        // Frame rate - different browsers use different properties
        if (videoStat.framesPerSecond) {
          frameRate = `${Math.round(videoStat.framesPerSecond)} fps`;
        } else if (videoStat.framerateMean) {
          frameRate = `${Math.round(videoStat.framerateMean)} fps`;
        }
        
        // Calculate video bitrate
        if (videoStat.bytesReceived) {
          // If we have previous data, calculate rate
          if (previousStatsRef.current.lastVideoBytes > 0 && previousStatsRef.current.lastTimestamp > 0) {
            const byteDiff = videoStat.bytesReceived - previousStatsRef.current.lastVideoBytes;
            const timeDiff = (videoStat.timestamp || Date.now()) - previousStatsRef.current.lastTimestamp;
            if (timeDiff > 0) {
              const kbps = Math.round((byteDiff * 8) / timeDiff);
              videoBitrate = `${kbps} kbps`;
            }
          }
          previousStatsRef.current.lastVideoBytes = videoStat.bytesReceived;
          previousStatsRef.current.lastTimestamp = videoStat.timestamp || Date.now();
        }
      }
      
      // Process audio stats
      if (inboundAudioStats.length > 0) {
        const audioStat = inboundAudioStats[0];
        console.log(`[${peerId}] Audio RTP stat:`, audioStat);
        
        // Calculate audio bitrate
        if (audioStat.bytesReceived) {
          // If we have previous data, calculate rate
          if (previousStatsRef.current.lastAudioBytes > 0 && previousStatsRef.current.lastTimestamp > 0) {
            const byteDiff = audioStat.bytesReceived - previousStatsRef.current.lastAudioBytes;
            const timeDiff = (audioStat.timestamp || Date.now()) - previousStatsRef.current.lastTimestamp;
            if (timeDiff > 0) {
              const kbps = Math.round((byteDiff * 8) / timeDiff);
              audioBitrate = `${kbps} kbps`;
            }
          }
          previousStatsRef.current.lastAudioBytes = audioStat.bytesReceived;
        }
      }
      
      // Process video track stats
      if (videoTrackStats.length > 0) {
        const trackStat = videoTrackStats[0];
        console.log(`[${peerId}] Video track stat:`, trackStat);
        
        if (trackStat.frameWidth && trackStat.frameHeight) {
          videoResolution = `${trackStat.frameWidth}x${trackStat.frameHeight}`;
        }
        
        // Some browsers put frame rate in track stats
        if (!frameRate || frameRate === 'Unknown') {
          if (trackStat.framesPerSecond) {
            frameRate = `${Math.round(trackStat.framesPerSecond)} fps`;
          }
        }
      }
      
      // Process codec info
      if (codecStats.length > 0) {
        console.log(`[${peerId}] Codec stats:`, codecStats);
        
        for (const codec of codecStats) {
          if (codec.mimeType && codec.mimeType.toLowerCase().includes('video')) {
            videoCodec = codec.mimeType.split('/')[1] || 'Unknown';
            break;
          }
        }
      }
      
      // Update the state with collected data
      setStreamInfo({
        resolution: videoResolution,
        frameRate,
        audioBitrate,
        videoBitrate,
        codec: videoCodec,
        iceState: peerConnectionRef.current.iceConnectionState || 'Unknown',
        connectionState: peerConnectionRef.current.connectionState || 'Unknown'
      });
      
    } catch (error) {
      console.error(`[${peerId}] Error getting stats:`, error);
    }
  };

  // Toggle stream info display
  const toggleStreamInfo = (e) => {
    e.stopPropagation(); // Prevent selecting stream in grid view
    setShowStreamInfo(!showStreamInfo);
  };

  // Check if this component is inside a single (maximized) container
  const isSingleView = () => {
    if (!remoteVideoRef.current) return false;
    
    // Walk up the DOM tree to find if parent has 'single' class
    let element = remoteVideoRef.current.parentElement;
    while (element) {
      if (element.classList && element.classList.contains('single')) {
        return true;
      }
      element = element.parentElement;
    }
    return false;
  };

  return (
    <div className="webrtc-client-container">
      <video 
        ref={remoteVideoRef} 
        className="remote-video" 
        autoPlay 
        playsInline 
        muted 
      />
      {showPlayButton && (
        <button 
          className="play-button" 
          onClick={() => {
            setShowPlayButton(false);
            playMedia();
          }}
        />
      )}
      <div 
        className={`status-message ${showStatus ? 'visible' : ''}`}
        onClick={handleVideoContainerClick}
      >
        {status}
      </div>
      {!isConnected && (
        <div className="connection-overlay">
          <div>Connecting to {peerId}...</div>
        </div>
      )}
      {showLabel && isConnected && (
        <div className={`peer-label ${isSingleView() ? 'large' : ''}`}>
          {peerId}
          <button 
            className="info-button"
            onClick={toggleStreamInfo}
            title="Toggle stream information"
          >
            {showStreamInfo ? 'Hide Info' : 'Info'}
          </button>
        </div>
      )}
      {showStreamInfo && isConnected && (
        <div className={`stream-info-panel ${isSingleView() ? 'large' : ''}`}>
          <h3>Stream Information</h3>
          <table>
            <tbody>
              <tr><td>Resolution:</td><td>{streamInfo.resolution}</td></tr>
              <tr><td>Frame Rate:</td><td>{streamInfo.frameRate}</td></tr>
              <tr><td>Video Bitrate:</td><td>{streamInfo.videoBitrate}</td></tr>
              <tr><td>Audio Bitrate:</td><td>{streamInfo.audioBitrate}</td></tr>
              <tr><td>Video Codec:</td><td>{streamInfo.codec}</td></tr>
              <tr><td>ICE State:</td><td>{streamInfo.iceState}</td></tr>
              <tr><td>Connection:</td><td>{streamInfo.connectionState}</td></tr>
              <tr><td>Peer ID:</td><td>{peerId}</td></tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

WebRTCStream.propTypes = {
  peerId: PropTypes.string.isRequired,
  autoConnect: PropTypes.bool,
  statusDisplayTime: PropTypes.number,
  showLabel: PropTypes.bool
};

export default WebRTCStream; 