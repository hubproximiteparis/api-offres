/**
 * HUB PROXIMITÉ - CONFIGURATION GLOBALE CLIENT
 */
const CONFIG = {
    // URL de base du serveur (sans /api pour éviter les doublons)
    API_BASE_URL: 'http://localhost:3050',

    // Chemins des endpoints API
    ENDPOINTS: {
        CONFIG: '/api/config',
        SEARCH: '/api/search',
        FAVORIS: '/api/favoris',
        TRACK: '/api/track-action',
        SUGGESTIONS: '/api/suggestions'
    },

    // Paramètres par défaut
    SEARCH_DEFAULTS: {
        RANGE: '0-99', 
        TYPE: 'emploi'
    }
};

// Gel de l'objet pour la sécurité
Object.freeze(CONFIG);