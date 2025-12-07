import { google } from "googleapis";

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body);

    // AUTH Google
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"]
    });

    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.SPREADSHEET_ID;
    const sheetName = process.env.SHEET_NAME;

    // Convertir dans l’ordre EXACT des colonnes Sheets
    const row = [
      body.id,         // Col A : ID
      body.name,       // Col B : Nom
      body.course,     // Col C : Cours
      body.group,      // Col D : Groupe
      body.timestamp,  // Col E : Timestamp
      ""               // Col F : Servi
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:F`,
      valueInputOption: "RAW",
      requestBody: { values: [row] }
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };

  } catch (error) {
    console.error("Erreur ADD:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
