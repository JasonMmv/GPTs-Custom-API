# app.py
import os
from flask import Flask, jsonify
from google.oauth2 import service_account
from googleapiclient.discovery import build

app = Flask(__name__)

# Google Sheets API 설정
SERVICE_ACCOUNT_FILE = 'kq-lab-0d779c4b2584.json'  # OAuth 2.0 인증 파일 경로
SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly']
SPREADSHEET_ID = '구글시트아이디-W1EAesk3a7jUgkVG3FwyKp0g'  # 스프레드시트 ID
RANGE_NAME = 'Sheet1!A1:E10'  # 데이터 범위 (예: Sheet1 시트의 A1에서 D10까지)

def get_google_sheet_data():
    # 서비스 계정 자격 증명 생성
    creds = service_account.Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE, scopes=SCOPES)

    # Google Sheets API 클라이언트 생성
    service = build('sheets', 'v4', credentials=creds)
    sheet = service.spreadsheets()

    # 시트 데이터 가져오기
    result = sheet.values().get(spreadsheetId=SPREADSHEET_ID, range=RANGE_NAME).execute()
    
    values = result.get('values', [])

    return listToJson(values)

def listToJson(values):
    # 첫 번째 행을 키로 사용하여 나머지 행을 JSON 형식으로 변환
    headers = values[0]  # 첫 번째 행 (헤더)
    data_rows = values[1:]  # 데이터 행들

    # JSON 객체 생성
    json_data = []
    for row in data_rows:
        # 각 행을 키-값 쌍으로 매핑하고 딕셔너리로 변환
        # item = {headers[i]: row[i] if i < len(row) else None for i in range(len(headers))}
        item = {
            headers[1]: row[1],
            headers[2]: row[3],
            headers[3]: row[2],
            headers[4]: float(row[4])
        }
        json_data.append(item)

    return json_data
# 엔드포인트: /data 호출 시 Google Sheets 데이터 반환
@app.route("/data", methods=["GET"])
def data():
    try:
        # Google Sheets에서 데이터 가져오기
        sheet_data = get_google_sheet_data()
        return jsonify(sheet_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
