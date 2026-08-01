package dev.abstratium.abstraccount.model;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class AccountTest {

    @Test
    void rootCreatesAccountWithoutParent() {
        Account account = Account.root("acc1", "1020 Cash", AccountType.ASSET, "Cash account");
        assertEquals("acc1", account.id());
        assertEquals("1020 Cash", account.name());
        assertEquals(AccountType.ASSET, account.type());
        assertEquals("Cash account", account.note());
        assertNull(account.parentId());
        assertNull(account.parent());
        assertTrue(account.isRoot());
    }

    @Test
    void childCreatesAccountWithParentReference() {
        Account parent = Account.root("acc1", "1 Assets", AccountType.ASSET, null);
        Account child = Account.child("acc2", "1020 Cash", AccountType.ASSET, "Cash", parent);
        assertEquals("acc2", child.id());
        assertEquals(parent.id(), child.parentId());
        assertSame(parent, child.parent());
        assertFalse(child.isRoot());
    }

    @Test
    void isRootReturnsTrueForRootAccount() {
        Account account = Account.root("acc1", "1 Assets", AccountType.ASSET, null);
        assertTrue(account.isRoot());
    }

    @Test
    void isRootReturnsFalseForChildAccount() {
        Account parent = Account.root("acc1", "1 Assets", AccountType.ASSET, null);
        Account child = Account.child("acc2", "1020 Cash", AccountType.ASSET, null, parent);
        assertFalse(child.isRoot());
    }

    @Test
    void getDepthReturnsZeroForRoot() {
        Account account = Account.root("acc1", "1 Assets", AccountType.ASSET, null);
        assertEquals(0, account.getDepth());
    }

    @Test
    void getDepthReturnsOneForDirectChild() {
        Account parent = Account.root("acc1", "1 Assets", AccountType.ASSET, null);
        Account child = Account.child("acc2", "1020 Cash", AccountType.ASSET, null, parent);
        assertEquals(1, child.getDepth());
    }

    @Test
    void getDepthReturnsCorrectValueForDeepHierarchy() {
        Account root = Account.root("acc1", "1 Assets", AccountType.ASSET, null);
        Account level1 = Account.child("acc2", "10 Current", AccountType.ASSET, null, root);
        Account level2 = Account.child("acc3", "100 Cash", AccountType.ASSET, null, level1);
        Account level3 = Account.child("acc4", "1020 Bank", AccountType.ASSET, null, level2);

        assertEquals(0, root.getDepth());
        assertEquals(1, level1.getDepth());
        assertEquals(2, level2.getDepth());
        assertEquals(3, level3.getDepth());
    }

    @Test
    void nullIdThrows() {
        assertThrows(IllegalArgumentException.class, () ->
            Account.root(null, "Name", AccountType.ASSET, null));
    }

    @Test
    void blankIdThrows() {
        assertThrows(IllegalArgumentException.class, () ->
            Account.root("", "Name", AccountType.ASSET, null));
        assertThrows(IllegalArgumentException.class, () ->
            Account.root("   ", "Name", AccountType.ASSET, null));
    }

    @Test
    void nullNameThrows() {
        assertThrows(IllegalArgumentException.class, () ->
            Account.root("acc1", null, AccountType.ASSET, null));
    }

    @Test
    void blankNameThrows() {
        assertThrows(IllegalArgumentException.class, () ->
            Account.root("acc1", "", AccountType.ASSET, null));
        assertThrows(IllegalArgumentException.class, () ->
            Account.root("acc1", "   ", AccountType.ASSET, null));
    }

    @Test
    void nullTypeThrows() {
        assertThrows(IllegalArgumentException.class, () ->
            Account.root("acc1", "Name", null, null));
    }
}
