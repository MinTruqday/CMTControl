/** Deploy as a Web App. Set property project or SCRIPT_SECRET to GOOGLE_APPS_SCRIPT_SECRET. */
function doPost(event) {
  const body = JSON.parse(event.postData.contents);
  const properties = PropertiesService.getScriptProperties();
  if (body.secret !== (properties.getProperty('project') || properties.getProperty('SCRIPT_SECRET'))) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'UNAUTHORIZED' })).setMimeType(ContentService.MimeType.JSON);
  }
  const spreadsheet = SpreadsheetApp.openById(body.spreadsheetId);
  const sheet = spreadsheet.getSheetByName(body.sheetName);
  if (!sheet) return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'ISSUE_SHEET_NOT_FOUND' })).setMimeType(ContentService.MimeType.JSON);
  const blob = Utilities.newBlob(Utilities.base64Decode(body.imageBase64), body.mimeType || 'image/png', body.fileName || 'evidence.png');
  const image = sheet.insertImage(blob, Number(body.column || 1), Number(body.row || 10));
  image.setWidth(Number(body.width || 900));
  image.setHeight(Number(body.height || 540));
  return ContentService.createTextOutput(JSON.stringify({ ok: true, sheetName: body.sheetName })).setMimeType(ContentService.MimeType.JSON);
}
