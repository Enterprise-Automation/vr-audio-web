import React, { useState, useEffect, useRef } from 'react';
import { TextField, Button, List, ListItem, Typography, IconButton, Grid, Select, MenuItem, FormControl, InputLabel, Paper } from '@mui/material';
import { Add, Send, Edit, PlayArrow, Delete, Train } from '@mui/icons-material';
import { openDatabase, getAllAudioClips, saveStep, getAllSteps, updateStep, getAllIntents, saveIntent, deleteIntent, getAllLabels, saveLabel, deleteLabel } from './utils/indexedDB';
import { Box } from '@mui/material';
const labelMap = {
    0: "Request for Name",
    1: "Request for DOB",
    2: "Intent to Arrest",
    3: "Out of Scope"
};

const PhraseRecognition = () => {
    const [steps, setSteps] = useState([]);
    const [currentStep, setCurrentStep] = useState({ keywords: [], systemPrompts: [], userPrompts: [] });
    const [audioClips, setAudioClips] = useState([]);
    const [editingIndex, setEditingIndex] = useState(null);
    const [selectedStepIndex, setSelectedStepIndex] = useState(null);
    const [intents, setIntents] = useState([]);
    const [currentIntent, setCurrentIntent] = useState({ text: '', label: 0 });
    const [selectedLabel, setSelectedLabel] = useState('');
    const [labels, setLabels] = useState([]);
    const [newLabel, setNewLabel] = useState({ id: '', name: '' });
    const [warningMessage, setWarningMessage] = useState('');
    const [warningColour, setWarningColour] = useState('red');
    const [threshold, setThreshold] = useState(0.8);
    const [testResults, setTestResults] = useState({});
    const dbRef = useRef(null);

    useEffect(() => {
        const loadData = async () => {
            dbRef.current = await openDatabase();
            const clips = await getAllAudioClips(dbRef.current);
            setAudioClips(clips);

            const storedSteps = await getAllSteps(dbRef.current);
            const initializedSteps = storedSteps.map(step => ({ ...step, matchedKeywords: [] }));
            setSteps(initializedSteps);

            const storedIntents = await getAllIntents(dbRef.current);
            setIntents(storedIntents);

            const storedLabels = await getAllLabels(dbRef.current);
            setLabels(storedLabels);

            checkBalance(storedIntents);
        };

        loadData();
    }, []);

    const checkBalance = (intents) => {
        const labelCounts = intents.reduce((acc, intent) => {
            acc[intent.label] = (acc[intent.label] || 0) + 1;
            return acc;
        }, {});

        console.log('Label Counts:', labelCounts); // Debugging log

        const counts = Object.values(labelCounts);
        console.log('Counts:', counts); // Debugging log

        const isBalanced = counts.every(count => count === counts[0]);

        if (!isBalanced) {
            console.log('Intents are not balanced'); // Debugging log
            setWarningMessage('Warning: Intents are not balanced across labels.');
            setWarningColour('red');
        } else {
            console.log('Intents are balanced'); // Debugging log
            setWarningMessage('Intents are balanced');
            setWarningColour('green');
        }
    };

    const removeIntent = async (id) => {
        await deleteIntent(dbRef.current, id);
        const storedIntents = await getAllIntents(dbRef.current);
        setIntents(storedIntents);
        checkBalance(storedIntents);
    };

    const addKeyword = () => {
        setCurrentStep((prev) => ({
            ...prev,
            keywords: [...prev.keywords, ''],
        }));
    };

    const addSystemPrompt = () => {
        setCurrentStep((prev) => ({
            ...prev,
            systemPrompts: [...prev.systemPrompts, ''],
        }));
    };

    const addUserPrompt = () => {
        setCurrentStep((prev) => ({
            ...prev,
            userPrompts: [...prev.userPrompts, ''],
        }));
    };

    const handleKeywordChange = (index, value) => {
        const newKeywords = [...currentStep.keywords];
        newKeywords[index] = value;
        setCurrentStep((prev) => ({ ...prev, keywords: newKeywords }));
    };

    const handleSystemPromptChange = (index, value) => {
        const newSystemPrompts = [...currentStep.systemPrompts];
        newSystemPrompts[index] = value;
        setCurrentStep((prev) => ({ ...prev, systemPrompts: newSystemPrompts }));
    };

    const handleUserPromptChange = (index, value) => {
        const newUserPrompts = [...currentStep.userPrompts];
        newUserPrompts[index] = value;
        setCurrentStep((prev) => ({ ...prev, userPrompts: newUserPrompts }));
    };

    const deleteKeyword = (index) => {
        const newKeywords = [...currentStep.keywords];
        newKeywords.splice(index, 1);
        setCurrentStep((prev) => ({ ...prev, keywords: newKeywords }));
    };

    const deleteSystemPrompt = (index) => {
        const newSystemPrompts = [...currentStep.systemPrompts];
        newSystemPrompts.splice(index, 1);
        setCurrentStep((prev) => ({ ...prev, systemPrompts: newSystemPrompts }));
    };

    const deleteUserPrompt = (index) => {
        const newUserPrompts = [...currentStep.userPrompts];
        newUserPrompts.splice(index, 1);
        setCurrentStep((prev) => ({ ...prev, userPrompts: newUserPrompts }));
    };

    const addStep = async () => {
        if (editingIndex !== null) {
            const updatedSteps = [...steps];
            updatedSteps[editingIndex] = { ...currentStep, matchedKeywords: [] };
            setSteps(updatedSteps);
            await updateStep(dbRef.current, updatedSteps[editingIndex].id, currentStep);
            setEditingIndex(null);
        } else {
            const newStep = { ...currentStep, matchedKeywords: [] };
            await saveStep(dbRef.current, newStep);
            const storedSteps = await getAllSteps(dbRef.current);
            const initializedSteps = storedSteps.map(step => ({ ...step, matchedKeywords: [] }));
            setSteps(initializedSteps);
        }
        setCurrentStep({ keywords: [], systemPrompts: [], userPrompts: [] });
    };

    const editStep = (index) => {
        setCurrentStep(steps[index]);
        setEditingIndex(index);
    };

    const executeTest = async (step, clip) => {
        try {
            const response = await fetch('http://localhost:1234/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: "Meta-Llama-3-8B-Instruct-GGUF",
                    messages: [
                        {
                            role: "system",
                            content: `answer the question in ca single character(just a number), no punctuation do not add any other content or context or comments.   `,
                        },
                        // {
                        //     role: "user",
                        //     content: `previous conversation: ${clip.response}`,
                        // },
                        ...step.systemPrompts.map(systemPrompt => ({
                            role: "system",
                            content: ` ${systemPrompt}`,
                        })),
                        ...step.userPrompts.map(userPrompt => ({
                            role: "user",
                            content: ` {"data": "${clip.response}"}, ${userPrompt}`,
                        })),
                    ],
                    temperature: 0.7,
                    max_tokens: -1,
                    stream: false,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to execute test');
            }

            const result = await response.json();
            console.log('Test result:', result);
        } catch (error) {
            console.error('Error executing test:', error);
        }
    };

    const playAudioClip = (clip) => {
        const audio = new Audio(URL.createObjectURL(clip.blob));
        audio.play();
    };

    const selectStep = (index) => {
        setSelectedStepIndex(index);
    };

    const testStepWithResponse = (clip) => {
        // if (selectedStepIndex === null) return;
        // const response = (clip.response || '').toLowerCase();
        // const step = steps[selectedStepIndex];
        // const matchedKeywords = step.keywords.filter(keyword => response.includes(keyword.toLowerCase()));
        // const updatedStep = { ...step, matchedKeywords };
        // const updatedSteps = [...steps];
        // updatedSteps[selectedStepIndex] = updatedStep;
        // setSteps(updatedSteps);
        executeTest(steps[selectedStepIndex], clip);
    };

    const highlightKeywords = (response, keywords) => {
        let highlightedResponse = response;
        keywords.forEach(keyword => {
            const regex = new RegExp(`(${keyword})`, 'gi');
            highlightedResponse = highlightedResponse.replace(regex, '<span class="highlight">$1</span>');
        });
        return highlightedResponse;
    };

    const handleIntentChange = (field, value) => {
        setCurrentIntent((prev) => ({ ...prev, [field]: value }));
    };

    const addIntent = async (labelId) => {
        await saveIntent(dbRef.current, { ...currentIntent, label: labelId });
        const storedIntents = await getAllIntents(dbRef.current);
        setIntents(storedIntents);
        checkBalance(storedIntents);
        setCurrentIntent({ text: '', label: labelId });
    };

    const fetchIntentsFromService = async () => {
        try {
            const response = await fetch('/api/intents');
            if (!response.ok) {
                throw new Error('Failed to fetch intents');
            }
            const fetchedIntents = await response.json();
            fetchedIntents.forEach(async (intent) => {
                await saveIntent(dbRef.current, intent);
            });
            const storedIntents = await getAllIntents(dbRef.current);
            setIntents(storedIntents);
        } catch (error) {
            console.error('Error fetching intents:', error);
        }
    };

    const uniqueLabels = [...new Set(intents.map(intent => intent.label))];

    const handleLabelChange = (event) => {
        setSelectedLabel(event.target.value);
    };

    const filteredIntents = intents.filter(intent => selectedLabel === '' || intent.label === selectedLabel);

    const handleNewLabelChange = (field, value) => {
        setNewLabel((prev) => ({ ...prev, [field]: value }));
    };

    const addLabel = async () => {
        await saveLabel(dbRef.current, newLabel);
        const storedLabels = await getAllLabels(dbRef.current);
        setLabels(storedLabels);
        setNewLabel({ id: '', name: '' });
    };

    const removeLabel = async (id) => {
        await deleteLabel(dbRef.current, id);
        const storedLabels = await getAllLabels(dbRef.current);
        setLabels(storedLabels);
    };

    const labelCounts = intents.reduce((acc, intent) => {
        acc[intent.label] = (acc[intent.label] || 0) + 1;
        return acc;
    }, {});

    const getResultColor = (result) => {
        if (result === 'Out of Scope') return 'red';
        return 'green';
    };

    const sendTranscriptToService = async (transcription, clipId) => {
        const startTime = new Date().toLocaleString(); // Capture start time

        try {
            const response = await fetch('http://127.0.0.1:8001/check_intents', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    transcription,
                    model_dir: './model',
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to send transcript to service');
            }

            const result = await response.json();
            console.log('Service result:', result);

            const matchingIntents = [];
            result.results.forEach(segment => {
                segment.intents.forEach(intent => {
                    if (intent.confidence >= threshold) {
                        matchingIntents.push(intent.label);
                    }
                });
            });

            const matchStatus = matchingIntents.length > 0 ? matchingIntents.join(', ') : 'Out of Scope';

            setTestResults(prev => ({ ...prev, [clipId]: { result: matchStatus, startTime } })); // Store start time
        } catch (error) {
            console.error('Error sending transcript:', error);
        }
    };

    const initiateModelTraining = async () => {
        try {
            const response = await fetch('http://127.0.0.1:8002/train', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    data: intents,
                    num_labels: new Set(intents.map(intent => intent.label)).size 
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to initiate model training');
            }

            const result = await response.json();
            console.log('Training result:', result);
            setWarningMessage('Model training initiated successfully!');
            setWarningColour('green');
        } catch (error) {
            console.error('Error initiating model training:', error);
        }
    };

    return (
        <div>
            {warningMessage && (
                <Typography variant="caption" color={warningColour} style={{ marginBottom: '10px' }}>
                    {warningMessage}
                </Typography>
            )}
            <Grid container spacing={4}>

                <Grid item xs={6}>
                    <Paper elevation={3} style={{ padding: '20px', marginBottom: '20px' }}>
                        <Typography variant="h7" gutterBottom>Manage Labels</Typography>
                        <TextField
                            label="Label ID"
                            variant="outlined"
                            fullWidth
                            value={newLabel.id}
                            onChange={(e) => handleNewLabelChange('id', e.target.value)}
                            style={{ margin: '10px' }}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                            <TextField

                                label="Label Name"
                                variant="outlined"
                                fullWidth
                                value={newLabel.name}
                                onChange={(e) => handleNewLabelChange('name', e.target.value)}
                                style={{ margin: '10px' }}
                            />
                            <IconButton color="primary" onClick={addLabel}>
                                <Add />
                            </IconButton>
                        </div>
                        <List style={{

                            maxHeight: '150px', overflowY: 'auto', marginTop: '10px'
                        }}>
                            {labels.map((label) => (
                                <ListItem key={label.id}>
                                    <Typography variant="caption">
                                        {label.name} (ID: {label.id})
                                    </Typography>
                                    <IconButton color="error" onClick={() => removeLabel(label.id)}>
                                        <Delete />
                                    </IconButton>
                                </ListItem>
                            ))}
                        </List>
                    </Paper>
                    <Grid item xs={12}>
                        <Paper elevation={3} style={{ padding: '20px' }}>
                            <Typography variant="h7" gutterBottom>Intents</Typography>
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                                <TextField
                                    label="Intent Text"
                                    variant="outlined"
                                    fullWidth
                                    value={currentIntent.text}
                                    onChange={(e) => handleIntentChange('text', e.target.value)}
                                    style={{ margin: '10px' }}
                                />
                                <IconButton color="primary" onClick={() => addIntent(selectedLabel)}>
                                    <Add />
                                </IconButton>
                            </div>
                            <FormControl fullWidth style={{ margin: '10px' }}>
                                <Select
                                    labelId="label-select"
                                    value={selectedLabel}
                                    onChange={handleLabelChange}
                                >
                                    <MenuItem value=""><em>All</em></MenuItem>
                                    {labels.map((label) => (
                                        <MenuItem key={label.id} value={label.id}>
                                            {label.name} ({labelCounts[label.id] || 0})
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <Typography variant="caption" color="textSecondary" style={{ marginBottom: '10px' }}>
                                Showing {filteredIntents.length} of {intents.length} intents
                            </Typography>
                            <List style={{ maxHeight: '150px', overflowY: 'auto' }}>
                                {filteredIntents.map((intent, index) => (
                                    <ListItem key={index}>
                                        <Typography variant="caption">
                                            {intent.text} (Label: {intent.label} - {labels.find(l => l.id === intent.label)?.name || 'Unknown'})
                                        </Typography>
                                        <IconButton color="error" onClick={() => removeIntent(intent.id)}>
                                            <Delete />
                                        </IconButton>
                                    </ListItem>
                                ))}
                            </List>
                        </Paper>
                    </Grid>
                </Grid>
                <Grid item xs={6}>
                    <Paper elevation={3} style={{ padding: '20px' }}>
                        <Typography variant="h7" gutterBottom>Testing Area</Typography>
                        <TextField
                            label="Threshold"
                            variant="outlined"
                            fullWidth
                            type="number"
                            value={threshold}
                            onChange={(e) => setThreshold(parseFloat(e.target.value))}
                            style={{ margin: '10px' }}
                        />
                        <List style={{ maxHeight: '500px', overflowY: 'auto' }}>
                            {audioClips.map((clip, index) => (
                                <ListItem key={index} style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                        <Typography variant="caption" style={{ marginRight: '10px' }}>
                                            {clip.name || `Audio Clip ${index + 1}`}
                                        </Typography>
                                        <IconButton color="primary" onClick={() => playAudioClip(clip)}>
                                            <PlayArrow />
                                        </IconButton>
                                        <Typography variant="caption" style={{ marginLeft: '10px', flexGrow: 1 }}>
                                            {clip.response || 'No transcript available'}
                                        </Typography>
                                        <Typography variant="caption" style={{ marginLeft: '10px', color: 'textSecondary' }}>
                                            {new Date(clip.timestamp).toLocaleString()}
                                        </Typography>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', marginTop: '5px' }}>
                                        <IconButton
                                            color="primary"
                                            onClick={() => sendTranscriptToService(clip.response, clip.id)}
                                            style={{ marginRight: '10px' }}
                                        >
                                            <Send />
                                        </IconButton>
                                        <Typography variant="caption" style={{ color: getResultColor(testResults[clip.id]?.result) }}>
                                            {testResults[clip.id]?.result || 'Not Tested'}
                                        </Typography>
                                        <Typography variant="caption" style={{ marginLeft: '10px', color: 'textSecondary' }}>
                                            {testResults[clip.id]?.startTime}
                                        </Typography>
                                    </div>
                                </ListItem>
                            ))}
                        </List>
                    </Paper>
               <Grid item xs={12}>
                    <Paper elevation={3} style={{ padding: '20px', marginTop: '20px' }}>
                        <Typography variant="h7" gutterBottom>Model Training</Typography>
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <IconButton color="primary" onClick={initiateModelTraining}>
                                <Train />
                            </IconButton>
                            <Typography variant="caption" style={{ marginLeft: '10px' }}>
                                Initiate Model Training
                            </Typography>
                        </div>
                    </Paper>
                </Grid>
                </Grid>

 

            </Grid>
        </div>
    );
};

export default PhraseRecognition; 