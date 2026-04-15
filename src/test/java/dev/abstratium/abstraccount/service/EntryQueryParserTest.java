package dev.abstratium.abstraccount.service;

import dev.abstratium.abstraccount.entity.AccountEntity;
import dev.abstratium.abstraccount.entity.EntryEntity;
import dev.abstratium.abstraccount.entity.TagEntity;
import dev.abstratium.abstraccount.entity.TransactionEntity;
import dev.abstratium.abstraccount.model.AccountType;
import dev.abstratium.abstraccount.model.TransactionStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Predicate;

import static org.junit.jupiter.api.Assertions.*;

class EntryQueryParserTest {

    private EntryQueryParser parser;
    private Map<String, AccountEntity> accounts;

    @BeforeEach
    void setUp() {
        parser = new EntryQueryParser();
        accounts = new HashMap<>();
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private AccountEntity account(String id, String name, AccountType type, String parentId) {
        AccountEntity a = new AccountEntity();
        a.setId(id);
        a.setName(name);
        a.setType(type);
        a.setParentAccountId(parentId);
        a.setJournalId("j1");
        accounts.put(id, a);
        return a;
    }

    private TransactionEntity tx(LocalDate date, String description, String partnerId) {
        TransactionEntity t = new TransactionEntity();
        t.setTransactionDate(date);
        t.setDescription(description);
        t.setPartnerId(partnerId);
        t.setStatus(TransactionStatus.CLEARED);
        t.setJournalId("j1");
        return t;
    }

    private EntryEntity entry(TransactionEntity tx, String accountId, String commodity, BigDecimal amount) {
        EntryEntity e = new EntryEntity();
        e.setTransaction(tx);
        e.setAccountId(accountId);
        e.setCommodity(commodity);
        e.setAmount(amount);
        e.setEntryOrder(tx.getEntries().size() + 1);
        tx.getEntries().add(e);
        return e;
    }

    private TagEntity tag(TransactionEntity tx, String key, String value) {
        TagEntity t = new TagEntity();
        t.setTransaction(tx);
        t.setTagKey(key);
        t.setTagValue(value);
        tx.getTags().add(t);
        return t;
    }

    private EntryEntity entryWithNote(TransactionEntity tx, String accountId, String commodity, BigDecimal amount, String note) {
        EntryEntity e = entry(tx, accountId, commodity, amount);
        e.setNote(note);
        return e;
    }

    private Predicate<TransactionEntity> parse(String query) {
        return parser.parse(query, accounts);
    }

    private Predicate<TransactionEntity> parseWithPartnerNames(String query, java.util.function.Function<String, java.util.Optional<String>> nameLookup) {
        EntryQueryParser.Lexer lexer = new EntryQueryParser.Lexer(query);
        java.util.List<EntryQueryParser.Token> tokens = lexer.tokenize();
        return new EntryQueryParser.Parser(tokens, accounts, nameLookup).parse();
    }

    // -------------------------------------------------------------------------
    // Blank / null
    // -------------------------------------------------------------------------

    @Test
    void nullQuery_acceptsAll() {
        TransactionEntity t = tx(LocalDate.of(2024, 1, 1), "Any", null);
        assertTrue(parse(null).test(t));
    }

    @Test
    void blankQuery_acceptsAll() {
        TransactionEntity t = tx(LocalDate.of(2024, 1, 1), "Any", null);
        assertTrue(parse("   ").test(t));
    }

    // -------------------------------------------------------------------------
    // date predicate
    // -------------------------------------------------------------------------

    @Nested
    class DatePredicateTests {

        @Test
        void date_eq_matches_exact_date() {
            TransactionEntity t = tx(LocalDate.of(2024, 6, 15), "X", null);
            assertTrue(parse("date:eq:2024-06-15").test(t));
            assertFalse(parse("date:eq:2024-06-14").test(t));
        }

        @Test
        void date_lt_excludes_equal_date() {
            TransactionEntity t = tx(LocalDate.of(2024, 6, 15), "X", null);
            assertFalse(parse("date:lt:2024-06-15").test(t));
            assertTrue(parse("date:lt:2024-06-16").test(t));
        }

        @Test
        void date_lte_includes_equal_date() {
            TransactionEntity t = tx(LocalDate.of(2024, 6, 15), "X", null);
            assertTrue(parse("date:lte:2024-06-15").test(t));
            assertTrue(parse("date:lte:2024-12-31").test(t));
            assertFalse(parse("date:lte:2024-06-14").test(t));
        }

        @Test
        void date_gt_excludes_equal_date() {
            TransactionEntity t = tx(LocalDate.of(2024, 6, 15), "X", null);
            assertFalse(parse("date:gt:2024-06-15").test(t));
            assertTrue(parse("date:gt:2024-06-14").test(t));
        }

        @Test
        void date_gte_includes_equal_date() {
            TransactionEntity t = tx(LocalDate.of(2024, 6, 15), "X", null);
            assertTrue(parse("date:gte:2024-06-15").test(t));
            assertFalse(parse("date:gte:2024-06-16").test(t));
        }

        @Test
        void date_between_inclusive() {
            TransactionEntity inside  = tx(LocalDate.of(2024, 6, 15), "X", null);
            TransactionEntity atStart = tx(LocalDate.of(2024, 1, 1),  "X", null);
            TransactionEntity atEnd   = tx(LocalDate.of(2024, 12, 31),"X", null);
            TransactionEntity before  = tx(LocalDate.of(2023, 12, 31),"X", null);
            TransactionEntity after   = tx(LocalDate.of(2025, 1, 1),  "X", null);

            String q = "date:between:2024-01-01..2024-12-31";
            assertTrue(parse(q).test(inside));
            assertTrue(parse(q).test(atStart));
            assertTrue(parse(q).test(atEnd));
            assertFalse(parse(q).test(before));
            assertFalse(parse(q).test(after));
        }

        @Test
        void date_unknown_operator_throws() {
            assertThrows(EntryQueryParser.QueryParseException.class,
                    () -> parse("date:contains:2024-01-01"));
        }

        @Test
        void date_invalid_date_throws() {
            assertThrows(EntryQueryParser.QueryParseException.class,
                    () -> parse("date:eq:not-a-date"));
        }

        @Test
        void date_missing_op_throws() {
            assertThrows(EntryQueryParser.QueryParseException.class,
                    () -> parse("date:2024-01-01"));
        }
    }

    // -------------------------------------------------------------------------
    // partner predicate
    // -------------------------------------------------------------------------

    @Nested
    class PartnerPredicateTests {

        @Test
        void partner_exact_match() {
            TransactionEntity t = tx(LocalDate.now(), "X", "ACME");
            assertTrue(parse("partner:ACME").test(t));
            assertFalse(parse("partner:OTHER").test(t));
        }

        @Test
        void partner_glob_wildcard() {
            TransactionEntity t = tx(LocalDate.now(), "X", "ACME_INC");
            assertTrue(parse("partner:*INC").test(t));
            assertTrue(parse("partner:ACME*").test(t));
            assertFalse(parse("partner:*XYZ").test(t));
        }

        @Test
        void partner_regex() {
            TransactionEntity t = tx(LocalDate.now(), "X", "ACME123");
            assertTrue(parse("partner:/ACME\\d+/").test(t));
            assertFalse(parse("partner:/^\\d+/").test(t));
        }

        @Test
        void partner_null_partner_never_matches() {
            TransactionEntity t = tx(LocalDate.now(), "X", null);
            assertFalse(parse("partner:*").test(t));
        }

        @Test
        void partner_name_glob_matches() {
            TransactionEntity t = tx(LocalDate.now(), "X", "P00000007");
            java.util.function.Function<String, java.util.Optional<String>> lookup =
                    id -> "P00000007".equals(id) ? java.util.Optional.of("Hoststar") : java.util.Optional.empty();
            assertTrue(parseWithPartnerNames("partner:*star*", lookup).test(t));
            assertTrue(parseWithPartnerNames("partner:Host*", lookup).test(t));
            assertFalse(parseWithPartnerNames("partner:*other*", lookup).test(t));
        }

        @Test
        void partner_name_regex_matches() {
            TransactionEntity t = tx(LocalDate.now(), "X", "P00000007");
            java.util.function.Function<String, java.util.Optional<String>> lookup =
                    id -> "P00000007".equals(id) ? java.util.Optional.of("Hoststar") : java.util.Optional.empty();
            assertTrue(parseWithPartnerNames("partner:/.*star.*/", lookup).test(t));
            assertFalse(parseWithPartnerNames("partner:/^\\d+/", lookup).test(t));
        }

        @Test
        void partner_id_still_matches_when_name_lookup_available() {
            TransactionEntity t = tx(LocalDate.now(), "X", "P00000007");
            java.util.function.Function<String, java.util.Optional<String>> lookup =
                    id -> java.util.Optional.of("Hoststar");
            assertTrue(parseWithPartnerNames("partner:P00000007", lookup).test(t));
        }
    }

    // -------------------------------------------------------------------------
    // description predicate
    // -------------------------------------------------------------------------

    @Nested
    class DescriptionPredicateTests {

        @Test
        void description_exact_match_case_insensitive() {
            TransactionEntity t = tx(LocalDate.now(), "Invoice Payment", null);
            assertTrue(parse("description:\"Invoice Payment\"").test(t));
            assertTrue(parse("description:\"invoice payment\"").test(t));
            assertFalse(parse("description:\"Other\"").test(t));
        }

        @Test
        void description_glob_contains() {
            TransactionEntity t = tx(LocalDate.now(), "Hoststar invoice domain", null);
            assertTrue(parse("description:*invoice*").test(t));
            assertFalse(parse("description:*receipt*").test(t));
        }

        @Test
        void description_regex() {
            TransactionEntity t = tx(LocalDate.now(), "P00000007 Hoststar", null);
            assertTrue(parse("description:/^P\\d+/").test(t));
            assertFalse(parse("description:/^Q\\d+/").test(t));
        }
    }

    // -------------------------------------------------------------------------
    // commodity predicate
    // -------------------------------------------------------------------------

    @Nested
    class CommodityPredicateTests {

        @Test
        void commodity_matches_any_entry() {
            account("a1", "Bank", AccountType.ASSET, null);
            account("a2", "Expenses", AccountType.EXPENSE, null);
            TransactionEntity t = tx(LocalDate.now(), "X", null);
            entry(t, "a1", "CHF", new BigDecimal("100.00"));
            entry(t, "a2", "USD", new BigDecimal("-80.00"));

            assertTrue(parse("commodity:CHF").test(t));
            assertTrue(parse("commodity:USD").test(t));
            assertFalse(parse("commodity:EUR").test(t));
        }

        @Test
        void commodity_case_insensitive() {
            account("a1", "Bank", AccountType.ASSET, null);
            account("a2", "Equity", AccountType.EQUITY, null);
            TransactionEntity t = tx(LocalDate.now(), "X", null);
            entry(t, "a1", "CHF", new BigDecimal("100.00"));
            entry(t, "a2", "CHF", new BigDecimal("-100.00"));

            assertTrue(parse("commodity:chf").test(t));
        }
    }

    // -------------------------------------------------------------------------
    // amount predicate
    // -------------------------------------------------------------------------

    @Nested
    class AmountPredicateTests {

        private TransactionEntity txWithAmounts(BigDecimal... amounts) {
            account("a1", "A1", AccountType.ASSET, null);
            account("a2", "A2", AccountType.LIABILITY, null);
            TransactionEntity t = tx(LocalDate.now(), "X", null);
            for (int i = 0; i < amounts.length; i++) {
                entry(t, i % 2 == 0 ? "a1" : "a2", "CHF", amounts[i]);
            }
            return t;
        }

        @Test
        void amount_eq() {
            TransactionEntity t = txWithAmounts(new BigDecimal("100.00"), new BigDecimal("-100.00"));
            assertTrue(parse("amount:eq:100.00").test(t));
            assertTrue(parse("amount:eq:-100.00").test(t));
            assertFalse(parse("amount:eq:50.00").test(t));
        }

        @Test
        void amount_gt_and_lt() {
            TransactionEntity t = txWithAmounts(new BigDecimal("200.00"), new BigDecimal("-200.00"));
            assertTrue(parse("amount:gt:100").test(t));
            assertTrue(parse("amount:lt:0").test(t));
            assertFalse(parse("amount:gt:500").test(t));
        }

        @Test
        void amount_gte_and_lte() {
            TransactionEntity t = txWithAmounts(new BigDecimal("100.00"), new BigDecimal("-100.00"));
            assertTrue(parse("amount:gte:100.00").test(t));
            assertTrue(parse("amount:lte:-100.00").test(t));
            assertFalse(parse("amount:gte:101.00").test(t));
        }

        @Test
        void amount_invalid_value_throws() {
            assertThrows(EntryQueryParser.QueryParseException.class,
                    () -> parse("amount:eq:not-a-number"));
        }

        @Test
        void amount_unknown_op_throws() {
            assertThrows(EntryQueryParser.QueryParseException.class,
                    () -> parse("amount:between:0"));
        }
    }

    // -------------------------------------------------------------------------
    // note predicate
    // -------------------------------------------------------------------------

    @Nested
    class NotePredicateTests {

        @Test
        void note_glob_matches_entry_note() {
            account("a1", "A", AccountType.ASSET, null);
            account("a2", "B", AccountType.LIABILITY, null);
            TransactionEntity t = tx(LocalDate.now(), "X", null);
            entryWithNote(t, "a1", "CHF", new BigDecimal("50"), "ref: 12345");
            entry(t, "a2", "CHF", new BigDecimal("-50"));

            assertTrue(parse("note:*12345*").test(t));
            assertFalse(parse("note:*99999*").test(t));
        }

        @Test
        void note_null_note_does_not_match() {
            account("a1", "A", AccountType.ASSET, null);
            account("a2", "B", AccountType.LIABILITY, null);
            TransactionEntity t = tx(LocalDate.now(), "X", null);
            entry(t, "a1", "CHF", new BigDecimal("50"));
            entry(t, "a2", "CHF", new BigDecimal("-50"));

            assertFalse(parse("note:*anything*").test(t));
        }
    }

    // -------------------------------------------------------------------------
    // tag predicate
    // -------------------------------------------------------------------------

    @Nested
    class TagPredicateTests {

        @Test
        void tag_key_only_matches() {
            TransactionEntity t = tx(LocalDate.now(), "X", null);
            tag(t, "invoice", "PI00001");

            assertTrue(parse("tag:invoice").test(t));
            assertFalse(parse("tag:payment").test(t));
        }

        @Test
        void tag_key_value_exact_match() {
            TransactionEntity t = tx(LocalDate.now(), "X", null);
            tag(t, "invoice", "PI00001");

            assertTrue(parse("tag:invoice:PI00001").test(t));
            assertFalse(parse("tag:invoice:PI99999").test(t));
        }

        @Test
        void tag_key_value_glob() {
            TransactionEntity t = tx(LocalDate.now(), "X", null);
            tag(t, "invoice", "PI00001");

            assertTrue(parse("tag:invoice:PI*").test(t));
            assertTrue(parse("tag:invoice:*00001").test(t));
            assertFalse(parse("tag:invoice:XX*").test(t));
        }

        @Test
        void tag_key_glob_wildcard() {
            TransactionEntity t = tx(LocalDate.now(), "X", null);
            tag(t, "OpeningBalances", "");

            assertTrue(parse("tag:Opening*").test(t));
            assertFalse(parse("tag:Closing*").test(t));
        }

        @Test
        void tag_key_regex() {
            TransactionEntity t = tx(LocalDate.now(), "X", null);
            tag(t, "invoiceRef", "PI00001");

            assertTrue(parse("tag:/invoice.*/i").test(t));
            assertFalse(parse("tag:/payment.*/i").test(t));
        }

        @Test
        void tag_null_value_matches_empty_string() {
            TransactionEntity t = tx(LocalDate.now(), "X", null);
            TagEntity te = new TagEntity();
            te.setTransaction(t);
            te.setTagKey("status");
            te.setTagValue(null);
            t.getTags().add(te);

            assertTrue(parse("tag:status").test(t));
        }
    }

    // -------------------------------------------------------------------------
    // accounttype predicate
    // -------------------------------------------------------------------------

    @Nested
    class AccountTypePredicateTests {

        @Test
        void accounttype_matches_by_type() {
            account("a1", "Bank", AccountType.ASSET, null);
            account("a2", "Revenue", AccountType.REVENUE, null);
            TransactionEntity t = tx(LocalDate.now(), "X", null);
            entry(t, "a1", "CHF", new BigDecimal("100"));
            entry(t, "a2", "CHF", new BigDecimal("-100"));

            assertTrue(parse("accounttype:ASSET").test(t));
            assertTrue(parse("accounttype:REVENUE").test(t));
            assertFalse(parse("accounttype:EXPENSE").test(t));
        }

        @Test
        void accounttype_case_insensitive() {
            account("a1", "Expense", AccountType.EXPENSE, null);
            account("a2", "Revenue", AccountType.REVENUE, null);
            TransactionEntity t = tx(LocalDate.now(), "X", null);
            entry(t, "a1", "CHF", new BigDecimal("100"));
            entry(t, "a2", "CHF", new BigDecimal("-100"));

            assertTrue(parse("accounttype:expense").test(t));
        }

        @Test
        void accounttype_unknown_type_throws() {
            assertThrows(EntryQueryParser.QueryParseException.class,
                    () -> parse("accounttype:INVALID_TYPE"));
        }
    }

    // -------------------------------------------------------------------------
    // accountname predicate
    // -------------------------------------------------------------------------

    @Nested
    class AccountNamePredicateTests {

        @Test
        void accountname_full_path_exact_match() {
            account("root", "Assets", AccountType.ASSET, null);
            account("child", "Bank", AccountType.ASSET, "root");
            account("other", "Expenses", AccountType.EXPENSE, null);
            TransactionEntity t = tx(LocalDate.now(), "X", null);
            entry(t, "child", "CHF", new BigDecimal("100"));
            entry(t, "other", "CHF", new BigDecimal("-100"));

            assertTrue(parse("accountname:\"Assets:Bank\"").test(t));
            assertFalse(parse("accountname:\"Assets:Other\"").test(t));
        }

        @Test
        void accountname_glob_partial_match() {
            account("root", "Expenses", AccountType.EXPENSE, null);
            account("child", "Marketing", AccountType.EXPENSE, "root");
            account("other", "Revenue", AccountType.REVENUE, null);
            TransactionEntity t = tx(LocalDate.now(), "X", null);
            entry(t, "child", "CHF", new BigDecimal("200"));
            entry(t, "other", "CHF", new BigDecimal("-200"));

            assertTrue(parse("accountname:*Marketing*").test(t));
            assertTrue(parse("accountname:Expenses*").test(t));
            assertFalse(parse("accountname:*Assets*").test(t));
        }

        @Test
        void accountname_root_account_no_parent() {
            account("root", "Assets", AccountType.ASSET, null);
            account("other", "Liabilities", AccountType.LIABILITY, null);
            TransactionEntity t = tx(LocalDate.now(), "X", null);
            entry(t, "root", "CHF", new BigDecimal("100"));
            entry(t, "other", "CHF", new BigDecimal("-100"));

            assertTrue(parse("accountname:Assets").test(t));
        }
    }

    // -------------------------------------------------------------------------
    // Logical operators
    // -------------------------------------------------------------------------

    @Nested
    class LogicalOperatorTests {

        @Test
        void explicit_AND_both_must_match() {
            account("a1", "Bank", AccountType.ASSET, null);
            account("a2", "Equity", AccountType.EQUITY, null);
            TransactionEntity match = tx(LocalDate.of(2024, 6, 15), "Invoice", null);
            entry(match, "a1", "CHF", new BigDecimal("100"));
            entry(match, "a2", "CHF", new BigDecimal("-100"));

            TransactionEntity noMatch = tx(LocalDate.of(2023, 1, 1), "Invoice", null);
            entry(noMatch, "a1", "CHF", new BigDecimal("100"));
            entry(noMatch, "a2", "CHF", new BigDecimal("-100"));

            String q = "date:gte:2024-01-01 AND description:*Invoice*";
            assertTrue(parse(q).test(match));
            assertFalse(parse(q).test(noMatch));
        }

        @Test
        void implicit_AND_whitespace() {
            account("a1", "Bank", AccountType.ASSET, null);
            account("a2", "Equity", AccountType.EQUITY, null);
            TransactionEntity t = tx(LocalDate.of(2024, 3, 1), "Payment", null);
            entry(t, "a1", "CHF", new BigDecimal("50"));
            entry(t, "a2", "CHF", new BigDecimal("-50"));

            String q = "date:gte:2024-01-01 commodity:CHF";
            assertTrue(parse(q).test(t));
        }

        @Test
        void OR_either_matches() {
            account("a1", "Bank", AccountType.ASSET, null);
            account("a2", "Equity", AccountType.EQUITY, null);
            TransactionEntity t1 = tx(LocalDate.now(), "Invoice", null);
            entry(t1, "a1", "CHF", new BigDecimal("100"));
            entry(t1, "a2", "CHF", new BigDecimal("-100"));

            TransactionEntity t2 = tx(LocalDate.now(), "Payment", null);
            entry(t2, "a1", "CHF", new BigDecimal("50"));
            entry(t2, "a2", "CHF", new BigDecimal("-50"));

            TransactionEntity t3 = tx(LocalDate.now(), "Other", null);
            entry(t3, "a1", "CHF", new BigDecimal("10"));
            entry(t3, "a2", "CHF", new BigDecimal("-10"));

            String q = "description:*Invoice* OR description:*Payment*";
            assertTrue(parse(q).test(t1));
            assertTrue(parse(q).test(t2));
            assertFalse(parse(q).test(t3));
        }

        @Test
        void NOT_negates_predicate() {
            account("a1", "Bank", AccountType.ASSET, null);
            account("a2", "Equity", AccountType.EQUITY, null);
            TransactionEntity t = tx(LocalDate.now(), "Invoice", null);
            tag(t, "draft", null);
            entry(t, "a1", "CHF", new BigDecimal("100"));
            entry(t, "a2", "CHF", new BigDecimal("-100"));

            assertFalse(parse("NOT tag:draft").test(t));
            assertTrue(parse("NOT tag:other").test(t));
        }

        @Test
        void parentheses_group_or_expressions() {
            account("a1", "Bank", AccountType.ASSET, null);
            account("a2", "Equity", AccountType.EQUITY, null);
            TransactionEntity t = tx(LocalDate.of(2024, 6, 1), "Invoice", null);
            tag(t, "invoice", "PI001");
            entry(t, "a1", "CHF", new BigDecimal("100"));
            entry(t, "a2", "CHF", new BigDecimal("-100"));

            String q = "(tag:invoice OR tag:payment) AND date:gte:2024-01-01";
            assertTrue(parse(q).test(t));
        }

        @Test
        void NOT_precedence_over_AND() {
            account("a1", "Bank", AccountType.ASSET, null);
            account("a2", "Equity", AccountType.EQUITY, null);
            TransactionEntity t = tx(LocalDate.now(), "Invoice", null);
            tag(t, "invoice", "PI001");
            entry(t, "a1", "CHF", new BigDecimal("100"));
            entry(t, "a2", "CHF", new BigDecimal("-100"));

            // NOT tag:payment is true, AND description:*Invoice* is true → match
            assertTrue(parse("NOT tag:payment AND description:*Invoice*").test(t));
            // NOT tag:invoice is false → no match
            assertFalse(parse("NOT tag:invoice AND description:*Invoice*").test(t));
        }
    }

    // -------------------------------------------------------------------------
    // StringMatcher
    // -------------------------------------------------------------------------

    @Nested
    class StringMatcherTests {

        @Test
        void plain_token_exact_case_insensitive() {
            assertTrue(EntryQueryParser.StringMatcher.of("hello").matches("Hello"));
            assertFalse(EntryQueryParser.StringMatcher.of("hello").matches("world"));
        }

        @Test
        void glob_star() {
            assertTrue(EntryQueryParser.StringMatcher.of("*world*").matches("hello world!"));
            assertFalse(EntryQueryParser.StringMatcher.of("*world*").matches("hello there"));
        }

        @Test
        void glob_question_mark() {
            assertTrue(EntryQueryParser.StringMatcher.of("h?llo").matches("hello"));
            assertTrue(EntryQueryParser.StringMatcher.of("h?llo").matches("hallo"));
            assertFalse(EntryQueryParser.StringMatcher.of("h?llo").matches("hllo"));
        }

        @Test
        void quoted_string_exact() {
            assertTrue(EntryQueryParser.StringMatcher.of("\"hello world\"").matches("hello world"));
            assertFalse(EntryQueryParser.StringMatcher.of("\"hello world\"").matches("hello"));
        }

        @Test
        void regex_pattern() {
            assertTrue(EntryQueryParser.StringMatcher.of("/^PI\\d{5}$/").matches("PI00001"));
            assertFalse(EntryQueryParser.StringMatcher.of("/^PI\\d{5}$/").matches("PI001"));
        }

        @Test
        void regex_case_insensitive_flag() {
            assertTrue(EntryQueryParser.StringMatcher.of("/hello/i").matches("HELLO"));
            assertFalse(EntryQueryParser.StringMatcher.of("/hello/").matches("HELLO"));
        }

        @Test
        void invalid_regex_throws() {
            assertThrows(EntryQueryParser.QueryParseException.class,
                    () -> EntryQueryParser.StringMatcher.of("/[invalid/"));
        }
    }

    // -------------------------------------------------------------------------
    // splitPredicateParts
    // -------------------------------------------------------------------------

    @Nested
    class SplitPredicatePartsTests {

        @Test
        void splits_simple_parts() {
            List<String> parts = EntryQueryParser.Parser.splitPredicateParts("date:gte:2024-01-01");
            assertEquals(List.of("date", "gte", "2024-01-01"), parts);
        }

        @Test
        void respects_quoted_string_with_colon() {
            List<String> parts = EntryQueryParser.Parser.splitPredicateParts("accountname:\"Assets:Bank\"");
            assertEquals(List.of("accountname", "\"Assets:Bank\""), parts);
        }

        @Test
        void respects_regex_with_colon() {
            List<String> parts = EntryQueryParser.Parser.splitPredicateParts("description:/foo:bar/");
            assertEquals(List.of("description", "/foo:bar/"), parts);
        }

        @Test
        void tag_with_value() {
            List<String> parts = EntryQueryParser.Parser.splitPredicateParts("tag:invoice:PI00001");
            assertEquals(List.of("tag", "invoice", "PI00001"), parts);
        }
    }

    // -------------------------------------------------------------------------
    // buildAccountPath
    // -------------------------------------------------------------------------

    @Nested
    class BuildAccountPathTests {

        @Test
        void root_account_path_is_just_name() {
            account("root", "Assets", AccountType.ASSET, null);
            assertEquals("Assets", EntryQueryParser.Parser.buildAccountPath(accounts.get("root"), accounts));
        }

        @Test
        void child_account_path_includes_parent() {
            account("root", "Assets", AccountType.ASSET, null);
            account("child", "Current Assets", AccountType.ASSET, "root");
            assertEquals("Assets:Current Assets",
                    EntryQueryParser.Parser.buildAccountPath(accounts.get("child"), accounts));
        }

        @Test
        void deep_path_three_levels() {
            account("root", "Assets", AccountType.ASSET, null);
            account("mid", "Current Assets", AccountType.ASSET, "root");
            account("leaf", "Cash", AccountType.CASH, "mid");
            assertEquals("Assets:Current Assets:Cash",
                    EntryQueryParser.Parser.buildAccountPath(accounts.get("leaf"), accounts));
        }
    }

    // -------------------------------------------------------------------------
    // Parse error cases
    // -------------------------------------------------------------------------

    @Nested
    class ParseErrorTests {

        @Test
        void unknown_keyword_throws() {
            assertThrows(EntryQueryParser.QueryParseException.class,
                    () -> parse("foobar:value"));
        }

        @Test
        void unmatched_paren_throws() {
            assertThrows(EntryQueryParser.QueryParseException.class,
                    () -> parse("(tag:invoice"));
        }

        @Test
        void trailing_token_after_expr_throws() {
            assertThrows(EntryQueryParser.QueryParseException.class,
                    () -> parse("tag:invoice )"));
        }

        @Test
        void not_without_operand_throws() {
            assertThrows(EntryQueryParser.QueryParseException.class,
                    () -> parse("NOT"));
        }

        @Test
        void exception_carries_position() {
            EntryQueryParser.QueryParseException ex = assertThrows(
                    EntryQueryParser.QueryParseException.class,
                    () -> parse("tag:invoice )"));
            assertTrue(ex.getPosition() >= 0);
        }
    }
}
