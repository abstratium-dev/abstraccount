-- Insert Unpaid Sales Invoices Report Template

INSERT INTO T_report_template (id, name, description, template_content, created_at, updated_at)
VALUES (
    'unpaid-sales-invoices-001',
    'Unpaid Sales Invoices',
    'List of unpaid sales invoices with outstanding balances. Groups transactions by invoice tag value (invoice:SI*) and shows net balance per invoice. The balance is calculated only from Accounts Receivable (account 1100) - if the net in AR is zero, the invoice is paid. Searches across all journals in the chain.',
    '{
      "sections": [
        {
          "title": "Unpaid Sales Invoices",
          "calculated": "tagGrouped",
          "tagKey": "invoice",
          "tagValuePrefix": "SI",
          "balanceAccountNameRegex": "1100",
          "useJournalChain": true,
          "sortable": true,
          "defaultSortColumn": "net",
          "defaultSortDirection": "desc"
        }
      ]
    }',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);
