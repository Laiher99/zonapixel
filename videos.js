// videos.js
import * as db from './sync-manager.js';

let videosData = [];
let currentCategory = 'all';
let searchTerm = '';
let filterYear = '';
let filterMinRating = 0;
const itemsPerPage = 20;
let currentPage = 1;

// Excluir títulos con caracteres chinos (kanji, hanzi)
const EXCLUDE_CHINESE_TITLES = true;

// ---------- FAVORITOS ----------
let favorites = [];

function loadFavorites() {
    try {
        const stored = localStorage.getItem('zp_video_favorites');
        if (stored) {
            favorites = JSON.parse(stored);
        } else {
            favorites = [];
        }
    } catch (e) {
        favorites = [];
    }
}

function saveFavorites() {
    localStorage.setItem('zp_video_favorites', JSON.stringify(favorites));
}

function isFavorite(videoId) {
    return favorites.includes(videoId);
}

function toggleFavorite(videoId) {
    const index = favorites.indexOf(videoId);
    if (index > -1) {
        favorites.splice(index, 1);
    } else {
        favorites.push(videoId);
    }
    saveFavorites();
    return isFavorite(videoId);
}
// --------------------------------

const categoryNames = {
    peliculas: 'Películas', series: 'Series', anime: 'Anime',
    munes: 'Muñes', reality: 'Reality Shows', novelas: 'Novelas',
    favorites: 'Favoritos'
};
const categoryIcons = {
    peliculas: 'fa-film', series: 'fa-tv', anime: 'fa-dragon',
    munes: 'fa-child', reality: 'fa-users', novelas: 'fa-heart',
    favorites: 'fa-heart'
};

async function loadFromDB() {
    try {
        videosData = await db.getAllVideos();
        console.log(`📦 ${videosData.length} videos cargados desde IndexedDB`);
        if (videosData.length === 0) {
            document.getElementById('videosSectionsContainer').innerHTML = 
                '<div class="no-results">📭 No hay datos offline.<br>Haz clic en <strong>"Sincronizar todo"</strong> para descargar el catálogo.</div>';
        } else {
            renderContent();
        }
    } catch (e) {
        console.error('Error cargando datos:', e);
    }
}

function filterVideos() {
    return videosData.filter(v => {
        // Excluir títulos con caracteres chinos
        if (EXCLUDE_CHINESE_TITLES && /[\u4E00-\u9FFF\u3400-\u4DBF]/.test(v.title)) {
            return false;
        }
        
        // Filtro por favoritos
        if (currentCategory === 'favorites') {
            return isFavorite(v.id);
        }
        
        // Filtro por categoría normal
        if (currentCategory !== 'all' && v.category !== currentCategory) return false;
        
        // Búsqueda textual
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const matchTitle = v.title.toLowerCase().includes(term);
            const matchYear = v.year && v.year.toString().includes(term);
            const matchRating = v.rating && v.rating.toString().includes(term);
            if (!matchTitle && !matchYear && !matchRating) return false;
        }
        
        // Filtro por año exacto
        if (filterYear && v.year !== filterYear) return false;
        
        // Filtro por rating mínimo
        if (filterMinRating > 0 && (v.rating < filterMinRating)) return false;
        
        return true;
    });
}

async function renderVideoCard(video) {
    let imgHtml = '';
    if (video.posterURL) {
        try {
            const objUrl = await db.getImageObjectURL(video.posterURL);
            imgHtml = `<img src="${objUrl}" alt="${video.title}" loading="lazy">`;
        } catch (e) {
            console.warn(`Error cargando imagen para ${video.title}`, e);
            imgHtml = `<i class="fas ${categoryIcons[video.category]}" style="font-size:2.5rem;"></i>`;
        }
    } else {
        imgHtml = `<i class="fas ${categoryIcons[video.category]}" style="font-size:2.5rem;"></i>`;
    }
    
    const ratingHtml = video.rating ? `<span class="video-rating"><i class="fas fa-star"></i> ${video.rating.toFixed(1)}</span>` : '';
    const favIcon = isFavorite(video.id) ? '<i class="fas fa-heart video-fav-icon" style="color:#e74c3c; margin-left:4px;" title="En favoritos"></i>' : '';
    
    return `
        <div class="video-card" data-id="${video.id}">
            <div class="video-thumb">
                ${imgHtml}
                <span class="video-badge">${video.year || 'N/A'}</span>
            </div>
            <div class="video-info">
                <div class="video-title">${escapeHtml(video.title)}</div>
                <div class="video-meta">
                    <span><i class="fas fa-tag"></i> ${categoryNames[video.category]}</span>
                    ${ratingHtml}
                    ${favIcon}
                </div>
            </div>
        </div>
    `;
}

function escapeHtml(str) {
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

async function renderContent() {
    console.log(`🔍 Renderizando: categoría="${currentCategory}", búsqueda="${searchTerm}", año="${filterYear}", ratingMin=${filterMinRating}`);
    const filtered = filterVideos();
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;
    
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageVideos = filtered.slice(start, end);
    
    const container = document.getElementById('videosSectionsContainer');
    
    if (filtered.length === 0) {
        container.innerHTML = `<div class="no-results">No se encontraron resultados para los criterios actuales.</div>`;
        document.getElementById('fixedPagination').style.display = 'none';
        return;
    }
    
    let sectionTitle = 'Catálogo';
    let sectionIcon = 'fa-video';
    if (searchTerm) {
        sectionTitle = `Resultados para "${searchTerm}"`;
        sectionIcon = 'fa-search';
    } else if (currentCategory !== 'all') {
        sectionTitle = categoryNames[currentCategory];
        sectionIcon = categoryIcons[currentCategory];
    }
    
    const cards = [];
    for (const video of pageVideos) {
        cards.push(await renderVideoCard(video));
    }
    
    // Inyectar contenido principal (sin paginación)
    container.innerHTML = `
        <div class="video-category-section">
            <div class="section-header">
                <h2><i class="fas ${sectionIcon}"></i> ${sectionTitle}</h2>
                <span class="item-count">${filtered.length} títulos</span>
            </div>
            <div class="video-grid">
                ${cards.join('')}
            </div>
        </div>
    `;
    
    // Construir paginación para el contenedor fijo
    let paginationHtml = '';
    if (totalPages > 1) {
        paginationHtml = `
            <button class="pagination-btn" ${currentPage === 1 ? 'disabled' : ''} data-action="prev"><i class="fas fa-chevron-left"></i></button>
            <span class="pagination-info">Pág. ${currentPage} de ${totalPages}</span>
            <button class="pagination-btn" ${currentPage === totalPages ? 'disabled' : ''} data-action="next"><i class="fas fa-chevron-right"></i></button>
        `;
    }
    
    const fixedPagination = document.getElementById('fixedPagination');
    if (fixedPagination) {
        if (totalPages > 1) {
            fixedPagination.innerHTML = paginationHtml;
            fixedPagination.style.display = 'flex';
            
            // Event listeners para los botones
            fixedPagination.querySelector('[data-action="prev"]')?.addEventListener('click', () => {
                if (currentPage > 1) {
                    currentPage--;
                    renderContent();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
            fixedPagination.querySelector('[data-action="next"]')?.addEventListener('click', () => {
                if (currentPage < totalPages) {
                    currentPage++;
                    renderContent();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        } else {
            fixedPagination.style.display = 'none';
        }
    }
}

// Modal
const modal = document.getElementById('videoDetailModal');
const modalPoster = document.getElementById('modalPoster');
const modalTitle = document.getElementById('modalTitle');
const modalYear = document.getElementById('modalYear');
const modalCategory = document.getElementById('modalCategory');
const modalRating = document.getElementById('modalRating');
const modalOverview = document.getElementById('modalOverview');
const modalFavBtn = document.getElementById('modalFavBtn');
const closeModalBtn = document.querySelector('.close-modal');

let currentModalVideo = null;

async function openVideoModal(video) {
    currentModalVideo = video;
    modalTitle.textContent = video.title;
    modalYear.textContent = video.year || 'Año desconocido';
    modalCategory.textContent = categoryNames[video.category] || video.category;
    modalRating.textContent = video.rating ? `⭐ ${video.rating.toFixed(1)} / 10` : 'Sin calificación';
    modalOverview.textContent = video.overview || 'Descripción no disponible.';
    if (video.posterURL) {
        const url = await db.getImageObjectURL(video.posterURL);
        modalPoster.src = url || '';
    } else {
        modalPoster.src = '';
    }
    updateFavButton(video.id);
    modal.style.display = 'flex';
}

function updateFavButton(videoId) {
    if (!modalFavBtn) return;
    const isFav = isFavorite(videoId);
    modalFavBtn.innerHTML = isFav 
        ? '<i class="fas fa-heart"></i> Quitar de Favoritos'
        : '<i class="far fa-heart"></i> Agregar a Favoritos';
    modalFavBtn.classList.toggle('active', isFav);
}

if (modalFavBtn) {
    modalFavBtn.addEventListener('click', () => {
        if (!currentModalVideo) return;
        toggleFavorite(currentModalVideo.id);
        updateFavButton(currentModalVideo.id);
        if (currentCategory === 'favorites') {
            renderContent();
        } else {
            refreshVideoCardIcon(currentModalVideo.id);
        }
    });
}

function refreshVideoCardIcon(videoId) {
    const cards = document.querySelectorAll(`.video-card[data-id="${videoId}"]`);
    cards.forEach(card => {
        const favSpan = card.querySelector('.video-fav-icon');
        if (isFavorite(videoId)) {
            if (!favSpan) {
                const meta = card.querySelector('.video-meta');
                if (meta) {
                    const icon = document.createElement('i');
                    icon.className = 'fas fa-heart video-fav-icon';
                    icon.style.cssText = 'color:#e74c3c; margin-left:4px;';
                    icon.title = 'En favoritos';
                    meta.appendChild(icon);
                }
            }
        } else {
            if (favSpan) favSpan.remove();
        }
    });
}

closeModalBtn.addEventListener('click', () => modal.style.display = 'none');
window.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });

document.addEventListener('click', (e) => {
    const card = e.target.closest('.video-card');
    if (!card) return;
    const videoId = card.dataset.id;
    const video = videosData.find(v => v.id === videoId);
    if (video) openVideoModal(video);
});

// Configurar UI
function setupUI() {
    console.log('⚙️ Configurando eventos de UI');
    
    // Sincronización
    const syncBtn = document.getElementById('syncBtn');
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');

    if (syncBtn) {
        syncBtn.addEventListener('click', async () => {
            if (!navigator.onLine) { alert('Necesitas conexión para sincronizar.'); return; }
            syncBtn.disabled = true;
            progressContainer.style.display = 'block';
            progressText.textContent = 'Conectando con TMDB...';
            progressBar.value = 0;
            try {
                await db.fullSync((progress) => {
                    if (progress.phase === 'metadata') {
                        const catDisplay = categoryNames[progress.category] || progress.category;
                        progressText.textContent = `📥 ${catDisplay} pág ${progress.page}/${progress.totalPages}`;
                        const maxSteps = progress.totalCategories * progress.totalPages;
                        progressBar.max = maxSteps;
                        const currentStep = (Object.keys(categoryNames).indexOf(progress.category) * progress.totalPages) + progress.page;
                        progressBar.value = currentStep;
                    } else if (progress.phase === 'metadata_done') {
                        progressText.textContent = `✅ Metadatos completos: ${progress.totalVideos} títulos`;
                        progressBar.value = progressBar.max;
                    } else if (progress.phase === 'images') {
                        progressText.textContent = `🖼️ Imágenes: ${progress.current} de ${progress.total}`;
                        progressBar.max = progress.total;
                        progressBar.value = progress.current;
                    } else if (progress.phase === 'complete') {
                        progressText.textContent = '🎉 ¡Sincronización completa!';
                    }
                });
                await loadFromDB();
            } catch (e) {
                console.error('Error en sincronización:', e);
                alert('Error al sincronizar: ' + e.message);
            } finally {
                syncBtn.disabled = false;
                setTimeout(() => progressContainer.style.display = 'none', 2000);
            }
        });
    }

    // Botones de categoría
    const categoryBtns = document.querySelectorAll('.category-btn');
    categoryBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const category = btn.dataset.category;
            categoryBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCategory = category;
            currentPage = 1;
            if (category !== 'favorites') {
                searchTerm = '';
                document.getElementById('searchInput').value = '';
            }
            renderContent();
        });
    });

    // Buscador
    const searchInput = document.getElementById('searchInput');
    let debounce;
    searchInput.addEventListener('input', e => {
        clearTimeout(debounce);
        debounce = setTimeout(() => {
            searchTerm = e.target.value.trim();
            currentCategory = 'all';
            currentPage = 1;
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            document.querySelector('.category-btn[data-category="all"]').classList.add('active');
            renderContent();
        }, 300);
    });

    // Filtros adicionales
    const filterYearInput = document.getElementById('filterYear');
    const filterRatingSelect = document.getElementById('filterRating');
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');

    if (filterYearInput) {
        filterYearInput.addEventListener('input', (e) => {
            filterYear = e.target.value.trim();
            currentPage = 1;
            renderContent();
        });
    }
    if (filterRatingSelect) {
        filterRatingSelect.addEventListener('change', (e) => {
            filterMinRating = parseFloat(e.target.value) || 0;
            currentPage = 1;
            renderContent();
        });
    }
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
            if (filterYearInput) filterYearInput.value = '';
            if (filterRatingSelect) filterRatingSelect.value = '0';
            filterYear = '';
            filterMinRating = 0;
            currentPage = 1;
            renderContent();
        });
    }
}

// Inicio
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 ZP Videos iniciado');
    loadFavorites();
    const exists = await db.hasVideos();
    if (exists) {
        await loadFromDB();
    } else {
        document.getElementById('videosSectionsContainer').innerHTML = 
            '<div class="no-results">📭 No hay datos offline.<br>Haz clic en <strong>"Sincronizar todo"</strong> para descargar el catálogo.</div>';
    }
    setupUI();
});