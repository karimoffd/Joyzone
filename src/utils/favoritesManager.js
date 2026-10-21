import api, { getAccessToken, isStaleSessionError } from '../api/client.js';
import { normalizePlace } from './placeMapper.js';
import { getSessionGeneration, getStorageItem, removeStorageItem, setStorageItem, STORAGE_KEYS } from './storageKeys.js';

const USER_FAV_STORAGE_KEY = STORAGE_KEYS.offline.favorites;
const GUEST_FAV_STORAGE_KEY = STORAGE_KEYS.offline.guestFavorites;
const API_URL = '/api/favorites/';
const TOGGLE_URL = '/api/favorites/toggle/';
const MERGE_URL = '/api/favorites/merge/';
const pendingToggles = new Map();

function createGuestToken() {
  if (globalThis.crypto?.randomUUID) {
    return `guest-${globalThis.crypto.randomUUID()}`;
  }
  return `guest-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

export function getOrCreateGuestFavoritesToken() {
  let token = getStorageItem(STORAGE_KEYS.offline.guestFavoritesToken);
  if (!token) {
    token = createGuestToken();
    setStorageItem(STORAGE_KEYS.offline.guestFavoritesToken, token);
  }
  return token;
}

function authAwareConfig(config = {}) {
  return getAccessToken() ? config : { ...config, skipAuth: true };
}

function extractFavoritePlaces(payload) {
  const favorites = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.results)
      ? payload.results
      : [];
  const uniquePlaces = new Map();

  favorites.forEach((item) => {
    const place = item?.place || item;
    if (!place?.id) return;
    uniquePlaces.set(String(place.id), normalizePlace(place));
  });
  return [...uniquePlaces.values()];
}

function dispatchFavoritesUpdate(detail = {}) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('joyzone-favorites-update', { detail }));
}

function readFavoritesCache(storageKey) {
  try {
    const raw = getStorageItem(storageKey);
    return extractFavoritePlaces(raw ? JSON.parse(raw) : []);
  } catch (error) {
    return [];
  }
}

function activeFavoritesStorageKey() {
  return getAccessToken() ? USER_FAV_STORAGE_KEY : GUEST_FAV_STORAGE_KEY;
}

export function getLocalFavorites() {
  return readFavoritesCache(activeFavoritesStorageKey());
}

export function setLocalFavorites(favorites, detail = {}) {
  const normalized = extractFavoritePlaces(favorites);
  setStorageItem(activeFavoritesStorageKey(), JSON.stringify(normalized));
  dispatchFavoritesUpdate(detail);
  return normalized;
}

export async function fetchFavoritesFromBackend({ onDevFallback } = {}) {
  try {
    const authenticated = Boolean(getAccessToken());
    const config = authenticated
      ? authAwareConfig()
      : authAwareConfig({ params: { token: getOrCreateGuestFavoritesToken() } });
    const response = await api.get(API_URL, config);
    return setLocalFavorites(response.data, { source: 'backend' });
  } catch (error) {
    if (isStaleSessionError(error)) throw error;
    if (!import.meta.env.DEV) throw error;

    console.warn('Favorites API unavailable; using DEV localStorage fallback.', error.message);
    onDevFallback?.(error);
    dispatchFavoritesUpdate({ source: 'dev-fallback', error });
    return getLocalFavorites();
  }
}

async function performFavoriteToggle(place) {
  const previousFavorites = getLocalFavorites();
  const wasFavorite = previousFavorites.some((item) => String(item.id) === String(place.id));
  const optimisticFavorites = wasFavorite
    ? previousFavorites.filter((item) => String(item.id) !== String(place.id))
    : [normalizePlace(place), ...previousFavorites];

  setLocalFavorites(optimisticFavorites, { source: 'optimistic', placeId: place.id });

  try {
    const response = await api.post(TOGGLE_URL, {
      place_id: place.id,
      token: getOrCreateGuestFavoritesToken(),
    }, authAwareConfig());
    return setLocalFavorites(response.data?.favorites || [], {
      source: 'backend',
      placeId: place.id,
      favorited: Boolean(response.data?.favorited),
    });
  } catch (error) {
    if (isStaleSessionError(error)) throw error;
    if (import.meta.env.DEV) {
      console.warn('Favorites API unavailable; keeping DEV localStorage fallback.', error.message);
      dispatchFavoritesUpdate({ source: 'dev-fallback', placeId: place.id, error });
      return optimisticFavorites;
    }

    setLocalFavorites(previousFavorites, { source: 'rollback', placeId: place.id, error });
    throw error;
  }
}

export function toggleFavoritePlace(place) {
  if (!place?.id) return Promise.resolve(getLocalFavorites());

  const placeKey = `${getSessionGeneration()}:${place.id}`;
  if (pendingToggles.has(placeKey)) return pendingToggles.get(placeKey);

  const request = performFavoriteToggle(place)
    .finally(() => pendingToggles.delete(placeKey));
  pendingToggles.set(placeKey, request);
  return request;
}

export async function mergeAnonymousFavorites({ onDevFallback } = {}) {
  if (!getAccessToken()) return getLocalFavorites();

  const guestFallback = readFavoritesCache(GUEST_FAV_STORAGE_KEY);

  try {
    const response = await api.post(MERGE_URL, {
      token: getOrCreateGuestFavoritesToken(),
    });
    const favorites = setLocalFavorites(response.data?.favorites || [], { source: 'backend-merge' });
    removeStorageItem(GUEST_FAV_STORAGE_KEY);
    return favorites;
  } catch (error) {
    if (isStaleSessionError(error)) throw error;
    if (!import.meta.env.DEV) throw error;

    console.warn('Favorites merge unavailable; keeping DEV localStorage fallback.', error.message);
    onDevFallback?.(error);
    if (guestFallback.length > 0) {
      setLocalFavorites(guestFallback, { source: 'dev-fallback', error });
      return guestFallback;
    }
    dispatchFavoritesUpdate({ source: 'dev-fallback', error });
    return getLocalFavorites();
  }
}

export function isPlaceFavorited(placeId) {
  return getLocalFavorites().some((item) => String(item.id) === String(placeId));
}
