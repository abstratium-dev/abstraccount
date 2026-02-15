package dev.abstratium.abstraccount.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.UUID;

/**
 * JPA entity for Entry.
 * Always loaded eagerly with its transaction.
 */
@Entity
@Table(name = "T_entry")
public class EntryEntity {
    
    @Id
    @Column(length = 36)
    private String id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "transaction_id", nullable = false)
    private TransactionEntity transaction;
    
    @Column(name = "account_id", nullable = false)
    private String accountId;
    
    @Column(nullable = false)
    private String commodity;
    
    @Column(nullable = false, precision = 19, scale = 4)
    private BigDecimal amount;
    
    @Column(length = 1000)
    private String note;
    
    @Column(name = "entry_order", nullable = false)
    private Integer entryOrder;
    
    public EntryEntity() {
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
    
    public String getAccountId() {
        return accountId;
    }
    
    public void setAccountId(String accountId) {
        this.accountId = accountId;
    }
    
    public String getCommodity() {
        return commodity;
    }
    
    public void setCommodity(String commodity) {
        this.commodity = commodity;
    }
    
    public BigDecimal getAmount() {
        return amount;
    }
    
    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }
    
    public String getNote() {
        return note;
    }
    
    public void setNote(String note) {
        this.note = note;
    }
    
    public Integer getEntryOrder() {
        return entryOrder;
    }
    
    public void setEntryOrder(Integer entryOrder) {
        this.entryOrder = entryOrder;
    }
}
