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
        this.onNameReceived = null;
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
        this.roomId = sessionStorage.getItem('last_host_room_id') || this.generateShortId();
        sessionStorage.setItem('last_host_room_id', this.roomId);

        // Use a unique peer ID each time to avoid "ID taken" if previous session
        // hasn't fully expired from PeerJS server yet
        const uniqueSuffix = Date.now().toString(36).slice(-4);
        const peerId = 'neoncard-' + this.roomId + '-' + uniqueSuffix;

        return new Promise((resolve, reject) => {
            try {
                if (this.peer) { this.peer.destroy(); this.peer = null; }
                this.peer = new Peer(peerId);

                const timeout = setTimeout(() => {
                    reject(new Error('連線逾時，請重試'));
                }, 15000);

                this.peer.on('open', (id) => {
                    clearTimeout(timeout);
                    console.log('Host created with ID:', id);
                    resolve(this.roomId);
                });

                this.peer.on('connection', (c) => {
                    if (this.conn) { c.close(); return; }
                    this.conn = c;
                    this.conn.on('open', () => { this.setupConnection(); });
                });

                this.peer.on('error', (err) => {
                    clearTimeout(timeout);
                    console.error('Peer error:', err);
                    if (this.onError) this.onError(err);
                    reject(err);
                });
            } catch (err) {
                reject(err);
            }
        });
    }

    async initHost() {
        this.isHost = true;
        this.roomId = sessionStorage.getItem('last_host_room_id') || this.generateShortId();
        sessionStorage.setItem('last_host_room_id', this.roomId);

        // Add unique time suffix to avoid PeerJS "ID taken" from previous sessions
        const uniqueSuffix = Date.now().toString(36).slice(-5);
        const peerId = 'nc-' + this.roomId + '-' + uniqueSuffix;

        // Publish peerId to RTDB so joiner can discover it
        const rtdb = window.AuthManager ? AuthManager.getRtdb() : null;
        const roomRef = rtdb ? rtdb.ref(`rooms/${this.roomId}`) : null;

        return new Promise((resolve, reject) => {
            try {
                if (this.peer) { this.peer.destroy(); this.peer = null; }
                this.peer = new Peer(peerId);

                const timeout = setTimeout(() => {
                    reject(new Error('連線逾時，請重試'));
                }, 15000);

                this.peer.on('open', (id) => {
                    clearTimeout(timeout);
                    console.log('Host peer ready:', id);
                    // Register in RTDB so joiners can find us
                    if (roomRef) {
                        roomRef.set({ peerId: id, ts: Date.now() });
                        roomRef.onDisconnect().remove();
                    }
                    resolve(this.roomId);
                });

                this.peer.on('connection', (c) => {
                    if (this.conn) { c.close(); return; }
                    this.conn = c;
                    this.conn.on('open', () => {
                        // Clean up signaling entry once connected
                        if (roomRef) roomRef.remove().catch(() => {});
                        this.setupConnection();
                    });
                });

                this.peer.on('error', (err) => {
                    clearTimeout(timeout);
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

        return new Promise(async (resolve, reject) => {
            try {
                if (this.peer) { this.peer.destroy(); this.peer = null; }

                // Look up host's actual PeerID from RTDB (with retries)
                let peerId = null;
                const rtdb = window.AuthManager ? AuthManager.getRtdb() : null;
                if (rtdb) {
                    for (let i = 0; i < 8; i++) {
                        const snap = await rtdb.ref(`rooms/${this.roomId}`).once('value');
                        if (snap.exists()) {
                            peerId = snap.val().peerId;
                            break;
                        }
                        await new Promise(r => setTimeout(r, 1000));
                    }
                }
                // Fallback to legacy fixed format if RTDB lookup fails
                if (!peerId) peerId = 'neoncard-' + this.roomId;

                this.peer = new Peer();

                const timeout = setTimeout(() => {
                    reject({ type: 'timeout', message: '連線逾時' });
                }, 15000);

                this.peer.on('open', (myId) => {
                    console.log('Joiner peer ready, connecting to:', peerId);
                    this.conn = this.peer.connect(peerId, { reliable: true });

                    this.conn.on('open', () => {
                        clearTimeout(timeout);
                        this.setupConnection();
                        resolve(true);
                    });

                    this.conn.on('error', (err) => {
                        clearTimeout(timeout);
                        reject(err);
                    });
                });

                this.peer.on('error', (err) => {
                    clearTimeout(timeout);
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
            } else if (data.type === 'name' && this.onNameReceived) {
                this.onNameReceived(data.name);
            } else if (data.type === 'seed' && !this.isHost) {
                // Host sends the game seed to client upon connection
                window.GameRNG = new SeededRNG(data.seed);
                window.GameRandom = () => window.GameRNG.next();
                console.log('Received RNG seed from host:', data.seed);
                if (this.onConnected) this.onConnected(); // Setup game after seed
            }
        });

        this.conn.on('close', () => {
            this.connected = false;
            this.conn = null;
            if (this.onDisconnected) this.onDisconnected();
        });

        // Exchange names immediately upon connection
        const myName = localStorage.getItem('onlineMyName') || (this.isHost ? '玩家1' : '玩家2');
        this.conn.send({ type: 'name', name: myName });

        if (this.isHost) {
            // Host generates seed and sends it
            const seed = Date.now();
            window.GameRNG = new SeededRNG(seed);
            window.GameRandom = () => window.GameRNG.next();
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
