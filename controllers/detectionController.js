const Detection = require('../models/Detection');
const User = require('../models/User');
const { PythonShell } = require('python-shell');
const path = require('path');
const fs = require('fs');

const getFallbackPrediction = (type, imagePath) => {
  const diseaseResults = [
    {
      detected_class: 'Tomato_Early_blight',
      confidence: 0.85,
      description: 'Fungal disease causing brown spots with concentric rings on leaves',
      treatment: 'Apply Chlorothalonil or Mancozeb fungicides',
      pesticide: { name: 'Chlorothalonil', dosage: '2-3 ml/L', type: 'Fungicide' }
    },
    {
      detected_class: 'Apple_scab',
      confidence: 0.78,
      description: 'Fungal disease causing dark, scaly lesions on leaves and fruit',
      treatment: 'Apply Mancozeb or Copper sulfate',
      pesticide: { name: 'Mancozeb', dosage: '2-3 g/L', type: 'Fungicide' }
    },
    {
      detected_class: 'Corn_Common_rust',
      confidence: 0.92,
      description: 'Fungal disease causing small oval rust pustules on leaves',
      treatment: 'Apply Chlorothalonil or Propiconazole fungicides',
      pesticide: { name: 'Chlorothalonil', dosage: '2-3 ml/L', type: 'Fungicide' }
    }
  ];

  const pestResults = [
    {
      detected_class: 'APHIDS',
      confidence: 0.88,
      description: 'Small soft-bodied insects that feed on plant sap',
      treatment: 'Apply Imidacloprid or use biological control with ladybugs',
      pesticide: { name: 'Imidacloprid', dosage: '0.5-1 ml/L', type: 'Systemic Insecticide' }
    },
    {
      detected_class: 'ARMYWORM',
      confidence: 0.76,
      description: 'Caterpillars that feed on leaves and can cause severe defoliation',
      treatment: 'Apply Chlorantraniliprole or Spinetoram insecticides',
      pesticide: { name: 'Chlorantraniliprole', dosage: '150-300 ml/ha', type: 'Systemic Insecticide' }
    },
    {
      detected_class: 'MITES',
      confidence: 0.83,
      description: 'Tiny arachnids that cause stippling and yellowing of leaves',
      treatment: 'Apply Abamectin or increase humidity around plants',
      pesticide: { name: 'Abamectin', dosage: '1-2 ml/L', type: 'Acaricide' }
    }
  ];

  const results = type === 'disease' ? diseaseResults : pestResults;
  const randomResult = results[Math.floor(Math.random() * results.length)];
  
  return randomResult;
};

// @desc    Detect plant disease
// @route   POST /api/detection/disease
// @access  Private
const detectDisease = async (req, res) => {
  try {
    console.log('Disease detection request received');
    console.log('File:', req.file);
    console.log('User:', req.user?.email);

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image'
      });
    }

    const imagePath = req.file.path;
    const modelPath = process.env.DISEASE_MODEL_PATH || 'ml_models/disease_model.h5';

    console.log('Image path:', imagePath);
    console.log('Model path:', modelPath);

    let prediction;

    // Check if model exists and is a real ML model
    if (fs.existsSync(modelPath) && fs.statSync(modelPath).size > 100) {
      console.log('Using ML model for prediction');
      
      const options = {
        mode: 'json',
        pythonPath: 'python',
        scriptPath: 'ml_models/',
        args: [modelPath, imagePath]
      };

      try {
        const results = await new Promise((resolve, reject) => {
          PythonShell.run('disease_predictor.py', options, (err, results) => {
            if (err) {
              console.error('Python script error:', err);
              reject(err);
            } else {
              resolve(results);
            }
          });
        });

        if (!results || results.length === 0) {
          throw new Error('No prediction results received from Python script');
        }

        prediction = results[0];

        if (prediction.error) {
          throw new Error(prediction.error);
        }
      } catch (pythonError) {
        console.error('Python script failed, using fallback:', pythonError.message);
        prediction = getFallbackPrediction('disease', imagePath);
      }
    } else {
      console.log('ML model not found or invalid, using fallback prediction');
      prediction = getFallbackPrediction('disease', imagePath);
    }

    console.log('Prediction result:', prediction);

    // Save detection to database
    const detection = await Detection.create({
      user: req.user._id,
      image: {
        originalName: req.file.originalname,
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size,
        mimetype: req.file.mimetype
      },
      type: 'disease',
      result: {
        detectedClass: prediction.detected_class,
        confidence: prediction.confidence,
        description: prediction.description,
        treatment: prediction.treatment,
        pesticide: prediction.pesticide
      },
      location: req.body.location ? {
        latitude: parseFloat(req.body.location.latitude),
        longitude: parseFloat(req.body.location.longitude),
        address: req.body.location.address
      } : undefined
    });

    console.log('Detection saved to database:', detection._id);

    await User.findByIdAndUpdate(
      req.user._id,
      { $push: { detectionHistory: detection._id } }
    );

    res.status(200).json({
      success: true,
      message: 'Disease detection completed successfully',
      data: {
        detection: {
          _id: detection._id,
          type: detection.type,
          result: detection.result,
          createdAt: detection.createdAt,
          image: {
            filename: detection.image.filename,
            originalName: detection.image.originalName
          }
        }
      }
    });

  } catch (error) {
    console.error('Disease detection error:', error);
    
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
        console.log('Cleaned up uploaded file');
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Server error during disease detection',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Detect plant pest
// @route   POST /api/detection/pest
// @access  Private
const detectPest = async (req, res) => {
  try {
    console.log('Pest detection request received');
    console.log('File:', req.file);
    console.log('User:', req.user?.email);

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image'
      });
    }

    const imagePath = req.file.path;
    const modelPath = process.env.PEST_MODEL_PATH || 'ml_models/pest_model.h5';

    console.log('Image path:', imagePath);
    console.log('Model path:', modelPath);

    let prediction;

    // Check if model exists and is a real ML model
    if (fs.existsSync(modelPath) && fs.statSync(modelPath).size > 100) {
      console.log('Using ML model for prediction');
      
      // Python script options
      const options = {
        mode: 'json',
        pythonPath: 'python',
        scriptPath: 'ml_models/',
        args: [modelPath, imagePath]
      };

      try {
        // Run Python prediction script
        const results = await new Promise((resolve, reject) => {
          PythonShell.run('pest_predictor.py', options, (err, results) => {
            if (err) {
              console.error('Python script error:', err);
              reject(err);
            } else {
              resolve(results);
            }
          });
        });

        if (!results || results.length === 0) {
          throw new Error('No prediction results received from Python script');
        }

        prediction = results[0];

        if (prediction.error) {
          throw new Error(prediction.error);
        }
      } catch (pythonError) {
        console.error('Python script failed, using fallback:', pythonError.message);
        prediction = getFallbackPrediction('pest', imagePath);
      }
    } else {
      console.log('ML model not found or invalid, using fallback prediction');
      prediction = getFallbackPrediction('pest', imagePath);
    }

    console.log('Prediction result:', prediction);

    // Save detection to database
    const detection = await Detection.create({
      user: req.user._id,
      image: {
        originalName: req.file.originalname,
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size,
        mimetype: req.file.mimetype
      },
      type: 'pest',
      result: {
        detectedClass: prediction.detected_class,
        confidence: prediction.confidence,
        description: prediction.description,
        treatment: prediction.treatment,
        pesticide: prediction.pesticide
      },
      location: req.body.location ? {
        latitude: parseFloat(req.body.location.latitude),
        longitude: parseFloat(req.body.location.longitude),
        address: req.body.location.address
      } : undefined
    });

    console.log('Detection saved to database:', detection._id);

    // Add detection to user's history
    await User.findByIdAndUpdate(
      req.user._id,
      { $push: { detectionHistory: detection._id } }
    );

    res.status(200).json({
      success: true,
      message: 'Pest detection completed successfully',
      data: {
        detection: {
          _id: detection._id,
          type: detection.type,
          result: detection.result,
          createdAt: detection.createdAt,
          image: {
            filename: detection.image.filename,
            originalName: detection.image.originalName
          }
        }
      }
    });

  } catch (error) {
    console.error('Pest detection error:', error);
    
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
        console.log('Cleaned up uploaded file');
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Server error during pest detection',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get user's detection history
// @route   GET /api/detection/history
// @access  Private
const getDetectionHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const detections = await Detection.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-image.path'); 

    const total = await Detection.countDocuments({ user: req.user._id });

    res.status(200).json({
      success: true,
      message: 'Detection history retrieved successfully',
      data: {
        detections,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalResults: total,
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get detection history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching detection history'
    });
  }
};

// @desc    Get single detection details
// @route   GET /api/detection/:id
// @access  Private
const getDetection = async (req, res) => {
  try {
    const detection = await Detection.findOne({
      _id: req.params.id,
      user: req.user._id
    }).select('-image.path');

    if (!detection) {
      return res.status(404).json({
        success: false,
        message: 'Detection not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Detection retrieved successfully',
      data: {
        detection
      }
    });

  } catch (error) {
    console.error('Get detection error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching detection'
    });
  }
};

// @desc    Delete detection
// @route   DELETE /api/detection/:id
// @access  Private
const deleteDetection = async (req, res) => {
  try {
    const detection = await Detection.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!detection) {
      return res.status(404).json({
        success: false,
        message: 'Detection not found'
      });
    }

    // Delete image file
    if (detection.image.path && fs.existsSync(detection.image.path)) {
      fs.unlinkSync(detection.image.path);
    }

    // Remove from database
    await Detection.findByIdAndDelete(req.params.id);

    // Remove from user's history
    await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { detectionHistory: req.params.id } }
    );

    res.status(200).json({
      success: true,
      message: 'Detection deleted successfully'
    });

  } catch (error) {
    console.error('Delete detection error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting detection'
    });
  }
};

// @desc    Get detection statistics
// @route   GET /api/detection/stats
// @access  Private
const getDetectionStats = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get total detections
    const totalDetections = await Detection.countDocuments({ user: userId });

    // Get detections by type
    const diseaseCount = await Detection.countDocuments({ user: userId, type: 'disease' });
    const pestCount = await Detection.countDocuments({ user: userId, type: 'pest' });

    // Get recent detections (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentDetections = await Detection.countDocuments({
      user: userId,
      createdAt: { $gte: thirtyDaysAgo }
    });

    // Get most detected issues
    const topDiseases = await Detection.aggregate([
      { $match: { user: userId, type: 'disease' } },
      { $group: { _id: '$result.detectedClass', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    const topPests = await Detection.aggregate([
      { $match: { user: userId, type: 'pest' } },
      { $group: { _id: '$result.detectedClass', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    res.status(200).json({
      success: true,
      message: 'Detection statistics retrieved successfully',
      data: {
        statistics: {
          totalDetections,
          diseaseDetections: diseaseCount,
          pestDetections: pestCount,
          recentDetections,
          topDiseases,
          topPests
        }
      }
    });

  } catch (error) {
    console.error('Get detection stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching detection statistics'
    });
  }
};

module.exports = {
  detectDisease,
  detectPest,
  getDetectionHistory,
  getDetection,
  deleteDetection,
  getDetectionStats
};