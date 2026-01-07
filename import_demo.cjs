const fs = require('fs');
const { Client } = require('pg');
const csv = require('csv-parser');

const dbClient = new Client({
    user: 'user_hub',
    host: 'localhost',
    database: 'db_proximite',
    password: 'password_hub',
    port: 5432,
});

async function importDemo() {
    try {
        await dbClient.connect();
        console.log("🐘 Connecté à PostgreSQL.");

        // Création du flux de lecture
        const stream = fs.createReadStream('offres.csv')
            .pipe(csv({ separator: ';' }));

        // MODIFICATION ICI : On utilise "for await" pour attendre chaque ligne
        for await (const row of stream) {
            try {
                await dbClient.query(
                    `INSERT INTO offres_emploi (id, intitule, code_postal, description, date_creation, code_rome) 
                     VALUES ($1, $2, $3, $4, $5, $6) 
                     ON CONFLICT (id) DO NOTHING`,
                    [row.id, row.intitule, row.code_postal, row.description, row.date_creation, row.code_rome]
                );
                process.stdout.write("."); // Un petit point pour dire "c'est fait"
            } catch (err) {
                console.error(`\n❌ Erreur ligne ${row.id}:`, err.message);
            }
        }

        console.log("\n✅ Importation terminée PROPREMENT !");
        
    } catch (err) {
        console.error("❌ Erreur générale :", err.message);
    } finally {
        // On ferme la connexion seulement quand TOUT est fini
        await dbClient.end();
        console.log("🔌 Déconnexion.");
    }
}

importDemo();