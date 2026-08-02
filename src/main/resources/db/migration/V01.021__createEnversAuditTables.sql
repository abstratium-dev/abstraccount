-- Envers revision info table. Created manually so the schema stays under Flyway control.
CREATE TABLE IF NOT EXISTS REVINFO (
    REV BIGINT AUTO_INCREMENT PRIMARY KEY,
    REVTSTMP BIGINT,
    username VARCHAR(255),
    correlation_id VARCHAR(255)
);

CREATE INDEX I_revinfo_timestamp ON REVINFO(REVTSTMP);
CREATE INDEX I_revinfo_correlation_id ON REVINFO(correlation_id);

-- Audit tables for each @Audited entity.
-- All data columns are nullable because Envers records the full row as it was at a revision.

CREATE TABLE IF NOT EXISTS T_journal_AUD (
    id VARCHAR(36),
    logo VARCHAR(500),
    title VARCHAR(500),
    subtitle VARCHAR(500),
    currency VARCHAR(10),
    org_id VARCHAR(36),
    previous_journal_id VARCHAR(36),
    REV BIGINT NOT NULL,
    REVTYPE TINYINT,
    PRIMARY KEY (id, REV),
    CONSTRAINT FK_journal_aud_rev FOREIGN KEY (REV) REFERENCES REVINFO(REV)
);

CREATE INDEX I_journal_aud_rev ON T_journal_AUD(REV);
CREATE INDEX I_journal_aud_id ON T_journal_AUD(id);

-- Audit table for the T_journal_commodity element collection.
CREATE TABLE IF NOT EXISTS T_journal_commodity_AUD (
    journal_id VARCHAR(36),
    commodity_code VARCHAR(10),
    display_precision VARCHAR(20),
    REV BIGINT NOT NULL,
    REVTYPE TINYINT,
    PRIMARY KEY (journal_id, commodity_code, REV),
    CONSTRAINT FK_journal_commodity_aud_rev FOREIGN KEY (REV) REFERENCES REVINFO(REV)
);

CREATE TABLE IF NOT EXISTS T_account_AUD (
    id VARCHAR(36),
    account_name VARCHAR(500),
    type VARCHAR(20),
    note VARCHAR(1000),
    parent_account_id VARCHAR(36),
    journal_id VARCHAR(36),
    org_id VARCHAR(36),
    account_order INT,
    REV BIGINT NOT NULL,
    REVTYPE TINYINT,
    PRIMARY KEY (id, REV),
    CONSTRAINT FK_account_aud_rev FOREIGN KEY (REV) REFERENCES REVINFO(REV)
);

CREATE INDEX I_account_aud_rev ON T_account_AUD(REV);
CREATE INDEX I_account_aud_id ON T_account_AUD(id);

CREATE TABLE IF NOT EXISTS T_transaction_AUD (
    id VARCHAR(36),
    transaction_date DATE,
    status VARCHAR(20),
    description VARCHAR(1000),
    partner_id VARCHAR(100),
    journal_id VARCHAR(36),
    org_id VARCHAR(36),
    transaction_order BIGINT,
    REV BIGINT NOT NULL,
    REVTYPE TINYINT,
    PRIMARY KEY (id, REV),
    CONSTRAINT FK_transaction_aud_rev FOREIGN KEY (REV) REFERENCES REVINFO(REV)
);

CREATE INDEX I_transaction_aud_rev ON T_transaction_AUD(REV);
CREATE INDEX I_transaction_aud_id ON T_transaction_AUD(id);

CREATE TABLE IF NOT EXISTS T_entry_AUD (
    id VARCHAR(36),
    transaction_id VARCHAR(36),
    account_id VARCHAR(36),
    org_id VARCHAR(36),
    commodity VARCHAR(10),
    amount DECIMAL(19, 4),
    note VARCHAR(1000),
    entry_order INT,
    REV BIGINT NOT NULL,
    REVTYPE TINYINT,
    PRIMARY KEY (id, REV),
    CONSTRAINT FK_entry_aud_rev FOREIGN KEY (REV) REFERENCES REVINFO(REV)
);

CREATE INDEX I_entry_aud_rev ON T_entry_AUD(REV);
CREATE INDEX I_entry_aud_id ON T_entry_AUD(id);

CREATE TABLE IF NOT EXISTS T_tag_AUD (
    id VARCHAR(36),
    transaction_id VARCHAR(36),
    org_id VARCHAR(36),
    tag_key VARCHAR(255),
    tag_value VARCHAR(500),
    REV BIGINT NOT NULL,
    REVTYPE TINYINT,
    PRIMARY KEY (id, REV),
    CONSTRAINT FK_tag_aud_rev FOREIGN KEY (REV) REFERENCES REVINFO(REV)
);

CREATE INDEX I_tag_aud_rev ON T_tag_AUD(REV);
CREATE INDEX I_tag_aud_id ON T_tag_AUD(id);

CREATE TABLE IF NOT EXISTS T_macro_AUD (
    id VARCHAR(36),
    name VARCHAR(100),
    org_id VARCHAR(36),
    description VARCHAR(500),
    parameters TEXT,
    template TEXT,
    validation TEXT,
    notes TEXT,
    created_date TIMESTAMP,
    modified_date TIMESTAMP,
    REV BIGINT NOT NULL,
    REVTYPE TINYINT,
    PRIMARY KEY (id, REV),
    CONSTRAINT FK_macro_aud_rev FOREIGN KEY (REV) REFERENCES REVINFO(REV)
);

CREATE INDEX I_macro_aud_rev ON T_macro_AUD(REV);
CREATE INDEX I_macro_aud_id ON T_macro_AUD(id);

CREATE TABLE IF NOT EXISTS T_report_template_AUD (
    id VARCHAR(255),
    name VARCHAR(255),
    org_id VARCHAR(36),
    description TEXT,
    template_content TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    REV BIGINT NOT NULL,
    REVTYPE TINYINT,
    PRIMARY KEY (id, REV),
    CONSTRAINT FK_report_template_aud_rev FOREIGN KEY (REV) REFERENCES REVINFO(REV)
);

CREATE INDEX I_report_template_aud_rev ON T_report_template_AUD(REV);
CREATE INDEX I_report_template_aud_id ON T_report_template_AUD(id);
