import mongoose from 'mongoose';

const appVersionSchema = new mongoose.Schema(
  {
    platform: {
      type: String,
      required: true,
      enum: ['ios', 'android'],
      lowercase: true,
      trim: true,
    },
    latestVersion: {
      type: String,
      required: true,
      trim: true,
    },
    minimumVersion: {
      type: String,
      required: true,
      trim: true,
    },
    forceUpdate: {
      type: Boolean,
      default: false,
    },
    message: {
      type: String,
      default: 'Update available',
    },
    storeUrl: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

appVersionSchema.index({ platform: 1, isActive: 1 }, { unique: true });

const AppVersion = mongoose.model('AppVersion', appVersionSchema);

export default AppVersion;
