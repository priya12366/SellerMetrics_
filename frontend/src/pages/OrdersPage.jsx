import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Loader2, AlertCircle, FileX2 } from 'lucide-react';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrders = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const response = await fetch('http://127.0.0.1:8000/api/orders', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.status === 401) {
          localStorage.removeItem('access_token');
          navigate('/login');
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to load orders.');
        }

        const data = await response.json();
        setOrders(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-lg font-medium">Loading orders...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700 flex items-start gap-4">
          <AlertCircle className="h-6 w-6 shrink-0" />
          <div>
            <h3 className="text-lg font-bold">Error</h3>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <ShoppingBag className="h-6 w-6 text-indigo-600" />
            My Orders
          </h1>
          <p className="mt-1 text-slate-500">View and manage your imported orders.</p>
        </div>
        <div className="text-sm font-medium text-slate-500 bg-white border border-slate-200 px-4 py-2 rounded-lg shadow-sm">
          Total: {orders.length}
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 py-24 text-center">
          <FileX2 className="h-12 w-12 text-slate-400 mb-4" />
          <h3 className="text-lg font-bold text-slate-900">No orders found</h3>
          <p className="mt-2 text-slate-500 max-w-sm">
            You haven't imported any orders yet. Go to the dashboard to upload your Orders.csv.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-900 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-semibold">Sub Order No</th>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold">Product</th>
                  <th className="px-6 py-4 font-semibold">SKU</th>
                  <th className="px-6 py-4 font-semibold">Qty</th>
                  <th className="px-6 py-4 font-semibold">Price</th>
                  <th className="px-6 py-4 font-semibold">COGS/Unit</th>
                  <th className="px-6 py-4 font-semibold">Total COGS</th>
                  <th className="px-6 py-4 font-semibold">State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{order.sub_order_no}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {order.order_date ? new Date(order.order_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="line-clamp-2" title={order.product_name}>{order.product_name || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200">
                        {order.sku || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4">{order.quantity || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">
                      {order.supplier_discounted_price !== null ? `₹${order.supplier_discounted_price.toFixed(2)}` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {order.has_cost ? `₹${order.cost_per_unit.toFixed(2)}` : <span className="italic text-slate-400">N/A</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">
                      {order.has_cost ? `₹${order.total_cost.toFixed(2)}` : <span className="italic text-slate-400">N/A</span>}
                    </td>
                    <td className="px-6 py-4">{order.customer_state || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
