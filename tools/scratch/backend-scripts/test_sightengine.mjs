import 'dotenv/config';

async function test() {
    const dummyBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="; // 1x1 pixel base64 

    // Convert base64 to Blob/File concept
    const byteCharacters = atob(dummyBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/jpeg' });

    const formData = new FormData();
    formData.append('models', 'wad,offensive'); // Let's check which covers gestures
    formData.append('api_user', process.env.SIGHTENGINE_API_USER || '');
    formData.append('api_secret', process.env.SIGHTENGINE_API_SECRET || '');
    formData.append('media', blob, 'image.jpg');

    let res = await fetch('https://api.sightengine.com/1.0/check.json', {
        method: 'POST',
        body: formData,
    });
    console.log('Result:', await res.text());
}
test();
