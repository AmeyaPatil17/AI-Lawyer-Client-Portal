const mongoose = require('mongoose');

// The URI we are using in production
const uri = "MongoDB Atlas Database URI Here";

console.log("Attempting to connect to MongoDB Atlas...");

mongoose.connect(uri)
    .then(() => {
        console.log("SUCCESS"); // Keyword for me to grep
        console.log("✅ MEANING: Credentials are correct. Whitelist works locally.");
        process.exit(0);
    })
    .catch((err) => {
        console.error("FAILED"); // Keyword
        console.error("Error:", err.message);
        process.exit(1);
    });
