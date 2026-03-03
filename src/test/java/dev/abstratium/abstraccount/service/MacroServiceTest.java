package dev.abstratium.abstraccount.service;

import dev.abstratium.abstraccount.entity.MacroEntity;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
public class MacroServiceTest {
    
    @Inject
    MacroService macroService;
    
    @Inject
    EntityManager em;
    
    private String testMacroId;
    
    @BeforeEach
    @Transactional
    public void setup() {
        // Clean up existing macros
        em.createQuery("DELETE FROM MacroEntity").executeUpdate();
        
        // Create test macro
        MacroEntity macro = new MacroEntity();
        macro.setName("TestMacro");
        macro.setDescription("Test Description");
        macro.setParameters("[]");
        macro.setTemplate("Test template");
        macro.setValidation(null);
        macro.setNotes("Test notes");
        em.persist(macro);
        em.flush();
        testMacroId = macro.getId();
    }
    
    @Test
    public void testLoadAllMacros() {
        List<MacroEntity> macros = macroService.loadAllMacros();
        assertEquals(1, macros.size());
        assertEquals("TestMacro", macros.get(0).getName());
    }
    
    @Test
    public void testLoadMacro() {
        MacroEntity macro = macroService.loadMacro(testMacroId);
        assertNotNull(macro);
        assertEquals("TestMacro", macro.getName());
    }
    
    @Test
    public void testCreateMacro() {
        MacroEntity newMacro = new MacroEntity();
        newMacro.setName("NewMacro");
        newMacro.setDescription("New Description");
        newMacro.setParameters("[]");
        newMacro.setTemplate("New template");
        
        MacroEntity created = macroService.createMacro(newMacro);
        assertNotNull(created.getId());
        assertEquals("NewMacro", created.getName());
        
        List<MacroEntity> allMacros = macroService.loadAllMacros();
        assertEquals(2, allMacros.size());
    }
    
    @Test
    public void testUpdateMacro() {
        MacroEntity macro = macroService.loadMacro(testMacroId);
        macro.setName("UpdatedMacro");
        
        MacroEntity updated = macroService.updateMacro(macro);
        assertEquals("UpdatedMacro", updated.getName());
        
        MacroEntity reloaded = macroService.loadMacro(testMacroId);
        assertEquals("UpdatedMacro", reloaded.getName());
    }
    
    @Test
    public void testDeleteMacro() {
        macroService.deleteMacro(testMacroId);
        
        MacroEntity deleted = macroService.loadMacro(testMacroId);
        assertNull(deleted);
        
        List<MacroEntity> allMacros = macroService.loadAllMacros();
        assertEquals(0, allMacros.size());
    }
}
