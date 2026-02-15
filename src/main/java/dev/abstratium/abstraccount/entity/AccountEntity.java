package dev.abstratium.abstraccount.entity;

import dev.abstratium.abstraccount.model.AccountType;
import jakarta.persistence.*;
import java.util.UUID;

/**
 * JPA entity for Account.
 * Loaded without transactions/entries.
 */
@Entity
@Table(name = "T_account")
public class AccountEntity {
    
    @Id
    @Column(length = 36)
    private String id;
    
    @Column(name = "account_name")
    private String name;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AccountType type;
    
    @Column(length = 1000)
    private String note;
    
    @Column(name = "parent_account_id", length = 36)
    private String parentAccountId;
    
    @Column(name = "journal_id", nullable = false, length = 36)
    private String journalId;
    
    public AccountEntity() {
        this.id = UUID.randomUUID().toString();
    }
    
    public String getId() {
        return id;
    }
    
    public void setId(String id) {
        this.id = id;
    }
    
    public AccountType getType() {
        return type;
    }
    
    public void setType(AccountType type) {
        this.type = type;
    }
    
    public String getNote() {
        return note;
    }
    
    public void setNote(String note) {
        this.note = note;
    }
    
    public String getParentAccountId() {
        return parentAccountId;
    }
    
    public void setParentAccountId(String parentAccountId) {
        this.parentAccountId = parentAccountId;
    }
    
    public String getName() {
        return name;
    }
    
    public void setName(String name) {
        this.name = name;
    }
    
    public String getJournalId() {
        return journalId;
    }
    
    public void setJournalId(String journalId) {
        this.journalId = journalId;
    }
}
