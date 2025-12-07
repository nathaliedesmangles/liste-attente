// netlify/functions/addStudent.js
import { google } from "googleapis";

export async function handler(event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Méthode non autorisée" };
  }

  const { student, course } = JSON.parse(event.body);
  const date = new Date().toISOString().split("T")[0];

  try {
    // Authentification via variables d'environnement
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    // Ajout de la ligne
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "Inscriptions!A:C",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[date, course, student]],
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Ajout réussi !" }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
}
