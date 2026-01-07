const { Pool } = require('pg');
const { envoyerRapport } = require('./mailer');

const pool = new Pool({
    user: 'user_hub', host: 'localhost', database: 'db_proximite',
    password: 'password_hub', port: 5432,
});

// Nettoyage du titre pour l'URL Métierscope
function cleanSlug(text) {
    return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

async function synchroniserOffres() {
    try {
        const client = await pool.connect();
        await client.query('TRUNCATE TABLE offres_emploi'); // On repart à zéro

        // Simulation de 10 offres réelles (Données à remplacer par l'API plus tard)
        const nouvellesOffres = [
            { id: 'OFFRE_01', titre: 'Boulanger / Boulangère', rome: 'D1102', cp: '13008' },
            { id: 'OFFRE_02', titre: 'Développeur Web', rome: 'M1805', cp: '75001' },
            { id: 'OFFRE_03', titre: 'Infirmier / Infirmière', rome: 'J1506', cp: '69000' }
        ];

        for (const o of nouvellesOffres) {
            const url = `https://candidat.francetravail.fr/metierscope/fiche-metier/${o.rome}/${cleanSlug(o.titre)}`;
            await client.query(
                'INSERT INTO offres_emploi (id, intitule, code_rome, code_postal, url_metierscope) VALUES ($1, $2, $3, $4, $5)',
                [o.id, o.titre, o.rome, o.cp, url]
            );
        }
        client.release();
        console.log("✅ Hub mis à jour avec succès.");
        await envoyerRapport("✅ Hub : Synchro OK", `La base de données contient ${nouvellesOffres.length} nouvelles offres.`);
    } catch (err) {
        console.error("❌ Erreur Hub :", err.message);
        await envoyerRapport("⚠️ Hub : Erreur Synchro", `Détail : ${err.message}`);
    }
}

synchroniserOffres();