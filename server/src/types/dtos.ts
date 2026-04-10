import { getCanonicalAssetList, hasAssetCategory, normalizeWillIntakeData } from '../services/assetListService';
import { normalizeIncorpData } from '../services/incorpDataNormalizer';
import { IntakeFlag, LogicWarning, IntakeNote } from './intake';

export interface IntakeListDTO {
    id: string;
    clientEmail: string;
    status: string;
    priorityScore: number;
    flagCount: number;
    aiSummary?: string;
    createdAt: string;
    updatedAt: string;
    type?: string; 
    assignedLawyerId?: string | null;
}

export interface IntakeDashboardDTO extends IntakeListDTO {
    flags: IntakeFlag[];
    clientId: { email: string; name?: string };
    dataSummary: {
        personalProfileName: string;
        spouseName: string | null;
        childrenCount: number;
        businessOwner: boolean;
        hasForeignWill: boolean;
        assetTotal: number;
        jurisdiction: string;
        proposedName: string;
    };
}

export interface IntakeDetailDTO extends IntakeListDTO {
    data: Record<string, any>;
    flags: IntakeFlag[];
    logicWarnings: LogicWarning[];
    notes: IntakeNote[];
}

export interface AdminIntakeListDTO extends IntakeListDTO {
    clientName: string;
    highlights: string;
}

export const toIntakeListDTO = (intake: any): IntakeListDTO => ({
    id: intake._id.toString(),
    clientEmail: intake.clientId?.email || 'Unknown',
    status: intake.status,
    priorityScore: intake.priorityScore || 0,
    flagCount: (intake.flags || []).length,
    aiSummary: intake.aiSummary,
    createdAt: intake.createdAt?.toISOString(),
    updatedAt: intake.updatedAt?.toISOString(),
    type: intake.type || 'will',
    assignedLawyerId: (intake as any).assignedLawyerId?.toString() || null,
});

export const toIntakeDashboardDTO = (intake: any): IntakeDashboardDTO => {
    const listDTO = toIntakeListDTO(intake);
    const d: any = intake.type === 'incorporation'
        ? normalizeIncorpData(intake.data || {})
        : normalizeWillIntakeData(intake.data || {});
    
    // Calculate total assets
    const assetTotal = getCanonicalAssetList(d.assets).reduce((sum, asset) => sum + (asset.value || 0), 0);

    return {
        ...listDTO,
        flags: intake.flags || [],
        clientId: {
            email: intake.clientId?.email || 'Unknown',
            name: intake.clientId?.name
        },
        dataSummary: {
            personalProfileName: d.personalProfile?.fullName || d.preIncorporation?.proposedName || '',
            spouseName: d.family?.spouseName || null,
            childrenCount: d.family?.children?.length || 0,
            businessOwner: hasAssetCategory(d.assets, 'business'),
            hasForeignWill: d.priorWills?.hasForeignWill === 'yes',
            assetTotal,
            jurisdiction: d.preIncorporation?.jurisdiction || '',
            proposedName: d.preIncorporation?.proposedName || ''
        }
    };
};

export const toIntakeDetailDTO = (intake: any): IntakeDetailDTO => ({
    ...toIntakeListDTO(intake),
    data: (intake.type === 'incorporation'
        ? normalizeIncorpData(intake.data || {})
        : normalizeWillIntakeData(intake.data || {})) as Record<string, any>,
    flags: intake.flags || [],
    logicWarnings: intake.logicWarnings || [],
    notes: intake.notes || []
});

export const toAdminIntakeListDTO = (intake: any): AdminIntakeListDTO => {
    const listDTO = toIntakeListDTO(intake);
    const d: any = intake.type === 'incorporation'
        ? normalizeIncorpData(intake.data || {})
        : normalizeWillIntakeData(intake.data || {});

    const clientName = intake.clientId?.name
        || d.personalProfile?.fullName
        || intake.clientName
        || 'Unknown client';

    const highlights = intake.type === 'incorporation'
        ? [d.preIncorporation?.jurisdiction, d.preIncorporation?.proposedName]
            .filter((part: unknown): part is string => typeof part === 'string' && part.trim().length > 0)
            .map((part) => part.toUpperCase())
            .join(' | ') || d.preIncorporation?.proposedName || 'Incorporation Intake'
        : d.personalProfile?.fullName || intake.clientName || 'Unnamed Client';

    return {
        ...listDTO,
        clientName,
        highlights,
    };
};
