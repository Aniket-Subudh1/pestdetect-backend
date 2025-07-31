import sys
import json
import numpy as np
import cv2
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image
import os

class PestPredictor:
    def __init__(self, model_path):
        self.model_path = model_path
        self.model = None
        self.class_names = [
            'aphids', 'armyworm', 'beetle', 'bollworm', 'earthworm',
            'grasshopper', 'mites', 'mosquito', 'sawfly', 'stem_borer'
        ]
        
        # Pest information and treatments
        self.pest_info = {
            'aphids': {
                'description': 'Small soft-bodied insects that feed on plant sap',
                'treatment': 'Apply Imidacloprid or use biological control with ladybugs',
                'pesticide': {'name': 'Imidacloprid', 'dosage': '0.5-1 ml/L', 'type': 'Systemic Insecticide'}
            },
            'armyworm': {
                'description': 'Caterpillars that feed on leaves and can cause severe defoliation',
                'treatment': 'Apply Chlorantraniliprole or Spinetoram insecticides',
                'pesticide': {'name': 'Chlorantraniliprole', 'dosage': '150-300 ml/ha', 'type': 'Systemic Insecticide'}
            },
            'beetle': {
                'description': 'Hard-bodied insects that chew on leaves and stems',
                'treatment': 'Apply Cypermethrin or use mechanical removal',
                'pesticide': {'name': 'Cypermethrin', 'dosage': '1-2 ml/L', 'type': 'Contact Insecticide'}
            },
            'bollworm': {
                'description': 'Caterpillars that bore into cotton bolls and other fruits',
                'treatment': 'Apply Emamectin benzoate or Profenofos',
                'pesticide': {'name': 'Emamectin benzoate', 'dosage': '0.5 g/L', 'type': 'Systemic Insecticide'}
            },
            'earthworm': {
                'description': 'Beneficial organisms that improve soil health',
                'treatment': 'No treatment needed - earthworms are beneficial for soil',
                'pesticide': {'name': 'No treatment needed', 'dosage': 'N/A', 'type': 'Beneficial'}
            },
            'grasshopper': {
                'description': 'Jumping insects that feed on leaves and can cause defoliation',
                'treatment': 'Apply Carbaryl or use biological control with Nosema locustae',
                'pesticide': {'name': 'Carbaryl', 'dosage': '2-3 g/L', 'type': 'Contact Insecticide'}
            },
            'mites': {
                'description': 'Tiny arachnids that cause stippling and yellowing of leaves',
                'treatment': 'Apply Abamectin or increase humidity around plants',
                'pesticide': {'name': 'Abamectin', 'dosage': '1-2 ml/L', 'type': 'Acaricide'}
            },
            'mosquito': {
                'description': 'Flying insects; adults are not harmful to plants',
                'treatment': 'Control breeding sites and use Bt for larvae',
                'pesticide': {'name': 'Bacillus thuringiensis', 'dosage': '1-2 g/L', 'type': 'Biological'}
            },
            'sawfly': {
                'description': 'Wasp-like insects whose larvae feed on leaves',
                'treatment': 'Apply Spinosad or use biological control',
                'pesticide': {'name': 'Spinosad', 'dosage': '1-2 ml/L', 'type': 'Biological Insecticide'}
            },
            'stem_borer': {
                'description': 'Caterpillars that bore into plant stems causing wilting',
                'treatment': 'Apply Chlorantraniliprole or Cartap hydrochloride',
                'pesticide': {'name': 'Chlorantraniliprole', 'dosage': '150-300 ml/ha', 'type': 'Systemic Insecticide'}
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
            
            # Resize to model input size
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
            
            # Get pest information
            pest_info = self.pest_info.get(predicted_class, {
                'description': 'Pest detected',
                'treatment': 'Consult agricultural expert for treatment',
                'pesticide': {'name': 'General Insecticide', 'dosage': 'As per label', 'type': 'Insecticide'}
            })
            
            result = {
                'detected_class': predicted_class.upper().replace('_', ' '),
                'confidence': confidence,
                'description': pest_info['description'],
                'treatment': pest_info['treatment'],
                'pesticide': pest_info['pesticide']
            }
            
            return result
            
        except Exception as e:
            raise Exception(f"Prediction error: {str(e)}")

if __name__ == "__main__":
    try:
        if len(sys.argv) != 3:
            print(json.dumps({'error': 'Usage: python pest_predictor.py <model_path> <image_path>'}))
            sys.exit(1)
        
        model_path = sys.argv[1]
        image_path = sys.argv[2]
        
        predictor = PestPredictor(model_path)
        result = predictor.predict(image_path)
        
        print(json.dumps(result))
        
    except Exception as e:
        print(json.dumps({'error': str(e)}))
        sys.exit(1)