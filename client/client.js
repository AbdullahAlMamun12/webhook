const WebSocket = require('ws');

// Replace with your actual session ID
const sessionId = '279d4c37-d8e6-47d6-b83a-d72d00f65894';
const wsUrl = `ws://localhost:8000/ws/logs/${sessionId}/`;

const socket = new WebSocket(wsUrl);

socket.on('open', () => {
    console.log('✅ Connected to Django WebSocket');
    socket.send('Hello from Node.js client');  // Optional: this won't trigger anything unless your consumer handles it
});

socket.on('message', (data) => {
    try {
        const parsed = JSON.parse(data);

        if (parsed.method && parsed.body) {
            console.log('📨 Webhook Received:');
            console.log(`📌 Method: ${parsed.method}`);
            console.log(`📝 Body: ${parsed.body}`);
            console.log(`⏰ Timestamp: ${parsed.timestamp}`);
            console.log('---');
        } else {
            console.log('📨 Non-webhook message:', parsed);
        }
    } catch (err) {
        console.error('❌ Failed to parse WebSocket message:', err.message);
        console.log('Raw data:', data.toString());
    }
});

socket.on('close', () => {
    console.warn('🔌 WebSocket disconnected');
});

socket.on('error', (err) => {
    console.error('❌ WebSocket error:', err.message);
});