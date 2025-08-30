const WebSocket = require('ws');
const admin = require('firebase-admin');

class WebSocketServer {
    constructor(server) {
        this.wss = new WebSocket.Server({ server });
        this.clients = new Map(); // Map to store client connections
        this.analyticsSubscriptions = new Map(); // Map to store analytics subscriptions
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
                    } else if (data.type === 'subscribe_analytics') {
                        // Handle analytics subscription
                        this.handleAnalyticsSubscription(ws, data);
                    } else if (data.type === 'unsubscribe_analytics') {
                        // Handle analytics unsubscription
                        this.handleAnalyticsUnsubscription(ws, data);
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
                    // Clean up analytics subscriptions
                    this.cleanupClientSubscriptions(ws);
                    this.clients.delete(ws);
                }
            });

            // Handle errors
            ws.on('error', (error) => {
                console.error('WebSocket error:', error);
                this.cleanupClientSubscriptions(ws);
                this.clients.delete(ws);
            });
        });
    }

    handleAnalyticsSubscription(ws, data) {
        const clientInfo = this.clients.get(ws);
        if (!clientInfo) {
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Client not authenticated'
            }));
            return;
        }

        const { filters, subscriptionId } = data;
        const subscriptionKey = `${clientInfo.userId}_${subscriptionId}`;
        
        // Store subscription
        this.analyticsSubscriptions.set(subscriptionKey, {
            ws,
            filters,
            clientInfo,
            lastUpdate: Date.now()
        });

        console.log(`Analytics subscription created: ${subscriptionKey}`);
        
        ws.send(JSON.stringify({
            type: 'analytics_subscribed',
            subscriptionId,
            message: 'Successfully subscribed to analytics updates'
        }));
    }

    handleAnalyticsUnsubscription(ws, data) {
        const clientInfo = this.clients.get(ws);
        if (!clientInfo) return;

        const { subscriptionId } = data;
        const subscriptionKey = `${clientInfo.userId}_${subscriptionId}`;
        
        if (this.analyticsSubscriptions.has(subscriptionKey)) {
            this.analyticsSubscriptions.delete(subscriptionKey);
            console.log(`Analytics subscription removed: ${subscriptionKey}`);
        }
    }

    cleanupClientSubscriptions(ws) {
        // Remove all subscriptions for this client
        for (const [key, subscription] of this.analyticsSubscriptions.entries()) {
            if (subscription.ws === ws) {
                this.analyticsSubscriptions.delete(key);
                console.log(`Cleaned up analytics subscription: ${key}`);
            }
        }
    }

    // Broadcast analytics updates to subscribed clients
    broadcastAnalyticsUpdate(updateData) {
        const { type, data, filters } = updateData;
        
        for (const [key, subscription] of this.analyticsSubscriptions.entries()) {
            try {
                // Check if this subscription should receive this update
                if (this.shouldSendUpdate(subscription.filters, filters)) {
                    subscription.ws.send(JSON.stringify({
                        type: 'analytics_update',
                        data: data,
                        filters: filters,
                        timestamp: Date.now()
                    }));
                    
                    // Update last update time
                    subscription.lastUpdate = Date.now();
                }
            } catch (error) {
                console.error(`Error sending analytics update to ${key}:`, error);
                // Remove broken subscription
                this.analyticsSubscriptions.delete(key);
            }
        }
    }

    shouldSendUpdate(subscriptionFilters, updateFilters) {
        // Simple filter matching - can be enhanced based on your needs
        if (!subscriptionFilters || !updateFilters) return true;
        
        // Check if the update matches the subscription filters
        for (const [key, value] of Object.entries(subscriptionFilters)) {
            if (value !== 'all' && updateFilters[key] !== value) {
                return false;
            }
        }
        return true;
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

    // Get analytics subscription stats
    getAnalyticsStats() {
        return {
            totalSubscriptions: this.analyticsSubscriptions.size,
            subscriptions: Array.from(this.analyticsSubscriptions.entries()).map(([key, sub]) => ({
                key,
                userId: sub.clientInfo.userId,
                userRole: sub.clientInfo.userRole,
                filters: sub.filters,
                lastUpdate: sub.lastUpdate
            }))
        };
    }
}

module.exports = WebSocketServer;
