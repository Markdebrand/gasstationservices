// Centralized API configuration
// Prefer EXPO_PUBLIC_API_URL. Fallback points to server on host port 8001 (mapped to container 8000).
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://168.231.64.20:8001';

export const endpoints = {
  authToken: `${API_BASE_URL}/api/auth/token`,
  authRegister: `${API_BASE_URL}/api/auth/register`,
  userProfile: `${API_BASE_URL}/api/users/me`,
  updateUserHSOPoints: (userId: number) => `${API_BASE_URL}/api/users/${userId}/hso_points`,
};
