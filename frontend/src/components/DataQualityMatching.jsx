import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, AlertCircle, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function DataQualityMatching() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Unmatched Orders State
  const [unmatchedOrders, setUnmatchedOrders] = useState([]);
  const [ordersExpanded, setOrdersExpanded] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersPage, setOrdersPage] = useState(0);
  const [ordersTotal, setOrdersTotal] = useState(0);

  // Unmatched Payments State
  const [unmatchedPayments, setUnmatchedPayments] = useState([]);
  const [paymentsExpanded, setPaymentsExpanded] = useState(false);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsPage, setPaymentsPage] = useState(0);
  const [paymentsTotal, setPaymentsTotal] = useState(0);

  const fetchSummary = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch('http://127.0.0.1:8000/api/reports/matching-summary', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) {
        localStorage.removeItem('access_token');
        navigate('/login');
        return;
      }
      if (!res.ok) throw new Error('Failed to load matching summary');
      const result = await res.json();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnmatchedOrders = async (page = 0) => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    try {
      setOrdersLoading(true);
      const skip = page * 10;
      const res = await fetch(`http://127.0.0.1:8000/api/reports/unmatched-orders?skip=${skip}&limit=10`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const result = await res.json();
        if (page === 0) setUnmatchedOrders(result.items);
        else setUnmatchedOrders(prev => [...prev, ...result.items]);
        setOrdersTotal(result.total);
        setOrdersPage(page);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setOrdersLoading(false);
    }
  };

  const fetchUnmatchedPayments = async (page = 0) => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    try {
      setPaymentsLoading(true);
      const skip = page * 10;
      const res = await fetch(`http://127.0.0.1:8000/api/reports/unmatched-payments?skip=${skip}&limit=10`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const result = await res.json();
        if (page === 0) setUnmatchedPayments(result.items);
        else setUnmatchedPayments(prev => [...prev, ...result.items]);
        setPaymentsTotal(result.total);
        setPaymentsPage(page);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPaymentsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const toggleOrders = () => {
    if (!ordersExpanded && unmatchedOrders.length === 0) {
      fetchUnmatchedOrders(0);
    }
    setOrdersExpanded(!ordersExpanded);
  };

  const togglePayments = () => {
    if (!paymentsExpanded && unmatchedPayments.length === 0) {
      fetchUnmatchedPayments(0);
    }
    setPaymentsExpanded(!paymentsExpanded);
  };

  if (loading) {
    return (
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm flex justify-center items-center h-48">
        <div className="text-slate-500 animate-pulse">Analyzing your order and payment data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-8 shadow-sm">
        <div className="flex items-center gap-3 text-red-700">
          <AlertCircle className="h-6 w-6" />
          <h2 className="text-xl font-bold">Failed to load analytics</h2>
        </div>
        <p className="mt-2 text-sm text-red-600">{error}</p>
        <button onClick={fetchSummary} className="mt-4 rounded-lg bg-red-100 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-200">
          Retry
        </button>
      </div>
    );
  }

  if (!data || (data.orders.total_rows === 0 && data.payments.total_rows === 0)) {
    return (
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
        <ShieldCheck className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900">Data Quality & Matching</h2>
        <p className="mt-2 text-slate-500">No order or payment data available yet. Upload your files to see analytics here.</p>
      </div>
    );
  }

  const { orders, payments, matching, data_quality } = data;
  
  let progressColor = "bg-red-500";
  if (matching.match_rate >= 80) progressColor = "bg-green-500";
  else if (matching.match_rate >= 50) progressColor = "bg-amber-500";

  return (
    <div className="mt-8 space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">Data Quality & Matching</h2>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-700 border border-indigo-100">
            <ShieldCheck className="h-4 w-4" />
            Analytics Engine
          </span>
        </div>

        {/* Primary Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Orders</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{orders.total_rows}</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Payment Rows</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{payments.total_rows}</p>
          </div>
          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
            <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Matched Orders</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{matching.matched_orders}</p>
          </div>
          <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
            <p className="text-xs font-medium text-orange-600 uppercase tracking-wider">Unmatched Orders</p>
            <p className="text-2xl font-bold text-orange-700 mt-1">{matching.unmatched_orders}</p>
          </div>
          <div className="p-4 bg-rose-50 rounded-xl border border-rose-100">
            <p className="text-xs font-medium text-rose-600 uppercase tracking-wider">Unmatched Pays</p>
            <p className="text-2xl font-bold text-rose-700 mt-1">{matching.unmatched_payment_rows}</p>
          </div>
          <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
            <p className="text-xs font-medium text-indigo-600 uppercase tracking-wider">Match Rate</p>
            <p className="text-2xl font-bold text-indigo-700 mt-1">{matching.match_rate}%</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-8 p-6 bg-slate-50 rounded-xl border border-slate-100">
          <div className="flex justify-between items-end mb-2">
            <div>
              <p className="text-sm font-semibold text-slate-900">Order Match Rate</p>
              <p className="text-xs text-slate-500 mt-0.5">{matching.matched_orders} of {orders.unique_sub_orders} unique orders matched</p>
            </div>
            <span className="text-lg font-bold text-slate-900">{matching.match_rate}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2.5">
            <div className={`h-2.5 rounded-full ${progressColor} transition-all duration-1000 ease-out`} style={{ width: `${matching.match_rate}%` }}></div>
          </div>
        </div>

        {/* Data Quality Summary */}
        <div className="mb-8">
          <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider">Data Quality Checks</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {orders.total_rows > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="text-slate-700">Orders imported successfully</span>
              </div>
            )}
            {payments.total_rows > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="text-slate-700">Payments imported successfully</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              {data_quality.duplicate_order_rows > 0 ? (
                <><AlertTriangle className="h-4 w-4 text-orange-500" /><span className="text-orange-700 font-medium">{data_quality.duplicate_order_rows} duplicate order rows detected</span></>
              ) : (
                <><CheckCircle2 className="h-4 w-4 text-emerald-500" /><span className="text-slate-700">No duplicate order rows</span></>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm">
              {data_quality.duplicate_payment_rows > 0 ? (
                <><AlertTriangle className="h-4 w-4 text-orange-500" /><span className="text-orange-700 font-medium">{data_quality.duplicate_payment_rows} duplicate payment rows detected</span></>
              ) : (
                <><CheckCircle2 className="h-4 w-4 text-emerald-500" /><span className="text-slate-700">No duplicate payment rows</span></>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm">
              {data_quality.orders_missing_sub_order_no > 0 ? (
                <><AlertTriangle className="h-4 w-4 text-orange-500" /><span className="text-orange-700 font-medium">{data_quality.orders_missing_sub_order_no} orders missing Sub Order No</span></>
              ) : (
                <><CheckCircle2 className="h-4 w-4 text-emerald-500" /><span className="text-slate-700">No missing Sub Order No in Orders</span></>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm">
              {data_quality.payments_missing_sub_order_no > 0 ? (
                <><AlertTriangle className="h-4 w-4 text-orange-500" /><span className="text-orange-700 font-medium">{data_quality.payments_missing_sub_order_no} payments missing Sub Order No</span></>
              ) : (
                <><CheckCircle2 className="h-4 w-4 text-emerald-500" /><span className="text-slate-700">No missing Sub Order No in Payments</span></>
              )}
            </div>
          </div>
        </div>

        {/* Expandable Unmatched Orders */}
        <div className="border border-slate-200 rounded-xl overflow-hidden mb-4">
          <button 
            onClick={toggleOrders}
            className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="font-semibold text-slate-900">Unmatched Orders</span>
              <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-bold text-orange-700">
                {matching.unmatched_orders}
              </span>
            </div>
            {ordersExpanded ? <ChevronUp className="h-5 w-5 text-slate-500" /> : <ChevronDown className="h-5 w-5 text-slate-500" />}
          </button>
          
          {ordersExpanded && (
            <div className="p-0 border-t border-slate-200">
              {ordersLoading && unmatchedOrders.length === 0 ? (
                <div className="p-8 text-center text-slate-500 animate-pulse">Loading orders...</div>
              ) : unmatchedOrders.length === 0 ? (
                <div className="p-8 text-center text-slate-500">All orders are matched!</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 font-semibold text-slate-600">Sub Order No</th>
                        <th className="px-4 py-3 font-semibold text-slate-600">Order Date</th>
                        <th className="px-4 py-3 font-semibold text-slate-600">Product</th>
                        <th className="px-4 py-3 font-semibold text-slate-600">SKU</th>
                        <th className="px-4 py-3 font-semibold text-slate-600">Sale Amount</th>
                        <th className="px-4 py-3 font-semibold text-slate-600">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {unmatchedOrders.map((order, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-medium text-slate-900">{order.sub_order_no || 'N/A'}</td>
                          <td className="px-4 py-3 text-slate-600">{order.order_date ? new Date(order.order_date).toLocaleDateString() : 'N/A'}</td>
                          <td className="px-4 py-3 text-slate-600 truncate max-w-[150px]">{order.product_name || 'N/A'}</td>
                          <td className="px-4 py-3 text-slate-600">{order.sku || 'N/A'}</td>
                          <td className="px-4 py-3 text-slate-600">₹{order.supplier_listed_price || '0.00'}</td>
                          <td className="px-4 py-3 text-orange-600 text-xs font-medium">No matching payment record found</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {unmatchedOrders.length < ordersTotal && (
                    <div className="p-4 border-t border-slate-100 text-center">
                      <button 
                        onClick={() => fetchUnmatchedOrders(ordersPage + 1)}
                        disabled={ordersLoading}
                        className="text-sm font-semibold text-indigo-600 hover:text-indigo-800"
                      >
                        {ordersLoading ? 'Loading...' : 'Load More'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Expandable Unmatched Payments */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <button 
            onClick={togglePayments}
            className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="font-semibold text-slate-900">Unmatched Payment Rows</span>
              <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-700">
                {matching.unmatched_payment_rows}
              </span>
            </div>
            {paymentsExpanded ? <ChevronUp className="h-5 w-5 text-slate-500" /> : <ChevronDown className="h-5 w-5 text-slate-500" />}
          </button>
          
          {paymentsExpanded && (
            <div className="p-0 border-t border-slate-200">
              {paymentsLoading && unmatchedPayments.length === 0 ? (
                <div className="p-8 text-center text-slate-500 animate-pulse">Loading payments...</div>
              ) : unmatchedPayments.length === 0 ? (
                <div className="p-8 text-center text-slate-500">All payments are matched!</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 font-semibold text-slate-600">Sub Order No</th>
                        <th className="px-4 py-3 font-semibold text-slate-600">Transaction ID</th>
                        <th className="px-4 py-3 font-semibold text-slate-600">Payment Date</th>
                        <th className="px-4 py-3 font-semibold text-slate-600">Type / Status</th>
                        <th className="px-4 py-3 font-semibold text-slate-600">Final Settlement</th>
                        <th className="px-4 py-3 font-semibold text-slate-600">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {unmatchedPayments.map((pay, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-medium text-slate-900">{pay.sub_order_no || 'N/A'}</td>
                          <td className="px-4 py-3 text-slate-600">{pay.transaction_id || 'N/A'}</td>
                          <td className="px-4 py-3 text-slate-600">{pay.payment_date ? new Date(pay.payment_date).toLocaleDateString() : 'N/A'}</td>
                          <td className="px-4 py-3 text-slate-600">{pay.live_order_status || 'N/A'}</td>
                          <td className="px-4 py-3 font-medium text-slate-900">₹{pay.final_settlement_amount || '0.00'}</td>
                          <td className="px-4 py-3 text-rose-600 text-xs font-medium">No matching order record found</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {unmatchedPayments.length < paymentsTotal && (
                    <div className="p-4 border-t border-slate-100 text-center">
                      <button 
                        onClick={() => fetchUnmatchedPayments(paymentsPage + 1)}
                        disabled={paymentsLoading}
                        className="text-sm font-semibold text-indigo-600 hover:text-indigo-800"
                      >
                        {paymentsLoading ? 'Loading...' : 'Load More'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
