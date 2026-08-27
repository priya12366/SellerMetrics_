import pandas as pd
import numpy as np
from datetime import timedelta
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sqlalchemy.orm import Session
from sqlalchemy import func, and_

from app.models.order import Order
from app.models.payment import Payment
from app.services.cost_service import build_cost_map, cost_for_sku

def generate_forecast(db: Session, user_id: int, forecast_days: int = 7):
    """
    Generates a forecast for orders, revenue, settlement, and profit.
    """
    # Central COGS lookup (single source of truth), shared with every panel.
    cost_map = build_cost_map(db, user_id)

    # 1. Fetch data
    matched_data = db.query(
        func.date(Order.order_date).label('order_date'),
        func.count(Order.id).label('orders'),
        Order.quantity,
        Order.sku,
        Payment.total_sale_amount,
        Payment.final_settlement_amount
    ).join(
        Payment, and_(Order.user_id == Payment.user_id, Order.sub_order_no == Payment.sub_order_no)
    ).filter(
        Order.user_id == user_id,
        Order.order_date.isnot(None)
    ).all()

    if not matched_data:
        return {"status": "insufficient_data", "required_days": 30, "available_days": 0, "message": "No matched orders found."}

    # 2. Aggregate by Date
    daily_stats = {}
    for row in matched_data:
        dt_key = row.order_date
        
        if dt_key not in daily_stats:
            daily_stats[dt_key] = {
                'orders': 0,
                'revenue': 0.0,
                'settlement': 0.0,
                'profit': 0.0
            }
            
        stats = daily_stats[dt_key]
        stats['orders'] += 1
        
        # Revenue
        revenue = float(row.total_sale_amount or 0)
        stats['revenue'] += revenue
        
        # Settlement
        settlement = float(row.final_settlement_amount or 0)
        stats['settlement'] += settlement
        
        # Profit (only when this SKU has a configured cost — otherwise the row
        # contributes nothing to profit, same as before).
        unit_cost = cost_for_sku(cost_map, row.sku)
        if unit_cost is not None:
            qty = row.quantity or 1
            cost = float(unit_cost) * qty
            stats['profit'] += (settlement - cost)

    # Convert to DataFrame
    df = pd.DataFrame.from_dict(daily_stats, orient='index')
    if df.empty:
        return {"status": "insufficient_data", "required_days": 30, "available_days": 0, "message": "No matched orders found."}
        
    df.index = pd.to_datetime(df.index)
    
    # Fill missing dates to ensure continuous time series
    full_date_range = pd.date_range(start=df.index.min(), end=df.index.max())
    df = df.reindex(full_date_range).fillna(0)
    
    available_days = len(df)
    
    # 3. Data Sufficiency Rules
    if available_days < 30:
        return {
            "status": "insufficient_data", 
            "required_days": 30, 
            "available_days": available_days,
            "message": "More historical data is required before reliable forecasting can be generated."
        }
        
    if forecast_days == 30 and available_days < 90:
        return {
            "status": "insufficient_data", 
            "required_days": 90, 
            "available_days": available_days,
            "message": "30-day forecasting requires at least 90 days of historical data. Please use the 7-day forecast."
        }

    # 4. Feature Engineering
    # Create simple features: days_since_start and day_of_week
    df = df.sort_index()
    df['days_since_start'] = np.arange(len(df))
    df['day_of_week'] = df.index.dayofweek
    
    # One-hot encode day of week
    df = pd.get_dummies(df, columns=['day_of_week'], drop_first=True)
    
    # Ensure all days 1-6 are present (0 is dropped)
    for i in range(1, 7):
        col = f'day_of_week_{i}'
        if col not in df.columns:
            df[col] = 0

    feature_cols = ['days_since_start'] + [f'day_of_week_{i}' for i in range(1, 7)]
    target_cols = ['orders', 'revenue', 'settlement', 'profit']

    # 5. Chronological Train/Test Split (last N days as test set)
    test_size = forecast_days
    if available_days <= test_size * 2:
        test_size = max(1, available_days // 3) # ensure we have training data
        
    train_df = df.iloc[:-test_size]
    test_df = df.iloc[-test_size:]
    
    # 6. Train Models and Evaluate
    metrics = {}
    models = {}
    
    for target in target_cols:
        model = LinearRegression()
        
        # Train on split
        model.fit(train_df[feature_cols], train_df[target])
        
        # Predict on test
        predictions = model.predict(test_df[feature_cols])
        
        # Calculate metrics
        mae = mean_absolute_error(test_df[target], predictions)
        rmse = np.sqrt(mean_squared_error(test_df[target], predictions))
        metrics[target] = {"mae": round(mae, 2), "rmse": round(rmse, 2)}
        
        # Retrain on full historical data for the actual future prediction
        final_model = LinearRegression()
        final_model.fit(df[feature_cols], df[target])
        models[target] = final_model

    # 7. Generate Future Forecast
    future_dates = pd.date_range(start=df.index.max() + timedelta(days=1), periods=forecast_days)
    future_df = pd.DataFrame(index=future_dates)
    future_df['days_since_start'] = np.arange(len(df), len(df) + forecast_days)
    future_df['day_of_week'] = future_df.index.dayofweek
    
    future_df = pd.get_dummies(future_df, columns=['day_of_week'], drop_first=True)
    for i in range(1, 7):
        col = f'day_of_week_{i}'
        if col not in future_df.columns:
            future_df[col] = 0
            
    # Predict future
    forecast_results = []
    for date, row in future_df.iterrows():
        daily_forecast = {"date": date.strftime("%Y-%m-%d")}
        features = row[feature_cols].values.reshape(1, -1)
        
        for target in target_cols:
            # Linear Regression might predict negative values for dropping trends
            pred = models[target].predict(features)[0]
            if target == 'orders' and pred < 0:
                pred = 0
            # Revenue, settlement, profit can theoretically be negative (returns), but let's bound revenue at least
            if target == 'revenue' and pred < 0:
                pred = 0
                
            if target == 'orders':
                daily_forecast[target] = max(0, int(round(pred)))
            else:
                daily_forecast[target] = round(float(pred), 2)
                
        forecast_results.append(daily_forecast)

    # Format historical data for charts (last 30 days max)
    historical_chart = []
    recent_history = df.tail(30)
    for date, row in recent_history.iterrows():
        historical_chart.append({
            "date": date.strftime("%Y-%m-%d"),
            "orders": int(row['orders']),
            "revenue": round(float(row['revenue']), 2),
            "settlement": round(float(row['settlement']), 2),
            "profit": round(float(row['profit']), 2)
        })

    # Return response
    return {
        "status": "success",
        "forecast_days": forecast_days,
        "historical_start": df.index.min().strftime("%Y-%m-%d"),
        "historical_end": df.index.max().strftime("%Y-%m-%d"),
        "available_days": available_days,
        "training_days": len(train_df),
        "test_days": len(test_df),
        "model": "scikit-learn LinearRegression",
        "metrics": metrics,
        "forecast": forecast_results,
        "historical": historical_chart
    }
