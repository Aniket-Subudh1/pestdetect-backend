const mongoose = require('mongoose');

const detectionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  image: {
    originalName: String,
    filename: String,
    path: String,
    size: Number,
    mimetype: String
  },
  type: {
    type: String,
    enum: ['disease', 'pest'],
    required: true
  },
  result: {
    detectedClass: {
      type: String,
      required: true
    },
    confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 1
    },
    description: String,
    treatment: String,
    pesticide: {
      name: String,
      dosage: String,
      type: String
    }
  },
  location: {
    latitude: Number,
    longitude: Number,
    address: String
  },
  status: {
    type: String,
    enum: ['detected', 'verified', 'treated'],
    default: 'detected'
  }
}, {
  timestamps: true
});

// Index for better query performance
detectionSchema.index({ user: 1, createdAt: -1 });
detectionSchema.index({ type: 1 });
detectionSchema.index({ 'result.detectedClass': 1 });

module.exports = mongoose.model('Detection', detectionSchema);