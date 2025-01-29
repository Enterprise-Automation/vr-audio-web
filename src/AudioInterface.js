import React, { useState, useRef, useEffect } from 'react';
import { Button, List, ListItem, TextField, Typography, IconButton, Grid, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { Send, Delete, Download, Mic, MicOff, UploadFile, ClearAll, Audiotrack } from '@mui/icons-material';
import useWebSocket from 'react-use-websocket';
import { openDatabase, saveAudioClip, saveWebSocketResponse, getAllAudioClips, getAllWebSocketResponses, updateAudioClipName, deleteAudioClip, updateAudioClipWithResponse, clearWebSocketResponses, getAllLabels, updateAudioClipExpectedLabels } from './utils/indexedDB';

const AudioInterface = () => {
    const [audioClips, setAudioClips] = useState([]);
    const [websocketUrl, setWebsocketUrl] = useState('ws://localhost:8000/ws/process-interaction');
    const [isRecording, setIsRecording] = useState(false);
    const [websocketResponse, setWebsocketResponse] = useState([]);
    const [isSending, setIsSending] = useState(false);
    const [audioId, setAudioId] = useState(0);
    const [textInput, setTextInput] = useState('');
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const dbRef = useRef(null);
    const responseEndRef = useRef(null);
    const [labels, setLabels] = useState([]);

    useEffect(() => {
        const loadData = async () => {
            dbRef.current = await openDatabase();
            const audioClips = await getAllAudioClips(dbRef.current);
            const clipsWithUrls = audioClips.map(clip => ({
                ...clip,
                url: URL.createObjectURL(clip.blob),
                expectedLabel: clip.expectedLabel || ''
            }));
            setAudioClips(clipsWithUrls);

            const responses = await getAllWebSocketResponses(dbRef.current);
            setWebsocketResponse(responses.map(item => item.data));

            const storedLabels = await getAllLabels(dbRef.current);
            setLabels(storedLabels);
        };

        loadData();
    }, []);

    useEffect(() => {
        if (responseEndRef.current) {
            responseEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [websocketResponse]);

    const { sendMessage } = useWebSocket(websocketUrl, {
        onOpen: () => console.log('WebSocket connection opened.'),
        onClose: () => console.log('WebSocket connection closed.'),
        onMessage: async (message) => {
            const responseText = message.data;
            setWebsocketResponse((prev) => [...prev, responseText]);

            await updateAudioClipWithResponse(dbRef.current, audioId, responseText);
            await updateAudioClipName(dbRef.current, audioId, responseText.substring(0, 15));
            getAllAudioClips(dbRef.current).then((clips) => {
                setAudioClips(clips);
            });

            setIsSending(false); // Allow sending the next clip
        },
        shouldReconnect: (closeEvent) => true,
    });

    const startRecording = async () => {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        mediaRecorderRef.current.ondataavailable = (event) => {
            audioChunksRef.current.push(event.data);
        };
        mediaRecorderRef.current.onstop = async () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
            const audioUrl = URL.createObjectURL(audioBlob);
            setAudioClips((prev) => [...prev, { url: audioUrl, blob: audioBlob, name: '', expectedLabel: '' }]);
            await saveAudioClip(dbRef.current, audioBlob);
            audioChunksRef.current = [];
        };
        mediaRecorderRef.current.start();
        setIsRecording(true);
    };

    const stopRecording = () => {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
    };

    const handleFileUpload = async (event) => {
        const files = event.target.files;
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const audioUrl = URL.createObjectURL(file);
            setAudioClips((prev) => [...prev, { url: audioUrl, blob: file, name: file.name, expectedLabel: '' }]);
            await saveAudioClip(dbRef.current, file);
        }
    };

    const sendAudioClip = (audioBlob, id) => {
        console.log(id);
        if (websocketUrl && !isSending) {
            setAudioId(id)
            setIsSending(true);
            sendMessage(audioBlob);
        } else if (!websocketUrl) {
            alert('Please set a WebSocket URL.');
        }
    };

    const handleNameChange = (id, newName) => {
        updateAudioClipName(dbRef.current, id, newName);
        getAllAudioClips(dbRef.current).then((clips) => {
            setAudioClips(clips);
        });
    };

    const deleteClip = async (id) => {
        await deleteAudioClip(dbRef.current, id);
        const updatedClips = await getAllAudioClips(dbRef.current);
        setAudioClips(updatedClips);
    };

    const clearResponses = async () => {
        await clearWebSocketResponses(dbRef.current);
        setWebsocketResponse([]);
    };

    const generateAudioFromText = async () => {
        if (!textInput.trim()) return;

        try {
            const response = await fetch('/api/generate-audio', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text: textInput }),
            });

            if (!response.ok) {
                throw new Error('Failed to generate audio');
            }

            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            setAudioClips((prev) => [...prev, { url: audioUrl, blob: audioBlob, name: '', expectedLabel: '' }]);
            await saveAudioClip(dbRef.current, audioBlob);
        } catch (error) {
            console.error('Error generating audio:', error);
        }
    };

    const handleExpectedLabelChange = (id, newLabel) => {
        const updatedClips = audioClips.map(clip =>
            clip.id === id ? { ...clip, expectedLabel: newLabel } : clip
        );
        setAudioClips(updatedClips);
        updateAudioClipExpectedLabels(dbRef.current, id, newLabel);
    };

    return (
        <div>
            <TextField
                label="WebSocket URL"
                variant="outlined"
                fullWidth
                value={websocketUrl}
                onChange={(e) => setWebsocketUrl(e.target.value)}
                style={{ marginBottom: '20px' }}
            />
            <IconButton
                color="primary"
                onClick={isRecording ? stopRecording : startRecording}
                style={{ marginBottom: '20px' }}
            >
                {isRecording ? <MicOff /> : <Mic />}
            </IconButton>
            <input
                type="file"
                accept="audio/*"
                multiple
                onChange={handleFileUpload}
                style={{ display: 'none' }}
                id="file-upload"
            />
            <label htmlFor="file-upload">
                <IconButton color="primary" component="span" style={{ marginBottom: '20px' }}>
                    <UploadFile />
                </IconButton>
            </label>
            <TextField
                label="Text to Audio"
                variant="outlined"
                fullWidth
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                style={{ marginBottom: '20px' }}
            />
            <IconButton
                color="primary"
                onClick={generateAudioFromText}
                style={{ marginBottom: '20px' }}
            >
                <Audiotrack />
            </IconButton>
            <Grid container spacing={2}>
                <Grid item xs={8}>
                    <List>
                        {audioClips.map((clip, index) => (
                            <ListItem id={clip.id} key={index}>
                                <audio controls src={clip.url} style={{ marginRight: '20px' }} />
                                <TextField
                                    label="Name"
                                    variant="outlined"
                                    value={clip.name}
                                    onChange={(e) => handleNameChange(clip.id, e.target.value)}
                                    style={{ marginRight: '20px' }}
                                />
                                <IconButton
                                    color="secondary"
                                    onClick={() => sendAudioClip(clip.blob, clip.id)}
                                    disabled={isSending}
                                    style={{ marginRight: '10px' }}
                                >
                                    <Send />
                                </IconButton>
                                <IconButton
                                    color="error"
                                    onClick={() => deleteClip(clip.id)}
                                    style={{ marginRight: '10px' }}
                                >
                                    <Delete />
                                </IconButton>
                                <IconButton
                                    color="primary"
                                    onClick={() => {
                                        const url = URL.createObjectURL(clip.blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = clip.name || `audio_clip_${clip.id}.wav`;
                                        a.click();
                                        URL.revokeObjectURL(url);
                                    }}
                                >
                                    <Download />
                                </IconButton>
                            </ListItem>
                        ))}
                    </List>
                </Grid>
                <Grid item xs={4}>
                    <div className="response-section">
                        <Typography variant="h6">WebSocket Response</Typography>
                        <IconButton
                            color="secondary"
                            onClick={clearResponses}
                            style={{ float: 'right' }}
                        >
                            <ClearAll />
                        </IconButton>
                        {websocketResponse.map((response, index) => (
                            <Typography
                                key={index}
                                variant="body1"
                                component="div"
                                className={index === websocketResponse.length - 1 ? 'highlight' : ''}
                            >
                                {response}
                            </Typography>
                        ))}
                        <div ref={responseEndRef} />
                    </div>
                </Grid>
            </Grid>
        </div>
    );
};

export default AudioInterface;