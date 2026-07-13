"""
Placeholder churn prediction service.

This is a rule-based stub standing in for a trained ML model. The Node
backend (backend/services/churnService.js) calls POST /predict with order
features and stores the result in MongoDB via PredictionLog. Swap the body
of predict_churn() for a real model (e.g. loaded via joblib/pickle) once
one is trained.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)


def predict_churn(order_count, total_spend, days_since_last_order):
    if days_since_last_order is None:
        # No orders on record yet - treat as unknown/high risk.
        return 0.75, 'high'

    score = min(max(days_since_last_order / 60, 0), 1)

    if order_count > 5:
        score = max(score - 0.15, 0)
    if total_spend > 500:
        score = max(score - 0.1, 0)

    if score >= 0.6:
        risk_level = 'high'
    elif score >= 0.3:
        risk_level = 'medium'
    else:
        risk_level = 'low'

    return round(score, 2), risk_level


@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json(silent=True) or {}

    order_count = data.get('orderCount', 0)
    total_spend = data.get('totalSpend', 0)
    days_since_last_order = data.get('daysSinceLastOrder')

    churn_score, risk_level = predict_churn(order_count, total_spend, days_since_last_order)

    return jsonify({
        'churnScore': churn_score,
        'riskLevel': risk_level,
    })


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})


if __name__ == '__main__':
    app.run(port=5001, debug=True)
