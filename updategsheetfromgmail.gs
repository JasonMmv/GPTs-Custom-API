const sheetId = '구글시트아이디-W1EAesk3a7jUgkVG3FwyKp0g'; // Google Sheets ID로 변경
const sheetName = 'Sheet1'; // 데이터가 있는 시트 이름으로 변경

// 토큰 값 (보안 상 실제로는 환경 변수를 사용하는 것이 좋음)
const SECRET_TOKEN = "토큰 값";

function doPost(e) {
  const token = e.parameter.token; // 요청의 토큰 가져오기

  // 토큰 검증
  if (token !== SECRET_TOKEN) {
    return ContentService.createTextOutput(
      JSON.stringify({ status: "error", message: "Unauthorized" })
    ).setMimeType(ContentService.MimeType.JSON);
  }
  
  main();
  // 응답 반환
  return ContentService.createTextOutput(
    JSON.stringify({ status: "success", data: { timestamp: new Date(), message: "GAS started" } })
  ).setMimeType(ContentService.MimeType.JSON);
}

function generateRandomToken() {
  const tokenLength = 64; // 토큰 길이
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < tokenLength; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    token += charset[randomIndex];
  }
  return token;
}

// 사용 예
function testGenerateRandomToken() {
  const token = generateRandomToken();
  Logger.log("Generated Token: " + token);
}


/**
 * 폴링방식으로 동착할 메인 함수
 * @return 없음
 */
function main() {
  const keyword = 'Home Depot'
  // sheetId = getProperty('Folder_Id');
  // sheetId = getProperty('Sheet_Id');
  const result = getEmailList(keyword);
  Logger.log(result);
}

function testgetProperty(){
  var fid = getProperty('Folder_Id');
  var sid = getProperty('Sheet_Id');
  console.log("%s %s",fid, sid );
}

function getProperty(pName){
  try {
    // Get the value for the user property 'DISPLAY_UNITS'.
    const userProperties = PropertiesService.getScriptProperties();//.getUserProperties();
    const pValue = userProperties.getProperty(pName);
    console.log('values of pValue %s', pValue);
    return pValue;
  } catch (err) {
    // TODO (developer) - Handle exception
    console.log('Failed with error %s', err.message);
    return null;
  }
}
/**
 * 이메일을 키워드로 검색하여 구글시트에 작성하는 함수
 * @param {string} keyword - 검색할 검색어
 * @return {object} - JSON 객체
 */
function getEmailList(keyword){
  const maxResults = 10; // 가져올 최대 이메일 개수
 // Gmail에서 특정 키워드가 포함된 이메일 검색
  // const query = `in:inbox ${keyword}`;
  // Gmail 검색 쿼리 생성 (특정 기간과 첨부파일 및 키워드 포함 조건)
  const startDate = getDateDaysAgo(30);//maxResults);
  const endDate = getTomorrowFormatted();//getTodayFormatted();
  const query = `in:inbox after:${startDate} before:${endDate} has:attachment ${keyword}`;
  console.log(query);

  const threads = GmailApp.search(query, 0, maxResults); // 최대 10개의 스레드를 가져옵니다
  const messages = GmailApp.getMessagesForThreads(threads);
  
  console.log(messages.length);
  // 검색된 이메일 정보를 저장할 배열
  const emailData = [];

  // Google Sheets에 접근
  const spreadsheet = SpreadsheetApp.openById(sheetId);
  const sheet = spreadsheet.getSheetByName(sheetName);

  // 기존에 기록된 이메일 ID 목록 가져오기
  const lastRow = sheet.getLastRow();
  let existingIds = [];
  // 기존에 기록된 이메일 ID 목록 가져오기
  if(lastRow > 1){
    existingIds = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().flat();
  }
  
  // 드라이브에 저장할 폴더 생성 또는 기존 폴더 가져오기
  const folder = DriveApp.getFolderById("1bF95kWflDeAtgPGhMW7KPeI4MYotJk0s"); // Google 드라이브의 폴더 ID로 변경하세요


  messages.forEach(threadMessages => {
    threadMessages.forEach(message => {
      const messageId = message.getId(); // 각 메시지의 고유 ID

      // 기존 ID 목록에 없을 때만 Google Sheets에 추가
      console.log(existingIds);
      if (!existingIds.includes(messageId)) {
        const date = message.getDate();
        const subject = message.getSubject();
        const sender = message.getFrom();
        var amount = 1000;
        const snippet = typeof message.getSnippet === "function" 
                        ? message.getSnippet() 
                        : ""; // 이메일 본문의 요약

        const attachments = message.getAttachments(); // 첨부파일 가져오기
        attachments.forEach(attachment => {
          // 파일을 Google 드라이브에 저장
          const mimeType = attachment.getContentType();
          // const fileName = attachment.getName();
  
            if (mimeType === "application/pdf") { // PDF 파일만 저장
              const file = folder.createFile(attachment);
              console.log(`Saved attachment: ${file.getName()} (${file.getId()})`);
              
              const text = convertPDFToText(file.getId());
              // console.log(text);
              const receipt = extractReceiptInfo(text);
              // console.log(receipt['totalAmount']);
              
              // emailData[dataLength-1]['amount'] = receipt['totalAmount'];
              amount = receipt['totalAmount'];
              var address = receipt['address'];

              // Google Sheets에 데이터 추가
              sheet.appendRow([messageId, date, address, sender, amount, snippet]);
            }
          });
        }
    });
  });
  return emailData; 
}

/**
 * PDF 파일을 텍스트로 변환
 * @param {string} fileId - 파일 아이디
 * @return {string} - 추출된 텍스트
 */
function convertPDFToText(fileId) {
  try {
    // PDF 파일을 Google Docs 형식으로 변환
    const pdfFile = DriveApp.getFileById(fileId);
    // const pdfBlob = pdfFile.getBlob();
    
    // PDF 파일을 Google Docs 형식으로 변환
    // const folder = DriveApp.getFolderById('1bF95kWflDeAtgPGhMW7KPeI4MYotJk0s');

     // Google Drive API를 사용해 PDF를 Google Docs로 변환
    const resource = {
      title: pdfFile.getName().replace(/\.pdf$/, ''),
      mimeType: 'application/vnd.google-apps.document' // Google Docs 형식
    };
    const googleDocFile = Drive.Files.copy(resource, fileId);
    const docId = googleDocFile.id;
    console.log(docId);

    const doc = DocumentApp.openById(docId);
    
    const textContent = doc.getBody().getText();
    console.log(textContent);

    // 임시 Google Docs 파일 삭제
    DriveApp.getFileById(docId).setTrashed(true);

    return textContent; // 추출된 텍스트 반환

  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    return null;
  }
}

/**
 * 몇일전의 날짜를 반환하는 함수
 * @param {int} days - 몇일
 * @return {string} - 날짜 문자열
 */
function getDateDaysAgo(days) {
  const today = new Date();
  today.setDate(today.getDate() - days); // 오늘 날짜에서 지정된 일 수를 뺌

  // 날짜 형식을 'YYYY/MM/DD'로 변환하여 반환
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0'); // 월을 2자리로 맞춤
  const day = String(today.getDate()).padStart(2, '0'); // 일을 2자리로 맞춤
  
  return `${year}/${month}/${day}`;
}

/**
 * 오늘 날짜를 반환하는 함수
 * @return {string} -  날짜 문자열
 */
function getTodayFormatted() {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth()+1).padStart(2, '0'); // 월을 2자리로 맞춤
  const day = String(today.getDate()).padStart(2, '0'); // 일을 2자리로 맞춤
  // console.log(`${year}/${month}/${day}`)
  return `${year}/${month}/${day}`;
}

function getTomorrowFormatted() {
  const today = new Date();
  
  // 오늘 날짜에서 하루 더하기
  today.setDate(today.getDate() + 1);

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0'); // 월을 2자리로 맞춤
  const day = String(today.getDate()).padStart(2, '0'); // 일을 2자리로 맞춤

  return `${year}/${month}/${day}`;
}


function unitTest(){
  getTodayFormatted();
  console.log(getTomorrowFormatted());
}
/**
 * 영수증 텍스트에서 주소, 총금액, 상품명 및 상품 코드를 추출하는 함수
 * @param {string} text - 분석할 텍스트
 * @return {object} - 주소, 총금액, 상품명 및 상품 코드 리스트를 포함한 객체
 */
function extractReceiptInfo(text) {
  // 주소 추출 (첫 줄의 텍스트가 주소라고 가정)
  const addressRegex = /^[\w\s,#\-]+,\s+\w+/m;
  const addressMatch = text.match(addressRegex);
  const address = addressMatch ? addressMatch[0].trim() : null;

  // 총금액 추출 (TOTAL 키워드 뒤에 나오는 금액, 양수/음수 모두 포함)
  const totalAmountRegex = /TOTAL\s*(-?\$?[0-9]+\.[0-9]{2})/;
  const totalAmountMatch = text.match(totalAmountRegex);
  const totalAmount = totalAmountMatch ? totalAmountMatch[1].replace('$', '').trim() : "금액을 찾을 수 없습니다";

  // 상품 코드 및 상품명 추출 (상품 코드와 상품명 사이의 텍스트)
  const productRegex = /(\d{12})\s+([A-Z0-9\s<>\-\/]+)\s+(-?\d+\.\d{2})/g;
  let productMatch;
  const products = [];

  // 상품명 추출 (상품 코드와 금액 사이의 문자)
  const productNameRegex = /\d{12}\s+([A-Z0-9\s]+?)\s+\d+\.\d{2}/;
  const productNameMatch = text.match(productNameRegex);
  // const productName = productNameMatch ? productNameMatch[1].trim() : null;
  
  while ((productMatch = productRegex.exec(text)) !== null) {
    products.push({
      productCode: productMatch[1],
      productName: productMatch[2].trim()
    });
  }

  return {
    address: address,
    totalAmount: totalAmount,
    products: products
  };
}

/*
 * Convert PDF file to text using OCR
 * @param {string} fileId - The Google Drive ID of the PDF
 * @param {string} language - The language of the PDF text to use for OCR
 * @return {string} - The extracted text of the PDF file
 */

function testExtractTextFromPDF() {
  const pdfFileId = '1-25YPySW_wfEX0dQxmPyvrKnIuKdcez1'; // PDF 파일 ID로 변경
  const extractedText = convertPDFToText(pdfFileId);

  if (extractedText) {
    console.log("추출된 텍스트:", extractedText);
  } else {
    console.log("PDF 텍스트 추출에 실패했습니다.");
  }
}

// 테스트용 예제 텍스트로 실행해보기
function testExtractReceiptInfo() {
  const text = `
    3155 HIGHWAY #7, MARKHAM, ONTARIO 
    STORE MANAGER 905-940-5900 
    7004 00060 43723 22/10/24 08:01 a.m . SALE CASHIER LAVINDRA 
    881599018238 CDD04563701F <A> 6.98 
    SUBTOTAL 6.98  GST/HST 0.91  TOTAL $7.89  XXXXXXXXXXXX3419 HOME DEPOT 7.89  AUTH CODE 022040/1606719 TA 
  `;

  const info = extractReceiptInfo(text);
  console.log("추출된 정보:", info);
}


// 테스트용 예제 텍스트로 실행해보기
function testExtractReceiptInfo2() {
  const text = `
    2375 STEELES AVE W TORONTO, ONT M3J 3N2 ADAM DUDZINSKI STORE MGR (416)664-9800 
    7078 00034 13200 23/10/24 10:09 a.m . CASHIER ERIKA MARIE 
    * ORIG REC: 7004 061 35198 26/09/24 TA * 
    061788880505 ADD-A-STOP -34.73  
    GST/HST -4.51 
    * ORIG REC: 7262 061 54827 16/10/24 TA * 
    775439510108 1-1/2X6 SJ E -19.83  
    775439020287 P.O PLUG -54.84  
    775439510016 1-1/2 BR J B -25.67  
    GST/HST -13.03 
    TOTAL -$294.05
  `;

  const info = extractReceiptInfo(text);
  console.log("추출된 정보:", info);
}


// 테스트용 예제 텍스트로 실행해보기
function testExtractReceiptInfo() {
  // const text = "3155 HIGHWAY #7, MARKHAM, ONTARIO STORE MANAGER 905-940-5900 7004 00060 43723 22/10/24 08:01 a.m . SALE CASHIER LAVINDRA 881599018238 CDD04563701F <A> 6.98 SUBTOTAL 6.98  GST/HST 0.91  TOTAL $7.89  XXXXXXXXXXXX3419 HOME DEPOT 7.89  AUTH CODE 022040/1606719 TA ";

  const text = "2375 STEELES AVE W TORONTO, ONT M3J 3N2 ADAM DUDZINSKI STORE MGR (416)664-9800 7078 00034 13200 23/10/24 10:09 a.m . CASHIER ERIKA MARIE * ORIG REC: 7004 061 35198 26/09/24 TA * 061788880505 ADD-A-STOP -34.73  GST/HST -4.51 * ORIG REC: 7262 061 54827 16/10/24 TA * 775439510108 1-1/2X6 SJ E -19.83  775439020287 P.O PLUG -54.84  775439510016 1-1/2 BR J B -25.67  GST/HST -13.03 * ORIG REC: 7004 003 58127 13/10/24 TA * 026508351819 PSHDOWNDRNBN -36.98  116131 ABS11/2COUPL 2@-1.44 EACH -2.88  026508901168 HANDLE -22.32  038753489353 RRS PVC -12.62  GST/HST -9.73 * ORIG REC: 7001 012 43252 29/09/24 TA * 848154080215 ABS TRAPADAP -4.33  628488987028 FLX CP15X125 -9.98  GST/HST -1.86 * ORIG REC: 7004 061 06454 17/10/24 TA * 078477708781 GFCI 20A GY -31.98  GST/HST -4.15 * ORIG REC: 7004 061 20828 22/10/24 TA * 070798710238 KWIK SEAL -4.07  GST/HST -0.54 SUBTOTAL -260.23  GST/HST -33.82  TOTAL -$294.05  XXXXXXXXXXXX3419 HOME DEPOT -294.05  INVOICE 0341348 TA REFUND-CUSTOMER COPY 13% HST R135772911 DID WE NAIL IT? Take a short survey for a chance TO WIN A $3,000 HOME DEPOT GIFT CARD! www.homedepot.com/survey User ID: XKJ 33767 26723 PASSWORD: 24523 26689 Entries must be completed within 14 days of purchase. See complete rules on website. No purchase necessary. (Sondage offert en français sur le Web.) Page 1 of 1";

  const info = extractReceiptInfo(text);
  console.log("추출된 정보:", info);
  console.log(info['totalAmount']);
}


