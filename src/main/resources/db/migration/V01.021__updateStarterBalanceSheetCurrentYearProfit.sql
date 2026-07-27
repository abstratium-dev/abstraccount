UPDATE T_report_template
SET template_content = REPLACE(
        template_content,
        '"title":"Current-year profit/loss","level":2,"accountRegex":"^Current-year profit/loss$","invertSign":true',
        '"title":"Current-year profit/loss","level":2,"accountRegex":"^Current-year profit/loss$","includeNetIncome":true,"invertSign":true'
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE name = 'Starter balance sheet'
  AND template_content LIKE '%"title":"Current-year profit/loss","level":2,"accountRegex":"^Current-year profit/loss$","invertSign":true%';
