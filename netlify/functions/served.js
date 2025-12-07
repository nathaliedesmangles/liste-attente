import { google } from "googleapis";

export const handler = async (event) => {
  try {
    const { id } = JSON.parse(event.body);

    // Vérifier ID reçu
    if (!id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "ID manquant" })
      };
    }

    // AUTH Google
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"]
    });

    const sheets = google.sheets({ version: "v4", auth });

    const spreadsheetId = process.env.SPREADSHEET_ID;
    const sheetName = process.env.SHEET_NAME;

    // Lire les données pour trouver l’index de la ligne
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:F`,
    });

    const rows = res.data.values || [];

    // Trouver la ligne dont la colonne A (ID) correspond
    let rowIndex = -1;

    rows.slice(1).forEach((row, idx) => {
      if (row[0] === id) {
        rowIndex = idx + 2; // +2 car slice enlève entête et index google commence à 1
      }
    });

    if (rowIndex === -1) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "ID introuvable dans Google Sheets" })
      };
    }

    const servedTime = new Date().toISOString();

    // Écrire dans la colonne F (6e colonne)
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!F${rowIndex}`,
      valueInputOption: "RAW",
      requestBody: {
        values: [[servedTime]]
      }
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        id,
        served: servedTime
      })
    };

  } catch (error) {
    console.error("Erreur SERVED:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
