# QA Automation Platform Master Specification

## 1. Mục tiêu tài liệu

Tài liệu này là đặc tả gốc để bắt đầu xây dựng hệ thống QA Automation chạy local và trong Docker.

Hệ thống phải hỗ trợ kiểm thử API, kiểm thử giao diện, kiểm thử luồng E2E, visual regression, thu thập bằng chứng lỗi, chụp ảnh màn hình, khoanh vùng lỗi trực tiếp trên ảnh, tạo báo cáo, đồng bộ lỗi vào Google Sheets và sử dụng Ollama chạy local để hỗ trợ phân tích lỗi, sinh test case và gợi ý nguyên nhân.

Tài liệu này là nguồn quy tắc chung cho toàn bộ quá trình thiết kế và triển khai.

## 2. Quy tắc bắt buộc khi code

### 2.1. Quy tắc nội dung code

1. Không sử dụng emoji.
2. Không sử dụng dấu ba chấm để thay cho nội dung chưa viết.
3. Không viết comment trong source code.
4. Không để TODO, FIXME hoặc placeholder chưa hoàn thiện.
5. Không tạo hàm rỗng.
6. Không tạo file rỗng.
7. Không dùng giá trị mẫu giả nếu giá trị đó có thể lấy từ config.
8. Không hard-code URL, token, username, password hoặc credential.
9. Không hard-code environment-specific values trong source code.
10. Không để secret trong Git.
11. Không để AI quyết định PASS hoặc FAIL nếu có thể xác định bằng assertion.
12. Không tự động sửa source code của dự án ở phiên bản đầu.
13. Mọi thao tác ghi vào source project phải bị khóa mặc định.
14. Mọi lỗi phải có evidence nếu evidence có thể thu thập được.
15. Mỗi test phải có ID duy nhất.
16. Mỗi bug phải có ID duy nhất.
17. Mọi dữ liệu test phải có nguồn rõ ràng.
18. Mọi kết quả test phải phân biệt lỗi sản phẩm, lỗi automation và lỗi môi trường.
19. Test phải có thể chạy lại.
20. Test phải có kết quả xác định khi requirement và expected result đã được định nghĩa.

### 2.2. Quy tắc thiết kế

PASS và FAIL phải do rule, assertion, schema, expected value hoặc baseline xác định.

Ollama chỉ được dùng cho các tác vụ hỗ trợ như:

- Sinh test case.
- Phân tích failure.
- Phân loại bug.
- Phân tích screenshot.
- Gợi ý root cause.
- Gợi ý source file có khả năng liên quan.
- Gợi ý hướng sửa.
- Tóm tắt report.

Ollama không được tự ý:

- Ghi đè source code.
- Commit code.
- Push Git.
- Thay đổi database production.
- Thay đổi Google Sheet ngoài phạm vi được cấu hình.
- Chuyển trạng thái test PASS sang FAIL hoặc ngược lại nếu assertion đã xác định kết quả.
- Xóa evidence.
- Xóa issue đã tồn tại.

## 3. Kiến trúc tổng thể

```text
Project Under Test
|
|-- Frontend
|-- Backend
|
QA Automation Platform
|
|-- Docker
|-- API Test Engine
|-- Postman Collection Runner
|-- UI Test Engine
|-- Playwright
|-- Visual Regression
|-- Evidence Collector
|-- Screenshot Annotator
|-- Ollama AI Assistant
|-- Google Sheets Integration
|-- Report Generator
|-- Test Data Manager
|-- Result Normalizer
```

Luồng chính:

```text
Load configuration
-> Validate environment
-> Check target application
-> Check Ollama
-> Load test plan
-> Run API tests
-> Run UI tests
-> Run E2E tests
-> Run visual tests
-> Collect evidence
-> Normalize results
-> Analyze failures
-> Annotate screenshots
-> Create bug records
-> Synchronize Google Sheets
-> Generate report
-> Finish
```

## 4. Công nghệ đề xuất

| Thành phần | Công nghệ |
|---|---|
| Ngôn ngữ chính | TypeScript |
| Runtime | Node.js |
| Container | Docker |
| Multi-container | Docker Compose |
| API testing | Postman Collection |
| API runner | Postman CLI hoặc Newman |
| UI testing | Playwright Test |
| E2E testing | Playwright Test |
| Visual regression | Playwright Screenshot Assertions |
| Local AI | Ollama |
| Google Sheets | Google Sheets API |
| Chèn ảnh | Google Apps Script hoặc Drive URL |
| Report | Playwright HTML Report và Custom HTML Report |
| Image processing | Sharp |
| Schema validation | JSON Schema hoặc Zod |
| Logging | Structured JSON logger |
| Config | YAML, JSON và environment variables |

## 5. Docker

### 5.1. Yêu cầu

Toàn bộ QA runner phải có thể chạy bằng Docker.

Ollama có thể chạy:

1. Trên host Linux hiện tại.
2. Trong container riêng nếu cần trong tương lai.

Ở giai đoạn đầu, Ollama chạy trên host để tận dụng model đã cài.

QA container phải truy cập Ollama host thông qua địa chỉ được cấu hình.

Không hard-code `127.0.0.1` vì bên trong Docker, `127.0.0.1` là container hiện tại.

Biến cấu hình:

```env
OLLAMA_BASE_URL=http://host.docker.internal:11434
```

Trên Linux phải hỗ trợ cấu hình host gateway trong Docker Compose.

### 5.2. Container dự kiến

```text
qa-runner
target-frontend optional
target-backend optional
report-server optional
```

Nếu frontend và backend của dự án đã chạy bên ngoài Docker thì QA runner chỉ cần nhận URL.

### 5.3. Lệnh mục tiêu

```bash
docker compose run --rm qa-runner npm run qa:all
```

Các lệnh riêng:

```bash
npm run qa:api
npm run qa:ui
npm run qa:e2e
npm run qa:visual
npm run qa:ai
npm run qa:report
npm run qa:all
```

## 6. Cấu trúc project

```text
qa-automation/
|
|-- config/
|   |-- qa.config.ts
|   |-- environments/
|       |-- local.env
|       |-- dev.env
|       |-- staging.env
|
|-- api/
|   |-- collections/
|   |-- environments/
|   |-- schemas/
|   |-- datasets/
|   |-- generated/
|
|-- ui/
|   |-- tests/
|   |-- pages/
|   |-- components/
|   |-- fixtures/
|   |-- locators/
|
|-- e2e/
|   |-- tests/
|   |-- flows/
|
|-- visual/
|   |-- baselines/
|   |-- actual/
|   |-- diff/
|
|-- ai/
|   |-- client/
|   |-- prompts/
|   |-- schemas/
|   |-- analyzers/
|
|-- engine/
|   |-- orchestrator/
|   |-- runners/
|   |-- assertions/
|   |-- normalizers/
|   |-- classifiers/
|
|-- evidence/
|   |-- screenshots/
|   |-- annotated/
|   |-- videos/
|   |-- traces/
|   |-- console/
|   |-- network/
|   |-- dom/
|
|-- integrations/
|   |-- google-sheets/
|   |-- google-drive/
|   |-- apps-script/
|
|-- reports/
|   |-- current/
|   |-- history/
|
|-- test-data/
|
|-- requirements/
|
|-- bugs/
|
|-- scripts/
|
|-- Dockerfile
|-- docker-compose.yml
|-- package.json
|-- tsconfig.json
|-- playwright.config.ts
|-- .env.example
|-- .gitignore
|-- README.md
```

## 7. Cấu hình hệ thống

### 7.1. Biến môi trường tối thiểu

```env
QA_ENV=local
BASE_URL=
API_BASE_URL=
OLLAMA_BASE_URL=
OLLAMA_MODEL=
GOOGLE_SPREADSHEET_ID=
GOOGLE_SERVICE_ACCOUNT_FILE=
GOOGLE_APPS_SCRIPT_URL=
REPORT_OUTPUT_DIR=reports/current
EVIDENCE_OUTPUT_DIR=evidence
HEADLESS=true
SCREENSHOT_ON_FAILURE=true
VIDEO_ON_FAILURE=true
TRACE_ON_FAILURE=true
VISUAL_TEST_ENABLED=true
AI_ANALYSIS_ENABLED=true
SHEET_SYNC_ENABLED=true
SOURCE_ANALYSIS_ENABLED=true
SOURCE_WRITE_ENABLED=false
```

### 7.2. Rule an toàn

`SOURCE_WRITE_ENABLED` mặc định phải là `false`.

Nếu không có credential Google hợp lệ thì test vẫn phải chạy và report local vẫn phải được tạo.

Nếu Ollama không hoạt động thì deterministic tests vẫn phải chạy.

Nếu Google Sheets không hoạt động thì issue phải được lưu local để retry sync.

## 8. Mô hình test chuẩn

Mỗi test case phải tuân theo format:

```json
{
  "id": "API-AUTH-001",
  "module": "Authentication",
  "type": "api",
  "title": "Login successfully with valid account",
  "priority": "high",
  "preconditions": [],
  "input": {},
  "expected": {},
  "tags": [],
  "enabled": true
}
```

### 8.1. Các loại test

```text
api
ui
e2e
visual
integration
validation
authentication
authorization
performance
security
compatibility
accessibility
```

### 8.2. Trạng thái test

Chỉ sử dụng:

```text
PASS
FAIL
FLAKY
SKIPPED
BROKEN_TEST
ENVIRONMENT_ERROR
BLOCKED
```

### 8.3. Ý nghĩa

`PASS`: tất cả assertion bắt buộc đạt.

`FAIL`: ứng dụng không đáp ứng expected result.

`FLAKY`: cùng một test cho kết quả không ổn định khi retry theo rule.

`SKIPPED`: test được chủ động bỏ qua theo config hoặc điều kiện hợp lệ.

`BROKEN_TEST`: test code, locator, test data hoặc assertion bị lỗi.

`ENVIRONMENT_ERROR`: lỗi hạ tầng, network, service, database hoặc dependency.

`BLOCKED`: test không thể tiếp tục do dependency bắt buộc chưa đạt.

## 9. API Testing

### 9.1. Postman

Postman Collection là định dạng chuẩn cho API test.

Collection phải hỗ trợ:

- Pre-request logic.
- Authentication.
- Environment variables.
- Collection variables.
- Request chaining.
- Assertion.
- JSON schema.
- Positive test.
- Negative test.
- Boundary test.
- Authorization test.
- Validation test.
- CRUD flow.
- Error handling.
- Response time threshold.
- Header validation.

### 9.2. Nhóm assertion bắt buộc

Mỗi API test phù hợp phải kiểm tra:

```text
HTTP status
Content-Type
Response schema
Required fields
Data types
Expected values
Business rules
Authentication
Authorization
Error structure
Response time
```

### 9.3. Không chỉ kiểm tra status 200

Ví dụ login thành công phải kiểm tra:

```text
Status code đúng
Token tồn tại
Token không rỗng
User object tồn tại
User ID đúng type
Role đúng
Không trả password
Content-Type đúng
Response time trong threshold
```

### 9.4. Negative testing

Các nhóm dữ liệu:

```text
missing field
null
empty string
wrong type
wrong format
too short
too long
duplicate
invalid token
expired token
wrong role
malformed JSON
unexpected field
special characters
Unicode
Vietnamese text
Japanese text
HTML input
script-like input
SQL-like input
```

### 9.5. API flow

Ví dụ:

```text
Register
-> Login
-> Save access token
-> Get profile
-> Create project
-> Save project ID
-> Get project
-> Update project
-> Verify project
-> Delete project
-> Verify deleted project
```

### 9.6. Postman run

QA runner phải gọi Postman collection trong Docker.

Kết quả Postman phải được normalize về result model chung của hệ thống.

## 10. UI Testing

### 10.1. Playwright

Playwright là công cụ chính cho UI và E2E.

Test phải hỗ trợ:

```text
Chromium
Firefox
WebKit optional
desktop viewport
mobile viewport optional
headless
headed
```

### 10.2. Locator

Thứ tự ưu tiên:

```text
data-testid
role
label
placeholder
text
CSS selector
XPath only when unavoidable
```

Không dùng CSS selector dễ vỡ nếu có locator ổn định hơn.

Khuyến nghị dự án thêm `data-testid` cho các element quan trọng.

### 10.3. Page Object

Các page có logic lặp lại phải dùng Page Object hoặc component abstraction.

Không copy locator cùng một element vào nhiều test file.

## 11. UI Rules cần tự động kiểm tra

Các lỗi UI đã được nhắc tới phải có khả năng chuyển thành test rule:

```text
textarea không giới hạn
SEO field thiếu hoặc sai
date format không thống nhất
layout tiếng Nhật bị dư khoảng trống
text alignment không thống nhất
tagline xuống dòng bất thường
dấu phân cách giữa các ngôn ngữ không thống nhất
khoảng hở cuối form
ảnh không mở được
button hoặc nội dung bị lệch
```

Mỗi rule phải được xác định bằng DOM, CSS, dimension, text rule hoặc visual baseline nếu có thể.

## 12. Visual Regression

### 12.1. Thành phần

```text
baseline
actual
diff
```

### 12.2. Rule

Visual test không được chạy chỉ dựa trên AI.

Visual test phải ưu tiên:

1. DOM assertion.
2. CSS assertion.
3. Geometry assertion.
4. Screenshot baseline comparison.
5. AI vision analysis để giải thích.

### 12.3. Ví dụ alignment

```text
Container center X
Element center X
Delta
Allowed tolerance
```

Nếu delta vượt tolerance thì test FAIL.

AI không được thay đổi kết quả này.

## 13. Evidence

Khi test FAIL phải cố gắng thu thập:

```text
screenshot
annotated screenshot
video
trace
console log
network log
request
response
DOM snapshot
test data reference
environment information
timestamp
```

Evidence phải được lưu theo run ID.

Ví dụ:

```text
evidence/
|-- RUN-20260819-001/
    |-- UI-PROJECT-027/
        |-- screenshot.png
        |-- annotated.png
        |-- video.webm
        |-- trace.zip
        |-- console.json
        |-- network.json
        |-- result.json
```

## 14. Screenshot Annotation

### 14.1. Mục tiêu

Khi xác định được element bị lỗi, hệ thống phải có thể vẽ trực tiếp lên screenshot.

Thông tin có thể vẽ:

```text
red rectangle
arrow
issue ID
element name
expected value
actual value
delta
```

### 14.2. Bounding box

Playwright lấy:

```text
x
y
width
height
```

Image processor sử dụng bounding box để tạo ảnh annotated.

### 14.3. Nguyên tắc

Không sửa screenshot gốc.

Luôn giữ:

```text
screenshot.png
annotated.png
```

## 15. Video và Trace

Video mặc định:

```text
retain-on-failure
```

Trace mặc định:

```text
retain-on-failure
```

Screenshot mặc định:

```text
only-on-failure
```

Có thể cấu hình lại theo environment.

## 16. Ollama

### 16.1. Vai trò

Ollama chạy local trên máy Linux.

QA container gọi Ollama qua HTTP.

Ollama phải được coi là optional dependency.

### 16.2. Chức năng AI

```text
test case generation
failure analysis
root cause suggestion
bug classification
screenshot analysis
source mapping suggestion
fix suggestion
report summary
```

### 16.3. Structured Output

Mọi output AI dùng trong code phải tuân theo schema.

Không parse prose tự do nếu output được dùng cho automation.

Ví dụ:

```json
{
  "category": "UI",
  "severity": "MEDIUM",
  "confidence": 0.91,
  "possibleCause": "Alignment rule is inconsistent",
  "suspectedFiles": [],
  "recommendation": ""
}
```

### 16.4. Confidence

AI analysis phải có confidence.

Confidence không ảnh hưởng PASS hoặc FAIL.

### 16.5. Vision model

Nếu model hỗ trợ hình ảnh thì có thể gửi:

```text
screenshot
annotated screenshot
DOM summary
expected rule
actual rule
```

Nếu model không hỗ trợ vision thì bỏ qua screenshot AI analysis.

## 17. Source Analysis

### 17.1. Quyền

Source analyzer chỉ có quyền read-only.

### 17.2. Input

```text
failed locator
route
request URL
stack trace
component name
CSS classes
DOM
console error
network error
```

### 17.3. Output

```text
suspected source file
suspected component
suspected function
suspected CSS file
reason
confidence
```

Không ghi:

```text
This file is definitely wrong
```

Chỉ ghi:

```text
Suspected source
```

nếu chưa có chứng cứ deterministic.

## 18. Bug Model

Mỗi bug phải có:

```text
Issue ID
Title
Module
Category
Severity
Priority
Status
Environment
Test Case ID
Preconditions
Steps
Input
Expected Result
Actual Result
Evidence
Screenshot
Annotated Screenshot
Video
Trace
Request
Response
Console
Network
Detected At
Run ID
Suspected Source
AI Analysis
Confidence
```

## 19. Severity Rule

Severity không chỉ do AI quyết định.

Rule mặc định:

| Severity | Điều kiện |
|---|---|
| BLOCKER | Không thể tiếp tục luồng chính hoặc toàn hệ thống không hoạt động |
| CRITICAL | Chức năng cốt lõi hỏng, mất dữ liệu, lỗi bảo mật nghiêm trọng |
| HIGH | Chức năng quan trọng sai và không có workaround phù hợp |
| MEDIUM | Chức năng sai nhưng có workaround hoặc ảnh hưởng giới hạn |
| LOW | UI, wording, alignment hoặc lỗi nhỏ không phá luồng chính |

AI có thể đề xuất severity nhưng rule engine mới quyết định giá trị chính thức.

## 20. Flaky Test

Test fail một lần chưa chắc là bug.

Rule đề xuất:

```text
Run 1 FAIL
Run 2 PASS
Run 3 FAIL
-> FLAKY
```

Số retry phải configurable.

Flaky test không được tự động ghi thành product bug nếu chưa đạt rule xác nhận.

## 21. Google Sheets

### 21.1. Hai chế độ đầu vào

Hệ thống phải hỗ trợ:

1. Người dùng cung cấp link Google Spreadsheet có sẵn.
2. Người dùng cung cấp Spreadsheet ID qua config.

Nếu hệ thống có quyền tạo spreadsheet mới trong tương lai thì có thể bổ sung chế độ tạo mới.

### 21.2. Spreadsheet structure

Trong cùng một Google Spreadsheet:

```text
List of bugs
Issue_no.01
Issue_no.02
Issue_no.03
```

`List of bugs` là tab đầu tiên hoặc tab tổng hợp.

Các tab `Issue_no.xx` là hồ sơ chi tiết từng bug.

### 21.3. Nếu spreadsheet đã có tab

Không xóa tab.

Không đổi tên tab hiện có nếu chưa được cấu hình cho phép.

Không ghi đè nội dung ngoài vùng hệ thống quản lý.

Hệ thống phải đọc danh sách sheet trước khi tạo issue mới.

### 21.4. Issue numbering

Nếu có:

```text
Issue_no.01
Issue_no.02
Issue_no.05
```

issue mới phải là:

```text
Issue_no.06
```

Không lấy số lượng sheet cộng một.

Phải lấy số lớn nhất hiện tại cộng một.

### 21.5. Format issue number

Mặc định:

```text
Issue_no.01
Issue_no.02
Issue_no.09
Issue_no.10
Issue_no.99
Issue_no.100
```

Không giới hạn ở hai chữ số.

### 21.6. List of bugs

`List of bugs` là master sheet mặc định khi tạo spreadsheet mới.

Nếu người dùng cung cấp spreadsheet có sẵn và chỉ định tên sheet đầu tiên thì hệ thống phải sử dụng đúng tên đó.

Nếu người dùng không chỉ định tên master sheet thì hệ thống phải tự phát hiện theo thứ tự:

```text
MASTER_SHEET_NAME từ config
List of bugs
List bug
List bugs
Bug list
worksheet đầu tiên có header tương thích
```

Không rename master sheet hiện có nếu chưa được yêu cầu.

Mỗi bug là một dòng.

Schema hoàn chỉnh được hợp nhất từ file Excel tham khảo và mẫu giao diện thực tế gồm 15 cột:

| Cột | Header chuẩn | Header tiếng Việt tương thích | Mục đích |
|---|---|---|---|
| A | No | STT | Số thứ tự bug |
| B | Reporter | Người tạo | Người phát hiện hoặc người tạo bug |
| C | Created Date | Ngày tạo | Ngày bug được tạo |
| D | Category | Danh mục | Khu vực hoặc nhóm chức năng |
| E | Function / Feature | Chức năng | Chức năng cụ thể bị ảnh hưởng |
| F | Description | Nội dung | Mô tả Actual Behavior và thông tin tái hiện ngắn |
| G | Expected | Expected | Kết quả mong đợi |
| H | Classification | Phân loại | Bug hoặc Task |
| I | Priority | Độ ưu tiên | Cao, Trung bình hoặc Thấp |
| J | Status | Trạng thái | Trạng thái xử lý bug |
| K | Assignee | Người đối ứng | Người chịu trách nhiệm xử lý |
| L | Response Date | Ngày đối ứng | Ngày phản hồi hoặc xử lý |
| M | Root Cause | Nguyên nhân | Nguyên nhân sau khi điều tra |
| N | Solution | Biện pháp đối ứng | Cách sửa hoặc biện pháp xử lý |
| O | Note | Ghi chú | Thông tin bổ sung |

Thứ tự canonical:

```text
No
Reporter
Created Date
Category
Function / Feature
Description
Expected
Classification
Priority
Status
Assignee
Response Date
Root Cause
Solution
Note
```

Không được bỏ `Expected`.

Không được thay `Description` bằng `Expected`.

`Description` và `Expected` là hai trường riêng.

`Description` phải ưu tiên mô tả hành vi thực tế đang sai.

`Expected` phải mô tả hành vi mong đợi.

Dữ liệu `Actual` chi tiết vẫn được lưu trong QA result model và HTML report.

Nếu cần thể hiện `Actual` riêng trong Google Sheet mà không thay đổi schema 15 cột thì ghi dưới dạng cấu trúc trong `Description`:

```text
Actual:
<nội dung thực tế>

Reproduction:
<thông tin tái hiện ngắn>
```

Không thêm cột `Actual` mới vào workbook hiện hữu nếu chưa được yêu cầu.

### 21.6.1. Screenshot trong List of bugs

Master sheet có thể hiển thị screenshot thumbnail ngay tại dòng bug nếu workbook hiện tại đang dùng cách này.

Thumbnail được xem là evidence tóm tắt.

Evidence đầy đủ vẫn nằm trong `Issue_no.xx`.

Quy tắc:

```text
List of bugs
-> metadata
-> description
-> expected
-> optional screenshot thumbnail

Issue_no.xx
-> full screenshot
-> annotated screenshot
-> expected image nếu có
-> actual image nếu có
-> ảnh bổ sung nếu có
```

Không bắt buộc nhúng thumbnail vào master sheet nếu việc nhúng làm hỏng row height hoặc layout hiện hữu.

### 21.6.2. Header compatibility

Hệ thống phải map được cả header tiếng Anh và tiếng Việt.

Mapping mặc định:

```text
Reporter = Người tạo
Created Date = Ngày tạo
Category = Danh mục
Function / Feature = Chức năng
Description = Nội dung
Expected = Expected
Classification = Phân loại
Priority = Độ ưu tiên
Status = Trạng thái
Assignee = Người đối ứng
Response Date = Ngày đối ứng
Root Cause = Nguyên nhân
Solution = Biện pháp đối ứng
Note = Ghi chú
```

Header hiện hữu được preserve.

Không tự dịch header của workbook cũ.

### 21.6.3. Classification

Giá trị mặc định:

```text
Bug
Task
```

AI có thể đề xuất classification.

Rule engine hoặc tester xác nhận classification cuối cùng nếu không đủ bằng chứng deterministic.

### 21.6.4. Priority

Giá trị tương thích:

```text
Cao
Trung bình
Thấp
```

Nếu workbook dùng tiếng Anh thì hỗ trợ:

```text
High
Medium
Low
```

Priority không đồng nhất với severity kỹ thuật.

Severity vẫn được lưu trong QA report.

### 21.6.5. Status

Workflow tương thích với file tham khảo:

```text
Chờ đối ứng
Đang đối ứng
Đã đối ứng
Đang Review
Đã Review
Đóng
```

Nếu workbook đã có data validation hoặc status list riêng thì preserve danh sách hiện tại.

Không ghi các trạng thái kỹ thuật của test engine vào cột `Status`.

Các trạng thái sau chỉ thuộc QA report:

```text
BROKEN_TEST
ENVIRONMENT_ERROR
FLAKY
BLOCKED
UNKNOWN
```

### 21.7. Issue_no.xx

Mỗi confirmed product bug có một evidence sheet riêng theo canonical naming:

```text
Issue_no.01
Issue_no.02
Issue_no.03
Issue_no.10
Issue_no.100
```

Workbook mới không tạo sheet gộp nhiều issue.

Workbook cũ có sheet gộp vẫn phải được đọc và preserve.

`Issue_no.xx` là evidence canvas.

Metadata chính nằm trong master sheet.

Evidence sheet ưu tiên chứa:

```text
Issue ID
Title ngắn
Screenshot chính
Annotated screenshot
Actual image nếu có
Expected image nếu có
Screenshot bổ sung nếu có
Textbox ngắn nếu cần
Bounding-box annotation
Arrow annotation
Expected và Actual dạng ngắn nếu cần
```

Không bắt buộc lặp lại toàn bộ 15 cột metadata trên mỗi issue sheet.

Machine evidence chi tiết không cần nhét vào Google Sheet:

```text
request
response
console
network
trace
DOM
Ollama analysis
source mapping
```

Các dữ liệu này nằm trong local HTML report và artifact storage.

### 21.7.1. Liên kết master row với Issue sheet

Khi tạo confirmed product bug:

```text
append row vào master sheet
create Issue_no.xx
insert evidence
create internal hyperlink từ master row tới Issue_no.xx
```

Nếu internal hyperlink không khả dụng thì lưu tên issue sheet trong metadata hoặc note kỹ thuật của hệ thống.

Không rollback bug chỉ vì hyperlink thất bại.

### 21.7.2. Issue numbering

Issue mới luôn lấy:

```text
max issue number đã phát hiện + 1
```

Không dùng số lượng sheet cộng một.

Không tái sử dụng số bị thiếu.

Nếu workbook có:

```text
Issue_no.01
Issue_no.03
Issue_no.10
```

issue tiếp theo là:

```text
Issue_no.11
```

### 21.8. Ảnh trong Issue Sheet

Ưu tiên:

1. Chèn ảnh trực tiếp vào sheet nếu integration cho phép.
2. Chèn annotated screenshot.
3. Giữ link file gốc nếu ảnh vượt giới hạn hoặc upload thất bại.

Ảnh gốc phải được giữ local.

Ảnh annotated phải được giữ local.

Nếu cần upload ảnh để tạo link thì phải sử dụng nơi lưu được cấu hình.

### 21.9. Apps Script helper

Có thể sử dụng Apps Script helper để:

```text
receive image
insert image into Issue sheet
resize image
position image
return result
```

QA runner không được phụ thuộc tuyệt đối vào Apps Script.

Nếu Apps Script lỗi thì bug data vẫn phải được ghi và evidence local vẫn phải tồn tại.

## 22. Google Authentication

Credential không được commit.

Khuyến nghị automation sử dụng service account hoặc cơ chế credential dành riêng cho môi trường test.

Spreadsheet phải được share quyền phù hợp cho account automation.

File credential phải mount vào Docker dưới dạng read-only.

Ví dụ:

```yaml
volumes:
  - ./secrets/google-service-account.json:/run/secrets/google-service-account.json:ro
```

## 23. Sheet Sync Queue

Nếu Google API lỗi thì issue phải được lưu vào queue local.

Ví dụ:

```text
bugs/pending-sync/
```

Mỗi issue chứa payload JSON.

Lần chạy tiếp theo có thể retry sync.

Không tạo issue duplicate khi retry.

Mỗi issue phải có stable issue key.

## 24. Duplicate Bug Detection

Không tạo issue mới nếu cùng bug đã tồn tại trong cùng run hoặc theo fingerprint rule.

Fingerprint đề xuất dựa trên:

```text
test case ID
module
normalized error
locator
endpoint
expected
actual
```

AI không phải nguồn duy nhất để xác định duplicate.

## 25. Run ID

Mỗi lần test có một Run ID.

Format:

```text
RUN-YYYYMMDD-HHMMSS
```

Ví dụ:

```text
RUN-20260819-094500
```

Run ID được sử dụng cho:

```text
report
evidence
bugs
logs
sheet records
```

## 26. Report

### 26.1. Summary

Report phải có:

```text
Run ID
Start time
End time
Environment
Total
Passed
Failed
Flaky
Skipped
Broken Test
Environment Error
Blocked
```

### 26.2. Theo nhóm

```text
API
UI
E2E
Visual
Integration
```

### 26.3. Failure detail

Mỗi failure phải hiển thị:

```text
Test Case ID
Title
Module
Status
Severity
Expected
Actual
Assertion
Evidence
Annotated Image
Video
Trace
Console
Network
AI Analysis
Suspected Source
Google Sheet Issue
```

## 27. Logging

Log phải có structured format.

Không chỉ ghi plain text khó parse.

Mỗi log event nên có:

```json
{
  "timestamp": "",
  "level": "info",
  "runId": "",
  "testId": "",
  "component": "",
  "event": "",
  "message": ""
}
```

Không ghi:

```text
access token
password
cookie secret
authorization header raw
private API key
```

## 28. Security

### 28.1. Secret

Tất cả secret phải lấy từ:

```text
environment variables
Docker secrets
mounted secret files
```

### 28.2. Log sanitization

Trước khi lưu request hoặc response phải redact:

```text
Authorization
Cookie
Set-Cookie
password
access_token
refresh_token
secret
api_key
```

### 28.3. Production safety

Mặc định QA runner phải từ chối destructive tests trên production nếu chưa bật explicit flag.

Ví dụ:

```env
ALLOW_DESTRUCTIVE_TESTS=false
```

### 28.4. Source safety

```env
SOURCE_WRITE_ENABLED=false
```

## 29. Test Data

Không hard-code dữ liệu nghiệp vụ trong test file nếu có thể externalize.

Cấu trúc:

```text
test-data/
|-- users.json
|-- projects.json
|-- products.json
|-- blogs.json
|-- invalid-inputs.json
|-- boundary-values.json
```

Test data phải hỗ trợ environment override.

## 30. Requirement Mapping

Mỗi test case nên liên kết được với requirement.

Format:

```text
REQ-AUTH-001
TC-API-AUTH-001
BUG-AUTH-001
```

Luồng:

```text
Requirement
-> Test Scenario
-> Test Case
-> Test Execution
-> Failure
-> Bug
-> Evidence
```

## 31. Test Scenario Model

Ví dụ:

```json
{
  "id": "SC-AUTH-001",
  "module": "Authentication",
  "title": "Validate login behavior",
  "requirementIds": ["REQ-AUTH-001"],
  "testCaseIds": [
    "API-AUTH-001",
    "API-AUTH-002",
    "UI-AUTH-001"
  ]
}
```

## 32. Test Generation bằng Ollama

AI có thể nhận:

```text
requirement
API schema
frontend route
existing test cases
business rules
```

AI trả về structured test cases.

Generated test case phải đi qua validator trước khi được chạy.

Không chạy test case AI nếu:

```text
missing expected result
missing target
invalid schema
unknown test type
unsafe destructive action
missing required credential
```

## 33. Code Generation bằng AI

AI có thể sinh file test.

Generated code phải:

```text
compile
pass lint
pass typecheck
follow project rules
contain no comments
contain no placeholders
contain no secrets
```

Generated code không được tự động merge vào stable tests nếu chưa qua validation.

## 34. Code Validation Pipeline

Mỗi file code sinh ra phải qua:

```text
syntax validation
format
lint
typecheck
dry validation
test discovery
safe execution
```

Nếu fail pipeline thì trạng thái là:

```text
BROKEN_TEST
```

Không ghi product bug.

## 35. Error Classification

Failure classifier phải xác định một trong các nhóm:

```text
PRODUCT_BUG
BROKEN_TEST
ENVIRONMENT_ERROR
FLAKY
EXPECTED_FAILURE
BLOCKED
UNKNOWN
```

Nếu classifier không đủ dữ liệu thì dùng `UNKNOWN`.

Không ép thành PRODUCT_BUG.

## 36. API Error Evidence

Khi API fail phải lưu:

```text
method
URL sanitized
request headers sanitized
request body sanitized
status
response headers sanitized
response body sanitized
response time
assertion
```

## 37. UI Error Evidence

Khi UI fail phải lưu:

```text
page URL
viewport
browser
locator
element bounding box
screenshot
annotated screenshot
video
trace
console
network
DOM summary
expected
actual
```

## 38. Browser Console

Console errors cần được capture.

Không phải mọi console error đều là test fail.

Chỉ fail nếu rule test yêu cầu hoặc error thuộc danh sách nghiêm trọng được cấu hình.

## 39. Network Monitoring

UI test phải có thể bắt:

```text
4xx
5xx
failed request
timeout
CORS failure when observable
unexpected redirect
```

Không tự động fail mọi 404 vì có thể là resource không quan trọng.

Rule phải configurable.

## 40. Performance

API test có threshold.

Ví dụ:

```text
login <= 1000 ms
list <= 1500 ms
create <= 2000 ms
```

Không hard-code threshold trong test nếu config có thể định nghĩa.

UI performance nâng cao có thể bổ sung sau.

## 41. Accessibility

Có thể thêm phase accessibility sau core system.

Không làm accessibility AI-only.

Nếu bổ sung thì dùng rule engine chuyên dụng.

## 42. Browser Matrix

Giai đoạn đầu:

```text
Chromium
```

Giai đoạn sau:

```text
Chromium
Firefox
WebKit
```

Không mở rộng browser matrix trước khi core tests ổn định.

## 43. Environment Check

Trước khi chạy test:

```text
target frontend reachable
target backend reachable
required ports reachable
Ollama reachable if enabled
Google credential readable if sheet sync enabled
output directory writable
test data valid
Postman collection valid
Playwright browser available
```

Nếu dependency optional fail thì disable component tương ứng.

Nếu dependency mandatory fail thì `ENVIRONMENT_ERROR`.

## 44. Orchestrator

Orchestrator chịu trách nhiệm:

```text
create run ID
load config
validate environment
run test groups
collect raw results
normalize results
trigger retries
collect evidence
classify failures
call AI
create bugs
sync sheets
generate report
return exit code
```

## 45. Exit Code

Đề xuất:

```text
0 = no confirmed failure
1 = confirmed product failure
2 = automation failure
3 = environment failure
4 = configuration failure
```

CI có thể dựa vào exit code.

## 46. Google Sheet và file code được cung cấp bằng link

Khi người dùng cung cấp link:

1. Parse ID từ link.
2. Xác định loại tài nguyên.
3. Kiểm tra quyền truy cập.
4. Đọc cấu trúc trước.
5. Không ghi ngay.
6. Xác định vùng hệ thống được phép quản lý.
7. Chỉ sau khi validate mới ghi.

Nếu link là spreadsheet đã có:

```text
reuse spreadsheet
reuse List of bugs
discover Issue_no.xx
continue numbering
```

Nếu `List of bugs` chưa tồn tại thì tạo.

Nếu tên tab tổng hợp được cấu hình khác thì dùng tên đã cấu hình.

## 47. Naming Convention

### 47.1. Test IDs

```text
API-AUTH-001
UI-PROJECT-001
E2E-PROJECT-001
VISUAL-BLOG-001
```

### 47.2. Sheet issue

```text
Issue_no.01
Issue_no.02
Issue_no.03
```

### 47.3. Evidence

```text
TC_ID__timestamp__type.ext
```

Ví dụ:

```text
UI-PROJECT-027__20260819-094500__screenshot.png
```

## 48. Version 1 Scope

Version 1 bắt buộc có:

```text
Docker
TypeScript
Postman collection runner
Playwright
API assertions
UI tests
E2E tests
screenshot on failure
video on failure
trace on failure
console capture
network capture
annotated screenshot
local HTML report
Ollama failure analysis
Google Sheet List of bugs
Google Sheet Issue_no.xx
issue numbering
sheet sync retry
security redaction
read-only source analyzer
```

## 49. Version 1 không làm

Version 1 không:

```text
auto fix production code
auto commit
auto push
auto merge
auto deploy
auto close bug
auto delete Google Sheet issue
AI-only pass fail
production destructive testing
```

## 50. Version 2

Có thể bổ sung:

```text
AI generated patch
human review workflow
regression after patch
Git integration
CI integration
multi-browser
accessibility
performance dashboard
duplicate bug history
trend analytics
test coverage mapping
```

## 51. Version 3

Có thể bổ sung:

```text
controlled auto patch
sandbox patch execution
automatic regression
approval gate
Git branch creation
pull request generation
```

## 52. Thứ tự triển khai

### Phase 0

Thiết kế schema và config.

Output:

```text
config schema
test schema
result schema
bug schema
evidence schema
sheet schema
```

### Phase 1

Tạo project TypeScript và Docker.

Output:

```text
Dockerfile
docker-compose.yml
package.json
tsconfig.json
environment loader
logger
run ID
```

### Phase 2

API engine.

Output:

```text
Postman collection loader
Postman runner
result parser
API evidence
API report
```

### Phase 3

Playwright foundation.

Output:

```text
playwright.config.ts
fixtures
pages
locators
base test
UI result adapter
```

### Phase 4

Evidence engine.

Output:

```text
screenshot
video
trace
console
network
DOM
```

### Phase 5

Visual regression.

Output:

```text
baseline
actual
diff
geometry rules
```

### Phase 6

Screenshot annotation.

Output:

```text
bounding box capture
image annotation
issue labels
```

### Phase 7

Ollama integration.

Output:

```text
health check
model config
structured output
failure analyzer
vision analyzer optional
```

### Phase 8

Bug engine.

Output:

```text
bug model
severity rules
fingerprint
duplicate detector
issue generator
```

### Phase 9

Google Sheets.

Output:

```text
spreadsheet reader
sheet discovery
List of bugs writer
Issue_no.xx creator
issue number resolver
image integration
sync queue
retry
```

### Phase 10

Source analyzer.

Output:

```text
read-only source index
locator mapping
route mapping
stack trace mapping
AI suggestion
```

### Phase 11

Unified report.

Output:

```text
summary
test groups
failures
evidence
AI analysis
Google Sheet links
```

### Phase 12

Regression hardening.

Output:

```text
retry rules
flaky detection
error classification
security review
test stability review
```

## 53. Definition of Done cho từng feature

Một feature chỉ hoàn thành khi:

```text
code compiles
lint passes
typecheck passes
test is executable
error handling exists
config exists
no secret is hard-coded
no comments exist in code
no placeholder exists
result is normalized
failure produces evidence when applicable
documentation is updated
```

## 54. Definition of Done cho toàn hệ thống Version 1

Version 1 hoàn thành khi có thể chạy:

```bash
docker compose run --rm qa-runner npm run qa:all
```

và hệ thống thực hiện được:

```text
validate environment
run API tests
run UI tests
run E2E tests
run visual tests
collect evidence
annotate screenshots
analyze failures with Ollama if enabled
classify failures
create local bugs
sync List of bugs
create Issue_no.xx
generate report
return deterministic exit code
```

## 55. Kết quả kỳ vọng của một lần chạy

Ví dụ:

```text
Run ID: RUN-20260819-094500

Total: 324
PASS: 298
FAIL: 18
FLAKY: 3
SKIPPED: 2
BROKEN_TEST: 1
ENVIRONMENT_ERROR: 2

API failures: 6
UI failures: 7
Visual failures: 3
Environment issues: 2

Annotated screenshots: 10
Videos: 7
Traces: 10
AI analyses: 16
Google Sheet issues created: 14
Pending sync: 2
```

## 56. Nguyên tắc quan trọng nhất

Hệ thống QA phải vẫn hoạt động khi Ollama bị tắt.

Hệ thống QA phải vẫn tạo report khi Google Sheets bị lỗi.

Hệ thống QA không được nhầm lỗi automation thành lỗi sản phẩm nếu có thể nhận biết.

Hệ thống QA không được làm mất evidence.

Hệ thống QA không được phá dữ liệu Google Sheets có sẵn.

Hệ thống QA không được sửa source dự án nếu chưa bật quyền rõ ràng.

Hệ thống QA phải ưu tiên deterministic validation trước AI reasoning.

AI là lớp hỗ trợ phân tích, không phải nguồn chân lý cho PASS hoặc FAIL.

## 57. Điểm bắt đầu code

Bắt đầu từ Phase 0 và Phase 1.

Thứ tự file nên tạo đầu tiên:

```text
package.json
tsconfig.json
Dockerfile
docker-compose.yml
.env.example
config/qa.config.ts
engine/orchestrator/index.ts
engine/results/types.ts
engine/results/schema.ts
engine/run/run-id.ts
engine/logging/logger.ts
playwright.config.ts
README.md
```

Sau khi foundation chạy được trong Docker mới bắt đầu API runner.

Sau khi API runner ổn định mới thêm Playwright.

Sau khi deterministic testing ổn định mới tích hợp Ollama.

Sau khi bug model ổn định mới kết nối Google Sheets.

Không đảo thứ tự này nếu không có lý do kỹ thuật rõ ràng.
## 58. Reference Workbook Compatibility Profile

File tham khảo thực tế có cấu trúc:

```text
List bug
Issue_no.1
Issue_no.2
Issue_no.3
Issue_no.10
Issue_no15+16
Issue_no.30+31
Issue_no.36+37+38
Issue_no46+47
Issue_no.49+50
Issue_no.53+54
Issue_no.56+57
Issue_no.63+64
Issue_no.93
```

Hệ thống mới không được giả định mọi workbook cũ đều tuân thủ naming convention mới.

### 58.1. Canonical naming cho workbook mới

Workbook mới do hệ thống quản lý sử dụng:

```text
List of bugs
Issue_no.01
Issue_no.02
Issue_no.03
Issue_no.10
Issue_no.100
```

Mỗi issue mới có một sheet riêng.

Không tạo sheet gộp nhiều issue trong workbook mới.

### 58.2. Alias detection cho workbook có sẵn

Master sheet aliases phải hỗ trợ tối thiểu:

```text
List of bugs
List bug
List bugs
Bug list
```

Issue sheet parser phải nhận được các dạng:

```text
Issue_no.1
Issue_no.01
Issue_no1
Issue_no.10
Issue_no15+16
Issue_no.30+31
Issue_no.36+37+38
```

Không rename tự động sheet cũ.

Không split sheet gộp tự động.

Không merge sheet cũ tự động.

### 58.3. Issue number resolver

Khi xác định issue number lớn nhất, parser phải lấy tất cả số issue xuất hiện trong tên sheet.

Ví dụ:

```text
Issue_no.93
Issue_no.56+57
Issue_no15+16
```

Max issue number là:

```text
93
```

Issue mới là:

```text
Issue_no.94
```

Nếu canonical workbook đang dùng padding hai chữ số:

```text
Issue_no.94
```

Nếu số nhỏ hơn 10:

```text
Issue_no.01
Issue_no.02
Issue_no.09
```

### 58.4. Master list schema hợp nhất hoàn chỉnh

File Excel tham khảo và hình giao diện thực tế được xem là hai phần của cùng một template.

Không chọn một template và loại template còn lại.

Schema canonical là hợp của cả hai và gồm 15 cột:

| Cột | Header chuẩn | Header tương thích |
|---|---|---|
| A | No | STT |
| B | Reporter | Người tạo |
| C | Created Date | Ngày tạo |
| D | Category | Danh mục |
| E | Function / Feature | Chức năng |
| F | Description | Nội dung |
| G | Expected | Expected |
| H | Classification | Phân loại |
| I | Priority | Độ ưu tiên |
| J | Status | Trạng thái |
| K | Assignee | Người đối ứng |
| L | Response Date | Ngày đối ứng |
| M | Root Cause | Nguyên nhân |
| N | Solution | Biện pháp đối ứng |
| O | Note | Ghi chú |

Mẫu trong hình cung cấp:

```text
No
Reporter
Created Date
Category
Function / Feature
Description
Classification
Priority
Status
Assignee
Response Date
Root Cause
Solution
Note
```

File Excel tham khảo bổ sung trường:

```text
Expected
```

Kết quả hợp nhất bắt buộc:

```text
No
Reporter
Created Date
Category
Function / Feature
Description
Expected
Classification
Priority
Status
Assignee
Response Date
Root Cause
Solution
Note
```

`Expected` nằm ngay sau `Description`.

Không bỏ bất kỳ trường nào trong union này khi tạo workbook mới.

Workbook có sẵn được đọc theo header thực tế và map về schema canonical.

Nếu workbook cũ chưa có `Expected` thì không tự dịch chuyển cột hoặc phá layout.

Trong compatibility mode, `Expected` có thể được giữ trong internal result model cho đến khi người dùng cho phép mở rộng workbook.

Nếu workbook mới do automation tạo thì luôn tạo đủ 15 cột.

### 58.4.1. Description và Expected

`Description` ghi hành vi thực tế đang sai và bối cảnh lỗi.

`Expected` ghi hành vi mong đợi.

Ví dụ:

```text
Description:
Khi chuyển giao diện sang tiếng Nhật, khối cuối trang bị lệch trái và xuất hiện khoảng trống lớn bên phải.

Expected:
Khối nội dung phải giữ cùng alignment và khoảng cách như các ngôn ngữ còn lại.
```

### 58.4.2. Screenshot ở master sheet và issue sheet

Cả hai cách lưu evidence đều được hỗ trợ đồng thời.

Master sheet:

```text
metadata đầy đủ
optional screenshot thumbnail tại dòng bug
```

Issue sheet:

```text
full screenshot
annotated screenshot
expected image
actual image
supporting screenshots
```

Không xem hai cách này là lựa chọn loại trừ nhau.

### 58.4.3. Cột cuối

Cột cuối canonical là:

```text
Note
```

Header tiếng Việt tương thích:

```text
Ghi chú
```

### 58.5. Giá trị phân loại

Workbook tham khảo có:

```text
Bug
Task
```

Automation phải cho phép cấu hình thêm loại khác nhưng không tự tạo loại mới nếu chưa cần.

### 58.6. Độ ưu tiên

Workbook tham khảo có:

```text
Cao
Trung bình
Thấp
```

Các giá trị này là priority, không đồng nhất với severity kỹ thuật.

Hệ thống nội bộ vẫn có thể lưu severity riêng.

Khi đồng bộ vào workbook mẫu, cột `Độ ưu tiên` sử dụng priority theo format workbook.

### 58.7. Trạng thái

Workbook tham khảo sử dụng flow:

```text
Chờ đối ứng
Đang đối ứng
Đã đối ứng
Đang Review
Đã Review
Đóng
```

Khi workbook hiện tại đã định nghĩa status flow thì hệ thống phải sử dụng flow đó.

Không tự chèn status kỹ thuật như `BROKEN_TEST` hoặc `ENVIRONMENT_ERROR` vào cột trạng thái bug.

Các trạng thái kỹ thuật phải nằm trong report QA nội bộ.

### 58.8. Issue sheet là evidence canvas

Dựa trên workbook tham khảo, `Issue_no.xx` được xem chủ yếu là evidence canvas.

Master metadata nằm trong `List of bugs`.

Issue sheet ưu tiên chứa:

```text
screenshot chính
screenshot phụ nếu cần
annotated screenshot
ảnh expected nếu có
ảnh actual nếu có
textbox mô tả ngắn
mũi tên
khung đánh dấu
nhãn lỗi
```

Không bắt buộc lặp lại toàn bộ 15 cột metadata trong mỗi issue sheet.

### 58.9. Default layout cho issue sheet mới

Template mặc định:

```text
A1:N2
Issue ID và tiêu đề ngắn

A3:N30
Screenshot chính

O3:AB30
Screenshot thứ hai hoặc expected image

A32:AB34
Expected và Actual dạng ngắn

A36:AB60
Ảnh bổ sung nếu có
```

Layout thực tế có thể tự co giãn theo kích thước ảnh.

Không kéo méo tỷ lệ ảnh.

### 58.10. Image placement

Ảnh phải được chèn dưới dạng image object nếu API cho phép.

Không chuyển screenshot thành chuỗi base64 trong cell.

Không lưu binary image trực tiếp trong cell text.

Ảnh phải giữ aspect ratio.

Ảnh lớn phải resize theo bounding area.

Ảnh nhỏ không được upscale quá mức làm giảm chất lượng quan sát.

### 58.11. Screenshot pair

Nếu bug cần so sánh hai trạng thái, ưu tiên:

```text
Actual
Expected
```

hoặc:

```text
Before
After
```

Nếu chỉ có một screenshot thì chỉ chèn một ảnh.

Không tạo ảnh giả cho vị trí còn lại.

### 58.12. Screenshot annotation

Workbook tham khảo có sử dụng textbox và drawing trên issue sheet.

Hệ thống mới hỗ trợ hai cách:

```text
bake annotation trực tiếp vào annotated PNG
native Google Sheets drawing nếu integration hỗ trợ ổn định
```

Cách mặc định là bake annotation vào PNG trước khi upload.

Lý do:

```text
ổn định vị trí
không phụ thuộc zoom
không phụ thuộc row height
không bị lệch drawing khi sheet thay đổi
dễ dùng trong HTML report
dễ lưu local
```

### 58.13. Existing drawings

Khi đọc workbook cũ:

```text
image
textbox
shape
```

phải được xem là evidence hiện hữu.

Không xóa drawing cũ.

Không di chuyển drawing cũ khi append issue mới.

### 58.14. Combined issue sheets

Workbook cũ có thể chứa:

```text
Issue_no15+16
Issue_no.30+31
Issue_no.36+37+38
```

Parser phải map một sheet tới nhiều issue number.

Ví dụ:

```json
{
  "sheetName": "Issue_no.36+37+38",
  "issueNumbers": [36, 37, 38]
}
```

Issue lookup theo số 37 phải tìm được sheet này.

### 58.15. Missing issue numbers

Workbook cũ có thể không có sheet cho mọi số liên tiếp.

Không coi số bị thiếu là lỗi workbook.

Không tái sử dụng số bị thiếu.

Issue mới luôn lấy:

```text
max discovered issue number + 1
```

### 58.16. Master row và issue sheet linking

Khi tạo issue mới:

```text
append row vào List of bugs
create Issue_no.xx
insert evidence
create hyperlink từ row tới Issue_no.xx nếu API hỗ trợ
```

Nếu hyperlink nội bộ thất bại:

```text
ghi tên sheet vào cột cấu hình hoặc ghi chú nội bộ
```

Không rollback toàn bộ bug chỉ vì hyperlink thất bại.

### 58.17. Existing row preservation

Không sort lại toàn bộ `List of bugs` nếu chưa được yêu cầu.

Không thay đổi màu các row cũ.

Không overwrite status, người đối ứng, nguyên nhân hoặc biện pháp đối ứng của bug cũ.

Automation chỉ cập nhật field mà workflow cho phép.

### 58.18. Style preservation

Khi workbook có style hiện hữu:

```text
header fill
borders
row color
status color
priority color
merged title
legend
column width
row height
```

phải ưu tiên copy style từ row gần nhất hoặc template row.

Không áp style mới lên toàn workbook.

### 58.19. Date handling

Ngày phải được ghi dưới dạng date value nếu API hỗ trợ.

Không ghi date thành text nếu workbook đang dùng date cells.

Display format phải lấy từ workbook hoặc config.

### 58.20. Local Excel file mode

Ngoài Google Spreadsheet URL, hệ thống phải hỗ trợ file `.xlsx` local để:

```text
đọc cấu trúc
phân tích schema
dùng làm template
test logic parser
test issue numbering
test image detection
```

Local workbook mặc định là read-only reference.

Chỉ tạo bản output mới nếu cần chỉnh sửa.

Không overwrite file tham khảo.

### 58.21. Workbook discovery output

Trước khi sync, integration phải tạo một discovery result:

```json
{
  "masterSheet": "List bug",
  "masterSheetCanonical": "List of bugs",
  "masterHeadersDetected": true,
  "issueSheetsDetected": 82,
  "maxIssueNumber": 93,
  "combinedIssueSheetsDetected": true,
  "imageEvidenceDetected": true,
  "drawingEvidenceDetected": true
}
```

Các con số phải lấy từ workbook đang đọc, không hard-code.

### 58.22. Compatibility mode

Cấu hình:

```env
SHEET_COMPATIBILITY_MODE=auto
```

Các giá trị:

```text
auto
canonical
legacy
```

`auto`:

```text
discover workbook
preserve existing naming
continue existing compatible structure
use canonical naming cho workbook mới
```

`canonical`:

```text
require List of bugs
create Issue_no.xx theo chuẩn mới
```

`legacy`:

```text
ưu tiên naming và schema workbook mẫu
```

### 58.23. Canonical rule khi người dùng đưa Google Sheets link

Flow:

```text
receive URL
extract spreadsheet ID
authenticate
list worksheets
detect master sheet
detect headers
detect issue sheets
parse all issue numbers
detect combined sheets
find max issue number
inspect formatting template
inspect image strategy
build compatibility profile
start test execution
create issue only after confirmed failure
```

### 58.24. Canonical rule khi người dùng không đưa Google Sheets link

Nếu config cho phép tạo workbook:

```text
create spreadsheet
create List of bugs
create legend
create headers
apply validation
create first issue only when a confirmed bug exists
```

Không tạo hàng loạt `Issue_no.xx` rỗng.

### 58.25. Confirmed bug rule

Chỉ tạo row trong `List of bugs` và sheet `Issue_no.xx` khi failure được phân loại là:

```text
PRODUCT_BUG
```

Các kết quả sau không tạo product issue mặc định:

```text
BROKEN_TEST
ENVIRONMENT_ERROR
FLAKY
BLOCKED
UNKNOWN
```

Chúng vẫn xuất hiện trong QA report.

### 58.26. Task creation rule

Automation không tự chuyển mọi phát hiện thành `Bug`.

Nếu rule xác định đây là enhancement hoặc consistency improvement thì có thể đề xuất:

```text
Task
```

AI được phép đề xuất `Bug` hoặc `Task`.

Rule engine hoặc tester xác nhận loại cuối.

### 58.27. Reference workbook observations

Workbook tham khảo xác nhận các nhu cầu thực tế sau:

```text
một master bug list duy nhất
nhiều issue evidence sheets
nhiều screenshot trong một issue
textbox và drawing để chỉ lỗi
issue numbering kéo dài qua nhiều đợt test
bug và task cùng tồn tại
priority và workflow status riêng
Admin và User cùng được test
đa ngôn ngữ VI EN JP
desktop và mobile issue
UI layout issue
validation issue
content issue
image issue
date format issue
textarea issue
popup issue
table overflow issue
```

Các nhóm này phải được xem là test taxonomy thực tế của framework.

## 59. Revised Google Sheets Architecture

Kiến trúc Google Sheets sau khi tham khảo workbook thực tế:

```text
QA Engine
|
Confirmed Product Bug
|
|-- Bug metadata
|   |
|   -> List of bugs
|
|-- Evidence
|   |
|   |-- screenshot.png
|   |-- annotated.png
|   |-- expected.png optional
|   |-- actual.png optional
|   |
|   -> Issue_no.xx
|
|-- Extended machine data
    |
    |-- request
    |-- response
    |-- console
    |-- network
    |-- trace
    |-- Ollama analysis
    |
    -> Local HTML report
```

Google Sheets không phải nơi lưu toàn bộ machine evidence.

Các artifact lớn phải nằm trong local report hoặc storage được cấu hình.

Google Sheets là lớp quản lý bug dễ đọc cho tester và developer.

## 60. Final Sheet Rules

Các rule cuối cùng:

1. Workbook mới dùng `List of bugs` làm tên master sheet mặc định.
2. Nếu người dùng cung cấp tên master sheet thì dùng đúng tên được cung cấp.
3. Nếu spreadsheet có sẵn thì tự phát hiện master sheet theo config, alias và header.
4. Workbook mới luôn tạo schema hợp nhất 15 cột A đến O.
5. Schema canonical là `No`, `Reporter`, `Created Date`, `Category`, `Function / Feature`, `Description`, `Expected`, `Classification`, `Priority`, `Status`, `Assignee`, `Response Date`, `Root Cause`, `Solution`, `Note`.
6. `Expected` là cột riêng và không được gộp mất vào `Description` trong workbook mới.
7. `Description` chứa Actual Behavior và bối cảnh tái hiện ngắn.
8. `Note` là cột cuối.
9. Header tiếng Việt và tiếng Anh đều phải được map.
10. Workbook cũ được preserve tên sheet và header hiện tại.
11. `List bug` được nhận là alias hợp lệ.
12. Workbook mới dùng `Issue_no.01`, `Issue_no.02`.
13. Sheet gộp issue cũ được hỗ trợ khi đọc.
14. Không tạo sheet gộp mới.
15. Không tái sử dụng số issue bị thiếu.
16. Issue mới lấy số lớn nhất đã phát hiện cộng một.
17. Không xóa ảnh cũ.
18. Không xóa textbox hoặc drawing cũ.
19. Không overwrite file tham khảo.
20. Metadata chính nằm trong master list.
21. Master row có thể chứa screenshot thumbnail.
22. Issue sheet chứa full screenshot và annotated screenshot.
23. Master thumbnail và Issue sheet evidence được hỗ trợ đồng thời.
24. Ảnh annotated được tạo trước khi upload.
25. Ảnh phải giữ đúng tỷ lệ.
26. Không kéo méo screenshot.
27. Issue mới chỉ tạo cho confirmed product bug.
28. Automation failure chỉ nằm trong QA report.
29. Environment failure chỉ nằm trong QA report.
30. AI không tự quyết định product bug nếu deterministic evidence chưa đủ.
31. Style workbook cũ phải được preserve.
32. Không sort lại master sheet nếu chưa được yêu cầu.
33. Không đổi status hoặc assignee của issue cũ ngoài workflow được phép.
34. Master row phải liên kết tới issue sheet khi integration hỗ trợ.
35. Machine evidence lớn nằm trong local report hoặc storage được cấu hình.
36. Google Sheets là lớp bug management, không phải nơi duy nhất lưu evidence.
37. Nếu Google Sheets lỗi thì local bug và evidence vẫn phải được giữ.
38. Nếu Ollama lỗi thì deterministic testing vẫn phải chạy.
39. Nếu workbook có 14 cột không có `Expected` thì compatibility mode phải đọc được mà không phá file.
40. Nếu automation tạo workbook mới thì bắt buộc tạo đủ 15 cột.

## 61. Canonical Spreadsheet Example

Master sheet:

```text
List of bugs
```

Header:

```text
A  No
B  Reporter
C  Created Date
D  Category
E  Function / Feature
F  Description
G  Expected
H  Classification
I  Priority
J  Status
K  Assignee
L  Response Date
M  Root Cause
N  Solution
O  Note
```

Một confirmed bug tạo:

```text
List of bugs row 27
Issue_no.27
```

Master row lưu:

```text
No
Reporter
Created Date
Category
Function / Feature
Description
Expected
Classification
Priority
Status
Assignee
Response Date
Root Cause
Solution
Note
```

Issue sheet lưu:

```text
full screenshot
annotated screenshot
expected image nếu có
actual image nếu có
supporting image nếu có
```

Local report lưu:

```text
test case
assertion
request
response
console
network
trace
DOM
source mapping
Ollama analysis
run metadata
```

## 62. Rule Set cho AI Code Generation

Khi Ollama hoặc bất kỳ code generator nào tạo source code cho framework này, output bắt buộc:

```text
không emoji
không comment
không TODO
không FIXME
không placeholder
không dấu ba chấm thay nội dung
không hard-code secret
không hard-code credential
không hard-code environment URL
không hàm rỗng
không file rỗng
không source write mặc định
không AI-only PASS FAIL
```

Code sinh ra phải qua:

```text
syntax validation
format validation
lint
typecheck
test discovery
safe execution
```

Nếu code sinh ra không đạt các rule này thì trạng thái là:

```text
BROKEN_TEST
```

Không được tạo product bug từ lỗi code sinh tự động.

## 63. Reporter và Created Date Runtime Rules

### 63.1. Reporter

Các bug do hệ thống QA này tạo thay mặt tester phải sử dụng tên tester được cấu hình làm `Reporter`.

Không để Ollama tự sinh tên Reporter.

Không lấy Reporter từ tên model, tên container, tên máy hoặc tài khoản ứng dụng đang được test.

Cấu hình bắt buộc:

```env
TESTER_NAME=
```

Giá trị `TESTER_NAME` phải là tên của tester đang vận hành hệ thống.

Khi tạo row mới trong `List of bugs`:

```text
Reporter = TESTER_NAME
```

Nếu `TESTER_NAME` chưa được cấu hình thì hệ thống phải báo lỗi cấu hình trước khi đồng bộ bug lên Google Sheets.

Không được ghi Reporter rỗng.

Không được tự đặt Reporter thành `Automation`, `AI`, `Ollama`, `Tester` hoặc tên giả khác.

### 63.2. Created Date

`Created Date` phải được lấy tại thời điểm thực tế bug được tạo.

Không hard-code ngày hiện tại trong source code.

Không lấy ngày từ ngày viết code.

Không lấy ngày từ ngày tạo Docker image.

Không lấy ngày từ ngày khởi động máy.

Không lấy ngày cố định từ file test.

Không lấy ngày của lần chạy trước.

Không dùng literal như:

```text
today
current date
19/08/2026
```

làm giá trị cố định trong code.

Rule:

```text
Created Date = thời điểm hệ thống xác nhận failure là PRODUCT_BUG và tạo bug record
```

### 63.3. Runtime date behavior

Ngày phải được tính tại runtime.

Ví dụ một test run bắt đầu:

```text
23:58 ngày 19/08
```

Bug A được tạo:

```text
23:59 ngày 19/08
```

thì:

```text
Created Date = 19/08
```

Bug B được tạo:

```text
00:02 ngày 20/08
```

thì:

```text
Created Date = 20/08
```

Không được lấy cùng một ngày cho toàn bộ run nếu run đi qua ngày mới.

### 63.4. Timezone

Timezone phải configurable.

Cấu hình mặc định:

```env
QA_TIMEZONE=Asia/Ho_Chi_Minh
```

Mọi giá trị ngày giờ dùng cho bug management phải được chuyển về `QA_TIMEZONE` trước khi ghi vào Google Sheets.

Không phụ thuộc timezone mặc định của Docker container.

Không phụ thuộc timezone UTC của host nếu `QA_TIMEZONE` đã được cấu hình.

### 63.5. Created Date và Detected At

Hệ thống phải phân biệt:

```text
Created Date
Detected At
```

`Created Date` là giá trị hiển thị trong `List of bugs`.

`Detected At` là timestamp kỹ thuật chính xác dùng trong local report và machine data.

Ví dụ:

```text
Created Date = 20/08/2026
Detected At = 2026-08-20T00:02:14+07:00
```

Format hiển thị của `Created Date` phải lấy từ workbook hoặc config.

Timestamp kỹ thuật phải giữ timezone offset.

### 63.6. Run ID không thay thế Created Date

`Run ID` dùng để truy vết lần chạy.

Ví dụ:

```text
RUN-20260819-235800
```

Nếu run kéo qua ngày mới thì Run ID vẫn giữ nguyên.

Mỗi bug vẫn lấy `Created Date` tại thời điểm bug được tạo.

### 63.7. Google Sheets write rule

Khi append một confirmed product bug vào `List of bugs`:

```text
No = issue sequence
Reporter = TESTER_NAME
Created Date = runtime bug creation date in QA_TIMEZONE
Category = detected or configured category
Function / Feature = detected or configured feature
Description = actual behavior and reproduction context
Expected = expected behavior
Classification = confirmed classification
Priority = rule result
Status = configured initial workflow status
Assignee = empty unless known
Response Date = empty
Root Cause = empty unless confirmed
Solution = empty
Note = optional
```

Không tự điền `Assignee`, `Response Date`, `Root Cause` hoặc `Solution` bằng phỏng đoán của AI.

### 63.8. Initial Status

Initial status của bug mới phải configurable.

Ví dụ:

```env
BUG_INITIAL_STATUS=Chờ đối ứng
```

Nếu workbook có data validation riêng thì giá trị initial status phải thuộc danh sách hợp lệ của workbook.

### 63.9. Required environment additions

Bổ sung vào `.env.example`:

```env
TESTER_NAME=
QA_TIMEZONE=Asia/Ho_Chi_Minh
BUG_INITIAL_STATUS=Chờ đối ứng
```

### 63.10. Deterministic source of time

Code phải sử dụng system clock tại runtime và timezone được cấu hình.

Ollama không được cung cấp ngày tạo bug.

LLM output không được dùng làm nguồn thời gian.

Google Sheets server timestamp không được dùng thay cho application timestamp nếu hệ thống đã tạo timestamp trước đó.

Một bug record phải có timestamp duy nhất được tạo bởi QA engine và sử dụng nhất quán cho:

```text
Created Date
Detected At
evidence filename
report record
sheet sync payload
local bug payload
```

Giá trị hiển thị có thể khác format nhưng phải cùng nguồn timestamp.

## 64. Google Sheets Image Embedding và External Evidence Storage

### 64.1. Nguyên tắc bắt buộc

Ảnh lỗi phải được chèn trực tiếp vào Google Sheet.

Không chỉ ghi URL ảnh vào cell.

Không yêu cầu tester phải mở link ngoài mới xem được lỗi.

`Issue_no.xx` phải hiển thị trực tiếp:

```text
screenshot gốc
annotated screenshot
expected image nếu có
actual image nếu có
supporting screenshots nếu có
```

Link storage chỉ là nơi lưu file evidence gốc.

Google Sheet là nơi hiển thị evidence trực tiếp cho tester và developer.

### 64.2. Nơi lưu ảnh

Nơi lưu ảnh không được hard-code.

Người dùng cung cấp link thư mục hoặc file storage của họ.

Cấu hình:

```env
EVIDENCE_STORAGE_URL=
EVIDENCE_STORAGE_TYPE=
```

Nếu storage là Google Drive thì parser phải lấy folder ID hoặc resource ID từ link được cung cấp.

Ví dụ cấu hình logic:

```text
EVIDENCE_STORAGE_URL = link thư mục do tester cung cấp
EVIDENCE_STORAGE_TYPE = google-drive
```

Không tạo storage riêng nếu người dùng đã cung cấp nơi lưu.

Không upload ảnh sang dịch vụ khác nếu chưa được yêu cầu.

### 64.3. Luồng lưu và chèn ảnh

Khi một confirmed product bug được tạo:

```text
capture screenshot
-> create annotated screenshot
-> save local temporary evidence
-> upload original screenshot vào storage do người dùng cung cấp
-> upload annotated screenshot vào storage do người dùng cung cấp
-> lấy file identifier hoặc file URL
-> chèn ảnh trực tiếp vào Issue_no.xx
-> ghi storage link vào machine metadata
-> ghi issue row vào List of bugs
```

Nếu có expected image:

```text
upload expected image
-> insert expected image trực tiếp vào Issue_no.xx
```

Nếu có actual image:

```text
upload actual image
-> insert actual image trực tiếp vào Issue_no.xx
```

### 64.4. Ảnh trong Google Sheet

Cách mặc định phải tạo visible image trong sheet.

Ưu tiên:

```text
native over-grid image
```

Nếu integration hiện tại không hỗ trợ native over-grid image trực tiếp thì sử dụng Apps Script helper để nhận image blob và chèn ảnh vào worksheet.

Không coi hyperlink là image embedding.

Không coi text URL là image embedding.

Không coi local file path là image embedding.

### 64.5. Apps Script image helper

Apps Script helper có nhiệm vụ:

```text
receive target spreadsheet
receive target sheet
receive image source
receive anchor row
receive anchor column
receive desired dimensions
insert image
resize while preserving aspect ratio
return insertion result
```

QA runner phải gửi chính xác issue sheet cần chèn.

Ví dụ:

```text
Issue_no.27
```

Ảnh không được chèn nhầm vào `List of bugs`.

### 64.6. Master sheet thumbnail

Ngoài ảnh đầy đủ trong `Issue_no.xx`, `List of bugs` có thể chèn thumbnail trực tiếp trong row bug nếu template hiện tại sử dụng thumbnail.

Nếu chèn thumbnail:

```text
thumbnail phải là visible image
thumbnail không thay thế Issue_no.xx
thumbnail không thay thế full evidence
```

Nếu row height hoặc layout của master sheet không phù hợp thì có thể bỏ thumbnail nhưng full image trong `Issue_no.xx` vẫn bắt buộc.

### 64.7. Storage link trong metadata

Mỗi evidence file phải lưu được:

```text
storage provider
storage file ID
storage URL
local temporary path
issue ID
run ID
evidence type
created timestamp
```

Ví dụ evidence type:

```text
screenshot
annotated
expected
actual
supporting
video
trace
```

Google Sheet không cần hiển thị tất cả storage URL nếu ảnh đã được chèn trực tiếp.

Storage URL vẫn phải có trong local report hoặc machine metadata để truy vết file.

### 64.8. External storage adapter

Evidence storage phải được thiết kế theo adapter.

Interface logic:

```text
upload file
get file ID
get file URL
get downloadable content
check access
```

Adapter đầu tiên:

```text
Google Drive
```

Có thể bổ sung storage khác sau mà không thay đổi test engine.

### 64.9. User-provided link rule

Nếu người dùng cung cấp link storage:

```text
parse link
validate provider
validate permission
validate destination
use destination đó cho evidence mới
```

Không tự chọn thư mục khác.

Không tự tạo thư mục ngoài destination nếu chưa được cấu hình.

Có thể tạo subfolder bên trong destination theo Run ID nếu config cho phép.

Ví dụ:

```text
<user folder>/
|-- RUN-20260819-100300/
    |-- Issue_no.27/
        |-- screenshot.png
        |-- annotated.png
```

### 64.10. Folder structure

Cấu trúc mặc định trong storage:

```text
QA-Evidence/
|-- RUN-YYYYMMDD-HHMMSS/
    |-- Issue_no.xx/
        |-- screenshot.png
        |-- annotated.png
        |-- expected.png
        |-- actual.png
        |-- supporting-01.png
```

Nếu người dùng đã cung cấp root folder thì `QA-Evidence` có thể bị bỏ qua và tạo trực tiếp dưới folder đó theo config.

Không thay đổi cấu trúc folder hiện hữu ngoài phạm vi automation quản lý.

### 64.11. Image naming

Tên file ảnh:

```text
Issue_no.xx__TC_ID__timestamp__screenshot.png
Issue_no.xx__TC_ID__timestamp__annotated.png
Issue_no.xx__TC_ID__timestamp__expected.png
Issue_no.xx__TC_ID__timestamp__actual.png
```

Timestamp phải lấy từ runtime timestamp của bug.

### 64.12. Image insertion failure

Nếu upload storage thành công nhưng chèn ảnh vào Google Sheet thất bại:

```text
bug record vẫn được giữ
storage file vẫn được giữ
sync status = PARTIAL
retry image insertion
```

Không tạo issue duplicate.

Không upload lại file nếu file ID hiện tại còn hợp lệ.

### 64.13. Storage upload failure

Nếu chụp ảnh thành công nhưng upload storage thất bại:

```text
giữ ảnh local
mark pending upload
không mất evidence
retry upload
```

Nếu Google Sheet vẫn hỗ trợ chèn trực tiếp từ blob local qua Apps Script thì có thể chèn ảnh vào sheet trước.

Sau đó retry storage upload độc lập.

### 64.14. Google Sheet image embedding failure

Nếu không thể chèn ảnh trực tiếp:

```text
Issue status sync = PARTIAL
evidence local = preserved
storage URL = preserved nếu upload thành công
retry queue = created
```

Không coi việc chỉ ghi link vào sheet là hoàn thành image sync.

### 64.15. Completion rule

Một issue có image evidence chỉ được xem là Google Sheet sync hoàn chỉnh khi:

```text
master row đã được ghi
Issue_no.xx đã được tạo
required screenshot đã được chèn trực tiếp vào Issue_no.xx
annotated screenshot đã được chèn nếu có annotation
storage metadata đã được ghi local
```

Nếu một trong các bước bắt buộc chưa hoàn thành:

```text
sheet sync status != COMPLETE
```

### 64.16. Configuration additions

Bổ sung:

```env
EVIDENCE_STORAGE_URL=
EVIDENCE_STORAGE_TYPE=google-drive
EVIDENCE_CREATE_RUN_FOLDER=true
SHEET_EMBED_IMAGES=true
SHEET_MASTER_THUMBNAIL=true
SHEET_IMAGE_MODE=over-grid
```

`SHEET_EMBED_IMAGES` mặc định phải là `true`.

Nếu người dùng yêu cầu không nhúng ảnh thì mới được chuyển thành `false`.

### 64.17. Security rule cho storage

Credential upload file phải mount read-only vào container.

Không ghi credential vào report.

Không ghi access token vào Google Sheet.

Không tạo public sharing cho ảnh nếu không cần.

Ưu tiên quyền truy cập theo chính storage và spreadsheet của người dùng.

### 64.18. Canonical evidence flow cuối cùng

```text
Playwright failure
-> screenshot
-> bounding box
-> annotated screenshot
-> local evidence
-> user-provided storage
-> Issue_no.xx visible images
-> List of bugs metadata
-> local HTML report
-> Ollama analysis
```

Storage link và Google Sheet image embedding là hai chức năng song song.

Không thay chức năng này bằng chức năng kia.

## 65. Shared Google Sheet Concurrency và Conflict Safety

### 65.1. Nguyên tắc

Google Sheet là tài nguyên dùng chung.

Hệ thống phải giả định tại mọi thời điểm có thể xảy ra:

```text
tester đang nhập dữ liệu
developer đang cập nhật trạng thái
automation đang append bug
automation khác đang sync
người dùng đang đổi tên sheet
người dùng đang sort hoặc filter
người dùng đang chèn row
người dùng đang xóa row
người dùng đang thay đổi validation
người dùng đang thay đổi format
người dùng đang sửa ảnh
người dùng đang di chuyển issue sheet
```

Không được giả định workbook đứng yên trong suốt test run.

### 65.2. Không khóa toàn bộ test run vì Sheet conflict

Conflict của Google Sheet không được mặc định làm dừng:

```text
API tests
UI tests
E2E tests
visual tests
evidence capture
local report
Ollama analysis
```

Khi Sheet conflict:

```text
test execution tiếp tục
local result tiếp tục được lưu
evidence tiếp tục được lưu
sheet sync operation bị conflict được cô lập
conflict được đưa vào retry hoặc manual review
```

Chỉ tạm dừng toàn bộ hệ thống nếu conflict ảnh hưởng tới dữ liệu bắt buộc để test có thể chạy.

Ví dụ:

```text
spreadsheet chỉ là bug output
-> không dừng test

spreadsheet chứa test credentials bắt buộc và dữ liệu bị thay đổi không xác định
-> dừng nhóm test phụ thuộc dữ liệu đó
```

### 65.3. Cell ownership rule

Automation không được ghi đè mọi cell trong một row.

Khi tạo bug mới, automation chỉ được điền các field thuộc quyền tạo ban đầu:

```text
No
Reporter
Created Date
Category
Function / Feature
Description
Expected
Classification
Priority
Status initial
```

Các field sau được xem là human-owned sau khi row tồn tại:

```text
Assignee
Response Date
Root Cause
Solution
Note
Status sau khi đã được người xử lý thay đổi
```

Automation không được overwrite các field human-owned trừ khi workflow có rule cụ thể cho phép.

### 65.4. Compare-before-write

Trước mỗi update vào row đã tồn tại:

```text
read current cell values
compare với snapshot gần nhất
calculate intended patch
write only cells không conflict
```

Không thực hiện:

```text
read row
modify object
write toàn bộ row
```

nếu chỉ cần cập nhật một cell.

### 65.5. Optimistic concurrency

Mọi operation chỉnh sửa dữ liệu đã tồn tại phải sử dụng optimistic concurrency ở mức ứng dụng.

Local sync state lưu:

```text
spreadsheet ID
sheet ID
issue ID
row index
last known values
last known hash
last sync timestamp
intended patch
```

Trước khi ghi:

```text
current hash == last known hash
-> cho phép update field automation-owned

current hash != last known hash
-> kiểm tra field-level conflict
```

Không dùng hash toàn row để tự động từ chối mọi thay đổi nếu người dùng chỉ chỉnh field không liên quan.

### 65.6. Field-level conflict

Ví dụ automation muốn cập nhật:

```text
Status = Chờ đối ứng
```

nhưng trong lúc đó người dùng đã đổi:

```text
Status = Đang đối ứng
```

Automation phải:

```text
không ghi đè
giữ giá trị người dùng
mark conflict resolved in favor of human
```

Ví dụ automation muốn thêm internal issue hyperlink nhưng người dùng chỉ đổi `Assignee`.

Automation có thể:

```text
giữ Assignee hiện tại
chỉ ghi hyperlink vào vị trí được phép
```

### 65.7. Human wins rule

Khi cùng một field bị automation và người dùng chỉnh khác nhau:

```text
human value wins
```

trừ khi đó là field immutable được hệ thống quản lý.

Immutable fields mặc định:

```text
No
Reporter
Created Date
Issue identity
Run ID trong metadata
```

Nếu immutable field bị sửa thủ công thì không tự ghi đè lại ngay.

Hệ thống phải mark:

```text
DATA_CONFLICT
```

và yêu cầu review.

### 65.8. Append-only bug creation

Tạo bug mới phải sử dụng append semantics.

Không tìm row trống rồi ghi nếu workbook có thể đang được nhiều người sử dụng.

Không dựa vào:

```text
lastRow + 1
```

từ một lần đọc cũ rồi ghi sau nhiều giây.

Trước thời điểm append phải xác định lại destination.

### 65.9. Issue number race condition

Hai automation có thể cùng nhìn thấy:

```text
max issue = 27
```

và cùng muốn tạo:

```text
Issue_no.28
```

Phải có issue allocation strategy.

Ưu tiên:

```text
central allocation lock
```

hoặc:

```text
atomic metadata allocation
```

Nếu không có atomic primitive thì dùng:

```text
temporary reservation
re-read
verify uniqueness
commit
```

Không tạo issue nếu tên sheet vừa được người khác tạo.

Nếu collision xảy ra:

```text
recalculate max
allocate số mới
```

Không overwrite sheet hiện có.

### 65.10. Sync idempotency

Mỗi confirmed bug phải có stable idempotency key.

Ví dụ:

```text
run ID
test case ID
failure fingerprint
```

Khi retry:

```text
same idempotency key
-> update hoặc complete issue hiện tại
-> không tạo row mới
-> không tạo Issue_no.xx mới
```

### 65.11. Partial transaction journal

Google Sheets và storage không có transaction chung.

Hệ thống phải có local transaction journal.

Một issue sync có các step:

```text
BUG_CREATED_LOCAL
STORAGE_ORIGINAL_UPLOADED
STORAGE_ANNOTATED_UPLOADED
MASTER_ROW_APPENDED
ISSUE_SHEET_CREATED
ORIGINAL_IMAGE_EMBEDDED
ANNOTATED_IMAGE_EMBEDDED
MASTER_LINK_CREATED
SYNC_COMPLETE
```

Mỗi step phải được persist.

Nếu process crash:

```text
resume từ step cuối thành công
```

Không chạy lại toàn bộ flow từ đầu.

### 65.12. Conflict state

Sync state bổ sung:

```text
PENDING
IN_PROGRESS
PARTIAL
CONFLICT
RETRYING
COMPLETE
FAILED_PERMANENT
```

`CONFLICT` không đồng nghĩa system failure.

### 65.13. Khi người khác ghi đè nội dung automation

Sau sync, hệ thống không liên tục ép Sheet quay lại giá trị cũ.

Nếu người dùng chỉnh:

```text
Description
Expected
Classification
Priority
Status
```

sau khi issue đã được tạo, thay đổi đó được xem là human edit.

Automation phải preserve thay đổi đó.

Nếu automation cần update cùng field trong lần sync sau:

```text
compare-before-write
human wins nếu conflict
```

### 65.14. Khi người khác xóa row bug

Nếu master row bị xóa nhưng issue sheet còn tồn tại:

```text
mark ORPHANED_ISSUE
không tự tạo lại row ngay
```

Nếu configuration cho phép repair:

```text
repair mode
```

mới được tạo lại row.

Mặc định:

```text
REPAIR_SHEET_DATA=false
```

### 65.15. Khi người khác xóa Issue_no.xx

Nếu master row còn nhưng issue sheet bị xóa:

```text
mark MISSING_ISSUE_SHEET
không tự tạo lại nếu chưa được phép
```

Local evidence vẫn phải tồn tại.

### 65.16. Khi người khác đổi tên Issue_no.xx

Nếu sheet ID vẫn giống nhưng sheet name thay đổi:

```text
follow sheet ID
update local mapping
preserve user rename
```

Không đổi tên lại tự động.

### 65.17. Khi người khác đổi header

Nếu header canonical bị đổi:

```text
re-discover header mapping
```

Nếu vẫn map được:

```text
continue
```

Nếu không map được field bắt buộc:

```text
pause sheet sync
test execution tiếp tục
mark SHEET_SCHEMA_CONFLICT
```

### 65.18. Khi người khác chèn hoặc xóa cột

Không dựa cố định vào column letter sau khi workbook đã được nhận diện.

Canonical field phải map theo header text và sheet metadata.

Column letter chỉ là default khi tạo workbook mới.

### 65.19. Khi người khác sort sheet

Không dùng row index làm identity duy nhất.

Bug identity phải dựa trên:

```text
issue number
stable issue key
sheet ID
machine metadata
```

Row index chỉ là vị trí hiện tại.

### 65.20. Khi người khác filter sheet

Filter không được ảnh hưởng append hoặc lookup logic.

Không dùng visible rows làm tập dữ liệu đầy đủ.

### 65.21. Khi người khác merge cell

Nếu merge ảnh hưởng vùng master data:

```text
detect merge
pause affected sheet sync
mark SHEET_LAYOUT_CONFLICT
```

Không unmerge tự động.

### 65.22. Khi workbook đang được chỉnh sửa

Không coi việc người dùng đang mở workbook là lỗi.

Không stop run chỉ vì workbook đang active.

Google Sheet sync phải được thiết kế cho môi trường collaborative.

### 65.23. Retry policy

Retry các lỗi tạm thời:

```text
429
5xx
network timeout
temporary permission propagation
temporary image insertion failure
temporary rate limit
```

Không retry vô hạn.

Cấu hình:

```env
SHEET_MAX_RETRIES=5
SHEET_RETRY_BASE_MS=1000
SHEET_RETRY_MAX_MS=30000
```

Phải có exponential backoff và jitter.

### 65.24. Permanent failure

Các trường hợp không retry tự động liên tục:

```text
permission denied
spreadsheet deleted
required master sheet deleted
unsupported schema
credential revoked
storage destination removed
```

Mark:

```text
FAILED_PERMANENT
```

Test engine vẫn hoàn tất report local.

### 65.25. Conflict report

Local report phải có phần:

```text
Sheet Sync
```

Bao gồm:

```text
successful syncs
partial syncs
conflicts
retrying
permanent failures
orphaned issues
missing issue sheets
schema conflicts
```

Không trộn các lỗi sync này với product test failures.

## 66. Test Execution phải là Runtime Test thật

### 66.1. Không được chỉ làm static analysis

Framework không được xem các bước sau là đủ để kết luận sản phẩm PASS:

```text
đọc source
đọc API schema
đọc HTML
đọc requirement
để Ollama suy luận
```

Đây chỉ là nguồn tạo test và hỗ trợ phân tích.

Kết luận sản phẩm phải đến từ runtime execution nếu test type yêu cầu runtime.

### 66.2. Các lớp kiểm thử

Framework có bốn lớp:

```text
STATIC
CONTRACT
RUNTIME
OBSERVATIONAL
```

`STATIC`:

```text
schema validation
source lint
typecheck
config validation
test code validation
```

`CONTRACT`:

```text
OpenAPI contract
JSON schema
response types
required fields
API status expectations
```

`RUNTIME`:

```text
gửi HTTP request thật
mở browser thật
click thật
input thật
upload file thật
submit form thật
đọc response thật
đọc DOM thật
đọc network thật
đọc console thật
```

`OBSERVATIONAL`:

```text
screenshot
visual comparison
Ollama analysis
root cause suggestion
```

Không được thay `RUNTIME` bằng `OBSERVATIONAL`.

### 66.3. API runtime

API test phải gửi request thật tới:

```text
API_BASE_URL
```

Phải capture:

```text
method
URL
request
response
status
headers
duration
network error
```

Không mock API trừ khi test case được đánh dấu rõ:

```text
testMode = mock
```

Mock test không được tính thay cho live integration test.

### 66.4. UI runtime

UI test phải mở browser bằng Playwright và thao tác thật.

Ví dụ:

```text
navigate
fill
select
click
upload
download
scroll
resize
reload
back
forward
open new tab
close dialog
submit
```

Test phải xác nhận DOM và UI sau hành động.

### 66.5. E2E runtime

E2E phải kiểm tra toàn luồng thật.

Ví dụ:

```text
UI login
-> API auth
-> create project
-> backend persist
-> UI list reflects new data
-> edit project
-> backend update
-> UI reflects update
-> delete project
-> backend delete
-> UI no longer displays record
```

Không coi việc UI hiển thị toast thành công là đủ nếu có thể verify backend state.

### 66.6. Runtime evidence

Mỗi runtime test phải lưu đủ dữ liệu để chứng minh test thực sự đã chạy.

Ví dụ:

```text
request timestamp
response timestamp
browser trace
navigation URL
DOM assertion
network event
runtime screenshot
```

### 66.7. Live mode và dry mode

Cấu hình:

```env
QA_EXECUTION_MODE=live
```

Giá trị:

```text
live
dry
```

`live`:

```text
chạy request và browser action thật
```

`dry`:

```text
validate test definitions
validate selectors
validate schema
không kết luận product PASS
```

Report dry mode phải ghi rõ:

```text
NOT_EXECUTED
```

Không hiển thị PASS cho test chưa chạy thật.

### 66.8. Safe runtime

Runtime test phải phân loại:

```text
READ_ONLY
MUTATING
DESTRUCTIVE
```

`READ_ONLY`:

```text
GET
view
search
filter
sort
navigate
```

`MUTATING`:

```text
create
edit
upload
change settings
```

`DESTRUCTIVE`:

```text
delete
bulk delete
irreversible state change
```

Production mặc định:

```text
READ_ONLY
```

Test environment có thể bật:

```text
READ_ONLY
MUTATING
DESTRUCTIVE
```

qua config rõ ràng.

## 67. Runtime Test Data Isolation

### 67.1. Test data phải phân biệt với data thật

Mọi record do automation tạo nên có unique marker.

Ví dụ:

```text
QA_RUN_20260819_100500
```

Tên record:

```text
QA_RUN_20260819_100500_Project_001
```

Không dùng tên dễ trùng với dữ liệu người dùng thật.

### 67.2. Cleanup

Record test được tạo phải có cleanup strategy.

Flow:

```text
create
test
verify
cleanup
verify cleanup
```

Nếu cleanup thất bại:

```text
mark TEST_DATA_LEAK
```

Không xóa dữ liệu không mang marker của automation.

### 67.3. Cleanup không làm mất evidence

Dù dữ liệu test đã cleanup:

```text
request
response
screenshot
trace
test ID
entity ID
```

vẫn được giữ trong report.

### 67.4. Không cleanup khi cần debug

Cấu hình:

```env
KEEP_FAILED_TEST_DATA=true
```

Nếu test fail và giá trị này là true:

```text
giữ test data phục vụ debug
```

Nếu false:

```text
cleanup theo policy
```

## 68. Edge Case Taxonomy bắt buộc

Framework phải có edge-case registry.

Không chỉ sinh:

```text
happy path
invalid input
```

Mỗi feature phải được đánh giá theo các nhóm sau.

### 68.1. Null và Empty

```text
missing field
null
empty string
whitespace only
zero
false
empty array
empty object
```

### 68.2. Boundary

```text
minimum
minimum minus one
minimum plus one
maximum
maximum minus one
maximum plus one
very large value
negative value
decimal
```

### 68.3. String

```text
very short
very long
leading spaces
trailing spaces
multiple internal spaces
line breaks
tabs
Unicode
Vietnamese
English
Japanese
emoji input nếu feature cho phép
HTML-like text
script-like text
SQL-like text
special symbols
quotes
slashes
backslashes
ampersand
angle brackets
```

Rule `không emoji` chỉ áp dụng source code và tài liệu output của framework.

Edge-case testing vẫn phải có thể kiểm tra ứng dụng xử lý emoji input nếu field cho phép người dùng nhập ký tự Unicode.

### 68.4. Date và Time

```text
current runtime date
past date
future date
leap day
end of month
start of month
end of year
start of year
DST timezone nếu environment có
UTC offset
midnight boundary
23:59
00:00
invalid date
start date after end date
same start and end date
```

### 68.5. Authentication

```text
valid token
missing token
invalid token
expired token
revoked token
wrong audience
wrong issuer nếu áp dụng
tampered token
logged out session
multiple sessions
session refresh
refresh token expired
```

### 68.6. Authorization

```text
admin allowed
user allowed
admin denied case
user denied case
access another user's resource
direct URL access
hidden button but API still callable
role changed while session active
permission removed during session
```

### 68.7. CRUD

```text
create
read
update
delete
duplicate create
double submit
update deleted record
delete deleted record
read deleted record
concurrent update
stale update
partial update
empty update
```

### 68.8. Pagination

```text
first page
middle page
last page
page beyond range
page zero
negative page
page size one
maximum page size
page size above maximum
empty result
single result
sort plus pagination
filter plus pagination
```

### 68.9. Search

```text
exact match
partial match
case sensitivity
accented Vietnamese
Japanese
leading spaces
trailing spaces
special characters
no result
many results
very long query
rapid repeated search
```

### 68.10. Filter

```text
single filter
multiple filters
conflicting filters
clear filter
empty filter
filter after pagination
filter after sort
filter plus search
persisted filter after reload
```

### 68.11. Sort

```text
ascending
descending
default order
numeric
text
date
null values
duplicate values
locale-specific text
sort after filter
sort after pagination
```

### 68.12. Form

```text
required field
optional field
disabled field
readonly field
hidden field
tab navigation
enter submit
double click submit
submit while loading
reset
cancel
browser refresh before save
browser back before save
unsaved changes warning
```

### 68.13. Textarea

```text
empty
one character
maximum length
maximum plus one
multiline
long unbroken string
paste large content
Unicode
HTML-like content
line ending preservation
```

### 68.14. File Upload

```text
valid file
invalid extension
wrong MIME
zero byte
maximum size
maximum plus one
large image dimensions
corrupted file
duplicate filename
Unicode filename
long filename
multiple files
cancel upload
network loss during upload
replace uploaded file
remove uploaded file
```

### 68.15. Image

```text
valid image
broken URL
404 image
slow image
wrong aspect ratio
very tall image
very wide image
transparent image
large resolution
small resolution
missing alt text nếu applicable
open preview
close preview
download
```

### 68.16. Localization

Bắt buộc hỗ trợ kiểm tra:

```text
VI
EN
JP
```

Các rule:

```text
missing translation
fallback key visible
text overflow
unexpected wrap
alignment shift
different separator
date format
number format
button width
table width
modal width
long English text
short Japanese text
font rendering
mixed-language content
```

### 68.17. Responsive UI

```text
desktop
tablet nếu applicable
mobile
minimum supported width
maximum supported width
orientation change nếu applicable
browser zoom scenario nếu applicable
horizontal overflow
sticky elements
fixed elements
footer gap
modal overflow
table overflow
```

### 68.18. Navigation

```text
direct URL
browser back
browser forward
refresh
deep link
invalid route
unauthorized route
open in new tab
multiple tabs
session expiry during navigation
```

### 68.19. Modal và Popup

```text
open
close button
outside click
escape key
submit
cancel
double open
nested modal nếu applicable
background scroll lock
focus trap
overflow content
mobile viewport
```

### 68.20. Network

```text
normal
slow response
timeout
connection reset
500
502
503
504
401
403
404
409
422
429
offline during action
retry after failure
duplicate response
out-of-order response
```

### 68.21. Concurrency

```text
two users edit same record
two users delete same record
user edits while automation reads
double submit
rapid repeated click
stale version save
optimistic UI rollback
race between list refresh and update
```

### 68.22. Browser State

```text
fresh session
existing session
expired session
cookies disabled if applicable
local storage missing
local storage corrupted
cached data
hard reload
multiple tabs
```

### 68.23. Error Message

```text
correct language
correct placement
correct field association
not duplicated
clears after correction
persists when still invalid
does not expose stack trace
does not expose secret
```

### 68.24. Security-oriented negative testing

Chỉ trong phạm vi được phép:

```text
input encoding
HTML injection-like strings
script injection-like strings
SQL injection-like strings
path traversal-like strings
IDOR authorization checks
mass assignment checks
unexpected field checks
sensitive response field checks
```

Không thực hiện destructive exploitation ngoài môi trường và phạm vi được cấp quyền.

### 68.25. State Transition

Các feature có status phải test:

```text
valid transition
invalid transition
same-state transition
backward transition
transition without permission
transition after stale refresh
transition by two users
```

### 68.26. Data Consistency

```text
UI vs API
API vs database-visible response nếu accessible
list vs detail
create response vs subsequent GET
update response vs subsequent GET
delete response vs subsequent GET
count vs actual records
```

## 69. Project-specific Edge Case Registry

Framework phải cho phép tạo registry theo project.

Ví dụ:

```text
projects
products
blog posts
authentication
admin
tickets
conversation
intake form
```

Mỗi module có file rule riêng.

Ví dụ:

```text
edge-cases/projects.yaml
edge-cases/products.yaml
edge-cases/blog-posts.yaml
edge-cases/authentication.yaml
```

Không nhét tất cả project rule vào một test file.

### 69.1. Projects

Bắt buộc xem xét:

```text
project name
description
tagline
start date
end date
image
SEO
language
create
edit
delete
save button
layout
validation
```

### 69.2. Products

Bắt buộc xem xét:

```text
product name
description
image
SEO
language
create
edit
delete
save button
layout
validation
```

### 69.3. Blog Posts

Bắt buộc xem xét:

```text
title
content
SEO
image
language
create
edit
publish state
delete
save button
layout
validation
```

### 69.4. Intake Form

Bắt buộc xem xét:

```text
required fields
confirmation behavior
Yes No confirmation
language
bot integration
submission
duplicate submission
error handling
long text
```

### 69.5. Tickets và Conversation

Bắt buộc xem xét:

```text
long conversation
large history
pagination
scroll
message rendering
role access
empty conversation
deleted conversation
concurrent new message
stale conversation
```

## 70. Test Case Generation Strategy

### 70.1. Không sinh test ngẫu nhiên không kiểm soát

Ollama không được tự nghĩ test case rồi chạy ngay.

Pipeline:

```text
requirements
routes
API schema
UI structure
existing tests
edge-case registry
business rules
-> candidate test cases
-> schema validation
-> safety validation
-> duplication check
-> deterministic expected result check
-> execution eligibility
-> runtime execution
```

### 70.2. Expected result bắt buộc

Test case không có expected result rõ ràng:

```text
không chạy ở chế độ product validation
```

Status:

```text
BLOCKED
```

hoặc:

```text
REQUIRES_REVIEW
```

Không để Ollama tự tạo expected result trái requirement rồi báo bug.

### 70.3. Requirement confidence

Test case generated từ requirement không rõ phải có:

```text
requirement confidence
```

Nếu confidence dưới threshold:

```text
manual review required
```

### 70.4. Existing behavior không tự động trở thành expected behavior

Không được lấy:

```text
app hiện đang làm gì
```

rồi coi đó là:

```text
expected
```

Expected phải đến từ:

```text
requirement
accepted baseline
approved test case
explicit business rule
approved UI baseline
```

## 71. False Positive Prevention

### 71.1. Product bug gate

Một failure chỉ được tạo `Issue_no.xx` khi vượt qua bug gate.

Bug gate kiểm tra:

```text
test code valid
environment healthy
test data valid
requirement available
expected result deterministic
failure reproducible hoặc thuộc nhóm deterministic single-run
not known flaky
not sheet sync error
not storage error
not Ollama error
```

### 71.2. Reproduction rule

Các failure không deterministic có thể retry.

Ví dụ UI timing failure:

```text
retry
```

Nếu retry pass:

```text
FLAKY
```

Không tạo product bug mặc định.

### 71.3. Deterministic single-run failures

Không bắt buộc retry nếu failure rõ ràng như:

```text
expected 403 actual 200
expected field absent nhưng field sensitive xuất hiện
expected save disabled nhưng action thành công
expected max length validation nhưng backend accepted invalid value
```

Policy vẫn có thể yêu cầu confirmation run.

## 72. False Negative Prevention

Không được coi test PASS chỉ vì action không throw exception.

PASS phải cần assertion.

Ví dụ:

```text
click Save
```

không đủ.

Phải verify:

```text
request thành công
UI state đúng
data persist đúng
subsequent read đúng
```

Nếu không có assertion phù hợp:

```text
INCOMPLETE_TEST
```

Không tính PASS.

## 73. Runtime Discovery

Framework có thể discovery:

```text
routes
forms
inputs
buttons
API endpoints từ OpenAPI nếu có
network requests
available locales
roles từ config
```

Discovery không tự động đồng nghĩa test coverage đầy đủ.

Discovery output dùng để:

```text
so sánh với test inventory
phát hiện feature chưa có test
đề xuất test mới
```

### 73.1. Coverage gap

Nếu discovery thấy:

```text
feature tồn tại
không có test
```

report:

```text
COVERAGE_GAP
```

Không gọi là product bug.

## 74. Test Coverage Model

Coverage phải theo nhiều chiều:

```text
requirement coverage
route coverage
API endpoint coverage
role coverage
locale coverage
browser coverage
viewport coverage
positive negative coverage
edge-case coverage
state transition coverage
```

Report phải chỉ ra:

```text
tested
not tested
blocked
not applicable
```

Không chỉ báo một phần trăm tổng chung.

## 75. Stop Policy

### 75.1. Không stop toàn bộ vì lỗi không liên quan

Các lỗi sau không dừng toàn bộ test mặc định:

```text
Google Sheets conflict
storage upload failure
Ollama unavailable
single test broken
single product bug
single screenshot failure
single report artifact failure
```

### 75.2. Stop test group

Chỉ stop nhóm phụ thuộc khi:

```text
login dependency hoàn toàn hỏng
required test data unavailable
target service của group unavailable
critical environment precondition missing
```

### 75.3. Stop toàn bộ run

Chỉ stop toàn bộ khi:

```text
invalid global config
cannot create run workspace
target environment identity mismatch
unsafe production destructive mode detected
credential exposure risk detected
orchestrator state corrupted
```

### 75.4. Fail-safe production check

Nếu environment được cấu hình là production nhưng destructive mode đang bật:

```text
stop toàn bộ trước khi test destructive chạy
```

Không cho AI override.

## 76. Recovery Policy

Nếu QA process bị kill hoặc Docker restart:

```text
load run journal
recover pending evidence
recover pending sheet sync
recover pending storage upload
do not rerun completed destructive test automatically
```

Destructive tests chỉ rerun khi policy cho phép.

## 77. Sheet Snapshot và Audit

Trước khi automation thay đổi workbook:

```text
capture relevant header
capture target row state
capture target sheet list
capture issue mapping
```

Không cần copy toàn workbook mỗi lần.

Mọi sheet write phải có audit record local:

```text
timestamp
spreadsheet ID
sheet ID
issue ID
field
old value
new value
operation ID
result
```

Sensitive values phải được redact.

## 78. End-to-End Definition of Real Pass

Một feature chỉ được xem PASS khi các assertion được định nghĩa cho feature đó đạt.

Ví dụ create project:

```text
form accepts valid data
submit request sent
API returns expected status
response schema valid
new entity ID returned
subsequent GET finds entity
UI list displays entity
detail displays correct values
image loads nếu applicable
locale content correct nếu applicable
cleanup succeeds hoặc cleanup policy handled
```

Không phải mọi feature đều cần tất cả bước trên.

Nhưng chỉ click được hoặc chỉ nhận 200 không đủ nếu requirement rộng hơn.

## 79. Required Test Modes

Framework phải hỗ trợ:

```text
smoke
regression
api
ui
e2e
visual
edge
role
locale
destructive
read-only
```

Ví dụ:

```bash
npm run qa:smoke
npm run qa:regression
npm run qa:edge
npm run qa:locale
npm run qa:role
```

`qa:all` chạy tập được cấu hình cho environment hiện tại.

## 80. Final Reliability Rules

1. Sheet conflict không được biến thành product bug.
2. Sheet conflict không được mặc định dừng test run.
3. Human edit thắng automation edit khi cùng field conflict.
4. Automation chỉ patch field cần thay đổi.
5. Không overwrite toàn row để sửa một field.
6. Không dựa vào row index làm bug identity.
7. Issue number phải chống race condition.
8. Retry phải idempotent.
9. Partial sync phải resume được.
10. Crash không được tạo duplicate issue.
11. Runtime test phải thật sự gửi request hoặc thao tác browser.
12. Dry run không được báo product PASS.
13. Static analysis không thay thế runtime test.
14. Ollama không thay thế assertion.
15. Test case thiếu expected result không được tự chạy như product validation.
16. Existing behavior không tự trở thành expected behavior.
17. Mỗi test PASS phải có assertion.
18. Test không assertion là incomplete test.
19. Edge cases phải được quản lý theo registry.
20. Project-specific edge cases phải tách theo module.
21. Test data automation phải có marker.
22. Không xóa data không thuộc automation.
23. Cleanup failure phải được báo riêng.
24. Concurrency phải được test ở cả application và sheet sync.
25. Network failures phải có test cases.
26. Locale VI EN JP phải có coverage riêng nếu project hỗ trợ.
27. Desktop và mobile phải có coverage riêng nếu project hỗ trợ.
28. Upload phải test file type, size, corruption và network interruption.
29. Date phải test runtime date và midnight boundary.
30. Authorization phải test UI và API.
31. Visual PASS không được chỉ dựa vào Ollama.
32. Screenshot không chứng minh chức năng backend đã persist.
33. HTTP 200 không tự động chứng minh business operation đúng.
34. Toast success không tự động chứng minh operation đúng.
35. Report phải phân biệt product, automation, environment, sync và coverage gap.
36. Mọi side effect phải có audit trail.
37. Production destructive testing phải fail-safe.
38. Recovery phải tránh rerun destructive action ngoài ý muốn.
39. Google Sheet và storage phải là optional output dependencies.
40. Core deterministic test engine phải hoạt động độc lập với Ollama và Sheet.

## 81. Test Case Duplicate Detection

### 81.1. Mục tiêu

Framework phải phát hiện test case trùng trước khi:

```text
lưu test case mới
merge test case AI-generated
thêm test case thủ công
import Postman collection
import Playwright tests
build regression suite
run test inventory
```

Không được chỉ kiểm tra trùng `Test Case ID`.

Hai test có ID khác nhau vẫn có thể là cùng một test logic.

### 81.2. Các loại trùng test case

Phải phân biệt:

```text
EXACT_DUPLICATE
SEMANTIC_DUPLICATE
PARTIAL_OVERLAP
SAME_FLOW_DIFFERENT_ASSERTION
SAME_ASSERTION_DIFFERENT_DATA
SAME_PURPOSE_DIFFERENT_LAYER
NOT_DUPLICATE
```

### 81.3. Exact Duplicate

Hai test là `EXACT_DUPLICATE` khi các thành phần chính giống nhau sau canonicalization:

```text
module
test type
target
preconditions
input
steps
expected
assertions
role
locale
environment scope
```

Ví dụ:

```text
TC-AUTH-001
Login với email hợp lệ và password hợp lệ
Expected 200 và token tồn tại
```

và:

```text
TC-AUTH-018
Login bằng valid account
Expected status 200 và access token tồn tại
```

Nếu canonical representation giống nhau thì không được giữ cả hai như hai test độc lập.

### 81.4. Semantic Duplicate

Hai test có wording khác nhưng mục tiêu, dữ liệu và expected behavior tương đương.

Ví dụ:

```text
Kiểm tra textarea không cho nhập quá 500 ký tự
```

và:

```text
Validate maximum length of description field is 500 characters
```

Nếu cả hai cùng:

```text
field = description
boundary = 500
action = enter 501 characters
expected = reject or validation error
```

thì là semantic duplicate.

### 81.5. Partial Overlap

Hai test chỉ trùng một phần.

Ví dụ:

```text
TC-001
Create project với toàn bộ dữ liệu hợp lệ
```

và:

```text
TC-002
Create project với dữ liệu hợp lệ và kiểm tra ảnh
```

Không tự xóa một test.

Mark:

```text
PARTIAL_OVERLAP
```

Để review xem có nên:

```text
merge assertions
giữ riêng
chuyển một test thành subcase
```

### 81.6. Same Flow Different Assertion

Hai test chạy cùng flow nhưng kiểm tra hai thứ khác nhau.

Ví dụ:

```text
Login
-> kiểm tra redirect
```

và:

```text
Login
-> kiểm tra token không nằm trong DOM
```

Không phải duplicate.

Mark:

```text
SAME_FLOW_DIFFERENT_ASSERTION
```

Framework có thể tối ưu để chạy chung setup nhưng vẫn giữ hai assertions riêng.

### 81.7. Same Assertion Different Data

Hai test có cùng assertion nhưng dữ liệu thuộc các partition khác nhau.

Ví dụ:

```text
password length = 7
expected invalid
```

và:

```text
password length = 129
expected invalid
```

Không được coi là duplicate nếu hai input đại diện cho hai boundary khác nhau.

Mark:

```text
SAME_ASSERTION_DIFFERENT_DATA
```

### 81.8. Same Purpose Different Layer

Ví dụ:

```text
API test login invalid password
```

và:

```text
UI test login invalid password
```

Không được merge chỉ vì business scenario giống nhau.

Một test xác minh API layer.

Một test xác minh UI behavior.

Mark:

```text
SAME_PURPOSE_DIFFERENT_LAYER
```

### 81.9. Canonical Test Representation

Mỗi test case phải được normalize trước khi so sánh.

Canonical representation:

```json
{
  "module": "",
  "feature": "",
  "type": "",
  "target": "",
  "method": "",
  "route": "",
  "role": "",
  "locale": "",
  "preconditions": [],
  "inputPartitions": [],
  "steps": [],
  "assertions": [],
  "expectedRules": [],
  "tags": []
}
```

Không dùng title làm nguồn chính để xác định duplicate.

### 81.10. Text Normalization

Trước khi so sánh semantic:

```text
trim whitespace
normalize line breaks
normalize case khi phù hợp
normalize synonym mapping
normalize field aliases
normalize endpoint variables
normalize equivalent status wording
normalize locale aliases
```

Ví dụ:

```text
valid account
valid user
tài khoản hợp lệ
```

có thể map về cùng semantic token nếu context xác nhận tương đương.

Không normalize quá mạnh làm mất business distinction.

### 81.11. Input Partition Awareness

Duplicate detector phải hiểu partition.

Ví dụ:

```text
min
min - 1
min + 1
max
max - 1
max + 1
null
empty
whitespace
```

Các test này không được merge chỉ vì cùng field và cùng assertion type.

### 81.12. Boundary Duplicate Rule

Ví dụ:

```text
TC-001
Enter 501 characters when max is 500
```

và:

```text
TC-002
Enter max + 1 characters
```

Nếu max đã xác định là 500 thì đây là duplicate.

Giữ một canonical test.

### 81.13. Data-equivalent Duplicate

Ví dụ:

```text
email = abc
```

và:

```text
email = invalid-email
```

Nếu cả hai chỉ đại diện cùng một partition:

```text
invalid email format
```

và không kiểm tra rule khác nhau thì có thể là duplicate.

Framework phải ưu tiên partition label hơn literal test data.

### 81.14. API Duplicate Fingerprint

API test fingerprint phải xem xét:

```text
HTTP method
normalized endpoint
auth context
request partition
query parameters
path parameters
body schema partition
expected status
response assertions
business rule
```

Ví dụ:

```text
POST /projects
body valid
expected 201
```

và một test khác cùng cấu trúc chỉ đổi tên record random không được xem là hai test khác nhau.

### 81.15. UI Duplicate Fingerprint

UI test fingerprint phải xem xét:

```text
page
feature
starting state
role
locale
viewport class
action sequence
target element
input partition
expected UI state
assertions
```

Không dùng locator string làm identity chính.

Hai locator khác nhau có thể trỏ cùng element.

### 81.16. E2E Duplicate Fingerprint

E2E fingerprint:

```text
business flow
starting state
entities involved
role
main transitions
assertions
cleanup behavior
```

### 81.17. Visual Duplicate Fingerprint

Visual test fingerprint:

```text
page
component
viewport
locale
theme nếu có
state
baseline scope
mask configuration
threshold
```

Không tạo nhiều baseline test cho cùng state nếu không có lý do.

### 81.18. Duplicate Across Manual và AI Tests

Khi Ollama sinh candidate test:

```text
AI candidate
-> canonicalize
-> compare manual tests
-> compare generated tests
-> compare imported tests
-> classify duplicate
```

Manual test không mặc định thắng chỉ vì được viết tay.

Nếu AI test bổ sung assertion hoặc partition mới thì phải giữ.

### 81.19. Duplicate Across Postman và Native API Tests

Nếu một API test tồn tại trong Postman Collection và một test tương đương tồn tại trong native TypeScript runner:

```text
mark SAME_PURPOSE_DIFFERENT_IMPLEMENTATION
```

Không tự chạy cả hai trong cùng regression profile nếu chỉ tạo duplicate coverage.

Config quyết định source of truth:

```env
API_TEST_PRIMARY_RUNNER=postman
```

Giá trị có thể là:

```text
postman
native
both
```

Nếu `both` thì report phải hiển thị duplicated execution coverage.

### 81.20. Duplicate Across Playwright Files

Test discovery phải quét:

```text
test title
metadata
tags
page object action
assertions
test case ID
```

Nếu cùng `test case ID` xuất hiện nhiều file:

```text
DUPLICATE_TEST_ID
```

Build regression suite phải fail validation trước runtime nếu ID collision chưa được giải quyết.

### 81.21. Test Case ID Uniqueness

Test Case ID phải unique toàn project.

Không chỉ unique trong một module.

Ví dụ không được có:

```text
ui/auth/login.spec.ts -> UI-AUTH-001
ui/auth/session.spec.ts -> UI-AUTH-001
```

### 81.22. Stable Test Identity

Mỗi test có:

```text
testCaseId
testFingerprint
testVersion
```

`testCaseId` là human-readable identity.

`testFingerprint` là machine identity của test logic.

`testVersion` tăng khi logic test thay đổi đáng kể.

### 81.23. Fingerprint Change Rule

Các thay đổi sau có thể làm fingerprint thay đổi:

```text
expected result
assertion
input partition
target endpoint
business flow
role
locale requirement
state transition
```

Các thay đổi sau không nên làm fingerprint thay đổi:

```text
title wording
description wording
test data random suffix
file path
formatting
ordering của metadata không có nghĩa
```

### 81.24. Duplicate Decision Levels

Duplicate engine sử dụng:

```text
Level 1
exact structural match

Level 2
canonical fingerprint match

Level 3
semantic similarity

Level 4
Ollama review suggestion
```

Level 1 và Level 2 có thể deterministic.

Level 3 tạo candidate duplicate.

Level 4 chỉ hỗ trợ review.

Ollama không được tự xóa test.

### 81.25. Similarity Threshold

Config:

```env
TEST_DUPLICATE_SEMANTIC_THRESHOLD=0.92
```

Similarity trên threshold:

```text
mark DUPLICATE_CANDIDATE
```

Không tự động merge chỉ dựa vào vector similarity.

### 81.26. Duplicate Resolution

Các action hợp lệ:

```text
KEEP_CANONICAL
MERGE_ASSERTIONS
MERGE_DATA_PARTITIONS
KEEP_BOTH
DEPRECATE_DUPLICATE
MANUAL_REVIEW
```

Không hard delete test mặc định.

### 81.27. Canonical Test Selection

Nếu xác định exact duplicate:

Ưu tiên canonical test theo thứ tự:

```text
approved test
manual reviewed test
test linked requirement
test có evidence history
test có stable ID lâu hơn
AI-generated unreviewed test
```

Không chỉ chọn file xuất hiện trước.

### 81.28. Merge Assertions

Ví dụ:

Test A:

```text
expected status 200
```

Test B:

```text
expected access_token tồn tại
```

Cùng input và flow.

Có thể merge thành:

```text
expected status 200
expected access_token tồn tại
```

Chỉ merge nếu hai assertion cùng thuộc một expected behavior hợp lệ.

### 81.29. Merge Data Partitions

Nếu nhiều test chỉ khác test data literal nhưng cùng partition:

```text
merge thành data-driven test
```

Ví dụ:

```text
invalid email A
invalid email B
invalid email C
```

Nếu cùng mục tiêu thì:

```text
one test definition
multiple dataset rows
```

### 81.30. Không merge các edge case quan trọng

Không merge nếu làm mất khả năng nhìn riêng:

```text
min - 1
max + 1
null
empty
authorization role
locale
viewport
state transition
concurrency
```

### 81.31. Duplicate Test Report

Report phải có:

```text
Total test definitions
Unique tests
Exact duplicates
Semantic duplicate candidates
Partial overlaps
Duplicate IDs
Merged tests
Deprecated duplicates
Manual review required
```

### 81.32. Duplicate Coverage không phải Coverage tăng

Hai test duplicate không được tính hai lần vào coverage.

Coverage engine phải sử dụng canonical test identity.

Ví dụ:

```text
3 test files
1 canonical behavior
```

coverage count:

```text
1
```

không phải:

```text
3
```

### 81.33. Duplicate Runtime Execution

Nếu duplicate chưa được giải quyết trước runtime:

```text
exact duplicate
-> skip duplicate execution theo config

semantic candidate
-> có thể chạy nhưng mark duplicate candidate

duplicate ID
-> validation error
```

Config:

```env
SKIP_EXACT_DUPLICATE_TESTS=true
```

### 81.34. Duplicate Test và Flaky Test

Không dùng duplicate test để xác nhận flaky.

Nếu hai test logic giống nhau nhưng chạy ở hai file khác nhau cho kết quả khác:

```text
không gọi một test PASS và một test FAIL độc lập
```

Phải điều tra:

```text
environment
test ordering
shared state
data collision
timing
```

### 81.35. Duplicate Test và Concurrency

Hai test giống nhau chạy song song có thể tạo:

```text
duplicate data
race condition
false failure
```

Scheduler phải biết canonical test identity và resource locks.

### 81.36. Duplicate Test Data Collision

Ngay cả test không duplicate vẫn có thể tạo cùng data.

Test data generator phải đảm bảo:

```text
unique run marker
unique entity marker
parallel-safe IDs
```

### 81.37. Import Deduplication

Khi import test case từ:

```text
Google Sheet
Excel
Postman
JSON
YAML
existing TypeScript tests
Ollama generated output
```

pipeline:

```text
parse
normalize
validate
fingerprint
deduplicate
link requirement
store
```

### 81.38. Google Sheet Test Inventory Duplicate

Nếu sau này test case được lưu trong Google Sheet:

Không dùng row number làm test identity.

Nếu hai row có cùng Test Case ID:

```text
DUPLICATE_TEST_ID
```

Nếu ID khác nhưng fingerprint giống:

```text
EXACT_DUPLICATE
```

Không tự xóa row của người dùng.

### 81.39. Requirement Duplicate Awareness

Hai test không duplicate nếu cùng requirement nhưng kiểm tra rule khác nhau.

Ví dụ một requirement:

```text
User can login securely
```

có thể sinh:

```text
valid login
invalid password
expired token
role access
session expiry
```

Không merge chỉ vì cùng requirement ID.

### 81.40. Test Scenario Duplicate Awareness

Scenario và test case là hai cấp khác nhau.

Hai scenario giống nhau có thể chứa test cases khác nhau.

Duplicate detector phải chạy riêng cho:

```text
scenario
test case
dataset
```

### 81.41. Dataset Duplicate Detection

Dataset phải phát hiện duplicate row.

Canonical dataset key có thể dựa trên:

```text
partition
input values
role
locale
expected class
```

Không chạy cùng dataset row nhiều lần nếu không phải intentional repetition.

### 81.42. Intentional Repetition

Một số test phải chạy lặp lại có chủ đích:

```text
flaky detection
load test
race condition
stability test
retry verification
```

Các test này phải có:

```text
intentionalRepeat = true
```

Duplicate detector không loại bỏ chúng.

### 81.43. Duplicate Exception Metadata

Nếu tester muốn giữ hai test gần giống nhau:

```json
{
  "duplicatePolicy": "KEEP_BOTH",
  "duplicateReason": "Different regulatory assertion"
}
```

`duplicateReason` bắt buộc nếu override duplicate warning.

### 81.44. Pre-run Duplicate Gate

Trước runtime:

```text
load all enabled tests
-> validate IDs
-> canonicalize
-> build fingerprints
-> detect exact duplicates
-> detect semantic candidates
-> detect dataset duplicates
-> apply approved resolutions
-> build execution plan
```

### 81.45. Pre-generation Duplicate Gate

Trước khi yêu cầu Ollama sinh test mới:

```text
send existing canonical coverage summary
```

Không cần gửi toàn bộ source test nếu không cần.

Prompt phải yêu cầu:

```text
generate only missing coverage
do not repeat existing cases
```

Sau khi AI trả kết quả vẫn phải chạy duplicate engine.

### 81.46. Post-generation Duplicate Gate

AI output:

```text
schema validation
-> safety validation
-> expected result validation
-> duplicate detection
-> coverage value calculation
-> review status
```

Test duplicate không được tự động thêm vào regression suite.

### 81.47. Duplicate Detection Failure

Nếu duplicate engine lỗi:

```text
do not delete any test
do not merge any test
do not change canonical status
```

Mark:

```text
DEDUP_ENGINE_ERROR
```

Test execution policy quyết định có tiếp tục hay không.

Mặc định:

```text
exact ID validation vẫn bắt buộc
semantic dedup failure không stop runtime
```

### 81.48. Audit

Mọi dedup decision phải lưu:

```text
timestamp
candidate test IDs
fingerprints
classification
similarity
resolution
resolved by
reason
```

### 81.49. Final Duplicate Test Rules

1. Test Case ID phải unique toàn project.
2. ID khác nhau không có nghĩa test khác nhau.
3. Title khác nhau không có nghĩa test khác nhau.
4. Test data literal khác nhau không luôn có nghĩa test khác nhau.
5. Boundary partition khác nhau phải được giữ.
6. Role khác nhau có thể là test khác nhau.
7. Locale khác nhau có thể là test khác nhau.
8. Viewport khác nhau có thể là test khác nhau.
9. Assertion khác nhau phải được xem xét trước khi merge.
10. API và UI cùng business scenario không tự động là duplicate.
11. Exact duplicate phải được phát hiện deterministic.
12. Semantic duplicate chỉ là candidate nếu chưa đủ bằng chứng.
13. Ollama không được tự xóa hoặc merge test.
14. Duplicate coverage không được tăng coverage count.
15. Duplicate test không được dùng để che flaky behavior.
16. Import phải chạy dedup.
17. AI generation phải chạy dedup.
18. Regression build phải chạy dedup.
19. Dataset phải có dedup riêng.
20. Intentional repetition phải có metadata rõ ràng.
21. Không hard delete duplicate test mặc định.
22. Canonical test phải có stable fingerprint.
23. Dedup decision phải audit được.
24. Dedup engine lỗi không được phá test inventory.
25. Duplicate ID chưa giải quyết phải chặn regression build.
