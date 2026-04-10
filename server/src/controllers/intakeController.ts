import mongoose from 'mongoose';
import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import Intake from '../models/Intake';
import { generateFlags, validateLogic } from '../services/rulesEngine';
import {
    generateAIResponse,
    calculatePriorityScore,
    generateAutoNote,
    getClauseSuggestions,
    parseAssetsFromText,
    explainRisk,
    parseAssetsFromFile,
    validateIntakeLogic,
    runStressTest,
} from '../services/aiService';
import { generateIncorpFlags, validateIncorpLogic } from '../services/incorporationRulesEngine';
import { sendReminderEmail } from '../services/emailService';
import { toIntakeListDTO } from '../types/dtos';
import { io } from '../index';
import {
    summariseForInsight,
    compactStringify,
    summariseIncorpForDashboardInsight,
    summariseIncorpForDashboardSummary,
} from '../services/aiContextSummariser';
import { sanitiseUserInput } from '../services/aiSanitiser';
import { IntakeDataSchema } from '../schemas/intake';
import { IncorporationDataSchema } from '../schemas/incorporationSchema';
import { normalizeIncorpData } from '../services/incorpDataNormalizer';
import {
    AssetCategoryKey,
    getAssetSignature,
    normalizeAssetItem,
    normalizeAssets,
    normalizeWillIntakeData,
} from '../services/assetListService';
import { getRequestUserIdOrUndefined, loadAccessibleIntake } from '../services/intakeAccessService';
import {
    AppError,
    NotFoundError,
    ForbiddenError,
    ConflictError,
    ValidationError,
    BadRequestError,
} from '../errors/AppError';
import { IntakeData } from '../types/intake';
import { logger } from '../services/logger';
import { IntakeValidationService } from '../services/intakeValidationService';

const ACTIVE_INTAKE_FILTER = { isDeleted: { $ne: true } };

const toResponseObject = (value: any) =>
    typeof value?.toObject === 'function'
        ? value.toObject()
        : { ...value };

const normalizeDataByType = (type: 'will' | 'incorporation' | undefined, data: any) =>
    type === 'incorporation'
        ? normalizeIncorpData(data || {})
        : normalizeWillIntakeData(data || {});

const toNormalizedIntakeResponse = (value: any) => {
    const response = toResponseObject(value);
    response.data = normalizeDataByType(response.type || 'will', response.data);
    return response;
};

const validatePayloadForIntake = (type: 'will' | 'incorporation', data: any) =>
    (type === 'incorporation' ? IncorporationDataSchema : IntakeDataSchema).safeParse(
        type === 'incorporation'
            ? normalizeIncorpData(data || {})
            : normalizeWillIntakeData(data || {})
    );

const cloneSerializable = <T>(value: T): T =>
    JSON.parse(JSON.stringify(value ?? {}));

const isPlainObject = (value: unknown): value is Record<string, any> =>
    !!value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date);

const deepMergeIntakeData = (base: any, patch: any): any => {
    if (patch === undefined) {
        return cloneSerializable(base);
    }

    if (Array.isArray(patch)) {
        return cloneSerializable(patch);
    }

    if (isPlainObject(base) && isPlainObject(patch)) {
        const merged: Record<string, any> = { ...cloneSerializable(base) };

        for (const [key, patchValue] of Object.entries(patch)) {
            if (patchValue === undefined) {
                continue;
            }

            const baseValue = merged[key];
            if (Array.isArray(patchValue)) {
                merged[key] = cloneSerializable(patchValue);
            } else if (isPlainObject(patchValue) && isPlainObject(baseValue)) {
                merged[key] = deepMergeIntakeData(baseValue, patchValue);
            } else if (isPlainObject(patchValue)) {
                merged[key] = deepMergeIntakeData({}, patchValue);
            } else {
                merged[key] = patchValue;
            }
        }

        return merged;
    }

    return cloneSerializable(patch);
};

const syncSubmissionFields = (
    type: 'will' | 'incorporation',
    data: any,
    status: 'started' | 'submitted' | 'reviewing' | 'completed'
) => {
    const nextData = cloneSerializable(data || {});

    if (status === 'started') {
        nextData.submitted = false;
        delete nextData.submissionDate;
    } else {
        nextData.submitted = true;
        if (!nextData.submissionDate) {
            nextData.submissionDate = new Date().toISOString();
        }
    }

    return normalizeDataByType(type, nextData);
};

const syncLifecycleTimestamps = (
    intake: any,
    status: 'started' | 'submitted' | 'reviewing' | 'completed'
) => {
    const now = new Date();

    if (status === 'started') {
        intake.submittedAt = undefined;
        intake.completedAt = undefined;
        return;
    }

    if (!intake.submittedAt) {
        intake.submittedAt = now;
    }

    if (status === 'completed') {
        if (!intake.completedAt) {
            intake.completedAt = now;
        }
        return;
    }

    intake.completedAt = undefined;
};

const applyDerivedState = (
    intake: any,
    intakeType: 'will' | 'incorporation',
    normalizedData: any,
) => {
    if (intakeType === 'incorporation') {
        intake.flags = generateIncorpFlags(normalizedData as any);
        intake.logicWarnings = validateIncorpLogic(normalizedData as any) as any;
        return;
    }

    intake.flags = generateFlags(normalizedData);
    intake.logicWarnings = validateLogic(normalizedData) as any;
    intake.priorityScore = calculatePriorityScore(normalizedData);
};

const emitIntakeRealtimeUpdate = async (intake: any) => {
    const intakeLookup = await Intake.findById(intake._id);
    const populated = typeof (intakeLookup as any)?.populate === 'function'
        ? await (intakeLookup as any).populate('clientId', 'email')
        : intakeLookup;
    if (!populated || !io) {
        return;
    }

    io.to('lawyer_updates').emit('intake_updated', toIntakeListDTO(populated));
    io.to(`client_${intake.clientId.toString()}`).emit('intake_status_changed', {
        intakeId: intake._id.toString(),
        status: intake.status,
    });
};

const getClientRole = (req: AuthRequest) => req.user?.role ?? '';

const getWillReminderMessage = (step: string | null) => {
    if (step === 'personalProfile') {
        return "It looks like you haven't started your Profile yet. Adding your basic details is the first step.";
    }
    if (step === 'family') {
        return 'We noticed you stopped at the Family section. Adding your spouse and children is crucial.';
    }
    if (step === 'guardians') {
        return 'You still need to appoint a guardian for your minor children before your file can be finalized.';
    }
    if (step === 'executors') {
        return "You haven't appointed an Executor yet. This is a very important role to fill.";
    }
    if (step === 'beneficiaries') {
        return "You haven't listed any Beneficiaries. Who would you like to inherit your estate?";
    }
    if (step === 'assets') {
        return 'Your asset and liability details are still incomplete, so your estate plan cannot be reviewed yet.';
    }
    if (step === 'poa') {
        return 'Please complete your Power of Attorney choices so your planning package is ready for legal review.';
    }
    if (step === 'funeral') {
        return 'Your funeral and memorial wishes are still incomplete.';
    }
    if (step === 'prior-wills') {
        return 'Please confirm your prior will details so we can avoid conflicts with existing documents.';
    }
    return "We noticed you haven't completed your intake yet.";
};

const normalizeIncorpReminderText = (value?: string | null) =>
    String(value || '').replace(/\s+/g, ' ').trim();

const isValidReminderDate = (value?: string) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalizeIncorpReminderText(value));
    if (!match) return false;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const parsed = new Date(year, month - 1, day);

    return !Number.isNaN(parsed.getTime())
        && parsed.getFullYear() === year
        && parsed.getMonth() === month - 1
        && parsed.getDate() === day;
};

const daysSinceReminderDate = (value?: string, now = new Date()) => {
    if (!isValidReminderDate(value)) return null;
    const [year, month, day] = normalizeIncorpReminderText(value).split('-').map(Number);
    const parsed = new Date(year, month - 1, day);
    return Math.floor((now.getTime() - parsed.getTime()) / (1000 * 60 * 60 * 24));
};

const isFutureReminderDate = (value?: string, now = new Date()) => {
    if (!isValidReminderDate(value)) return false;
    const [year, month, day] = normalizeIncorpReminderText(value).split('-').map(Number);
    const parsed = new Date(year, month - 1, day);
    return parsed.getTime() > now.getTime();
};

const isReminderNuansExpired = (value?: string, now = new Date()) => {
    const diff = daysSinceReminderDate(value, now);
    return diff !== null && diff > 90;
};

const isReminderPositiveInteger = (value: any) => Number.isInteger(value) && Number(value) > 0;
const isReminderNonNegativeInteger = (value: any) => Number.isInteger(value) && Number(value) >= 0;

const shareClassReminderKey = (value: { id?: string; className?: string }) => {
    const explicitId = normalizeIncorpReminderText(value.id);
    if (explicitId) return explicitId;
    return normalizeIncorpReminderText(value.className).toLowerCase();
};

const shareholderShareClassReminderKey = (value: { shareClassId?: string; shareClass?: string }) => {
    const explicitId = normalizeIncorpReminderText(value.shareClassId);
    if (explicitId) return explicitId;
    return normalizeIncorpReminderText(value.shareClass).toLowerCase();
};

const shareholderReminderKey = (value: { id?: string; shareholderId?: string; fullName?: string; subscriberName?: string; shareClassId?: string; shareClass?: string }) => {
    const explicitId = normalizeIncorpReminderText(value.shareholderId || value.id);
    if (explicitId) return explicitId;
    return [
        normalizeIncorpReminderText(value.fullName || value.subscriberName).toLowerCase(),
        shareholderShareClassReminderKey(value),
    ].filter(Boolean).join('::');
};

const getNextMissingIncorpReminderStep = (data: any): string | null => {
    const pre = data?.preIncorporation || {};
    const structure = data?.structureOwnership || {};
    const articles = data?.articles || {};
    const post = data?.postIncorpOrg || {};
    const issuance = data?.shareIssuance || {};
    const records = data?.corporateRecords || {};
    const registrations = data?.registrations || {};
    const banking = data?.bankingSetup || {};
    const isCBCA = pre?.jurisdiction === 'cbca';
    const isNamed = pre?.nameType === 'named';

    if (!pre?.jurisdiction || !pre?.nameType || !pre?.nameConfirmed) {
        return 'preIncorporation';
    }
    if (isNamed) {
        const nuansDate = pre?.nuansReport?.reportDate;
        if (
            !normalizeIncorpReminderText(pre?.proposedName)
            || !pre?.legalEnding
            || !nuansDate
            || !isValidReminderDate(nuansDate)
            || isFutureReminderDate(nuansDate)
            || isReminderNuansExpired(nuansDate)
            || !pre?.nuansReviewed
            || (pre?.nuansReport?.hasConflicts && !normalizeIncorpReminderText(pre?.nuansReport?.conflictDetails))
        ) {
            return 'preIncorporation';
        }
    }

    const shareClasses = structure?.shareClasses || [];
    const shareholders = structure?.initialShareholders || [];
    const directors = structure?.directors || [];
    const validShareClassKeys = new Set<string>();
    const shareClassNames = new Set<string>();
    const shareClassIds = new Set<string>();
    const shareholderKeys = new Set<string>();
    const directorKeys = new Set<string>();

    if (!shareClasses.length || !shareholders.length || !directors.length) {
        return 'structureOwnership';
    }

    for (const shareClass of shareClasses) {
        const name = normalizeIncorpReminderText(shareClass.className);
        const normalizedName = name.toLowerCase();
        const explicitId = normalizeIncorpReminderText(shareClass.id);

        if (!name) return 'structureOwnership';
        if (shareClassNames.has(normalizedName)) return 'structureOwnership';
        shareClassNames.add(normalizedName);

        if (explicitId) {
            if (shareClassIds.has(explicitId)) return 'structureOwnership';
            shareClassIds.add(explicitId);
        }

        if (shareClass.maxShares !== undefined && !isReminderNonNegativeInteger(shareClass.maxShares)) {
            return 'structureOwnership';
        }

        validShareClassKeys.add(shareClassReminderKey(shareClass));
    }

    for (const shareholder of shareholders) {
        const name = normalizeIncorpReminderText(shareholder.fullName);
        const classKey = shareholderShareClassReminderKey(shareholder);
        const key = shareholderReminderKey(shareholder);

        if (!name || !classKey || !validShareClassKeys.has(classKey) || !isReminderPositiveInteger(shareholder.numberOfShares)) {
            return 'structureOwnership';
        }
        if (key && shareholderKeys.has(key)) return 'structureOwnership';
        if (key) shareholderKeys.add(key);
    }

    for (const director of directors) {
        const name = normalizeIncorpReminderText(director.fullName);
        const key = normalizeIncorpReminderText(director.id) || name.toLowerCase();

        if (!name || !normalizeIncorpReminderText(director.address)) return 'structureOwnership';
        if (key && directorKeys.has(key)) return 'structureOwnership';
        if (key) directorKeys.add(key);
    }

    if (
        !normalizeIncorpReminderText(structure.registeredOfficeAddress)
        || !structure.registeredOfficeProvince
        || (pre?.jurisdiction === 'obca' && structure.registeredOfficeProvince !== 'ON')
        || (isCBCA && !normalizeIncorpReminderText(structure.recordsOfficeAddress))
    ) {
        return 'structureOwnership';
    }

    const currentDirectorCount = directors.filter((director: any) => !!normalizeIncorpReminderText(director.fullName)).length;
    if (
        (isNamed && !normalizeIncorpReminderText(articles?.corporateName))
        || !normalizeIncorpReminderText(articles?.registeredAddress)
        || !articles?.directorCountType
        || !normalizeIncorpReminderText(articles?.shareCapitalDescription)
        || !articles?.filingMethod
        || (pre?.jurisdiction === 'obca' && articles?.filingMethod !== 'obr')
        || (isCBCA && articles?.filingMethod !== 'corporations_canada')
    ) {
        return 'articles';
    }
    if (
        (articles?.directorCountType === 'fixed' && (!isReminderPositiveInteger(articles?.directorCountFixed) || articles?.directorCountFixed !== currentDirectorCount))
        || (
            articles?.directorCountType === 'range'
            && (
                !isReminderPositiveInteger(articles?.directorCountMin)
                || !isReminderPositiveInteger(articles?.directorCountMax)
                || articles?.directorCountMax < articles?.directorCountMin
                || currentDirectorCount < articles?.directorCountMin
                || currentDirectorCount > articles?.directorCountMax
            )
        )
    ) {
        return 'articles';
    }

    const consents = post?.directorConsents || [];
    const directorConsentKeys = new Set(
        consents.map((consent: any) => normalizeIncorpReminderText(consent.directorId || consent.id) || normalizeIncorpReminderText(consent.directorName).toLowerCase()).filter(Boolean)
    );
    if (
        !post?.generalByLawDrafted
        || (post?.bankingByLawSeparate && !post?.bankingByLawDrafted)
        || !post?.orgResolutionsPrepared
        || !post?.officeResolutionPassed
        || consents.length !== directors.length
        || directorConsentKeys.size !== consents.length
    ) {
        return 'postIncorpOrg';
    }
    for (const consent of consents) {
        if (
            !normalizeIncorpReminderText(consent.directorName)
            || (consent.consentSigned && !consent.consentDate)
            || (consent.consentDate && !consent.consentSigned)
            || (consent.consentDate && (!isValidReminderDate(consent.consentDate) || isFutureReminderDate(consent.consentDate)))
        ) {
            return 'postIncorpOrg';
        }
    }

    const agreements = issuance?.subscriptionAgreements || [];
    const shareholderMap = new Map<string, any>();
    shareholders.forEach((shareholder: any) => {
        const key = shareholderReminderKey(shareholder);
        if (key) shareholderMap.set(key, shareholder);
    });

    if (
        !agreements.length
        || agreements.length !== shareholders.length
        || !issuance?.certificateType
        || !issuance?.securitiesRegisterComplete
        || !issuance?.considerationCollected
    ) {
        return 'shareIssuance';
    }

    const agreementKeys = agreements
        .map((agreement: any) => shareholderReminderKey(agreement))
        .filter(Boolean) as string[];
    if (
        new Set(agreementKeys).size !== agreements.length
        || [...shareholderMap.keys()].some((key) => !agreementKeys.includes(key))
        || agreementKeys.some((key: string) => !shareholderMap.has(key))
    ) {
        return 'shareIssuance';
    }

    for (const agreement of agreements) {
        const name = normalizeIncorpReminderText(agreement.subscriberName);
        const key = shareholderReminderKey(agreement);
        const classKey = shareholderShareClassReminderKey(agreement);
        const shareholder = key ? shareholderMap.get(key) : null;

        if (
            !name
            || !classKey
            || !validShareClassKeys.has(classKey)
            || !shareholder
            || (shareholder.id && normalizeIncorpReminderText(agreement.shareholderId) !== normalizeIncorpReminderText(shareholder.id))
            || shareholderShareClassReminderKey(shareholder) !== classKey
            || shareholder.numberOfShares !== agreement.numberOfShares
            || !isReminderPositiveInteger(agreement.numberOfShares)
            || !normalizeIncorpReminderText(agreement.subscriberAddress)
            || (agreement.considerationAmount || 0) < 0
        ) {
            return 'shareIssuance';
        }
    }

    const effectiveRecords = {
        hasArticlesAndCertificate: !!(records?.hasArticlesAndCertificate || articles?.certificateReceived),
        hasByLaws: !!(records?.hasByLaws || post?.generalByLawDrafted),
        hasDirectorMinutes: !!records?.hasDirectorMinutes,
        hasShareholderMinutes: !!records?.hasShareholderMinutes,
        hasWrittenResolutions: !!records?.hasWrittenResolutions,
        hasSecuritiesRegister: !!(records?.hasSecuritiesRegister || issuance?.securitiesRegisterComplete),
        hasDirectorRegister: !!records?.hasDirectorRegister,
        hasOfficerRegister: !!records?.hasOfficerRegister,
        hasISCRegister: structure?.isReportingIssuer ? true : !!records?.hasISCRegister,
        hasUSACopy: structure?.requiresUSA ? !!records?.hasUSACopy : true,
        recordsLocationConfirmed: !!records?.recordsLocationConfirmed,
    };

    if (
        !effectiveRecords.hasArticlesAndCertificate
        || !effectiveRecords.hasByLaws
        || !effectiveRecords.hasDirectorMinutes
        || !effectiveRecords.hasShareholderMinutes
        || !effectiveRecords.hasWrittenResolutions
        || !effectiveRecords.hasSecuritiesRegister
        || !effectiveRecords.hasDirectorRegister
        || !effectiveRecords.hasOfficerRegister
        || !effectiveRecords.recordsLocationConfirmed
        || !effectiveRecords.hasISCRegister
        || !effectiveRecords.hasUSACopy
    ) {
        return 'corporateRecords';
    }

    if (
        !registrations?.craRegistered
        || !/^\d{9}$/.test(String(registrations?.craBusinessNumber || '').replace(/[\s-]+/g, ''))
        || (registrations?.hstGstRegistered && !/^\d{9}RT\d{4}$/i.test(String(registrations?.hstGstNumber || '').replace(/[\s-]+/g, '')))
        || (registrations?.payrollAccountRegistered && !/^\d{9}RP\d{4}$/i.test(String(registrations?.payrollAccountNumber || '').replace(/[\s-]+/g, '')))
        || (isCBCA && registrations?.extraProvincialRegistered && !(registrations?.extraProvincialProvinces || []).length)
        || (registrations?.wsibRegistered && !normalizeIncorpReminderText(registrations?.wsibAccountNumber))
        || (registrations?.municipalLicences || []).some((licence: any) => !normalizeIncorpReminderText(licence?.municipality) || !normalizeIncorpReminderText(licence?.licenceType))
    ) {
        return 'registrations';
    }

    const minuteBookReady = !!(banking?.minuteBookSetup || records?.recordsLocationConfirmed);
    if (
        !banking?.bankAccountOpened
        || !normalizeIncorpReminderText(banking?.bankName)
        || normalizeIncorpReminderText(banking?.bankName) === 'Other'
        || !minuteBookReady
        || (banking?.accountantEngaged && !normalizeIncorpReminderText(banking?.accountantName))
        || (banking?.insuranceObtained && !(banking?.insuranceTypes || []).length)
        || (banking?.agreementsDrafted && !(banking?.agreementTypes || []).length)
        || (issuance?.certificateType === 'uncertificated' && banking?.shareCertificatesOrdered)
    ) {
        return 'bankingSetup';
    }

    return null;
};

const getIncorpReminderMessage = (step: string | null) => {
    if (step === 'preIncorporation') {
        return 'Your incorporation draft still needs the jurisdiction and company naming details finalized.';
    }
    if (step === 'structureOwnership') {
        return 'Please finish the ownership structure so we know the directors, shareholders, and share classes.';
    }
    if (step === 'articles') {
        return 'The Articles of Incorporation section still needs to be completed before legal review can begin.';
    }
    if (step === 'postIncorpOrg') {
        return 'Your post-incorporation organizational documents are still incomplete.';
    }
    if (step === 'shareIssuance') {
        return 'Please complete the initial share issuance details so your corporation can be set up properly.';
    }
    if (step === 'corporateRecords') {
        return 'The corporate records and minute book checklist still needs your attention.';
    }
    if (step === 'registrations') {
        return 'Your business registration details still need to be completed before we can finalize the file.';
    }
    if (step === 'bankingSetup') {
        return 'Please complete the banking and setup section so the incorporation package is ready for review.';
    }
    return "We noticed you haven't completed your incorporation intake yet.";
};

export const createIntake = async (req: AuthRequest, res: Response) => {
    const userId = getRequestUserIdOrUndefined(req);
    if (!userId) {
        throw new ForbiddenError('create an intake');
    }

    const type = req.body.type === 'incorporation' ? 'incorporation' : 'will';
    const existing = await Intake.findOne({
        clientId: userId,
        type,
        status: 'started',
        ...ACTIVE_INTAKE_FILTER,
    }).sort({ updatedAt: -1, createdAt: -1 });

    if (existing) {
        return res.json(toNormalizedIntakeResponse(existing));
    }

    const intake = new Intake({
        clientId: userId,
        type,
        status: 'started',
        data: {},
        flags: [],
    });
    await intake.save();
    res.status(201).json(toNormalizedIntakeResponse(intake));
};

export const getUserIntake = async (req: AuthRequest, res: Response) => {
    const userId = getRequestUserIdOrUndefined(req);
    if (!userId) {
        throw new ForbiddenError('access intake drafts');
    }

    const intake = await Intake.findOne({
        clientId: userId,
        status: 'started',
        ...ACTIVE_INTAKE_FILTER,
    }).sort({ updatedAt: -1, createdAt: -1 });

    if (!intake) {
        throw new NotFoundError('Intake');
    }

    res.json(toNormalizedIntakeResponse(intake));
};

export const getAllUserIntakes = async (req: AuthRequest, res: Response) => {
    const userId = getRequestUserIdOrUndefined(req);
    if (!userId) {
        throw new ForbiddenError('access intakes');
    }

    const intakes = await Intake
        .find({ clientId: userId, ...ACTIVE_INTAKE_FILTER })
        .select('-notes -logicWarnings -aiSummary -priorityScore')
        .sort({ createdAt: -1 });

    res.json(intakes.map(toNormalizedIntakeResponse));
};

export const resetIntake = async (req: AuthRequest, res: Response) => {
    const intake = await loadAccessibleIntake(req, res, {
        ownerOnly: true,
        action: 'reset',
    });
    if (!intake) return;

    if (intake.status !== 'started') {
        throw new ConflictError(`Cannot reset an intake with status '${intake.status}'. Only draft (started) intakes may be reset.`);
    }

    logger.warn({
        intakeId: intake._id,
        clientId: intake.clientId,
        type: intake.type,
        status: intake.status,
        action: 'client_reset_intake',
    }, 'Intake soft deleted by client reset');

    intake.isDeleted = true;
    intake.deletedAt = new Date();
    await intake.save();
    return res.status(204).send();
};

export const getIntake = async (req: AuthRequest, res: Response) => {
    const intake = await loadAccessibleIntake(req, res, { action: 'view' });
    if (!intake) return;

    res.json(toNormalizedIntakeResponse(intake));
};

export const updateIntake = async (req: AuthRequest, res: Response) => {
    const { data, status } = req.body;

    const intake = await loadAccessibleIntake(req, res, { action: 'update' });
    if (!intake) return;

    const intakeType = (intake.type || 'will') as 'will' | 'incorporation';
    const actorRole = getClientRole(req);

    if (status !== undefined && actorRole === 'client') {
        throw new ForbiddenError('change intake status');
    }

    if (req.body.expectedVersion !== undefined) {
        const clientVersion = Number(req.body.expectedVersion);
        const serverVersion = Number(intake.__v ?? 0);
        if (serverVersion !== clientVersion) {
            throw new ConflictError('The data was changed in another tab or device. Please reload.');
        }
    }

    const oldData = normalizeDataByType(intakeType, cloneSerializable(intake.data || {}));
    let nextData = oldData;
    let autoNoteSuggestion: string | null = null;

    if (data) {
        const mergedData = deepMergeIntakeData(oldData, data);
        const validation = validatePayloadForIntake(intakeType, mergedData);
        if (!validation.success) {
            throw new ValidationError('Validation Failed', validation.error.issues);
        }
        nextData = validation.data;

        if (intakeType === 'will') {
            autoNoteSuggestion = generateAutoNote(oldData, nextData);
        }
    }

    const nextStatus = (status || intake.status) as 'started' | 'submitted' | 'reviewing' | 'completed';
    nextData = syncSubmissionFields(intakeType, nextData, nextStatus);

    intake.data = nextData as any;
    intake.markModified('data');
    intake.status = nextStatus;
    syncLifecycleTimestamps(intake, nextStatus);
    intake.aiSummary = undefined;
    applyDerivedState(intake, intakeType, nextData);

    intake.increment();
    await intake.save();
    await emitIntakeRealtimeUpdate(intake);

    res.json({
        ...toNormalizedIntakeResponse(intake),
        autoNoteSuggestion,
        expectedVersion: Number(intake.__v ?? 0),
    });
};

export const submitWillIntake = async (req: AuthRequest, res: Response) => {
    const intake = await loadAccessibleIntake(req, res, {
        ownerOnly: true,
        expectedType: 'will',
        action: 'submit',
    });
    if (!intake) return;

    if (intake.status !== 'started') {
        throw new ConflictError('Intake has already been submitted');
    }

    const data = normalizeWillIntakeData(cloneSerializable(intake.data || {}));
    if (req.body.clientNotes !== undefined) {
        data.clientNotes = typeof req.body.clientNotes === 'string'
            ? req.body.clientNotes.trim() || undefined
            : undefined;
    }

    const blockingSections = IntakeValidationService.getWillSubmissionBlockingSections(data as IntakeData);
    if (blockingSections.length > 0) {
        return res.status(422).json({
            error: 'Will intake is incomplete',
            code: 'UNPROCESSABLE_ENTITY',
            blockingSections,
        });
    }

    const submittedData = syncSubmissionFields('will', data, 'submitted');
    intake.data = submittedData as any;
    intake.markModified('data');
    intake.status = 'submitted';
    syncLifecycleTimestamps(intake, 'submitted');
    intake.aiSummary = undefined;
    applyDerivedState(intake, 'will', submittedData);

    try {
        const autoNote = generateAutoNote({}, submittedData);
        if (autoNote) {
            intake.notes = intake.notes || [];
            intake.notes.push({
                text: `[Auto] Will intake submitted by client. ${autoNote}`,
                author: 'System',
                createdAt: new Date(),
            } as any);
        }
    } catch {
        // Best-effort only
    }

    await intake.save();
    await emitIntakeRealtimeUpdate(intake);

    res.json({
        message: 'Intake submitted successfully',
        id: intake._id,
        status: intake.status,
        submissionDate: (submittedData as any).submissionDate,
        flags: intake.flags || [],
        logicWarnings: intake.logicWarnings || [],
    });
};

export const handleCopilotChat = async (req: AuthRequest, res: Response) => {
    const { intakeId, message } = req.body;

    if (!mongoose.Types.ObjectId.isValid(intakeId)) {
        throw new BadRequestError('Invalid intake id');
    }

    const intake = await Intake.findOne({ _id: intakeId, ...ACTIVE_INTAKE_FILTER });
    if (!intake) throw new NotFoundError('Intake');

    const reply = await generateAIResponse(message, intake.data, 'general');
    res.json({ reply });
};

export const handleGetSuggestions = async (req: AuthRequest, res: Response) => {
    const intake = await loadAccessibleIntake(req, res, {
        action: 'view',
        expectedType: 'will',
    });
    if (!intake) return;

    const suggestions = await getClauseSuggestions(normalizeWillIntakeData(cloneSerializable(intake.data || {})));
    res.json({ suggestions });
};

export const addIntakeNote = async (req: AuthRequest, res: Response) => {
    const { text } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
        return res.status(400).json({ message: 'Note text required' });
    }

    const intake = await loadAccessibleIntake(req, res, { action: 'add notes to' });
    if (!intake) return;

    const role = req.user?.role ?? '';
    const userId = getRequestUserIdOrUndefined(req);
    const isOwner = intake.clientId.toString() === userId;
    const isStaff = role === 'lawyer' || role === 'admin';
    if (!isOwner && !isStaff) {
        throw new ForbiddenError('add notes to this intake');
    }

    const authorName = (req.user as any)?.name || req.user?.email || 'User';
    const roleLabel = role === 'lawyer' ? 'Lawyer' : role === 'admin' ? 'Admin' : 'Client';

    const note = {
        text: text.trim(),
        author: `${authorName} (${roleLabel})`,
        createdAt: new Date(),
    };

    intake.notes = intake.notes || [];
    intake.notes.push(note as any);
    await intake.save();

    res.json(intake.notes);
};

export const smartImportAssets = async (req: AuthRequest, res: Response) => {
    const { text } = req.body;

    const intake = await loadAccessibleIntake(req, res, {
        ownerOnly: true,
        expectedType: 'will',
        action: 'import assets into',
    });
    if (!intake) return;

    let newAssets: any = {};
    if (req.file) {
        newAssets = await parseAssetsFromFile(req.file.buffer, req.file.mimetype);
    } else if (text) {
        newAssets = await parseAssetsFromText(text);
    } else {
        throw new BadRequestError('No text or file provided');
    }

    const resolveImportCategory = (key: string): AssetCategoryKey => {
        if (key.includes('realEstate')) return 'realEstate';
        if (key.includes('bank')) return 'bankAccounts';
        if (key.includes('invest')) return 'investments';
        if (key.includes('business')) return 'business';
        if (key.includes('foreign')) return 'foreignAssets';
        if (key.includes('vehicle')) return 'vehicles';
        if (key.includes('digital')) return 'digital';
        return 'other';
    };

    const currentData = normalizeWillIntakeData(cloneSerializable(intake.data || {}));
    const assets = normalizeAssets(currentData.assets);
    const seenSignatures = new Set(assets.list.map((asset) => getAssetSignature(asset)));
    let importedAssetCount = 0;

    for (const [key, items] of Object.entries(newAssets)) {
        if (!Array.isArray(items) || items.length === 0) {
            continue;
        }

        const category = resolveImportCategory(key);
        const mappedItems = items.map((item: any) => normalizeAssetItem({
            description: typeof item === 'string' ? item : item.description,
            value: typeof item === 'string' ? undefined : item.value,
            ownership: typeof item === 'string' ? undefined : item.ownership,
            jointOwner: typeof item === 'string' ? undefined : item.jointOwner,
            hasBeneficiaryDesignation: typeof item === 'string' ? undefined : item.hasBeneficiaryDesignation,
        }, category));

        mappedItems.forEach((asset) => {
            const signature = getAssetSignature(asset);
            if (seenSignatures.has(signature)) {
                return;
            }

            seenSignatures.add(signature);
            assets.list.push(asset);
            importedAssetCount += 1;
        });
    }

    if (importedAssetCount > 0) {
        assets.confirmedNoSignificantAssets = false;
    }

    const mergedData = syncSubmissionFields('will', normalizeWillIntakeData({ ...currentData, assets }), intake.status as any);
    intake.data = mergedData as any;
    syncLifecycleTimestamps(intake, intake.status as 'started' | 'submitted' | 'reviewing' | 'completed');
    intake.flags = generateFlags(mergedData);
    intake.logicWarnings = validateLogic(mergedData) as any;
    intake.priorityScore = calculatePriorityScore(mergedData);
    intake.aiSummary = undefined;
    intake.markModified('data');
    intake.increment();
    await intake.save();
    await emitIntakeRealtimeUpdate(intake);

    res.json({ ...toNormalizedIntakeResponse(intake), expectedVersion: Number(intake.__v ?? 0) });
};

export const handleExplainRisk = async (req: AuthRequest, res: Response) => {
    const { flagCode } = req.body;
    if (!flagCode) throw new BadRequestError('Flag code required');

    const intake = await loadAccessibleIntake(req, res, { action: 'view' });
    if (!intake) return;

    const normalizedData = normalizeDataByType(intake.type, cloneSerializable(intake.data || {}));
    const explanation = await explainRisk(flagCode, normalizedData);
    res.json({ explanation });
};

export const handleValidateLogic = async (req: AuthRequest, res: Response) => {
    const { context } = req.body;
    const intake = await loadAccessibleIntake(req, res, { action: 'view' });
    if (!intake) return;

    const normalizedData = normalizeDataByType(intake.type, cloneSerializable(intake.data || {}));
    const warning = await validateIntakeLogic(normalizedData, context || 'general');
    res.json({ warning });
};

export const handleStressTest = async (req: AuthRequest, res: Response) => {
    const { context } = req.body;
    const intake = await loadAccessibleIntake(req, res, { action: 'view' });
    if (!intake) return;

    const normalizedData = normalizeDataByType(intake.type, cloneSerializable(intake.data || {}));
    const questions = await runStressTest(normalizedData, context || 'general');
    res.json({ questions });
};

export const sendNudge = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    if (!['lawyer', 'admin'].includes(req.user?.role ?? '')) {
        throw new ForbiddenError('send nudge');
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new BadRequestError('Invalid intake id');
    }

    const NUDGE_COOLDOWN_MS = 24 * 60 * 60 * 1000;
    const cooldownThreshold = new Date(Date.now() - NUDGE_COOLDOWN_MS);

    try {
        const intake = await Intake.findOne({
            _id: id,
            status: 'started',
            ...ACTIVE_INTAKE_FILTER,
            $or: [
                { reminderSentAt: { $exists: false } },
                { reminderSentAt: { $lte: cooldownThreshold } },
            ],
        }).populate('clientId');

        if (!intake) {
            const existing = await Intake.findById(id);
            if (!existing || existing.isDeleted) {
                throw new NotFoundError('Intake');
            }
            if (existing.status !== 'started') {
                throw new ConflictError('Only draft intakes can receive reminder emails.');
            }
            throw new ConflictError('A reminder was already sent in the last 24 hours. Please wait before sending another.');
        }

        const clientEmail = (intake.clientId as any)?.email;
        if (!clientEmail) {
            throw new BadRequestError('Client email unavailable for this intake');
        }

        const normalizedData = normalizeDataByType(intake.type, cloneSerializable(intake.data || {}));
        const clientName = intake.clientName
            || (normalizedData as any)?.personalProfile?.fullName
            || (normalizedData as any)?.preIncorporation?.proposedName
            || 'Client';

        let logic: string | null = null;
        let message = "We noticed you haven't completed your intake yet.";

        if (intake.type === 'incorporation') {
            logic = getNextMissingIncorpReminderStep(normalizedData);
            message = getIncorpReminderMessage(logic);
        } else {
            logic = IntakeValidationService.getNextMissingStep(normalizedData as IntakeData);
            message = getWillReminderMessage(logic);
        }

        await sendReminderEmail(clientEmail, clientName, id, message);

        intake.reminderSentAt = new Date();
        intake.reminderCount = (intake.reminderCount || 0) + 1;

        const note = {
            text: `System: Reminder email sent to ${clientEmail}. Reason: ${logic || 'General'}`,
            author: 'System',
            createdAt: new Date(),
        };
        intake.notes = intake.notes || [];
        intake.notes.push(note as any);
        await intake.save();

        res.json({ message: 'Reminder sent', note, logic });
    } catch (error) {
        const errorMessage = String((error as any)?.message || '').toLowerCase();
        const errorCode = String((error as any)?.code || '').toUpperCase();
        if (
            errorCode.includes('MAIL')
            || errorMessage.includes('sendgrid')
            || errorMessage.includes('smtp')
            || errorMessage.includes('mail service')
        ) {
            throw new AppError(502, 'Failed to send reminder email - email service may be unavailable', 'EMAIL_ERROR');
        }
        throw error;
    }
};

export const handleLegalPhrasing = async (req: AuthRequest, res: Response) => {
    const { context, currentValue } = req.body;

    if (!context) throw new BadRequestError('Context required');

    const safeContext = sanitiseUserInput(context, 500, 'legalPhrasing.context');
    const safeCurrentValue = sanitiseUserInput(currentValue || 'Not provided', 500, 'legalPhrasing.currentValue');

    const prompt = `Convert this to proper legal terminology suitable for an Ontario Will:
<context>${safeContext}</context>
<current_value>${safeCurrentValue}</current_value>

Provide ONLY the legal phrasing, no explanations. Keep it brief (one sentence max).`;

    try {
        const suggestion = await generateAIResponse(prompt, {}, 'legal_phrasing');
        res.json({ suggestion: suggestion.trim() });
    } catch {
        res.json({ suggestion: '' });
    }
};

export const handleGetInsight = async (req: AuthRequest, res: Response) => {
    const intake = await loadAccessibleIntake(req, res, {
        ownerOnly: true,
        action: 'access this insight for',
    });
    if (!intake) return;

    if (intake.type === 'incorporation') {
        const normalizedData = normalizeIncorpData(cloneSerializable(intake.data || {}));
        const hasData = normalizedData && Object.keys(normalizedData).length > 0;

        if (!hasData) {
            return res.json({
                insight: 'You should start with your jurisdiction and company naming details so we can confirm whether this is an Ontario or federal incorporation and whether you need a named or numbered corporation.',
                step: 'preIncorporation',
            });
        }

        const missingStep = getNextMissingIncorpReminderStep(normalizedData);
        const insightSummary = summariseIncorpForDashboardInsight(normalizedData, missingStep);
        const summaryString = compactStringify(insightSummary);

        const prompt = `You are a friendly Canadian incorporation assistant. Based on the following completion summary of a corporate setup questionnaire, identify the single most important next action for this client. Be warm, direct, and specific. Max 2 sentences. Do not mention "intake form". Start with "You" or a specific observation.

<context>${summaryString}</context>

<most_incomplete_section>${missingStep || 'review'}</most_incomplete_section>

Respond with ONLY the 2-sentence insight. No preamble.`;

        const insight = await generateAIResponse(prompt, {}, 'dashboard_insight');

        return res.json({
            insight: insight.trim(),
            step: missingStep || 'review',
        });
    }

    const normalizedData = normalizeWillIntakeData(cloneSerializable(intake.data || {}));
    const hasData = normalizedData && Object.keys(normalizedData).length > 0;
    if (!hasData) {
        return res.json({
            insight: 'Start by completing your Personal Profile. It only takes 2 minutes and unlocks the rest of your estate plan.',
            step: 'profile',
        });
    }

    const missingStep = IntakeValidationService.getNextMissingStep(normalizedData as IntakeData);
    const insightSummary = summariseForInsight(normalizedData as any);
    const summaryString = compactStringify(insightSummary);

    const prompt = `You are a friendly Canadian estate planning assistant. Based on the following completion summary of a will intake, identify the single most important next action for this client. Be warm, direct, and specific. Max 2 sentences. Do not mention "will" or "intake form". Start with "You" or a specific observation.

<context>${summaryString}</context>

<most_incomplete_section>${missingStep || 'review'}</most_incomplete_section>

Respond with ONLY the 2-sentence insight. No preamble.`;

    const insight = await generateAIResponse(prompt, {}, 'dashboard_insight');

    res.json({
        insight: insight.trim(),
        step: missingStep || 'review',
    });
};

export const handleGenerateSummary = async (req: AuthRequest, res: Response) => {
    const intake = await loadAccessibleIntake(req, res, {
        ownerOnly: true,
        action: 'view',
    });
    if (!intake) return;

    if (intake.aiSummary) {
        return res.json({ summary: intake.aiSummary });
    }

    if (intake.type === 'incorporation') {
        const normalizedData = normalizeIncorpData(cloneSerializable(intake.data || {}));
        const nextMissingStep = getNextMissingIncorpReminderStep(normalizedData);
        const summaryContext = summariseIncorpForDashboardSummary(
            normalizedData,
            intake.status as 'started' | 'submitted' | 'reviewing' | 'completed',
            nextMissingStep
        );
        const contextString = compactStringify(summaryContext);

        const prompt = `You are a Canadian incorporation assistant summarizing a client's business incorporation setup for them to review.

Write a clear, plain-English summary in exactly 4 sentences. Use the company's actual name and the participants' actual names where available. Do not use legal jargon. Summarize the company's setup and current progress or readiness in a way that fits a dashboard card.

<context>${contextString}</context>

Summary:`;

        const summary = await generateAIResponse(prompt, {}, 'estate_summary');

        intake.aiSummary = summary.trim();
        await intake.save();

        return res.json({ summary: intake.aiSummary });
    }

    const normalizedData = normalizeWillIntakeData(cloneSerializable(intake.data || {}));
    const insightContext = summariseForInsight(normalizedData as IntakeData);
    const nameContext = {
        clientName: (normalizedData as any)?.personalProfile?.fullName,
        spouseName: (normalizedData as any)?.family?.spouseName,
        executorName: (normalizedData as any)?.executors?.primary?.fullName,
        childNames: ((normalizedData as any)?.family?.children || []).map((child: any) => child.fullName).filter(Boolean),
        beneficiaryNames: ((normalizedData as any)?.beneficiaries?.beneficiaries || []).map((beneficiary: any) => ({
            name: beneficiary.fullName,
            share: beneficiary.share,
        })),
    };
    const contextString = compactStringify({ ...insightContext, ...nameContext });

    const prompt = `You are a Canadian estate planning assistant summarizing a client's will instructions for them to review.

Write a clear, plain-English summary in exactly 4 sentences. Use the client's actual names. Do not use legal jargon. Start with "You are leaving your estate to..."

<context>${contextString}</context>

Summary:`;

    const summary = await generateAIResponse(prompt, {}, 'estate_summary');

    intake.aiSummary = summary.trim();
    await intake.save();

    res.json({ summary: intake.aiSummary });
};
