// WebSocket Connection Manager - Prevents unnecessary reconnections and data reloads
export class WebSocketConnectionManager {
    static instance = null;
    static reconnectTimeout = null;
    static isReconnecting = false;
    static lastConnectionTime = 0;
    static connectionStableTime = 30000; // 30 seconds

    static getInstance() {
        if (!this.instance) {
            this.instance = new WebSocketConnectionManager();
        }
        return this.instance;
    }

    /**
     * Check if we should attempt reconnection
     */
    static shouldReconnect() {
        const now = Date.now();
        const timeSinceLastConnection = now - this.lastConnectionTime;
        
        // Don't reconnect if we just connected recently
        if (timeSinceLastConnection < this.connectionStableTime) {
            console.log(`⏰ Skipping reconnection - too soon (${Math.round(timeSinceLastConnection / 1000)}s ago)`);
            return false;
        }

        // Don't reconnect if already reconnecting
        if (this.isReconnecting) {
            console.log('⏳ Already reconnecting, skipping...');
            return false;
        }

        return true;
    }

    /**
     * Mark connection as established
     */
    static markConnected() {
        this.lastConnectionTime = Date.now();
        this.isReconnecting = false;
        console.log('✅ WebSocket connection marked as stable');
    }

    /**
     * Mark connection as lost
     */
    static markDisconnected() {
        this.isReconnecting = false;
        console.log('❌ WebSocket connection lost');
    }

    /**
     * Start reconnection process with intelligent delays
     */
    static startReconnection(websocketClient, maxAttempts = 5) {
        if (!this.shouldReconnect()) {
            return;
        }

        this.isReconnecting = true;
        let attempts = 0;

        const attemptReconnect = () => {
            if (attempts >= maxAttempts) {
                console.error('❌ Max reconnection attempts reached');
                this.isReconnecting = false;
                return;
            }

            attempts++;
            const delay = Math.min(1000 * Math.pow(2, attempts - 1), 30000); // Max 30 seconds
            
            console.log(`🔄 Reconnection attempt ${attempts}/${maxAttempts} in ${delay}ms...`);
            
            this.reconnectTimeout = setTimeout(() => {
                if (websocketClient.authToken && websocketClient.userInfo) {
                    websocketClient.connect(websocketClient.authToken, websocketClient.userInfo);
                } else {
                    console.warn('⚠️ No auth token or user info available for reconnection');
                    this.isReconnecting = false;
                }
            }, delay);
        };

        attemptReconnect();
    }

    /**
     * Cancel any pending reconnection
     */
    static cancelReconnection() {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        this.isReconnecting = false;
        console.log('🚫 Reconnection cancelled');
    }

    /**
     * Get connection stability status
     */
    static getConnectionStatus() {
        const now = Date.now();
        const timeSinceLastConnection = now - this.lastConnectionTime;
        const isStable = timeSinceLastConnection > this.connectionStableTime;
        
        return {
            isStable,
            timeSinceLastConnection: Math.round(timeSinceLastConnection / 1000),
            isReconnecting: this.isReconnecting
        };
    }
}

export default WebSocketConnectionManager;





