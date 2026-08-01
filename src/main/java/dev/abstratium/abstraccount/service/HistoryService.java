package dev.abstratium.abstraccount.service;

import java.util.Comparator;
import java.util.List;

import dev.abstratium.abstraccount.entity.AccountEntity;
import dev.abstratium.abstraccount.entity.EntryEntity;
import dev.abstratium.abstraccount.entity.JournalEntity;
import dev.abstratium.abstraccount.entity.MacroEntity;
import dev.abstratium.abstraccount.entity.ReportTemplateEntity;
import dev.abstratium.abstraccount.entity.RevisionInfo;
import dev.abstratium.abstraccount.entity.TagEntity;
import dev.abstratium.abstraccount.entity.TransactionEntity;
import io.quarkus.hibernate.orm.PersistenceUnitExtension;
import io.quarkus.hibernate.orm.runtime.tenant.TenantResolver;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;

import org.hibernate.envers.AuditReaderFactory;
import org.hibernate.envers.query.AuditEntity;

/**
 * Service for querying Hibernate Envers audit history.
 */
@ApplicationScoped
public class HistoryService {

    @Inject
    EntityManager entityManager;

    @Inject
    @PersistenceUnitExtension
    TenantResolver tenantResolver;

    /**
     * Returns the revision history for a single entity instance.
     * The revision list is sorted from oldest to newest.
     *
     * @param entityType the entity type name (e.g., "journal", "account", "transaction")
     * @param entityId the primary key of the entity instance
     * @return a chronological list of revisions for the requested entity
     * @throws IllegalArgumentException if the entity type is unknown
     */
    @Transactional
    public List<EntityRevisionDto> getEntityHistory(String entityType, String entityId) {
        Class<?> entityClass = resolveEntityClass(entityType);

        String tenantId = tenantResolver.resolveTenantId();

        @SuppressWarnings("unchecked")
        List<Object[]> revisions = AuditReaderFactory.get(entityManager)
            .createQuery()
            .forRevisionsOfEntity(entityClass, false, true)
            .add(AuditEntity.id().eq(entityId))
            .add(AuditEntity.disjunction()
                .add(AuditEntity.property("orgId").eq(tenantId))
                .add(AuditEntity.property("orgId").isNull()))
            .getResultList();

        return revisions.stream()
            .map(row -> {
                RevisionInfo revisionInfo = (RevisionInfo) row[1];
                org.hibernate.envers.RevisionType revisionType = (org.hibernate.envers.RevisionType) row[2];
                return new EntityRevisionDto(
                    revisionInfo.getRev(),
                    revisionInfo.getRevtstmp(),
                    revisionInfo.getUsername(),
                    revisionType.name()
                );
            })
            .sorted(Comparator.comparing(EntityRevisionDto::rev))
            .toList();
    }

    private Class<?> resolveEntityClass(String entityType) {
        return switch (entityType.toLowerCase()) {
            case "journal" -> JournalEntity.class;
            case "account" -> AccountEntity.class;
            case "transaction" -> TransactionEntity.class;
            case "entry" -> EntryEntity.class;
            case "tag" -> TagEntity.class;
            case "macro" -> MacroEntity.class;
            case "reporttemplate", "report_template", "report-template" -> ReportTemplateEntity.class;
            default -> throw new IllegalArgumentException("Unknown entity type: " + entityType);
        };
    }
}
