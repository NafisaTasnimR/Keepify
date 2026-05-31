from flask import Flask, request, jsonify
import pickle
import numpy as np

app = Flask(__name__)

with open('churn_bundle.pkl', 'rb') as f:
    bundle = pickle.load(f)

model  = bundle['model']
scaler = bundle['scaler']

def compute_features(total_orders, total_spending, recency_days):
    recency         = recency_days
    frequency       = total_orders
    monetary_log    = np.log1p(total_spending)
    avg_order_value = total_spending / (total_orders + 1)
    engagement      = frequency / (recency + 1)

    # Scaler was fit on only 4 features — matches notebook exactly
    raw_4 = np.array([[recency, frequency, monetary_log, avg_order_value]])
    scaled_4 = scaler.transform(raw_4)

    # Engagement was NOT scaled in the notebook, appended raw
    engagement_arr = np.array([[engagement]])
    final = np.hstack([scaled_4, engagement_arr])   # shape (1, 5) → matches model

    return final



@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json()

    required = ['total_orders', 'total_spending', 'recency_days']
    for field in required:
        if field not in data:
            return jsonify({'error': f'Missing field: {field}'}), 400

    features = compute_features(
        total_orders   = float(data['total_orders']),
        total_spending = float(data['total_spending']),
        recency_days   = float(data['recency_days']),
    )

    score = float(model.predict_proba(features)[0][1])  # probability of churn (class 1)
    return jsonify({'score': round(score, 4)})

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    app.run(port=5001)