const fs = require('fs');
const path = 'C:\\Users\\user\\.gemini\\antigravity-ide\\brain\\4ef47851-8086-41c2-898a-bb848c53db3e\\.system_generated\\logs\\transcript.jsonl';
const lines = fs.readFileSync(path, 'utf-8').split('\n');
const files = new Set();
lines.forEach(l => {
    if (!l.trim()) return;
    try {
        const j = JSON.parse(l);
        if (j.tool_calls) {
            j.tool_calls.forEach(tc => {
                if (tc.args && (tc.args.TargetFile || tc.args.Target)) {
                    let tf = tc.args.TargetFile || tc.args.Target;
                    if (typeof tf === 'string') {
                         tf = tf.replace(/\"/g, '');
                         files.add(tf);
                    }
                }
            });
        }
    } catch(e) {}
});
console.log("Modified files on June 30:");
console.log(Array.from(files));
