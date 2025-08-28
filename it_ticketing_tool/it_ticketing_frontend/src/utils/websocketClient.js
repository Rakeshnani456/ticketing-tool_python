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
    }

    connect(token, userInfo) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            return;
        }

        this.authToken = token;
        this.userInfo = userInfo;

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;
        
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            console.log('WebSocket connected');
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.authenticate();
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleMessage(data);
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };

        this.ws.onclose = () => {
            console.log('WebSocket disconnected');
            this.isConnected = false;
            this.handleReconnect();
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }

    authenticate() {
        if (this.ws && this.authToken && this.userInfo) {
            this.ws.send(JSON.stringify({
                type: 'authenticate',
                token: this.authToken,
                userId: this.userInfo.uid,
                userRole: this.userInfo.role,
                clientName: this.userInfo.client_name || this.userInfo.companyName
            }));
        }
    }

    handleMessage(data) {
        switch (data.type) {
            case 'authenticated':
                console.log('WebSocket authenticated successfully');
                break;
            case 'user_update':
                this.notifyListeners('user_update', data);
                break;
            case 'ticket_update':
                this.notifyListeners('ticket_update', data);
                break;
            case 'notification_update':
                this.notifyListeners('notification_update', data);
                break;
            case 'error':
                console.error('WebSocket error:', data.message);
                break;
            default:
                console.log('Unknown WebSocket message type:', data.type);
        }
    }

    handleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            
            setTimeout(() => {
                if (this.authToken && this.userInfo) {
                    this.connect(this.authToken, this.userInfo);
                }
            }, this.reconnectDelay * this.reconnectAttempts);
        } else {
            console.error('Max reconnection attempts reached');
        }
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
            this.ws.send(JSON.stringify({ type, ...data }));
        } else {
            console.warn('WebSocket is not connected');
        }
    }
}

// Create singleton instance
const websocketClient = new WebSocketClient();

export default websocketClient;
