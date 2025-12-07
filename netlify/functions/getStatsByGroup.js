// netlify/functions/getStatsByGroup.js
import { google } from "googleapis";

export async function handler(event, context) {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Inscriptions!A:C", // Date | Groupe | Étudiant
    });

    const rows = res.data.values || [];
    if (rows.length <= 1) {
      return {
        statusCode: 200,
        body: JSON.stringify({}),
      };
    }

    // Stats par groupe
    const stats = {};

    rows.slice(1).forEach(([date, group, student]) => {
      if (!stats[group]) stats[group] = 0;
      stats[group]++;
    });

    return {
      statusCode: 200,
      body: JSON.stringify(stats),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
}
