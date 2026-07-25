ALTER TABLE T_journal ADD COLUMN org_id VARCHAR(36) NOT NULL DEFAULT '${default_org_uuid}';
ALTER TABLE T_journal_commodity ADD COLUMN org_id VARCHAR(36) NOT NULL DEFAULT '${default_org_uuid}';
ALTER TABLE T_account ADD COLUMN org_id VARCHAR(36) NOT NULL DEFAULT '${default_org_uuid}';
ALTER TABLE T_transaction ADD COLUMN org_id VARCHAR(36) NOT NULL DEFAULT '${default_org_uuid}';
ALTER TABLE T_entry ADD COLUMN org_id VARCHAR(36) NOT NULL DEFAULT '${default_org_uuid}';
ALTER TABLE T_tag ADD COLUMN org_id VARCHAR(36) NOT NULL DEFAULT '${default_org_uuid}';
ALTER TABLE T_macro ADD COLUMN org_id VARCHAR(36) NOT NULL DEFAULT '${default_org_uuid}';
ALTER TABLE T_report_template ADD COLUMN org_id VARCHAR(36) NOT NULL DEFAULT '${default_org_uuid}';

ALTER TABLE T_journal ADD CONSTRAINT UK_journal_org_id_id UNIQUE (org_id, id);
ALTER TABLE T_account ADD CONSTRAINT UK_account_org_id_id UNIQUE (org_id, id);
ALTER TABLE T_transaction ADD CONSTRAINT UK_transaction_org_id_id UNIQUE (org_id, id);
ALTER TABLE T_entry ADD CONSTRAINT UK_entry_org_id_id UNIQUE (org_id, id);
ALTER TABLE T_tag ADD CONSTRAINT UK_tag_org_id_id UNIQUE (org_id, id);
ALTER TABLE T_macro ADD CONSTRAINT UK_macro_org_id_id UNIQUE (org_id, id);
ALTER TABLE T_report_template ADD CONSTRAINT UK_report_template_org_id_id UNIQUE (org_id, id);

ALTER TABLE T_journal_commodity ADD CONSTRAINT FK_journal_commodity_org_journal FOREIGN KEY (org_id, journal_id) REFERENCES T_journal(org_id, id);
ALTER TABLE T_journal ADD CONSTRAINT FK_journal_org_previous_journal FOREIGN KEY (org_id, previous_journal_id) REFERENCES T_journal(org_id, id);
ALTER TABLE T_account ADD CONSTRAINT FK_account_org_journal FOREIGN KEY (org_id, journal_id) REFERENCES T_journal(org_id, id);
ALTER TABLE T_account ADD CONSTRAINT FK_account_org_parent FOREIGN KEY (org_id, parent_account_id) REFERENCES T_account(org_id, id);
ALTER TABLE T_transaction ADD CONSTRAINT FK_transaction_org_journal FOREIGN KEY (org_id, journal_id) REFERENCES T_journal(org_id, id);
ALTER TABLE T_entry ADD CONSTRAINT FK_entry_org_transaction FOREIGN KEY (org_id, transaction_id) REFERENCES T_transaction(org_id, id);
ALTER TABLE T_entry ADD CONSTRAINT FK_entry_org_account FOREIGN KEY (org_id, account_id) REFERENCES T_account(org_id, id);
ALTER TABLE T_tag ADD CONSTRAINT FK_tag_org_transaction FOREIGN KEY (org_id, transaction_id) REFERENCES T_transaction(org_id, id);

CREATE INDEX I_journal_org_id ON T_journal(org_id);
CREATE INDEX I_account_org_journal ON T_account(org_id, journal_id);
CREATE INDEX I_transaction_org_journal ON T_transaction(org_id, journal_id);
CREATE INDEX I_transaction_org_date_order ON T_transaction(org_id, transaction_date, transaction_order);
CREATE INDEX I_entry_org_account ON T_entry(org_id, account_id);
CREATE INDEX I_entry_org_transaction ON T_entry(org_id, transaction_id);
CREATE INDEX I_tag_org_transaction ON T_tag(org_id, transaction_id);
CREATE INDEX I_macro_org_name ON T_macro(org_id, name);
CREATE INDEX I_report_template_org_name ON T_report_template(org_id, name);
