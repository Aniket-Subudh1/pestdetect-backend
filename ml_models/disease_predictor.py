import sys
import json
import numpy as np
import cv2
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image
import os

class DiseasePredictor:
    def __init__(self, model_path):
        self.model_path = model_path
        self.model = None
        self.class_names = [
            'Apple_scab', 'Apple_Black_rot', 'Apple_Cedar_apple_rust', 'Apple_healthy',
            'Blueberry_healthy', 'Cherry_Powdery_mildew', 'Cherry_healthy',
            'Corn_Cercospora_leaf_spot', 'Corn_Common_rust', 'Corn_Northern_Leaf_Blight', 'Corn_healthy',
            'Grape_Black_rot', 'Grape_Esca', 'Grape_Leaf_blight', 'Grape_healthy',
            'Orange_Haunglongbing', 'Peach_Bacterial_spot', 'Peach_healthy',
            'Pepper_Bacterial_spot', 'Pepper_healthy',
            'Potato_Early_blight', 'Potato_Late_blight', 'Potato_healthy',
            'Raspberry_healthy', 'Soybean_healthy',
            'Squash_Powdery_mildew', 'Strawberry_Leaf_scorch', 'Strawberry_healthy',
            'Tomato_Bacterial_spot', 'Tomato_Early_blight', 'Tomato_Late_blight',
            'Tomato_Leaf_Mold', 'Tomato_Septoria_leaf_spot', 'Tomato_Spider_mites',
            'Tomato_Target_Spot', 'Tomato_Yellow_Leaf_Curl_Virus', 'Tomato_mosaic_virus', 'Tomato_healthy'
        ]
        
        # Disease information and treatments
        self.disease_info = {
            'Apple_scab': {
                'description': 'Fungal disease causing dark, scaly lesions on leaves and fruit',
                'treatment': 'Apply fungicides like Mancozeb or Copper sulfate',
                'pesticide': {'name': 'Mancozeb', 'dosage': '2-3 g/L', 'type': 'Fungicide'}
            },
            'Apple_Black_rot': {
                'description': 'Fungal disease causing black cankers on branches and fruit rot',
                'treatment': 'Prune infected areas and apply Captan or Thiophanate-methyl',
                'pesticide': {'name': 'Captan', 'dosage': '2-3 g/L', 'type': 'Fungicide'}
            },
            'Apple_Cedar_apple_rust': {
                'description': 'Fungal disease causing yellow-orange spots on leaves',
                'treatment': 'Apply Propiconazole or Myclobutanil fungicides',
                'pesticide': {'name': 'Propiconazole', 'dosage': '1-2 ml/L', 'type': 'Fungicide'}
            },
            'Corn_Cercospora_leaf_spot': {
                'description': 'Fungal disease causing small rectangular lesions on leaves',
                'treatment': 'Apply Azoxystrobin or Tebuconazole fungicides',
                'pesticide': {'name': 'Azoxystrobin', 'dosage': '1-1.5 ml/L', 'type': 'Fungicide'}
            },
            'Corn_Common_rust': {
                'description': 'Fungal disease causing small oval rust pustules on leaves',
                'treatment': 'Apply Chlorothalonil or Propiconazole fungicides',
                'pesticide': {'name': 'Chlorothalonil', 'dosage': '2-3 ml/L', 'type': 'Fungicide'}
            },
            'Corn_Northern_Leaf_Blight': {
                'description': 'Fungal disease causing large grayish-green lesions on leaves',
                'treatment': 'Apply Mancozeb or Azoxystrobin fungicides',
                'pesticide': {'name': 'Mancozeb', 'dosage': '2-3 g/L', 'type': 'Fungicide'}
            },
            'Tomato_Early_blight': {
                'description': 'Fungal disease causing brown spots with concentric rings on leaves',
                'treatment': 'Apply Chlorothalonil or Mancozeb fungicides',
                'pesticide': {'name': 'Chlorothalonil', 'dosage': '2-3 ml/L', 'type': 'Fungicide'}
            },
            'Tomato_Late_blight': {
                'description': 'Devastating fungal disease causing water-soaked lesions',
                'treatment': 'Apply Metalaxyl or Copper-based fungicides immediately',
                'pesticide': {'name': 'Metalaxyl', 'dosage': '2-3 g/L', 'type': 'Fungicide'}
            },
            'Tomato_Leaf_Mold': {
                'description': 'Fungal disease causing yellow patches on upper leaf surface',
                'treatment': 'Improve air circulation and apply Chlorothalonil',
                'pesticide': {'name': 'Chlorothalonil', 'dosage': '2-3 ml/L', 'type': 'Fungicide'}
            }
        }
        
        self.load_model()
    
    def load_model(self):
        try:
            if os.path.exists(self.model_path):
                self.model = load_model(self.model_path)
            else:
                raise FileNotFoundError(f"Model file not found: {self.model_path}")
        except Exception as e:
            print(f"Error loading model: {str(e)}")
            raise e
    
    def preprocess_image(self, image_path):
        try:
            # Load and preprocess image
            img = cv2.imread(image_path)
            if img is None:
                raise ValueError("Could not load image")
            
            # Convert BGR to RGB
            img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            
            # Resize to model input size (224x224 for most plant disease models)
            img = cv2.resize(img, (224, 224))
            
            # Normalize pixel values
            img = img.astype('float32') / 255.0
            
            # Add batch dimension
            img = np.expand_dims(img, axis=0)
            
            return img
        except Exception as e:
            raise ValueError(f"Error preprocessing image: {str(e)}")
    
    def predict(self, image_path):
        try:
            # Preprocess image
            processed_image = self.preprocess_image(image_path)
            
            # Make prediction
            predictions = self.model.predict(processed_image)
            
            # Get predicted class and confidence
            predicted_class_idx = np.argmax(predictions[0])
            confidence = float(predictions[0][predicted_class_idx])
            predicted_class = self.class_names[predicted_class_idx]
            
            # Get disease information
            disease_info = self.disease_info.get(predicted_class, {
                'description': 'Disease detected',
                'treatment': 'Consult agricultural expert for treatment',
                'pesticide': {'name': 'General Fungicide', 'dosage': 'As per label', 'type': 'Fungicide'}
            })
            
            # Check if it's a healthy plant
            if 'healthy' in predicted_class.lower():
                disease_info = {
                    'description': 'Plant appears healthy',
                    'treatment': 'Continue regular care and monitoring',
                    'pesticide': {'name': 'No treatment needed', 'dosage': 'N/A', 'type': 'N/A'}
                }
            
            result = {
                'detected_class': predicted_class,
                'confidence': confidence,
                'description': disease_info['description'],
                'treatment': disease_info['treatment'],
                'pesticide': disease_info['pesticide']
            }
            
            return result
            
        except Exception as e:
            raise Exception(f"Prediction error: {str(e)}")

if __name__ == "__main__":
    try:
        if len(sys.argv) != 3:
            print(json.dumps({'error': 'Usage: python disease_predictor.py <model_path> <image_path>'}))
            sys.exit(1)
        
        model_path = sys.argv[1]
        image_path = sys.argv[2]
        
        predictor = DiseasePredictor(model_path)
        result = predictor.predict(image_path)
        
        print(json.dumps(result))
        
    except Exception as e:
        print(json.dumps({'error': str(e)}))
        sys.exit(1)