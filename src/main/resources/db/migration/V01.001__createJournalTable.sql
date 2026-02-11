-- Create journal table
CREATE TABLE T_journal (
    id VARCHAR(36) PRIMARY KEY,
    logo VARCHAR(500),
    title VARCHAR(500),
    subtitle VARCHAR(500),
    currency VARCHAR(10)
);

-- Create journal commodity table
CREATE TABLE T_journal_commodity (
    journal_id VARCHAR(36) NOT NULL,
    commodity_code VARCHAR(10) NOT NULL,
    display_precision VARCHAR(20),
    PRIMARY KEY (journal_id, commodity_code),
    CONSTRAINT FK_journal_commodity_journal FOREIGN KEY (journal_id) REFERENCES T_journal(id) ON DELETE CASCADE
);
