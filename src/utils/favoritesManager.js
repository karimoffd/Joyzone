import axios from 'axios';

const FAV_STORAGE_KEY = 'joyzone-favorite-places';
const API_URL = 'http://localhost:8000/api/favorites/';
const TOGGLE_URL = 'http://localhost:8000/api/favorites/toggle/';

function getUserToken() {
  let token = localStorage.getItem('joyzone-user-token');
  if (!token) {
    token = 'user-' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('joyzone-user-token', token);
  }
  return token;
}

export function getLocalFavorites() {
  try {
    const raw = localStorage.getItem(FAV_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function setLocalFavorites(favs) {
  try {
    localStorage.setItem(FAV_STORAGE_KEY, JSON.stringify(favs));
    window.dispatchEvent(new Event("joyzone-favorites-update"));
  } catch (e) {
    console.error("Failed to save favorites locally", e);
  }
}

export async function fetchFavoritesFromBackend() {
  try {
    const token = getUserToken();
    const res = await axios.get(API_URL, { params: { token } });
    if (res.data && Array.isArray(res.data)) {
      const backendPlaces = res.data.map(item => item.place).filter(Boolean);
      setLocalFavorites(backendPlaces);
      return backendPlaces;
    }
  } catch (err) {
    console.warn("Failed to fetch favorites from Django backend (using local fallback)", err.message);
  }
  return getLocalFavorites();
}

export async function toggleFavoritePlace(place) {
  if (!place || !place.id) return getLocalFavorites();
  
  const token = getUserToken();
  const currentFavs = getLocalFavorites();
  const exists = currentFavs.some(item => String(item.id) === String(place.id));
  
  // Optimistic local UI update
  let updatedFavs;
  if (exists) {
    updatedFavs = currentFavs.filter(item => String(item.id) !== String(place.id));
  } else {
    updatedFavs = [place, ...currentFavs];
  }
  setLocalFavorites(updatedFavs);

  // Sync to Django Backend
  try {
    const res = await axios.post(TOGGLE_URL, {
      place_id: place.id,
      token: token
    });
    if (res.data && Array.isArray(res.data.favorites)) {
      const serverPlaces = res.data.favorites.map(item => item.place).filter(Boolean);
      setLocalFavorites(serverPlaces);
      return serverPlaces;
    }
  } catch (err) {
    console.warn("Failed to toggle favorite on Django backend:", err.message);
  }

  return updatedFavs;
}

export function isPlaceFavorited(placeId) {
  const currentFavs = getLocalFavorites();
  return currentFavs.some(item => String(item.id) === String(placeId));
}
