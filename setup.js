const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up PestDetect Backend...\n');

const directories = [
  'uploads',
  'uploads/plants',
  'uploads/avatars',
  'ml_models'
];

directories.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  } else {
    console.log(`📁 Directory already exists: ${dir}`);
  }
});

const modelFiles = [
  'ml_models/disease_model.h5',
  'ml_models/pest_model.h5'
];

modelFiles.forEach(file => {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, 'dummy_model_file_for_testing');
    console.log(`✅ Created dummy model: ${file}`);
  } else {
    console.log(`📄 Model already exists: ${file}`);
  }
});

const envPath = '.env';
const envContent = `# Database
MONGODB_URI=mongodb://localhost:27017/pestdetect

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d

# Email (Optional - for development, you can skip this)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=PestDetect <your-email@gmail.com>

# File Upload
MAX_FILE_SIZE=10485760

# ML Models
DISEASE_MODEL_PATH=ml_models/disease_model.h5
PEST_MODEL_PATH=ml_models/pest_model.h5

# Server
PORT=5000
NODE_ENV=development
`;

if (!fs.existsSync(envPath)) {
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Created .env file');
} else {
  console.log('📄 .env file already exists');
}

console.log('\n🎉 Backend setup complete!');
console.log('\n📋 Next steps:');
console.log('1. Install MongoDB and make sure it\'s running');
console.log('2. Run: npm install');
console.log('3. Run: npm start');
console.log('4. Test the API at: http://localhost:5000/api/health');
console.log('\n💡 The backend will work without real ML models using fallback predictions for testing.');