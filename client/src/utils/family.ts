import type { Child, Family } from '../types/intake';

export type FamilyChildForm = Child & {
    uiKey: string;
};

export type FamilyFormData = Omit<Family, 'children'> & {
    spouseName: string;
    children: FamilyChildForm[];
};

const PARTNER_STATUSES = new Set(['married', 'commonLaw']);
const MARITAL_STATUS_MAP: Record<string, string> = {
    single: 'single',
    'single (never married)': 'single',
    married: 'married',
    commonlaw: 'commonLaw',
    'common law': 'commonLaw',
    'common-law': 'commonLaw',
    common_law: 'commonLaw',
    divorced: 'divorced',
    widowed: 'widowed',
    separated: 'separated',
};

type DateParts = {
    year: number;
    month: number;
    day: number;
};

let familyUiKeyCounter = 0;

const createUiKey = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }

    familyUiKeyCounter += 1;
    return `family-child-${familyUiKeyCounter}`;
};

const trimString = (value: string | null | undefined) => (typeof value === 'string' ? value.trim() : '');

const parseDateParts = (value?: string | null): DateParts | null => {
    if (!value) return null;

    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    const parsed = new Date(Date.UTC(year, month - 1, day));
    if (
        parsed.getUTCFullYear() !== year ||
        parsed.getUTCMonth() + 1 !== month ||
        parsed.getUTCDate() !== day
    ) {
        return null;
    }

    return { year, month, day };
};

export const isValidIsoDate = (value?: string | null) => parseDateParts(value) !== null;

const compareDateParts = (left: DateParts, right: DateParts) => {
    if (left.year !== right.year) return left.year - right.year;
    if (left.month !== right.month) return left.month - right.month;
    return left.day - right.day;
};

const getReferenceDateParts = (reference = new Date()): DateParts => ({
    year: reference.getFullYear(),
    month: reference.getMonth() + 1,
    day: reference.getDate(),
});

export const normalizeMaritalStatus = (value?: string | null) => {
    const trimmed = trimString(value);
    if (!trimmed) return '';

    return MARITAL_STATUS_MAP[trimmed.toLowerCase()] || trimmed;
};

export const requiresSpouseName = (maritalStatus?: string | null) =>
    PARTNER_STATUSES.has(normalizeMaritalStatus(maritalStatus));

export const getAgeFromIsoDate = (value?: string | null, reference = new Date()) => {
    const dob = parseDateParts(value);
    if (!dob) return null;

    const today = getReferenceDateParts(reference);
    let age = today.year - dob.year;

    if (today.month < dob.month || (today.month === dob.month && today.day < dob.day)) {
        age -= 1;
    }

    return age;
};

export const isMinorFromIsoDate = (value?: string | null, reference = new Date()) => {
    const age = getAgeFromIsoDate(value, reference);
    return age !== null && age < 18;
};

export const isFutureIsoDate = (value?: string | null, reference = new Date()) => {
    const date = parseDateParts(value);
    if (!date) return false;

    return compareDateParts(date, getReferenceDateParts(reference)) > 0;
};

export const compareIsoDates = (left?: string | null, right?: string | null) => {
    const leftParts = parseDateParts(left);
    const rightParts = parseDateParts(right);
    if (!leftParts || !rightParts) return null;
    return compareDateParts(leftParts, rightParts);
};

export const getTodayIsoDate = (reference = new Date()) => {
    const { year, month, day } = getReferenceDateParts(reference);
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

export const normalizeChildRow = (child?: Partial<FamilyChildForm> | null): FamilyChildForm => ({
    uiKey: trimString(child?.uiKey) || createUiKey(),
    id: trimString(child?.id) || undefined,
    fullName: typeof child?.fullName === 'string' ? child.fullName : '',
    relationship: typeof child?.relationship === 'string' ? child.relationship : undefined,
    email: typeof child?.email === 'string' ? child.email : undefined,
    phone: typeof child?.phone === 'string' ? child.phone : undefined,
    address: typeof child?.address === 'string' ? child.address : undefined,
    parentage: child?.parentage === 'previous' ? 'previous' : 'current',
    dateOfBirth: typeof child?.dateOfBirth === 'string' ? child.dateOfBirth : '',
    placeOfBirth: typeof child?.placeOfBirth === 'string' ? child.placeOfBirth : '',
    residesInCanada: typeof child?.residesInCanada === 'boolean' ? child.residesInCanada : undefined,
    isMarried: typeof child?.isMarried === 'boolean' ? child.isMarried : undefined,
    hasChildren: typeof child?.hasChildren === 'boolean' ? child.hasChildren : undefined,
    isDisabled: typeof child?.isDisabled === 'boolean' ? child.isDisabled : undefined,
    hasSpendthriftIssues: typeof child?.hasSpendthriftIssues === 'boolean' ? child.hasSpendthriftIssues : undefined,
    isMinor: isMinorFromIsoDate(child?.dateOfBirth),
});

export const hasMinorChildren = (children?: Array<Partial<Child> | null | undefined>) =>
    (children || []).some((child) => isMinorFromIsoDate(child?.dateOfBirth) || child?.isMinor === true);

export const hasMinorChildrenInFamily = (family?: Partial<Family> | null) =>
    hasMinorChildren(family?.children);

export const normalizeFamilyData = (
    family?: Partial<Family> | null,
    options: { maritalStatusFallback?: string | null } = {}
): FamilyFormData => {
    const maritalStatus = normalizeMaritalStatus(family?.maritalStatus || options.maritalStatusFallback);

    return {
        maritalStatus,
        spouseName: requiresSpouseName(maritalStatus) && typeof family?.spouseName === 'string'
            ? family.spouseName
            : '',
        children: (family?.children || []).map((child) => normalizeChildRow(child as Partial<FamilyChildForm>)),
        hasPets: typeof family?.hasPets === 'boolean' ? family.hasPets : undefined,
    };
};

export const createEmptyFamilyForm = (
    options: { maritalStatusFallback?: string | null } = {}
): FamilyFormData => normalizeFamilyData(undefined, options);

export const createEmptyChildRow = (parentage: 'current' | 'previous'): FamilyChildForm =>
    normalizeChildRow({ parentage });

export const serializeFamilyForSave = (form: FamilyFormData): Family => {
    const maritalStatus = normalizeMaritalStatus(form.maritalStatus);
    const spouseName = requiresSpouseName(maritalStatus) ? form.spouseName : '';

    return {
        maritalStatus,
        spouseName: trimString(spouseName) || undefined,
        hasPets: typeof form.hasPets === 'boolean' ? form.hasPets : undefined,
        children: form.children.map(({ uiKey, ...child }) => ({
            ...child,
            fullName: child.fullName || '',
            dateOfBirth: child.dateOfBirth || '',
            placeOfBirth: child.placeOfBirth || '',
            isMinor: isMinorFromIsoDate(child.dateOfBirth),
        })),
    };
};
