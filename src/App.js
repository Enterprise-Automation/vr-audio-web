import React from 'react';
import { BrowserRouter as Router, Route, Routes, useNavigate } from 'react-router-dom';
import AudioInterface from './AudioInterface';
import PhraseRecognition from './PhraseRecognition';
import VoiceActivationPage from './VoiceActivationPage';
import IntentManagement from './IntentManagement';
import StateMachineVisualization from './StateMachineVisualization';
import ReportPage from './ReportPage';
import { AppBar, Toolbar, Typography, Drawer, List, ListItem, ListItemText, CssBaseline, Box, IconButton, Menu, MenuItem, TextField, Switch, FormControlLabel } from '@mui/material';
import { Download, Upload, Brightness4, Brightness7 } from '@mui/icons-material';
import { openDatabase, exportDB, clearDB, importData } from './utils/indexedDB';
import { DomainProvider, useDomain } from './contexts/DomainContext';
import ThemeProvider, { useTheme } from './contexts/ThemeContext';
import ExampleApp from './WebRTC/ExampleApp';
import MultiStreamApp from './WebRTC/MultiStreamApp';
function App() {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [version, setVersion] = React.useState('1.0');
  const { domain, setDomain } = useDomain();
  const { darkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleVersionChange = (event) => {
    setVersion(event.target.value);
  };

  const downloadDB = async () => {
    const db = await openDatabase();

    const data = await exportDB(db);
    const json = JSON.stringify(data);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'indexedDB_export.json';
    link.click();
  };

  const importDB = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (event) => {
      const file = event.target.files[0];
      const json = await file.text();
      const data = JSON.parse(json);
      const db = await openDatabase();
      await clearDB(db);
      await importData(db, data);
      alert('Database import successful');
    };
    input.click();
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="h6" noWrap component="div">
            Admin Dashboard
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <TextField
              size="small"
              label="Domain"
              variant="outlined"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              sx={{
                backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'white',
                borderRadius: 1,
                width: '200px',
                '& .MuiOutlinedInput-root': {
                  height: '40px'
                }
              }}
            />
            <IconButton color="inherit" onClick={toggleTheme}>
              {darkMode ? <Brightness7 /> : <Brightness4 />}
            </IconButton>
            <IconButton color="inherit" onClick={downloadDB}>
              <Download />
            </IconButton>
            <IconButton color="inherit" onClick={importDB}>
              <Upload />
            </IconButton>
            <IconButton color="inherit" onClick={handleMenuClick}>
              <Typography variant="body1">Version: {version}</Typography>
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>
      <Drawer
        variant="permanent"
        sx={{
          width: 240,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: 240, boxSizing: 'border-box' },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto' }}>
          <List>
            <ListItem button component="a" onClick={() => {
              navigate('/');
            }}>
              <ListItemText primary="Audio Interface" />
            </ListItem>
            <ListItem button component="a" onClick={() => {
              navigate('/phrase-recognition');
            }}>
              <ListItemText primary="Intent Recognition" />
            </ListItem>
            <ListItem button component="a" onClick={() => {
              navigate('/voice-activation');
            }}>
              <ListItemText primary="Voice Activation" />
            </ListItem>
            <ListItem button component="a" onClick={() => {
              navigate('/intent-management');
            }}>
              <ListItemText primary="Intent Management" />
            </ListItem>
            <ListItem button component="a" onClick={() => {
              navigate('/state-machine');
            }}>
              <ListItemText primary="State Machine" />
            </ListItem>
            <ListItem button component="a" onClick={() => {
              navigate('/reports');
            }}>
              <ListItemText primary="Session Reports" />
            </ListItem>
            <ListItem button component="a" onClick={() => {
              navigate('/webrtc');
            }}>
              <ListItemText primary="WebRTC" />
            </ListItem>
            <ListItem button component="a" onClick={() => {
              navigate('/webrtc-multi');
            }}>
              <ListItemText primary="WebRTC Multi" />
            </ListItem>
          </List>
        </Box>
      </Drawer>
      <Box
        component="main"
        sx={{ flexGrow: 1, p: 3 }}
      >
        <Toolbar />
        <Routes>
          <Route exact path="/" element={<AudioInterface />} />
          <Route path="/phrase-recognition" element={<PhraseRecognition />} />
          <Route path="/voice-activation" element={<VoiceActivationPage />} />
          <Route path="/intent-management" element={<IntentManagement />} />
          <Route path="/state-machine" element={<StateMachineVisualization />} />
          <Route path="/reports" element={<ReportPage />} />
          <Route path="/webrtc" element={<ExampleApp />} />
          <Route path="/webrtc-multi" element={<MultiStreamApp />} />
        </Routes>
      </Box>
    </Box>
  );
}

// Create a wrapper component that provides the Router context
function AppWrapper() {
  return (
    <Router>
      <DomainProvider>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </DomainProvider>
    </Router>
  );
}

export default AppWrapper; 