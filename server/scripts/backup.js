const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const DB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/willguide';
const BACKUP_DIR = path.join(__dirname, '../../backups');

if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Format: backup_YYYY-MM-DD_HH-MM-SS
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').split('.')[0];
const backupPath = path.join(BACKUP_DIR, `backup_${timestamp}`);

// Using mongodump to securely backup the entire database
const command = `mongodump --uri="${DB_URI}" --out="${backupPath}"`;

console.log(`Starting database backup to ${backupPath}...`);

exec(command, (error, stdout, stderr) => {
    if (error) {
        console.error(`Backup failed: ${error.message}`);
        return;
    }
    
    // Dump diagnostic events to console output
    if (stderr) {
        console.log(`Backup logs:\n${stderr}`);
    }
    
    console.log(`\n✅ Backup completed successfully at:\n${backupPath}`);
});
