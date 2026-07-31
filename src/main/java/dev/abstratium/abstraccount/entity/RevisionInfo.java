package dev.abstratium.abstraccount.entity;

import java.time.Instant;

import io.quarkus.security.identity.SecurityIdentity;
import jakarta.enterprise.context.control.ActivateRequestContext;
import jakarta.enterprise.inject.spi.CDI;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import org.hibernate.envers.RevisionEntity;
import org.hibernate.envers.RevisionListener;
import org.hibernate.envers.RevisionNumber;
import org.hibernate.envers.RevisionTimestamp;

/**
 * Custom Envers revision entity. Captures the current user and an optional
 * correlation id for each revision.
 */
@Entity
@RevisionEntity(RevisionInfo.RevisionInfoListener.class)
@Table(name = "REVINFO")
public class RevisionInfo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @RevisionNumber
    private Long rev;

    @RevisionTimestamp
    private Long revtstmp;

    @Column(length = 255)
    private String username;

    @Column(name = "correlation_id", length = 255)
    private String correlationId;

    public Long getRev() {
        return rev;
    }

    public void setRev(Long rev) {
        this.rev = rev;
    }

    public Long getRevtstmp() {
        return revtstmp;
    }

    public void setRevtstmp(Long revtstmp) {
        this.revtstmp = revtstmp;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getCorrelationId() {
        return correlationId;
    }

    public void setCorrelationId(String correlationId) {
        this.correlationId = correlationId;
    }

    public static class RevisionInfoListener implements RevisionListener {

        @Override
        @ActivateRequestContext
        public void newRevision(Object revisionEntity) {
            RevisionInfo revisionInfo = (RevisionInfo) revisionEntity;
            revisionInfo.setRevtstmp(Instant.now().toEpochMilli());
            revisionInfo.setUsername(getCurrentUsername());
            revisionInfo.setCorrelationId(getCurrentCorrelationId());
        }

        private String getCurrentUsername() {
            try {
                SecurityIdentity identity = CDI.current().select(SecurityIdentity.class).get();
                if (identity != null && identity.getPrincipal() != null) {
                    return identity.getPrincipal().getName();
                }
            } catch (Exception e) {
                // No security context available
            }
            return "system";
        }

        private String getCurrentCorrelationId() {
            return null;
        }
    }
}
