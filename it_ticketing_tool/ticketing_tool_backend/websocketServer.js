const WebSocket = require('ws');
const admin = require('firebase-admin');

class WebSocketServer {
    constructor(server) {
        this.wss = new WebSocket.Server({ server });
        this.clients = new Map(); // Map to store client connections
        this.setupWebSocket();
    }

    setupWebSocket() {
        this.wss.on('connection', (ws, req) => {
            console.log('New WebSocket connection established');
            
            // Handle client authentication
            ws.on('message', async (message) => {
                try {
                    const data = JSON.parse(message);
                    
                    if (data.type === 'authenticate') {
                        // Verify Firebase token
                        const { token, userId, userRole, clientName } = data;
                        
                        try {
                            // Verify the token (you might want to add more validation)
                            await admin.auth().verifyIdToken(token);
                            
                            // Store client info
                            this.clients.set(ws, {
                                userId,
                                userRole,
                                clientName,
                                connectedAt: Date.now()
                            });
                            
                            // Send authentication success
                            ws.send(JSON.stringify({
                                type: 'authenticated',
                                message: 'Successfully authenticated'
                            }));
                            
                            console.log(`WebSocket client authenticated: ${userId} (${userRole})`);
                        } catch (error) {
                            console.error('WebSocket authentication failed:', error);
                            ws.send(JSON.stringify({
                                type: 'error',
                                message: 'Authentication failed'
                            }));
                            ws.close();
                        }
                    }
                } catch (error) {
                    console.error('Error processing WebSocket message:', error);
                }
            });

            // Handle client disconnect
            ws.on('close', () => {
                const clientInfo = this.clients.get(ws);
                if (clientInfo) {
                    console.log(`WebSocket client disconnected: ${clientInfo.userId}`);
                    this.clients.delete(ws);
                }
            });

            // Handle errors
            ws.on('error', (error) => {
                console.error('WebSocket error:', error);
                this.clients.delete(ws);
            });
        });
    }

    // Broadcast to all connected clients
    broadcast(message) {
        this.wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(message));
            }
        });
    }

    // Broadcast to specific client types (e.g., all site_admins for a specific company)
    broadcastToCompany(message, companyName) {
        this.wss.clients.forEach((client) => {
            const clientInfo = this.clients.get(client);
            if (client && client.readyState === WebSocket.OPEN && 
                clientInfo && clientInfo.clientName === companyName) {
                client.send(JSON.stringify(message));
            }
        });
    }

    // Broadcast to specific user
    broadcastToUser(message, userId) {
        this.wss.clients.forEach((client) => {
            const clientInfo = this.clients.get(client);
            if (client && client.readyState === WebSocket.OPEN && 
                clientInfo && clientInfo.userId === userId) {
                client.send(JSON.stringify(message));
            }
        });
    }

    // Broadcast to users with specific role
    broadcastToRole(message, role) {
        this.wss.clients.forEach((client) => {
            const clientInfo = this.clients.get(client);
            if (client && client.readyState === WebSocket.OPEN && 
                clientInfo && clientInfo.userRole === role) {
                client.send(JSON.stringify(message));
            }
        });
    }

    // Get connection stats
    getStats() {
        return {
            totalConnections: this.wss.clients.size,
            activeConnections: Array.from(this.wss.clients).filter(client => 
                client.readyState === WebSocket.OPEN
            ).length,
            clients: Array.from(this.clients.values())
        };
    }
}

module.exports = WebSocketServer;
