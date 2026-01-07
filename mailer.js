const nodemailer = require('nodemailer');
require('dotenv').config();

// 1. Fonction pour rendre l'IP anonyme (Conforme CNIL)
const anonymizeIP = (ip) => {
    if (!ip) return "0.0.0.0";
    if (ip === "::1" || ip === "127.0.0.1") return "Localhost";
    const parts = ip.split(".");
    if (parts.length === 4) {
        return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
    }
    if (ip.includes(":")) {
        return ip.split(":").slice(0, 3).join(":") + ":xxxx:xxxx";
    }
    return "IP masquée";
};

// 2. Stockage temporaire des recherches
let logsDuJour = [];

const loggerEnrichi = (data) => {
    const entry = {
        timestamp: new Date().toLocaleTimeString('fr-FR'),
        ip: anonymizeIP(data.ip),
        metier: data.metier || data.intitule || "Non précisé",
        ville: data.ville || data.zone || "Non précisé",
        age: data.age || "Non précisé"
    };
    logsDuJour.push(entry);
    console.log(`📝 Log enregistré (anonymisé) : ${entry.ip} - ${entry.metier}`);
};

// 3. Configuration du transporteur
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS, 
    }
});

// Vérification console au démarrage
console.log("Configuration Mail chargée pour :", process.env.EMAIL_USER ? "OUI" : "NON");

// 4. Fonction d'envoi du rapport (Renommée pour correspondre à vos tests)
const envoyerRapport = async (sujetManuel = null, messageManuel = null) => {
    
    // Si on passe un message manuel (pour le test_mail.js)
    if (messageManuel) {
        try {
            await transporter.sendMail({
                from: `"Hub Proximité" <${process.env.EMAIL_USER}>`,
                to: process.env.EMAIL_USER,
                subject: sujetManuel || "🚀 Test Hub",
                text: messageManuel
            });
            console.log("✅ Mail de test envoyé !");
            return;
        } catch (error) {
            console.error("❌ Erreur Test Mail:", error.message);
            return;
        }
    }

    // Sinon, envoi du rapport quotidien automatique
    if (logsDuJour.length === 0) {
        console.log("Rien à envoyer aujourd'hui.");
        return;
    }

    // Tri des logs par métier puis par ville (votre demande de centralisation)
    logsDuJour.sort((a, b) => a.metier.localeCompare(b.metier) || a.ville.localeCompare(b.ville));

    let corpsMail = `<h3>📊 Rapport d'activité quotidien - Hub Proximité</h3>
                     <p>Voici le récapitulatif des recherches effectuées, trié par profession et localité :</p>
                     <table border="1" cellpadding="8" style="border-collapse: collapse; width: 100%; font-family: Arial;">
                        <tr style="background-color: #4f46e5; color: white;">
                            <th>Heure</th><th>Profession</th><th>Localisation</th><th>Âge</th><th>IP (Anonyme)</th>
                        </tr>`;
    
    logsDuJour.forEach(log => {
        corpsMail += `<tr>
            <td>${log.timestamp}</td>
            <td style="font-weight: bold;">${log.metier}</td>
            <td>${log.ville}</td>
            <td>${log.age}</td>
            <td style="color: #666; font-size: 0.8em;">${log.ip}</td>
        </tr>`;
    });

    corpsMail += `</table><p style="color: grey; font-size: 10px;">Ce rapport est anonymisé conformément aux directives CNIL.</p>`;

    try {
        await transporter.sendMail({
            from: `"Hub Proximité" <${process.env.EMAIL_USER}>`,
            to: process.env.EMAIL_USER, 
            subject: "📊 Rapport Quotidien Centralisé - Hub Proximité",
            html: corpsMail
        });
        console.log("✅ Rapport quotidien envoyé avec succès !");
        logsDuJour = []; // Reset pour le lendemain
    } catch (error) {
        console.error("❌ Erreur lors de l'envoi du rapport :", error);
    }
};

// Export des fonctions
module.exports = { loggerEnrichi, envoyerRapport };
// Dans mailer.js, ajoute cette fonction à la fin
const envoyerSauvegarde = async (nomFichier) => {
    try {
        await transporter.sendMail({
            from: `"Hub Backup" <${process.env.EMAIL_USER}>`,
            to: process.env.EMAIL_USER,
            subject: `💾 Sauvegarde Base de Données - ${new Date().toLocaleDateString()}`,
            text: "Ci-joint la sauvegarde quotidienne de vos favoris.",
            attachments: [{ filename: nomFichier, path: `./${nomFichier}` }]
        });
        console.log("🚀 Sauvegarde envoyée par mail !");
        // Optionnel : supprimer le fichier local après envoi
        fs.unlinkSync(nomFichier);
    } catch (error) {
        console.error("❌ Échec de l'envoi de la sauvegarde:", error);
    }
};

module.exports = { loggerEnrichi, envoyerRapport, envoyerSauvegarde };