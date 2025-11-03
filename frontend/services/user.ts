import { API_BASE_URL } from '../constants/api';
import { authFetch, getToken } from '../utils/auth';

export async function fetchUserProfile() {
  console.log('API_BASE_URL', API_BASE_URL);
  const token = await getToken();
  console.log('Current token:', token);
  const res = await authFetch(`${API_BASE_URL}/api/users/me`);
  console.log('user/me status', res.status);
  if (!res.ok) {
    const text = await res.text();
    console.log('user/me error', text);
    throw new Error('Failed to fetch user profile');
  }
  const data = await res.json();
  console.log('user/me data', data);
  return data;
}

export async function updateUserHSOPoints(userId: number, hso_points: number) {
  const token = await getToken();
  const res = await authFetch(
    `${API_BASE_URL}/api/users/${userId}/hso_points`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ hso_points }),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error('Failed to update HSO Points: ' + text);
  }
  return res.json();
}
