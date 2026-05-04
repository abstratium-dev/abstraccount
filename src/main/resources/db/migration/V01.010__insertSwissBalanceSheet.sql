-- Insert Swiss Balance Sheet Report Template

INSERT INTO T_report_template (id, name, description, template_content, created_at, updated_at)
VALUES (
    'swiss-balance-sheet-001',
    'Swiss Balance Sheet (Bilan)',
    'Swiss SME standard balance sheet format (KMU-Kontenplan)',
    CONCAT(
        '{"sections":[',
        '{"title":"Actifs / Assets","level":1,"showAccounts":false},',
        '{"title":"Trésorerie / Cash and Cash Equivalents","level":2,"accountTypes":["CASH"]},',
        '{"title":"Autres actifs / Other Assets","level":2,"accountTypes":["ASSET"]},',
        '{"title":"Total des actifs / Total Assets","level":2,"accountTypes":["ASSET","CASH"],"showAccounts":false},',
        '{"title":"Passifs / Liabilities","level":1,"showAccounts":false},',
        '{"title":"Dettes / Liabilities","level":2,"accountTypes":["LIABILITY"],"invertSign":true},',
        '{"title":"Capitaux propres / Equity","level":1,"showAccounts":false},',
        '{"title":"Capitaux propres / Equity","level":2,"accountTypes":["EQUITY"],"invertSign":true,"includeNetIncome":true},',
        '{"title":"Total des capitaux propres / Total Equity","level":2,"accountTypes":["EQUITY"],"showAccounts":false,"includeNetIncome":true,"invertSign":true},',
        '{"title":"Total des passifs et capitaux propres / Total Liabilities and Equity","level":1,"accountTypes":["LIABILITY","EQUITY"],"showAccounts":false,"includeNetIncome":true,"invertSign":true}',
        ']}'
    ),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);
