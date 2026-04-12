package dev.abstratium.abstraccount.service;

import dev.abstratium.abstraccount.entity.AccountEntity;
import dev.abstratium.abstraccount.entity.TransactionEntity;
import dev.abstratium.abstraccount.model.AccountType;

import jakarta.enterprise.context.ApplicationScoped;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Predicate;
import java.util.regex.Pattern;
import java.util.regex.PatternSyntaxException;

/**
 * Parses an Entry Query Language (EQL) expression into a {@link Predicate} over
 * {@link TransactionEntity}.
 *
 * <p>EQL grammar (simplified EBNF):
 * <pre>
 *   query      ::= or_expr EOF
 *   or_expr    ::= and_expr ( OR and_expr )*
 *   and_expr   ::= not_expr ( AND not_expr )*
 *   not_expr   ::= NOT not_expr | atom
 *   atom       ::= '(' or_expr ')' | predicate
 *   predicate  ::= date_pred | partner_pred | description_pred | commodity_pred
 *                | amount_pred | note_pred | tag_pred
 *                | accounttype_pred | accountname_pred
 * </pre>
 *
 * <p>Adjacent atoms separated only by whitespace are treated as implicit AND.
 * See docs/QUERY_LANGUAGE.md for the full specification.
 */
@ApplicationScoped
public class EntryQueryParser {

    // -------------------------------------------------------------------------
    // Public API
    // -------------------------------------------------------------------------

    /**
     * Parses a query string and returns the corresponding {@link Predicate}.
     *
     * @param query        the EQL expression (may be {@code null} or blank)
     * @param accountsById map of account ID → entity, used for accountname / accounttype predicates
     * @return a predicate; returns an always-true predicate for blank input
     * @throws QueryParseException if the expression is syntactically invalid
     */
    public Predicate<TransactionEntity> parse(String query, Map<String, AccountEntity> accountsById) {
        if (query == null || query.isBlank()) {
            return tx -> true;
        }
        Lexer lexer = new Lexer(query);
        List<Token> tokens = lexer.tokenize();
        Parser parser = new Parser(tokens, accountsById);
        return parser.parse();
    }

    // -------------------------------------------------------------------------
    // Exception
    // -------------------------------------------------------------------------

    /**
     * Thrown when a query expression cannot be parsed.
     */
    public static class QueryParseException extends RuntimeException {
        private final int position;

        public QueryParseException(String message, int position) {
            super(message + " (at position " + position + ")");
            this.position = position;
        }

        public int getPosition() {
            return position;
        }
    }

    // -------------------------------------------------------------------------
    // Token types
    // -------------------------------------------------------------------------

    enum TokenType {
        AND, OR, NOT, LPAREN, RPAREN, PREDICATE, EOF
    }

    record Token(TokenType type, String value, int position) {
        @Override
        public String toString() {
            return type + "(" + value + ")@" + position;
        }
    }

    // -------------------------------------------------------------------------
    // Lexer
    // -------------------------------------------------------------------------

    static class Lexer {
        private final String input;
        private int pos = 0;

        Lexer(String input) {
            this.input = input;
        }

        List<Token> tokenize() {
            List<Token> tokens = new ArrayList<>();
            while (pos < input.length()) {
                skipWhitespace();
                if (pos >= input.length()) break;

                char c = input.charAt(pos);
                int tokenStart = pos;

                if (c == '(') {
                    tokens.add(new Token(TokenType.LPAREN, "(", tokenStart));
                    pos++;
                } else if (c == ')') {
                    tokens.add(new Token(TokenType.RPAREN, ")", tokenStart));
                    pos++;
                } else {
                    String word = readWord();
                    String upper = word.toUpperCase();
                    if ("AND".equals(upper)) {
                        tokens.add(new Token(TokenType.AND, word, tokenStart));
                    } else if ("OR".equals(upper)) {
                        tokens.add(new Token(TokenType.OR, word, tokenStart));
                    } else if ("NOT".equals(upper)) {
                        tokens.add(new Token(TokenType.NOT, word, tokenStart));
                    } else {
                        tokens.add(new Token(TokenType.PREDICATE, word, tokenStart));
                    }
                }
            }
            tokens.add(new Token(TokenType.EOF, "", pos));
            return tokens;
        }

        private void skipWhitespace() {
            while (pos < input.length() && Character.isWhitespace(input.charAt(pos))) {
                pos++;
            }
        }

        /**
         * Reads a "word" which may contain quoted strings, regex literals, and colons.
         * Stops at whitespace or unquoted parentheses.
         */
        private String readWord() {
            StringBuilder sb = new StringBuilder();
            while (pos < input.length()) {
                char c = input.charAt(pos);
                if (c == '"' || c == '\'') {
                    sb.append(readQuoted(c));
                } else if (c == '/') {
                    sb.append(readRegex());
                } else if (Character.isWhitespace(c) || c == '(' || c == ')') {
                    break;
                } else {
                    sb.append(c);
                    pos++;
                }
            }
            return sb.toString();
        }

        private String readQuoted(char delimiter) {
            StringBuilder sb = new StringBuilder();
            sb.append(delimiter);
            pos++;
            while (pos < input.length()) {
                char c = input.charAt(pos);
                if (c == '\\' && pos + 1 < input.length()) {
                    pos++;
                    sb.append(input.charAt(pos));
                    pos++;
                } else if (c == delimiter) {
                    sb.append(c);
                    pos++;
                    break;
                } else {
                    sb.append(c);
                    pos++;
                }
            }
            return sb.toString();
        }

        private String readRegex() {
            StringBuilder sb = new StringBuilder();
            sb.append('/');
            pos++;
            while (pos < input.length()) {
                char c = input.charAt(pos);
                if (c == '\\' && pos + 1 < input.length()) {
                    sb.append(c);
                    pos++;
                    sb.append(input.charAt(pos));
                    pos++;
                } else if (c == '/') {
                    sb.append(c);
                    pos++;
                    while (pos < input.length() && Character.isLetter(input.charAt(pos))) {
                        sb.append(input.charAt(pos));
                        pos++;
                    }
                    break;
                } else {
                    sb.append(c);
                    pos++;
                }
            }
            return sb.toString();
        }
    }

    // -------------------------------------------------------------------------
    // Recursive-descent parser
    // -------------------------------------------------------------------------

    static class Parser {
        private final List<Token> tokens;
        private int idx = 0;
        private final Map<String, AccountEntity> accountsById;

        Parser(List<Token> tokens, Map<String, AccountEntity> accountsById) {
            this.tokens = tokens;
            this.accountsById = accountsById;
        }

        Predicate<TransactionEntity> parse() {
            Predicate<TransactionEntity> filter = parseOrExpr();
            Token eof = peek();
            if (eof.type() != TokenType.EOF) {
                throw new QueryParseException("Unexpected token '" + eof.value() + "'", eof.position());
            }
            return filter;
        }

        private Predicate<TransactionEntity> parseOrExpr() {
            Predicate<TransactionEntity> left = parseAndExpr();
            while (peek().type() == TokenType.OR) {
                consume(TokenType.OR);
                Predicate<TransactionEntity> right = parseAndExpr();
                left = left.or(right);
            }
            return left;
        }

        private Predicate<TransactionEntity> parseAndExpr() {
            Predicate<TransactionEntity> left = parseNotExpr();
            while (isStartOfAtom() || peek().type() == TokenType.AND) {
                if (peek().type() == TokenType.AND) {
                    consume(TokenType.AND);
                }
                Predicate<TransactionEntity> right = parseNotExpr();
                left = left.and(right);
            }
            return left;
        }

        private boolean isStartOfAtom() {
            TokenType t = peek().type();
            return t == TokenType.NOT || t == TokenType.LPAREN || t == TokenType.PREDICATE;
        }

        private Predicate<TransactionEntity> parseNotExpr() {
            if (peek().type() == TokenType.NOT) {
                Token notToken = consume(TokenType.NOT);
                if (!isStartOfAtom()) {
                    throw new QueryParseException("Expected expression after NOT", notToken.position());
                }
                Predicate<TransactionEntity> inner = parseNotExpr();
                return inner.negate();
            }
            return parseAtom();
        }

        private Predicate<TransactionEntity> parseAtom() {
            if (peek().type() == TokenType.LPAREN) {
                consume(TokenType.LPAREN);
                Predicate<TransactionEntity> inner = parseOrExpr();
                if (peek().type() != TokenType.RPAREN) {
                    throw new QueryParseException("Expected ')'", peek().position());
                }
                consume(TokenType.RPAREN);
                return inner;
            }
            Token token = consume(TokenType.PREDICATE);
            return buildPredicateFilter(token.value(), token.position());
        }

        private Token peek() {
            return tokens.get(idx);
        }

        private Token consume(TokenType expected) {
            Token t = tokens.get(idx);
            if (t.type() != expected) {
                throw new QueryParseException(
                        "Expected " + expected + " but found '" + t.value() + "'", t.position());
            }
            idx++;
            return t;
        }

        // ------------------------------------------------------------------
        // Predicate builder
        // ------------------------------------------------------------------

        private Predicate<TransactionEntity> buildPredicateFilter(String raw, int position) {
            List<String> parts = splitPredicateParts(raw);
            if (parts.isEmpty()) {
                throw new QueryParseException("Empty predicate", position);
            }
            String keyword = parts.get(0).toLowerCase();

            return switch (keyword) {
                case "date"        -> buildDateFilter(parts, position);
                case "partner"     -> buildPartnerFilter(parts, position);
                case "description" -> buildDescriptionFilter(parts, position);
                case "commodity"   -> buildCommodityFilter(parts, position);
                case "amount"      -> buildAmountFilter(parts, position);
                case "note"        -> buildNoteFilter(parts, position);
                case "tag"         -> buildTagFilter(parts, position);
                case "accounttype" -> buildAccountTypeFilter(parts, position);
                case "accountname" -> buildAccountNameFilter(parts, position);
                default            -> throw new QueryParseException("Unknown predicate keyword '" + keyword + "'", position);
            };
        }

        /**
         * Splits a raw predicate token by {@code :}, respecting quoted strings and regex literals.
         */
        static List<String> splitPredicateParts(String raw) {
            List<String> parts = new ArrayList<>();
            StringBuilder current = new StringBuilder();
            int i = 0;
            while (i < raw.length()) {
                char c = raw.charAt(i);
                if (c == ':') {
                    parts.add(current.toString());
                    current = new StringBuilder();
                    i++;
                } else if (c == '"' || c == '\'') {
                    char delim = c;
                    current.append(c);
                    i++;
                    while (i < raw.length()) {
                        char d = raw.charAt(i);
                        if (d == '\\' && i + 1 < raw.length()) {
                            current.append(d);
                            i++;
                            current.append(raw.charAt(i));
                            i++;
                        } else if (d == delim) {
                            current.append(d);
                            i++;
                            break;
                        } else {
                            current.append(d);
                            i++;
                        }
                    }
                } else if (c == '/') {
                    current.append(c);
                    i++;
                    while (i < raw.length()) {
                        char d = raw.charAt(i);
                        if (d == '\\' && i + 1 < raw.length()) {
                            current.append(d);
                            i++;
                            current.append(raw.charAt(i));
                            i++;
                        } else if (d == '/') {
                            current.append(d);
                            i++;
                            while (i < raw.length() && Character.isLetter(raw.charAt(i))) {
                                current.append(raw.charAt(i));
                                i++;
                            }
                            break;
                        } else {
                            current.append(d);
                            i++;
                        }
                    }
                } else {
                    current.append(c);
                    i++;
                }
            }
            parts.add(current.toString());
            return parts;
        }

        // ------------------------------------------------------------------
        // Individual predicate builders
        // ------------------------------------------------------------------

        private Predicate<TransactionEntity> buildDateFilter(List<String> parts, int position) {
            if (parts.size() < 3) {
                throw new QueryParseException("date predicate requires format: date:op:value", position);
            }
            String op = parts.get(1).toLowerCase();
            String value = parts.get(2);

            if ("between".equals(op)) {
                String[] range = value.split("\\.\\.");
                if (range.length != 2) {
                    throw new QueryParseException("date:between requires format: date:between:yyyy-MM-dd..yyyy-MM-dd", position);
                }
                LocalDate from = parseDate(range[0], position);
                LocalDate to   = parseDate(range[1], position);
                return tx -> !tx.getTransactionDate().isBefore(from) && !tx.getTransactionDate().isAfter(to);
            }

            LocalDate date = parseDate(value, position);
            return switch (op) {
                case "eq"  -> tx -> tx.getTransactionDate().isEqual(date);
                case "lt"  -> tx -> tx.getTransactionDate().isBefore(date);
                case "lte" -> tx -> !tx.getTransactionDate().isAfter(date);
                case "gt"  -> tx -> tx.getTransactionDate().isAfter(date);
                case "gte" -> tx -> !tx.getTransactionDate().isBefore(date);
                default    -> throw new QueryParseException("Unknown date operator '" + op + "'", position);
            };
        }

        private LocalDate parseDate(String value, int position) {
            try {
                return LocalDate.parse(value);
            } catch (DateTimeParseException e) {
                throw new QueryParseException("Invalid date '" + value + "' (expected yyyy-MM-dd)", position);
            }
        }

        private Predicate<TransactionEntity> buildPartnerFilter(List<String> parts, int position) {
            if (parts.size() < 2) {
                throw new QueryParseException("partner predicate requires a value", position);
            }
            StringMatcher matcher = StringMatcher.of(parts.get(1));
            return tx -> {
                String partnerId = tx.getPartnerId();
                return partnerId != null && matcher.matches(partnerId);
            };
        }

        private Predicate<TransactionEntity> buildDescriptionFilter(List<String> parts, int position) {
            if (parts.size() < 2) {
                throw new QueryParseException("description predicate requires a value", position);
            }
            StringMatcher matcher = StringMatcher.of(parts.get(1));
            return tx -> matcher.matches(tx.getDescription());
        }

        private Predicate<TransactionEntity> buildCommodityFilter(List<String> parts, int position) {
            if (parts.size() < 2) {
                throw new QueryParseException("commodity predicate requires a value", position);
            }
            String commodity = parts.get(1).toUpperCase();
            return tx -> tx.getEntries().stream()
                    .anyMatch(e -> commodity.equalsIgnoreCase(e.getCommodity()));
        }

        private Predicate<TransactionEntity> buildAmountFilter(List<String> parts, int position) {
            if (parts.size() < 3) {
                throw new QueryParseException("amount predicate requires format: amount:op:value", position);
            }
            String op = parts.get(1).toLowerCase();
            BigDecimal value;
            try {
                value = new BigDecimal(parts.get(2));
            } catch (NumberFormatException e) {
                throw new QueryParseException("Invalid amount value '" + parts.get(2) + "'", position);
            }
            return switch (op) {
                case "eq"  -> tx -> tx.getEntries().stream().anyMatch(e -> e.getAmount().compareTo(value) == 0);
                case "lt"  -> tx -> tx.getEntries().stream().anyMatch(e -> e.getAmount().compareTo(value) < 0);
                case "lte" -> tx -> tx.getEntries().stream().anyMatch(e -> e.getAmount().compareTo(value) <= 0);
                case "gt"  -> tx -> tx.getEntries().stream().anyMatch(e -> e.getAmount().compareTo(value) > 0);
                case "gte" -> tx -> tx.getEntries().stream().anyMatch(e -> e.getAmount().compareTo(value) >= 0);
                default    -> throw new QueryParseException("Unknown amount operator '" + op + "'", position);
            };
        }

        private Predicate<TransactionEntity> buildNoteFilter(List<String> parts, int position) {
            if (parts.size() < 2) {
                throw new QueryParseException("note predicate requires a value", position);
            }
            StringMatcher matcher = StringMatcher.of(parts.get(1));
            return tx -> tx.getEntries().stream()
                    .anyMatch(e -> e.getNote() != null && matcher.matches(e.getNote()));
        }

        private Predicate<TransactionEntity> buildTagFilter(List<String> parts, int position) {
            if (parts.size() < 2) {
                throw new QueryParseException("tag predicate requires at least a key", position);
            }
            StringMatcher keyMatcher = StringMatcher.of(parts.get(1));
            if (parts.size() >= 3) {
                StringMatcher valueMatcher = StringMatcher.of(parts.get(2));
                return tx -> tx.getTags().stream()
                        .anyMatch(tag -> keyMatcher.matches(tag.getTagKey())
                                && valueMatcher.matches(tag.getTagValue() != null ? tag.getTagValue() : ""));
            } else {
                return tx -> tx.getTags().stream()
                        .anyMatch(tag -> keyMatcher.matches(tag.getTagKey()));
            }
        }

        private Predicate<TransactionEntity> buildAccountTypeFilter(List<String> parts, int position) {
            if (parts.size() < 2) {
                throw new QueryParseException("accounttype predicate requires a value", position);
            }
            AccountType type;
            try {
                type = AccountType.valueOf(parts.get(1).toUpperCase());
            } catch (IllegalArgumentException e) {
                throw new QueryParseException("Unknown account type '" + parts.get(1) + "'", position);
            }
            return tx -> tx.getEntries().stream()
                    .anyMatch(entry -> {
                        AccountEntity acc = accountsById.get(entry.getAccountId());
                        return acc != null && acc.getType() == type;
                    });
        }

        private Predicate<TransactionEntity> buildAccountNameFilter(List<String> parts, int position) {
            if (parts.size() < 2) {
                throw new QueryParseException("accountname predicate requires a value", position);
            }
            StringMatcher matcher = StringMatcher.of(parts.get(1));
            Set<String> matchingIds = new HashSet<>();
            for (AccountEntity account : accountsById.values()) {
                String path = buildAccountPath(account, accountsById);
                if (matcher.matches(path)) {
                    matchingIds.add(account.getId());
                }
            }
            return tx -> tx.getEntries().stream()
                    .anyMatch(entry -> matchingIds.contains(entry.getAccountId()));
        }

        /**
         * Builds the full ancestor path for an account (e.g. {@code "Assets:Current Assets:Cash"}).
         */
        static String buildAccountPath(AccountEntity account, Map<String, AccountEntity> accountsById) {
            List<String> names = new ArrayList<>();
            AccountEntity current = account;
            while (current != null) {
                names.add(0, current.getName());
                String parentId = current.getParentAccountId();
                current = (parentId != null) ? accountsById.get(parentId) : null;
            }
            return String.join(":", names);
        }
    }

    // -------------------------------------------------------------------------
    // StringMatcher – handles plain/glob/quoted/regex match values
    // -------------------------------------------------------------------------

    /**
     * Compiles a match-value token into a string matcher.
     *
     * <ul>
     *   <li>{@code /pattern/} or {@code /pattern/i} – Java regex
     *   <li>{@code "text"} or {@code 'text'} – case-insensitive exact match
     *   <li>plain token with {@code *} or {@code ?} – glob (case-insensitive)
     *   <li>plain token without wildcards – case-insensitive exact match
     * </ul>
     */
    static final class StringMatcher {

        private final Pattern pattern;

        private StringMatcher(Pattern pattern) {
            this.pattern = pattern;
        }

        boolean matches(String input) {
            return pattern.matcher(input).find();
        }

        static StringMatcher of(String token) {
            if (token.startsWith("/") && token.length() >= 2) {
                return fromRegexToken(token);
            }
            if ((token.startsWith("\"") && token.endsWith("\"")) ||
                (token.startsWith("'") && token.endsWith("'"))) {
                String literal = token.substring(1, token.length() - 1);
                return new StringMatcher(Pattern.compile(
                        "(?i)^" + Pattern.quote(literal) + "$"));
            }
            if (token.contains("*") || token.contains("?")) {
                return fromGlob(token);
            }
            return new StringMatcher(Pattern.compile(
                    "(?i)^" + Pattern.quote(token) + "$"));
        }

        private static StringMatcher fromRegexToken(String token) {
            int lastSlash = token.lastIndexOf('/');
            String flags;
            String patternStr;
            if (lastSlash > 0) {
                flags = token.substring(lastSlash + 1);
                patternStr = token.substring(1, lastSlash);
            } else {
                flags = "";
                patternStr = token.substring(1);
            }
            int flagBits = 0;
            for (char f : flags.toCharArray()) {
                if (f == 'i') flagBits |= Pattern.CASE_INSENSITIVE;
            }
            try {
                return new StringMatcher(Pattern.compile(patternStr, flagBits));
            } catch (PatternSyntaxException e) {
                throw new QueryParseException("Invalid regex '" + patternStr + "': " + e.getDescription(), 0);
            }
        }

        private static StringMatcher fromGlob(String glob) {
            StringBuilder sb = new StringBuilder("(?i)^");
            for (int i = 0; i < glob.length(); i++) {
                char c = glob.charAt(i);
                if (c == '*') {
                    sb.append(".*");
                } else if (c == '?') {
                    sb.append('.');
                } else {
                    sb.append(Pattern.quote(String.valueOf(c)));
                }
            }
            sb.append('$');
            return new StringMatcher(Pattern.compile(sb.toString()));
        }
    }
}
