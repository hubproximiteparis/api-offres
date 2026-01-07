require('dotenv').config();
const { Client } = require('pg');
const axios = require('axios');

const MON_CLIENT_ID = "PAR_hub_c76200e7b3f3fbbfaf159cb0eab563726c0079fb6c79d5e79778ce74901ac7fe";
const MON_CLIENT_SECRET = "52f0a8269818a4301d8ddfa08249b60fc891c0fbbeeb82e10203a5bf67a507b3"; 

const dbClient = new Client({
    user: 'user_hub',
    host: 'localhost',
    database: 'db_proximite',
    password: 'password_hub',
    port: 5432,
});

async function getAccessToken() {
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', MON_CLIENT_ID);
    params.append('client_secret', MON_CLIENT_SECRET);
    // On reste sur le scope de base pour éviter la 400
    params.append('scope', 'api_offresdemploiv2'); 

    const response = await axios.post(
        'https://entreprise.pole-emploi.fr/connexion/oauth2/access_token?realm=/partenaire',
        params,
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    return response.data.access_token;
}

async function startAspiration() {
    try {
        console.log("🐘 Connexion Podman...");
        await dbClient.connect();

        console.log("🚀 Authentification...");
        const token = await getAccessToken();
        console.log("✅ Token obtenu !");

        // Utilisation de l'URL officielle
        const url = 'https://185.215.64.15/partenaire/offresdemploi/v2/offres/search';
        console.log("📥 Récupération des offres...");

        const res = await axios.get(url, {
            headers: { 'Authorization': `Bearer ${token}` },
            params: { commune: '75056', range: '0-9' } // On réduit le range pour le test
        });

        const offres = res.data.resultats || [];
        console.log(`💾 Insertion de ${offres.length} offres...`);

        for (const o of offres) {
            await dbClient.query(
                `INSERT INTO offres_emploi (id, intitule, code_rome, code_postal, description, date_creation, entreprise) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING`,
                [o.id, o.intitule, o.romeCode, o.lieuTravail?.codePostal, o.description, o.dateCreation, o.entreprise?.nom]
            );
            const res = await axios.get(url, {
    headers: { 'Authorization': `Bearer ${token}` },
    params: { commune: '75056', range: '0-9' },
    httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
});
        }
        console.log(`⭐ RÉUSSITE !`);
    } catch (err) {
        if (err.response) {
            console.error(`❌ Erreur API ${err.response.status}:`, err.response.data);
        } else {
            console.error("❌ Erreur technique:", err.message);
        }
    } finally {
        await dbClient.end();
        console.log("🔌 Déconnexion.");
    }
}

startAspiration();