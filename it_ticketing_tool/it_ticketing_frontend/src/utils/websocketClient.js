import WebSocketConnectionManager from './websocketConnectionManager';

class WebSocketClient {
    constructor() {
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.listeners = new Map();
        this.isConnected = false;
        this.authToken = null;
        this.userInfo = null;
        this.analyticsSubscriptions = new Map(); // Track analytics subscriptions
        this.isAuthenticating = false; // Prevent multiple authentication attempts
    }

    connect(token, userInfo) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.log('🌐 WebSocket already connected, skipping connection');
            return;
        }

        this.authToken = token;
        this.userInfo = userInfo;

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // Use port 5000 for backend WebSocket server
        const wsUrl = `${protocol}//${window.location.hostname}:5000`;
        
        console.log('🌐 Connecting to WebSocket:', wsUrl);
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            console.log('✅ WebSocket connected successfully');
            this.isConnected = true;
            this.reconnectAttempts = 0;
            
            // Mark connection as stable
            WebSocketConnectionManager.markConnected();
            
            // Wait a bit for WebSocket to be fully ready, then authenticate
            const tryAuthenticate = () => {
                if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                    this.authenticate();
                    // Re-subscribe to analytics after reconnection (with delay)
                    this.resubscribeAnalytics();
                } else {
                    // Retry after a short delay if not ready
                    setTimeout(tryAuthenticate, 50);
                }
            };
            
            setTimeout(tryAuthenticate, 100);
            
            // Notify listeners of connection change
            this.notifyListeners('connection_change', true);
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleMessage(data);
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };

        this.ws.onclose = (event) => {
            console.log('❌ WebSocket disconnected:', event.code, event.reason);
            this.isConnected = false;
            this.isAuthenticating = false;
            
            // Mark connection as lost
            WebSocketConnectionManager.markDisconnected();
            
            // Notify listeners of connection change
            this.notifyListeners('connection_change', false);
            this.handleReconnect();
        };

        this.ws.onerror = (error) => {
            console.error('❌ WebSocket error:', error);
            this.isAuthenticating = false;
        };
    }

    authenticate() {
        if (this.isAuthenticating) {
            console.log('Authentication already in progress, skipping...');
            return;
        }

        if (this.ws && this.ws.readyState === WebSocket.OPEN && this.authToken && this.userInfo) {
            this.isAuthenticating = true;
            try {
                console.log('🔐 Authenticating WebSocket with token:', typeof this.authToken, this.authToken ? 'present' : 'missing');
                console.log('🔐 User info:', this.userInfo);
                
                this.ws.send(JSON.stringify({
                    type: 'authenticate',
                    token: this.authToken,
                    userId: this.userInfo.uid,
                    userRole: this.userInfo.role,
                    clientName: this.userInfo.client_name || this.userInfo.companyName
                }));
                console.log('Authentication message sent');
                
                // Set a timeout to reset authentication flag if no response
                setTimeout(() => {
                    if (this.isAuthenticating) {
                        console.warn('Authentication timeout, resetting flag');
                        this.isAuthenticating = false;
                    }
                }, 5000);
            } catch (error) {
                console.error('Failed to authenticate WebSocket:', error);
                this.isAuthenticating = false;
            }
        } else {
            console.warn('WebSocket not ready for authentication:', {
                ws: !!this.ws,
                readyState: this.ws?.readyState,
                authToken: !!this.authToken,
                authTokenType: typeof this.authToken,
                userInfo: !!this.userInfo
            });
        }
    }

    handleMessage(data) {
        switch (data.type) {
            case 'authenticated':
                console.log('✅ WebSocket authenticated successfully');
                this.isAuthenticating = false;
                break;
            case 'user_update':
                console.log('👤 User update received:', data);
                this.notifyListeners('user_update', data);
                break;
            case 'ticket_update':
                console.log('🎫 Ticket update received:', data);
                this.notifyListeners('ticket_update', data);
                break;
            case 'notification_update':
                console.log('🔔 Notification update received:', data);
                this.notifyListeners('notification_update', data);
                break;
            case 'data_response':
                console.log(`📊 Data response received for ${data.dataType}:`, data.data?.length || 'no data');
                // Handle data responses from server
                this.notifyListeners(`data_${data.dataType}`, data.data);
                break;
            case 'analytics_subscribed':
                console.log('📈 Analytics subscription successful:', data.subscriptionId);
                this.notifyListeners('analytics_subscribed', data);
                break;
            case 'analytics_update':
                console.log('📈 Analytics update received:', data);
                this.notifyListeners('analytics_update', data);
                break;
            case 'error':
                console.error('❌ WebSocket error:', data.message);
                this.isAuthenticating = false;
                this.notifyListeners('websocket_error', data);
                break;
            default:
                console.log('❓ Unknown WebSocket message type:', data.type);
        }
    }

    // Subscribe to analytics updates
    subscribeToAnalytics(filters, subscriptionId) {
        if (!this.isConnected) {
            console.warn('WebSocket not connected, cannot subscribe to analytics');
            return false;
        }

        const subscription = {
            filters,
            subscriptionId,
            timestamp: Date.now()
        };

        // Store subscription locally
        this.analyticsSubscriptions.set(subscriptionId, subscription);

        // Send subscription request to server
        this.send('subscribe_analytics', {
            filters,
            subscriptionId
        });

        console.log(`Subscribed to analytics with ID: ${subscriptionId}`, filters);
        return true;
    }

    // Unsubscribe from analytics updates
    unsubscribeFromAnalytics(subscriptionId) {
        if (this.analyticsSubscriptions.has(subscriptionId)) {
            this.analyticsSubscriptions.delete(subscriptionId);
            
            if (this.isConnected) {
                this.send('unsubscribe_analytics', { subscriptionId });
            }
            
            console.log(`Unsubscribed from analytics: ${subscriptionId}`);
        }
    }

    // Re-subscribe to analytics after reconnection
    resubscribeAnalytics() {
        if (this.analyticsSubscriptions.size > 0) {
            console.log('🔄 Re-subscribing to analytics after reconnection...');
            // Add a small delay to prevent rapid re-subscriptions
            setTimeout(() => {
                for (const [subscriptionId, subscription] of this.analyticsSubscriptions.entries()) {
                    // Only re-subscribe if the subscription is still recent (less than 5 minutes old)
                    const age = Date.now() - subscription.timestamp;
                    if (age < 5 * 60 * 1000) { // 5 minutes
                        this.send('subscribe_analytics', {
                            filters: subscription.filters,
                            subscriptionId
                        });
                        console.log(`✅ Re-subscribed to analytics: ${subscriptionId}`);
                    } else {
                        console.log(`⏰ Skipping old analytics subscription: ${subscriptionId} (age: ${Math.round(age / 1000)}s)`);
                        this.analyticsSubscriptions.delete(subscriptionId);
                    }
                }
            }, 1000); // 1 second delay
        }
    }

    // Get analytics subscription status
    getAnalyticsSubscriptionStatus(subscriptionId) {
        return this.analyticsSubscriptions.has(subscriptionId);
    }

    // Get all active analytics subscriptions
    getActiveAnalyticsSubscriptions() {
        return Array.from(this.analyticsSubscriptions.entries()).map(([id, sub]) => ({
            id,
            filters: sub.filters,
            timestamp: sub.timestamp
        }));
    }

    handleReconnect() {
        // Use the connection manager to handle reconnection intelligently
        WebSocketConnectionManager.startReconnection(this, this.maxReconnectAttempts);
    }

    addListener(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
    }

    removeListener(event, callback) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).delete(callback);
        }
    }

    notifyListeners(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('Error in WebSocket listener:', error);
                }
            });
        }
    }

    disconnect() {
        // Cancel any pending reconnection
        WebSocketConnectionManager.cancelReconnection();
        
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
        this.listeners.clear();
    }

    // Send message to server
    send(type, data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            try {
                this.ws.send(JSON.stringify({ type, ...data }));
            } catch (error) {
                console.error('Failed to send WebSocket message:', error);
            }
        } else {
            console.warn('WebSocket is not connected, readyState:', this.ws?.readyState);
        }
    }
}

// Create singleton instance
const websocketClient = new WebSocketClient();

export default websocketClient;
