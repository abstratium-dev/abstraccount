package dev.abstratium.abstraccount.entity;

import dev.abstratium.abstraccount.model.AccountType;
import jakarta.persistence.*;
import java.util.UUID;

/**
 * JPA entity for Account.
 * Loaded without transactions/postings.
 */
@Entity
@Table(name = "T_account",
    uniqueConstraints = {
        @UniqueConstraint(name = "IU_account_number_journal", columnNames = {"account_number", "journal_id"}),
        @UniqueConstraint(name = "IU_account_full_name_journal", columnNames = {"full_name", "journal_id"})
    }
)
public class AccountEntity {
    
    @Id
    @Column(length = 36)
    private String id;
    
    @Column(name = "account_number", nullable = false)
    private String accountNumber;
    
    @Column(name = "full_name", nullable = false)
    private String fullName;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AccountType type;
    
    @Column(length = 1000)
    private String note;
    
    @Column(name = "parent_account_number")
    private String parentAccountNumber;
    
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
    
    public String getAccountNumber() {
        return accountNumber;
    }
    
    public void setAccountNumber(String accountNumber) {
        this.accountNumber = accountNumber;
    }
    
    public String getFullName() {
        return fullName;
    }
    
    public void setFullName(String fullName) {
        this.fullName = fullName;
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
    
    public String getParentAccountNumber() {
        return parentAccountNumber;
    }
    
    public void setParentAccountNumber(String parentAccountNumber) {
        this.parentAccountNumber = parentAccountNumber;
    }
    
    public String getJournalId() {
        return journalId;
    }
    
    public void setJournalId(String journalId) {
        this.journalId = journalId;
    }
}
