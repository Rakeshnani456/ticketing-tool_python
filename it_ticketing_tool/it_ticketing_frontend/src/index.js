import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
// You might also have an index.css here if you have global styles not handled by Tailwind
// import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
