import { google } from "googleapis";

export async function getSheetsClient(readonly=false){
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n")
    },
    scopes: [ readonly
      ? "https://www.googleapis.com/auth/spreadsheets.readonly"
      : "https://www.googleapis.com/auth/spreadsheets"
    ],
  });
  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const tab = process.env.SHEET_TAB_NAME || "Inscriptions";
  return { sheets, spreadsheetId, tab };
}


export async function handler(event){
  if (event.httpMethod !== "POST") return { statusCode:405, body:"Method not allowed" };
  try{
    const { id } = JSON.parse(event.body||"{}");
    if(!id) return { statusCode:400, body: JSON.stringify({error:"id required"}) };

    const auth = new google.auth.GoogleAuth({
      credentials:{
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g,"\n")
      },
      scopes:["https://www.googleapis.com/auth/spreadsheets"]
    });
    const sheets = google.sheets({version:"v4", auth});
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const tab = process.env.SHEET_TAB_NAME || "Inscriptions";

    // Lire toutes les lignes pour trouver la ligne à mettre à jour (id + closed_at vide)
    const read = await sheets.spreadsheets.values.get({
      spreadsheetId, range: `${tab}!A:G`
    });
    const rows = read.data.values || [];
    const headerOffset = 1; // 1ère ligne = entêtes
    let targetRowNumber = null;

    for (let i=headerOffset; i<rows.length; i++){
      const [rid, created_at, closed_at] = rows[i];
      if (rid === id && (!closed_at || closed_at==="")){
        targetRowNumber = i+1; // numéro réel de ligne (1-based)
        break;
      }
    }
    if(!targetRowNumber) return { statusCode: 404, body: JSON.stringify({error:"request not found or already closed"}) };

    const now = new Date().toISOString();
    const createdAtISO = rows[targetRowNumber-1][1];
    const waitSeconds = Math.max(0, Math.floor((new Date(now) - new Date(createdAtISO))/1000));

    // Mise à jour colonnes C (closed_at) et D (wait_seconds)
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${tab}!C${targetRowNumber}:D${targetRowNumber}`,
      valueInputOption: "RAW",
      requestBody:{ values:[[ now, String(waitSeconds) ]] }
    });

    return { statusCode: 200, body: JSON.stringify({ ok:true, wait_seconds: waitSeconds }) };
  }catch(err){
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
