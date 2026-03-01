class NetworkManager {
    constructor() {
        this.peer = null;
        this.conn = null;
        this.isHost = false;
        this.roomId = null;
        this.connected = false;

        // Callbacks
        this.onConnected = null;
        this.onDisconnected = null;
        this.onDataReceived = null;
        this.onError = null;
        this.onPeerStateChange = null; // 'thinking', 'selecting', etc.
    }

    generateShortId() {
        // 4 letter alphanumeric code
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 4; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    async initHost() {
        this.isHost = true;
        this.roomId = this.generateShortId();
        const peerId = 'neoncard-' + this.roomId;

        return new Promise((resolve, reject) => {
            try {
                this.peer = new Peer(peerId);

                this.peer.on('open', (id) => {
                    console.log('Host created with ID:', id);
                    resolve(this.roomId);
                });

                this.peer.on('connection', (c) => {
                    // Only accept the first connection
                    if (this.conn) {
                        c.close();
                        return;
                    }
                    this.conn = c;
                    this.conn.on('open', () => {
                        this.setupConnection();
                    });
                });

                this.peer.on('error', (err) => {
                    console.error('Peer error:', err);
                    if (this.onError) this.onError(err);
                    reject(err);
                });
            } catch (err) {
                reject(err);
            }
        });
    }

    async joinRoom(roomId) {
        this.isHost = false;
        this.roomId = roomId.toUpperCase();
        const peerId = 'neoncard-' + this.roomId;

        return new Promise((resolve, reject) => {
            try {
                this.peer = new Peer();

                this.peer.on('open', (id) => {
                    console.log('Joined with ID:', id);
                    this.conn = this.peer.connect(peerId, {
                        reliable: true
                    });

                    this.conn.on('open', () => {
                        this.setupConnection();
                        resolve(true);
                    });

                    this.conn.on('error', (err) => {
                        reject(err);
                    });
                });

                this.peer.on('error', (err) => {
                    console.error('Peer error:', err);
                    if (this.onError) this.onError(err);
                    reject(err);
                });
            } catch (err) {
                reject(err);
            }
        });
    }

    setupConnection() {
        this.connected = true;

        this.conn.on('data', (data) => {
            if (data.type === 'action' && this.onDataReceived) {
                this.onDataReceived(data.action);
            } else if (data.type === 'state' && this.onPeerStateChange) {
                this.onPeerStateChange(data.state);
            } else if (data.type === 'emoji' && window.Animations) {
                // Future emoji implementation
                if (window.Animations.showEmoji) {
                    window.Animations.showEmoji(data.emojiId, this.isHost ? 'player2' : 'player1');
                }
            } else if (data.type === 'seed' && !this.isHost) {
                // Host sends the game seed to client upon connection
                window.GameRNG = new SeededRNG(data.seed);
                Math.random = () => window.GameRNG.next(); // OVERRIDE NATIVE RNG
                console.log('Received RNG seed from host:', data.seed);
                if (this.onConnected) this.onConnected(); // Setup game after seed
            }
        });

        this.conn.on('close', () => {
            this.connected = false;
            this.conn = null;
            if (this.onDisconnected) this.onDisconnected();
        });

        if (this.isHost) {
            // Host generates seed and sends it
            const seed = Date.now();
            window.GameRNG = new SeededRNG(seed);
            Math.random = () => window.GameRNG.next(); // OVERRIDE NATIVE RNG
            this.conn.send({ type: 'seed', seed: seed });
            setTimeout(() => {
                if (this.onConnected) this.onConnected();
            }, 500); // Give client time to process seed
        }
    }

    sendAction(action) {
        if (!this.connected || !this.conn) return;
        this.conn.send({ type: 'action', action: action });
    }

    sendState(state) {
        if (!this.connected || !this.conn) return;
        this.conn.send({ type: 'state', state: state });
    }

    sendEmoji(emojiId) {
        if (!this.connected || !this.conn) return;
        this.conn.send({ type: 'emoji', emojiId: emojiId });
    }

    disconnect() {
        if (this.conn) {
            this.conn.close();
        }
        if (this.peer) {
            this.peer.destroy();
        }
        this.connected = false;
        this.peer = null;
        this.conn = null;
    }
}

// Global instance for the game to use
window.NetManager = new NetworkManager();
