const { google } = require("googleapis");

const SHEET_ID = "1iPnro2Ur-0yp8dqmqtkZQyxuPP1xuNVw1dap7NUPQ0o";
const SHEET_NAME = "Feuille 1"; // adapte si besoin

async function cleanSheet() {
  const auth = new google.auth.GoogleAuth({
    keyFile: "credentials.json",
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: SHEET_NAME,
  });

  const rows = res.data.values;
  const headers = rows.shift();

  const emailIndex = headers.indexOf("Email");
  const dateIndex = headers.indexOf("Date d'inscription");

  const map = new Map();

  for (const row of rows) {
    const email = row[emailIndex];
    if (!email) continue;

    const date = new Date(row[dateIndex] || 0);

    if (!map.has(email) || new Date(map.get(email)[dateIndex]) < date) {
      map.set(email, row);
    }
  }

  const cleanedRows = [headers, ...map.values()];

  await sheets.spreadsheets.values.clear({
    spreadsheetId: SHEET_ID,
    range: SHEET_NAME,
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: SHEET_NAME,
    valueInputOption: "RAW",
    requestBody: {
      values: cleanedRows,
    },
  });

  console.log("✅ Google Sheet nettoyé : doublons supprimés");
}

cleanSheet().catch(console.error);
function onEdit(e) {
  var sheet = e.source.getActiveSheet();
  var range = e.range;

  // Ignore en-tête
  if (range.getRow() === 1) return;

  // Colonne Email (D)
  if (range.getColumn() === 4) {
    var uuidCell = sheet.getRange(range.getRow(), 1);

    if (!uuidCell.getValue()) {
      uuidCell.setValue(Utilities.getUuid());
    }
  }
}
