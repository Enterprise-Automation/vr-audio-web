import React, { useState, useEffect } from 'react';
import {
    Grid, Paper, Typography, TextField, Button, List, ListItem,
    IconButton, FormControl, InputLabel, Select, MenuItem, Dialog,
    DialogTitle, DialogContent, DialogActions, FormControlLabel, Switch, LinearProgress
} from '@mui/material';
import { Add, Delete, Edit, PlayArrow } from '@mui/icons-material';
import { useDomain } from './contexts/DomainContext';
import { openDatabase, getAllIntents, deleteIntent, updateIntent } from './utils/indexedDB';

const IntentManagement = () => {
    const { domain } = useDomain();

    // State for all entities
    const [actors, setActors] = useState([]);
    const [intentGroups, setIntentGroups] = useState([]);
    const [contextPrompts, setContextPrompts] = useState([]);
    const [intents, setIntents] = useState([]);
    const [audioResponses, setAudioResponses] = useState([]);
    const [audioResponseFilters, setAudioResponseFilters] = useState({
        intent: '',
        actor: '',
        intentGroup: ''
    });

    // State for new/editing items
    const [newActor, setNewActor] = useState({ actor_name: '' });
    const [newIntentGroup, setNewIntentGroup] = useState({
        intent_group_name: '',
        intent_group_context: ''
    });
    const [newContextPrompt, setNewContextPrompt] = useState({ prompt: '' });
    const [newIntent, setNewIntent] = useState({
        intent_id: '',
        intent_name: '',
        intent_context: ''
    });

    // Edit dialog state
    const [editDialog, setEditDialog] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [editingType, setEditingType] = useState('');

    // Add these new state variables at the top with other states:
    const [testRequest, setTestRequest] = useState({
        transcription: '',
        intent_name: '',
        actor: '',
        context: 1,
        additional_context: '',
        generate: false,
        intent_group_id: 1
    });

    // Add these new states at the top with other states:
    const [deleteDialog, setDeleteDialog] = useState(false);
    const [deleteItem, setDeleteItem] = useState(null);
    const [deleteType, setDeleteType] = useState('');

    // Add these new states at the top with other states:
    const dbRef = React.useRef(null);

    const [batchGeneration, setBatchGeneration] = useState({
        generateAllGroups: false,
        responsesPerGroup: 1,
        delayInMs: 500
    });

    const [isGenerating, setIsGenerating] = useState(false);
    const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });

    // Fetch all data on component mount
    useEffect(() => {
        const loadData = async () => {
            try {
                dbRef.current = await openDatabase();
                const storedIntents = await getAllIntents(dbRef.current, domain);
                setIntents(storedIntents);
                fetchAllData();
            } catch (error) {
                console.error('Error loading data:', error);
            }
        };
        loadData();
    }, [domain]);

    const fetchAllData = async () => {
        try {
            const [
                actorsRes,
                groupsRes,
                promptsRes,
                intentsRes,
                responsesRes
            ] = await Promise.all([
                fetch(`${domain}/actors/`),
                fetch(`${domain}/intent-groups/`),
                fetch(`${domain}/context-prompts/`),
                fetch(`${domain}/intents/?include_all=true`),
                fetch(`${domain}/audio-responses/`)
            ]);

            const [
                actorsData,
                groupsData,
                promptsData,
                intentsData,
                responsesData
            ] = await Promise.all([
                actorsRes.json(),
                groupsRes.json(),
                promptsRes.json(),
                intentsRes.json(),
                responsesRes.json()
            ]);

            setActors(actorsData);
            setIntentGroups(groupsData);
            setContextPrompts(promptsData);
            setIntents(intentsData);
            setAudioResponses(responsesData);
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };

    const handleEdit = (item, type) => {
        setEditingItem(item);
        setEditingType(type);
        setEditDialog(true);
    };

    const handleEditSave = async () => {
        try {
            if (editingType === 'intents') {
                await handleIntentEdit(editingItem);
            } else {
                const response = await fetch(`${domain}/${editingType}/${editingItem.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(editingItem)
                });
                if (response.ok) {
                    fetchAllData();
                    setEditDialog(false);
                }
            }
        } catch (error) {
            console.error('Error updating item:', error);
        }
    };

    const handleDelete = async (id, type) => {
        setDeleteItem(id);
        setDeleteType(type);
        setDeleteDialog(true);
    };

    const handleDeleteConfirm = async () => {
        try {
            const response = await fetch(`${domain}/${deleteType}/${deleteItem}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                fetchAllData();
            }
        } catch (error) {
            console.error('Error deleting item:', error);
        } finally {
            setDeleteDialog(false);
        }
    };

    const playAudio = (audioBase64) => {
        const audio = new Audio(`data:audio/ogg;base64,${audioBase64}`);
        audio.play();
    };

    // CRUD operations for Actors
    const handleAddActor = async () => {
        try {
            const response = await fetch(`${domain}/actors/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newActor)
            });
            if (response.ok) {
                setNewActor({ actor_name: '' });
                fetchAllData();
            }
        } catch (error) {
            console.error('Error adding actor:', error);
        }
    };

    // CRUD operations for Intent Groups
    const handleAddIntentGroup = async () => {
        try {
            const response = await fetch(`${domain}/intent-groups/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newIntentGroup)
            });
            if (response.ok) {
                setNewIntentGroup({ intent_group_name: '', intent_group_context: '' });
                fetchAllData();
            }
        } catch (error) {
            console.error('Error adding intent group:', error);
        }
    };

    // CRUD operations for Context Prompts
    const handleAddContextPrompt = async () => {
        try {
            const response = await fetch(`${domain}/context-prompts/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newContextPrompt)
            });
            if (response.ok) {
                setNewContextPrompt({ prompt: '' });
                fetchAllData();
            }
        } catch (error) {
            console.error('Error adding context prompt:', error);
        }
    };

    // CRUD operations for Intents
    const handleAddIntent = async () => {
        try {
            // If no intent_id is specified, find the highest existing ID and increment it
            let intentToAdd = { ...newIntent };
            if (!intentToAdd.intent_id || intentToAdd.intent_id === '') {
                // Filter for valid IDs below 10000
                const validIds = intents
                    .map(intent => intent.intent_id ? parseInt(intent.intent_id) : 0)
                    .filter(id => id < 10000);

                // Find highest and add 1, or start from 1 if no valid IDs
                const nextId = validIds.length > 0 ? Math.max(...validIds) + 1 : 1;
                intentToAdd.intent_id = nextId.toString();
            }

            const response = await fetch(`${domain}/intents/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(intentToAdd)
            });

            if (response.ok) {
                setNewIntent({ intent_id: '', intent_name: '', intent_context: '' });
                fetchAllData();
            }
        } catch (error) {
            console.error('Error adding intent:', error);
        }
    };

    // Update the removeIntent function
    const removeIntent = async (id) => {
        try {
            await deleteIntent(dbRef.current, id, domain);
            const storedIntents = await getAllIntents(dbRef.current, domain);
            setIntents(storedIntents);
        } catch (error) {
            console.error('Error removing intent:', error);
        }
    };

    // Add handleIntentEdit function
    const handleIntentEdit = async (intent) => {
        try {
            await updateIntent(dbRef.current, intent, domain);
            const storedIntents = await getAllIntents(dbRef.current, domain);
            setIntents(storedIntents);
            setEditDialog(false);
        } catch (error) {
            console.error('Error updating intent:', error);
        }
    };

    const getAudioResponse = async (request) => {
        try {
            const response = await fetch(`${domain}/audio-response/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(request)
            });

            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }

            const audioBlob = await response.blob();
            return audioBlob;
        } catch (error) {
            console.error('Error getting audio response:', error);
            return null;
        }
    };

    const generateBatchResponses = async () => {
        if (batchGeneration.generateAllGroups && intentGroups.length > 0) {
            setIsGenerating(true);
            const totalResponses = intentGroups.length * batchGeneration.responsesPerGroup;
            setGenerationProgress({ current: 0, total: totalResponses });

            let completedCount = 0;

            for (const group of intentGroups) {
                for (let i = 0; i < batchGeneration.responsesPerGroup; i++) {
                    // Create request with current group
                    const request = {
                        transcription: testRequest.transcription,
                        intent_name: testRequest.intent_name,
                        actor: testRequest.actor,
                        context: testRequest.context,
                        additional_context: testRequest.additional_context,
                        generate: true,
                        intent_group_id: group.id
                    };

                    // Get response
                    const audioBlob = await getAudioResponse(request);

                    if (audioBlob) {
                        // Play audio if needed
                        const audio = new Audio(URL.createObjectURL(audioBlob));
                        audio.play();

                        // Update progress
                        completedCount++;
                        setGenerationProgress({ current: completedCount, total: totalResponses });

                        // Fetch updated responses
                        const responses = await getAllAudioResponses(dbRef.current, domain);
                        setAudioResponses(responses);

                        // Add delay if specified
                        if (batchGeneration.delayInMs > 0 &&
                            (i < batchGeneration.responsesPerGroup - 1 ||
                                intentGroups.indexOf(group) < intentGroups.length - 1)) {
                            await new Promise(resolve => setTimeout(resolve, batchGeneration.delayInMs));
                        }
                    }
                }
            }

            setIsGenerating(false);
        }
    };

    const handleGetAudioResponse = async () => {
        if (batchGeneration.generateAllGroups) {
            await generateBatchResponses();
        } else {
            try {
                const response = await fetch(`${domain}/audio-response/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(testRequest)
                });

                if (response.ok) {
                    const audioBlob = await response.blob();
                    const audio = new Audio(URL.createObjectURL(audioBlob));
                    audio.play();

                    // Refresh audio responses
                    const responses = await getAllAudioResponses(dbRef.current, domain);
                    setAudioResponses(responses);
                }
            } catch (error) {
                console.error('Error getting audio response:', error);
            }
        }
    };

    // Function to get all audio responses from the database
    const getAllAudioResponses = async (db, domain) => {
        try {
            const response = await fetch(`${domain}/audio-responses`);
            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error getting audio responses:', error);
            return [];
        }
    };

    return (
        <Grid container spacing={2}>

            {/* Get Audio Response Section */}
            <Grid item xs={12}>
                <Paper elevation={3} style={{ padding: '20px', marginBottom: '20px' }}>
                    <Typography variant="h4" style={{ color: '#1976d2' }}>Get Audio Response</Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Transcription"
                                value={testRequest.transcription}
                                onChange={(e) => setTestRequest({ ...testRequest, transcription: e.target.value })}
                                margin="normal"
                                multiline
                                rows={2}
                            />
                        </Grid>
                        <Grid item xs={4}>
                            <FormControl fullWidth margin="normal" variant="outlined">
                                <InputLabel id="intent-label">Intent</InputLabel>
                                <Select
                                    labelId="intent-label"
                                    label="Intent"
                                    value={testRequest.intent_name}
                                    onChange={(e) => setTestRequest({ ...testRequest, intent_name: e.target.value })}
                                >
                                    {intents.map((intent) => (
                                        <MenuItem key={intent.intent_id} value={intent.intent_name}>
                                            <span style={{ color: '#f44336' }}>{intent.intent_name}</span>
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={4}>
                            <FormControl fullWidth margin="normal" variant="outlined">
                                <InputLabel id="actor-select-label">Actor</InputLabel>
                                <Select
                                    labelId="actor-select-label"
                                    label="Actor"
                                    value={testRequest.actor}
                                    onChange={(e) => setTestRequest({ ...testRequest, actor: e.target.value })}
                                >
                                    {actors.map((actor) => (
                                        <MenuItem key={actor.id} value={actor.actor_name}>
                                            <span style={{ color: '#2196f3' }}>{actor.actor_name}</span>
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={4}>
                            <FormControl fullWidth margin="normal" variant="outlined">
                                <InputLabel id="context-select-label">Context</InputLabel>
                                <Select
                                    labelId="context-select-label"
                                    label="Context"
                                    value={testRequest.context}
                                    onChange={(e) => setTestRequest({ ...testRequest, context: e.target.value })}
                                >
                                    {contextPrompts.map((prompt) => (
                                        <MenuItem key={prompt.id} value={prompt.id}>
                                            <span style={{ color: '#9c27b0' }}>Context {prompt.id}</span>
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={4}>
                            <FormControl fullWidth margin="normal" variant="outlined">
                                <InputLabel id="group-select-label">Intent Group</InputLabel>
                                <Select
                                    labelId="group-select-label"
                                    label="Intent Group"
                                    value={testRequest.intent_group_id}
                                    onChange={(e) => setTestRequest({ ...testRequest, intent_group_id: e.target.value })}
                                    disabled={batchGeneration.generateAllGroups}
                                >
                                    {intentGroups.map((group) => (
                                        <MenuItem key={group.id} value={group.id}>
                                            <span style={{ color: '#4caf50' }}>{group.intent_group_name}</span>
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={4}>
                            <TextField
                                fullWidth
                                label="Additional Context"
                                value={testRequest.additional_context}
                                onChange={(e) => setTestRequest({ ...testRequest, additional_context: e.target.value })}
                                margin="normal"
                            />
                        </Grid>
                        <Grid item xs={4}>
                            <FormControl fullWidth margin="normal" variant="outlined">
                                <InputLabel id="generate-label">Generate New</InputLabel>
                                <Select
                                    labelId="generate-label"
                                    label="Generate New"
                                    value={testRequest.generate}
                                    onChange={(e) => setTestRequest({ ...testRequest, generate: e.target.value })}
                                >
                                    <MenuItem value={false}>No</MenuItem>
                                    <MenuItem value={true}>Yes</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>

                        {/* Batch Generation Options */}
                        <Grid item xs={4}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={batchGeneration.generateAllGroups}
                                        onChange={(e) => {
                                            setBatchGeneration({
                                                ...batchGeneration,
                                                generateAllGroups: e.target.checked
                                            });
                                            if (e.target.checked) {
                                                setTestRequest({
                                                    ...testRequest,
                                                    generate: true // Force generate to true when batch generating
                                                });
                                            }
                                        }}
                                        color="primary"
                                    />
                                }
                                label="Generate All Groups"
                                style={{ marginTop: '32px' }}
                            />
                        </Grid>
                        <Grid item xs={4}>
                            <TextField
                                fullWidth
                                margin="normal"
                                label="Responses Per Group"
                                type="number"
                                InputProps={{ inputProps: { min: 1, max: 10 } }}
                                value={batchGeneration.responsesPerGroup}
                                onChange={(e) => setBatchGeneration({
                                    ...batchGeneration,
                                    responsesPerGroup: Math.max(1, Math.min(10, parseInt(e.target.value) || 1))
                                })}
                                disabled={!batchGeneration.generateAllGroups}
                            />
                        </Grid>
                        <Grid item xs={4}>
                            <TextField
                                fullWidth
                                margin="normal"
                                label="Delay (ms)"
                                type="number"
                                InputProps={{ inputProps: { min: 0, max: 5000 } }}
                                value={batchGeneration.delayInMs}
                                onChange={(e) => setBatchGeneration({
                                    ...batchGeneration,
                                    delayInMs: Math.max(0, Math.min(5000, parseInt(e.target.value) || 0))
                                })}
                                disabled={!batchGeneration.generateAllGroups}
                                helperText="Delay between requests"
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={handleGetAudioResponse}
                                disabled={isGenerating}
                                fullWidth
                            >
                                {isGenerating
                                    ? `Generating (${generationProgress.current}/${generationProgress.total})`
                                    : batchGeneration.generateAllGroups
                                        ? `Generate ${batchGeneration.responsesPerGroup} Responses for Each Group (${intentGroups.length * batchGeneration.responsesPerGroup} total)`
                                        : 'Get Audio Response'
                                }
                            </Button>
                        </Grid>

                        {isGenerating && (
                            <Grid item xs={12} style={{ marginTop: '10px' }}>
                                <LinearProgress
                                    variant="determinate"
                                    value={(generationProgress.current / generationProgress.total) * 100}
                                />
                            </Grid>
                        )}
                    </Grid>
                </Paper>
            </Grid>

            {/* Actors Section */}
            <Grid item xs={12}>
                <Paper elevation={3} style={{ padding: '20px', marginBottom: '20px' }}>
                    <Typography variant="h4" style={{ color: '#1976d2' }}>Actors</Typography>
                    <div style={{ display: 'flex', marginBottom: '10px' }}>
                        <TextField
                            label="Actor Name"
                            value={newActor.actor_name}
                            onChange={(e) => setNewActor({ actor_name: e.target.value })}
                            fullWidth
                            style={{ marginRight: '10px' }}
                        />
                        <Button variant="contained" onClick={handleAddActor}>
                            Add
                        </Button>
                    </div>
                    <List>
                        {actors.map((actor) => (
                            <ListItem key={actor.id}>
                                <Typography>
                                    <span style={{ color: '#2196f3' }}>{actor.actor_name}</span>
                                    <span style={{ color: '#757575' }}> (ID: {actor.id})</span>
                                </Typography>
                                <IconButton onClick={() => handleEdit(actor, 'actors')}>
                                    <Edit />
                                </IconButton>
                                <IconButton onClick={() => handleDelete(actor.id, 'actors')}>
                                    <Delete />
                                </IconButton>
                            </ListItem>
                        ))}
                    </List>
                </Paper>
            </Grid>

            {/* Intent Groups Section */}
            <Grid item xs={12}>
                <Paper elevation={3} style={{ padding: '20px', marginBottom: '20px', height: '600px', display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="h4" style={{ color: '#388e3c', marginBottom: '10px' }}>Intent Groups</Typography>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '10px' }}>
                        <TextField
                            label="Group Name"
                            value={newIntentGroup.intent_group_name}
                            onChange={(e) => setNewIntentGroup({ ...newIntentGroup, intent_group_name: e.target.value })}
                            fullWidth
                        />
                        <TextField
                            label="Group Context"
                            value={newIntentGroup.intent_group_context}
                            onChange={(e) => setNewIntentGroup({ ...newIntentGroup, intent_group_context: e.target.value })}
                            fullWidth
                            multiline
                            rows={3}
                        />
                        <Button variant="contained" onClick={handleAddIntentGroup}>
                            Add
                        </Button>
                    </div>
                    <List style={{ overflowY: 'auto', flexGrow: 1, maxHeight: 'calc(100% - 220px)' }}>
                        {intentGroups.map((group) => (
                            <ListItem key={group.id}>
                                <div style={{ flexGrow: 1 }}>
                                    <Typography>
                                        <span style={{ color: '#4caf50' }}>{group.intent_group_name}</span>
                                        <span style={{ color: '#757575' }}> (ID: {group.id})</span>
                                    </Typography>
                                    <Typography variant="body2" style={{ color: '#666', whiteSpace: 'pre-wrap' }}>
                                        {group.intent_group_context}
                                    </Typography>
                                </div>
                                <IconButton onClick={() => handleEdit(group, 'intent-groups')}>
                                    <Edit />
                                </IconButton>
                                <IconButton onClick={() => handleDelete(group.id, 'intent-groups')}>
                                    <Delete />
                                </IconButton>
                            </ListItem>
                        ))}
                    </List>
                </Paper>
            </Grid>

            {/* Context Prompts Section */}
            <Grid item xs={12}>
                <Paper elevation={3} style={{ padding: '20px', marginBottom: '20px' }}>
                    <Typography variant="h4" style={{ color: '#7b1fa2' }}>Context Prompts</Typography>
                    <div style={{ display: 'flex', marginBottom: '10px' }}>
                        <TextField
                            label="Prompt"
                            value={newContextPrompt.prompt}
                            onChange={(e) => setNewContextPrompt({ prompt: e.target.value })}
                            fullWidth
                            multiline
                            rows={3}
                            style={{ marginRight: '10px' }}
                        />
                        <Button variant="contained" onClick={handleAddContextPrompt}>
                            Add
                        </Button>
                    </div>
                    <List>
                        {contextPrompts.map((prompt) => (
                            <ListItem key={prompt.id}>
                                <Typography>
                                    <span style={{ color: '#9c27b0' }}>{prompt.prompt}</span>
                                    <span style={{ color: '#757575' }}> (ID: {prompt.id})</span>
                                </Typography>
                                <IconButton onClick={() => handleEdit(prompt, 'context-prompts')}>
                                    <Edit />
                                </IconButton>
                                <IconButton onClick={() => handleDelete(prompt.id, 'context-prompts')}>
                                    <Delete />
                                </IconButton>
                            </ListItem>
                        ))}
                    </List>
                </Paper>
            </Grid>

            {/* Intents Section */}
            <Grid item xs={12}>
                <Paper elevation={3} style={{ padding: '20px', height: '600px', display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="h4" style={{ color: '#d32f2f', marginBottom: '10px' }}>Intents</Typography>
                    <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', marginBottom: '10px' }}>
                            <TextField
                                label="Intent ID"
                                value={newIntent.intent_id}
                                onChange={(e) => setNewIntent({ ...newIntent, intent_id: e.target.value })}
                                style={{ marginRight: '10px', flexGrow: 1 }}
                            />
                            <TextField
                                label="Intent Name"
                                value={newIntent.intent_name}
                                onChange={(e) => setNewIntent({ ...newIntent, intent_name: e.target.value })}
                                style={{ marginRight: '10px', flexGrow: 1 }}
                            />
                        </div>
                        <div style={{ display: 'flex' }}>
                            <TextField
                                label="Intent Context"
                                value={newIntent.intent_context}
                                onChange={(e) => setNewIntent({ ...newIntent, intent_context: e.target.value })}
                                style={{ marginRight: '10px', flexGrow: 1 }}
                                multiline
                                rows={2}
                            />
                            <Button variant="contained" onClick={handleAddIntent} style={{ alignSelf: 'flex-end' }}>
                                Add
                            </Button>
                        </div>
                    </div>
                    <List style={{ overflowY: 'auto', flexGrow: 1, maxHeight: 'calc(100% - 160px)' }}>
                        {intents.map((intent) => (
                            <ListItem key={intent.intent_id}>
                                <div style={{ flexGrow: 1 }}>
                                    <Typography>
                                        <span style={{ color: '#f44336' }}>{intent.intent_name}</span>
                                        <span style={{ color: '#757575' }}> (ID: {intent.intent_id})</span>
                                    </Typography>
                                    {intent.intent_context && (
                                        <Typography variant="body2" style={{ color: '#666', whiteSpace: 'pre-wrap' }}>
                                            {intent.intent_context.length > 60
                                                ? `${intent.intent_context.substring(0, 60)}...`
                                                : intent.intent_context}
                                        </Typography>
                                    )}
                                </div>
                                <IconButton onClick={() => handleEdit(intent, 'intents')}>
                                    <Edit />
                                </IconButton>
                                <IconButton onClick={() => handleDelete(intent.intent_id, 'intents')}>
                                    <Delete />
                                </IconButton>
                            </ListItem>
                        ))}
                    </List>
                </Paper>
            </Grid>

            {/* Audio Responses Section */}
            <Grid item xs={12}>
                <Paper elevation={3} style={{ padding: '20px', height: '600px', display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="h4" style={{ color: '#1976d2', marginBottom: '10px' }}>Audio Responses</Typography>

                    {/* Filters */}
                    <Grid container spacing={2} style={{ marginBottom: '20px' }}>
                        <Grid item xs={4}>
                            <FormControl fullWidth variant="outlined">
                                <InputLabel id="intent-filter-label">Filter by Intent</InputLabel>
                                <Select
                                    labelId="intent-filter-label"
                                    label="Filter by Intent"
                                    value={audioResponseFilters.intent}
                                    onChange={(e) => {
                                        console.log('Selected intent value:', e.target.value);
                                        setAudioResponseFilters({ ...audioResponseFilters, intent: e.target.value });
                                    }}
                                >
                                    <MenuItem value="">All Intents</MenuItem>
                                    {intents.map((intent) => (
                                        <MenuItem key={intent.intent_id} value={intent.intent_id}>
                                            {intent.intent_name} (ID: {intent.intent_id})
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={4}>
                            <FormControl fullWidth variant="outlined">
                                <InputLabel id="actor-filter-label">Filter by Actor</InputLabel>
                                <Select
                                    labelId="actor-filter-label"
                                    label="Filter by Actor"
                                    value={audioResponseFilters.actor}
                                    onChange={(e) => {
                                        console.log('Selected actor value:', e.target.value);
                                        setAudioResponseFilters({ ...audioResponseFilters, actor: e.target.value });
                                    }}
                                >
                                    <MenuItem value="">All Actors</MenuItem>
                                    {actors.map((actor) => (
                                        <MenuItem key={actor.id} value={actor.id}>
                                            {actor.actor_name} (ID: {actor.id})
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={4}>
                            <FormControl fullWidth variant="outlined">
                                <InputLabel id="group-filter-label">Filter by Intent Group</InputLabel>
                                <Select
                                    labelId="group-filter-label"
                                    label="Filter by Intent Group"
                                    value={audioResponseFilters.intentGroup}
                                    onChange={(e) => {
                                        console.log('Selected group value:', e.target.value);
                                        setAudioResponseFilters({ ...audioResponseFilters, intentGroup: e.target.value });
                                    }}
                                >
                                    <MenuItem value="">All Groups</MenuItem>
                                    {intentGroups.map((group) => (
                                        <MenuItem key={group.id} value={group.id}>
                                            {group.intent_group_name} (ID: {group.id})
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                    </Grid>

                    <List style={{ overflowY: 'auto', flexGrow: 1, maxHeight: 'calc(100% - 150px)' }}>
                        {audioResponses
                            .filter(response => {
                                console.log('Filtering response:', {
                                    response_intent: response.intent_id,
                                    filter_intent: audioResponseFilters.intent,
                                    response_actor: response.actor_id,
                                    filter_actor: audioResponseFilters.actor,
                                    response_group: response.intent_group_id,
                                    filter_group: audioResponseFilters.intentGroup
                                });

                                return (
                                    (audioResponseFilters.intent === '' || String(response.intent_id) === String(audioResponseFilters.intent)) &&
                                    (audioResponseFilters.actor === '' || response.actor_id === Number(audioResponseFilters.actor)) &&
                                    (audioResponseFilters.intentGroup === '' || response.intent_group_id === Number(audioResponseFilters.intentGroup))
                                );
                            })
                            .map((response) => (
                                <ListItem key={response.id}>
                                    <Typography style={{ flexGrow: 1 }}>
                                        <span style={{ color: '#757575' }}>ID: {response.id}</span> |
                                        <span style={{ color: '#f44336' }}> Intent: {intents.find(i => i.intent_id === response.intent_id)?.intent_name || 'Unknown'}</span> |
                                        <span style={{ color: '#2196f3' }}> Actor: {actors.find(a => a.id === response.actor_id)?.actor_name || 'Unknown'}</span> |
                                        <span style={{ color: '#4caf50' }}> Group: {intentGroups.find(g => g.id === response.intent_group_id)?.intent_group_name || 'Unknown'}</span>
                                    </Typography>
                                    <Typography style={{ marginRight: '20px', color: '#9c27b0' }}>
                                        {response.transcription}
                                    </Typography>
                                    <IconButton onClick={() => playAudio(response.audio)}>
                                        <PlayArrow />
                                    </IconButton>
                                    <IconButton onClick={() => handleEdit(response, 'audio-responses')}>
                                        <Edit />
                                    </IconButton>
                                    <IconButton onClick={() => handleDelete(response.id, 'audio-responses')}>
                                        <Delete />
                                    </IconButton>
                                </ListItem>
                            ))}
                    </List>
                </Paper>
            </Grid>

            {/* Edit Dialog */}
            <Dialog open={editDialog} onClose={() => setEditDialog(false)}>
                <DialogTitle>Edit {editingType}</DialogTitle>
                <DialogContent>
                    {editingType === 'actors' && (
                        <TextField
                            fullWidth
                            label="Actor Name"
                            value={editingItem?.actor_name || ''}
                            onChange={(e) => setEditingItem({ ...editingItem, actor_name: e.target.value })}
                            margin="normal"
                        />
                    )}
                    {editingType === 'intent-groups' && (
                        <>
                            <TextField
                                fullWidth
                                label="Group Name"
                                value={editingItem?.intent_group_name || ''}
                                onChange={(e) => setEditingItem({ ...editingItem, intent_group_name: e.target.value })}
                                margin="normal"
                            />
                            <TextField
                                fullWidth
                                label="Group Context"
                                value={editingItem?.intent_group_context || ''}
                                onChange={(e) => setEditingItem({ ...editingItem, intent_group_context: e.target.value })}
                                margin="normal"
                                multiline
                                rows={3}
                            />
                        </>
                    )}
                    {editingType === 'context-prompts' && (
                        <TextField
                            fullWidth
                            label="Prompt"
                            value={editingItem?.prompt || ''}
                            onChange={(e) => setEditingItem({ ...editingItem, prompt: e.target.value })}
                            margin="normal"
                            multiline
                            rows={3}
                        />
                    )}
                    {editingType === 'intents' && (
                        <>
                            <TextField
                                fullWidth
                                label="Intent ID"
                                value={editingItem?.intent_id || ''}
                                onChange={(e) => setEditingItem({ ...editingItem, intent_id: e.target.value })}
                                margin="normal"
                            />
                            <TextField
                                fullWidth
                                label="Intent Name"
                                value={editingItem?.intent_name || ''}
                                onChange={(e) => setEditingItem({ ...editingItem, intent_name: e.target.value })}
                                margin="normal"
                            />
                            <TextField
                                fullWidth
                                label="Intent Context"
                                value={editingItem?.intent_context || ''}
                                onChange={(e) => setEditingItem({ ...editingItem, intent_context: e.target.value })}
                                margin="normal"
                                multiline
                                rows={3}
                            />
                        </>
                    )}
                    {editingType === 'audio-responses' && (
                        <>
                            <FormControl fullWidth margin="normal">
                                <InputLabel>Intent</InputLabel>
                                <Select
                                    value={editingItem?.intent_id || ''}
                                    onChange={(e) => setEditingItem({ ...editingItem, intent_id: e.target.value })}
                                >
                                    {intents.map((intent) => (
                                        <MenuItem key={intent.intent_id} value={intent.intent_id}>
                                            {intent.intent_name} ({intent.intent_id})
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormControl fullWidth margin="normal">
                                <InputLabel>Actor</InputLabel>
                                <Select
                                    value={editingItem?.actor_id || ''}
                                    onChange={(e) => setEditingItem({ ...editingItem, actor_id: e.target.value })}
                                >
                                    {actors.map((actor) => (
                                        <MenuItem key={actor.id} value={actor.id}>
                                            {actor.actor_name} ({actor.id})
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormControl fullWidth margin="normal">
                                <InputLabel>Intent Group</InputLabel>
                                <Select
                                    value={editingItem?.intent_group_id || ''}
                                    onChange={(e) => setEditingItem({ ...editingItem, intent_group_id: e.target.value })}
                                >
                                    {intentGroups.map((group) => (
                                        <MenuItem key={group.id} value={group.id}>
                                            {group.intent_group_name} ({group.id})
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <TextField
                                fullWidth
                                label="Transcription"
                                value={editingItem?.transcription || ''}
                                margin="normal"
                                multiline
                                rows={3}
                                InputProps={{
                                    readOnly: true,
                                }}
                            />
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditDialog(false)}>Cancel</Button>
                    <Button onClick={handleEditSave} color="primary">Save</Button>
                </DialogActions>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog
                open={deleteDialog}
                onClose={() => setDeleteDialog(false)}
            >
                <DialogTitle>Confirm Delete</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete this {deleteType.replace(/-/g, ' ').slice(0, -1)}?
                        {deleteType === 'audio-responses' &&
                            ' This will permanently delete the audio response.'}
                        {deleteType === 'actors' &&
                            ' This will affect all audio responses using this actor.'}
                        {deleteType === 'intents' &&
                            ' This will affect all audio responses using this intent.'}
                        {deleteType === 'intent-groups' &&
                            ' This will affect all audio responses in this group.'}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialog(false)}>Cancel</Button>
                    <Button
                        onClick={handleDeleteConfirm}
                        color="error"
                        variant="contained"
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </Grid>
    );
};

export default IntentManagement; 