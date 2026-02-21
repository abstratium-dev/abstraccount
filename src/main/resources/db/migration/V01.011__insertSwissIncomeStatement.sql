-- Insert Swiss Income Statement Report Template

INSERT INTO T_report_template (id, name, description, template_type, template_content, created_at, updated_at)
VALUES (
    'swiss-income-statement-001',
    'Swiss Income Statement (Compte de résultat)',
    'Swiss SME standard income statement format (KMU-Kontenplan)',
    'SWISS_INCOME_STATEMENT',
    CONCAT(
        '{"sections":[',
        '{"title":"Revenue","level":1,"showAccounts":false},',
        '{"title":"Sales and Service Revenue","level":2,"accountTypes":["REVENUE"],"invertSign":true,"showSubtotals":true},',
        '{"title":"Total Revenue","level":2,"accountTypes":["REVENUE"],"showAccounts":false,"invertSign":true},',
        '{"title":"Expenses","level":1,"showAccounts":false},',
        '{"title":"Cost of Materials and Goods","level":2,"accountRegex":"^4 ","showSubtotals":true},',
        '{"title":"Personnel Expenses","level":2,"accountRegex":"^5 ","showSubtotals":true},',
        '{"title":"Other Operating Expenses","level":2,"accountRegex":"^6 ","showSubtotals":true},',
        '{"title":"Total Expenses","level":2,"accountTypes":["EXPENSE"],"showAccounts":false},',
        '{"title":"Net Income","level":1,"calculated":"netIncome"}',
        ']}'
    ),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);
