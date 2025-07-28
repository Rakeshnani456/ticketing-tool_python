// src/index.js (or similar root file, where your React app is mounted)
import React from 'react';
import ReactDOM from 'react-dom/client'; // For React 18
import './index.css'; // Your global CSS
import App from './App';
import { BrowserRouter } from 'react-router-dom'; // Make sure this import is here
import 'animate.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter> {/* THIS IS THE ONLY PLACE BrowserRouter SHOULD BE */}
      <App />
    </BrowserRouter>
  </React.StrictMode>
);