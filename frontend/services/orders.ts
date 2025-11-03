import { API_BASE_URL } from '../constants/api';
import { authFetch, getToken } from '../utils/auth';

export async function fetchOrders() {
  const token = await getToken();
  const res = await authFetch(`${API_BASE_URL}/api/orders/`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error('Failed to fetch orders');
  return res.json();
}

export async function createOrder(order) {
  const token = await getToken();
  const res = await authFetch(`${API_BASE_URL}/api/orders/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(order),
  });
  if (!res.ok) throw new Error('Failed to create order');
  return res.json();
}
