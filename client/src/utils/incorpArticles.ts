import type {
    Articles,
    IncorporationData,
} from '../stores/incorpTypes';
import {
    buildCorporateName,
    normalizeText,
} from './incorpRules';

export type DraftNumber = number | '';

export type ArticlesDraft = {
    corporateName: string;
    corporateNameOverridden: boolean;
    lastAcceptedCorporateNameSuggestion: string;
    registeredAddress: string;
    registeredAddressOverridden: boolean;
    lastAcceptedRegisteredAddressSuggestion: string;
    directorCountType: 'fixed' | 'range' | '';
    directorCountFixed: DraftNumber;
    directorCountMin: DraftNumber;
    directorCountMax: DraftNumber;
    shareCapitalDescription: string;
    transferRestrictions: string;
    businessRestrictions: string;
    otherProvisions: string;
    filingFeePaid: boolean;
    certificateReceived: boolean;
    corporationNumber: string;
    certificateDate: string;
};

type ArticlesDraftContext = Pick<IncorporationData, 'articles' | 'preIncorporation' | 'structureOwnership'>;

export type ArticlesSuggestionState = {
    corporateNameSuggestion: string;
    registeredAddressSuggestion: string;
};

const toDraftNumber = (value?: number | null): DraftNumber =>
    typeof value === 'number' && Number.isFinite(value) ? value : '';

const toPositiveInteger = (value: DraftNumber) =>
    typeof value === 'number' && Number.isInteger(value) && value > 0
        ? value
        : undefined;

export const textsMatch = (left?: string | null, right?: string | null) =>
    normalizeText(left) === normalizeText(right);

export const getArticlesSuggestions = (
    data: Pick<IncorporationData, 'preIncorporation' | 'structureOwnership'>
): ArticlesSuggestionState => ({
    corporateNameSuggestion: buildCorporateName(data.preIncorporation),
    registeredAddressSuggestion: data.structureOwnership?.registeredOfficeAddress || '',
});

export const createEmptyArticlesDraft = (): ArticlesDraft => ({
    corporateName: '',
    corporateNameOverridden: false,
    lastAcceptedCorporateNameSuggestion: '',
    registeredAddress: '',
    registeredAddressOverridden: false,
    lastAcceptedRegisteredAddressSuggestion: '',
    directorCountType: '',
    directorCountFixed: '',
    directorCountMin: '',
    directorCountMax: '',
    shareCapitalDescription: '',
    transferRestrictions: '',
    businessRestrictions: '',
    otherProvisions: '',
    filingFeePaid: false,
    certificateReceived: false,
    corporationNumber: '',
    certificateDate: '',
});

export const hydrateArticlesDraft = (data: ArticlesDraftContext): ArticlesDraft => {
    const articles = data.articles;
    const suggestions = getArticlesSuggestions(data);
    const isNumbered = data.preIncorporation?.nameType === 'numbered';

    const savedCorporateName = articles?.corporateName || '';
    const savedRegisteredAddress = articles?.registeredAddress || '';
    const corporateNameMatchesSuggestion = textsMatch(savedCorporateName, suggestions.corporateNameSuggestion);
    const registeredAddressMatchesSuggestion = textsMatch(savedRegisteredAddress, suggestions.registeredAddressSuggestion);

    return {
        corporateName: savedCorporateName || (!isNumbered ? suggestions.corporateNameSuggestion : ''),
        corporateNameOverridden: !isNumbered
            && !!normalizeText(savedCorporateName)
            && !corporateNameMatchesSuggestion,
        lastAcceptedCorporateNameSuggestion: !isNumbered
            && (corporateNameMatchesSuggestion || !normalizeText(savedCorporateName))
            ? suggestions.corporateNameSuggestion
            : '',
        registeredAddress: savedRegisteredAddress || suggestions.registeredAddressSuggestion,
        registeredAddressOverridden: !!normalizeText(savedRegisteredAddress) && !registeredAddressMatchesSuggestion,
        lastAcceptedRegisteredAddressSuggestion: registeredAddressMatchesSuggestion || !normalizeText(savedRegisteredAddress)
            ? suggestions.registeredAddressSuggestion
            : '',
        directorCountType: articles?.directorCountType || '',
        directorCountFixed: toDraftNumber(articles?.directorCountFixed),
        directorCountMin: toDraftNumber(articles?.directorCountMin),
        directorCountMax: toDraftNumber(articles?.directorCountMax),
        shareCapitalDescription: articles?.shareCapitalDescription || '',
        transferRestrictions: articles?.transferRestrictions || '',
        businessRestrictions: articles?.businessRestrictions || '',
        otherProvisions: articles?.otherProvisions || '',
        filingFeePaid: !!articles?.filingFeePaid,
        certificateReceived: !!articles?.certificateReceived,
        corporationNumber: articles?.corporationNumber || '',
        certificateDate: articles?.certificateDate || '',
    };
};

export const serializeArticlesDraft = (
    draft: ArticlesDraft,
    options: {
        isNumbered: boolean;
        filingMethod?: Articles['filingMethod'];
    }
): Articles => ({
    corporateName: options.isNumbered
        ? undefined
        : (normalizeText(draft.corporateName) || undefined),
    corporateNameOverridden: options.isNumbered
        ? false
        : !!draft.corporateNameOverridden,
    registeredAddress: normalizeText(draft.registeredAddress) || undefined,
    registeredAddressOverridden: !!draft.registeredAddressOverridden,
    directorCountType: draft.directorCountType || undefined,
    directorCountFixed: draft.directorCountType === 'fixed'
        ? toPositiveInteger(draft.directorCountFixed)
        : undefined,
    directorCountMin: draft.directorCountType === 'range'
        ? toPositiveInteger(draft.directorCountMin)
        : undefined,
    directorCountMax: draft.directorCountType === 'range'
        ? toPositiveInteger(draft.directorCountMax)
        : undefined,
    shareCapitalDescription: normalizeText(draft.shareCapitalDescription) || undefined,
    transferRestrictions: normalizeText(draft.transferRestrictions) || undefined,
    businessRestrictions: normalizeText(draft.businessRestrictions) || undefined,
    otherProvisions: normalizeText(draft.otherProvisions) || undefined,
    filingFeePaid: !!draft.filingFeePaid,
    certificateReceived: !!draft.certificateReceived,
    corporationNumber: draft.certificateReceived
        ? (normalizeText(draft.corporationNumber) || undefined)
        : undefined,
    certificateDate: draft.certificateReceived
        ? (draft.certificateDate || undefined)
        : undefined,
    filingMethod: options.filingMethod,
});

export const getLocalTodayISO = (now = new Date()) => {
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
};
