require('dotenv').config();
const express = require('express');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const cron = require('node-cron');
const { loggerEnrichi, envoyerRapport, envoyerSauvegarde } = require('./mailer');

const app = express();
app.use(express.json());
app.use(express.static('public'));

// ============================================================
// 1. CONFIGURATION & CLIENTS
// ============================================================
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const FT_CONFIG = {
    clientId: process.env.FT_CLIENT_ID,
    clientSecret: process.env.FT_CLIENT_SECRET,
    baseUrl: 'https://api.francetravail.io/partenaire',
    authUrl: 'https://entreprise.pole-emploi.fr/connexion/oauth2/access_token?realm=%2Fpartenaire'
};

let cachedToken = null;

// ============================================================
// 2. UTILITAIRES & AUTHENTIFICATION
// ============================================================

/**
 * Gestionnaire de Token France Travail avec auto-renouvellement
 */
async function getFTToken() {
    if (cachedToken) return cachedToken;
    
    try {
        const credentials = Buffer.from(`${FT_CONFIG.clientId}:${FT_CONFIG.clientSecret}`).toString('base64');
        const params = new URLSearchParams({ 
            grant_type: 'client_credentials', 
            scope: 'api_offresdemploiv2 o2dsoffre' 
        });

        const res = await axios.post(FT_CONFIG.authUrl, params.toString(), {
            headers: { 'Authorization': `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        cachedToken = res.data.access_token;
        // Expire le cache 1 minute avant la fin réelle pour plus de sécurité
        setTimeout(() => { cachedToken = null; }, (res.data.expires_in - 60) * 1000);
        return cachedToken;
    } catch (error) {
        console.error("❌ Erreur Auth France Travail:", error.response?.data || error.message);
        throw new Error("Impossible d'obtenir le token API");
    }
}

/**
 * Synchronisation avec la base de données Supabase
 */
async function syncToSupabase(offres, forceFavori = null) {
    if (!offres || offres.length === 0) return;
    
    const records = offres.map(o => ({
        id_offre: o.id || o.id_offre,
        intitule: o.intitule,
        description: o.description || 'Pas de description',
        entreprise: o.entreprise?.nom || o.entreprise || 'Anonyme',
        lieu: o.lieuTravail?.libelle || o.lieu || 'Non spécifié',
        salaire: o.salaire?.libelle || o.salaire || 'N/A',
        url: o.origineOffre?.urlOrigine || o.url,
        est_favori: forceFavori !== null ? forceFavori : false
    }));

    const { error } = await supabase.from('offres_sauvegardees').upsert(records, { onConflict: 'id_offre' });
    if (error) console.error("❌ Erreur Upsert Supabase:", error.message);
}

// ============================================================
// 3. ROUTES API (RECHERCHE & EXPERTISE)
// ============================================================

/**
 * Route principale de recherche (Fusion FT + Logging)
 */
app.get('/api/search', async (req, res) => {
    const { metier, ville } = req.query;

    // Logging anonymisé pour le rapport de 18h
    loggerEnrichi({ ip: req.ip, metier, ville });

    try {
        const token = await getFTToken();
        const response = await axios.get(`${FT_CONFIG.baseUrl}/offresdemploi/v2/offres/search`, {
            headers: { 'Authorization': `Bearer ${token}` },
            params: { motsCles: metier, commune: ville, range: '0-49', sort: 1 }
        });

        const offres = response.data.resultats || [];
        
        // On répond vite au client
        res.json(offres);

        // On synchronise en arrière-plan
        if (offres.length > 0) {
            syncToSupabase(offres).catch(() => {});
        }
    } catch (e) {
        console.error("❌ Erreur Recherche:", e.message);
        res.status(500).json({ error: "Service France Travail indisponible" });
    }
});

/**
 * Route EXPERTE : ROME + Métierscope (En développement)
 */
app.get('/api/expert/market-stats', async (req, res) => {
    // Cette section accueillera la logique ROME et Tension de marché
    res.json({ message: "Module d'expertise en cours d'intégration" });
});

// ============================================================
// 4. GESTION DES FAVORIS
// ============================================================

app.get('/api/mes-favoris', async (req, res) => {
    const { data, error } = await supabase.from('offres_sauvegardees').select('*').eq('est_favori', true);
    if (error) return res.status(500).json(error);
    res.json(data || []);
});

app.post('/api/favoris', async (req, res) => {
    try {
        await syncToSupabase([req.body], true);
        res.sendStatus(200);
    } catch (e) { res.status(500).send(e.message); }
});

app.delete('/api/favoris/:id', async (req, res) => {
    const { error } = await supabase.from('offres_sauvegardees').update({ est_favori: false }).eq('id_offre', req.params.id);
    error ? res.status(500).send(error.message) : res.sendStatus(200);
});

// ============================================================
// 5. AUTOMATISATION (CRON)
// ============================================================

// Rapport Quotidien à 18h00
cron.schedule('0 18 * * *', async () => {
    console.log("🕒 Déclenchement du rapport de 18h...");
    await envoyerRapport();
});

// Sauvegarde Complète à 18h30
cron.schedule('30 18 * * *', async () => {
    console.log("💾 Génération de la sauvegarde quotidienne...");
    try {
        const { data } = await supabase.from('offres_sauvegardees').select('*');
        const filename = `backup-${new Date().toISOString().split('T')[0]}.json`;
        const fs = require('fs');
        fs.writeFileSync(filename, JSON.stringify(data));
        await envoyerSauvegarde(filename);
        fs.unlinkSync(filename); // Nettoyage après envoi
    } catch (e) { console.error("❌ Échec sauvegarde automatique:", e.message); }
});

/// ============================================================
// 6. LANCEMENT DU SERVEUR (Compatible Local & Cloud)
// ============================================================
const PORT = process.env.PORT || 3000;

// Utilisation de '0.0.0.0' pour permettre les connexions externes (Cloud / Mobile)
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
    🚀 SERVEUR HUB PROXIMITÉ DÉMARRÉ
    ---------------------------------
    📍 Statut : En ligne
    🌐 Port   : ${PORT}
    📡 Sync   : Supabase Active
    📧 Chron  : Rapports configurés
    ---------------------------------
    `);
});