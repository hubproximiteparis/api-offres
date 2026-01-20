require('dotenv').config();
const express = require('express');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const helmet = require('helmet');
const cron = require('node-cron');
const dailyReport = require('./reporter');

const app = express();

// --- 1. CONFIGURATION & SÉCURITÉ ---
const requiredEnv = ['FT_CLIENT_ID', 'FT_CLIENT_SECRET', 'SUPABASE_URL', 'SUPABASE_KEY'];
requiredEnv.forEach(key => {
    if (!process.env[key]) {
        console.error(`❌ Variable d'environnement manquante : ${key}`);
        process.exit(1);
    }
});

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const PORT = process.env.PORT || 10000;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static('public'));

// --- 2. OUTILS INTERNES (LOGGING PERSISTANT & AUTH) ---

/**
 * Enregistre la recherche dans Supabase avec géo-localisation
 * Remplace l'ancien système de fichier local pour une persistance totale
 */
async function logSearch(metier, zoneRecherchee, req) {
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
    
    let localisationUser = "Inconnue";
    try {
        const geo = await axios.get(`http://ip-api.com/json/${ip}?fields=city,regionName`);
        if(geo.data && geo.data.city) {
            localisationUser = `${geo.data.city} (${geo.data.regionName})`;
        }
    } catch (e) { 
        console.log("⚠️ Géo-localisation indisponible"); 
    }

    // Insertion dans la table dédiée Supabase
    const { error } = await supabase
        .from('recherches_stats')
        .insert([{ 
            metier: metier.toUpperCase(), 
            zone_visee: zoneRecherchee, 
            origine_utilisateur: localisationUser,
            ip_anonymisee: ip.substring(0, 7) + "XXX" // Anonymisation RGPD
        }]);

    if (error) {
        console.error("❌ Erreur Supabase Log:", error.message);
    } else {
        console.log("✅ Recherche logguée dans Supabase");
    }
}

let cachedToken = null;
let tokenExpiry = 0;

async function getFTToken() {
    if (cachedToken && Date.now() < tokenExpiry) return cachedToken;
    try {
        const params = new URLSearchParams();
        params.append('grant_type', 'client_credentials');
        params.append('client_id', process.env.FT_CLIENT_ID.trim());
        params.append('client_secret', process.env.FT_CLIENT_SECRET.trim());
        params.append('scope', 'api_offresdemploiv2 api_rome-fiches-metiersv1 o2dsoffre');

        const res = await axios.post('https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=/partenaire', params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        cachedToken = res.data.access_token;
        tokenExpiry = Date.now() + (res.data.expires_in * 1000) - 60000;
        return cachedToken;
    } catch (e) {
        console.error("❌ Erreur Auth FT Backend :", e.message);
        throw e;
    }
}

// --- 3. ROUTES API ---

// Recherche d'offres avec Log de mobilité persistant
app.get('/api/search', async (req, res) => {
    const { metier, ville } = req.query;
    if(!metier || !ville) return res.status(400).json({ error: "Paramètres manquants" });

    // Enregistrement dans Supabase
    await logSearch(metier, ville, req);

    try {
        const token = await getFTToken();
        const geoRes = await axios.get(`https://geo.api.gouv.fr/communes?codePostal=${ville}&fields=code&format=json`);
        const codeInsee = geoRes.data?.length > 0 ? geoRes.data[0].code : ville;

        const responseOffres = await axios.get('https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search', {
            params: { motsCles: metier, commune: codeInsee, distance: 30 },
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        res.json(responseOffres.data.resultats || []);
    } catch (error) {
        console.error("❌ Erreur Recherche:", error.message);
        res.status(500).json({ error: "Erreur lors de la recherche" });
    }
});

// Recherche ROME
app.get('/api/rome-search', async (req, res) => {
    const { query } = req.query;
    if (!query || query.length < 3) return res.json([]);
    try {
        const token = await getFTToken();
        const response = await axios.get(`https://api.francetravail.io/partenaire/rome-fiches-metiers/v1/fiches-metiers/metiers`, {
            params: { q: query },
            headers: { 'Authorization': `Bearer ${token}` }
        });
        res.json(response.data || []);
    } catch (error) {
        res.status(500).json({ error: "Erreur ROME" });
    }
});

// Tracking
app.get('/api/redirect', async (req, res) => {
    const { url, metier } = req.query;
    console.log(`[LOG] Clic sur offre: ${metier}`);
    if (url) return res.redirect(url);
    res.status(400).send("URL manquante");
});

// --- 4. CRON JOB : RAPPORT QUOTIDIEN À 18H ---
cron.schedule('0 18 * * *', async () => {
    console.log("🕒 18:00 - Lancement du rapport quotidien depuis Supabase...");
    try {
        await dailyReport.generate();
        console.log("✅ Rapport envoyé avec succès.");
    } catch (err) {
        console.error("❌ Erreur Rapport 18h :", err.message);
    }
}, { timezone: "Europe/Paris" });

// --- 5. DÉMARRAGE ---
app.listen(PORT, () => {
    console.log(`🚀 SERVEUR ACTIF SUR PORT ${PORT}`);
    console.log(`📊 Stockage des logs : SUPABASE (Table: recherches_stats)`);
});