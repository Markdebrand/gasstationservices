import { API_BASE_URL } from '../constants/api';
import { authFetch } from '../utils/auth';

export type SavedLocation = {
  id: number;
  name: string;
  address: string;
  lat: number;
  lon: number;
};

export async function listLocations(): Promise<SavedLocation[]> {
  const res = await authFetch(`${API_BASE_URL}/api/locations/`);
  if (!res.ok) throw new Error(`Failed to list locations: ${res.status}`);
  return res.json();
}

export async function createLocation(body: Omit<SavedLocation, 'id'>): Promise<SavedLocation> {
  const res = await authFetch(`${API_BASE_URL}/api/locations/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Failed to create location: ${res.status}`);
  return res.json();
}

export async function deleteLocation(id: number): Promise<void> {
  const res = await authFetch(`${API_BASE_URL}/api/locations/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok && res.status !== 204) throw new Error(`Failed to delete location: ${res.status}`);
}
