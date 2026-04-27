from flask import Flask, request, jsonify
from flask_cors import CORS
from demand_model import predict_demand
import math

app = Flask(__name__)
CORS(app)

@app.route("/calculate-price", methods=["POST"])
def calculate_price():
    try:
        data = request.json
        hour = int(data.get("hour"))
        day_of_week = data.get("day_of_week")
        base_price = float(data.get("base_price"))
        
        # 1. Predict Demand using ML Model
        predicted_demand = predict_demand(hour, day_of_week)
        
        # 2. Rule Engine
        price = base_price
        applied_rules = []
        
        if predicted_demand == "HIGH":
            price *= 1.20
            applied_rules.append("High demand +20%")
        elif predicted_demand == "MEDIUM":
            price *= 1.10
            applied_rules.append("Medium demand +10%")
        elif predicted_demand == "LOW":
            price *= 0.90
            applied_rules.append("Low demand -10%")
            
        # Check for weekend
        if day_of_week in ["Saturday", "Sunday"]:
            price *= 1.10
            applied_rules.append("Weekend +10%")
            
        # 3. Fairness Cap
        max_price = 1.5 * base_price
        capped = False
        
        if price > max_price:
            price = max_price
            capped = True
            applied_rules.append(f"Fairness cap applied (Max 1.5x)")
            
        final_price = round(price, 2)
        
        # 4. Construct Human Readable Explanation
        explanation_parts = []
        if predicted_demand == "HIGH":
            explanation_parts.append("high demand")
        elif predicted_demand == "LOW":
            explanation_parts.append("low demand")
            
        if day_of_week in ["Saturday", "Sunday"]:
            explanation_parts.append("weekend booking")
            
        if explanation_parts:
            explanation = f"Price adjusted due to {' and '.join(explanation_parts)}."
        else:
            explanation = "Price adjusted based on normal demand factors."
            
        if capped:
            explanation += " Fairness cap applied to prevent excessive pricing."
            
        # 5. Return Detailed Response
        response = {
            "base_price": base_price,
            "predicted_demand": predicted_demand,
            "applied_rules": applied_rules,
            "final_price": final_price,
            "explanation": explanation
        }
        
        return jsonify(response)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 400

if __name__ == "__main__":
    app.run(debug=True, port=5000)