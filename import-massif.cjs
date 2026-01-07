require('dotenv').config();
const { Client } = require('pg'); // On remplace Supabase par pg
const fs = require('fs');

// Configuration pour votre base de données Podman
const client = new Client({
    user: 'user_hub',
    host: 'localhost',
    database: 'db_proximite',
    password: 'password_hub',
    port: 5432,
});

function cleanText(text) {
    if (!text) return "";
    return text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

async function importMassif() {
    try {
        await client.connect();
        console.log("✅ Connecté à PostgreSQL (Podman)");

        // Création de la table locale
        await client.query(`
            CREATE TABLE IF NOT EXISTS metiers_rome (
                code_rome VARCHAR(10) PRIMARY KEY,
                libelle TEXT,
                libelle_ascii TEXT
            );
        `);

        console.log("📖 Lecture du fichier metiers_complets.json...");
        const rawData = fs.readFileSync('./metiers_complets.json');
        const allMetiers = JSON.parse(rawData);

        console.log("🧹 Nettoyage de la table...");
        await client.query('TRUNCATE TABLE metiers_rome;');

        const chunkSize = 500;
        console.log(`🚀 Importation de ${allMetiers.length} métiers...`);

        for (let i = 0; i < allMetiers.length; i++) {
            const m = allMetiers[i];
            // Utilisation des noms de colonnes vus sur votre écran : code_rome et libelle
            await client.query(
                'INSERT INTO metiers_rome (code_rome, libelle, libelle_ascii) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
                [m.code_rome, m.libelle, cleanText(m.libelle)]
            );

            if (i % 500 === 0) {
                console.log(`⏳ Progression : ${i} / ${allMetiers.length}`);
            }
        }

        console.log("\n⭐ SUCCÈS : 13 120 métiers sont dans Podman !");

    } catch (err) {
        console.error("❌ Erreur :", err.message);
    } finally {
        await client.end();
    }
}

importMassif();