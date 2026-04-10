export interface AssetParseResult {
    realEstate_items: AssetItem[];
    bankAccounts_items: AssetItem[];
    investments_items: AssetItem[];
    business_items: AssetItem[];
    foreignAssets_items: AssetItem[];
    vehicles_items: AssetItem[];
    digital_items: AssetItem[];
    other_items: AssetItem[];
}

export interface AssetItem {
    description: string;
    value: string;
    ownership?: 'sole' | 'joint' | 'joint_other' | 'tic';
}

export interface ClauseSuggestion {
    id: string;
    title: string;
    description: string;
    content: string;
}

export interface ChatMessage {
    role: 'user' | 'model';
    text: string;
}
