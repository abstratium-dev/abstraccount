-- Create macro table
CREATE TABLE T_macro (
    id VARCHAR(36) PRIMARY KEY,
    journal_id VARCHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500) NOT NULL,
    parameters TEXT NOT NULL,
    template TEXT NOT NULL,
    validation TEXT,
    notes TEXT,
    created_date TIMESTAMP NOT NULL,
    modified_date TIMESTAMP NOT NULL,
    CONSTRAINT FK_macro_journal FOREIGN KEY (journal_id) REFERENCES T_journal(id) ON DELETE CASCADE
);

CREATE INDEX I_macro_journal ON T_macro(journal_id);
CREATE INDEX I_macro_name ON T_macro(name);
