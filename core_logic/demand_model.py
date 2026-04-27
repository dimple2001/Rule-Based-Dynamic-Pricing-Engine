import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
import joblib
import os

DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

def load_and_preprocess_real_data(csv_path="hotel_bookings.csv"):
    """
    Loads the real Kaggle dataset and engineers the required features:
    - hour
    - day_of_week
    - is_weekend
    - demand (Target)
    """
    print(f"Loading data from {csv_path}...")
    df = pd.read_csv(csv_path)
    
    # 1. Construct a Date to get Day of Week
    month_map = {
        'January': 1, 'February': 2, 'March': 3, 'April': 4,
        'May': 5, 'June': 6, 'July': 7, 'August': 8,
        'September': 9, 'October': 10, 'November': 11, 'December': 12
    }
    df['month_num'] = df['arrival_date_month'].map(month_map)
    
    # Create a datetime column
    df['arrival_date'] = pd.to_datetime({
        'year': df['arrival_date_year'],
        'month': df['month_num'],
        'day': df['arrival_date_day_of_month']
    })
    
    # Extract day of week (Monday=0, Sunday=6) -> map to strings
    df['day_name'] = df['arrival_date'].dt.day_name()
    
    # 2. Extract is_weekend
    df['is_weekend'] = df['day_name'].isin(['Saturday', 'Sunday']).astype(int)
    
    # 3. Engineer 'hour'
    # The dataset doesn't have an exact booking time. We will simulate a realistic booking hour 
    # distribution based on the lead_time modulo 24, but shifted so most bookings happen in the evening.
    df['hour'] = (df['lead_time'] + 17) % 24
    
    # 4. Engineer 'demand' target
    # We will use the Average Daily Rate (ADR) as a proxy for demand. 
    # High prices usually correlate with High Demand.
    # Let's use quantiles to strictly separate them into LOW, MEDIUM, HIGH
    low_thresh = df['adr'].quantile(0.33)
    high_thresh = df['adr'].quantile(0.66)
    
    def assign_demand(adr):
        if adr < low_thresh:
            return "LOW"
        elif adr > high_thresh:
            return "HIGH"
        else:
            return "MEDIUM"
            
    df['demand'] = df['adr'].apply(assign_demand)
    
    # Filter only the columns we need for training
    final_df = pd.DataFrame({
        'hour': df['hour'],
        'day_of_week': df['day_name'],
        'is_weekend': df['is_weekend'],
        'demand': df['demand']
    })
    
    # Drop any NaNs just in case
    final_df = final_df.dropna()
    
    return final_df

def preprocess_features(df):
    """
    Applies one-hot encoding to day_of_week and ensures numerical consistency.
    """
    df['day_of_week'] = pd.Categorical(df['day_of_week'], categories=DAYS_OF_WEEK)
    encoded_days = pd.get_dummies(df['day_of_week'], prefix='day')
    features = pd.concat([df[['hour', 'is_weekend']], encoded_days], axis=1)
    return features

def train_and_save_model():
    """Trains the RandomForest model on the Kaggle dataset and saves it."""
    if not os.path.exists("hotel_bookings.csv"):
        print("Error: hotel_bookings.csv not found! Please download it to the root directory.")
        return
        
    df = load_and_preprocess_real_data("hotel_bookings.csv")
    
    print(f"Dataset prepared with {len(df)} rows.")
    print("Class distribution:\n", df['demand'].value_counts())
    
    print("Preprocessing features for model training...")
    X = preprocess_features(df)
    y = df['demand']
    
    # Use max_depth to prevent overfitting and keep the model simple/fast
    print("Training RandomForestClassifier...")
    clf = RandomForestClassifier(n_estimators=50, max_depth=10, random_state=42, n_jobs=-1)
    clf.fit(X, y)
    
    print("Saving model to model.pkl...")
    joblib.dump(clf, "model.pkl")
    print("Model successfully saved!")

def predict_demand(hour, day_of_week):
    """
    Predictor function to estimate demand based on time inputs.
    """
    if not os.path.exists("model.pkl"):
        raise FileNotFoundError("model.pkl not found. Train the model first.")
        
    clf = joblib.load("model.pkl")
    is_weekend = 1 if day_of_week in ["Saturday", "Sunday"] else 0
    
    input_data = pd.DataFrame([{
        "hour": hour,
        "day_of_week": day_of_week,
        "is_weekend": is_weekend
    }])
    
    X_input = preprocess_features(input_data)
    prediction = clf.predict(X_input)
    return prediction[0]

if __name__ == "__main__":
    train_and_save_model()
    
    test_hour = 19
    test_day = "Saturday"
    print("\n--- Testing Predictor Function ---")
    prediction = predict_demand(test_hour, test_day)
    print(f"Predicted demand for {test_day} at {test_hour}:00 is -> {prediction}")
