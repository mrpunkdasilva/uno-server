import mongoose from 'mongoose';

const apiUsageSchema = new mongoose.Schema(
  {
    endpoint: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    method: {
      type: String,
      required: true,
      enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
      index: true,
    },
    statusCode: {
      type: Number,
      required: true,
      index: true,
    },
    responseTime: {
      type: Number,
      required: true,
      // Response time in milliseconds
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    userId: {
      type: String,
      default: null,
      index: true,
    },
    userAgent: {
      type: String,
      default: null,
    },
    ipAddress: {
      type: String,
      default: null,
    },
    queryParams: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    errorMessage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: false,
    collection: 'api_usage',
  },
);

apiUsageSchema.index({ endpoint: 1, method: 1 });
apiUsageSchema.index({ timestamp: -1 });
apiUsageSchema.index({ endpoint: 1, timestamp: -1 });

// Delete old records after 90 days
apiUsageSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 });

const ApiUsage = mongoose.model('ApiUsage', apiUsageSchema);

export default ApiUsage;
