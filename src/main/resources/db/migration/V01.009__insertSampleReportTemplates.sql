-- Insert sample report templates

-- Balance Sheet Report
INSERT INTO T_report_template (id, name, description, template_type, template_content, created_at, updated_at)
VALUES (
    'balance-sheet-001',
    'Balance Sheet',
    'Standard balance sheet showing assets, liabilities, and equity',
    'BALANCE_SHEET',
    CONCAT(
        '{"sections":[',
          '{ "title":"Assets",',
            '"level":1,',
            '"showAccounts":false},',
          '{ "title":"Cash and Cash Equivalents",',
            '"level":2,',
            '"accountTypes":["CASH"],',
            '"showSubtotals":true},',
          '{ "title":"Other Assets",',
            '"level":2,',
            '"accountTypes":["ASSET"],',
            '"showSubtotals":true},',
          '{ "title":"Total Assets",',
            '"accountTypes":["CASH","ASSET"],',
            '"showAccounts":false},',
          '{ "title":"Liabilities and Equity",',
            '"level":1,',
            '"showAccounts":false},',
          '{ "title":"Liabilities",',
            '"level":2,',
            '"accountTypes":["LIABILITY"],',
            '"showSubtotals":true,',
            '"invertSign":true},',
          '{ "title":"Equity",',
            '"level":2,',
            '"accountTypes":["EQUITY"],',
            '"showSubtotals":true,',
            '"invertSign":true,',
            '"includeNetIncome":false},',
          '{ "title":"Net Income/Loss",',
            '"level":2,',
            '"invertSign":true,',
            '"calculated":"netIncome"},',
          '{ "title":"Total Liabilities and Equity",',
            '"accountTypes":["LIABILITY","EQUITY"],',
            '"showAccounts":false,',
            '"includeNetIncome":true,',
            '"invertSign":true}',
        ']}'
    ),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Income Statement Report
INSERT INTO T_report_template (id, name, description, template_type, template_content, created_at, updated_at)
VALUES (
    'income-statement-001',
    'Income Statement',
    'Profit and loss statement showing revenue and expenses',
    'INCOME_STATEMENT',
    CONCAT(
        '{"sections":[',
          '{ "title":"Revenue",',
            '"accountTypes":["REVENUE"],',
            '"showSubtotals":true,',
            '"invertSign":true},',
          '{ "title":"Expenses",',
            '"accountTypes":["EXPENSE"],',
            '"showSubtotals":true},',
          '{ "title":"Net Income",',
            '"calculated":"netIncome"}',
        ']}'
    ),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Trial Balance Report
INSERT INTO T_report_template (id, name, description, template_type, template_content, created_at, updated_at)
VALUES (
    'trial-balance-001',
    'Trial Balance',
    'Trial balance showing all accounts with debits and credits',
    'TRIAL_BALANCE',
    CONCAT(
        '{"sections":[',
          '{ "title":"Cash",',
            '"accountTypes":["CASH"],',
            '"showDebitsCredits":true},',
          '{ "title":"Assets",',
            '"accountTypes":["ASSET"],',
            '"showDebitsCredits":true},',
          '{ "title":"Liabilities",',
            '"accountTypes":["LIABILITY"],',
            '"showDebitsCredits":true,',
            '"invertSign":true},',
          '{ "title":"Equity",',
            '"accountTypes":["EQUITY"],',
            '"showDebitsCredits":true,',
            '"invertSign":true},',
          '{ "title":"Revenue",',
            '"accountTypes":["REVENUE"],',
            '"showDebitsCredits":true,',
            '"invertSign":true},',
          '{ "title":"Expenses",',
            '"accountTypes":["EXPENSE"],',
            '"showDebitsCredits":true}',
        ']}'
    ),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);
