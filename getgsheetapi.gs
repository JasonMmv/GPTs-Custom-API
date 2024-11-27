const sheetId = '구글시트아이디-W1EAesk3a7jUgkVG3FwyKp0g'; // Google Sheets ID
const sheetName = 'Sheet1'; // 데이터가 있는 시트 이름

function doPost(e) {
  // 구글 시트 읽어 오기
  const sheet = SpreadsheetApp.openById(sheetId).getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues(); // 시트의 모든 데이터를 가져옴
  
  // // 데이터를 JSON으로 변환하여 반환
  const responseData = data.slice(1).map(row => ({
    date: row[1],
    subject: row[3],
    sender: row[2],
    amount: row[4]
  }));
  // JSON응답 만들기
  return ContentService.createTextOutput(JSON.stringify(responseData))
    .setMimeType(ContentService.MimeType.JSON);
}
