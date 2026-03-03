package dev.abstratium.abstraccount.service;

import dev.abstratium.abstraccount.entity.AccountEntity;
import dev.abstratium.abstraccount.entity.JournalEntity;
import dev.abstratium.abstraccount.model.AccountType;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
public class AccountServiceTest {
    
    @Inject
    AccountService accountService;
    
    @Inject
    EntityManager em;
    
    private String testJournalId;
    private String account1Id;
    private String account10Id;
    private String account100Id;
    private String account1020Id;
    
    @Transactional
    public void setup() {
        testJournalId = createJournal();
        
        // Create account hierarchy: 1 -> 10 -> 100 -> 1020
        account1Id = UUID.randomUUID().toString();
        AccountEntity account1 = new AccountEntity();
        account1.setId(account1Id);
        account1.setJournalId(testJournalId);
        account1.setName("1 Assets");
        account1.setType(AccountType.ASSET);
        account1.setAccountOrder(1);
        em.persist(account1);
        
        account10Id = UUID.randomUUID().toString();
        AccountEntity account10 = new AccountEntity();
        account10.setId(account10Id);
        account10.setJournalId(testJournalId);
        account10.setName("10 Current Assets");
        account10.setType(AccountType.ASSET);
        account10.setParentAccountId(account1Id);
        account10.setAccountOrder(2);
        em.persist(account10);
        
        account100Id = UUID.randomUUID().toString();
        AccountEntity account100 = new AccountEntity();
        account100.setId(account100Id);
        account100.setJournalId(testJournalId);
        account100.setName("100 Cash");
        account100.setType(AccountType.ASSET);
        account100.setParentAccountId(account10Id);
        account100.setAccountOrder(3);
        em.persist(account100);
        
        account1020Id = UUID.randomUUID().toString();
        AccountEntity account1020 = new AccountEntity();
        account1020.setId(account1020Id);
        account1020.setJournalId(testJournalId);
        account1020.setName("1020 Bank Account");
        account1020.setType(AccountType.ASSET);
        account1020.setParentAccountId(account100Id);
        account1020.setAccountOrder(4);
        em.persist(account1020);
    }
    
    @Test
    @Transactional
    public void testFindAccountByCodePath_success() {
        setup();
        AccountEntity found = accountService.findAccountByCodePath(testJournalId, "1:10:100:1020", null);
        
        assertNotNull(found);
        assertEquals(account1020Id, found.getId());
        assertEquals("1020 Bank Account", found.getName());
    }
    
    @Test
    @Transactional
    public void testFindAccountByCodePath_withFilter_success() {
        setup();
        AccountEntity found = accountService.findAccountByCodePath(
            testJournalId, 
            "1:10:100:1020", 
            "^1.*:10.*:100.*:1020.*$"
        );
        
        assertNotNull(found);
        assertEquals(account1020Id, found.getId());
    }
    
    @Test
    @Transactional
    public void testFindAccountByCodePath_filterMismatch_fails() {
        setup();
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> accountService.findAccountByCodePath(
                testJournalId, 
                "1:10:100:1020", 
                "^6.*$"  // Wrong filter
            )
        );
        
        assertTrue(exception.getMessage().contains("does not match required filter"));
    }
    
    @Test
    @Transactional
    public void testFindAccountByCodePath_notFound_fails() {
        setup();
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> accountService.findAccountByCodePath(testJournalId, "9:99:999", null)
        );
        
        assertTrue(exception.getMessage().contains("No account found"));
    }
    
    private String createJournal() {
        JournalEntity journal = new JournalEntity();
        journal.setId(UUID.randomUUID().toString());
        journal.setTitle("Test Journal");
        journal.setCurrency("CHF");
        em.persist(journal);
        em.flush();
        return journal.getId();
    }
}
