package dev.abstratium.abstraccount.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.UUID;

/**
 * JPA entity for Posting.
 * Always loaded eagerly with its transaction.
 */
@Entity
@Table(name = "T_posting")
public class PostingEntity {
    
    @Id
    @Column(length = 36)
    private String id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "transaction_id", nullable = false)
    private TransactionEntity transaction;
    
    @Column(name = "account_number", nullable = false)
    private String accountNumber;
    
    @Column(nullable = false)
    private String commodity;
    
    @Column(nullable = false, precision = 19, scale = 4)
    private BigDecimal amount;
    
    @Column(length = 1000)
    private String note;
    
    @Column(name = "posting_order", nullable = false)
    private Integer postingOrder;
    
    public PostingEntity() {
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
    
    public String getAccountNumber() {
        return accountNumber;
    }
    
    public void setAccountNumber(String accountNumber) {
        this.accountNumber = accountNumber;
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
    
    public Integer getPostingOrder() {
        return postingOrder;
    }
    
    public void setPostingOrder(Integer postingOrder) {
        this.postingOrder = postingOrder;
    }
}
