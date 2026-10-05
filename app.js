
const API_KEY = 'TU_API_KEY_AQUI';

const BASE_URL = 'https://api.themoviedb.org/3';

const IMAGE_URL = 'https://image.tmdb.org/t/p/w500';

const LANGUAGE = 'es-ES';

const searchInput = document.getElementById('search');
const clearSearchBtn = document.getElementById('clear-search');

const resultsTitle = document.getElementById('results-title');
const resultsCount = document.getElementById('results-count');
const moviesGrid = document.getElementById('movies-grid');

const loadingDiv = document.getElementById('loading');
const errorDiv = document.getElementById('error');
const errorMessage = document.getElementById('error-message');
const retryBtn = document.getElementById('retry-btn');

const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const pageInfo = document.getElementById('page-info');

const modal = document.getElementById('movie-modal');
const modalOverlay = document.getElementById('modal-overlay');
const modalClose = document.getElementById('modal-close');
const modalBody = document.getElementById('modal-body');

const notification = document.getElementById('notification');
const themeToggle = document.getElementById('theme-toggle');

let currentPage = 1;

let totalPages = 1;

let currentSearch = '';

let lastAction = null;

const mostrarNotificacion = (mensaje, tipo = 'success') => {

    notification.textContent = mensaje;

    notification.className = 'notification';

    if (tipo === 'success') {
        notification.classList.add('notification--success');
    } else {
        notification.classList.add('notification--error');
    }

    notification.classList.add('notification--show');

    setTimeout(() => {
        notification.classList.remove('notification--show');
    }, 3000);
};

const mostrarLoading = () => {
    loadingDiv.style.display = 'flex';
    errorDiv.style.display = 'none';
    moviesGrid.innerHTML = '';
};

const ocultarLoading = () => {
    loadingDiv.style.display = 'none';
};

const mostrarError = (mensaje) => {
    ocultarLoading();
    errorMessage.textContent = mensaje;
    errorDiv.style.display = 'flex';
    moviesGrid.innerHTML = '';
};

const obtenerAño = (fecha) => {
    if (!fecha) return 'N/A';
    return fecha.split('-')[0];
};

const obtenerImagen = (path) => {
    if (!path) {
        return 'https://via.placeholder.com/500x750/cccccc/666666?text=Sin+Imagen';
    }
    return `${IMAGE_URL}${path}`;
};

const construirUrl = (endpoint, params = {}) => {

    const defaultParams = {
        api_key: API_KEY,
        language: LANGUAGE
    };

    const allParams = { ...defaultParams, ...params };

    const queryString = Object.keys(allParams)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(allParams[key])}`)
        .join('&');
    
    return `${BASE_URL}${endpoint}?${queryString}`;
};

const obtenerPeliculasPopulares = async (page = 1) => {

    if (!API_KEY || API_KEY === 'TU_API_KEY_AQUI') {
        throw new Error('Debes configurar tu API Key de TMDB en app.js');
    }

    const url = construirUrl('/movie/popular', { page });

    console.log(`🌐 Petición: ${url}`);

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    return data;
};

const buscarPeliculas = async (query, page = 1) => {
    if (!query || query.trim() === '') {
        return obtenerPeliculasPopulares(page);
    }
    
    const url = construirUrl('/search/movie', { 
        query: query.trim(), 
        page 
    });
    
    console.log(`🔍 Búsqueda: ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
};

const obtenerDetallePelicula = async (id) => {
    const url = construirUrl(`/movie/${id}`, { 
        append_to_response: 'credits,videos' 
    });
    
    console.log(`📽️ Detalle: ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error(`Error HTTP ${response.status}`);
    }
    
    const data = await response.json();
    return data;
};

const crearTarjetaPelicula = (pelicula) => {

    const { id, title, release_date, vote_average, poster_path, overview } = pelicula;

    const año = obtenerAño(release_date);
    const imagen = obtenerImagen(poster_path);
    const rating = vote_average ? vote_average.toFixed(1) : 'N/A';
    const descripcion = overview || 'Sin descripción disponible.';

    return `
        <article class="movie-card" data-id="${id}">
            <div class="movie-card__poster">
                <img 
                    class="movie-card__image" 
                    src="${imagen}" 
                    alt="${title}"
                    onerror="this.src='https://via.placeholder.com/500x750/cccccc/666666?text=Sin+Imagen'">
                <span class="movie-card__rating">⭐ ${rating}</span>
            </div>
            <div class="movie-card__content">
                <h3 class="movie-card__title">${title}</h3>
                <p class="movie-card__year">📅 ${año}</p>
                <p class="movie-card__overview">${descripcion}</p>
            </div>
        </article>
    `;
};

const renderizarPeliculas = (peliculas) => {

    if (!peliculas || peliculas.length === 0) {
        moviesGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 48px; color: var(--color-text-light);">
                <p style="font-size: 3rem;">🔍</p>
                <p style="font-size: 1.25rem;">No se encontraron películas</p>
            </div>
        `;
        return;
    }

    moviesGrid.innerHTML = peliculas.map(crearTarjetaPelicula).join('');
    
    console.log(`✅ ${peliculas.length} películas renderizadas`);
};

const cargarPeliculas = async () => {

    mostrarLoading();

    lastAction = cargarPeliculas;
    
    try {

        let data;
        if (currentSearch) {
            data = await buscarPeliculas(currentSearch, currentPage);
            resultsTitle.textContent = `🔍 Resultados para "${currentSearch}"`;
        } else {
            data = await obtenerPeliculasPopulares(currentPage);
            resultsTitle.textContent = '🎥 Películas Populares';
        }

        ocultarLoading();

        renderizarPeliculas(data.results);

        totalPages = data.total_pages > 500 ? 500 : data.total_pages; /* TMDB limita a 500 */
        actualizarPaginacion();

        resultsCount.textContent = `${data.total_results.toLocaleString()} películas encontradas`;

        window.scrollTo({ top: 0, behavior: 'smooth' });
        
    } catch (error) {

        console.error('❌ Error:', error);
        
        let mensaje = 'Error al cargar las películas.';
        
        if (error.message.includes('API Key')) {
            mensaje = '⚠️ Configura tu API Key de TMDB en app.js';
        } else if (error.message.includes('fetch')) {
            mensaje = '🌐 Error de red. Verifica tu conexión a Internet.';
        } else {
            mensaje = error.message;
        }
        
        mostrarError(mensaje);
        mostrarNotificacion('Error al cargar películas', 'error');
    }
};

const actualizarPaginacion = () => {
    pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage >= totalPages;
};

const mostrarDetalle = async (id) => {
    try {
        modal.classList.add('modal--show');
        modalBody.innerHTML = `
            <div style="text-align: center; padding: 32px;">
                <div class="loading__spinner" style="margin: 0 auto;"></div>
                <p style="margin-top: 16px; color: var(--color-text-light);">Cargando detalle...</p>
            </div>
        `;

        const pelicula = await obtenerDetallePelicula(id);
        
        /* Destructuring */
        const { 
            title, 
            release_date, 
            vote_average, 
            vote_count,
            poster_path, 
            overview,
            genres,
            runtime,
            tagline
        } = pelicula;

        const año = obtenerAño(release_date);
        const imagen = obtenerImagen(poster_path);
        const rating = vote_average ? vote_average.toFixed(1) : 'N/A';
        const generos = genres ? genres.map(g => g.name).join(', ') : 'N/A';
        const duracion = runtime ? `${runtime} min` : 'N/A';

        modalBody.innerHTML = `
            <img 
                src="${imagen}" 
                alt="${title}"
                style="width: 200px; border-radius: 12px; margin: 0 auto; display: block;"
                onerror="this.src='https://via.placeholder.com/500x750/cccccc/666666?text=Sin+Imagen'">
            
            <h2 class="modal__title">${title}</h2>
            
            ${tagline ? `<p class="modal__subtitle">"${tagline}"</p>` : ''}
            
            <div class="modal__info">
                <span>📅 ${año}</span>
                <span>⏱️ ${duracion}</span>
                <span>🎭 ${generos}</span>
                <span>⭐ ${rating}/10 (${vote_count.toLocaleString()} votos)</span>
            </div>
            
            <p class="modal__overview">${overview || 'Sin descripción disponible.'}</p>
        `;
        
        console.log('✅ Detalle cargado:', title);
        
    } catch (error) {
        console.error('❌ Error al cargar detalle:', error);
        modalBody.innerHTML = `
            <div style="text-align: center; padding: 32px;">
                <p style="font-size: 3rem;">😢</p>
                <p style="color: var(--color-error);">No se pudo cargar el detalle</p>
            </div>
        `;
    }
};

const cerrarModal = () => {
    modal.classList.remove('modal--show');
    modalBody.innerHTML = '';
};

let timeoutBusqueda = null;

searchInput.addEventListener('input', (evento) => {
    const valor = evento.target.value;

    clearTimeout(timeoutBusqueda);

    timeoutBusqueda = setTimeout(() => {
        currentSearch = valor.trim();
        currentPage = 1;
        
        if (currentSearch === '') {
            resultsTitle.textContent = '🎥 Películas Populares';
        }
        
        cargarPeliculas();
    }, 500);
});

clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    currentSearch = '';
    currentPage = 1;
    cargarPeliculas();
    mostrarNotificacion('Búsqueda limpiada');
});

prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        cargarPeliculas();
    }
});

nextPageBtn.addEventListener('click', () => {
    if (currentPage < totalPages) {
        currentPage++;
        cargarPeliculas();
    }
});

retryBtn.addEventListener('click', () => {
    if (lastAction) {
        lastAction();
    } else {
        cargarPeliculas();
    }
});

moviesGrid.addEventListener('click', (evento) => {

    const tarjeta = evento.target.closest('.movie-card');
    
    if (tarjeta) {
        const id = parseInt(tarjeta.dataset.id);
        mostrarDetalle(id);
    }
});

modalClose.addEventListener('click', cerrarModal);

modalOverlay.addEventListener('click', cerrarModal);

document.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape' && modal.classList.contains('modal--show')) {
        cerrarModal();
    }
});

const toggleTheme = () => {
    const temaActual = document.body.getAttribute('data-theme');
    
    if (temaActual === 'dark') {
        document.body.removeAttribute('data-theme');
        themeToggle.textContent = '🌙';
        localStorage.setItem('theme', 'light');
    } else {
        document.body.setAttribute('data-theme', 'dark');
        themeToggle.textContent = '☀️';
        localStorage.setItem('theme', 'dark');
    }
};

const cargarTema = () => {
    const temaGuardado = localStorage.getItem('theme');
    
    if (temaGuardado === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        themeToggle.textContent = '☀️';
    } else if (temaGuardado === 'light') {
        document.body.removeAttribute('data-theme');
        themeToggle.textContent = '🌙';
    } else {
        const prefiereOscuro = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefiereOscuro) {
            document.body.setAttribute('data-theme', 'dark');
            themeToggle.textContent = '☀️';
        }
    }
};

themeToggle.addEventListener('click', toggleTheme);

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Club de Videos - API TMDB');
    console.log('🔑 API Key configurada:', API_KEY !== 'TU_API_KEY_AQUI' ? '✅ Sí' : '❌ No');

    cargarTema();

    if (!API_KEY || API_KEY === 'TU_API_KEY_AQUI') {
        mostrarError('⚠️ Debes configurar tu API Key de TMDB en app.js');
        return;
    }

    cargarPeliculas();
});