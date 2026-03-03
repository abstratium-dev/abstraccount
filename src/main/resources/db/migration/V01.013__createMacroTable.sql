-- Create macro table
-- Macros are independent of journals and can be used across all journals
CREATE TABLE T_macro (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500) NOT NULL,
    parameters TEXT NOT NULL,
    template TEXT NOT NULL,
    validation TEXT,
    notes TEXT,
    created_date TIMESTAMP NOT NULL,
    modified_date TIMESTAMP NOT NULL
);

CREATE INDEX I_macro_name ON T_macro(name);
