-- Insert Swiss Insolvency Risk Check report template

INSERT INTO T_report_template (id, name, description, template_content, created_at, updated_at)
VALUES (
    'swiss-insolvency-risk-check-001',
    'Swiss Insolvency Risk Check',
    'Checks whether the company is approaching or has reached the Swiss legal threshold for over-indebtedness (CO Art. 725). Shows equity cushion, liquid assets and solvency margin.',
    '{"sections":[{"title":"Swiss Insolvency Risk Check","calculated":"solvencyCheck","solvencyConfig":{"receivablesRegex":"^1:10:110","protectedEquityRegex":"^2:28:280|^2:290:2950"}}]}',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);
