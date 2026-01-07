const fs = require('fs');
const { Client } = require('pg');

const client = new Client({
    user: 'postgres',
    host: 'db.oambnmyooilnilycxkwv.supabase.co',
    database: 'postgres',
    password: 'U1W7MN9usgfHluhD', 
    port: 5432,
    ssl: { rejectUnauthorized: false }
});

async function importData() {
    try {
        await client.connect();
        // Chargement du fichier (on vérifie s'il s'appelle metiers.json ou metiers_complets.json)
        const data = JSON.parse(fs.readFileSync('./metiers.json', 'utf8'));
        console.log(`🚀 Injection de ${data.length} métiers vers Supabase...`);

        let count = 0;

        for (const métier of data) {
            // Adaptation aux noms de vos colonnes : métier.libelle au lieu de intitule
            if (!métier.libelle || !métier.code_rome) continue;

            // Génération du "Lien Rose" MétierScope
            const slug = métier.libelle
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-z0-9]/g, '-');
            
            const url = `https://candidat.francetravail.fr/metierscope/fiche-metier/${métier.code_rome}/${slug}`;

            // Insertion (on utilise code_rome comme ID unique ou métier.code_rome)
            await client.query(
                'INSERT INTO offres_emploi (id, intitule, code_rome, url_metierscope) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING',
                [métier.code_rome + "-" + count, métier.libelle, métier.code_rome, url]
            );

            count++;
            if (count % 5 === 0) console.log(`⏳ En cours : ${count} métiers injectés...`);
        }

        console.log(`✅ Succès ! ${count} métiers sont maintenant dans le Hub.`);

    } catch (err) {
        console.error("❌ Erreur d'injection :", err.message);
    } finally {
        await client.end();
    }
}

importData();