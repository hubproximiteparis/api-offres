const https = require('https');

const clientId = "PAR_hubproxyfinal_5cd4e5c15327b8442ecbb7ab1c81ca058469518f53fc71a52152dbd02bbfb300";
const clientSecret = "80c6a32fd88913a26b5e7eb5a2f0c4f875892ff2a6027bfac05baad9075ee338";

const data = `grant_type=client_credentials&scope=api_offresdemploiv2`;

const options = {
    hostname: 'entreprise.pole-emploi.fr',
    path: '/connexion/oauth2/access_token?realm=%2Fpartenaire',
    method: 'POST',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
    }
};

const req = https.request(options, (res) => {
    let responseBody = '';
    res.on('data', (d) => responseBody += d);
    res.on('end', () => {
        console.log('STATUS:', res.statusCode);
        console.log('REPONSE:', responseBody);
    });
});

req.on('error', (e) => console.error('ERREUR RESEAU:', e));
req.write(data);
req.end();