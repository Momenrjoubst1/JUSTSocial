const fs = require('fs');
const path = require('path');

function createWav(samples) {
    const numFrames = samples.length;
    const numChannels = 1;
    const sampleRate = 44100;
    const bytesPerSample = 2;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = numFrames * blockAlign;

    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    function writeString(view, offset, string) {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bytesPerSample * 8, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
        let s = Math.max(-1, Math.min(1, samples[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }

    return Buffer.from(buffer).toString('base64');
}

// 1. Keyboard Click (Tock) - short noisy high-pass ping
const clickSamples = [];
for (let i = 0; i < 44100 * 0.015; i++) {
    const t = i / 44100;
    const env = Math.exp(-t * 800);
    clickSamples.push((Math.random() * 2 - 1) * env * 0.8 + Math.sin(2*Math.PI*1000*t) * env * 0.4);
}

// 2. Sent Message Swoosh - frequency sweep up with noise
const swooshSamples = [];
for (let i = 0; i < 44100 * 0.15; i++) {
    const t = i / 44100;
    const env = t < 0.02 ? t/0.02 : Math.exp(-(t-0.02)*20);
    const freq = 100 + 400 * t; 
    const noise = (Math.random() * 2 - 1) * 0.1;
    swooshSamples.push((Math.sin(2 * Math.PI * freq * t) + noise) * env * 0.3);
}

// 3. Receive Pop - quick two-tone pop like snapchat
const popSamples = [];
for (let i = 0; i < 44100 * 0.15; i++) {
    const t = i / 44100;
    const env = t < 0.01 ? t/0.01 : Math.exp(-(t-0.01)*20);
    const freq = t < 0.05 ? 600 : 1200;
    popSamples.push(Math.sin(2 * Math.PI * freq * t) * env * 0.4);
}

const fileContent = "export const SOUND_CLICK = 'data:audio/wav;base64," + createWav(clickSamples) + "';\n" +
"export const SOUND_SEND = 'data:audio/wav;base64," + createWav(swooshSamples) + "';\n" +
"export const SOUND_RECEIVE = 'data:audio/wav;base64," + createWav(popSamples) + "';\n";

const baseDir = path.join(__dirname, '..', '..', 'frontend', 'src', 'features', 'chat', 'constants');
fs.mkdirSync(baseDir, { recursive: true });
fs.writeFileSync(path.join(baseDir, 'sounds.ts'), fileContent);
console.log('Sounds generated successfully');
