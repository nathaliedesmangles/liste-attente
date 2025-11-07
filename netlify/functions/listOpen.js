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


export async function handler(){
  try{
    const auth = new google.auth.GoogleAuth({
      credentials:{
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g,"\n")
      },
      scopes:["https://www.googleapis.com/auth/spreadsheets.readonly"]
    });
    const sheets = google.sheets({version:"v4", auth});
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const tab = process.env.SHEET_TAB_NAME || "Inscriptions";

    const read = await sheets.spreadsheets.values.get({
      spreadsheetId, range: `${tab}!A:G`
    });
    const rows = read.data.values || [];
    const out = [];

    for(let i=1;i<rows.length;i++){
      const [id, created_at, closed_at, wait_seconds, course_code, group, student] = rows[i];
      if(!closed_at){ // encore en file
        out.push({ id, created_at, course_code, group, student });
      }
    }

    // trier par created_at (asc)
    out.sort((a,b)=> new Date(a.created_at)-new Date(b.created_at));
    return { statusCode:200, body: JSON.stringify(out) };
  }catch(err){
    return { statusCode:500, body: JSON.stringify({ error: err.message }) };
  }
}
