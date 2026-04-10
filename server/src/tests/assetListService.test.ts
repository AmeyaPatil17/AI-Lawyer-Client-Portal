import { formatAssetOwnershipLabel, getAssetSignature, normalizeAssets } from '../services/assetListService';

describe('assetListService', () => {
    it('coerces legacy liability strings to numbers and recomputes total estimated value', () => {
        const normalized = normalizeAssets({
            list: [
                { type: 'RealEstate', category: 'realEstate', description: '123 Main', value: '500000', ownership: 'sole' },
                { type: 'Bank', category: 'bankAccounts', description: 'Savings', value: '0', ownership: 'joint' },
            ],
            liabilities: [
                { description: 'Mortgage', amount: '250000' },
                { description: 'Line of Credit', amount: '$15,500' },
            ],
            confirmedNoSignificantAssets: false,
            hasShareholderAgreement: true,
            totalEstimatedValue: 999999,
        });

        expect(normalized.totalEstimatedValue).toBe(500000);
        expect(normalized.liabilities).toEqual([
            { description: 'Mortgage', amount: 250000 },
            { description: 'Line of Credit', amount: 15500 },
        ]);
        expect(normalized.hasShareholderAgreement).toBe(true);
        expect(normalized.confirmedNoSignificantAssets).toBe(false);
    });

    it('builds the same signature for identical normalized asset rows', () => {
        const canonical = getAssetSignature({
            type: 'Other',
            category: 'vehicles',
            description: '2018 Tesla Model 3',
            value: 50000,
            ownership: 'sole',
        });

        const imported = getAssetSignature({
            type: 'Other',
            category: 'vehicles',
            description: ' 2018 Tesla Model 3 ',
            value: '50000',
            ownership: 'sole',
        } as any);

        expect(imported).toBe(canonical);
    });

    it('formats preserved ownership labels for joint co-owners', () => {
        expect(formatAssetOwnershipLabel({
            type: 'Other',
            category: 'other',
            description: 'Family cottage',
            ownership: 'joint_other',
            jointOwner: 'Taylor Partner',
        })).toBe('Joint with Taylor Partner');

        expect(formatAssetOwnershipLabel({
            type: 'Bank',
            category: 'bankAccounts',
            description: 'Joint chequing',
            ownership: 'joint',
        })).toBe('Joint with Spouse');
    });
});
