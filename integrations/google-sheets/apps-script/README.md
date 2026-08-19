# QA evidence image helper

1. Open `script.google.com`, create a project and paste `Code.gs`.
2. In Project Settings, set Script Property `project` (or `SCRIPT_SECRET`) to the value of `GOOGLE_APPS_SCRIPT_SECRET`.
3. Deploy as Web App: execute as yourself; allow the QA service account to invoke it.
4. Put the deployment URL in `GOOGLE_APPS_SCRIPT_URL`.

The helper receives a base64 image and inserts it directly into an `Issue_no.xx` sheet. It does not require Google Drive storage.
