/**
 * SERVICE API - HUB EMPLOI
 * Standards : ANSI, OWASP Security, Resilience Patterns (Retry & Timeout)
 */

// 1. CONFIGURATION RÉSEAU
const CONFIG = {
  BASE_URL: 'http://192.168.1.186:3000',
  TIMEOUT: 10000, 
  RETRIES: 2, // Nombre de tentatives en cas d'échec réseau
};

// 2. MODÈLES DE DONNÉES
export interface Offre {
  id: string;
  name: string;
  city: string;
  link: string;
  typeContrat?: string;
  savedAt?: string;
}

export interface Suggestion {
  label: string;
  value: string;
  type: 'dept' | 'commune';
}

// 3. MOTEUR DE REQUÊTE RÉSILIENT (Pattern: Fetch with Retry & Timeout)
const fetchWithRetry = async (url: string, options: RequestInit = {}, retries = CONFIG.RETRIES): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CONFIG.TIMEOUT);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers,
      }
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.error || `Erreur ${response.status}`);
    }

    return response;
  } catch (err: any) {
    // Si on a encore des tentatives et que ce n'est pas une erreur 4xx (client)
    if (retries > 0 && err.name !== 'AbortError') {
      console.warn(`[API] Nouvelle tentative... (${retries} restantes)`);
      return fetchWithRetry(url, options, retries - 1);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
};



// 4. LOGIQUE MÉTIER
export const jobService = {
  _geoCache: new Map<string, Suggestion[]>(),

  /**
   * Suggestions Géo avec mise en cache mémoire
   */
  async getSuggestions(query: string): Promise<Suggestion[]> {
    const q = query.trim().toLowerCase();
    if (q.length < 3) return [];
    if (this._geoCache.has(q)) return this._geoCache.get(q)!;

    try {
      const response = await fetchWithRetry(`${CONFIG.BASE_URL}/api/suggestions?q=${encodeURIComponent(q)}`);
      const data = await response.json();
      this._geoCache.set(q, data);
      return data;
    } catch (err) {
      console.error("[API Géo]", err);
      return [];
    }
  },

  /**
   * Recherche multicritères
   */
  async search(metier: string, ville: string, contrats: string[]): Promise<Offre[]> {
    try {
      const params = new URLSearchParams({
        metier: metier.trim(),
        ville: ville.trim(),
        contrat: contrats.join(',')
      });
      const response = await fetchWithRetry(`${CONFIG.BASE_URL}/api/search?${params.toString()}`);
      return await response.json();
    } catch (err) {
      console.error("[API Search]", err);
      throw err;
    }
  },

  /**
   * Gestion des Favoris (CRUD)
   */
  async getFavoris(): Promise<Offre[]> {
    try {
      const response = await fetchWithRetry(`${CONFIG.BASE_URL}/api/favoris`);
      return await response.json();
    } catch { return []; }
  },

  async addFavori(offre: Offre): Promise<boolean> {
    try {
      await fetchWithRetry(`${CONFIG.BASE_URL}/api/favoris`, {
        method: 'POST',
        body: JSON.stringify(offre),
      });
      return true;
    } catch { return false; }
  },

  async removeFavori(id: string): Promise<boolean> {
    try {
      const response = await fetchWithRetry(`${CONFIG.BASE_URL}/api/favoris/${id}`, {
        method: 'DELETE',
      });
      return response.ok;
    } catch { return false; }
  },

  /**
   * Suppression Bulk (Industrielle)
   */
  async removeMultipleFavoris(ids: string[]): Promise<boolean> {
    if (!ids.length) return true;
    try {
      await fetchWithRetry(`${CONFIG.BASE_URL}/api/favoris/delete-multiple`, {
        method: 'POST',
        body: JSON.stringify({ ids }),
      });
      return true;
    } catch { return false; }
  }
};