package dev.abstratium.abstraccount.service;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class CsvLineParserTest {

    @Test
    void testParseFields_simple() {
        List<String> fields = CsvLineParser.parseFields("a,b,c");

        assertEquals(3, fields.size());
        assertEquals("a", fields.get(0));
        assertEquals("b", fields.get(1));
        assertEquals("c", fields.get(2));
    }

    @Test
    void testParseFields_quotedFieldWithComma() {
        List<String> fields = CsvLineParser.parseFields("\"P00000001\",\"Smith, John\",\"true\"");

        assertEquals(3, fields.size());
        assertEquals("P00000001", fields.get(0));
        assertEquals("Smith, John", fields.get(1));
        assertEquals("true", fields.get(2));
    }

    @Test
    void testParseFields_doubledQuoteBecomesLiteralQuote() {
        List<String> fields = CsvLineParser.parseFields("\"He said \"\"hi\"\"\",plain");

        assertEquals(2, fields.size());
        assertEquals("He said \"hi\"", fields.get(0));
        assertEquals("plain", fields.get(1));
    }

    @Test
    void testParseFields_emptyLineYieldsSingleEmptyField() {
        List<String> fields = CsvLineParser.parseFields("");

        assertEquals(1, fields.size());
        assertEquals("", fields.get(0));
    }

    @Test
    void testParseFields_trailingEmptyField() {
        List<String> fields = CsvLineParser.parseFields("a,b,");

        assertEquals(3, fields.size());
        assertEquals("a", fields.get(0));
        assertEquals("b", fields.get(1));
        assertEquals("", fields.get(2));
    }
}
