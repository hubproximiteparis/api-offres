require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const https = require('https');

const app = express();
const port = 3000;

// 1. CONFIGURATION SUPABASE
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

app.use(express.static(__dirname));
app.use(express.json());
// HEALTHCHECK (pour Podman / Scaleway / monitoring)
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK' });
});


// 2. AUTHENTIFICATION FRANCE TRAVAIL
let ftToken = '';

async function refreshFTToken() {
    try {
        const params = new URLSearchParams();
        params.append('grant_type', 'client_credentials');
        params.append('client_id', process.env.FT_CLIENT_ID);
        params.append('client_secret', process.env.FT_CLIENT_SECRET);
        params.append('scope', 'api_offresdemploiv2'); 

        const response = await axios.post('https://entreprise.pole-emploi.fr/connexion/oauth2/access_token?realm=/partenaire', params);
        ftToken = response.data.access_token;
        console.log("✅ Connexion France Travail établie avec succès !");
    } catch (err) {
        console.error("❌ Erreur d'authentification :", err.message);
    }
}
refreshFTToken();

// 3. API : RECHERCHE DE MÉTIERS (SUPABASE)
app.get('/api/metiers', async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) return res.json([]);
        const { data, error } = await supabase.from('metiers_rome').select('code_rome, libelle').ilike('libelle', `%${query}%`).limit(10);
        if (error) throw error;
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 4. API : RECHERCHE D'ENTREPRISES (LBB v2)
// 4. API : OFFRES D’EMPLOI v2 (France Travail)
app.get('/api/offres', async (req, res) => {
    try {
        const { rome, lieu, motsCles } = req.query;

        if (!ftToken) {
            return res.status(401).json({ error: 'Token France Travail non prêt' });
        }

        const response = await axios.get(
            'https://api.pole-emploi.io/partenaire/offresdemploi/v2/offres/search',
            {
                params: {
                    romeCodes: rome,        // ex: M1607
                    lieuTravail: lieu,      // ex: 75001
                    motsCles: motsCles,     // ex: développeur
                    range: '0-19'
                },
                headers: {
                    Authorization: `Bearer ${ftToken}`
                },
                httpsAgent: new https.Agent({
                    family: 4
                })
            }
        );

        res.json(response.data);

    } catch (err) {
        console.error('❌ Erreur Offres v2 :', err.message);
        res.status(500).json({
            error: 'Erreur France Travail',
            details: err.message
        });
    }
});


app.listen(port, () => console.log(`🚀 Serveur lancé sur http://localhost:${port}`));