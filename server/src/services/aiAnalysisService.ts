import { getModel, isActiveAIConfigured } from './aiClient';
import { hashKey, getCached, setCache } from './aiCacheService';
import { ClauseSuggestion } from '../types/ai';
import { scopeToStep, scopeToFlag, compactStringify } from './aiContextSummariser';
import { sanitiseStepName, sanitiseFlagCode } from './aiSanitiser';
import { trackUsage } from './aiUsageTracker';
import { getAssetsByCategory, hasAssetCategory } from './assetListService';
import { getCurrentAITrackingLabel } from './aiSettingsService';

export const validateIntakeLogic = async (intakeData: any, context: string): Promise<string | null> => {
    if (!isActiveAIConfigured()) {
        if (context === 'family' && !intakeData.family?.children) return null;
        if (context === 'beneficiaries' && !intakeData.beneficiaries) return "Beneficiary distribution seems incomplete.";
        return null;
    }
    try {
        // Scope context data to the relevant section only (cost optimisation)
        const safeContext   = sanitiseStepName(context, 'validateIntakeLogic.context');
        const scopedData    = scopeToStep(intakeData, safeContext);
        const contextString = compactStringify(scopedData);

        const prompt = `Act as an expert Estate Lawyer. Review the following estate plan data for critical logical loopholes, risks, or inconsistencies.
        Focus specifically on:
        1. Minors inheriting directly without trust provisions.
        2. Disabled beneficiaries receiving direct funds (loss of government benefits).
        3. Spouses being disinherited or risking Family Law Act claims.
        4. Logical gaps (e.g. Guardians appointed but no children listed).

        <current_step>${safeContext}</current_step>

        <context>${contextString}</context>

        If you find a CRITICAL or HIGH RISK issue relevant to the current step, return a concise, 1-2 sentence warning message addressed to the user.
        If no major issues are found, return "null" (string).`;

        const startMs = Date.now();
        const result = await getModel().generateContent(prompt);
        const response = await result.response;
        if (response.usageMetadata) {
            trackUsage(response.usageMetadata, 'validateIntakeLogic', getCurrentAITrackingLabel(), Date.now() - startMs).catch(console.error);
        }
        const text = response.text().trim();

        if (text.toLowerCase() === 'null') return null;
        return text;
    } catch (error) {
        console.error("AI Validation Error:", error);
        return null;
    }
};

export const runStressTest = async (intakeData: any, context: string = 'general'): Promise<string[]> => {
    try {
        // Sanitise context step to prevent injection
        context = sanitiseStepName(context, 'runStressTest.context');
        let scopedData: any = {};
        const c = context.toLowerCase();

        if (c === 'executors') scopedData = { executors: intakeData.executors, family: intakeData.family };
        else if (c === 'beneficiaries') scopedData = { beneficiaries: intakeData.beneficiaries, family: intakeData.family };
        else if (c === 'assets') scopedData = { assets: intakeData.assets };
        else if (c === 'family') scopedData = { family: intakeData.family };
        else if (c === 'guardians') scopedData = { guardians: intakeData.guardians, family: intakeData.family };
        else if (c === 'poa') scopedData = { powerOfAttorney: intakeData.powerOfAttorney };
        else if (c === 'funeral') scopedData = { funeral: intakeData.funeral };
        else if (c === 'prior-wills') scopedData = { priorWills: intakeData.priorWills };
        else if (c === 'profile') scopedData = { personalProfile: intakeData.personalProfile };
        else scopedData = intakeData;

        const cacheKey = hashKey(`stress_${context}`, scopedData);
        const cached = await getCached(cacheKey);
        if (cached) return cached;

        const prompt = `Act as a critical Estate Lawyer running a 'Stress Test' on a draft will plan. 
        Analyze the following data for specific ambiguities, vague instructions, or missing contingencies.
        
        CRITICAL INSTRUCTION: Focus your analysis STRICTLY on the "${context}" section of the estate plan. 
        Do NOT report issues related to other sections unless they directly contradict the "${context}" section.

        Focus guidance based on context:
        - If context is 'executors': Check for alternates, age of executors, and potential conflicts.
        - If context is 'beneficiaries': Check for 100% allocation, per stirpes definitions, and minors.
        - If context is 'assets': Check for vague descriptions and ownership types.
        - If context is 'family': Check for excluded children or spousal rights.
        - If context is 'prior-wills' or 'prior-wills': Check for recent marriage dates vs will date, and foreign will flags.
        
        Data: ${JSON.stringify(scopedData, null, 2)}
        
        Return a JSON array of strings, where each string is a probing 'Review Question' for the client regarding the "${context}" section.
        Example: ["If your son John predeceases you, do you want his share to go to his children?"]
        
        If the "${context}" section is clear or empty, return an empty array [].
        Return ONLY the JSON array.
        IMPORTANT: Limit your response to a MAXIMUM of 3 most critical questions. Do not overwhelm the user.`;

        const model = getModel({ generationConfig: { responseMimeType: "application/json" } });
        const startMs = Date.now();
        const result = await model.generateContent(prompt);
        const response = await result.response;
        if (response.usageMetadata) {
            trackUsage(response.usageMetadata, 'runStressTest', getCurrentAITrackingLabel(), Date.now() - startMs).catch(console.error);
        }
        const text = response.text().trim();
        const questions = JSON.parse(text);
        await setCache(cacheKey, questions);
        return questions;

    } catch (error: any) {
        console.error("AI Stress Test Error:", error);
        const fallbackQuestions: string[] = [];
        const d = intakeData;
        const c = context.toLowerCase();
        const isAll = c === 'general' || c === 'review';

        if (isAll || c.includes('executor')) {
            if (d.executors?.primary && !d.executors.alternates?.length) {
                fallbackQuestions.push(`You have only named ${d.executors.primary.fullName} as Executor. What if they are unable to act?`);
            }
        }

        if (isAll || c.includes('beneficiar')) {
            if (d.beneficiaries?.beneficiaries?.length > 0) {
                const total = d.beneficiaries.beneficiaries.reduce((sum: number, b: any) => sum + (Number(b.share) || 0), 0);
                if (total !== 100) {
                    fallbackQuestions.push(`Your beneficiary shares total ${total}%. They should equal exactly 100%.`);
                }
                if (!d.beneficiaries.contingency) {
                    fallbackQuestions.push("You haven't specified what happens if a beneficiary passes away before you (Contingency).");
                }
            }
        }

        if (isAll || c.includes('asset')) {
            const realEstateAssets = getAssetsByCategory(d.assets, 'realEstate');
            if (realEstateAssets.length > 0) {
                const vague = realEstateAssets.some((a: any) => !a.description || a.description.length < 5);
                if (vague) {
                    fallbackQuestions.push("One of your properties has a vague description. Please verify the address is complete.");
                }
            }
        }

        return fallbackQuestions;
    }
};

export const explainRisk = async (flagCode: string, intakeData: any): Promise<string> => {
    if (!isActiveAIConfigured()) {
        if (flagCode === 'SPOUSAL_OMISSION') return "In Ontario, spouses have preferential rights. Excluding them can lead to litigation.";
        if (flagCode === 'MISSING_GUARDIAN') return "Minors cannot manage their own property or care. You must appoint a guardian.";
        return "This is a potential legal risk that should be reviewed by a professional.";
    }
    try {
        // Sanitise flag code + scope context to relevant sections only (cost optimisation)
        const safeCode      = sanitiseFlagCode(flagCode, 'explainRisk.flagCode');
        const scopedData    = scopeToFlag(intakeData, safeCode);
        const contextString = compactStringify(scopedData);

        const prompt = `You are a Senior Estate Lawyer in Ontario, Canada.
        Explain WHY the following risk flag was triggered for a client's estate plan.

        Risk Flag: "${safeCode}"

        <context>${contextString}</context>

        Provide a 1-sentence explanation of the legal risk, followed by a 1-sentence recommendation on how to mitigate it.
        Avoid generic definitions. Be specific to the client's data.`;

        const startMs = Date.now();
        const result = await getModel().generateContent(prompt);
        const response = await result.response;
        if (response.usageMetadata) {
            trackUsage(response.usageMetadata, 'explainRisk', getCurrentAITrackingLabel(), Date.now() - startMs).catch(console.error);
        }
        return response.text().trim();
    } catch (error) {
        console.error("AI Explain Risk Error:", error);
        if (flagCode === 'Foreign Assets' || flagCode === 'FOREIGN_ASSETS') {
            return "Owning assets in another jurisdiction often requires a separate 'Situs Will' to avoid invalidating your primary will or incurring double probate fees.";
        }
        if (flagCode === 'SPOUSAL_OMISSION' || flagCode.includes('DISINHERIT')) {
            return "In Ontario, spouses have preferential rights under the Family Law Act. Excluding a spouse without a domestic contract creates a high risk of litigation.";
        }
        return `This flag (${flagCode}) suggests a specific legal complexity that deviates from a standard distribution, potentially increasing risk of disputes or tax liability.`;
    }
};

export const getClauseSuggestions = async (intakeData: any): Promise<ClauseSuggestion[]> => {
    const cacheKey = hashKey('clause', intakeData);
    const cached = await getCached(cacheKey);
    if (cached) return cached;

    await new Promise(resolve => setTimeout(resolve, 600));

    const suggestions: ClauseSuggestion[] = [];
    const d = intakeData;

    if (d.priorWills?.hasForeignWill === 'yes') {
        suggestions.push({
            id: 'foreign_1',
            title: 'International Concurrent Will Clause',
            description: 'Detected foreign will. Use this clause to ensure this will only applies to local assets.',
            content: 'I hereby declare that this Will is intended to dispose of my property situated within [JURISDICTION] only...'
        });
    }

    if (hasAssetCategory(d.assets, 'business')) {
        suggestions.push({
            id: 'biz_1',
            title: 'Expanded Business Powers',
            description: 'Client owns a business. Executors need power to carry on or sell business.',
            content: 'My Trustees shall have the power to carry on any business in which I may be engaged at the time of my death...'
        });
    }

    if (d.guardians?.primary?.fullName) {
        suggestions.push({
            id: 'guard_1',
            title: 'Temporary Guardianship Funding',
            description: 'Guardians appointed. Ensure funds are available immediately for child maintenance.',
            content: 'I authorize my Trustees to make payments to the Guaridan for the maintenance, education and benefit of such child...'
        });
    }

    suggestions.push({
        id: 'dig_1',
        title: 'Digital Assets',
        description: 'Standard recommendation for all modern wills.',
        content: 'I authorize my Trustees to access, handle, distribute, and dispose of my digital assets and accounts...'
    });

    await setCache(cacheKey, suggestions);
    return suggestions;
};
