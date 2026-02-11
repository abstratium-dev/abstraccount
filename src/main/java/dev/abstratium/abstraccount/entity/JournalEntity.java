package dev.abstratium.abstraccount.entity;

import jakarta.persistence.*;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * JPA entity for Journal metadata.
 * Does not contain references to accounts or transactions.
 */
@Entity
@Table(name = "T_journal")
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
    
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "T_journal_commodity", joinColumns = @JoinColumn(name = "journal_id"))
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
    
    
    public Map<String, String> getCommodities() {
        return commodities;
    }
    
    public void setCommodities(Map<String, String> commodities) {
        this.commodities = commodities;
    }
}
