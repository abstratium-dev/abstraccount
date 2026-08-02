package dev.abstratium.abstraccount.service;

/**
 * Thrown when a mutating operation is attempted against a locked journal.
 * <p>
 * Locked journals protect closed periods from further changes. The exception
 * carries the journal id (and title, when known) so the caller can produce a
 * clear, actionable error message for the user.
 */
public class JournalLockedException extends RuntimeException {

    private final String journalId;
    private final String journalTitle;

    public JournalLockedException(String journalId) {
        this(journalId, null);
    }

    public JournalLockedException(String journalId, String journalTitle) {
        super("Journal " + (journalTitle != null ? "'" + journalTitle + "' " : "")
            + "(id=" + journalId + ") is locked and cannot be modified.");
        this.journalId = journalId;
        this.journalTitle = journalTitle;
    }

    public String getJournalId() {
        return journalId;
    }

    public String getJournalTitle() {
        return journalTitle;
    }
}
