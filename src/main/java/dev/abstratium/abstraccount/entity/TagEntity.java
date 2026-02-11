package dev.abstratium.abstraccount.entity;

import jakarta.persistence.*;
import java.util.UUID;

/**
 * JPA entity for Tag.
 * Always loaded eagerly with its transaction.
 */
@Entity
@Table(name = "T_tag")
public class TagEntity {
    
    @Id
    @Column(length = 36)
    private String id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "transaction_id", nullable = false)
    private TransactionEntity transaction;
    
    @Column(name = "tag_key", nullable = false)
    private String tagKey;
    
    @Column(name = "tag_value")
    private String tagValue;
    
    public TagEntity() {
        this.id = UUID.randomUUID().toString();
    }
    
    public String getId() {
        return id;
    }
    
    public void setId(String id) {
        this.id = id;
    }
    
    public TransactionEntity getTransaction() {
        return transaction;
    }
    
    public void setTransaction(TransactionEntity transaction) {
        this.transaction = transaction;
    }
    
    public String getTagKey() {
        return tagKey;
    }
    
    public void setTagKey(String tagKey) {
        this.tagKey = tagKey;
    }
    
    public String getTagValue() {
        return tagValue;
    }
    
    public void setTagValue(String tagValue) {
        this.tagValue = tagValue;
    }
}
