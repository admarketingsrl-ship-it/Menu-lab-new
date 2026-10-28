import { getAccessToken } from './firebase';
import { Dish, RestaurantInfo } from '../types';

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  createdTime?: string;
}

export const exportMenuToGoogleDrive = async (restaurant: RestaurantInfo, dishes: Dish[]): Promise<string> => {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Autenticazione Google Drive richiesta. Effettua il login con Google.');
  }

  const metadata = {
    name: `MenuLab_Backup_${restaurant.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`,
    mimeType: 'application/json',
  };

  const fileContent = JSON.stringify({ restaurant, dishes, exportedAt: new Date().toISOString() }, null, 2);

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([fileContent], { type: 'application/json' }));

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: form,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Errore caricamento su Google Drive: ${errText}`);
  }

  const data = await response.json();
  return data.id;
};

export const listMenuBackupsFromGoogleDrive = async (): Promise<DriveFileItem[]> => {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Autenticazione Google Drive richiesta.');
  }

  const query = encodeURIComponent("name contains 'MenuLab_Backup_' and trashed = false");
  const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,mimeType,createdTime)`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Errore nel recupero dei file da Google Drive.');
  }

  const data = await response.json();
  return data.files || [];
};

export const downloadMenuFromGoogleDrive = async (fileId: string): Promise<{ restaurant: RestaurantInfo; dishes: Dish[] }> => {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Autenticazione Google Drive richiesta.');
  }

  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Errore nel download del file da Google Drive.');
  }

  return await response.json();
};
