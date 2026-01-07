import { google } from 'googleapis';
import fs from 'fs';

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(fs.readFileSync('service-account.json')),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

export const sheets = google.sheets({
  version: 'v4',
  auth,
});
const rows = await sheets.spreadsheets.values.get({
  spreadsheetId: process.env.SHEET_ID,
  range: 'Users!A2:G',
});

const existing = rows.data.values?.find(r => r[3] === email);
const tokenRes = await fetch(
  'https://entreprise.pole-emploi.fr/connexion/oauth2/access_token?realm=%2Fpartenaire',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      scope: 'api_offresdemploiv2',
    }),
  }
);

const { access_token } = await tokenRes.json();
fetch('https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search', {
  headers: {
    Authorization: `Bearer ${access_token}`,
    Accept: 'application/json',
  },
});
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

await transporter.sendMail({
  to: email,
  subject: 'Vos offres',
  html: '<h3>Voici vos offres</h3>',
});
