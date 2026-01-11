package dev.abstratium.demo.entity;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests for entity @PrePersist methods to ensure ID generation works correctly.
 */
class EntityPrePersistTest {

    @Test
    void demoShouldGenerateIdWhenNull() {
        Demo demo = new Demo();
        assertNull(demo.getId());
        
        demo.prePersist();
        
        assertNotNull(demo.getId());
        assertEquals(36, demo.getId().length()); // UUID length
    }

    @Test
    void demoShouldNotOverrideExistingId() {
        Demo demo = new Demo();
        String existingId = "existing-id-123";
        demo.setId(existingId);
        
        demo.prePersist();
        
        assertEquals(existingId, demo.getId());
    }

    @Test
    void demoShouldGenerateUniqueIds() {
        Demo demo1 = new Demo();
        Demo demo2 = new Demo();
        
        demo1.prePersist();
        demo2.prePersist();
        
        assertNotNull(demo1.getId());
        assertNotNull(demo2.getId());
        assertNotEquals(demo1.getId(), demo2.getId());
    }

    @Test
    void demoShouldGenerateValidUuidFormat() {
        Demo demo = new Demo();
        
        demo.prePersist();
        
        // UUID format: 8-4-4-4-12 characters separated by hyphens
        String id = demo.getId();
        assertTrue(id.matches("[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"));
    }

    @Test
    void demoPrePersistShouldBeIdempotent() {
        Demo demo = new Demo();
        
        demo.prePersist();
        String firstId = demo.getId();
        
        demo.prePersist();
        String secondId = demo.getId();
        
        assertEquals(firstId, secondId);
    }
}
