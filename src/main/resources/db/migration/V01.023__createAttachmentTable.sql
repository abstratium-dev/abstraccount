-- Attachments (e.g. receipts) linked to a transaction.
-- Content is stored in a separate table (T_attachment_content) so that
-- listing/loading attachment metadata never has to pull the binary bytes.
CREATE TABLE T_attachment (
    id             VARCHAR(36)  NOT NULL PRIMARY KEY,
    transaction_id VARCHAR(36)  NOT NULL,
    org_id         VARCHAR(36)  NOT NULL,
    file_name      VARCHAR(255) NOT NULL,
    content_type   VARCHAR(100) NOT NULL,
    size_bytes     BIGINT       NOT NULL,
    sha256         VARCHAR(64),
    uploaded_at    TIMESTAMP    NOT NULL,
    uploaded_by    VARCHAR(255),
    CONSTRAINT FK_attachment_transaction FOREIGN KEY (transaction_id) REFERENCES T_transaction (id)
);

CREATE INDEX I_attachment_transaction ON T_attachment (transaction_id);
CREATE INDEX I_attachment_org ON T_attachment (org_id);

-- Binary content, keyed 1:1 by attachment id. No org_id column: this table
-- is only ever reached via the tenant-filtered T_attachment row above.
CREATE TABLE T_attachment_content (
    attachment_id VARCHAR(36) NOT NULL PRIMARY KEY,
    content       LONGBLOB    NOT NULL,
    CONSTRAINT FK_attachment_content_attachment FOREIGN KEY (attachment_id) REFERENCES T_attachment (id)
);

-- Audit table for the @Audited AttachmentEntity (metadata only; content is
-- not audited, see AttachmentContentEntity javadoc).
CREATE TABLE IF NOT EXISTS T_attachment_AUD (
    id VARCHAR(36),
    transaction_id VARCHAR(36),
    org_id VARCHAR(36),
    file_name VARCHAR(255),
    content_type VARCHAR(100),
    size_bytes BIGINT,
    sha256 VARCHAR(64),
    uploaded_at TIMESTAMP,
    uploaded_by VARCHAR(255),
    REV BIGINT NOT NULL,
    REVTYPE TINYINT,
    PRIMARY KEY (id, REV),
    CONSTRAINT FK_attachment_aud_rev FOREIGN KEY (REV) REFERENCES REVINFO(REV)
);

CREATE INDEX I_attachment_aud_rev ON T_attachment_AUD(REV);
CREATE INDEX I_attachment_aud_id ON T_attachment_AUD(id);
