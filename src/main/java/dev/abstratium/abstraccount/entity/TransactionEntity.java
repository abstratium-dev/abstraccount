package dev.abstratium.abstraccount.entity;

import dev.abstratium.abstraccount.model.TransactionStatus;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * JPA entity for Transaction.
 * Eagerly loads postings and tags.
 */
@Entity
@Table(name = "T_transaction")
public class TransactionEntity {
    
    @Id
    @Column(length = 36)
    private String id;
    
    @Column(name = "transaction_date", nullable = false)
    private LocalDate transactionDate;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TransactionStatus status;
    
    @Column(nullable = false, length = 1000)
    private String description;
    
    @Column(name = "partner_id", length = 100)
    private String partnerId;
    
    @Column(name = "transaction_id")
    private String transactionId;
    
    @Column(name = "journal_id", nullable = false, length = 36)
    private String journalId;
    
    @OneToMany(mappedBy = "transaction", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @OrderBy("postingOrder ASC")
    private List<PostingEntity> postings = new ArrayList<>();
    
    @OneToMany(mappedBy = "transaction", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private Set<TagEntity> tags = new HashSet<>();
    
    public TransactionEntity() {
        this.id = UUID.randomUUID().toString();
    }
    
    public String getId() {
        return id;
    }
    
    public void setId(String id) {
        this.id = id;
    }
    
    public LocalDate getTransactionDate() {
        return transactionDate;
    }
    
    public void setTransactionDate(LocalDate transactionDate) {
        this.transactionDate = transactionDate;
    }
    
    public TransactionStatus getStatus() {
        return status;
    }
    
    public void setStatus(TransactionStatus status) {
        this.status = status;
    }
    
    public String getDescription() {
        return description;
    }
    
    public void setDescription(String description) {
        this.description = description;
    }
    
    public String getPartnerId() {
        return partnerId;
    }
    
    public void setPartnerId(String partnerId) {
        this.partnerId = partnerId;
    }
    
    public String getTransactionId() {
        return transactionId;
    }
    
    public void setTransactionId(String transactionId) {
        this.transactionId = transactionId;
    }
    
    public String getJournalId() {
        return journalId;
    }
    
    public void setJournalId(String journalId) {
        this.journalId = journalId;
    }
    
    public List<PostingEntity> getPostings() {
        return postings;
    }
    
    public void setPostings(List<PostingEntity> postings) {
        this.postings = postings;
    }
    
    public void addPosting(PostingEntity posting) {
        postings.add(posting);
        posting.setTransaction(this);
    }
    
    public void removePosting(PostingEntity posting) {
        postings.remove(posting);
        posting.setTransaction(null);
    }
    
    public Set<TagEntity> getTags() {
        return tags;
    }
    
    public void setTags(Set<TagEntity> tags) {
        this.tags = tags;
    }
    
    public void addTag(TagEntity tag) {
        tags.add(tag);
        tag.setTransaction(this);
    }
    
    public void removeTag(TagEntity tag) {
        tags.remove(tag);
        tag.setTransaction(null);
    }
}
