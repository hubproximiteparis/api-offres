const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// URL de la ressource Open Data (Fichier des offres d'emploi disponibles)
const OPENDATA_URL = "https://www.data.gouv.fr/fr/datasets/r/f0165a21-d775-4767-9d67-46387a3f87c5"; 
const FILE_PATH = path.join(__dirname, 'offres_completes.zip');

async function downloadData() {
    try {
        console.log("📡 Connexion à Data.gouv.fr...");
        const response = await axios({
            url: OPENDATA_URL,
            method: 'GET',
            responseType: 'stream'
        });

        const writer = fs.createWriteStream(FILE_PATH);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => {
                console.log("✅ Téléchargement terminé : offres_completes.zip");
                resolve();
            });
            writer.on('error', reject);
        });
    } catch (err) {
        console.error("❌ Erreur lors du téléchargement:", err.message);
    }
}

async function run() {
    await downloadData();
    console.log("💡 Vous pouvez maintenant extraire ce fichier et l'importer en SQL via la commande COPY de PostgreSQL.");
}

run();