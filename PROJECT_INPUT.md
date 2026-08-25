# Thông tin cần cung cấp cho một dự án QA

Điền file này hoặc gửi lại đúng các mục dưới đây. Không gửi mật khẩu hay file
service-account qua chat; đặt secret trực tiếp vào `.env` và thư mục `secret/`.

## 1. Website cần kiểm thử

- `BASE_URL`: URL website mở trên trình duyệt, ví dụ `https://dev.example.com`.
- Môi trường: dev / staging / production.
- Có được phép gửi form hoặc thay đổi dữ liệu không: có / không.

`BASE_URL` dùng cho UI, E2E, visual, crawl và bộ Postman public hiện tại.

## 2. Backend API (nếu có)

- `API_BASE_URL`: URL health endpoint trả JSON, ví dụ
  `https://api-dev.example.com/health`.
- OpenAPI/Swagger URL hoặc file JSON/YAML.
- Cơ chế xác thực: Bearer token / API key / cookie / không có.
- Tài khoản hoặc token dành riêng cho môi trường test.
- Endpoint nào chỉ được đọc và endpoint nào được phép tạo/sửa/xóa dữ liệu.

Chỉ điền `API_BASE_URL` mới kiểm tra được health endpoint. Muốn test toàn bộ API
phải cung cấp thêm OpenAPI/Swagger hoặc Postman collection và dữ liệu test.

## 3. Requirement và test case

Trong Google Sheet, tạo ít nhất một tab có tên thuộc một trong các nhóm:

- Requirement / Requirements / Yêu cầu
- Test Case / Test Cases / Kịch bản

Header phải nằm trong 20 dòng đầu. Có thể copy hai file mẫu trong `templates/`.

Quy tắc quan trọng: `Test ID` trong Sheet phải trùng ID trong automated test,
ví dụ `UI-NAV-001`, `API-HEALTH-001`, `E2E-CONTACT-003`. Nhiều ID có thể đặt
chung một ô, phân cách bằng dấu phẩy.

- Có ID trùng test thực thi: `MAPPED`.
- Chưa có ID hoặc ID chưa tồn tại: `UNMAPPED`, đây là việc cần bổ sung test.
- Không có tab requirement/test case: hệ thống vẫn chạy ở
  `DISCOVERY_FALLBACK` và AI chỉ tạo draft để review.

## 4. Google Sheet

- `GOOGLE_SPREADSHEET_ID`: đoạn nằm giữa `/d/` và `/edit` trong URL Sheet.
- `GOOGLE_SERVICE_ACCOUNT_FILE`: mặc định
  `secret/google-service-account.json`.
- Chia sẻ Sheet cho `client_email` trong file service-account:
  Viewer nếu chỉ đọc, Editor nếu bật đồng bộ finding.
- `SHEET_SYNC_ENABLED=false` để chỉ đọc; chỉ bật `true` khi cho phép ghi issue.

## 5. Tài khoản và phân quyền (nếu có đăng nhập)

- URL đăng nhập, ví dụ `/login`.
- Selector ô username, password và nút submit.
- Danh sách role.
- Với mỗi role: các URL được phép và bị cấm.
- Tên biến môi trường chứa username/password; không ghi mật khẩu vào file JSON.

Copy `config/role-access.example.json`, chỉnh selector/role/path, sau đó điền
credential trong `.env` và đặt `ROLE_TEST_ENABLED=true`.

## 6. AI và dashboard

- AI local: `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, `AI_ANALYSIS_ENABLED=true`.
- Dashboard: `DASHBOARD_PORT=3000`, mở `http://127.0.0.1:3000` sau khi chạy
  `npm run qa:dashboard`, hoặc chạy `docker compose up -d`.

Port 3000 chỉ phục vụ màn hình điều khiển QA. Nó không phải port website và
không phải port backend API. Ollama mặc định dùng port 11434, MongoDB dùng 27017.

## Mẫu `.env` tối thiểu

```dotenv
BASE_URL=https://dev.example.com
API_BASE_URL=https://api-dev.example.com/health

GOOGLE_SPREADSHEET_ID=replace_me
GOOGLE_SERVICE_ACCOUNT_FILE=secret/google-service-account.json
SHEET_SYNC_ENABLED=false

AI_ANALYSIS_ENABLED=true
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=replace_me

ROLE_TEST_ENABLED=false
ROLE_TEST_SPEC_FILE=config/role-access.example.json
DASHBOARD_PORT=3000
```
