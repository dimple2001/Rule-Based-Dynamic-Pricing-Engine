# pricing_engine.py

def predict_demand(hour, day_of_week):
    is_weekend = day_of_week in ["Saturday", "Sunday"]

    if hour in range(17, 23):
        demand = "high"
    elif hour in range(0, 7):
        demand = "low"
    else:
        demand = "medium"

    if is_weekend and demand != "high":
        demand = "medium" if demand == "low" else "high"

    return demand


def get_price_breakdown(base_price, season, checkin_day, tourist_level):
    steps = []
    price = base_price
    steps.append({"rule": "Base Price", "value": round(price, 2), "change": "—"})

    if season == "peak":
        price *= 1.25
        steps.append({"rule": "Peak Season", "value": round(price, 2), "change": "+25%"})
    elif season == "off":
        price *= 0.80
        steps.append({"rule": "Off Season", "value": round(price, 2), "change": "-20%"})

    if checkin_day == "weekend":
        price *= 1.10
        steps.append({"rule": "Weekend", "value": round(price, 2), "change": "+10%"})

    if tourist_level == "high":
        price *= 1.20
        steps.append({"rule": "High Tourist Demand", "value": round(price, 2), "change": "+20%"})
    elif tourist_level == "low":
        price *= 0.90
        steps.append({"rule": "Low Tourist Demand", "value": round(price, 2), "change": "-10%"})

    max_price = base_price * 1.50
    min_price = base_price * 0.70
    final = round(min(max_price, max(min_price, price)), 2)

    if final != round(price, 2):
        steps.append({"rule": "Fairness Cap Applied", "value": final, "change": "Capped"})

    return steps, final