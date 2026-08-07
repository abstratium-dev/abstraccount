package dev.abstratium.abstraccount.entity;

import jakarta.persistence.*;

/**
 * JPA entity for the binary content of an {@link AttachmentEntity}.
 * <p>
 * Deliberately kept in its own table (and its own entity) so that ordinary
 * attachment-metadata queries (list, exists, etc.) never have to load the
 * (potentially large) bytes.
 * <p>
 * This entity intentionally has <b>no {@code org_id}/{@code @TenantId}
 * column</b> and is never queried directly from user-supplied input. It is
 * only ever reached via its primary key, which is always obtained from a
 * previously tenant-filtered {@link AttachmentEntity} lookup (see
 * {@code AttachmentPersistenceService}). This keeps the single
 * security-critical tenant check in exactly one place.
 * <p>
 * Not {@code @Audited}: auditing full binary content on every replace would
 * multiply storage for little benefit; the metadata entity is audited
 * instead so who uploaded/replaced/deleted an attachment and when is still
 * tracked.
 */
@Entity
@Table(name = "T_attachment_content")
public class AttachmentContentEntity {

    @Id
    @Column(name = "attachment_id", length = 36)
    private String attachmentId;

    @Lob
    @Column(name = "content", nullable = false, length = 20 * 1024 * 1024)
    private byte[] content;

    public AttachmentContentEntity() {
    }

    public AttachmentContentEntity(String attachmentId, byte[] content) {
        this.attachmentId = attachmentId;
        this.content = content;
    }

    public String getAttachmentId() {
        return attachmentId;
    }

    public void setAttachmentId(String attachmentId) {
        this.attachmentId = attachmentId;
    }

    public byte[] getContent() {
        return content;
    }

    public void setContent(byte[] content) {
        this.content = content;
    }
}
