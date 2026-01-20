require('dotenv').config();
const express = require('express');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const helmet = require('helmet');
const cron = require('node-cron');
const dailyReport = require('./jobs/daily_report');

const app = express();

// --- 1. CONFIGURATION ---
const requiredEnv = ['FT_CLIENT_ID', 'FT_CLIENT_SECRET', 'SUPABASE_URL', 'SUPABASE_KEY'];
requiredEnv.forEach(key => {
    if (!process.env[key]) {
        console.error(`❌ Manquant : ${key}`);
        process.exit(1);
    }
});

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const PORT = process.env.PORT || 3050;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static('public'));

// --- 2. AUTHENTIFICATION FRANCE TRAVAIL ---
let cachedToken = null;
let tokenExpiry = 0;

async function getFTToken() {
    if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

    try {
        const params = new URLSearchParams();
        params.append('grant_type', 'client_credentials');
        params.append('client_id', process.env.FT_CLIENT_ID.trim());
        params.append('client_secret', process.env.FT_CLIENT_SECRET.trim());
        // Scopes consolidés selon ton Dashboard
        params.append('scope', 'api_offresdemploiv2 api_rome-fiches-metiersv1 o2dsoffre');

        const res = await axios.post('https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=/partenaire', params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        cachedToken = res.data.access_token;
        tokenExpiry = Date.now() + (res.data.expires_in * 1000) - 60000;
        return cachedToken;
    } catch (e) {
        console.error("❌ Erreur Auth France Travail :", e.response?.data || e.message);
        throw e;
    }
}

// --- 3. ROUTES API ---

// Recherche ROME 4.0 (Fiches Métiers)
app.get('/api/rome-search', async (req, res) => {
    const query = req.query.query;
    if (!query || query.length < 3) return res.json([]);
    try {
        const token = await getFTToken();
        const response = await axios.get(`https://api.francetravail.io/partenaire/rome-fiches-metiers/v1/fiches-metiers/metiers`, {
            params: { q: query },
            headers: { 'Authorization': `Bearer ${token}` }
        });
        res.json(response.data || []);
    } catch (error) {
        console.error("❌ Erreur ROME 4.0:", error.response?.data || error.message);
        res.status(500).json({ error: "Erreur référentiel ROME 4.0" });
    }
});

// Recherche d'offres (Avec conversion CP -> INSEE)
app.get('/api/search', async (req, res) => {
    const { metier, ville } = req.query;
    if(!metier || !ville) return res.status(400).json({ error: "Paramètres manquants" });

    try {
        const token = await getFTToken();
        let codeInsee = ville;

        // Conversion Code Postal -> Code INSEE (Obligatoire pour l'API Offres)
        const geoRes = await axios.get(`https://geo.api.gouv.fr/communes?codePostal=${ville}&fields=code&format=json`);
        if (geoRes.data?.length > 0) codeInsee = geoRes.data[0].code;

        const responseOffres = await axios.get('https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search', {
            params: { motsCles: metier, commune: codeInsee, distance: 30 },
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        res.json(responseOffres.data.resultats || []);
    } catch (error) {
        console.error("❌ Erreur API Offres:", error.response?.data || error.message);
        res.status(error.response?.status || 500).json({ error: "Erreur lors de la recherche d'offres" });
    }
});

// --- 4. DÉMARRAGE ---
app.listen(PORT, () => {
    console.log(`🚀 SERVEUR BACKEND SUR PORT ${PORT}`);
});