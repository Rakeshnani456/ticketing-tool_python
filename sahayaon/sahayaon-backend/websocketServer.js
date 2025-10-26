const WebSocket = require('ws');
const admin = require('firebase-admin');

class WebSocketServer {
    constructor(server) {
        this.wss = new WebSocket.Server({ server });
        this.clients = new Map(); // Map to store client connections
        this.analyticsSubscriptions = new Map(); // Map to store analytics subscriptions
        this.cache = new Map(); // Map to store cached data
        this.cacheDurations = {
            tickets: 5 * 60 * 1000,        // 5 minutes
            ticket_counts: 2 * 60 * 1000,   // 2 minutes
            dashboard_data: 3 * 60 * 1000,  // 3 minutes
            notifications: 1 * 60 * 1000,   // 1 minute
        };
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
                        
                        console.log('🔐 Received authentication request:', {
                            tokenType: typeof token,
                            tokenLength: token ? token.length : 0,
                            userId,
                            userRole,
                            clientName
                        });
                        
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
                            
                            // Handle specific error types
                            let errorMessage = 'Authentication failed';
                            if (error.code === 'auth/id-token-expired') {
                                errorMessage = 'Token expired. Please refresh your session.';
                            } else if (error.code === 'auth/invalid-token') {
                                errorMessage = 'Invalid token. Please log in again.';
                            } else if (error.code === 'auth/argument-error') {
                                errorMessage = 'Invalid token format.';
                            }
                            
                            ws.send(JSON.stringify({
                                type: 'error',
                                message: errorMessage,
                                code: error.code || 'auth/unknown'
                            }));
                            ws.close();
                        }
                    } else if (data.type === 'subscribe_analytics') {
                        // Handle analytics subscription
                        this.handleAnalyticsSubscription(ws, data);
                    } else if (data.type === 'unsubscribe_analytics') {
                        // Handle analytics unsubscription
                        this.handleAnalyticsUnsubscription(ws, data);
                    } else if (data.type === 'request_data') {
                        // Handle data requests
                        this.handleDataRequest(ws, data);
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

    async handleDataRequest(ws, data) {
        const clientInfo = this.clients.get(ws);
        if (!clientInfo) {
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Client not authenticated'
            }));
            return;
        }

        const { dataType, userId, userRole, clientName, options, subscriptionId } = data;
        
        try {
            let responseData = null;
            
            // Add caching to reduce Firebase reads
            const cacheKey = `${dataType}_${userId}_${userRole}_${clientName || 'default'}`;
            const cachedData = this.getCachedData(cacheKey);
            
            if (cachedData && this.isCacheValid(cachedData, dataType)) {
                console.log(`📦 Using cached data for ${dataType}`);
                responseData = cachedData.data;
            } else {
                console.log(`🔄 Fetching fresh data for ${dataType}`);
                
                switch (dataType) {
                    case 'tickets':
                        responseData = await this.getTicketsData(userId, userRole, clientName, options);
                        break;
                    case 'ticket_counts':
                        responseData = await this.getTicketCountsData(userId, userRole, clientName);
                        break;
                    case 'dashboard_data':
                        responseData = await this.getDashboardData(userId, userRole, clientName, options);
                        break;
                    case 'notifications':
                        responseData = await this.getNotificationsData(userId);
                        break;
                    default:
                        throw new Error(`Unknown data type: ${dataType}`);
                }
                
                // Cache the data
                this.setCachedData(cacheKey, responseData, dataType);
            }

            ws.send(JSON.stringify({
                type: 'data_response',
                dataType,
                data: responseData,
                subscriptionId
            }));

        } catch (error) {
            console.error(`Error fetching ${dataType} data:`, error);
            ws.send(JSON.stringify({
                type: 'error',
                message: `Failed to fetch ${dataType} data: ${error.message}`
            }));
        }
    }

    async getTicketsData(userId, userRole, clientName, options = {}) {
        const db = admin.firestore();
        let query = db.collection('tickets');

        // Apply role-based filtering
        if (userRole === 'site_admin' && clientName) {
            query = query.where('client_name', '==', clientName);
        } else if (userRole === 'user' || userRole === 'engineer') {
            // For regular users, get tickets they created OR tickets assigned to them
            // We need to use a compound query or fetch all and filter
            // For now, let's get tickets they created (this is for the main tickets list)
            query = query.where('reporter_id', '==', userId);
        }

        query = query.orderBy('created_at', 'desc').limit(options.limit || 100);

        const snapshot = await query.get();
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            created_at: doc.data().created_at?.toDate?.() || new Date(),
            updated_at: doc.data().updated_at?.toDate?.() || new Date(),
        }));
    }

    async getTicketCountsData(userId, userRole, clientName) {
        const db = admin.firestore();
        
        // Get tickets based on role
        let tickets = await this.getTicketsData(userId, userRole, clientName);
        
        // For assigned_to_me count, we need to query tickets assigned to the user
        // This is different from the main tickets list for regular users
        let assignedToMeTickets = 0;
        
        // SIMPLIFIED: For ALL roles, "My Tickets" count = active tickets created by the user
        // This matches what MyTicketsComponent actually displays
        const myTicketsQuery = db.collection('tickets')
            .where('reporter_id', '==', userId)
            .where('status', 'in', ['Open', 'In Progress', 'Hold']);
        
        const myTicketsSnapshot = await myTicketsQuery.get();
        assignedToMeTickets = myTicketsSnapshot.docs.length;
        
        const totalTickets = tickets.length;
        const activeTickets = tickets.filter(t => ['Open', 'In Progress', 'Hold'].includes(t.status)).length;

        return {
            total_tickets: activeTickets, // Changed to show only active tickets to match dashboard
            active_tickets: activeTickets,
            assigned_to_me: assignedToMeTickets
        };
    }

    async getDashboardData(userId, userRole, clientName, options = {}) {
        const db = admin.firestore();
        
        // Get tickets data
        const tickets = await this.getTicketsData(userId, userRole, clientName);
        
        // Get company users if site admin
        let companyUsers = [];
        if (userRole === 'site_admin' && clientName) {
            const usersSnapshot = await db.collection('users')
                .where('client_name', '==', clientName)
                .limit(100)
                .get();
            companyUsers = usersSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        }

        // Get recent activities
        let activitiesQuery = db.collection('activities').orderBy('timestamp', 'desc');
        if (userRole === 'site_admin' && clientName) {
            activitiesQuery = activitiesQuery.limit(20);
        } else {
            activitiesQuery = activitiesQuery.limit(5);
        }
        
        const activitiesSnapshot = await activitiesQuery.get();
        const activities = activitiesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate?.() || new Date(),
        }));

        return {
            tickets,
            companyUsers,
            activities,
            agents: [] // Will be populated when available
        };
    }

    async getNotificationsData(userId) {
        const db = admin.firestore();
        const snapshot = await db.collection('notifications')
            .where('userId', '==', userId)
            .orderBy('created_at', 'desc')
            .limit(50)
            .get();
        
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            created_at: doc.data().created_at?.toDate?.() || new Date(),
        }));
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

    // Caching methods
    getCachedData(cacheKey) {
        const cached = this.cache.get(cacheKey);
        if (cached) {
            console.log(`📦 Cache hit for ${cacheKey}`);
            return cached;
        }
        return null;
    }

    setCachedData(cacheKey, data, dataType) {
        const now = Date.now();
        this.cache.set(cacheKey, {
            data,
            timestamp: now,
            dataType
        });
        console.log(`💾 Cached data for ${cacheKey}`);
    }

    isCacheValid(cachedData, dataType) {
        const now = Date.now();
        const duration = this.cacheDurations[dataType] || 5 * 60 * 1000; // Default 5 minutes
        return (now - cachedData.timestamp) < duration;
    }

    clearCache() {
        this.cache.clear();
        console.log('🗑️ Cache cleared');
    }

    clearCacheForUser(userId) {
        const keysToDelete = [];
        for (const [key, value] of this.cache.entries()) {
            if (key.includes(userId)) {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach(key => this.cache.delete(key));
        console.log(`🗑️ Cleared cache for user ${userId}`);
    }

    // Broadcast data updates to all connected clients
    broadcastDataUpdate(dataType, data, userId = null) {
        const message = {
            type: `${dataType}_update`,
            data: data,
            timestamp: Date.now()
        };

        if (userId) {
            // Broadcast to specific user
            this.broadcastToUser(message, userId);
        } else {
            // Broadcast to all clients
            this.broadcast(message);
        }
    }
}

module.exports = WebSocketServer;
