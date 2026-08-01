package dev.abstratium.abstraccount.model;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class TagTest {

    @Test
    void simpleCreatesTagWithNullValue() {
        Tag tag = Tag.simple("OpeningBalances");
        assertEquals("OpeningBalances", tag.key());
        assertNull(tag.value());
        assertTrue(tag.isSimple());
    }

    @Test
    void keyValueCreatesTagWithValue() {
        Tag tag = Tag.keyValue("invoice", "INV-001");
        assertEquals("invoice", tag.key());
        assertEquals("INV-001", tag.value());
        assertFalse(tag.isSimple());
    }

    @Test
    void isSimpleReturnsTrueForEmptyValue() {
        Tag tag = new Tag("note", "");
        assertTrue(tag.isSimple());
    }

    @Test
    void isSimpleReturnsFalseForNonEmptyValue() {
        Tag tag = new Tag("note", "some note");
        assertFalse(tag.isSimple());
    }

    @Test
    void tagsEqualWhenKeyAndValueMatch() {
        Tag tag1 = Tag.keyValue("invoice", "INV-001");
        Tag tag2 = Tag.keyValue("invoice", "INV-001");
        assertEquals(tag1, tag2);
        assertEquals(tag1.hashCode(), tag2.hashCode());
    }

    @Test
    void tagsNotEqualWhenValuesDiffer() {
        Tag tag1 = Tag.keyValue("invoice", "INV-001");
        Tag tag2 = Tag.keyValue("invoice", "INV-002");
        assertNotEquals(tag1, tag2);
    }

    @Test
    void tagsNotEqualWhenKeysDiffer() {
        Tag tag1 = Tag.keyValue("invoice", "INV-001");
        Tag tag2 = Tag.keyValue("project", "INV-001");
        assertNotEquals(tag1, tag2);
    }
}
