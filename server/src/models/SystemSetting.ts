import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISystemSetting extends Document {
    key: string;
    value: any;
    createdAt: Date;
    updatedAt: Date;
}

const SystemSettingSchema = new Schema<ISystemSetting>({
    key: {
        type: String,
        required: true,
        unique: true,
        index: true,
        trim: true,
    },
    value: {
        type: Schema.Types.Mixed,
        required: true,
    },
}, {
    timestamps: true,
});

const SystemSetting: Model<ISystemSetting> = mongoose.models.SystemSetting
    || mongoose.model<ISystemSetting>('SystemSetting', SystemSettingSchema);

export default SystemSetting;
