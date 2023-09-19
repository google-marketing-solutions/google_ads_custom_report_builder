/**
* Copyright 2023 Google LLC
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*    https://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

var timeZone = AdsApp.currentAccount().getTimeZone();

/**
 * Creates a report in a spreadsheet with data from Google Ads
 *
 */
function main() {
  // open the spreadsheet and adding required colums
  var SPREADSHEET_URL = CONFIG.spreadsheet_url;
  console.log("Opening the spreadsheet " + SPREADSHEET_URL);
  const ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL);
  for (const sheetName in CONFIG.fields){
    createTemplate(ss, sheetName);
  }
  console.log("All templates are created");
  // Itirate over accounts
  var accounts = CONFIG.accounts;
  console.log("Reading account ids " + accounts);
  var accountIterator = AdsManagerApp.accounts().withIds(accounts).get();
  for (const account of accountIterator) {
    AdsManagerApp.select(account);
  console.log("Reading account data " + account.getCustomerId());
  for (const sheetName in CONFIG.fields){
      getData(ss, sheetName);
    }
  }
  console.log("Report for accounts " + accounts + " is finished");
}

/**
 * Creates a sheet in google sheets with configured header
 * If sheets exists already, data is removed
 *
 * @param   SpreadsheetApp.Spreadsheet ss
            String sheetName
 */
function createTemplate(ss, sheetName){
  console.log("Adding template for "+ sheetName);
  var sheet = ss.getSheetByName(sheetName) || ss.getSheetByName("Sheet1") || ss.insertSheet();
  sheet.setName(sheetName);
  sheet.clear();
  var header = CONFIG.fields[sheetName.toLowerCase()].map(field => field.displayName);
  if (sheet.getMaxColumns() > header.length)
    sheet.deleteColumns(header.length + 1, sheet.getMaxColumns() - header.length)
  else if (sheet.getMaxColumns() < header.length)
    sheet.insertColumns(sheet.getMaxColumns(), header.length - sheet.getMaxColumns());
  console.log("Adding header to " + sheet.getName() + ": "+ header);
  sheet.appendRow(header);
  return sheet;
}

/**
 * Queries data and writes it to the sheet
 *
 * @param   SpreadsheetApp.Spreadsheet ss
            String sheetName
 */
function getData(ss, sheetName, query){
   var fields = CONFIG.fields[sheetName.toLowerCase()].map(field => field.columnName);
   var fields_filtered = fields.filter(field => field);
   var fields_string = fields_filtered.join(', ');
   var end_date = CONFIG.limits.end_date=='-' ?  Utilities.formatDate(new Date(), timeZone, 'yyyy-MM-dd') : CONFIG.limits.end_date;
   var limits = !CONFIG.limits[sheetName.toLowerCase()] ? '' : 'AND ' + CONFIG.limits[sheetName.toLowerCase()].join(' AND ');
   var query = `SELECT ${fields_filtered} ` +
              `FROM campaign ` +
              `WHERE segments.date BETWEEN '`  + CONFIG.limits.start_date + `' AND '`  + end_date + `' ` + limits;
   var report = AdsApp.search(query);
   sheet = ss.getSheetByName(sheetName);
   var rows = [];
   while (report.hasNext()) {
     var reportRow = report.next();
     var newRow = CONFIG.fields[sheetName.toLowerCase()].map(field => field.displayName);
     for (var field of newRow){
       newRow[newRow.indexOf(field)] = format(field, reportRow, sheetName);
        }
     rows.push(newRow);
   };
  if (!rows[0]) console.log("A report for "+ sheetName + " has no data.");
  else {
      sheet.getRange( sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
      const TIMEOUT = 12*1000;
      Utilities.sleep(TIMEOUT);
      console.log("A report for "+ sheetName + " is ready.");
      }
}

/**
 *  Formats column values.
 *
 * @param {string} column The name of the field.
 * @param {string} value The value of the field.
 * @return {string} The formatted value of the field.
 */
function format(fieldName, reportRow, sheetName) {
 var fieldNameFormatted =   snakeToCamel(CONFIG.fields[sheetName.toLowerCase()].find(f => f.displayName == fieldName).columnName);
  switch (fieldName) {
    case 'week':
      return getMonday(getValue(reportRow, "segments.date"));
    case 'day_to_conversion':
      return  reportRow.segments.conversionLagBucket=!null ? LAG.find(f => f.googleAds == reportRow.segments.conversionLagBucket).dayToConversion : '-';
    case 'order':
      return reportRow.segments.conversionLagBucket=!null  ? LAG.find(f => f.dayToConversion == reportRow.segments.conversionLagBucket).order : '-';
    case 'cost':
      return formatMicros(getValue(reportRow, fieldNameFormatted));
    case 'target_roas':
      var campaign_target_roas = getValue(reportRow, "campaign.targetRoas.targetRoas");
      return campaign_target_roas == '-' ? getValue(reportRow, "accessibleBiddingStrategy.targetRoas.targetRoas") : campaign_target_roas;
    case 'click_date':
      return getClickDate(reportRow);
    case 'dimension':
      return 'total';
    default:
      if (fieldName == '') return '-';
      return getValue(reportRow, fieldNameFormatted);
  }
}

function getClickDate(reportRow){
  if (reportRow.segments.conversionLagBucket!=null && reportRow.segments.conversionLagBucket!='-'){
    var conversion_day = new Date(reportRow.segments.date)
    var click_day =  new Date(conversion_day.setHours(conversion_day.getHours()+8) - reportRow.segments.conversionLagBucket * 24 * 60 * 60 * 1000);
    return click_day;
  }
  else return '-';
};


/**
 * Returns first day of the week (Monday)
 *
 * @param   Date d
 * @return {Date} Monday date.
 */
function getMonday(d) {
  d = new Date(d);
  var day = d.getDay(),
      diff = d.getDate() - day + (day == 0 ? -6:1); // adjust when day is sunday
  var monday = Utilities.formatDate(new Date(d.setDate(diff)), timeZone, 'yyyy-MM-dd');
  return monday;
}

/**
 * Converts snakecase string to camel case - i.e. this_is_string to thisIsString
 *
 * @param   String str
 * @return {string} The formatted value of the field.
 */
function snakeToCamel(str){
  return str.replace(
    /(?!^)_(.)/g,
    (_, char) => char.toUpperCase()
  );
}

/**
 * Returns nested object by its path
 *
 * @param  Object obj
 * @param  String path
 * @return Obj obj
 */

function getValue(obj, path) {
        if (!path) return obj;
        const properties = path.split('.');
        if (!obj) return  '-';
        else return getValue(obj[properties.shift()] , properties.join('.'))
}

/**Converts the metrics.cost_micros by dividing it by a million to match the
 * output with version v1.1.1 of the file.
 *
 * @param {string} value that needs to be converted.
 * @return {string} A value that is of type float.
 */
function formatMicros(value) {
  const micros = parseFloat(value / 1000000).toFixed(2);
  return `${micros}`;
}

/**Enum for segments.conversion_lag_bucket*/
const LAG = [
  {'googleAds':'LESS_THAN_ONE_DAY', 'dayToConversion':'0-1 day', 'order': '0' },
  {'googleAds':'ONE_TO_TWO_DAYS', 'dayToConversion':'1-2 days', 'order': '1' },
  {'googleAds':'TWO_TO_THREE_DAYS', 'dayToConversion':'2-3 days', 'order': '2' },
  {'googleAds':'THREE_TO_FOUR_DAYS', 'dayToConversion':'3-4 days', 'order': '3' },
  {'googleAds':'FOUR_TO_FIVE_DAYS', 'dayToConversion':'4-5 days', 'order': '4' },
  {'googleAds':'FIVE_TO_SIX_DAYS', 'dayToConversion':'5-6 days', 'order': '5' },
  {'googleAds':'SIX_TO_SEVEN_DAYS', 'dayToConversion':'6-7 days', 'order': '6' },
  {'googleAds':'SEVEN_TO_EIGHT_DAYS', 'dayToConversion':'7-8 days', 'order': '7' },
  {'googleAds':'EIGHT_TO_NINE_DAYS', 'dayToConversion':'8-9 days', 'order': '8' },
  {'googleAds':'NINE_TO_TEN_DAYS', 'dayToConversion':'9-10 days', 'order': '9' },
  {'googleAds':'TEN_TO_ELEVEN_DAYS', 'dayToConversion':'10-11 days', 'order': '10' },
  {'googleAds':'ELEVEN_TO_TWELVE_DAYS', 'dayToConversion':'11-12 days', 'order': '11' },
  {'googleAds':'TWELVE_TO_THIRTEEN_DAYS', 'dayToConversion':'12-13 days', 'order': '12' },
  {'googleAds':'THIRTEEN_TO_FOURTEEN_DAYS', 'dayToConversion':'13-14 days', 'order': '13' },
  {'googleAds':'FOURTEEN_TO_TWENTY_ONE_DAYS', 'dayToConversion':'14-21 days', 'order': '18' },
  {'googleAds':'TWENTY_ONE_TO_THIRTY_DAYS', 'dayToConversion':'21-30 days', 'order': '26' },
  {'googleAds':'THIRTY_TO_FORTY_FIVE_DAYS', 'dayToConversion':'30-45 days', 'order': '38' },
  {'googleAds':'FORTY_FIVE_TO_SIXTY_DAYS', 'dayToConversion':'45-60 days', 'order': '53' },
  {'googleAds':'UNKNOWN', 'dayToConversion':'-', 'order': '-' },
  {'googleAds':'UNSPECIFIED', 'dayToConversion':'-', 'order': '-' },
]
