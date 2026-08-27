import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  Activity, 
  TrendingUp, 
  IndianRupee, 
  ShoppingBag, 
  AlertCircle,
  Loader2,
  RefreshCw,
  Calendar,
  Info
} from 'lucide-react';

export default function ForecastingPage() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [insufficientData, setInsufficientData] = useState(null);
  
  const [forecastDays, setForecastDays] = useState(7);
  const [activeMetric, setActiveMetric] = useState('orders'); // orders, revenue, settlement, profit
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchForecast();
  }, [forecastDays, navigate]);

  const fetchForecast = async () => {
    setIsLoading(true);
    setError(null);
    setInsufficientData(null);
    
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/ml/forecast?days=${forecastDays}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('access_token');
          navigate('/login');
          return;
        }
        throw new Error('Failed to load forecast data.');
      }
      
      const result = await response.json();
      
      if (result.status === 'insufficient_data') {
        setInsufficientData(result);
        setData(null);
      } else if (result.status === 'success') {
        setData(result);
      } else {
        throw new Error('Unexpected response format.');
      }
      
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchForecast();
  };

  if (isLoading && !isRefreshing) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-lg font-medium">Training machine learning model...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Activity className="h-6 w-6 text-indigo-600" />
            ML Sales & Profit Forecasting
          </h1>
          <p className="mt-1 text-slate-500">
            Predict future performance using Machine Learning trained strictly on your historical data.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setForecastDays(7)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                forecastDays === 7 
                  ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/50' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setForecastDays(30)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                forecastDays === 30 
                  ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/50' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              30 Days
            </button>
          </div>
          
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors border border-indigo-200/50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700 flex items-start gap-4">
          <AlertCircle className="h-6 w-6 shrink-0" />
          <div>
            <h3 className="text-lg font-bold">Error</h3>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Insufficient Data State */}
      {insufficientData && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-8 flex flex-col items-center text-center">
          <Calendar className="h-12 w-12 text-amber-500 mb-4" />
          <h3 className="text-xl font-bold text-amber-900 mb-2">Insufficient Historical Data</h3>
          <p className="text-amber-700 max-w-lg mb-6">
            {insufficientData.message}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
            <div className="bg-white/60 flex-1 p-4 rounded-lg border border-amber-200/50">
              <div className="text-sm font-semibold text-amber-800 uppercase tracking-wider mb-1">Required Days</div>
              <div className="text-2xl font-bold text-amber-900">{insufficientData.required_days}</div>
            </div>
            <div className="bg-white/60 flex-1 p-4 rounded-lg border border-amber-200/50">
              <div className="text-sm font-semibold text-amber-800 uppercase tracking-wider mb-1">Available Days</div>
              <div className="text-2xl font-bold text-amber-900">{insufficientData.available_days}</div>
            </div>
          </div>
          <p className="mt-6 text-sm text-amber-600 font-medium">
            Upload more Orders and Payments to build your historical dataset.
          </p>
        </div>
      )}

      {/* Success Data State */}
      {data && (
        <>
          {/* Top KPI Cards (Aggregated Forecast) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <ForecastKPI 
              title={`Expected Orders (${forecastDays}d)`}
              value={data.forecast.reduce((sum, item) => sum + item.orders, 0)}
              icon={ShoppingBag}
              color="blue"
              isActive={activeMetric === 'orders'}
              onClick={() => setActiveMetric('orders')}
            />
            <ForecastKPI 
              title={`Expected Revenue (${forecastDays}d)`}
              value={`₹${data.forecast.reduce((sum, item) => sum + item.revenue, 0).toFixed(2)}`}
              icon={IndianRupee}
              color="indigo"
              isActive={activeMetric === 'revenue'}
              onClick={() => setActiveMetric('revenue')}
            />
            <ForecastKPI 
              title={`Expected Settlement (${forecastDays}d)`}
              value={`₹${data.forecast.reduce((sum, item) => sum + item.settlement, 0).toFixed(2)}`}
              icon={TrendingUp}
              color="emerald"
              isActive={activeMetric === 'settlement'}
              onClick={() => setActiveMetric('settlement')}
            />
            <ForecastKPI 
              title={`Expected Profit (${forecastDays}d)`}
              value={`₹${data.forecast.reduce((sum, item) => sum + item.profit, 0).toFixed(2)}`}
              icon={Activity}
              color="amber"
              isActive={activeMetric === 'profit'}
              onClick={() => setActiveMetric('profit')}
            />
          </div>

          {/* Chart Section */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900 capitalize">
                {activeMetric} Forecast vs Historical Actuals
              </h3>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
                <Info className="h-4 w-4 text-indigo-500" />
                Forecasts are estimates based on historical seller data.
              </div>
            </div>
            
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="date" 
                    allowDuplicatedCategory={false}
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    tickMargin={10}
                  />
                  <YAxis 
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    tickFormatter={(val) => activeMetric !== 'orders' ? `₹${val}` : val}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value) => [activeMetric !== 'orders' ? `₹${value}` : value, activeMetric.charAt(0).toUpperCase() + activeMetric.slice(1)]}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  
                  {/* Historical Line */}
                  <Line 
                    data={data.historical} 
                    type="monotone" 
                    dataKey={activeMetric} 
                    name="Historical Actual" 
                    stroke="#94a3b8" 
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#94a3b8', strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                  
                  {/* Forecast Line */}
                  <Line 
                    data={data.forecast} 
                    type="monotone" 
                    dataKey={activeMetric} 
                    name="Future Predicted" 
                    stroke="#4f46e5" 
                    strokeWidth={2.5}
                    strokeDasharray="5 5"
                    dot={{ r: 4, fill: '#4f46e5', strokeWidth: 0 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Model Performance Details */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
              Model Performance Details
              <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full normal-case">
                {data.model}
              </span>
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <div className="text-xs font-semibold text-slate-500 mb-1">Training Days</div>
                <div className="text-lg font-bold text-slate-900">{data.training_days}</div>
                <div className="text-xs text-slate-400 mt-1">{data.historical_start} to {data.historical_end}</div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <div className="text-xs font-semibold text-slate-500 mb-1">Testing Split</div>
                <div className="text-lg font-bold text-slate-900">{data.test_days} days</div>
                <div className="text-xs text-slate-400 mt-1">Chronological validation</div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <div className="text-xs font-semibold text-slate-500 mb-1 capitalize">{activeMetric} MAE</div>
                <div className="text-lg font-bold text-slate-900">
                  {activeMetric !== 'orders' ? '₹' : ''}{data.metrics[activeMetric].mae}
                </div>
                <div className="text-xs text-slate-400 mt-1">Mean Absolute Error</div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <div className="text-xs font-semibold text-slate-500 mb-1 capitalize">{activeMetric} RMSE</div>
                <div className="text-lg font-bold text-slate-900">
                  {activeMetric !== 'orders' ? '₹' : ''}{data.metrics[activeMetric].rmse}
                </div>
                <div className="text-xs text-slate-400 mt-1">Root Mean Square Error</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ForecastKPI({ title, value, icon: Icon, color, isActive, onClick }) {
  const colorStyles = {
    blue: isActive ? 'bg-blue-600 text-white shadow-md shadow-blue-200 ring-2 ring-blue-600 ring-offset-2' : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700',
    indigo: isActive ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 ring-2 ring-indigo-600 ring-offset-2' : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700',
    emerald: isActive ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200 ring-2 ring-emerald-600 ring-offset-2' : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700',
    amber: isActive ? 'bg-amber-600 text-white shadow-md shadow-amber-200 ring-2 ring-amber-600 ring-offset-2' : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700',
  };

  const iconColors = {
    blue: isActive ? 'text-white/80' : 'text-blue-500 bg-blue-50',
    indigo: isActive ? 'text-white/80' : 'text-indigo-500 bg-indigo-50',
    emerald: isActive ? 'text-white/80' : 'text-emerald-500 bg-emerald-50',
    amber: isActive ? 'text-white/80' : 'text-amber-500 bg-amber-50',
  }

  return (
    <button 
      onClick={onClick}
      className={`text-left rounded-xl border p-5 transition-all w-full ${colorStyles[color]}`}
    >
      <div className="flex items-start justify-between mb-4">
        <p className={`text-xs font-semibold uppercase tracking-wider ${isActive ? 'text-white/80' : 'text-slate-500'}`}>
          {title}
        </p>
        <div className={`rounded-lg p-2 ${iconColors[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className={`text-2xl font-bold truncate ${isActive ? 'text-white' : 'text-slate-900'}`}>
        {value}
      </p>
    </button>
  );
}
