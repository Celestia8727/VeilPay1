// Cleanup script to remove test files from node_modules
const fs = require('fs');
const path = require('path');

const testDirsToRemove = [
    'node_modules/thread-stream/test',
    'node_modules/pino/test',
];

console.log('Cleaning up test files from node_modules...');

testDirsToRemove.forEach(dir => {
    const fullPath = path.join(__dirname, '..', dir);
    if (fs.existsSync(fullPath)) {
        try {
            fs.rmSync(fullPath, { recursive: true, force: true });
            console.log(`✓ Removed ${dir}`);
        } catch (err) {
            console.log(`✗ Failed to remove ${dir}:`, err.message);
        }
    }
});

console.log('Cleanup complete!');
