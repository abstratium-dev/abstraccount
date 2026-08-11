package dev.abstratium.abstraccount.service;

import java.util.ArrayList;
import java.util.List;

/**
 * Small utility for parsing a single CSV line into its fields, handling
 * quoted fields and doubled quotes as a literal quote character (e.g.
 * {@code ""} -&gt; {@code "}). Shared by any code that needs to parse
 * comma-separated data pasted or uploaded by the user.
 */
public final class CsvLineParser {

    private CsvLineParser() {
    }

    /**
     * Parse CSV fields from a line, handling quoted fields.
     * Supports the standard CSV convention of doubling quotes inside quoted
     * fields to represent a literal quote character (e.g. {@code ""} -&gt; {@code "}).
     */
    public static List<String> parseFields(String line) {
        List<String> fields = new ArrayList<>();
        StringBuilder currentField = new StringBuilder();
        boolean inQuotes = false;

        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);

            if (c == '"' && inQuotes && i + 1 < line.length() && line.charAt(i + 1) == '"') {
                // Doubled quote inside a quoted field -> literal quote
                currentField.append('"');
                i++; // skip the next quote
            } else if (c == '"') {
                inQuotes = !inQuotes;
            } else if (c == ',' && !inQuotes) {
                fields.add(currentField.toString());
                currentField = new StringBuilder();
            } else {
                currentField.append(c);
            }
        }
        fields.add(currentField.toString());
        return fields;
    }
}
