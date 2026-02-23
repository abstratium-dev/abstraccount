-- Insert Partner Report Template

INSERT INTO T_report_template (id, name, description, template_content, created_at, updated_at)
VALUES (
    'partner-report-001',
    'Partner Activity Report',
    'Income and expenses grouped by partner',
    CONCAT(
        '{"sections":[',
        '  {"title":"Partner Activity",',
           '"groupByPartner":true,',
           '"sortable":true,',
           '"defaultSortColumn":"net",',
           '"defaultSortDirection":"desc"}',
        ']}'
    ),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);
