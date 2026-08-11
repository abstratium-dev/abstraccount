# Macro System Design

## Overview

The macro system allows users to define reusable transaction templates that can be executed through the Angular web interface. Macros simplify common accounting tasks like paying bills, recording recurring transactions, and performing year-end operations.

## Architecture

```mermaid
graph TB
    UI[Angular UI] -->|HTTP GET| MR[MacroResource]
    UI -->|Execute Macro| TR[TransactionResource]
    MR -->|Uses| MS[MacroService]
    MS -->|Reads| ME[MacroEntity]
    ME -->|Stored in| DB[(T_macro)]
    TR -->|Creates| TE[TransactionEntity]
    TR -->|Creates| EE[EntryEntity]
    
    style UI fill:#e1f5ff
    style MR fill:#fff4e1
    style MS fill:#fff4e1
    style ME fill:#e8f5e9
    style DB fill:#f3e5f5
    style TR fill:#fff4e1
    style TE fill:#e8f5e9
    style EE fill:#e8f5e9
```

## Database Schema

### T_macro Table

```sql
CREATE TABLE T_macro (
    id VARCHAR(36) PRIMARY KEY,
    journal_id VARCHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500) NOT NULL,
    parameters TEXT NOT NULL,  -- JSON array of parameter definitions
    template TEXT NOT NULL,    -- Transaction template with placeholders
    validation TEXT,           -- JSON object with validation rules
    notes TEXT,               -- Additional notes/documentation
    created_date TIMESTAMP NOT NULL,
    modified_date TIMESTAMP NOT NULL,
    CONSTRAINT FK_macro_journal FOREIGN KEY (journal_id) 
        REFERENCES T_journal(id) ON DELETE CASCADE
);

CREATE INDEX I_macro_journal ON T_macro(journal_id);
CREATE INDEX I_macro_name ON T_macro(name);
```

## Data Model

### MacroEntity (JPA Entity)

```java
@Entity
@Table(name = "T_macro")
public class MacroEntity {
    @Id
    private String id;
    
    @Column(nullable = false, length = 100)
    private String name;
    
    @Column(nullable = false, length = 500)
    private String description;
    
    @Column(nullable = false, columnDefinition = "TEXT")
    private String parameters;  // JSON
    
    @Column(nullable = false, columnDefinition = "TEXT")
    private String template;
    
    @Column(columnDefinition = "TEXT")
    private String validation;  // JSON
    
    @Column(columnDefinition = "TEXT")
    private String notes;
    
    @Column(name = "created_date", nullable = false)
    private LocalDateTime createdDate;
    
    @Column(name = "modified_date", nullable = false)
    private LocalDateTime modifiedDate;
}
```

### MacroDTO (REST API)

```java
public record MacroDTO(
    String id,
    String name,
    String description,
    List<MacroParameterDTO> parameters,
    String template,
    MacroValidationDTO validation,
    String notes,
    String createdDate,
    String modifiedDate
) {}

public record MacroParameterDTO(
    String name,
    String type,  // account, amount, text, date, partner, code, status
    String prompt,
    String defaultValue,
    boolean required,
    String filter  // For account type filtering
) {}

public record MacroValidationDTO(
    boolean balanceCheck,
    Integer minPostings
) {}
```

## Parameter Types

| Type | Description | UI Component | Validation |
|------|-------------|--------------|------------|
| `date` | Date in YYYY-MM-DD | Date picker | Valid date |
| `partner` | Partner name | Dropdown from partners | Non-empty |
| `code` | Transaction code | Text input | Optional |
| `amount` | Monetary amount | Number input | Positive number |
| `text` | Free text | Text input | Non-empty if required |
| `account` | Account selector | Dropdown with filter | Valid account ID |
| `status` | Transaction status | Dropdown (*, !, empty) | Valid status |

## Template Processing

### Template Syntax

Templates use `{placeholder}` syntax for parameter substitution:

```
{date} * {partner} | {description}
    ; id:{id}
    ; invoice:{invoice_number}
    {expense_account}        {default_currency} {amount}
    {bank_account}           {default_currency} -{amount}
```

### Arithmetic Expressions

Templates support arithmetic expressions inside `{braces}` using parameter names and numeric literals.
Supported operators: `+`, `-`, `*`, `/`. Standard operator precedence applies (`*` and `/` before `+` and `-`).

| Expression | Description | Example (a=380, b=350) |
|------------|-------------|------------------------|
| `{a + b}` | Addition | `730` |
| `{a - b}` | Subtraction | `30` |
| `{a * b}` | Multiplication | `133000` |
| `{a / b}` | Division | `1.0857142857` |
| `{a + b * 2}` | Precedence: b*2 first | `1080` |
| `{amount * 1.077}` | Mix parameter and literal | depends on amount |

Expressions are evaluated **before** simple placeholder substitution, so parameter names must match
the parameter definitions exactly. If an expression cannot be evaluated (e.g. unknown parameter),
it is left as-is in the output.

Example from the TaxPayment macro:
```
    8:8900    {default_currency} {actual_amount - provision_amount}
```
If `actual_amount=380` and `provision_amount=350`, this resolves to the journal currency followed by `30`.

### Built-in Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `{today}` | Current date | `2024-11-09` |
| `{year}` | Current year | `2024` |
| `{month}` | Current month | `11` |
| `{day}` | Current day | `09` |
| `{default_currency}` | Currency of the target journal | `USD`, `CHF` |

`{default_currency}` is a reserved built-in placeholder, not a user-defined parameter. It is replaced
with the `currency` value of the journal against which the macro is executed, so a single macro
template can be used for journals with different currencies.

### Template Processing Flow

```mermaid
sequenceDiagram
    participant UI as Angular UI
    participant MR as MacroResource
    participant MS as MacroService
    participant TR as TransactionResource
    
    UI->>MR: GET /api/macro/
    MR->>MS: loadAllMacros()
    MS-->>MR: List<MacroEntity>
    MR-->>UI: List<MacroDTO>
    
    UI->>UI: User selects macro
    UI->>UI: Display parameter form
    UI->>UI: User fills parameters
    UI->>UI: Generate transaction preview
    UI->>TR: POST /api/transaction
    TR->>TR: Create TransactionEntity
    TR-->>UI: Created transaction
```

## Service Layer

### MacroService

```java
@ApplicationScoped
public class MacroService {
    
    @PersistenceContext
    EntityManager em;
    
    @Transactional
    public List<MacroEntity> loadAllMacros();
    
    @Transactional
    public MacroEntity loadMacro(String macroId);
    
    @Transactional
    public MacroEntity createMacro(MacroEntity macro);
    
    @Transactional
    public MacroEntity updateMacro(MacroEntity macro);
    
    @Transactional
    public void deleteMacro(String macroId);
    
    @Transactional
    public String executeMacro(MacroEntity macro, 
        Map<String, String> parameterValues, String journalId);
    
    String evaluateArithmeticExpressions(String template, 
        Map<String, String> parameterValues);
    
    BigDecimal evaluateExpression(String expression, 
        Map<String, String> parameterValues);
}
```

## REST API

### MacroResource

```java
@Path("/api/macro")
@Produces(MediaType.APPLICATION_JSON)
@RolesAllowed({Roles.USER})
public class MacroResource {
    
    @GET
    public List<MacroDTO> getAllMacros();
    
    @GET
    @Path("/macro/{macroId}")
    public MacroDTO getMacro(
        @PathParam("macroId") String macroId);
    
    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    public MacroDTO createMacro(MacroDTO macro);
    
    @PUT
    @Path("/macro/{macroId}")
    @Consumes(MediaType.APPLICATION_JSON)
    public MacroDTO updateMacro(
        @PathParam("macroId") String macroId,
        MacroDTO macro);
    
    @DELETE
    @Path("/macro/{macroId}")
    public void deleteMacro(
        @PathParam("macroId") String macroId);
    
    @POST
    @Path("/execute")
    @Consumes(MediaType.APPLICATION_JSON)
    public String executeMacro(MacroExecuteRequestDTO request);

    @POST
    @Path("/execute-batch")
    @Consumes(MediaType.APPLICATION_JSON)
    public MacroBatchExecuteResultDTO executeMacroBatch(
        MacroBatchExecuteRequestDTO request);
}
```

## JSON Storage Format

### Parameters Field

```json
[
  {
    "name": "date",
    "type": "date",
    "prompt": "Transaction date",
    "defaultValue": "{today}",
    "required": true
  },
  {
    "name": "partner",
    "type": "partner",
    "prompt": "Partner (supplier)",
    "required": true
  },
  {
    "name": "amount",
    "type": "amount",
    "prompt": "Amount (e.g., 100.50)",
    "required": true
  },
  {
    "name": "expense_account",
    "type": "account",
    "prompt": "Expense account (6..)",
    "filter": "^6.*:.*$",
    "required": true
  }
]
```

### Validation Field

```json
{
  "balanceCheck": true,
  "minPostings": 2
}
```

### YAML Import/Export Format

Macros can be imported and exported as YAML. The import/export DTO is a portable, database-independent representation of a macro:

```yaml
abstraccount_export_version: "1.0"
artefact_type: macros
items:
  - name: RecordOnlinePayment
    description: Record revenue for an order that was paid online
    parameters: '[{"name":"date","type":"date","required":true},...]'
    template: "{date} * {partner} | ..."
    validation: '{"balanceCheck":true,"minPostings":3}'
    notes: "..."
```

## Batch Macro Execution

A macro normally creates one transaction per execution. Batch execution runs the *same* macro
once per row of a pasted/uploaded CSV, so many similar transactions (e.g. a day's worth of
payment processor sales) can be created in a single action, without a preview step.

### Shared vs. row parameters

- **Shared parameters**: the macro's `account`-type parameters (e.g. a revenue account, a fee
  expense account, a processor account). These are filled in once and applied to every row.
- **Row parameters**: all remaining parameters, taken from the CSV, in the same order as they
  appear in the macro's parameter list. A header row is optional: if the first CSV row's fields
  exactly match the row parameter names (case-insensitively, in any order), it is skipped.

This split is entirely determined by parameter *type*, so batch execution works for any macro
without extra configuration.

### Request/response DTOs

```java
public record MacroBatchExecuteRequestDTO(
    String macroId,
    String journalId,
    Map<String, String> sharedParameters,
    String csv
) {}

public record MacroBatchExecuteResultDTO(
    int totalRows,
    int successCount,
    int failureCount,
    List<MacroBatchRowResultDTO> results
) {}

public record MacroBatchRowResultDTO(
    int row,
    boolean success,
    String transactionId,
    String error
) {}
```

### Execution semantics

- Rows are processed **independently**: each row is parsed, validated and persisted as its own
  transaction, in its own transaction/commit. A failure in one row does not roll back or block
  other rows.
- The endpoint always returns HTTP 200 with a **partial result**: `successCount` rows were
  created, `failureCount` rows were skipped, and `results` lists a per-row outcome (the created
  `transactionId`, or an `error` message) so the caller can identify and fix just the failed rows.
- CSV parsing supports quoted fields and doubled quotes as a literal quote character (see
  `CsvLineParser`), the same convention used for partner data import.
- The journal-locked check (`JournalPersistenceService.requireNotLocked`) is applied once for the
  whole batch, before any row is processed.

```mermaid
sequenceDiagram
    participant UI as Angular UI
    participant MR as MacroResource
    participant MS as MacroService
    participant AS as AccountService

    UI->>MR: POST /api/macro/execute-batch<br/>{macroId, journalId, sharedParameters, csv}
    MR->>MR: Determine row parameter names<br/>(non-account parameters)
    MR->>MR: Parse CSV into rows (skip optional header)
    loop for each row
        MR->>MR: Merge sharedParameters + row values
        MR->>MS: executeMacro(macro, parameters, journalId)
        MR->>AS: findAccountByCodePath(...)
        alt row succeeds
            MR->>MR: record success + transactionId
        else row fails
            MR->>MR: record failure + error message
        end
    end
    MR-->>UI: MacroBatchExecuteResultDTO<br/>(totalRows, successCount, failureCount, results)
```

## UI Integration

### Macro Execution Flow

1. **User selects macro** from dropdown
2. **System displays form** with all required parameters
   - Date parameters default to `{today}` if specified
   - Account parameters show filtered dropdown
   - Partner parameters show partner dropdown
3. **User fills in parameters** with client-side validation
4. **System generates transaction preview** by substituting placeholders
5. **User reviews** generated transaction
6. **User confirms** and transaction is created via existing TransactionResource

### Angular Components

- `MacrosComponent` (`macros.component.ts`) - Macro grid, single-execution dialog, batch-execution
  dialog, and import/export UI. Follows the Controller/Model pattern (see
  `docs/CONTROLLER_AND_MODEL.md`): the component calls `Controller.executeMacro` /
  `Controller.executeMacroBatch`, which perform the HTTP requests.
  - The single-execution dialog builds a dynamic form from `macro.parameters` and shows an
    autocomplete for `account`, `partner` and `invoice` typed parameters.
  - The batch-execution dialog shows the macro's `account`-type parameters as shared inputs, a
    CSV textarea for the row parameters, and — after submission — a per-row results list
    (success with transaction id, or a warning with the failure reason).

## Security Considerations

1. **Authorization**: Only users with `Roles.USER` can access macros
2. **Journal isolation**: Macros are scoped to journals, enforced by foreign key
3. **Validation**: All parameters validated before transaction creation
4. **Balance checks**: Transactions must balance unless explicitly disabled
5. **Account verification**: Only existing accounts can be referenced
6. **Audit trail**: All macro executions logged via transaction creation

## Example Macros

See `V01.013__insertStandardMacros.sql` for pre-loaded macro examples including:

- **PaymentByStaff** - Staff member pays expense with personal funds
- **RepayStaff** - Reimburse staff member for expenses
- **BankingExpense** - Record bank fees and charges
- **PayInvoiceFromBank** - Pay supplier invoice from bank account
- **PaymentForGoods** - Purchase inventory for resale
- **InvoiceForServicesOrSaas** - Send customer invoice
- **CustomerPaysInvoice** - Record customer payment
- **InventoryAdjustment** - Year-end inventory write-down
- **RecordDepreciation** - Annual depreciation entry
- **TaxProvision** - Year-end tax provision
- **TaxPayment** - Pay provisioned taxes with adjustment
- **LegalReserveAllocation** - Mandatory 5% profit allocation (Swiss Sàrl)

See `V01.024__insertPaymentProcessorMacros.sql` for the online payment processor macros:

- **PaymentProcessorSale** - Record a sale made through an online payment processor (e.g.
  Stripe, PayPal): credits revenue for the gross amount, debits the payment processing fees
  expense account for the PSP fee, and debits the payment processor balance account for the net
  amount. Designed to be run in batch, one row per reviewed payment.
- **TransferPaymentProcessorFunds** - Record a payout from the payment processor balance account
  to any cash/bank account.

## Testing Strategy

### Unit Tests

- `MacroEntityTest` - Test entity creation and validation
- `MacroServiceTest` - Test service methods with in-memory database

### Integration Tests

- `MacroResourceTest` - Test REST endpoints with `@QuarkusTest`
  - GET all macros for journal
  - GET single macro by ID
  - POST create new macro
  - PUT update existing macro
  - DELETE macro
  - POST execute a single macro
  - POST execute a batch (all rows succeed, header row skipped, partial failure with
    per-row warnings, macro not found, locked journal)
  - Verify journal isolation
  - Verify authorization

### Coverage Goals

- **Statement coverage**: 80%+
- **Branch coverage**: 70%+

## Future Enhancements

1. **Template validation** - Validate template syntax before saving
2. **Macro versioning** - Track changes to macro definitions
3. **Macro sharing** - Export/import macros between journals
4. **Conditional logic** - Support `{if}` statements in templates
5. **Loops** - Support `{for}` loops for split transactions
6. **Macro marketplace** - Share macros with community
7. **Scheduled execution** - Recurring macro execution

## Migration Path

1. Create `T_macro` table via Flyway migration
2. Insert standard macros via data migration
3. Deploy backend with MacroEntity, MacroService, MacroResource
4. Update Angular UI to support macro selection and execution
5. Test with existing journals

## Dependencies

- **Quarkus extensions**: hibernate-orm, flyway, jdbc-mysql, rest-jackson, oidc
- **Java version**: 21 (native image compatible)
- **Database**: MySQL 8.0+
- **Frontend**: Angular with TypeScript

## Notes

- Macros are **read-only templates** - they don't execute directly
- The Angular UI generates transactions from macro templates
- Transactions are created via existing `TransactionResource` endpoints
- This design maintains separation between macro definitions and transaction execution
- All transaction validation rules still apply
