package dev.abstratium.abstraccount.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * JPA entity for Macro.
 * Macros are transaction templates that can be executed through the UI.
 */
@Entity
@Table(name = "T_macro")
public class MacroEntity {
    
    @Id
    @Column(length = 36)
    private String id;
    
    @Column(name = "journal_id", nullable = false, length = 36)
    private String journalId;
    
    @Column(nullable = false, length = 100)
    private String name;
    
    @Column(nullable = false, length = 500)
    private String description;
    
    @Column(nullable = false, columnDefinition = "TEXT")
    private String parameters;
    
    @Column(nullable = false, columnDefinition = "TEXT")
    private String template;
    
    @Column(columnDefinition = "TEXT")
    private String validation;
    
    @Column(columnDefinition = "TEXT")
    private String notes;
    
    @Column(name = "created_date", nullable = false)
    private LocalDateTime createdDate;
    
    @Column(name = "modified_date", nullable = false)
    private LocalDateTime modifiedDate;
    
    public MacroEntity() {
        this.id = UUID.randomUUID().toString();
        LocalDateTime now = LocalDateTime.now();
        this.createdDate = now;
        this.modifiedDate = now;
    }
    
    public String getId() {
        return id;
    }
    
    public void setId(String id) {
        this.id = id;
    }
    
    public String getJournalId() {
        return journalId;
    }
    
    public void setJournalId(String journalId) {
        this.journalId = journalId;
    }
    
    public String getName() {
        return name;
    }
    
    public void setName(String name) {
        this.name = name;
    }
    
    public String getDescription() {
        return description;
    }
    
    public void setDescription(String description) {
        this.description = description;
    }
    
    public String getParameters() {
        return parameters;
    }
    
    public void setParameters(String parameters) {
        this.parameters = parameters;
    }
    
    public String getTemplate() {
        return template;
    }
    
    public void setTemplate(String template) {
        this.template = template;
    }
    
    public String getValidation() {
        return validation;
    }
    
    public void setValidation(String validation) {
        this.validation = validation;
    }
    
    public String getNotes() {
        return notes;
    }
    
    public void setNotes(String notes) {
        this.notes = notes;
    }
    
    public LocalDateTime getCreatedDate() {
        return createdDate;
    }
    
    public void setCreatedDate(LocalDateTime createdDate) {
        this.createdDate = createdDate;
    }
    
    public LocalDateTime getModifiedDate() {
        return modifiedDate;
    }
    
    public void setModifiedDate(LocalDateTime modifiedDate) {
        this.modifiedDate = modifiedDate;
    }
    
    @PreUpdate
    public void preUpdate() {
        this.modifiedDate = LocalDateTime.now();
    }
}
