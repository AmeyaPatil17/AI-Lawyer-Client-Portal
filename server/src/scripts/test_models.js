
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function listModels() {
    console.log("Checking available models...");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

    const modelsToCheck = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.0-pro', 'gemini-pro'];

    for (const m of modelsToCheck) {
        process.stdout.write(`Testing ${m}... `);
        try {
            const model = genAI.getGenerativeModel({ model: m });
            const result = await model.generateContent("Hello");
            console.log(`SUCCESS!`);
            return;
        } catch (e) {
            console.log(`FAILED: ${e.message.split('\n')[0]}`); // Print first line of error
        }
    }
}

listModels();
