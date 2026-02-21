-- Insert Partner Report Template

INSERT INTO T_report_template (id, name, description, template_type, template_content, created_at, updated_at)
VALUES (
    'partner-report-001',
    'Partner Activity Report',
    'Income and expenses grouped by partner',
    'PARTNER_REPORT',
    CONCAT(
        '{"sections":[',
        '{"title":"Partner Activity","groupByPartner":true}',
        ']}'
    ),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);
