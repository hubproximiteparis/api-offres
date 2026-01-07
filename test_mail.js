const { envoyerRapport } = require('./mailer');

async function testConnexion() {
    console.log("📤 Tentative d'envoi du mail de test...");
    await envoyerRapport(
        "🚀 Test du Hub Emploi", 
        "Ceci est un message de test. Si vous recevez ce mail, le Hub est prêt à vous envoyer des alertes sur les métiers en tension !"
    );
}

testConnexion();