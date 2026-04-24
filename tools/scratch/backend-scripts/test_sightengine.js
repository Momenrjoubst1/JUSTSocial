import fetch from 'node-fetch';
import * as dotenv from 'dotenv';
import { Buffer } from 'buffer';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

const SIGHTENGINE_USER = process.env.SIGHTENGINE_API_USER;
const SIGHTENGINE_SECRET = process.env.SIGHTENGINE_API_SECRET;

async function test() {
    const dummyBase64 = Buffer.from('dummy image content').toString('base64');

    // Test 1: Using url: data...
    let res = await fetch('https://api.sightengine.com/1.0/check.json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            models: 'gestures,offensive,nudity',
            api_user: SIGHTENGINE_USER || '',
            api_secret: SIGHTENGINE_SECRET || '',
            url: `data:image/jpeg;base64,${dummyBase64}`,
        }),
    });
    console.log('Test 1 (url data uri):', await res.text());

    // Test 2: Using API check with multipart or base64? Let's check docs via making a failing request
    res = await fetch('https://api.sightengine.com/1.0/check.json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            models: 'gestures,offensive,nudity',
            api_user: SIGHTENGINE_USER || '',
            api_secret: SIGHTENGINE_SECRET || '',
            base64: dummyBase64,
        }),
    });
    console.log('Test 2 (base64 param):', await res.text());
}

test();
