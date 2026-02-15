-- Create tag table
CREATE TABLE T_tag (
    id VARCHAR(36) PRIMARY KEY,
    transaction_id VARCHAR(36) NOT NULL,
    tag_key VARCHAR(255) NOT NULL,
    tag_value VARCHAR(500),
    CONSTRAINT FK_tag_transaction FOREIGN KEY (transaction_id) REFERENCES T_transaction(id) ON DELETE CASCADE
);

CREATE INDEX I_tag_transaction ON T_tag(transaction_id);
CREATE INDEX I_tag_tag_key ON T_tag(tag_key);