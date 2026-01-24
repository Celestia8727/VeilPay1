// Cleanup script to remove test files from node_modules
const fs = require('fs');
const path = require('path');

const testDirsToRemove = [
    'node_modules/thread-stream/test',
    'node_modules/pino/test',
];

const testFilesToRemove = [
    'node_modules/thread-stream/bench.js',
    'node_modules/thread-stream/test.js',
    'node_modules/pino/bench.js',
    'node_modules/pino/test.js',
];

console.log('Cleaning up test files from node_modules...');

// Remove directories
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

// Remove individual files
testFilesToRemove.forEach(file => {
    const fullPath = path.join(__dirname, '..', file);
    if (fs.existsSync(fullPath)) {
        try {
            fs.unlinkSync(fullPath);
            console.log(`✓ Removed ${file}`);
        } catch (err) {
            console.log(`✗ Failed to remove ${file}:`, err.message);
        }
    }
});

console.log('Cleanup complete!');
