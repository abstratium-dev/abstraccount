package dev.abstratium.abstraccount.service;

import dev.abstratium.abstraccount.entity.AccountEntity;
import dev.abstratium.abstraccount.model.Journal;
import dev.abstratium.abstraccount.model.JournalParser;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.jboss.logging.Logger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Integration test to verify that all accounts in a hierarchical chart of accounts
 * are properly parsed, persisted, and retrieved with correct parent-child relationships.
 */
@QuarkusTest
class JournalAccountHierarchyTest {
    
    private static final Logger LOG = Logger.getLogger(JournalAccountHierarchyTest.class);
    
    @Inject
    JournalParser parser;
    
    @Inject
    JournalModelPersistenceService modelPersistenceService;
    
    @Inject
    JournalPersistenceService persistenceService;
    
    @BeforeEach
    @Transactional
    void setUp() {
        persistenceService.deleteAll();
    }
    
    @Test
    void testSwissChartOfAccountsHierarchy() {
        // This test uses a realistic Swiss chart of accounts structure
        // similar to what would be in abstratium-2024.journal
        String journalContent = """
            ; title: Test Company
            ; currency: CHF
            
            commodity CHF 1000.00
            
            account 1 Actifs / Assets
              ; type:Asset
              ; note:This group includes all accounts related to what the company owns
            
            account 1 Actifs / Assets:10 Actif circulants / Current Assets
              ; type:Asset
            
            account 1 Actifs / Assets:10 Actif circulants / Current Assets:100 Liquidites / Cash and Cash Equivalents
              ; type:Cash
            
            account 1 Actifs / Assets:10 Actif circulants / Current Assets:100 Liquidites / Cash and Cash Equivalents:1000 Caisse / Cash on Hand
              ; type:Cash
            
            account 1 Actifs / Assets:10 Actif circulants / Current Assets:100 Liquidites / Cash and Cash Equivalents:1020 Banque / Bank
              ; type:Cash
            
            account 1 Actifs / Assets:10 Actif circulants / Current Assets:110 Creances / Receivables
              ; type:Asset
            
            account 1 Actifs / Assets:10 Actif circulants / Current Assets:110 Creances / Receivables:1100 Creances resultant de ventes et de prestations de services / Trade Receivables
              ; type:Asset
            
            account 2 Passif / Equity
              ; type:Equity
              ; note:Equity represents the owners' claims on the company's assets after liabilities are subtracted
            
            account 2 Passif / Equity:20 Capital propre / Equity Capital
              ; type:Equity
            
            account 2 Passif / Equity:20 Capital propre / Equity Capital:200 Capital social / Share Capital
              ; type:Equity
            
            account 3 Produits d'exploitation des ventes de biens et de prestations de services / Net proceeds from sales of goods and services
              ; type:Revenue
            
            account 3 Produits d'exploitation des ventes de biens et de prestations de services / Net proceeds from sales of goods and services:30 Ventes de marchandises et de produits finis / Sales of Goods
              ; type:Revenue
            
            account 4 Charges de Materiel, de Biens de Prestations de Services et d'Energie / Cost of Materials, Goods, Services and Energy Costs
              ; type:Expense
              ; note:Use this if I have to purchase stuff to make stuff I sell
            
            account 5 Charges de Personnel / Staff Costs
              ; type:Expense
            
            account 6 Autres Charges d'Explotation, Amortissements et Corrections de Valeur et Resultats Financiers / Other Operating Expenses, Depreciations and Value Adjustments, Financial result
              ; type:Expense
            
            account 8 Charges et Produits hors Explotation, Extraordinaires, Uniques ou Hors Periode / Non-Operational, Extraordinary, Non-Recurring or Prior-Period Expenses and Income
              ; type:Expense
            
            2025-01-01 * Opening Balance
                1 Actifs / Assets:10 Actif circulants / Current Assets:100 Liquidites / Cash and Cash Equivalents:1020 Banque / Bank    CHF 10000.00
                2 Passif / Equity:20 Capital propre / Equity Capital:200 Capital social / Share Capital    CHF -10000.00
            """;
        
        // Parse the journal
        Journal journal = parser.parse(journalContent);
        
        LOG.infof("Parsed journal with %d accounts", journal.accounts().size());
        for (var account : journal.accounts()) {
            LOG.debugf("Parsed account: %s (parent: %s)", 
                account.fullName(), 
                account.parent() != null ? account.parent().fullName() : "null");
        }
        
        // Expected accounts (17 total):
        // 1. 1 Actifs / Assets
        // 2. 1 Actifs / Assets:10 Actif circulants / Current Assets
        // 3. 1 Actifs / Assets:10 Actif circulants / Current Assets:100 Liquidites / Cash and Cash Equivalents
        // 4. 1 Actifs / Assets:10 Actif circulants / Current Assets:100 Liquidites / Cash and Cash Equivalents:1000 Caisse / Cash on Hand
        // 5. 1 Actifs / Assets:10 Actif circulants / Current Assets:100 Liquidites / Cash and Cash Equivalents:1020 Banque / Bank
        // 6. 1 Actifs / Assets:10 Actif circulants / Current Assets:110 Creances / Receivables
        // 7. 1 Actifs / Assets:10 Actif circulants / Current Assets:110 Creances / Receivables:1100 Creances resultant de ventes et de prestations de services / Trade Receivables
        // 8. 2 Passif / Equity
        // 9. 2 Passif / Equity:20 Capital propre / Equity Capital
        // 10. 2 Passif / Equity:20 Capital propre / Equity Capital:200 Capital social / Share Capital
        // 11. 3 Produits d'exploitation des ventes de biens et de prestations de services / Net proceeds from sales of goods and services
        // 12. 3 Produits d'exploitation des ventes de biens et de prestations de services / Net proceeds from sales of goods and services:30 Ventes de marchandises et de produits finis / Sales of Goods
        // 13. 4 Charges de Materiel, de Biens de Prestations de Services et d'Energie / Cost of Materials, Goods, Services and Energy Costs
        // 14. 5 Charges de Personnel / Staff Costs
        // 15. 6 Autres Charges d'Explotation, Amortissements et Corrections de Valeur et Resultats Financiers / Other Operating Expenses, Depreciations and Value Adjustments, Financial result
        // 16. 8 Charges et Produits hors Explotation, Extraordinaires, Uniques ou Hors Periode / Non-Operational, Extraordinary, Non-Recurring or Prior-Period Expenses and Income
        
        assertEquals(16, journal.accounts().size(), "Should have 16 accounts");
        
        // Persist the journal
        modelPersistenceService.persistJournalModel(journal);
        
        // Retrieve all accounts from database
        List<AccountEntity> savedAccounts = persistenceService.findAllAccounts();
        
        LOG.infof("Retrieved %d accounts from database", savedAccounts.size());
        for (AccountEntity account : savedAccounts) {
            LOG.debugf("Saved account: %s (parent: %s)", 
                account.getAccountName(), 
                account.getParentAccountId());
        }
        
        // Verify all accounts were saved
        assertEquals(16, savedAccounts.size(), "All 16 accounts should be saved to database");
        
        // Verify specific hierarchical relationships
        
        // Root account: 1 Actifs / Assets
        AccountEntity assets = findAccountByNumber(savedAccounts, "1");
        assertNotNull(assets, "Assets account should exist");
        assertNull(assets.getParentAccountId(), "Assets should have no parent");
        assertEquals("1", assets.getAccountNumber());
        
        // Level 1: 1 Actifs / Assets:10 Actif circulants / Current Assets
        AccountEntity currentAssets = findAccountByNumber(savedAccounts, "10");
        assertNotNull(currentAssets, "Current Assets account should exist");
        assertEquals(assets.getId(), currentAssets.getParentAccountId(), "Current Assets parent should be assets");
        assertEquals("10", currentAssets.getAccountNumber());
        
        // Level 2: 1 Actifs / Assets:10 Actif circulants / Current Assets:100 Liquidites / Cash and Cash Equivalents
        AccountEntity cash = findAccountByNumber(savedAccounts, "100");
        assertNotNull(cash, "Cash account should exist");
        assertEquals(currentAssets.getId(), cash.getParentAccountId(), "Cash parent should be current assets");
        assertEquals("100", cash.getAccountNumber());
        
        // Level 3: 1 Actifs / Assets:10 Actif circulants / Current Assets:100 Liquidites / Cash and Cash Equivalents:1020 Banque / Bank
        AccountEntity bank = findAccountByNumber(savedAccounts, "1020");
        assertNotNull(bank, "Bank account should exist");
        assertEquals(cash.getId(), bank.getParentAccountId(), "Bank parent should be cash");
        assertEquals("1020", bank.getAccountNumber());
        
        // Verify equity hierarchy
        AccountEntity equity = findAccountByNumber(savedAccounts, "2");
        assertNotNull(equity, "Equity account should exist");
        assertNull(equity.getParentAccountId(), "Equity should have no parent");
        assertEquals("2", equity.getAccountNumber());
        
        AccountEntity equityCapital = findAccountByNumber(savedAccounts, "20");
        assertNotNull(equityCapital, "Equity Capital account should exist");
        assertEquals(equity.getId(), equityCapital.getParentAccountId(), "Equity Capital parent should be equity");
        assertEquals("20", equityCapital.getAccountNumber());
        
        AccountEntity shareCapital = findAccountByNumber(savedAccounts, "200");
        assertNotNull(shareCapital, "Share Capital account should exist");
        assertEquals(equityCapital.getId(), shareCapital.getParentAccountId(), "Share Capital parent should be equity capital");
        assertEquals("200", shareCapital.getAccountNumber());
        
        // Verify all root accounts (those with no parent)
        long rootAccountCount = savedAccounts.stream()
            .filter(a -> a.getParentAccountId() == null)
            .count();
        assertEquals(7, rootAccountCount, "Should have 7 root accounts (1, 2, 3, 4, 5, 6, 8)");
        
        // Verify that each account number is unique within the journal
        long uniqueAccountNumbers = savedAccounts.stream()
            .map(AccountEntity::getAccountNumber)
            .distinct()
            .count();
        assertEquals(16, uniqueAccountNumbers, "All 16 accounts should have unique account numbers");
    }
    
    private AccountEntity findAccountByNumber(List<AccountEntity> accounts, String accountNumber) {
        return accounts.stream()
            .filter(a -> accountNumber.equals(a.getAccountNumber()))
            .findFirst()
            .orElse(null);
    }
}
