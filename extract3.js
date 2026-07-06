const fs = require('fs');
const path = 'C:\\Users\\user\\.gemini\\antigravity-ide\\brain\\fb87e0f9-0eec-4bc7-b2c3-76eea7f34086\\.system_generated\\logs\\transcript.jsonl';
const lines = fs.readFileSync(path, 'utf-8').split('\n');
lines.forEach(l => {
    if (!l.trim()) return;
    try {
        const j = JSON.parse(l);
        if (j.type === 'USER_INPUT') {
            console.log("---");
            console.log("Time:", j.created_at);
            console.log("Input:", j.content.split('<ADDITIONAL_METADATA>')[0].trim());
        }
    } catch(e) {}
});
