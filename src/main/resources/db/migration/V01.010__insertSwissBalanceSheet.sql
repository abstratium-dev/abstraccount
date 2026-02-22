-- Insert Swiss Balance Sheet Report Template

INSERT INTO T_report_template (id, name, description, template_type, template_content, created_at, updated_at)
VALUES (
    'swiss-balance-sheet-001',
    'Swiss Balance Sheet (Bilan)',
    'Swiss SME standard balance sheet format (KMU-Kontenplan)',
    'SWISS_BALANCE_SHEET',
    CONCAT(
        '{"sections":[',
        '{"title":"Assets","level":1,"showAccounts":false},',
        '{"title":"Cash and Cash Equivalents","level":2,"accountTypes":["CASH"]},',
        '{"title":"Other Assets","level":2,"accountTypes":["ASSET"]},',
        '{"title":"Total Assets","level":2,"accountTypes":["ASSET","CASH"],"showAccounts":false},',
        '{"title":"Liabilities","level":1,"showAccounts":false},',
        '{"title":"Liabilities","level":2,"accountTypes":["LIABILITY"],"invertSign":true},',
        '{"title":"Equity","level":1,"showAccounts":false},',
        '{"title":"Equity","level":2,"accountTypes":["EQUITY"],"invertSign":true,"includeNetIncome":true},',
        '{"title":"Total Equity","level":2,"accountTypes":["EQUITY"],"showAccounts":false,"includeNetIncome":true,"invertSign":true},',
        '{"title":"Total Liabilities and Equity","level":1,"accountTypes":["LIABILITY","EQUITY"],"showAccounts":false,"includeNetIncome":true,"invertSign":true}',
        ']}'
    ),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);
