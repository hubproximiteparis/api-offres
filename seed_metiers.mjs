import fs from 'fs';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
    user: 'user_hub',
    host: 'localhost',
    database: 'db_proximite',
    password: 'password_hub',
    port: 5432,
};

async function seed() {
    const client = new pg.Client(dbConfig);
    try {
        await client.connect();
        console.log("Connecté à PostgreSQL sur Podman");

        // Lecture du fichier que je vois sur votre écran
        const data = JSON.parse(fs.readFileSync('./metiers_complets.json', 'utf8'));

        // Création de la table de référence
        await client.query(`
            CREATE TABLE IF NOT EXISTS referentiel_rome (
                code_rome VARCHAR(10) PRIMARY KEY,
                libelle TEXT
            )
        `);

        console.log(`Importation de ${data.length} métiers...`);

        for (const item of data) {
            await client.query(
                'INSERT INTO referentiel_rome (code_rome, libelle) VALUES ($1, $2) ON CONFLICT (code_rome) DO UPDATE SET libelle = EXCLUDED.libelle',
                [item.code_rome, item.libelle]
            );
        }

        console.log("✅ Référentiel ROME mis à jour !");
    } catch (err) {
        console.error("Erreur lors de l'import :", err);
    } finally {
        await client.end();
    }
}

seed();