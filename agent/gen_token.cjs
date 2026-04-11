const { AccessToken } = require('livekit-server-sdk');
require('dotenv').config({ path: '../.env.local' });

const apiKey = process.env.LIVEKIT_API_KEY;
const apiSecret = process.env.LIVEKIT_API_SECRET;

async function run() {
    const at = new AccessToken(apiKey, apiSecret, {
        identity: 'test_node_identity',
    });
    // Use an existing room name from the logs or one we know failed
    at.addGrant({ roomJoin: true, room: 'test-room' });

    const token = await at.toJwt();
    console.log(token);
}

run();
