import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import AudioInterface from './AudioInterface';
import PhraseRecognition from './PhraseRecognition';
import { AppBar, Toolbar, Typography, Drawer, List, ListItem, ListItemText, CssBaseline, Box } from '@mui/material';

function App() {
  return (
    <Box sx={{ display: 'flex' }}>
        <CssBaseline />
        <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
          <Toolbar>
            <Typography variant="h6" noWrap component="div">
              Admin Dashboard
            </Typography>
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
              <ListItem button component="a" href="/">
                <ListItemText primary="Audio Interface" />
              </ListItem>
              <ListItem button component="a" href="/phrase-recognition">
                <ListItemText primary="Intent Recognition" />
              </ListItem>
            </List>
          </Box>
        </Drawer>
        <Box
          component="main"
          sx={{ flexGrow: 1, bgcolor: 'background.default', p: 3 }}
          >
          <Toolbar />
          <Router>
          <Routes>
            <Route exact path="/" element={<AudioInterface />} />
            <Route path="/phrase-recognition" element={<PhraseRecognition />} />
          </Routes>
          </Router>
        </Box>
      </Box>
  );
}

export default App; 