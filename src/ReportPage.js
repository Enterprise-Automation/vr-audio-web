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
    DialogActions
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
    PlayCircleOutline
} from '@mui/icons-material';
import { useDomain } from './contexts/DomainContext';

// Sample stub data for sessions


const ReportPage = () => {
    const { domain } = useDomain();
    const [sessions, setSessions] = useState( [
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
            thumbnailUrl: "https://i.imgur.com/XYZ123.jpg", // Placeholder URL
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
            thumbnailUrl: "https://i.imgur.com/ABC456.jpg", // Placeholder URL
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
            thumbnailUrl: "https://i.imgur.com/DEF789.jpg", // Placeholder URL
            intents: [
                { id: 1, timestamp: "9:05 AM", name: "Patient Assessment", response: "I'll need to check your vital signs" },
                { id: 2, timestamp: "9:15 AM", name: "Symptom Inquiry", response: "Can you describe your symptoms?" },
                { id: 3, timestamp: "9:30 AM", name: "Diagnosis Discussion", response: "Based on your symptoms, it appears to be..." },
                { id: 4, timestamp: "9:45 AM", name: "Treatment Options", response: "We have several treatment options to consider" },
                { id: 5, timestamp: "10:00 AM", name: "Medication Information", response: "This medication should be taken twice daily" },
                { id: 6, timestamp: "10:15 AM", name: "Follow-up Planning", response: "Let's schedule a follow-up in two weeks" }
            ]
        }
    ])
    const [selectedSession, setSelectedSession] = useState(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [videoDialogOpen, setVideoDialogOpen] = useState(false);


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
                                        justifyContent: 'center'

                                    }}
                                >
                                    {/* Use a gray background with play icon as placeholder */}
                                    <PlayCircleOutline sx={{ fontSize: 60, color: 'rgba(255, 255, 255, 0.8)' }} />
                                </CardMedia>
                                <IconButton
                                    sx={{
                                        position: 'absolute',
                                        bottom: 8,
                                        right: 8,
                                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                                        '&:hover': {
                                            backgroundColor: 'rgba(0, 0, 0, 0.8)'
                                        }
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
                                        <TimelineDot color="primary" />
                                        <TimelineConnector />
                                    </TimelineSeparator>
                                    <TimelineContent>
                                        <Paper elevation={3} sx={{ p: 2 }}>
                                            <Typography variant="h6" component="span">
                                                {intent.name}
                                            </Typography>
                                            <Typography>
                                                {intent.response}
                                            </Typography>
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