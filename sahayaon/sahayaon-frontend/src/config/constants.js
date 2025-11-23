// src/config/constants.js

// --- API Base URL for your Node.js Backend ---
// Make sure this matches your backend server's address
//export const API_BASE_URL = 'http://localhost:5000';
export const API_BASE_URL = 'https://ticketing-tool-python-1.onrender.com';

//export const API_BASE_URL = 'https://ticketing-tool-python-hvdv.onrender.com';
//export const API_BASE_URL = "https://scabrous-arnulfo-nonpoisonously.ngrok-free.dev";
//export const API_BASE_URL = "https://your-ec2-public-ip:5000"; // Replace with your actual EC2 public IP


// --- WebSocket Base URL for real-time connections ---
//export const WS_BASE_URL = 'ws://localhost:5000';
export const WS_BASE_URL = 'wss://ticketing-tool-python-1.onrender.com';

//export const WS_BASE_URL = 'wss://ticketing-tool-python-hvdv.onrender.com';
//export const WS_BASE_URL = "wss://scabrous-arnulfo-nonpoisonously.ngrok-free.dev";
//export const WS_BASE_URL = "wss://your-ec2-public-ip:5000"; // Replace with your actual EC2 public IP

// --- Frontend URL for email links ---
// Update this to match your Firebase Hosting URL for project it-ticketing-tool-dd679
export const FRONTEND_URL = 'https://it-ticketing-tool-dd679.web.app'; // Update if your hosting URL is different

// --- React AI App URL for Vercel Deployment ---
// This should point to your Vercel-deployed backend
//export const react_ai_app_url = 'https://kriasol-cbf9co0u3-rakeshnani456s-projects.vercel.app';

// --- Colors for Charts ---
// These colors are used in the DashboardComponent for the Pie Chart
export const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00C49F', '#FFBB28', '#FF8042'];

// This file exports global constants that can be used across your application.
// Keeping constants in a separate file helps in centralizing configurations
// and making them easily modifiable without touching component logic.

