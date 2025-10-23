// Upload a vehicle photo and get the public URL
export async function uploadVehiclePhoto(fileUri: string): Promise<string> {
  const formData = new FormData();
  // @ts-ignore
  formData.append('file', { uri: fileUri, name: 'photo.jpg', type: 'image/jpeg' });
  const res = await authFetch(`${API_BASE_URL}/api/vehicles/upload-photo`, {
    method: 'POST',
    body: formData,
    headers: { 'Accept': 'application/json' },
  });
  if (!res.ok) throw new Error('Failed to upload photo');
  const data = await res.json();
  // The backend returns { url: "/uploads/filename.jpg" }
  // Compose full URL if needed
  if (data.url?.startsWith('/')) {
    return API_BASE_URL.replace(/\/$/, '') + data.url;
  }
  return data.url;
}
import { API_BASE_URL } from '../constants/api';
import { authFetch } from '../utils/auth';

export type Vehicle = {
  id: number;
  plate: string;
  brand?: string;
  model?: string;
  year?: string;
  color?: string;
  vin?: string;
  photos?: string[];
};

export async function listVehicles(): Promise<Vehicle[]> {
  const res = await authFetch(`${API_BASE_URL}/api/vehicles/`);
  if (!res.ok) throw new Error(`Failed to list vehicles: ${res.status}`);
  return res.json();
}

export type VehicleCreateBody = Omit<Vehicle, 'id'> & { id?: never };

export async function createVehicle(body: VehicleCreateBody): Promise<Vehicle> {
  const res = await authFetch(`${API_BASE_URL}/api/vehicles/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Failed to create vehicle: ${res.status}`);
  return res.json();
}

export async function updateVehicle(id: number, body: Partial<VehicleCreateBody>): Promise<Vehicle> {
  const res = await authFetch(`${API_BASE_URL}/api/vehicles/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Failed to update vehicle: ${res.status}`);
  return res.json();
}

export async function deleteVehicle(id: number): Promise<void> {
  const res = await authFetch(`${API_BASE_URL}/api/vehicles/${id}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 204) throw new Error(`Failed to delete vehicle: ${res.status}`);
}
