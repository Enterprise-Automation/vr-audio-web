import React, { useState, useEffect, useRef } from 'react';
import { Button, Typography, List, ListItem } from '@mui/material';
import useWebSocket from 'react-use-websocket';

const VoiceActivationPage = () => {
    const [isListening, setIsListening] = useState(false);
    const [intents, setIntents] = useState([]);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const websocketUrl = 'ws://localhost:8000/ws/voice-activation';
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const dataArrayRef = useRef(null);
    const silenceThreshold = 0.01;
    const silenceDuration = 2000; // 1 second
    let silenceStart = null;

    const { sendMessage } = useWebSocket(websocketUrl, {
        onOpen: () => console.log('WebSocket connection opened.'),
        onClose: () => console.log('WebSocket connection closed.'),
        onMessage: (message) => {
            console.log('Received message:', message.data);
            const intent = message.data;
            setIntents((prev) => [...prev, intent]);
        },
        shouldReconnect: (closeEvent) => true,
    });

    useEffect(() => {
        if (isListening) {
            startListening();
        } else {
            stopListening();
        }
    }, [isListening]);

    const startListening = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContextRef.current.createMediaStreamSource(stream);
            analyserRef.current = audioContextRef.current.createAnalyser();
            analyserRef.current.fftSize = 2048;
            source.connect(analyserRef.current);
            dataArrayRef.current = new Float32Array(analyserRef.current.fftSize);
            mediaRecorderRef.current = new MediaRecorder(stream);
            mediaRecorderRef.current.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };
            mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
                sendMessage(audioBlob);
                audioChunksRef.current = [];
            };
            console.log('Listening started');
            detectVoice();
        } catch (error) {
            console.error('Error starting listening:', error);
        }
    };

    const detectVoice = () => {
        analyserRef.current.getFloatTimeDomainData(dataArrayRef.current);
        const rms = Math.sqrt(dataArrayRef.current.reduce((sum, value) => sum + value * value, 0) / dataArrayRef.current.length);
        //console.log('RMS:', rms);

        if (rms > silenceThreshold) {
            if (mediaRecorderRef.current.state !== 'recording') {
                console.log('Voice detected, starting recording');
                mediaRecorderRef.current.start();
                silenceStart = null;
            }
        } else if (mediaRecorderRef.current.state === 'recording') {
            if (!silenceStart) {
                silenceStart = Date.now();
            } else if (Date.now() - silenceStart > silenceDuration) {
                console.log('Silence detected, stopping recording');
                mediaRecorderRef.current.stop();
            }
        }

        requestAnimationFrame(detectVoice);
    };

    const stopListening = () => {
        if (audioContextRef.current) {
            audioContextRef.current.close();
        }
    };

    const toggleListening = () => {
        setIsListening((prev) => !prev);
    };

    return (
        <div>
            <Button variant="contained" color={isListening ? 'secondary' : 'primary'} onClick={toggleListening}>
                {isListening ? 'Disable Microphone' : 'Enable Microphone'}
            </Button>
            <Typography variant="h6" style={{ marginTop: '20px' }}>Received Intents:</Typography>
            <List>
                {intents.map((intent, index) => (
                    <ListItem key={index}>{intent}</ListItem>
                ))}
            </List>
        </div>
    );
};

export default VoiceActivationPage; 