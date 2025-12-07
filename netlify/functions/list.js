import { google } from "googleapis";

export const handler = async () => {
  try {
    // AUTH Google
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"]
    });

    const sheets = google.sheets({ version: "v4", auth });

    const spreadsheetId = process.env.SPREADSHEET_ID;
    const sheetName = process.env.SHEET_NAME;

    // Lire toutes les lignes
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:F`,
    });

    const rows = res.data.values || [];

    // Si la feuille est vide ou très peu remplie
    if (rows.length < 2) {
      return {
        statusCode: 200,
        body: JSON.stringify([])
      };
    }

    // Convertir lignes → objets JS
    const queue = rows.slice(1) // ignorer ligne d’en-tête
      .filter(r => !r[5])       // ignorer ceux qui ont "Servi"
      .map(r => ({
        id: r[0],                  // Col A
        name: r[1],                // Col B
        course: r[2],              // Col C
        group: r[3],               // Col D
        timestamp: Number(r[4])    // Col E
      }));

    return {
      statusCode: 200,
      body: JSON.stringify(queue)
    };

  } catch (error) {
    console.error("Erreur LIST:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
