// Google Sheet lead tracker for the website quote form.
//
// Setup (about 5 minutes):
// 1. Make a new Google Sheet named "Website leads".
// 2. Extensions > Apps Script. Delete what's there and paste this whole file.
// 3. Change SECRET below to any long password, and save it.
// 4. Deploy > New deployment > type "Web app".
//    Execute as: Me.  Who has access: Anyone.  Click Deploy and allow access.
// 5. Copy the Web app URL.
// 6. In Cloudflare (Worker > Settings > Variables and Secrets) add two secrets:
//      SHEET_WEBHOOK_URL = the Web app URL
//      SHEET_SECRET      = the same password as below
// New quote requests now appear as rows in the sheet.

const SECRET = "change-this-to-a-long-password";

const COLUMNS = ["Received", "Name", "Phone", "Email", "ZIP", "Project", "Start", "Walkthrough date", "Walkthrough time", "Photos", "Details", "Status", "Notes"];

function doPost(e) {
  const d = JSON.parse(e.postData.contents);
  if (d.secret !== SECRET) return ContentService.createTextOutput("denied");

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(COLUMNS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, COLUMNS.length).setFontWeight("bold");
  }
  sheet.appendRow([
    new Date(), d.name, d.phone, d.email, d.zip, d.type, d.timeline,
    d.visit_date, d.visit_time, d.photos, d.details, "New", ""
  ]);
  return ContentService.createTextOutput("ok");
}
