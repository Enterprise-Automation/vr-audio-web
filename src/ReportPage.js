import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    Grid,
    Card,
    CardContent,
    CardMedia,
    Divider,
    Chip,
    Button,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Tooltip,
    FormControlLabel,
    Checkbox
} from '@mui/material';
import {
    Timeline,
    TimelineItem,
    TimelineSeparator,
    TimelineConnector,
    TimelineContent,
    TimelineDot,
    TimelineOppositeContent
} from '@mui/lab';
import {
    PlayArrow,
    AccessTime,
    Person,
    Category,
    Description,
    CalendarToday,
    CheckCircle,
    PlayCircleOutline,
    Comment,
    ThumbUp,
    ThumbDown,
    Save,
    Cancel
} from '@mui/icons-material';
import { useDomain } from './contexts/DomainContext';

// Sample stub data for sessions
const sampleSessionData = [
    {
        id: 1,
        name: "Wanted on Warrant",
        date: "2023-07-15",
        startTime: "11:30 AM",
        endTime: "11:45 AM",
        duration: "0h 15m",
        completionRate: 92,
        status: "In Progress",
        actor: "Dave Williamson",
        thumbnailUrl: "/images/scr1.png", // Placeholder URL
        intents: [
            { id: 1, timestamp: "10:32 AM", name: "Request Status Update", response: "All units responding to location" },
            { id: 2, timestamp: "10:38 AM", name: "Request Backup", response: "Additional units dispatched to your location" },
            { id: 3, timestamp: "10:45 AM", name: "Medical Assistance", response: "Medical team is on the way" },
            { id: 4, timestamp: "10:52 AM", name: "Situation Report", response: "Understood, continue monitoring" },
            { id: 5, timestamp: "11:10 AM", name: "All Clear Signal", response: "Copy that, all clear received" },
            { id: 6, timestamp: "11:25 AM", name: "Request Extraction", response: "Extraction team arriving in 5 minutes" },
            { id: 7, timestamp: "10:32 AM", name: "Request Status Update", response: "All units responding to location" },
            { id: 8, timestamp: "10:38 AM", name: "Request Backup", response: "Additional units dispatched to your location" },
            { id: 9, timestamp: "10:45 AM", name: "Medical Assistance", response: "Medical team is on the way" },
            { id: 10, timestamp: "10:52 AM", name: "Situation Report", response: "Understood, continue monitoring" },
            { id: 11, timestamp: "11:10 AM", name: "All Clear Signal", response: "Copy that, all clear received" },
            { id: 12, timestamp: "11:25 AM", name: "Request Extraction", response: "Extraction team arriving in 5 minutes" }
        ]
    },
    {
        id: 2,
        name: "Customer Service Training",
        date: "2023-07-18",
        startTime: "2:00 PM",
        endTime: "3:15 PM",
        duration: "0h 15m",
        completionRate: 87,
        status: "Completed",
        actor: "Support Agent",
        thumbnailUrl: "/images/scr2.png", // Placeholder URL
        intents: [
            { id: 1, timestamp: "2:05 PM", name: "Greeting Customer", response: "Welcome to our support center" },
            { id: 2, timestamp: "2:12 PM", name: "Problem Identification", response: "I understand your issue with the product" },
            { id: 3, timestamp: "2:25 PM", name: "Troubleshooting Steps", response: "Let's try these steps to resolve your issue" },
            { id: 4, timestamp: "2:40 PM", name: "Escalation Request", response: "I'll connect you with our specialist team" },
            { id: 5, timestamp: "2:55 PM", name: "Resolution Confirmation", response: "Glad we could resolve your issue today" },
            { id: 6, timestamp: "3:10 PM", name: "Farewell", response: "Thank you for contacting us" }
        ]
    },
    {
        id: 3,
        name: "Medical Training Simulation",
        date: "2023-07-20",
        startTime: "9:00 AM",
        endTime: "10:30 AM",
        duration: "1h 30m",
        completionRate: 95,
        actor: "Medical Practitioner",
        thumbnailUrl: "/images/scr3.png", // Placeholder URL
        intents: [
            { id: 1, timestamp: "9:05 AM", name: "Patient Assessment", response: "I'll need to check your vital signs" },
            { id: 2, timestamp: "9:15 AM", name: "Symptom Inquiry", response: "Can you describe your symptoms?" },
            { id: 3, timestamp: "9:30 AM", name: "Diagnosis Discussion", response: "Based on your symptoms, it appears to be..." },
            { id: 4, timestamp: "9:45 AM", name: "Treatment Options", response: "We have several treatment options to consider" },
            { id: 5, timestamp: "10:00 AM", name: "Medication Information", response: "This medication should be taken twice daily" },
            { id: 6, timestamp: "10:15 AM", name: "Follow-up Planning", response: "Let's schedule a follow-up in two weeks" }
        ]
    }
];

// Update the intents in the sampleSessionData to include approval and comment fields
sampleSessionData.forEach(session => {
    session.intents = session.intents.map(intent => ({
        ...intent,
        approved: intent.approved !== undefined ? intent.approved : null, // Can be true, false, or null (pending)
        comments: intent.comments || '',
        commentEditing: false // For edit mode toggle
    }));
});

const ReportPage = () => {
    const { domain } = useDomain();
    const [sessions, setSessions] = useState(sampleSessionData);
    const [selectedSession, setSelectedSession] = useState(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [videoDialogOpen, setVideoDialogOpen] = useState(false);
    const [currentIntent, setCurrentIntent] = useState(null);


    // In a real application, you would fetch data from the server
    useEffect(() => {
        // Simulating data fetching
        // In real implementation, fetch from API:
        // const fetchSessions = async () => {
        //     const response = await fetch(`http://${domain}:8003/sessions/`);
        //     const data = await response.json();
        //     setSessions(data);
        // };
        // fetchSessions();

        // For now, just use the sample data
    }, [domain]);

    const handleSessionClick = (session) => {
        setSelectedSession(session);
        setDialogOpen(true);
    };

    const handleClose = () => {
        setDialogOpen(false);
    };

    const handlePlayVideo = (event, sessionId) => {
        event.stopPropagation();
        // In a real application, this would open a video player
        console.log(`Playing video for session ${sessionId}`);
        setVideoDialogOpen(true);
    };

    const handleVideoDialogClose = () => {
        setVideoDialogOpen(false);
    };

    // Function to handle intent approval
    const handleApproval = (sessionId, intentId, isApproved) => {
        // Create updated sessions with the approval change
        const updatedSessions = sessions.map(session => {
            if (session.id === sessionId) {
                const updatedIntents = session.intents.map(intent => {
                    if (intent.id === intentId) {
                        return { ...intent, approved: isApproved };
                    }
                    return intent;
                });
                return { ...session, intents: updatedIntents };
            }
            return session;
        });

        setSessions(updatedSessions);

        // If this is the selected session, update it too
        if (selectedSession && selectedSession.id === sessionId) {
            const updatedIntents = selectedSession.intents.map(intent => {
                if (intent.id === intentId) {
                    return { ...intent, approved: isApproved };
                }
                return intent;
            });
            setSelectedSession({ ...selectedSession, intents: updatedIntents });
        }

        // In a real app, we would save this to the backend
        console.log(`Intent ${intentId} in session ${sessionId} approved: ${isApproved}`);
    };

    // Function to toggle comment editing
    const toggleCommentEditing = (sessionId, intentId) => {
        // Update sessions with comment editing
        const updatedSessions = sessions.map(session => {
            if (session.id === sessionId) {
                const updatedIntents = session.intents.map(intent => {
                    if (intent.id === intentId) {
                        return { ...intent, commentEditing: !intent.commentEditing };
                    }
                    return { ...intent, commentEditing: false }; // Close any other open editors
                });
                return { ...session, intents: updatedIntents };
            }
            return session;
        });

        setSessions(updatedSessions);

        // If this is the selected session, update it too
        if (selectedSession && selectedSession.id === sessionId) {
            const updatedIntents = selectedSession.intents.map(intent => {
                if (intent.id === intentId) {
                    return { ...intent, commentEditing: !intent.commentEditing };
                }
                return { ...intent, commentEditing: false }; // Close any other open editors
            });
            setSelectedSession({ ...selectedSession, intents: updatedIntents });
        }
    };

    // Function to update a comment
    const updateComment = (sessionId, intentId, comment) => {
        // Create updated sessions with the comment change
        const updatedSessions = sessions.map(session => {
            if (session.id === sessionId) {
                const updatedIntents = session.intents.map(intent => {
                    if (intent.id === intentId) {
                        return {
                            ...intent,
                            comments: comment,
                            commentEditing: false // Close edit mode after saving
                        };
                    }
                    return intent;
                });
                return { ...session, intents: updatedIntents };
            }
            return session;
        });

        setSessions(updatedSessions);

        // If this is the selected session, update it too
        if (selectedSession && selectedSession.id === sessionId) {
            const updatedIntents = selectedSession.intents.map(intent => {
                if (intent.id === intentId) {
                    return {
                        ...intent,
                        comments: comment,
                        commentEditing: false // Close edit mode after saving
                    };
                }
                return intent;
            });
            setSelectedSession({ ...selectedSession, intents: updatedIntents });
        }

        // In a real app, we would save this to the backend
        console.log(`Updated comment for intent ${intentId} in session ${sessionId}: ${comment}`);
    };

    // Function to handle comment change in the textfield
    const handleCommentChange = (event, sessionId, intentId) => {
        const comment = event.target.value;
        // This only updates the UI temporarily while editing
        const updatedSessions = sessions.map(session => {
            if (session.id === sessionId) {
                const updatedIntents = session.intents.map(intent => {
                    if (intent.id === intentId) {
                        return { ...intent, comments: comment };
                    }
                    return intent;
                });
                return { ...session, intents: updatedIntents };
            }
            return session;
        });

        setSessions(updatedSessions);

        // If this is the selected session, update it too
        if (selectedSession && selectedSession.id === sessionId) {
            const updatedIntents = selectedSession.intents.map(intent => {
                if (intent.id === intentId) {
                    return { ...intent, comments: comment };
                }
                return intent;
            });
            setSelectedSession({ ...selectedSession, intents: updatedIntents });
        }
    };

    return (
        <Box sx={{ padding: 3 }}>
            <Typography variant="h4" gutterBottom>
                Session Reports
            </Typography>

            <Grid container spacing={3}>
                {sessions.map((session) => (
                    <Grid item xs={12} sm={6} md={4} key={session.id}>
                        <Card
                            onClick={() => handleSessionClick(session)}
                            sx={{
                                cursor: 'pointer',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                '&:hover': {
                                    transform: 'translateY(-5px)',
                                    boxShadow: 5
                                },
                                ...(session.status === "In Progress" && {
                                    borderLeft: '4px solid',
                                    borderColor: 'warning.main',
                                    boxShadow: (theme) => `0 0 8px ${theme.palette.warning.main}`,
                                    position: 'relative',
                                    '&::before': {
                                        content: '""',
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        height: '100%',
                                        background: (theme) => `linear-gradient(90deg, ${theme.palette.warning.light}20 0%, transparent 50%)`,
                                        pointerEvents: 'none'
                                    }
                                })
                            }}
                        >
                            <Box sx={{ position: 'relative' }}>
                                <CardMedia
                                    component="div"
                                    sx={{
                                        height: 160,
                                        backgroundColor: 'rgba(0, 0, 0, 0.08)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backgroundImage: session.thumbnailUrl
                                            ? `url(${session.thumbnailUrl})`
                                            : 'none',
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                        position: 'relative',
                                        '&::after': session.thumbnailUrl ? {
                                            content: '""',
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '100%',
                                            height: '100%',
                                            backgroundColor: 'rgba(0, 0, 0, 0.3)', // Semi-transparent overlay
                                            zIndex: 1
                                        } : {}
                                    }}
                                >
                                    {/* Show play icon as an overlay for all thumbnails */}
                                    {/* <PlayCircleOutline
                                        sx={{
                                            fontSize: 60,
                                            color: 'rgba(255, 255, 255, 0.9)',
                                            zIndex: 2,
                                            position: 'relative'
                                        }}
                                    /> */}
                                </CardMedia>
                                <IconButton
                                    sx={{
                                        position: 'absolute',
                                        bottom: 8,
                                        right: 8,
                                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                                        '&:hover': {
                                            backgroundColor: 'rgba(0, 0, 0, 0.8)'
                                        },
                                        zIndex: 3
                                    }}
                                    onClick={(e) => handlePlayVideo(e, session.id)}
                                >
                                    <PlayArrow sx={{ color: 'white' }} />
                                </IconButton>
                            </Box>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    {session.name}
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                    <CalendarToday fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                                    <Typography variant="body2" color="text.secondary">
                                        {session.date}
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                    <AccessTime fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                                    <Typography variant="body2" color="text.secondary">
                                        {session.duration}
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <Person fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                                    <Typography variant="body2" color="text.secondary">
                                        {session.actor}
                                    </Typography>
                                </Box>
                                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Chip
                                        icon={<CheckCircle />}
                                        label={`${session.status}`}
                                        color={session.status === "In Progress" ? "primary" : "success"}
                                        size="small"
                                    />
                                    <Typography variant="body2" color="text.secondary">
                                        {session.intents.length} Intents
                                    </Typography>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Session Detail Dialog */}
            {selectedSession && (
                <Dialog
                    open={dialogOpen}
                    onClose={handleClose}
                    maxWidth="md"
                    fullWidth
                >
                    <DialogTitle>
                        <Typography variant="h5">{selectedSession.name}</Typography>
                        <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                            <Chip
                                icon={<CalendarToday fontSize="small" />}
                                label={selectedSession.date}
                                size="small"
                                variant="outlined"
                            />
                            <Chip
                                icon={<AccessTime fontSize="small" />}
                                label={`${selectedSession.startTime} - ${selectedSession.endTime}`}
                                size="small"
                                variant="outlined"
                            />
                            <Chip
                                icon={<Person fontSize="small" />}
                                label={selectedSession.actor}
                                size="small"
                                variant="outlined"
                            />
                        </Box>
                    </DialogTitle>
                    <DialogContent dividers>
                        <Typography variant="h6" gutterBottom>
                            Session Timeline
                        </Typography>

                        <Timeline position="alternate">
                            {selectedSession.intents.map((intent) => (
                                <TimelineItem key={intent.id}>
                                    <TimelineOppositeContent color="text.secondary">
                                        {intent.timestamp}
                                    </TimelineOppositeContent>
                                    <TimelineSeparator>
                                        <TimelineDot
                                            color={
                                                intent.approved === true
                                                    ? "success"
                                                    : intent.approved === false
                                                        ? "error"
                                                        : "primary"
                                            }
                                        />
                                        <TimelineConnector />
                                    </TimelineSeparator>
                                    <TimelineContent>
                                        <Paper
                                            elevation={3}
                                            sx={{
                                                p: 2,
                                                border: intent.approved === true
                                                    ? '1px solid #4caf50'
                                                    : intent.approved === false
                                                        ? '1px solid #f44336'
                                                        : 'none'
                                            }}
                                        >
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <Typography variant="h6" component="span">
                                                    {intent.name}
                                                </Typography>
                                                <Box>
                                                    <Tooltip title="Approve">
                                                        <IconButton
                                                            size="small"
                                                            color={intent.approved === true ? "success" : "default"}
                                                            onClick={() => handleApproval(selectedSession.id, intent.id, true)}
                                                        >
                                                            <ThumbUp />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Disapprove">
                                                        <IconButton
                                                            size="small"
                                                            color={intent.approved === false ? "error" : "default"}
                                                            onClick={() => handleApproval(selectedSession.id, intent.id, false)}
                                                        >
                                                            <ThumbDown />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Box>
                                            </Box>
                                            <Typography sx={{ mb: 2 }}>
                                                {intent.response}
                                            </Typography>

                                            {/* Comments section */}
                                            <Divider sx={{ my: 1 }} />
                                            <Box sx={{ mt: 1 }}>
                                                {intent.commentEditing ? (
                                                    <Box>
                                                        <TextField
                                                            fullWidth
                                                            multiline
                                                            rows={2}
                                                            placeholder="Add your comments here..."
                                                            value={intent.comments}
                                                            onChange={(e) => handleCommentChange(e, selectedSession.id, intent.id)}
                                                            size="small"
                                                            sx={{ mb: 1 }}
                                                        />
                                                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                                                            <Button
                                                                startIcon={<Save />}
                                                                size="small"
                                                                variant="contained"
                                                                color="primary"
                                                                onClick={() => updateComment(selectedSession.id, intent.id, intent.comments)}
                                                            >
                                                                Save
                                                            </Button>
                                                            <Button
                                                                startIcon={<Cancel />}
                                                                size="small"
                                                                variant="outlined"
                                                                onClick={() => toggleCommentEditing(selectedSession.id, intent.id)}
                                                            >
                                                                Cancel
                                                            </Button>
                                                        </Box>
                                                    </Box>
                                                ) : (
                                                    <Box>
                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <Typography variant="subtitle2" color="text.secondary">
                                                                Trainer Comments:
                                                            </Typography>
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => toggleCommentEditing(selectedSession.id, intent.id)}
                                                            >
                                                                <Comment fontSize="small" />
                                                            </IconButton>
                                                        </Box>
                                                        {intent.comments ? (
                                                            <Typography variant="body2" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                                                                "{intent.comments}"
                                                            </Typography>
                                                        ) : (
                                                            <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                                                                No comments yet
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                )}
                                            </Box>
                                        </Paper>
                                    </TimelineContent>
                                </TimelineItem>
                            ))}
                        </Timeline>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleClose}>Close</Button>
                        <Button
                            variant="contained"
                            startIcon={<PlayArrow />}
                            onClick={(e) => handlePlayVideo(e, selectedSession.id)}
                        >
                            Watch Session
                        </Button>
                    </DialogActions>
                </Dialog>
            )}

            {/* Video Player Dialog - In a real app, this would be an actual video player */}
            <Dialog
                open={videoDialogOpen}
                onClose={handleVideoDialogClose}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>Session Footage</DialogTitle>
                <DialogContent>
                    <Box
                        sx={{
                            width: '100%',
                            height: 400,
                            backgroundColor: '#000',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <Typography variant="h5" color="white">
                            Video Player Placeholder
                        </Typography>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleVideoDialogClose}>Close</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ReportPage; 