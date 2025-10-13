// Centralized API configuration
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://168.231.64.20:8001';

export const endpoints = {
  authToken: `${API_BASE_URL}/api/auth/token`,
  authRegister: `${API_BASE_URL}/api/auth/register`,
};
