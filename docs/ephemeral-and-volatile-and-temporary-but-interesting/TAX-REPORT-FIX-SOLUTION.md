# Solution: Fix Tax Report to Exclude Closing Entries

## ✅ STATUS: IMPLEMENTED

The filter functionality has been successfully implemented. The reports page now passes the full filter string (including `not:` filters) to the backend.

## Problem Summary

The Swiss Tax Declaration report shows **empty/incorrect values** because:

1. **A.1 (Receivables):** Empty
2. **A.3 (Inventory):** Empty  
3. **A.10 (Revenue):** Empty
4. **Only A.6 (Total assets):** Shows value

### Root Cause

Year-end closing entries on **2025-12-31** tagged with `:Closing:` zero out all temporary accounts (revenue, expenses) by transferring them to account `2:29:290:2979` (Annual profit or loss).

The report currently includes these closing entries, showing post-closing balances instead of pre-closing balances required for tax declaration.

## Solution

The report must **EXCLUDE transactions tagged with `:Closing:`** when generating values.

### Required Filter

```
begin:20240101 end:20251231 not:Closing
```

This will show balances as of 2025-12-31 **BEFORE** the closing entries.

## Implementation Summary

### Changes Made

1. **Controller (`controller.ts`)**
   - Updated `getEntriesForReport()` to accept optional `filter` parameter
   - Passes filter string to `getTransactions()` which already supported it

2. **Reports Component (`reports.component.ts`)**
   - Updated `generateReport()` to pass `filterText` to `getEntriesForReport()`
   - No changes needed to `parseFilter()` - it already extracts dates correctly

3. **Tests (`reports.component.spec.ts`)**
   - Updated existing tests to include the new filter parameter
   - Added 2 new tests:
     - `should pass filter string to getEntriesForReport when filter is set`
     - `should pass filter string with tag filters to backend`

### Infrastructure Already in Place

### ✅ Frontend Filter Component
The `FilterInputComponent` already supports `not:` syntax:
- File: `src/main/webui/src/app/journal/filter-input/filter-input.component.ts`
- Lines 136-142, 156-158, 167-177
- Supports: `not:tagkey` and `not:tagkey:value`

### ✅ Backend Query Service
The `JournalPersistenceService` already supports negative tag filtering:
- File: `src/main/java/dev/abstratium/abstraccount/service/JournalPersistenceService.java`
- Lines 157-172, 218-231, 264-274
- Parameters: `notTagKeys` and `notTagKeyValuePairs`

### ✅ Backend Filter Parsing
The `JournalResource` already parses filter strings including `not:` prefix:
- File: `src/main/java/dev/abstratium/abstraccount/boundary/JournalResource.java`
- Lines 87-140: Parses filter string and extracts tag filters
- Supports: `begin:`, `end:`, `partner:`, `tag:value`, `not:tag:value`

## How to Use

To generate the Swiss Tax Declaration report with correct values:

1. Navigate to the Reports page
2. Select "Swiss Tax Declaration (Déclaration fiscale suisse)"
3. Enter the filter: `begin:20240101 end:20251231 not:Closing`
4. The report will now show correct values excluding closing entries

## Previous Implementation Notes (for reference)

### 1. ReportsComponent.parseFilter() - NO CHANGES NEEDED

**Current code (lines 117-135):**
```typescript
private parseFilter(filter: string) {
  // Parse begin: and end: from filter text
  const beginMatch = filter.match(/begin:(\d{8})/);
  const endMatch = filter.match(/end:(\d{8})/);
  
  if (beginMatch) {
    const dateStr = beginMatch[1];
    this.startDate = `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
  } else {
    this.startDate = null;
  }
  
  if (endMatch) {
    const dateStr = endMatch[1];
    this.endDate = `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
  } else {
    this.endDate = null;
  }
}
```

**New code needed:**
```typescript
private parseFilter(filter: string) {
  // Parse begin: and end: from filter text
  const beginMatch = filter.match(/begin:(\d{8})/);
  const endMatch = filter.match(/end:(\d{8})/);
  
  if (beginMatch) {
    const dateStr = beginMatch[1];
    this.startDate = `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
  } else {
    this.startDate = null;
  }
  
  if (endMatch) {
    const dateStr = endMatch[1];
    this.endDate = `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
  } else {
    this.endDate = null;
  }
  
  // Parse tag filters (including negative filters)
  this.tagFilters = this.parseTagFilters(filter);
}

private parseTagFilters(filter: string): { include: Map<string, string[]>, exclude: Map<string, string[]> } {
  const include = new Map<string, string[]>();
  const exclude = new Map<string, string[]>();
  
  // Split filter into tokens
  const tokens = filter.split(/\s+/).filter(t => t.length > 0);
  
  for (const token of tokens) {
    // Skip date filters
    if (token.startsWith('begin:') || token.startsWith('end:')) {
      continue;
    }
    
    // Check if it's a negative filter
    const isNegative = token.startsWith('not:');
    const actualToken = isNegative ? token.substring(4) : token;
    
    // Parse key:value
    const colonIndex = actualToken.indexOf(':');
    if (colonIndex > 0) {
      const key = actualToken.substring(0, colonIndex);
      const value = actualToken.substring(colonIndex + 1);
      
      const targetMap = isNegative ? exclude : include;
      if (!targetMap.has(key)) {
        targetMap.set(key, []);
      }
      targetMap.get(key)!.push(value);
    } else if (actualToken.length > 0) {
      // Just a key without value
      const targetMap = isNegative ? exclude : include;
      if (!targetMap.has(actualToken)) {
        targetMap.set(actualToken, []);
      }
    }
  }
  
  return { include, exclude };
}
```

### 2. Update Controller.getEntriesForReport()

**Current signature:**
```typescript
async getEntriesForReport(
  journalId: string,
  startDate?: string,
  endDate?: string
): Promise<AccountEntryDTO[]>
```

**New signature:**
```typescript
async getEntriesForReport(
  journalId: string,
  startDate?: string,
  endDate?: string,
  tagFilters?: { include: Map<string, string[]>, exclude: Map<string, string[]> }
): Promise<AccountEntryDTO[]>
```

### 3. Update Backend API Call

The controller needs to convert the tag filters to query parameters for the backend API.

**Current call:**
```typescript
const response = await fetch(
  `/api/entry-search/entries?journalId=${journalId}` +
  (startDate ? `&startDate=${startDate}` : '') +
  (endDate ? `&endDate=${endDate}` : '')
);
```

**New call:**
```typescript
let url = `/api/entry-search/entries?journalId=${journalId}`;
if (startDate) url += `&startDate=${startDate}`;
if (endDate) url += `&endDate=${endDate}`;

// Add tag filters
if (tagFilters) {
  // Include filters
  tagFilters.include.forEach((values, key) => {
    values.forEach(value => {
      url += `&tag=${encodeURIComponent(key + ':' + value)}`;
    });
  });
  
  // Exclude filters
  tagFilters.exclude.forEach((values, key) => {
    values.forEach(value => {
      url += `&notTag=${encodeURIComponent(key + ':' + value)}`;
    });
  });
}

const response = await fetch(url);
```

### 4. Update EntrySearchResource

The `EntrySearchResource.getAllEntries()` needs to:
1. Accept `tag` and `notTag` query parameters
2. Parse them into `tagKeys`, `tagKeyValuePairs`, `notTagKeys`, `notTagKeyValuePairs`
3. Pass them to `journalPersistenceService.queryEntriesWithFilters()`

**Add query parameters:**
```java
@GET
@Path("/entries")
public List<EntrySearchDTO> getAllEntries(
        @QueryParam("journalId") String journalId,
        @QueryParam("accountId") String accountId,
        @QueryParam("transactionId") String transactionId,
        @QueryParam("startDate") String startDate,
        @QueryParam("endDate") String endDate,
        @QueryParam("partnerId") String partnerId,
        @QueryParam("status") String status,
        @QueryParam("commodity") String commodity,
        @QueryParam("minAmount") BigDecimal minAmount,
        @QueryParam("maxAmount") BigDecimal maxAmount,
        @QueryParam("accountType") String accountType,
        @QueryParam("tagPattern") String tagPattern,
        @QueryParam("tag") List<String> tags,           // NEW
        @QueryParam("notTag") List<String> notTags) {   // NEW
```

**Parse tags:**
```java
// Parse tag filters
List<String> tagKeys = new ArrayList<>();
Map<String, String> tagKeyValuePairs = new HashMap<>();
List<String> notTagKeys = new ArrayList<>();
Map<String, String> notTagKeyValuePairs = new HashMap<>();

if (tags != null) {
    for (String tag : tags) {
        int colonIndex = tag.indexOf(':');
        if (colonIndex > 0) {
            String key = tag.substring(0, colonIndex);
            String value = tag.substring(colonIndex + 1);
            tagKeyValuePairs.put(key, value);
        } else {
            tagKeys.add(tag);
        }
    }
}

if (notTags != null) {
    for (String tag : notTags) {
        int colonIndex = tag.indexOf(':');
        if (colonIndex > 0) {
            String key = tag.substring(0, colonIndex);
            String value = tag.substring(colonIndex + 1);
            notTagKeyValuePairs.put(key, value);
        } else {
            notTagKeys.add(tag);
        }
    }
}

// Use parsed filters in query
List<EntryEntity> entryEntities = journalPersistenceService.queryEntriesWithFilters(
    journalId,
    startLocalDate,
    endLocalDate,
    partnerId,
    status,
    accountIds,
    tagKeys.isEmpty() ? null : tagKeys,
    tagKeyValuePairs.isEmpty() ? null : tagKeyValuePairs,
    notTagKeys.isEmpty() ? null : notTagKeys,
    notTagKeyValuePairs.isEmpty() ? null : notTagKeyValuePairs
);
```

## Testing

### Test Case 1: Without Filter
```
Filter: begin:20240101 end:20251231
Expected: Empty values (current broken state)
```

### Test Case 2: With Closing Filter
```
Filter: begin:20240101 end:20251231 not:Closing
Expected: Correct values showing pre-closing balances
```

### Verification Steps

1. Open journal "abstratium informatique sàrl 2024-2025"
2. Navigate to Reports
3. Select "Swiss Tax Declaration (Déclaration fiscale suisse)"
4. Enter filter: `begin:20240101 end:20251231 not:Closing`
5. Verify:
   - A.1 shows receivables balance
   - A.3 shows inventory balance
   - A.10 shows total revenue
   - B.1 shows net income (revenue - expenses)

## Alternative: Simpler Solution

If implementing full tag filtering is too complex, a **simpler alternative** is to:

1. Add a checkbox in the reports UI: "Exclude closing entries"
2. When checked, set end date to one day before closing: `end:20251230`
3. **Problem:** This won't include non-closing transactions on 2025-12-31

## Recommended Approach

Implement the full tag filtering solution because:
1. Infrastructure already exists in backend
2. Frontend filter component already supports `not:` syntax
3. Only missing piece is connecting reports component to the backend
4. Provides flexibility for other report filtering needs
5. Correctly includes all non-closing transactions on closing date

## Documentation Updates

After implementing, update:
1. `REPORTS_IMPLEMENTATION.md` - Add tag filtering documentation
2. `SWISS-TAX-DECLARATION-REPORT-DESIGN.md` - Add note about excluding closing entries
3. User documentation - Explain the `not:Closing` filter requirement
