import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import './WebRTCClient.css';

const WebRTCClient = ({ 
  signalingUrl = 'ws://localhost:3000',
  autoConnect = true,
  reconnectInterval = 3000,
  statusDisplayTime = 3000
}) => {
  // State variables
  const [status, setStatus] = useState('');
  const [showStatus, setShowStatus] = useState(false);
  const [showPlayButton, setShowPlayButton] = useState(false);
  const [hasVideo, setHasVideo] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);

  // Refs for elements and connections
  const remoteVideoRef = useRef(null);
  const wsRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const dataChannelsRef = useRef({});
  const pendingIceCandidatesRef = useRef({});
  const reconnectTimerRef = useRef(null);
  const statusTimeoutRef = useRef(null);

  // Generate a unique client ID
  const peerIdRef = useRef(`ReactClient-${Math.floor(Math.random() * 10000)}`);

  // Display status message with auto-hiding
  const displayStatus = (message) => {
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
        // but wait a moment to ensure stable playback
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

  // WebSocket connection
  const connectToSignalingServer = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }

    wsRef.current = new WebSocket(signalingUrl);

    wsRef.current.onopen = () => {
      displayStatus('Connected to server');
      sendSignalingMessage('NEWPEER', peerIdRef.current, 'ALL', `New peer ${peerIdRef.current}`);
    };

    wsRef.current.onmessage = (event) => {
      handleSignalingMessage(event.data);
    };

    wsRef.current.onerror = () => {
      displayStatus('Connection error');
    };

    wsRef.current.onclose = () => {
      displayStatus('Disconnected, reconnecting...');
      cleanup();
      reconnectTimerRef.current = setTimeout(connectToSignalingServer, reconnectInterval);
    };
  };

  // Signaling message sender
  const sendSignalingMessage = (type, sender, receiver, message) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const signalMessage = `${type}|${sender}|${receiver}|${message}`;
      wsRef.current.send(signalMessage);
    }
  };

  // WebRTC peer connection
  const createPeerConnection = (peerId) => {
    if (peerConnectionsRef.current[peerId]) return peerConnectionsRef.current[peerId];

    const peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    peerConnectionsRef.current[peerId] = peerConnection;
    pendingIceCandidatesRef.current[peerId] = [];

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

          sendSignalingMessage('CANDIDATE', peerIdRef.current, peerId, JSON.stringify(unityCandidate));
        } catch (error) {
          console.error("Error sending ICE candidate:", error);
        }
      }
    };

    // Connection state
    peerConnection.onconnectionstatechange = () => {
      if (peerConnection.connectionState === 'connected') {
        displayStatus('WebRTC connected');
      } else if (peerConnection.connectionState === 'disconnected' ||
        peerConnection.connectionState === 'failed') {
        displayStatus('Connection lost, reconnecting...');
        setTimeout(() => createAndSendOfferToPeer(peerId), 1000);
      }
    };

    // ICE connection state
    peerConnection.oniceconnectionstatechange = () => {
      if (peerConnection.iceConnectionState === 'failed') {
        setTimeout(() => createAndSendOfferToPeer(peerId), 2000);
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
          createAndSendOfferToPeer(peerId);
        } else {
          displayStatus(`${event.track.kind} track ended, other track still active`);
        }
      };
    };

    // Data channel
    peerConnection.ondatachannel = event => {
      const dataChannel = event.channel;
      dataChannelsRef.current[peerId] = dataChannel;

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

    // Add transceivers for receiving
    peerConnection.addTransceiver('audio', { direction: 'recvonly' });
    peerConnection.addTransceiver('video', { direction: 'recvonly' });

    // Create an initial offer
    setTimeout(() => createAndSendOfferToPeer(peerId), 1000);

    return peerConnection;
  };

  // Signaling message handler
  const handleSignalingMessage = (message) => {
    const parts = message.split('|');
    if (parts.length < 4) return;

    const type = parts[0];
    const senderPeerId = parts[1];
    const receiverPeerId = parts[2];
    const payload = parts.slice(3).join('|');

    if (receiverPeerId !== 'ALL' && receiverPeerId !== peerIdRef.current) return;

    switch (type) {
      case 'NEWPEER':
        handleNewPeer(senderPeerId);
        break;
      case 'NEWPEERACK':
        handleNewPeerAck(senderPeerId);
        break;
      case 'OFFER':
        handleOffer(senderPeerId, payload);
        break;
      case 'ANSWER':
        handleAnswer(senderPeerId, payload);
        break;
      case 'CANDIDATE':
        handleCandidate(senderPeerId, payload);
        break;
      case 'DISPOSE':
        handleDispose(senderPeerId);
        break;
      case 'COMPLETE':
        // Unity's connection completed
        displayStatus('Connection established');
        break;
      default:
        break;
    }
  };

  // New peer handler
  const handleNewPeer = (peerId) => {
    if (peerId === peerIdRef.current) return;

    sendSignalingMessage('NEWPEERACK', peerIdRef.current, peerId, 'ACK');
    createPeerConnection(peerId);
  };

  // New peer acknowledgment handler
  const handleNewPeerAck = (peerId) => {
    if (peerId === peerIdRef.current) return;

    if (!peerConnectionsRef.current[peerId]) {
      createPeerConnection(peerId);
    }
  };

  // Offer handler
  const handleOffer = async (peerId, offerJson) => {
    if (!peerConnectionsRef.current[peerId]) {
      createPeerConnection(peerId);
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

      const peerConnection = peerConnectionsRef.current[peerId];
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

      // Process queued candidates
      await processQueuedCandidates(peerId);

      const browserAnswer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(browserAnswer);

      const unityAnswer = {
        SessionType: "Answer",
        Sdp: browserAnswer.sdp
      };

      sendSignalingMessage('ANSWER', peerIdRef.current, peerId, JSON.stringify(unityAnswer));
    } catch (error) {
      console.error("Error handling offer:", error);
    }
  };

  // Answer handler
  const handleAnswer = async (peerId, answerJson) => {
    if (!peerConnectionsRef.current[peerId]) return;

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

      await peerConnectionsRef.current[peerId].setRemoteDescription(new RTCSessionDescription(answer));
      await processQueuedCandidates(peerId);
    } catch (error) {
      console.error("Error handling answer:", error);
    }
  };

  // ICE candidate handler
  const handleCandidate = async (peerId, candidateJson) => {
    if (!peerConnectionsRef.current[peerId]) return;

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

      const peerConnection = peerConnectionsRef.current[peerId];
      if (!peerConnection.remoteDescription || peerConnection.remoteDescription.type === '') {
        pendingIceCandidatesRef.current[peerId].push(candidate);
      } else {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      console.error("Error handling candidate:", error);
    }
  };

  // Process queued ICE candidates
  const processQueuedCandidates = async (peerId) => {
    if (pendingIceCandidatesRef.current[peerId] && pendingIceCandidatesRef.current[peerId].length > 0) {
      const candidates = pendingIceCandidatesRef.current[peerId];
      pendingIceCandidatesRef.current[peerId] = [];

      const peerConnection = peerConnectionsRef.current[peerId];
      for (const candidate of candidates) {
        try {
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
          console.error("Error adding candidate:", error);
        }
      }
    }
  };

  // Dispose handler
  const handleDispose = (peerId) => {
    if (peerConnectionsRef.current[peerId]) {
      peerConnectionsRef.current[peerId].close();
      delete peerConnectionsRef.current[peerId];
    }

    if (dataChannelsRef.current[peerId]) {
      delete dataChannelsRef.current[peerId];
    }
  };

  // Create and send offer
  const createAndSendOfferToPeer = async (peerId) => {
    if (!peerConnectionsRef.current[peerId]) return;

    try {
      const peerConnection = peerConnectionsRef.current[peerId];

      // Make sure we have transceivers
      if (peerConnection.getTransceivers().length === 0) {
        peerConnection.addTransceiver('audio', { direction: 'recvonly' });
        peerConnection.addTransceiver('video', { direction: 'recvonly' });
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

      sendSignalingMessage('OFFER', peerIdRef.current, peerId, JSON.stringify(unityOffer));
    } catch (error) {
      console.error("Error creating offer:", error);
    }
  };

  // Clean up resources
  const cleanup = () => {
    setHasVideo(false);
    setHasAudio(false);
    setShowPlayButton(false);

    Object.keys(peerConnectionsRef.current).forEach(peerId => {
      if (peerConnectionsRef.current[peerId]) {
        peerConnectionsRef.current[peerId].close();
      }
    });

    peerConnectionsRef.current = {};
    dataChannelsRef.current = {};
    pendingIceCandidatesRef.current = {};

    const videoElement = remoteVideoRef.current;
    if (videoElement && videoElement.srcObject) {
      const tracks = videoElement.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoElement.srcObject = null;
    }
  };

  // Handle audio unmuting on user interaction
  const handleBodyClick = () => {
    const videoElement = remoteVideoRef.current;
    if (hasAudio && videoElement && videoElement.muted) {
      videoElement.muted = false;
      displayStatus('Audio unmuted');
    }
  };

  // Connect on component mount
  useEffect(() => {
    if (autoConnect) {
      connectToSignalingServer();
    }

    // Handle page close/cleanup
    return () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        sendSignalingMessage('DISPOSE', peerIdRef.current, 'ALL', 'Component unmounted');

        Object.keys(peerConnectionsRef.current).forEach(peerId => {
          if (peerConnectionsRef.current[peerId]) {
            sendSignalingMessage('DISPOSE', peerIdRef.current, peerId, 'Component unmounted');
          }
        });
      }
      cleanup();

      // Clear timers
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current);
      }
    };
  }, [autoConnect]);

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
        onClick={handleBodyClick}
      >
        {status}
      </div>
    </div>
  );
};

WebRTCClient.propTypes = {
  signalingUrl: PropTypes.string,
  autoConnect: PropTypes.bool,
  reconnectInterval: PropTypes.number,
  statusDisplayTime: PropTypes.number
};

export default WebRTCClient; 