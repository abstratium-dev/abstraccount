-- Insert Swiss Income Statement Report Template

INSERT INTO T_report_template (id, name, description, template_content, created_at, updated_at)
VALUES (
    'swiss-income-statement-001',
    'Swiss Income Statement (Compte de résultat)',
    'Swiss SME standard income statement format (KMU-Kontenplan)',
    CONCAT(
        '{"sections":[',
        '{"title":"Produits / Revenue","level":1,"showAccounts":false},',
        '{"title":"Chiffre d''affaires net / Net Sales and Service Revenue","level":2,"accountTypes":["REVENUE"],"invertSign":true,"showSubtotals":true},',
        '{"title":"Total des produits / Total Revenue","level":2,"accountTypes":["REVENUE"],"showAccounts":false,"invertSign":true},',
        '{"title":"Charges / Expenses","level":1,"showAccounts":false},',
        '{"title":"Charges de marchandises et de matériel / Cost of Materials and Goods","level":2,"accountRegex":"^4 ","showSubtotals":true},',
        '{"title":"Charges de personnel / Personnel Expenses","level":2,"accountRegex":"^5 ","showSubtotals":true},',
        '{"title":"Autres charges d''exploitation / Other Operating Expenses","level":2,"accountRegex":"^6 ","showSubtotals":true},',
        '{"title":"Total des charges / Total Expenses","level":2,"accountTypes":["EXPENSE"],"showAccounts":false},',
        '{"title":"Résultat de l''exercice / Net Income","level":1,"calculated":"netIncome"}',
        ']}'
    ),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);
