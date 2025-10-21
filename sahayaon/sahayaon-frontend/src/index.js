// src/index.js (or similar root file, where your React app is mounted)
import React from 'react';
import ReactDOM from 'react-dom/client'; // For React 18
import './index.css'; // Your global CSS
import './ticket-detail-fonts.css'; // Ticket detail font size adjustments
import App from './App';
import { BrowserRouter } from 'react-router-dom'; // Make sure this import is here
import { ThemeProvider } from './contexts/ThemeContext'; // Import ThemeProvider
import { ThemeProvider as MuiThemeProvider, createTheme, CssBaseline } from '@mui/material'; // Import Material-UI ThemeProvider and CssBaseline
import { StyledEngineProvider } from '@mui/material/styles'; // Add StyledEngineProvider
import 'animate.css';

// Create a comprehensive Material-UI theme
const muiTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  components: {
    MuiMenu: {
      styleOverrides: {
        paper: {
          boxShadow: '0px 4px 6px -1px rgba(0, 0, 0, 0.1), 0px 2px 4px -1px rgba(0, 0, 0, 0.06)',
        },
      },
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <BrowserRouter> {/* THIS IS THE ONLY PLACE BrowserRouter SHOULD BE */}
    <ThemeProvider>
      <StyledEngineProvider injectFirst>
        <MuiThemeProvider theme={muiTheme}>
          <CssBaseline />
          <App />
        </MuiThemeProvider>
      </StyledEngineProvider>
    </ThemeProvider>
  </BrowserRouter>
);