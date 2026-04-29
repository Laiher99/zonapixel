// sync-manager.js
const DB_NAME = 'zp_offline_videos';
const DB_VERSION = 4;        // Incrementado para recrear stores
const STORE_VIDEOS = 'videos';
const STORE_IMAGES = 'images';

// Función para intentar activar el modo persistente (evita borrado por falta de espacio)
async function requestPersistence() {
    if (navigator.storage && navigator.storage.persist) {
        const isPersisted = await navigator.storage.persist();
        console.log(`Almacenamiento persistente: ${isPersisted ? 'Activado' : 'Denegado'}`);
    }
}

// Llámala al inicio de la app
requestPersistence();

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (db.objectStoreNames.contains(STORE_VIDEOS)) {
                db.deleteObjectStore(STORE_VIDEOS);
            }
            if (db.objectStoreNames.contains(STORE_IMAGES)) {
                db.deleteObjectStore(STORE_IMAGES);
            }
            const videoStore = db.createObjectStore(STORE_VIDEOS, { keyPath: 'id' });
            videoStore.createIndex('category', 'category');
            videoStore.createIndex('title', 'title');
            videoStore.createIndex('rating', 'rating');
            db.createObjectStore(STORE_IMAGES);
        };
    });
}

export async function saveImageBlob(url) {
    const db = await openDB();
    const tx = db.transaction(STORE_IMAGES, 'readonly');
    const store = tx.objectStore(STORE_IMAGES);
    const existing = await new Promise(res => {
        const req = store.get(url);
        req.onsuccess = () => res(req.result);
    });
    if (existing) return;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    const txWrite = db.transaction(STORE_IMAGES, 'readwrite');
    const storeWrite = txWrite.objectStore(STORE_IMAGES);
    storeWrite.put(blob, url);
    await txWrite.complete;
}

export async function getImageObjectURL(url) {
    if (!url) return null;
    const db = await openDB();
    const tx = db.transaction(STORE_IMAGES, 'readonly');
    const store = tx.objectStore(STORE_IMAGES);
    const blob = await new Promise(res => {
        const req = store.get(url);
        req.onsuccess = () => res(req.result);
    });
    return blob ? URL.createObjectURL(blob) : null;
}

async function saveVideos(videos) {
    const db = await openDB();
    const tx = db.transaction(STORE_VIDEOS, 'readwrite');
    const store = tx.objectStore(STORE_VIDEOS);
    for (const v of videos) store.put(v);
    await tx.complete;
}

export async function getAllVideos() {
    const db = await openDB();
    const tx = db.transaction(STORE_VIDEOS, 'readonly');
    const store = tx.objectStore(STORE_VIDEOS);
    return new Promise(res => {
        const req = store.getAll();
        req.onsuccess = () => res(req.result);
    });
}

export async function hasVideos() {
    const db = await openDB();
    const tx = db.transaction(STORE_VIDEOS, 'readonly');
    const store = tx.objectStore(STORE_VIDEOS);
    return new Promise(res => {
        const req = store.count();
        req.onsuccess = () => res(req.result > 0);
    });
}

const API_KEY = 'b0268f4bb5a5d29587d81251fb20604c'; // Reemplázala por tu clave
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p/w342';

const CATEGORIES = {
    peliculas: '/movie/popular',
    series: '/tv/popular',
    anime: '/discover/tv?with_genres=16&with_origin_country=JP',
    munes: '/discover/tv?with_genres=16',
    reality: '/discover/tv?with_genres=10764',
    novelas: '/discover/tv?with_genres=18&with_origin_country=ES|MX|CO'
};

async function fetchCategory(category, endpoint, page = 1) {
    const sep = endpoint.includes('?') ? '&' : '?';
    const url = `${BASE_URL}${endpoint}${sep}api_key=${API_KEY}&language=es&page=${page}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Error ${res.status}`);
    const data = await res.json();
    return data.results.map(item => ({
        id: `${category}-${item.id}`,
        title: item.title || item.name,
        category,
        year: (item.release_date || item.first_air_date || '').substring(0,4),
        posterURL: item.poster_path ? IMG_BASE + item.poster_path : null,
        overview: item.overview || '',
        rating: item.vote_average || 0   // NUEVO: calificación TMDB
    }));
}

export async function fullSync(onProgress) {
    const db = await openDB();
    const txVideos = db.transaction(STORE_VIDEOS, 'readwrite');
    await txVideos.objectStore(STORE_VIDEOS).clear();
    await txVideos.complete;
    const txImages = db.transaction(STORE_IMAGES, 'readwrite');
    await txImages.objectStore(STORE_IMAGES).clear();
    await txImages.complete;

    let allVideos = [];
    const totalPages = 25; // Puedes ajustar
    const totalCategories = Object.keys(CATEGORIES).length;

    for (const [cat, endpoint] of Object.entries(CATEGORIES)) {
        for (let p = 1; p <= totalPages; p++) {
            try {
                const videos = await fetchCategory(cat, endpoint, p);
                allVideos.push(...videos);
                onProgress({ phase: 'metadata', category: cat, page: p, totalPages, totalCategories });
                await new Promise(r => setTimeout(r, 300));
            } catch (e) {
                console.error(`Error en ${cat} página ${p}:`, e);
            }
        }
    }

    onProgress({ phase: 'metadata_done', totalVideos: allVideos.length });
    await saveVideos(allVideos);

    const videosWithPoster = allVideos.filter(v => v.posterURL);
    let downloadedImages = 0;
    const CONCURRENT = 3;
    const urls = videosWithPoster.map(v => v.posterURL);
    for (let i = 0; i < urls.length; i += CONCURRENT) {
        const batch = urls.slice(i, i + CONCURRENT);
        await Promise.all(batch.map(async url => {
            try { await saveImageBlob(url); } catch (e) {}
            downloadedImages++;
            onProgress({ phase: 'images', total: urls.length, current: downloadedImages });
        }));
        await new Promise(r => setTimeout(r, 200));
    }
    onProgress({ phase: 'complete' });
}