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


export async function handler(event) {
  if (event.httpMethod !== "POST") return { statusCode:405, body:"Method not allowed" };
  try{
    const { student, course_code, group } = JSON.parse(event.body||"{}");
    if(!student || !course_code) return { statusCode:400, body: JSON.stringify({error:"student and course_code required"}) };

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

    const id = cryptoRandom();
    const created_at = new Date().toISOString();
    const row = [id, created_at, "", "", course_code, String(group||""), student];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${tab}!A:G`,
      valueInputOption: "RAW",
      requestBody:{ values:[row] }
    });

    return { statusCode: 200, body: JSON.stringify({ id }) };
  }catch(err){
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}

function cryptoRandom(){
  // simple unique id
  return "id_"+Math.random().toString(36).slice(2)+Date.now().toString(36);
}
