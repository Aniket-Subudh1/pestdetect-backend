const Detection = require('../models/Detection');
const User = require('../models/User');
const { PythonShell } = require('python-shell');
const path = require('path');
const fs = require('fs');

// @desc    Detect plant disease
// @route   POST /api/detection/disease
// @access  Private
const detectDisease = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image'
      });
    }

    const imagePath = req.file.path;
    const modelPath = process.env.DISEASE_MODEL_PATH || 'ml_models/disease_model.h5';

    // Check if model exists
    if (!fs.existsSync(modelPath)) {
      return res.status(500).json({
        success: false,
        message: 'Disease detection model not found. Please train the model first.'
      });
    }

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
        PythonShell.run('disease_predictor.py', options, (err, results) => {
          if (err) {
            reject(err);
          } else {
            resolve(results);
          }
        });
      });

      if (!results || results.length === 0) {
        throw new Error('No prediction results received');
      }

      const prediction = results[0];

      if (prediction.error) {
        throw new Error(prediction.error);
      }

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
          latitude: req.body.location.latitude,
          longitude: req.body.location.longitude,
          address: req.body.location.address
        } : undefined
      });

      // Add detection to user's history
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

    } catch (pythonError) {
      console.error('Python script error:', pythonError);
      
      // Clean up uploaded file on error
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }

      return res.status(500).json({
        success: false,
        message: 'Error in disease detection model',
        error: pythonError.message
      });
    }

  } catch (error) {
    console.error('Disease detection error:', error);
    
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: 'Server error during disease detection'
    });
  }
};

// @desc    Detect plant pest
// @route   POST /api/detection/pest
// @access  Private
const detectPest = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image'
      });
    }

    const imagePath = req.file.path;
    const modelPath = process.env.PEST_MODEL_PATH || 'ml_models/pest_model.h5';

    // Check if model exists
    if (!fs.existsSync(modelPath)) {
      return res.status(500).json({
        success: false,
        message: 'Pest detection model not found. Please train the model first.'
      });
    }

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
            reject(err);
          } else {
            resolve(results);
          }
        });
      });

      if (!results || results.length === 0) {
        throw new Error('No prediction results received');
      }

      const prediction = results[0];

      if (prediction.error) {
        throw new Error(prediction.error);
      }

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
          latitude: req.body.location.latitude,
          longitude: req.body.location.longitude,
          address: req.body.location.address
        } : undefined
      });

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

    } catch (pythonError) {
      console.error('Python script error:', pythonError);
      
      // Clean up uploaded file on error
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }

      return res.status(500).json({
        success: false,
        message: 'Error in pest detection model',
        error: pythonError.message
      });
    }

  } catch (error) {
    console.error('Pest detection error:', error);
    
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: 'Server error during pest detection'
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
      .select('-image.path'); // Don't send file paths

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