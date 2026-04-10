import { getModel } from './aiClient';
import { AssetParseResult } from '../types/ai';
import { sanitiseUserInput } from './aiSanitiser';
import { trackUsage } from './aiUsageTracker';
import { getCurrentAITrackingLabel } from './aiSettingsService';

export const parseAssetsFromText = async (text: string): Promise<AssetParseResult> => {
    try {
        // Sanitise user input before embedding in prompt (5 KB limit for asset descriptions)
        const safeText = sanitiseUserInput(text, 5000, 'parseAssetsFromText.text');

        const prompt = `Extract all financial assets from the following text. Return a strict JSON object with these keys: 
        realEstate_items, bankAccounts_items, investments_items, business_items, foreignAssets_items, vehicles_items, digital_items, other_items. 
        Each item in the arrays should have: 
        - description: string (e.g. "RBC Chequing", "123 Maple Dr")
        - value: string (numeric or estimate, e.g. "50000")
        - ownership: "sole" | "joint" | "joint_other" | "tic" (if unknown omit the field)
        
        <user_text>${safeText}</user_text>`;



        const model = getModel({ generationConfig: { responseMimeType: "application/json" } });
        const startMs = Date.now();
        const result = await model.generateContent(prompt);
        const response = await result.response;
        if (response.usageMetadata) {
            trackUsage(response.usageMetadata, 'parseAssetsFromText', getCurrentAITrackingLabel(), Date.now() - startMs).catch(console.error);
        }
        const responseText = response.text();
        return JSON.parse(responseText);
    } catch (error) {
        console.error("Gemini Text Error:", error);
        return parseAssetsFromTextMock(text);
    }
};

const parseAssetsFromTextMock = (text: string): AssetParseResult => {
    const assets: AssetParseResult = {
        realEstate_items: [],
        bankAccounts_items: [],
        investments_items: [],
        business_items: [],
        foreignAssets_items: [],
        vehicles_items: [],
        digital_items: [],
        other_items: []
    };

    const lower = text.toLowerCase();

    if (lower.includes('cottage')) {
        assets.realEstate_items.push({ description: 'Cottage', value: '500000', ownership: 'sole' });
    }
    if (lower.includes('house') || lower.includes('home')) {
        assets.realEstate_items.push({ description: 'Principal Residence', value: '1000000', ownership: 'joint' });
    }
    if (lower.includes('bank') || lower.includes('savings')) {
        assets.bankAccounts_items.push({ description: 'Bank Account', value: '50000', ownership: 'sole' });
    }
    if (lower.includes('business') || lower.includes('corp')) {
        assets.business_items.push({ description: 'Private Corporation', value: '100', ownership: 'sole' });
    }
    if (lower.includes('florida') || lower.includes('u.s.') || lower.includes('usa') || lower.includes('outside canada')) {
        assets.foreignAssets_items.push({ description: 'Foreign Asset', value: '250000', ownership: 'sole' });
    }
    if (lower.includes('car') || lower.includes('vehicle') || lower.includes('tesla') || lower.includes('boat')) {
        assets.vehicles_items.push({ description: 'Vehicle', value: '35000', ownership: 'sole' });
    }
    if (lower.includes('crypto') || lower.includes('bitcoin') || lower.includes('domain') || lower.includes('wallet')) {
        assets.digital_items.push({ description: 'Digital Asset', value: '10000', ownership: 'sole' });
    }

    return assets;
};

export const parseAssetsFromFile = async (fileBuffer: Buffer, mimeType: string): Promise<AssetParseResult> => {
    try {
        const prompt = "Extract all financial assets, including institution names, account types, and approximate values from this document. Return JSON with keys: realEstate_items, bankAccounts_items, investments_items, business_items, foreignAssets_items, vehicles_items, digital_items, other_items. Each item should have description, value (string), and optional ownership (sole/joint/joint_other/tic).";

        const image = {
            inlineData: {
                data: fileBuffer.toString('base64'),
                mimeType
            }
        };

        const startMs = Date.now();
        const result = await getModel().generateContent([prompt, image]);
        const response = await result.response;
        if (response.usageMetadata) {
            trackUsage(response.usageMetadata, 'parseAssetsFromFile', getCurrentAITrackingLabel(), Date.now() - startMs).catch(console.error);
        }
        const text = response.text();

        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonStr);
    } catch (error) {
        console.error("Gemini Vision Error:", error);
        return {
            realEstate_items: [],
            bankAccounts_items: [],
            investments_items: [],
            business_items: [],
            foreignAssets_items: [],
            vehicles_items: [],
            digital_items: [],
            other_items: []
        };
    }
};
