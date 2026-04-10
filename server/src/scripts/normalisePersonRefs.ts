import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env
const envPath = path.resolve(__dirname, '../../../../.env'); // from dist usually, but handle it via standard ts-node
dotenv.config({ path: envPath });

// Must copy Intake model over since this runs standalone
import Intake from '../models/Intake';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/willguide';

const normaliseValue = (val: any): string | undefined => {
    if (!val) return undefined;
    if (typeof val === 'string') return val;
    if (typeof val === 'object' && val !== null && 'name' in val) {
        return val.name;
    }
    return undefined;
};

const processIntake = (data: any): boolean => {
    let modified = false;

    // Family
    if (data.family?.spouseName && typeof data.family.spouseName === 'object') {
        data.family.spouseName = normaliseValue(data.family.spouseName);
        modified = true;
    }

    // Executors
    if (data.executors?.primary?.fullName && typeof data.executors.primary.fullName === 'object') {
        data.executors.primary.fullName = normaliseValue(data.executors.primary.fullName);
        modified = true;
    }
    if (data.executors?.alternates && Array.isArray(data.executors.alternates)) {
        data.executors.alternates.forEach((alt: any) => {
            if (alt.fullName && typeof alt.fullName === 'object') {
                alt.fullName = normaliseValue(alt.fullName);
                modified = true;
            }
        });
    }

    // Guardians
    if (data.guardians?.primary?.fullName && typeof data.guardians.primary.fullName === 'object') {
        data.guardians.primary.fullName = normaliseValue(data.guardians.primary.fullName);
        modified = true;
    }
    if (data.guardians?.alternates && Array.isArray(data.guardians.alternates)) {
        data.guardians.alternates.forEach((alt: any) => {
            if (alt.fullName && typeof alt.fullName === 'object') {
                alt.fullName = normaliseValue(alt.fullName);
                modified = true;
            }
        });
    }

    // Beneficiaries
    if (data.beneficiaries?.beneficiaries && Array.isArray(data.beneficiaries.beneficiaries)) {
        data.beneficiaries.beneficiaries.forEach((ben: any) => {
            if (ben.fullName && typeof ben.fullName === 'object') {
                ben.fullName = normaliseValue(ben.fullName);
                modified = true;
            }
        });
    }

    // Assets
    if (data.assets?.list && Array.isArray(data.assets.list)) {
        data.assets.list.forEach((asset: any) => {
            if (asset.jointOwner && typeof asset.jointOwner === 'object') {
                asset.jointOwner = normaliseValue(asset.jointOwner);
                modified = true;
            }
        });
    }

    // POA
    if (data.poa?.property) {
        if (data.poa.property.primaryName && typeof data.poa.property.primaryName === 'object') {
            data.poa.property.primaryName = normaliseValue(data.poa.property.primaryName);
            modified = true;
        }
        if (data.poa.property.alternateName && typeof data.poa.property.alternateName === 'object') {
            data.poa.property.alternateName = normaliseValue(data.poa.property.alternateName);
            modified = true;
        }
    }
    if (data.poa?.personalCare) {
        if (data.poa.personalCare.primaryName && typeof data.poa.personalCare.primaryName === 'object') {
            data.poa.personalCare.primaryName = normaliseValue(data.poa.personalCare.primaryName);
            modified = true;
        }
        if (data.poa.personalCare.alternateName && typeof data.poa.personalCare.alternateName === 'object') {
            data.poa.personalCare.alternateName = normaliseValue(data.poa.personalCare.alternateName);
            modified = true;
        }
    }

    return modified;
};

const run = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to DB');

        const intakes = await Intake.find({});
        let updatedCount = 0;

        for (const intake of intakes) {
            if (intake.data) {
                // We need to mutate the actual object because it's a Mixed type
                const dataCopy = JSON.parse(JSON.stringify(intake.data));
                const modified = processIntake(dataCopy);

                if (modified) {
                    intake.data = dataCopy;
                    intake.markModified('data');
                    await intake.save();
                    updatedCount++;
                }
            }
        }

        console.log(`Successfully normalised ${updatedCount} intakes.`);
        process.exit(0);
    } catch (error) {
        console.error('Error running script:', error);
        process.exit(1);
    }
};

run();
