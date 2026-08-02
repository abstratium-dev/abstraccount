package dev.abstratium.abstraccount.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.TenantId;
import org.hibernate.envers.Audited;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * JPA entity for Journal metadata.
 * Does not contain references to accounts or transactions.
 */
@Entity
@Table(name = "T_journal")
@Audited
public class JournalEntity {
    
    @Id
    @Column(length = 36)
    private String id;
    
    @Column(length = 500)
    private String logo;
    
    @Column(length = 500)
    private String title;
    
    @Column(length = 500)
    private String subtitle;
    
    @Column(length = 10)
    private String currency;

    @TenantId
    @Column(name = "org_id", nullable = false, updatable = false, length = 36)
    private String orgId;

    @Column(name = "previous_journal_id", length = 36)
    private String previousJournalId;

    /**
     * When {@code true}, the journal is locked and any mutating operation
     * (create/update/delete of accounts, transactions, macros execution, etc.)
     * against it must be rejected with a clear error.
     * Defaults to {@code false} so existing journals remain editable until
     * explicitly locked.
     */
    @Column(name = "locked", nullable = false)
    private boolean locked = false;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "T_journal_commodity", joinColumns = {
        @JoinColumn(name = "journal_id", referencedColumnName = "id"),
        @JoinColumn(name = "org_id", referencedColumnName = "org_id")
    })
    @MapKeyColumn(name = "commodity_code")
    @Column(name = "display_precision", length = 20)
    private Map<String, String> commodities = new HashMap<>();
    
    public JournalEntity() {
        this.id = UUID.randomUUID().toString();
    }
    
    public String getId() {
        return id;
    }
    
    public void setId(String id) {
        this.id = id;
    }
    
    public String getLogo() {
        return logo;
    }
    
    public void setLogo(String logo) {
        this.logo = logo;
    }
    
    public String getTitle() {
        return title;
    }
    
    public void setTitle(String title) {
        this.title = title;
    }
    
    public String getSubtitle() {
        return subtitle;
    }
    
    public void setSubtitle(String subtitle) {
        this.subtitle = subtitle;
    }
    
    public String getCurrency() {
        return currency;
    }
    
    public void setCurrency(String currency) {
        this.currency = currency;
    }
    
    
    public String getPreviousJournalId() {
        return previousJournalId;
    }

    public void setPreviousJournalId(String previousJournalId) {
        this.previousJournalId = previousJournalId;
    }

    public Map<String, String> getCommodities() {
        return commodities;
    }

    public void setCommodities(Map<String, String> commodities) {
        this.commodities = commodities;
    }

    public boolean isLocked() {
        return locked;
    }

    public void setLocked(boolean locked) {
        this.locked = locked;
    }
}
