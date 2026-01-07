require('dotenv').config();
const nodemailer = require('nodemailer');
const fs = require('fs').promises;

async function sendDailyReport() {
    try {
        // 1. Lecture des logs générés par server.js
        const logsData = await fs.readFile('./logs/combined.log', 'utf8');
        const lines = logsData.trim().split('\n').map(line => JSON.parse(line));
        
        // 2. Filtrage pour n'avoir que les événements d'aujourd'hui
        const today = new Date().toISOString().split('T')[0];
        const logsToday = lines.filter(l => l.timestamp.startsWith(today));

        // 3. Configuration de l'envoi (Gmail)
       const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.REPORT_EMAIL, // hub.proximite.paris@gmail.com
        pass: process.env.EMAIL_PASS    // greejajyblaxmasc (Le vrai code !)
    }
});

        // 4. Construction du rapport HTML
        const stats = {
            total: logsToday.length,
            errors: logsToday.filter(l => l.level === 'error').length,
            searches: logsToday.filter(l => l.event === 'SEARCH_REQUEST').length,
            favorites: logsToday.filter(l => l.event === 'FAVORITE_ADDED').length
        };

        const mailOptions = {
            from: `"Hub Emploi Monitor" <${process.env.REPORT_EMAIL}>`,
            to: process.env.ADMIN_EMAIL, // Votre adresse perso
            subject: `📊 Rapport Hub Emploi - ${today}`,
            html: `
                <div style="font-family: sans-serif; color: #333;">
                    <h2 style="color: #004185;">Résumé Quotidien de Production</h2>
                    <p>Voici le bilan d'activité pour la journée du <strong>${today}</strong> :</p>
                    <ul>
                        <li><strong>Recherches effectuées :</strong> ${stats.searches}</li>
                        <li><strong>Favoris enregistrés :</strong> ${stats.favorites}</li>
                        <li><strong>Erreurs système :</strong> <span style="color: ${stats.errors > 0 ? 'red' : 'green'};">${stats.errors}</span></li>
                    </ul>
                    <hr>
                    <p>Pour plus de détails, accédez au dashboard : <br>
                    <a href="http://192.168.1.186:3000/admin/dashboard" style="color: #e82332;">Consulter le Dashboard en direct</a></p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log("✅ Rapport envoyé avec succès à " + process.env.ADMIN_EMAIL);
    } catch (error) {
        console.error("❌ Échec de l'envoi du rapport :", error.message);
    }
}

// Exécution immédiate
sendDailyReport();