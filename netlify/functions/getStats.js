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
    const data = [];

    for(let i=1;i<rows.length;i++){
      const [id, created_at, closed_at, wait_seconds, course_code, group, student] = rows[i];
      data.push({
        id, created_at, closed_at,
        wait_seconds: Number(wait_seconds||0),
        course_code, group, student
      });
    }

    const totals = {
      total_requests: data.length,
      open_requests: data.filter(r=>!r.closed_at).length,
      avg_wait_seconds: avg(data.filter(r=>r.wait_seconds>0).map(r=>r.wait_seconds)) || 0
    };

    const byDateCounts = {};
    const byDateAvg = {};
    const byDateWaits = {};

    for (const r of data) {
      const day = (r.created_at||"").split("T")[0] || "—";
      byDateCounts[day] = (byDateCounts[day]||0) + 1;
      if(r.wait_seconds>0){
        if(!byDateWaits[day]) byDateWaits[day] = [];
        byDateWaits[day].push(r.wait_seconds);
      }
    }
    for(const d of Object.keys(byDateWaits||{})){
      byDateAvg[d] = avg(byDateWaits[d]);
    }

    const by_date = Object.keys(byDateCounts).sort().map(d=>({date:d, count: byDateCounts[d]}));
    const by_date_avg_wait = Object.keys(byDateAvg).sort().map(d=>({date:d, avg_wait_seconds: byDateAvg[d]}));
    const last_day_key = by_date.length ? by_date[by_date.length-1].date : null;
    const last_day = last_day_key ? { date:last_day_key, count: byDateCounts[last_day_key] } : null;

    return { statusCode:200, body: JSON.stringify({ totals, by_date, by_date_avg_wait, last_day }) };
  }catch(err){
    return { statusCode:500, body: JSON.stringify({ error: err.message }) };
  }
}

function avg(arr){ if(!arr || !arr.length) return 0; return Math.round(arr.reduce((a,b)=>a+b,0)/arr.length); }
