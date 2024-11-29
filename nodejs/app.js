const express = require("express");
const { google } = require("googleapis");
const path = require("path");

// Express 앱 생성
const app = express();
const PORT = 8080;

// Google Sheets API 설정
const SERVICE_ACCOUNT_FILE = path.join(__dirname, "api-node-442418-14aa388060de.json"); // 서비스 계정 파일 경로
const SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"];
const SPREADSHEET_ID = "구글시트아이디-W1EAesk3a7jUgkVG3FwyKp0g"; // 스프레드시트 ID
const RANGE_NAME = "Sheet1!A1:E10"; // 읽을 데이터 범위

// Google Sheets 데이터 가져오기 함수
async function getGoogleSheetData() {
  try {
    // 서비스 계정 자격 증명 생성
    const auth = new google.auth.GoogleAuth({
      keyFile: SERVICE_ACCOUNT_FILE,
      scopes: SCOPES,
    });

    // Google Sheets API 클라이언트 생성
    const sheets = google.sheets({ version: "v4", auth });

    // 시트 데이터 가져오기
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: RANGE_NAME,
    });

    const values = response.data.values || [];
    return listToJson(values);
  } catch (error) {
    console.error("Error fetching data from Google Sheets:", error);
    throw error;
  }
}

// 데이터를 JSON 형식으로 변환하는 함수
function listToJson(values) {
  if (values.length === 0) {
    return [];
  }

  // 첫 번째 행을 키로 사용
  const headers = values[0];
  const dataRows = values.slice(1); // 첫 번째 행 제외

  // JSON 객체 생성
  return dataRows.map((row) => ({
    [headers[1]]: row[1],
    [headers[2]]: row[3],
    [headers[3]]: row[2],
    [headers[4]]: parseFloat(row[4]), // 숫자로 변환
  }));
}

// GET /data 엔드포인트: Google Sheets 데이터 반환
app.get("/data", async (req, res) => {
  try {
    const sheetData = await getGoogleSheetData();
    res.json(sheetData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
