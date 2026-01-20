/**
 * HUB PROXIMITÉ - Core Application Script
 * Version: 2.4.1 (Correction Syntaxe & Toggle)
 */

// 1. CONFIGURATION
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
                ? "http://localhost:3050" : ""; 

const getAuthToken = () => localStorage.getItem('hub_token');

/**
 * Initialise le client Supabase
 */
async function initSupabase() {
    try {
        const res = await fetch(`${API_URL}/api/config`);
        if (!res.ok) throw new Error("Serveur backend injoignable");
        const config = await res.json();
        
        if (window.supabase) {
            window.supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabaseKey);
            console.log("✅ Supabase lié");
        }
    } catch (err) {
        console.error("❌ Erreur Liaison Backend:", err.message);
    }
}

/**
 * Gère l'ajout ou la suppression d'un favori (Toggle)
 */
async function toggleFavori(offreId, offreData, villeCode) {
    const token = getAuthToken();
    if (!token) {
        alert("Connectez-vous d'abord pour sauvegarder des offres.");
        return;
    }

    const icon = document.getElementById(`icon-${offreId}`);
    if (!icon) return;

    const isAdding = icon.classList.contains('fa-regular');

    try {
        if (isAdding) {
            // --- ACTION : AJOUT ---
            const res = await fetch(`${API_URL}/api/favoris`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ 
                    offre: offreData, 
                    critere_lieu: villeCode 
                })
            });

            if (res.ok) {
                icon.classList.remove('fa-regular');
                icon.classList.add('fa-solid');
                icon.style.color = '#d9534f';
                console.log("⭐ Favori ajouté");
            }
        } else {
            // --- ACTION : SUPPRESSION ---
            const res = await fetch(`${API_URL}/api/favoris/${offreId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                icon.classList.remove('fa-solid');
                icon.classList.add('fa-regular');
                icon.style.color = '#cbd5e0';
                console.log("🗑️ Favori retiré");
            }
        }
    } catch (err) {
        console.error("❌ Erreur Favoris:", err);
    }
}

/**
 * Suppression forcée (utilisée sur la page favoris.html)
 */
async function supprimerFavori(idOffre) {
    const token = getAuthToken();
    if (!token || !confirm("Voulez-vous vraiment retirer cette offre ?")) return;

    try {
        const response = await fetch(`${API_URL}/api/favoris/${idOffre}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const card = document.getElementById(`card-${idOffre}`);
            if (card) {
                card.style.opacity = '0';
                setTimeout(() => card.remove(), 300);
            }
        }
    } catch (err) {
        console.error("Erreur suppression:", err);
    }
}

/**
 * Redirection vers les résultats depuis le Hub
 */
function preparerRecherche() {
    const metier = document.getElementById('input-metier')?.value.trim();
    const ville = document.getElementById('input-ville')?.value.trim();

    if (!metier || !ville) {
        alert("Veuillez remplir le métier et la ville.");
        return;
    }

    const params = new URLSearchParams({ metier, ville });
    window.location.href = `resultats.html?${params.toString()}`;
}

// 4. ÉCOUTEURS D'ÉVÉNEMENTS
document.addEventListener('DOMContentLoaded', () => {
    initSupabase();
    const btnRecherche = document.getElementById('btn-rechercher');
    if (btnRecherche) {
        btnRecherche.addEventListener('click', (e) => {
            e.preventDefault();
            preparerRecherche();
        });
    }
});

// 5. EXPORTS GLOBAUX
window.API_URL = API_URL;
window.toggleFavori = toggleFavori;
window.supprimerFavori = supprimerFavori;
window.preparerRecherche = preparerRecherche;

// Fonction de tracking des clics sur les outils
async function logOutil(nomOutil) {
    try {
        if (!window.supabaseClient) {
            console.error("Supabase n'est pas initialisé");
            return;
        }
        
        const { data: { session } } = await window.supabaseClient.auth.getSession();
        
        const { error } = await window.supabaseClient
            .from('statistiques_outils')
            .insert([
                { 
                    nom_outil: nomOutil, 
                    user_id: session?.user?.id || null 
                }
            ]);

        if (error) throw error;
        console.log(`📊 Statistique enregistrée : ${nomOutil}`);
    } catch (err) {
        console.error("Erreur log stats:", err.message);
    }
}
window.logOutil = logOutil; // Rendre la fonction accessible depuis le HTML