import tensorflow as tf
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Dropout
from tensorflow.keras.models import Model
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.callbacks import ModelCheckpoint, EarlyStopping, ReduceLROnPlateau
import os
import requests
import zipfile
from pathlib import Path

class ModelTrainer:
    def __init__(self):
        self.img_height = 224
        self.img_width = 224
        self.batch_size = 32
        self.epochs = 50
        
    def download_dataset(self, dataset_type="disease"):
        """Download and extract dataset"""
        base_dir = Path("datasets")
        base_dir.mkdir(exist_ok=True)
        
        if dataset_type == "disease":
            # PlantVillage dataset (simplified version)
            dataset_url = "https://www.kaggle.com/datasets/vipoooool/new-plant-diseases-dataset"
            print("Please download the PlantVillage dataset from Kaggle:")
            print(dataset_url)
            print("Extract it to datasets/plant_disease/")
            
        elif dataset_type == "pest":
            # IP102 dataset (simplified version)  
            dataset_url = "https://www.kaggle.com/datasets/rtlmhjbn/ip02-dataset"
            print("Please download the IP102 pest dataset from Kaggle:")
            print(dataset_url)
            print("Extract it to datasets/pest/")
    
    def create_model(self, num_classes, model_name="disease"):
        """Create CNN model using transfer learning"""
        # Load pre-trained MobileNetV2
        base_model = MobileNetV2(
            input_shape=(self.img_height, self.img_width, 3),
            include_top=False,
            weights='imagenet'
        )
        
        # Freeze base model layers
        base_model.trainable = False
        
        # Add custom classification head
        inputs = tf.keras.Input(shape=(self.img_height, self.img_width, 3))
        x = base_model(inputs, training=False)
        x = GlobalAveragePooling2D()(x)
        x = Dropout(0.3)(x)
        x = Dense(512, activation='relu')(x)
        x = Dropout(0.3)(x)
        outputs = Dense(num_classes, activation='softmax')(x)
        
        model = Model(inputs, outputs)
        
        # Compile model
        model.compile(
            optimizer=Adam(learning_rate=0.001),
            loss='categorical_crossentropy',
            metrics=['accuracy']
        )
        
        return model
    
    def prepare_data_generators(self, data_dir):
        """Prepare data generators with augmentation"""
        # Data augmentation for training
        train_datagen = ImageDataGenerator(
            rescale=1./255,
            rotation_range=20,
            width_shift_range=0.2,
            height_shift_range=0.2,
            shear_range=0.2,
            zoom_range=0.2,
            horizontal_flip=True,
            fill_mode='nearest',
            validation_split=0.2
        )
        
        # Only rescaling for validation
        val_datagen = ImageDataGenerator(
            rescale=1./255,
            validation_split=0.2
        )
        
        # Create generators
        train_generator = train_datagen.flow_from_directory(
            data_dir,
            target_size=(self.img_height, self.img_width),
            batch_size=self.batch_size,
            class_mode='categorical',
            subset='training',
            shuffle=True
        )
        
        validation_generator = val_datagen.flow_from_directory(
            data_dir,
            target_size=(self.img_height, self.img_width),
            batch_size=self.batch_size,
            class_mode='categorical',
            subset='validation',
            shuffle=False
        )
        
        return train_generator, validation_generator
    
    def train_disease_model(self):
        """Train plant disease detection model"""
        print("Training Disease Detection Model...")
        
        # Check if dataset exists
        data_dir = "datasets/plant_disease/train"
        if not os.path.exists(data_dir):
            print("Dataset not found. Please download the dataset first.")
            self.download_dataset("disease")
            return
        
        # Prepare data
        train_gen, val_gen = self.prepare_data_generators(data_dir)
        num_classes = len(train_gen.class_indices)
        
        print(f"Number of classes: {num_classes}")
        print(f"Class indices: {train_gen.class_indices}")
        
        # Create model
        model = self.create_model(num_classes, "disease")
        
        # Callbacks
        callbacks = [
            ModelCheckpoint(
                'disease_model.h5',
                monitor='val_accuracy',
                save_best_only=True,
                mode='max',
                verbose=1
            ),
            EarlyStopping(
                monitor='val_loss',
                patience=10,
                restore_best_weights=True
            ),
            ReduceLROnPlateau(
                monitor='val_loss',
                factor=0.2,
                patience=5,
                min_lr=0.0001
            )
        ]
        
        # Train model
        history = model.fit(
            train_gen,
            steps_per_epoch=train_gen.samples // self.batch_size,
            epochs=self.epochs,
            validation_data=val_gen,
            validation_steps=val_gen.samples // self.batch_size,
            callbacks=callbacks,
            verbose=1
        )
        
        print("Disease model training completed!")
        return model, history
    
    def train_pest_model(self):
        """Train pest detection model"""
        print("Training Pest Detection Model...")
        
        # Check if dataset exists
        data_dir = "datasets/pest/train"
        if not os.path.exists(data_dir):
            print("Dataset not found. Please download the dataset first.")
            self.download_dataset("pest")
            return
        
        # Prepare data
        train_gen, val_gen = self.prepare_data_generators(data_dir)
        num_classes = len(train_gen.class_indices)
        
        print(f"Number of classes: {num_classes}")
        print(f"Class indices: {train_gen.class_indices}")
        
        # Create model
        model = self.create_model(num_classes, "pest")
        
        # Callbacks
        callbacks = [
            ModelCheckpoint(
                'pest_model.h5',
                monitor='val_accuracy',
                save_best_only=True,
                mode='max',
                verbose=1
            ),
            EarlyStopping(
                monitor='val_loss',
                patience=10,
                restore_best_weights=True
            ),
            ReduceLROnPlateau(
                monitor='val_loss',
                factor=0.2,
                patience=5,
                min_lr=0.0001
            )
        ]
        
        # Train model
        history = model.fit(
            train_gen,
            steps_per_epoch=train_gen.samples // self.batch_size,
            epochs=self.epochs,
            validation_data=val_gen,
            validation_steps=val_gen.samples // self.batch_size,
            callbacks=callbacks,
            verbose=1
        )
        
        print("Pest model training completed!")
        return model, history

def create_dummy_models():
    """Create dummy models for testing purposes"""
    print("Creating dummy models for testing...")
    
    # Create simple dummy models
    from tensorflow.keras.models import Sequential
    from tensorflow.keras.layers import Dense, Flatten, Conv2D, MaxPooling2D
    
    # Disease model (38 classes)
    disease_model = Sequential([
        Conv2D(32, (3, 3), activation='relu', input_shape=(224, 224, 3)),
        MaxPooling2D(2, 2),
        Conv2D(64, (3, 3), activation='relu'),
        MaxPooling2D(2, 2),
        Conv2D(128, (3, 3), activation='relu'),
        MaxPooling2D(2, 2),
        Flatten(),
        Dense(512, activation='relu'),
        Dense(38, activation='softmax')  # 38 disease classes
    ])
    
    disease_model.compile(
        optimizer='adam',
        loss='categorical_crossentropy',
        metrics=['accuracy']
    )
    
    # Pest model (10 classes)
    pest_model = Sequential([
        Conv2D(32, (3, 3), activation='relu', input_shape=(224, 224, 3)),
        MaxPooling2D(2, 2),
        Conv2D(64, (3, 3), activation='relu'),
        MaxPooling2D(2, 2),
        Conv2D(128, (3, 3), activation='relu'),
        MaxPooling2D(2, 2),
        Flatten(),
        Dense(512, activation='relu'),
        Dense(10, activation='softmax')  # 10 pest classes
    ])
    
    pest_model.compile(
        optimizer='adam',
        loss='categorical_crossentropy',
        metrics=['accuracy']
    )
    
    # Save dummy models
    disease_model.save('disease_model.h5')
    pest_model.save('pest_model.h5')
    
    print("Dummy models created successfully!")
    print("disease_model.h5 - 38 classes")
    print("pest_model.h5 - 10 classes")

if __name__ == "__main__":
    trainer = ModelTrainer()
    
    print("Plant Disease and Pest Detection Model Training")
    print("=" * 50)
    
    choice = input("Choose option:\n1. Train Disease Model\n2. Train Pest Model\n3. Create Dummy Models (for testing)\n4. Train Both Models\nEnter choice (1-4): ")
    
    if choice == "1":
        trainer.train_disease_model()
    elif choice == "2":
        trainer.train_pest_model()
    elif choice == "3":
        create_dummy_models()
    elif choice == "4":
        trainer.train_disease_model()
        trainer.train_pest_model()
    else:
        print("Invalid choice!")
        
    print("\nTraining completed!")