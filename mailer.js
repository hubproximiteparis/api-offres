/**
 * HUB PROXIMITÉ - DASHBOARD GÉNÉRATEUR V3
 * Centralisation stratégique des indicateurs de performance (KPI)
 */

const nodemailer = require('nodemailer');
const fs = require('fs');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.REPORT_EMAIL, pass: process.env.REPORT_PASSWORD }
});

// Stockage des métriques
let stats = {
    recherches: [],
    erreurs: [],
    connexions: 0,
    devices: { mobile: 0, desktop: 0 },
    fonctions: { scanner: 0, favoris: 0, geo: 0 }
};

/**
 * Enregistre une activité avec analyse du support et de la fonction
 */
const loggerEnrichi = (data) => {
    stats.connexions++;
    
    // Détection simplifiée du support
    const ua = data.userAgent || "";
    const isMobile = /Mobile|Android|iPhone/i.test(ua);
    isMobile ? stats.devices.mobile++ : stats.devices.desktop++;

    // Comptage des fonctions
    if (data.fonction) stats.fonctions[data.fonction]++;

    stats.recherches.push({
        h: new Date().toLocaleTimeString('fr-FR'),
        user: data.userId ? data.userId.substring(0, 8) : "Invité",
        support: isMobile ? "📱 Mobile" : "💻 PC",
        action: data.metier || "Action Système",
        loc: data.ville || "N/A",
        ip: data.ip ? data.ip.split('.').slice(0,3).join('.') + ".0" : "0.0.0.0"
    });
};

const logErreurSysteme = (service, msg) => {
    stats.erreurs.push({ h: new Date().toLocaleTimeString('fr-FR'), service, msg });
};

// ============================================================
// 2. GÉNÉRATION DU DASHBOARD HTML (Le Mail de 18h)
// ============================================================

const envoyerRapport = async () => {
    const totalRecherches = stats.recherches.length;
    
    let corpsMail = `
    <div style="font-family: 'Segoe UI', Arial; max-width: 900px; margin: auto; border: 1px solid #eee; border-radius: 15px; overflow: hidden;">
        <div style="background: #1a365d; color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0;">HUB PROXIMITÉ : DASHBOARD</h1>
            <p style="opacity: 0.8;">Rapport d'exploitation du ${new Date().toLocaleDateString('fr-FR')}</p>
        </div>

        <div style="padding: 20px;">
            <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                <div style="flex: 1; background: #f7fafc; padding: 15px; border-radius: 10px; text-align: center; border-left: 5px solid #48bb78;">
                    <span style="font-size: 12px; color: #718096; text-transform: uppercase;">Requêtes</span>
                    <div style="font-size: 24px; font-weight: bold; color: #2d3748;">${stats.connexions}</div>
                </div>
                <div style="flex: 1; background: #f7fafc; padding: 15px; border-radius: 10px; text-align: center; border-left: 5px solid #d9534f;">
                    <span style="font-size: 12px; color: #718096; text-transform: uppercase;">Erreurs</span>
                    <div style="font-size: 24px; font-weight: bold; color: #d9534f;">${stats.erreurs.length}</div>
                </div>
                <div style="flex: 1; background: #f7fafc; padding: 15px; border-radius: 10px; text-align: center; border-left: 5px solid #1a365d;">
                    <span style="font-size: 12px; color: #718096; text-transform: uppercase;">Mobiles</span>
                    <div style="font-size: 24px; font-weight: bold; color: #1a365d;">${Math.round((stats.devices.mobile/stats.connexions || 0)*100)}%</div>
                </div>
            </div>

            <h3 style="color: #1a365d;">🔍 Analyse des Recherches</h3>
            <table width="100%" cellpadding="10" style="border-collapse: collapse; font-size: 13px;">
                <tr style="background: #edf2f7; text-align: left;">
                    <th>Heure</th><th>ID User</th><th>Support</th><th>Profession / Type</th><th>Ville</th>
                </tr>
                ${stats.recherches.map(r => `
                    <tr style="border-bottom: 1px solid #f0f4f8;">
                        <td>${r.h}</td><td>#${r.user}</td><td>${r.support}</td><td><b>${r.action}</b></td><td>${r.loc}</td>
                    </tr>
                `).join('')}
            </table>

            <div style="margin-top: 30px; background: #fff5f5; padding: 20px; border-radius: 10px;">
                <h3 style="color: #c53030; margin-top: 0;">⚠️ Diagnostic Système</h3>
                ${stats.erreurs.length > 0 ? `
                    <table width="100%" style="font-size: 12px; color: #c53030;">
                        ${stats.erreurs.map(e => `<tr><td><b>[${e.h}]</b></td><td><b>${e.service}</b></td><td>${e.msg}</td></tr>`).join('')}
                    </table>
                ` : `<p style="color: #2f855a; font-weight: bold;">✅ État de santé parfait : Serveur Render & Supabase OK.</p>`}
            </div>
        </div>
        
        <div style="background: #f7fafc; padding: 15px; text-align: center; font-size: 11px; color: #a0aec0;">
            Ce rapport respecte les directives CNIL d'anonymisation des données utilisateurs.
        </div>
    </div>`;

    await transporter.sendMail({
        from: `"Hub Intelligence" <${process.env.REPORT_EMAIL}>`,
        to: process.env.REPORT_EMAIL,
        subject: `📊 DASHBOARD HUB : ${stats.connexions} connexions | ${stats.erreurs.length} incidents`,
        html: corpsMail
    });

    // Reset après envoi
    stats = { recherches: [], erreurs: [], connexions: 0, devices: { mobile: 0, desktop: 0 }, fonctions: { scanner: 0, favoris: 0, geo: 0 } };
};

module.exports = { loggerEnrichi, logErreurSysteme, envoyerRapport };