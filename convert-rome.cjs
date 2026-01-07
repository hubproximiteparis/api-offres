const fs = require('fs');
const xml2js = require('xml2js');

const parser = new xml2js.Parser();
// Nom du fichier tel qu'il apparaît dans votre dossier api-offres
const xmlFile = './metiers.xml'; 

console.log("🚀 Lancement de l'extraction intelligente...");

// Fonction récursive pour trouver une clé spécifique dans un objet complexe
function findVal(obj, targetKey) {
    let results = [];
    for (let k in obj) {
        if (k.includes(targetKey)) {
            return obj[k];
        }
        if (typeof obj[k] === 'object' && obj[k] !== null) {
            const found = findVal(obj[k], targetKey);
            if (found) return found;
        }
    }
    return null;
}

fs.readFile(xmlFile, (err, data) => {
    if (err) return console.error("❌ Fichier introuvable. Vérifiez le nom dans le dossier api-offres.");

    parser.parseString(data, (err, result) => {
        if (err) return console.error("❌ Erreur de lecture XML.");

        try {
            // 1. On cherche où commence la liste (souvent featureMember ou appellation)
            const root = result['ogr:FeatureCollection'] || result.ogr || result;
            const entries = root['gml:featureMember'] || root.featureMember || Object.values(root).find(v => Array.isArray(v));

            if (!entries) throw new Error("Impossible de localiser la liste des données.");

            // 2. Extraction dynamique
            const metiers = entries.map(entry => {
                // On cherche les valeurs peu importe le préfixe (ogr:, gml:, etc.)
                const libelle = findVal(entry, 'libelle');
                const code = findVal(entry, 'code_rome');

                if (libelle && code) {
                    return {
                        code_rome: Array.isArray(code) ? code[0] : code,
                        libelle: Array.isArray(libelle) ? libelle[0] : libelle
                    };
                }
                return null;
            }).filter(m => m !== null);

            // 3. Sauvegarde
            fs.writeFileSync('./metiers_complets.json', JSON.stringify(metiers, null, 2));
            console.log(`\n✅ EXTRACTION RÉUSSIE !`);
            console.log(`📊 Nombre de métiers trouvés : ${metiers.length}`);
            console.log(`📁 Fichier créé : metiers_complets.json`);

        } catch (e) {
            console.error("❌ Échec de l'analyse :", e.message);
            console.log("Structure brute détectée pour aide :", Object.keys(result));
        }
    });
});