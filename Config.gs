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

/**
 * Configuration to be used for the custom ads report.
 */
CONFIG = {
  // URL of the report spreadsheet.
  'spreadsheet_url':'https://docs.google.com/spreadsheets/d/<enter_spreadsheet_id_here>/',
  //Account ids for which the report willbe generated
  'accounts' : [  "000-111-2222", "000-111-3333",
               ],
  /**
   * Fields to be presented in the spreadsheet report.
   * Metrics are grouped by sheets.
   * Column name is the path in google query. If column name is empty the value is calculated by script.
   * More metrics can be found here
https://developers.google.com/google-ads/api/fields/v12/campaign_query_builder.
   * Display name is the name of the metric in the report. 'Dimension' is an attribute needed to calculate total metrics for the
dashboard. 'Order' metric is calculated to sort marturity dates.
   */
 'fields': {
      'conversions' : [
                          {'columnName': 'segments.date', 'displayName': 'date'},
                          {'columnName': '', 'displayName': 'week'},
                          {'columnName': 'customer.descriptive_name', 'displayName': 'account_name'},
                          {'columnName': 'campaign.name', 'displayName': 'campaign_name'},
                          {'columnName': 'accessible_bidding_strategy.name', 'displayName': 'portfolio_bidding_strategy'},
                          {'columnName': 'campaign.bidding_strategy_type', 'displayName': 'bidding_strategy_type'},
                          {'columnName': 'campaign.bidding_strategy_system_status', 'displayName': 'bidding_strategy_status'},
                          {'columnName': 'metrics.conversions_value', 'displayName': 'total_revenue'},
                          {'columnName': 'metrics.value_per_conversion', 'displayName': 'value_per_conversion'},
                          {'columnName': 'metrics.conversions', 'displayName': 'conversions_volume'},
                          {'columnName': 'segments.conversion_lag_bucket', 'displayName': 'day_to_conversion'},
                          {'columnName': '', 'displayName': 'order'},
                          {'columnName': '', 'displayName': 'click_date'},
                          {'columnName': 'segments.conversion_action_name', 'displayName': 'conversion_action'},
                          {'columnName': 'accessible_bidding_strategy.target_roas.target_roas, campaign.target_roas.target_roas',
					'displayName': 'target_roas'},
                          {'columnName': '', 'displayName': 'dimension'},
                      ],
      'costs' : [
                          {'columnName': 'segments.date', 'displayName': 'date'},
                          {'columnName': 'segments.week', 'displayName': 'week'},
                          {'columnName': 'customer.descriptive_name', 'displayName': 'account_name'},
                          {'columnName': 'campaign.name', 'displayName': 'campaign_name'},
                          {'columnName': 'accessible_bidding_strategy.name', 'displayName': 'portfolio_bidding_strategy'},
                          {'columnName': 'campaign.bidding_strategy_type', 'displayName': 'bidding_strategy_type'},
                          {'columnName': 'campaign.bidding_strategy_system_status', 'displayName': 'bidding_strategy_status'},
                          {'columnName': 'metrics.cost_micros', 'displayName': 'cost'},
                          {'columnName': 'metrics.clicks', 'displayName': 'clicks'},
                  ],
 },

  /**
   * Limits used to query the data
   * Start and end date are the same for all reports
   * If end date is not defined it is default to the current date
   * Other limitations can be added per report. Limit name should be equal to sheet name
  */
 'limits': {
   'start_date' : '2022-12-01' ,
   'end_date' : '-',
   'conversions' : [ `metrics.conversions>0`,
                    `campaign.bidding_strategy_type IN ('MAXIMIZE_CONVERSION_VALUE',
                    'TARGET_ROAS')`],
   'costs' : [`campaign.bidding_strategy_type IN ('MAXIMIZE_CONVERSION_VALUE', 'TARGET_ROAS')`],
 },
};
