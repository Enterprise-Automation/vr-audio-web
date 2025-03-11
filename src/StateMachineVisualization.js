import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import ReactFlow, {
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    Handle,
    Position,
    MarkerType,
    Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
    Paper,
    Typography,
    Button,
    TextField,
    IconButton,
    Box,
    Card,
    CardContent,
    Collapse,
    Snackbar,
    Alert,
    MenuItem,
    Select,
    InputLabel,
    FormControl,
    Menu,
    ListItemIcon,
    ListItemText,
} from '@mui/material';
import { Delete, Edit, Save, ExpandLess, ExpandMore, Add } from '@mui/icons-material';

// Custom node styles
const nodeStyle = {
    background: '#fff',
    border: '1px solid #1976d2',
    borderRadius: '8px',
    padding: '10px 20px',
    color: '#1976d2',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
};

const selectedNodeStyle = {
    ...nodeStyle,
    border: '2px solid #2196f3',
    boxShadow: '0 0 0 2px rgba(33,150,243,0.3)',
};

// Custom edge styles
const edgeStyle = {
    stroke: '#1976d2',
};

// Custom node component
const CustomNode = ({ data, selected }) => {
    return (
        <div style={selected ? selectedNodeStyle : nodeStyle}>
            <Handle type="target" position={Position.Top} />
            <div>{data.label}</div>
            <Handle type="source" position={Position.Bottom} />
        </div>
    );
};

// Define nodeTypes outside the component to prevent recreation on every render
const nodeTypes = {
    custom: CustomNode,
};

// Example data structure
const initialStateMachine = {
    states: [
        {
            fromState: 1,
            transitions: [
                { action: 4, toState: 2 },
                { action: 5, toState: 3 },
            ],
            position: { x: 100, y: 100 },
        },
        {
            fromState: 2,
            transitions: [
                { action: 6, toState: 3 },
            ],
            position: { x: 300, y: 200 },
        },
        {
            fromState: 3,
            transitions: [
                { action: 7, toState: 1 },
            ],
            position: { x: 500, y: 100 },
        },
    ],
};

// Convert state machine data to React Flow nodes and edges
const convertToNodesAndEdges = (stateMachine, existingNodes = []) => {
    const nodes = [];
    const edges = [];
    const addedStates = new Set();

    // Create a map of existing node positions
    const nodePositions = {};
    existingNodes.forEach(node => {
        nodePositions[node.id] = node.position;
    });

    stateMachine.states.forEach((state) => {
        // Add fromState node if not already added
        if (!addedStates.has(state.fromState)) {
            const nodeId = state.fromState.toString();

            // Use existing position from state, from existing nodes, or random position as fallback
            const position = state.position ||
                nodePositions[nodeId] ||
                { x: Math.random() * 500, y: Math.random() * 300 };

            nodes.push({
                id: nodeId,
                data: { label: `State ${state.fromState}` },
                position: position,
                type: 'custom',
            });
            addedStates.add(state.fromState);
        }

        // Add transitions and destination states
        state.transitions.forEach((transition) => {
            if (!addedStates.has(transition.toState)) {
                const nodeId = transition.toState.toString();

                // Try to find existing position for this node
                const position = nodePositions[nodeId] ||
                    { x: Math.random() * 500, y: Math.random() * 300 };

                nodes.push({
                    id: nodeId,
                    data: { label: `State ${transition.toState}` },
                    position: position,
                    type: 'custom',
                });
                addedStates.add(transition.toState);
            }

            // Check if there's a reverse transition
            const hasBidirectional = stateMachine.states.some(s =>
                s.fromState === transition.toState &&
                s.transitions.some(t => t.toState === state.fromState)
            );

            edges.push({
                id: `${state.fromState}-${transition.action}-${transition.toState}`,
                source: state.fromState.toString(),
                target: transition.toState.toString(),
                label: `Action ${transition.action}`,
                type: 'smoothstep',
                style: edgeStyle,
                animated: true,
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                },
                // If bidirectional, add a curve
                ...(hasBidirectional ? {
                    type: 'default',
                    curvature: 0.25,
                } : {})
            });
        });
    });

    return { nodes, edges };
};

const StateMachineVisualization = () => {
    const [stateMachine, setStateMachine] = useState(initialStateMachine);
    const [selectedState, setSelectedState] = useState(null);
    const [selectedEdge, setSelectedEdge] = useState(null);
    const [propertiesPanelOpen, setPropertiesPanelOpen] = useState(true);
    const [nextStateId, setNextStateId] = useState(100); // High starting number to avoid conflicts
    const [message, setMessage] = useState('');
    const [showMessage, setShowMessage] = useState(false);

    // Context menu state
    const [contextMenu, setContextMenu] = useState(null);
    const [flowPosition, setFlowPosition] = useState({ x: 0, y: 0 });

    // For new transition config
    const [newTransition, setNewTransition] = useState({
        action: '',
        toState: '',
    });

    // Use a ref to track the flow container for proper sizing
    const reactFlowWrapper = useRef(null);
    const reactFlowInstance = useRef(null);

    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    // Initialize the flow only once when the component mounts 
    useEffect(() => {
        const { nodes: flowNodes, edges: flowEdges } = convertToNodesAndEdges(stateMachine);
        setNodes(flowNodes);
        setEdges(flowEdges);

        // Find the highest state ID to set nextStateId
        const highestId = stateMachine.states.reduce((max, state) => {
            return Math.max(max, state.fromState);
        }, 0);
        setNextStateId(highestId + 1);
    }, []);  // Empty dependency array means this only runs once on mount

    // Handle updates to stateMachine separately
    useEffect(() => {
        if (stateMachine && nodes.length > 0) {
            // Pass the current nodes to preserve positions when possible
            const { nodes: flowNodes, edges: flowEdges } = convertToNodesAndEdges(stateMachine, nodes);
            setNodes(flowNodes);
            setEdges(flowEdges);
        }
    }, [stateMachine, nodes.length]);  // Only depend on stateMachine changes

    const onConnect = useCallback((params) => {
        // When a connection is made, find the source and target states
        const sourceId = parseInt(params.source);
        const targetId = parseInt(params.target);

        // Create a new transition
        const newAction = Math.floor(Math.random() * 100) + 1; // Generate a random action ID

        // Look up source state
        const sourceStateIdx = stateMachine.states.findIndex(state => state.fromState === sourceId);

        if (sourceStateIdx !== -1) {
            // Update existing state
            const updatedStates = [...stateMachine.states];

            // Add new transition to the source state
            updatedStates[sourceStateIdx] = {
                ...updatedStates[sourceStateIdx],
                transitions: [
                    ...updatedStates[sourceStateIdx].transitions,
                    { action: newAction, toState: targetId }
                ]
            };

            // Update state machine
            setStateMachine({
                ...stateMachine,
                states: updatedStates
            });

            // Select the source state to edit the new transition
            setSelectedState(updatedStates[sourceStateIdx]);

            // Message about new transition
            setMessage("New connection created. Edit action ID in the properties panel.");
            setShowMessage(true);
        }

        // Let ReactFlow add the edge visually
        setEdges((eds) => addEdge({
            ...params,
            id: `${sourceId}-${newAction}-${targetId}`,
            type: 'smoothstep',
            animated: true,
            style: edgeStyle,
            label: `Action ${newAction}`,
            markerEnd: {
                type: MarkerType.ArrowClosed,
            },
        }, eds));
    }, [stateMachine, setEdges]);

    const handleNodeDragStop = (event, node) => {
        // Update the state machine with new node positions
        const updatedStates = [...stateMachine.states];

        // Find the state that matches this node ID
        let stateIndex = updatedStates.findIndex(
            state => state.fromState.toString() === node.id
        );

        if (stateIndex !== -1) {
            // Update the position for the state
            updatedStates[stateIndex] = {
                ...updatedStates[stateIndex],
                position: node.position
            };
        } else {
            // If we can't find it in states (it might be a target node only), 
            // create a new state entry for it to save its position
            const nodeStateId = parseInt(node.id);

            // Check if this node exists only as a target in transitions
            const isTargetOnly = stateMachine.states.some(state =>
                state.transitions.some(t => t.toState === nodeStateId)
            );

            if (isTargetOnly) {
                updatedStates.push({
                    fromState: nodeStateId,
                    transitions: [],
                    position: node.position
                });
            }
        }

        setStateMachine({
            ...stateMachine,
            states: updatedStates
        });
    };

    const onEdgeClick = (event, edge) => {
        const [sourceId, actionId, targetId] = edge.id.split('-');

        const sourceState = stateMachine.states.find(
            state => state.fromState.toString() === sourceId
        );

        if (sourceState) {
            const transition = sourceState.transitions.find(
                t => t.action.toString() === actionId && t.toState.toString() === targetId
            );

            if (transition) {
                setSelectedState(sourceState);
                setSelectedEdge({
                    sourceId: parseInt(sourceId),
                    actionId: parseInt(actionId),
                    targetId: parseInt(targetId)
                });
            }
        }
    };

    const onNodeClick = (event, node) => {
        const foundState = stateMachine.states.find(
            state => state.fromState.toString() === node.id
        );

        setSelectedState(foundState);
        setSelectedEdge(null);
    };

    // Handle context menu (right-click)
    const onPaneContextMenu = (event) => {
        // Prevent default context menu
        event.preventDefault();

        if (reactFlowInstance.current) {
            // Convert screen coordinates to flow coordinates
            const position = reactFlowInstance.current.screenToFlowPosition({
                x: event.clientX,
                y: event.clientY
            });

            // Save the flow position for when we create a node
            setFlowPosition(position);

            // Open context menu at the mouse position
            setContextMenu(
                contextMenu === null
                    ? { mouseX: event.clientX, mouseY: event.clientY }
                    : null,
            );
        }
    };

    const closeContextMenu = () => {
        setContextMenu(null);
    };

    const handleAddState = () => {
        // Create a new state with no transitions at the right-click position
        const newState = {
            fromState: nextStateId,
            transitions: [],
            position: flowPosition,
        };

        // Update state machine
        setStateMachine({
            ...stateMachine,
            states: [...stateMachine.states, newState]
        });

        // Increment nextStateId
        setNextStateId(prev => prev + 1);

        // Select the new state
        setSelectedState(newState);

        // Show message
        setMessage("New state created");
        setShowMessage(true);

        // Close the context menu
        closeContextMenu();
    };

    const handleAddTransition = () => {
        if (!selectedState || !newTransition.action || !newTransition.toState) {
            setMessage("Please fill in both action and target state");
            setShowMessage(true);
            return;
        }

        const action = parseInt(newTransition.action);
        const toState = parseInt(newTransition.toState);

        // Check if this action already exists in transitions
        const existingActionIndex = selectedState.transitions.findIndex(t => t.action === action);

        const updatedStates = stateMachine.states.map(state => {
            if (state.fromState === selectedState.fromState) {
                let updatedTransitions;

                if (existingActionIndex >= 0) {
                    // Update existing transition
                    updatedTransitions = [...state.transitions];
                    updatedTransitions[existingActionIndex] = { action, toState };
                } else {
                    // Add new transition
                    updatedTransitions = [...state.transitions, { action, toState }];
                }

                return {
                    ...state,
                    transitions: updatedTransitions
                };
            }
            return state;
        });

        setStateMachine({
            ...stateMachine,
            states: updatedStates
        });

        // Reset the form
        setNewTransition({ action: '', toState: '' });

        // Update selected state reference
        const updatedSelectedState = updatedStates.find(s => s.fromState === selectedState.fromState);
        setSelectedState(updatedSelectedState);

        setMessage("Transition saved");
        setShowMessage(true);
    };

    const handleDeleteTransition = (actionId) => {
        if (!selectedState) return;

        const updatedStates = stateMachine.states.map(state => {
            if (state.fromState === selectedState.fromState) {
                return {
                    ...state,
                    transitions: state.transitions.filter(t => t.action !== actionId)
                };
            }
            return state;
        });

        setStateMachine({
            ...stateMachine,
            states: updatedStates
        });

        // Update selected state reference
        const updatedSelectedState = updatedStates.find(s => s.fromState === selectedState.fromState);
        setSelectedState(updatedSelectedState);

        setMessage("Transition deleted");
        setShowMessage(true);
    };

    const handleDeleteState = (stateId) => {
        const updatedStates = stateMachine.states.filter(
            state => state.fromState !== stateId
        );

        setStateMachine({
            ...stateMachine,
            states: updatedStates
        });

        setSelectedState(null);
        setSelectedEdge(null);

        setMessage("State deleted");
        setShowMessage(true);
    };

    // Generate list of available states for dropdown
    const availableStates = useMemo(() => {
        return stateMachine.states.map(state => ({
            id: state.fromState,
            label: `State ${state.fromState}`
        }));
    }, [stateMachine.states]);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: 'calc(100vh - 130px)',
            position: 'relative'
        }}>
            <Paper elevation={3} style={{ padding: '20px', marginBottom: '20px', flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6">State Machine Visualization</Typography>
                    <Box>
                        <Button
                            variant="outlined"
                            color="primary"
                            startIcon={<Save />}
                            onClick={() => {
                                console.log(JSON.stringify(stateMachine));
                                setMessage("State machine exported to console");
                                setShowMessage(true);
                            }}
                        >
                            Export
                        </Button>
                    </Box>
                </div>
                <Typography variant="body2" color="textSecondary" style={{ marginTop: 8 }}>
                    Right-click on canvas to add a state. Drag from handles to create connections.
                </Typography>
            </Paper>

            {/* Floating Properties Panel */}
            <Card
                elevation={4}
                style={{
                    position: 'absolute',
                    top: '80px',
                    right: '20px',
                    width: '300px',
                    zIndex: 10,
                    maxHeight: 'calc(100vh - 200px)',
                    overflow: 'auto'
                }}
            >
                <CardContent style={{ paddingBottom: '8px' }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="h6">Properties</Typography>
                        <IconButton
                            size="small"
                            onClick={() => setPropertiesPanelOpen(!propertiesPanelOpen)}
                        >
                            {propertiesPanelOpen ? <ExpandLess /> : <ExpandMore />}
                        </IconButton>
                    </Box>

                    <Collapse in={propertiesPanelOpen}>
                        {selectedState ? (
                            <Box mt={2}>
                                <Typography variant="subtitle1">
                                    State {selectedState.fromState}
                                    <IconButton
                                        size="small"
                                        color="error"
                                        onClick={() => handleDeleteState(selectedState.fromState)}
                                        style={{ marginLeft: '8px' }}
                                    >
                                        <Delete fontSize="small" />
                                    </IconButton>
                                </Typography>

                                {/* Existing Transitions */}
                                <Box mt={2}>
                                    <Typography variant="subtitle2">Transitions:</Typography>
                                    {selectedState.transitions && selectedState.transitions.length > 0 ? (
                                        selectedState.transitions.map((transition, index) => (
                                            <Box key={index} mt={1} display="flex" alignItems="center">
                                                <Typography variant="body2" style={{ flexGrow: 1 }}>
                                                    Action {transition.action} → State {transition.toState}
                                                </Typography>
                                                <IconButton size="small" onClick={() => handleDeleteTransition(transition.action)}>
                                                    <Delete fontSize="small" />
                                                </IconButton>
                                            </Box>
                                        ))
                                    ) : (
                                        <Typography variant="body2" style={{ color: '#666', marginTop: '8px' }}>
                                            No transitions defined
                                        </Typography>
                                    )}
                                </Box>

                                {/* Add/Edit Transition Form */}
                                <Box mt={2} p={2} border="1px solid #e0e0e0" borderRadius={1}>
                                    <Typography variant="subtitle2" gutterBottom>
                                        Add Transition
                                    </Typography>

                                    <TextField
                                        label="Action ID"
                                        type="number"
                                        value={newTransition.action}
                                        onChange={(e) => setNewTransition({ ...newTransition, action: e.target.value })}
                                        fullWidth
                                        size="small"
                                        margin="dense"
                                    />

                                    <FormControl fullWidth size="small" margin="dense">
                                        <InputLabel>Target State</InputLabel>
                                        <Select
                                            value={newTransition.toState}
                                            onChange={(e) => setNewTransition({ ...newTransition, toState: e.target.value })}
                                        >
                                            {availableStates
                                                .filter(state => state.id !== selectedState.fromState)
                                                .map(state => (
                                                    <MenuItem key={state.id} value={state.id}>
                                                        {state.label}
                                                    </MenuItem>
                                                ))
                                            }
                                        </Select>
                                    </FormControl>

                                    <Button
                                        variant="contained"
                                        color="primary"
                                        size="small"
                                        onClick={handleAddTransition}
                                        fullWidth
                                        style={{ marginTop: '10px' }}
                                    >
                                        Save Transition
                                    </Button>
                                </Box>
                            </Box>
                        ) : selectedEdge ? (
                            <Box mt={2}>
                                <Typography variant="subtitle1">
                                    Transition Properties
                                </Typography>
                                <Typography variant="body2" gutterBottom>
                                    From State {selectedEdge.sourceId} to State {selectedEdge.targetId}
                                </Typography>
                                <Typography variant="body2" gutterBottom>
                                    Action ID: {selectedEdge.actionId}
                                </Typography>
                                <Button
                                    variant="outlined"
                                    color="error"
                                    size="small"
                                    onClick={() => {
                                        handleDeleteTransition(selectedEdge.actionId);
                                        setSelectedEdge(null);
                                    }}
                                    style={{ marginTop: '10px' }}
                                >
                                    Delete Transition
                                </Button>
                            </Box>
                        ) : (
                            <Typography variant="body2" style={{ marginTop: '10px', color: '#666' }}>
                                Select a state or connection to view and edit its properties
                            </Typography>
                        )}
                    </Collapse>
                </CardContent>
            </Card>

            <div
                ref={reactFlowWrapper}
                style={{
                    flexGrow: 1,
                    width: '100%',
                    border: '1px solid #ccc',
                    position: 'relative'
                }}
            >
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onNodeDragStop={handleNodeDragStop}
                    onNodeClick={onNodeClick}
                    onEdgeClick={onEdgeClick}
                    onPaneContextMenu={onPaneContextMenu}
                    onInit={(instance) => {
                        reactFlowInstance.current = instance;
                    }}
                    nodeTypes={nodeTypes}
                    fitView
                    connectOnClick={false}
                >
                    <Controls />
                    <MiniMap />
                    <Background variant="dots" gap={12} size={1} />

                    <Panel position="bottom-center">
                        <Paper elevation={2} style={{ padding: '8px 12px', backgroundColor: '#fff', opacity: 0.9 }}>
                            <Typography variant="body2">
                                Right-click to create a state • Drag between states to connect them
                            </Typography>
                        </Paper>
                    </Panel>
                </ReactFlow>
            </div>

            {/* Context Menu */}
            <Menu
                open={contextMenu !== null}
                onClose={closeContextMenu}
                anchorReference="anchorPosition"
                anchorPosition={
                    contextMenu !== null
                        ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
                        : undefined
                }
            >
                <MenuItem onClick={handleAddState}>
                    <ListItemIcon>
                        <Add fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Add State</ListItemText>
                </MenuItem>
            </Menu>

            <Snackbar
                open={showMessage}
                autoHideDuration={3000}
                onClose={() => setShowMessage(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            >
                <Alert
                    onClose={() => setShowMessage(false)}
                    severity="info"
                    variant="filled"
                >
                    {message}
                </Alert>
            </Snackbar>
        </div>
    );
};

export default StateMachineVisualization; 