require('dotenv').config();
const axios = require('axios');
const qs = require('qs');

async function testerAccesFranceTravail() {
    console.log("🔍 Tentative de connexion à France Travail...");
    
    const data = qs.stringify({
        grant_type: 'client_credentials',
        client_id: process.env.FT_CLIENT_ID,
        client_secret: process.env.FT_CLIENT_SECRET,
        scope: 'api_offresdemploiv2 o2dso'
    });

    try {
        const response = await axios.post('https://entreprise.pole-emploi.fr/connexion/oauth2/access_token?realm=%2Fpartenaire', data, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        
        console.log("✅ CONNEXION RÉUSSIE !");
        console.log("Token obtenu (début) :", response.data.access_token.substring(0, 10) + "...");
    } catch (error) {
        console.error("❌ ÉCHEC DE CONNEXION :");
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Détails:", error.response.data);
        } else {
            console.error("Erreur:", error.message);
        }
    }
}

testerAccesFranceTravail();