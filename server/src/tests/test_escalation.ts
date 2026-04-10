
// Standalone test script for Escalation Engine (Logic Verification)
// Run with: .\node_modules\.bin\ts-node src/tests/test_escalation.ts

interface Flag {
    code: string;
    label: string;
    severity: 'high' | 'medium' | 'low';
    description: string;
}

// COPIED LOGIC FROM client/src/services/escalationService.ts for Verification
const detectFlags = (data: any): Flag[] => {
    const flags: Flag[] = [];
    if (!data) return flags;

    // 1. Blended Family
    if (data.family) {
        if (['married', 'commonLaw'].includes(data.family.maritalStatus)) {
            const children = data.family.children || [];
            const hasKidsFromPrevious = children.some((c: any) => c.parentage === 'previous');
            if (hasKidsFromPrevious) {
                flags.push({
                    code: 'BLENDED_FAMILY',
                    label: 'Blended Family',
                    severity: 'high',
                    description: 'Client has children from a previous relationship.'
                });
            }
        }
    }

    // 2. Foreign Assets
    if (data.priorWills?.hasForeignWill === 'yes') {
        flags.push({
            code: 'FOREIGN_WILL',
            label: 'Foreign Will Exists',
            severity: 'high',
            description: 'Client has an existing foreign will.'
        });
    }

    // 3. Business Interests
    // Mocking the structure used in frontend
    if (data.assets && data.assets.business_items && data.assets.business_items.length > 0) {
        flags.push({
            code: 'BUSINESS_INTERESTS',
            label: 'Business Owner',
            severity: 'medium',
            description: 'Client owns business assets.'
        });
    }

    return flags;
};

// --- TESTS ---

console.log('--- Running Escalation Engine Tests ---');

// Test 1: Clean Data
const cleanData = {
    family: { maritalStatus: 'single', children: [] },
    assets: { business: false },
    priorWills: { hasForeignWill: 'no' }
};
console.log('Test 1: Clean Data (Expect 0 flags)');
const flags1 = detectFlags(cleanData);
if (flags1.length === 0) console.log('PASS');
else console.error('FAIL: Expected 0 flags, got', flags1.length);

// Test 2: Risky Data
const riskyData = {
    family: {
        maritalStatus: 'married',
        children: [{ fullName: 'Step Kid', parentage: 'previous' }]
    },
    assets: { business_items: [{ name: 'Corp Inc' }] },
    priorWills: { hasForeignWill: 'yes' }
};

console.log('Test 2: Risky Data');
const flags2 = detectFlags(riskyData);
const codes = flags2.map(f => f.code);

if (codes.includes('BLENDED_FAMILY') && codes.includes('FOREIGN_WILL') && codes.includes('BUSINESS_INTERESTS')) {
    console.log('PASS: Detected Blended Family, Foreign Will, Business');
} else {
    console.error('FAIL: Missing flags. Got:', codes);
}

console.log('--- Tests Complete ---');
