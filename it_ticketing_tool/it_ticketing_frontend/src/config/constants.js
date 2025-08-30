// src/config/constants.js

// --- API Base URL for your Node.js Backend ---
// Make sure this matches your backend server's address
export const API_BASE_URL = 'http://localhost:5000';
//export const API_BASE_URL = 'https://ticketing-tool-python-8bbm.onrender.com';

// --- WebSocket Base URL for real-time connections ---
export const WS_BASE_URL = 'ws://localhost:5000';
//export const WS_BASE_URL = 'wss://ticketing-tool-python-8bbm.onrender.com';

// --- Frontend URL for email links ---
export const FRONTEND_URL = 'https://it-ticketing-tool-dd679.web.app/c';

// --- React AI App URL for Vercel Deployment ---
// This should point to your Vercel-deployed backend
//export const react_ai_app_url = 'https://kriasol-cbf9co0u3-rakeshnani456s-projects.vercel.app';

// --- Colors for Charts ---
// These colors are used in the DashboardComponent for the Pie Chart
export const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00C49F', '#FFBB28', '#FF8042'];

// This file exports global constants that can be used across your application.
// Keeping constants in a separate file helps in centralizing configurations
// and making them easily modifiable without touching component logic.

