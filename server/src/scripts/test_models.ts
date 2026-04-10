
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
dotenv.config();

async function listModels() {
    console.log("Checking available models...");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    try {
        // There isn't a direct listModels on the instance in some versions, 
        // but let's try to just run a simple prompt on 'gemini-pro' to confirm if it works physically
        // or just try to find a working one.
        // Actually, the error message suggested: "Call ListModels to see the list of available models"
        // The node SDK might have a model manager. 

        // As of 0.24.1, it doesn't expose listModels helper directly in the main class easily in all docs,
        // but let's try the ModelManager if it exists or just try 'gemini-1.0-pro'.

        const modelsToCheck = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.0-pro', 'gemini-pro'];

        for (const m of modelsToCheck) {
            console.log(`Testing ${m}...`);
            try {
                const model = genAI.getGenerativeModel({ model: m });
                const result = await model.generateContent("Hello");
                console.log(`SUCCESS: ${m} works!`);
                console.log(result.response.text());
                return;
            } catch (e: any) {
                console.log(`FAILED: ${m} - ${e.message}`);
            }
        }

    } catch (error) {
        console.error("Global Error:", error);
    }
}

listModels();
