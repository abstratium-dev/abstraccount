package dev.abstratium.abstraccount.service;

import dev.abstratium.abstraccount.entity.JournalEntity;
import dev.abstratium.abstraccount.entity.MacroEntity;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
class MacroServiceTest {
    
    @Inject
    MacroService macroService;
    
    @Inject
    EntityManager em;
    
    private String testJournalId;
    private String testJournal2Id;
    
    @BeforeEach
    @Transactional
    void setUp() {
        // Clean up
        em.createQuery("DELETE FROM MacroEntity").executeUpdate();
        em.createQuery("DELETE FROM JournalEntity").executeUpdate();
        
        // Create test journals
        JournalEntity journal1 = new JournalEntity();
        journal1.setTitle("Test Journal 1");
        journal1.setCurrency("CHF");
        em.persist(journal1);
        
        JournalEntity journal2 = new JournalEntity();
        journal2.setTitle("Test Journal 2");
        journal2.setCurrency("CHF");
        em.persist(journal2);
        
        em.flush();
        testJournalId = journal1.getId();
        testJournal2Id = journal2.getId();
    }
    
    @Test
    void testLoadAllMacros_empty() {
        List<MacroEntity> macros = macroService.loadAllMacros(testJournalId);
        assertNotNull(macros);
        assertTrue(macros.isEmpty());
    }
    
    @Test
    @Transactional
    void testLoadAllMacros_withMacros() {
        // Create test macros
        MacroEntity macro1 = new MacroEntity();
        macro1.setJournalId(testJournalId);
        macro1.setName("Macro1");
        macro1.setDescription("First macro");
        macro1.setParameters("[]");
        macro1.setTemplate("template1");
        em.persist(macro1);
        
        MacroEntity macro2 = new MacroEntity();
        macro2.setJournalId(testJournalId);
        macro2.setName("Macro2");
        macro2.setDescription("Second macro");
        macro2.setParameters("[]");
        macro2.setTemplate("template2");
        em.persist(macro2);
        
        em.flush();
        
        List<MacroEntity> macros = macroService.loadAllMacros(testJournalId);
        assertNotNull(macros);
        assertEquals(2, macros.size());
        assertEquals("Macro1", macros.get(0).getName());
        assertEquals("Macro2", macros.get(1).getName());
    }
    
    @Test
    @Transactional
    void testLoadAllMacros_journalIsolation() {
        // Create macro in journal 1
        MacroEntity macro1 = new MacroEntity();
        macro1.setJournalId(testJournalId);
        macro1.setName("Journal1Macro");
        macro1.setDescription("Macro in journal 1");
        macro1.setParameters("[]");
        macro1.setTemplate("template1");
        em.persist(macro1);
        
        // Create macro in journal 2
        MacroEntity macro2 = new MacroEntity();
        macro2.setJournalId(testJournal2Id);
        macro2.setName("Journal2Macro");
        macro2.setDescription("Macro in journal 2");
        macro2.setParameters("[]");
        macro2.setTemplate("template2");
        em.persist(macro2);
        
        em.flush();
        
        // Verify journal 1 only sees its macro
        List<MacroEntity> journal1Macros = macroService.loadAllMacros(testJournalId);
        assertEquals(1, journal1Macros.size());
        assertEquals("Journal1Macro", journal1Macros.get(0).getName());
        
        // Verify journal 2 only sees its macro
        List<MacroEntity> journal2Macros = macroService.loadAllMacros(testJournal2Id);
        assertEquals(1, journal2Macros.size());
        assertEquals("Journal2Macro", journal2Macros.get(0).getName());
    }
    
    @Test
    void testLoadMacro_notFound() {
        MacroEntity macro = macroService.loadMacro("nonexistent");
        assertNull(macro);
    }
    
    @Test
    @Transactional
    void testLoadMacro_found() {
        MacroEntity created = new MacroEntity();
        created.setJournalId(testJournalId);
        created.setName("TestMacro");
        created.setDescription("Test description");
        created.setParameters("[]");
        created.setTemplate("test template");
        em.persist(created);
        em.flush();
        
        MacroEntity loaded = macroService.loadMacro(created.getId());
        assertNotNull(loaded);
        assertEquals(created.getId(), loaded.getId());
        assertEquals("TestMacro", loaded.getName());
        assertEquals("Test description", loaded.getDescription());
    }
    
    @Test
    void testCreateMacro() {
        MacroEntity macro = new MacroEntity();
        macro.setJournalId(testJournalId);
        macro.setName("NewMacro");
        macro.setDescription("New macro description");
        macro.setParameters("[{\"name\":\"amount\",\"type\":\"amount\"}]");
        macro.setTemplate("{date} * Transaction");
        macro.setValidation("{\"balanceCheck\":true}");
        macro.setNotes("Test notes");
        
        MacroEntity created = macroService.createMacro(macro);
        
        assertNotNull(created);
        assertNotNull(created.getId());
        assertEquals("NewMacro", created.getName());
        assertEquals("New macro description", created.getDescription());
        assertEquals(testJournalId, created.getJournalId());
        assertNotNull(created.getCreatedDate());
        assertNotNull(created.getModifiedDate());
        assertEquals(created.getCreatedDate(), created.getModifiedDate());
    }
    
    @Test
    @Transactional
    void testUpdateMacro() {
        // Create initial macro
        MacroEntity macro = new MacroEntity();
        macro.setJournalId(testJournalId);
        macro.setName("OriginalName");
        macro.setDescription("Original description");
        macro.setParameters("[]");
        macro.setTemplate("original template");
        em.persist(macro);
        em.flush();
        
        String macroId = macro.getId();
        LocalDateTime originalCreatedDate = macro.getCreatedDate();
        LocalDateTime originalModifiedDate = macro.getModifiedDate();
        
        // Wait a bit to ensure modified date changes
        try {
            Thread.sleep(10);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        
        // Update the macro
        MacroEntity updated = new MacroEntity();
        updated.setId(macroId);
        updated.setJournalId(testJournalId);
        updated.setName("UpdatedName");
        updated.setDescription("Updated description");
        updated.setParameters("[{\"name\":\"test\"}]");
        updated.setTemplate("updated template");
        updated.setValidation("{\"balanceCheck\":false}");
        updated.setNotes("Updated notes");
        updated.setCreatedDate(originalCreatedDate);
        
        MacroEntity result = macroService.updateMacro(updated);
        
        assertNotNull(result);
        assertEquals(macroId, result.getId());
        assertEquals("UpdatedName", result.getName());
        assertEquals("Updated description", result.getDescription());
        assertEquals(originalCreatedDate, result.getCreatedDate());
        assertTrue(result.getModifiedDate().isAfter(originalModifiedDate) || 
                   result.getModifiedDate().isEqual(originalModifiedDate));
    }
    
    @Test
    @Transactional
    void testDeleteMacro() {
        // Create macro
        MacroEntity macro = new MacroEntity();
        macro.setJournalId(testJournalId);
        macro.setName("ToDelete");
        macro.setDescription("Will be deleted");
        macro.setParameters("[]");
        macro.setTemplate("template");
        em.persist(macro);
        em.flush();
        
        String macroId = macro.getId();
        
        // Verify it exists
        MacroEntity loaded = macroService.loadMacro(macroId);
        assertNotNull(loaded);
        
        // Delete it
        macroService.deleteMacro(macroId);
        
        // Verify it's gone
        MacroEntity deleted = macroService.loadMacro(macroId);
        assertNull(deleted);
    }
    
    @Test
    void testDeleteMacro_notFound() {
        // Should not throw exception
        assertDoesNotThrow(() -> macroService.deleteMacro("nonexistent"));
    }
    
    @Test
    void testCreateMacro_setsTimestamps() {
        MacroEntity macro = new MacroEntity();
        macro.setJournalId(testJournalId);
        macro.setName("TimestampTest");
        macro.setDescription("Testing timestamps");
        macro.setParameters("[]");
        macro.setTemplate("template");
        
        LocalDateTime beforeCreate = LocalDateTime.now().minusSeconds(1);
        MacroEntity created = macroService.createMacro(macro);
        LocalDateTime afterCreate = LocalDateTime.now().plusSeconds(1);
        
        assertNotNull(created.getCreatedDate());
        assertNotNull(created.getModifiedDate());
        assertTrue(created.getCreatedDate().isAfter(beforeCreate));
        assertTrue(created.getCreatedDate().isBefore(afterCreate));
        assertEquals(created.getCreatedDate(), created.getModifiedDate());
    }
    
    @Test
    @Transactional
    void testLoadAllMacros_orderedByName() {
        // Create macros in reverse alphabetical order
        MacroEntity macroZ = new MacroEntity();
        macroZ.setJournalId(testJournalId);
        macroZ.setName("ZMacro");
        macroZ.setDescription("Z");
        macroZ.setParameters("[]");
        macroZ.setTemplate("z");
        em.persist(macroZ);
        
        MacroEntity macroA = new MacroEntity();
        macroA.setJournalId(testJournalId);
        macroA.setName("AMacro");
        macroA.setDescription("A");
        macroA.setParameters("[]");
        macroA.setTemplate("a");
        em.persist(macroA);
        
        MacroEntity macroM = new MacroEntity();
        macroM.setJournalId(testJournalId);
        macroM.setName("MMacro");
        macroM.setDescription("M");
        macroM.setParameters("[]");
        macroM.setTemplate("m");
        em.persist(macroM);
        
        em.flush();
        
        List<MacroEntity> macros = macroService.loadAllMacros(testJournalId);
        assertEquals(3, macros.size());
        assertEquals("AMacro", macros.get(0).getName());
        assertEquals("MMacro", macros.get(1).getName());
        assertEquals("ZMacro", macros.get(2).getName());
    }
}
