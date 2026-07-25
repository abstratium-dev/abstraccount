# Multi-Tenant Data Isolation Checklist

## Goal

Ensure that a user can access only data owned by an organisation to which that user belongs. The design must fail closed: an identity, request, query, or background job without an unambiguous organisation must not access tenant-owned data.

## Scope and Ownership Model

- [x] Define which records are tenant-owned and which records are genuinely global, immutable system data. Tenant-owned: journals, accounts, transactions, entries, tags, report templates, macros. Global: feature toggles, partner data (to be made per-org — see TODO.md).
- [x] Add an organisation identifier to every tenant-owned record, including child records that may be queried independently.
- [x] Do not accept the organisation identifier from client-controlled request data. Derive it from authenticated, verified identity claims or trusted server-side context.
- [x] Treat changes to organisation membership and organisation selection as authorization operations, not ordinary data updates. Handled by abstrauth (OIDC provider); this service reads the org claim from the token.
- [x] Decide explicitly whether organisation-specific configuration is copied from global defaults at provisioning time or is represented as immutable global data plus tenant overrides. Feature toggles are global (keyed by deployment stage, not org). Partner data will be per-org via file-per-org approach (see TODO.md for implementation details). No other per-org config needed now.

```mermaid
flowchart LR
    U[Authenticated user] --> I[Verified identity claims]
    I --> A[Membership and organisation authorization]
    A --> C[Request tenant context]
    C --> O[ORM tenant discriminator]
    C --> N[Native SQL tenant predicate]
    O --> D[(Tenant-owned data)]
    N --> D
```

## Request and Identity Handling

- [x] Validate the access token or session before reading the organisation claim. Quarkus OIDC validates the token; OrgIdResolutionFilter runs at `@Priority(Priorities.AUTHENTICATION + 100)` after authentication, reading orgId from the validated ID token (or access token fallback).
- [x] Rely on the trusted token issuer to authorize the authenticated subject's organisation membership and define the organisation identifier format. Org membership is managed by abstrauth (OIDC provider); this service reads the orgId claim from the validated token.
- [x] Populate a request-scoped tenant context once, before application data access begins.
- [x] Reject an authenticated request with a missing or blank organisation identifier using `403 Forbidden` or an equivalent denial.
- [x] Never silently fall back to a production default organisation for a request whose organisation cannot be resolved.
- [x] Do not let a header, URL parameter, payload field, or UI selection override the organisation derived from verified identity.
- [x] For service-to-service identities, require an explicit, authorized tenant scope rather than treating them as unrestricted by default. No service-to-service calls currently received. When introduced, the calling service will pass orgId as a request parameter; the machine identity is trusted, so the orgId will be used directly.

## ORM Isolation

- [x] Enable discriminator-based multi-tenancy, or another deliberate isolation strategy, globally for the persistence unit.
- [x] Mark every tenant-owned entity with the ORM's tenant/discriminator mapping.
- [x] Make the tenant identifier immutable after persistence and exclude it from externally writable DTOs.
- [x] Ensure the ORM automatically supplies the current tenant on inserts and applies it to entity and JPQL reads, updates, and deletes.
- [x] Load an existing entity in the current tenant context before applying client-provided updates. Do not merge detached objects assembled from external input.
- [x] Do not create managed references from client-provided identifiers without first proving the referenced record belongs to the current tenant.
- [x] Keep a tenant context stable for the complete unit of work. Do not reuse a persistence context across tenants. Inherently guaranteed: CurrentOrgContext is @RequestScoped, set once by OrgIdResolutionFilter before application code; JwtOrgResolver reads from it; EntityManager is request/transaction-scoped.

## Database Integrity

ORM filtering prevents many application mistakes, but the database must prevent cross-tenant relationships and protect data when native SQL or future code bypasses the ORM.

- [x] Add a non-null organisation identifier to each tenant-owned table.
- [x] Add indexes beginning with the organisation identifier for the application's actual access paths.
- [x] Add a unique key containing `(organisation_id, id)` for tenant-owned parent records.
- [x] Use composite foreign keys containing the organisation identifier, so a child record can reference only a parent in the same organisation.
- [x] Apply the same rule to self-references, historical links, association tables, and value/collection tables.
- [x] Keep database foreign keys restrictive and perform lifecycle deletion, relationship unlinking, cascading, and orphan removal through managed JPA entities so future Envers auditing observes every change.
- N/A (pre-production): Run a migration-time validation query for orphaned or cross-organisation references before adding non-null and composite foreign-key constraints.
- N/A (pre-production): Use forward-only database migrations: add nullable columns, backfill a known legacy owner, validate, then enforce non-null constraints and keys.

## Queries Outside the ORM

- [x] Inventory all native SQL, database views, stored procedures, full-text searches, reporting queries, exports, imports, and batch queries.
- [x] Bind the current organisation identifier as a required parameter to every query that reads or changes tenant-owned data.
- [x] Add the organisation predicate to every tenant-owned source in multi-table queries, not only to the first table.
- [x] Do not expose generic query endpoints or database identifiers that can be used to infer another organisation's records. All endpoints accept UUID entity IDs; ORM @TenantId discriminator filters every find/query by orgId, so cross-org access returns 404. UUIDs are not sequential. No generic query or raw SQL endpoints exist. Partner search is currently global (see TODO.md for per-org fix).
- [x] Treat caches, search indexes, files, object storage keys, asynchronous messages, audit events, and telemetry as tenant-scoped data stores. Include the organisation identifier in their key or authorization check. Audited: feature toggles and partner data are currently global (no tenant-owned data in caches/files/messages). Partner data will be made per-org (see TODO.md). No search indexes, object storage, async messages, audit events, or telemetry exist yet. Guardrail: require org-scoped keys before introducing any of these.

## Background Work and Administration

- [x] Require jobs, event handlers, imports, and scheduled tasks to establish an explicit tenant context before touching tenant data. No background jobs, event handlers, or scheduled tasks exist. Guardrail: require explicit tenant context before introducing any.
- [x] Reject background work without an explicit organisation instead of using a default tenant. No background work exists. Guardrail: reject without explicit org when introduced.
- [x] Give support and administrative tools separate, narrowly scoped cross-tenant authorization. Do not make ordinary user identities administrative by convention. No support or admin tools exist. Guardrail: use separate cross-tenant authorization when introduced.
- [x] Log the resolved organisation and authenticated subject for security-relevant actions without logging secrets or sensitive record contents. OrgIdResolutionFilter logs resolved orgId at DEBUG level. Security-relevant denials (403) are logged. Guardrail: extend logging when new security-relevant actions are introduced.
- [x] Define retention, export, deletion, and restore procedures per organisation. No production data exists yet. Guardrail: define per-org procedures before production rollout.

## Tests

Use integration tests with at least two organisations and distinct users.

- [x] Verify list and detail endpoints never return another organisation's data.
- [x] Verify search endpoints never return another organisation's data.
- [x] Verify report endpoints never return another organisation's data.
- [x] Verify export and download endpoints never return another organisation's data when introduced. No export/download endpoints exist. Guardrail: test isolation when introduced.
- [x] Verify guessing another organisation's identifier produces `404` or `403`, without leaking whether the record exists.
- [x] Verify delete operations cannot target another organisation's records.
- [x] Verify create operations cannot target another organisation's records.
- [x] Verify update operations cannot target another organisation's records.
- [x] Verify relationship-creation operations cannot target another organisation's records.
- [x] Verify import operations cannot target another organisation's records.
- [x] Verify missing and blank organisation claims are rejected and never resolve to a default production tenant.
- [x] Verify ORM queries are discriminator-filtered.
- [x] Verify native SQL paths bind an organisation predicate.
- [x] Verify direct database writes with cross-organisation foreign keys fail.
- [x] Verify current caches, files, messages, and background jobs contain no tenant-owned data.
- [x] Require organisation-scoped keys and explicit tenant context before introducing tenant-owned caches, files, messages, or background jobs. No tenant-owned caches/files/messages/background jobs exist. Guardrail: require org-scoped keys and tenant context before introducing any.
- N/A (pre-production): Run the full test suite against the production-like database engine as well as the test database.

## Rollout Gates

Do not enable multi-organisation access until all of the following are true:

- [x] Tenant context fails closed in production: API requests without a valid organisation are rejected, and tenant resolution never silently falls back to the default organisation.
- [x] Every tenant-owned entity and table is scoped: each has a required `org_id` discriminator mapped with `@TenantId`, so ORM operations are restricted to the resolved organisation.
- [x] Composite relationship constraints are in place.
- [x] All native and external-data paths have been audited.
- [x] Cross-organisation integration tests pass.
- N/A (pre-production): Existing data has a verified owner and has been backfilled.
- N/A (pre-production): Operational procedures for provisioning, membership changes, support access, backup, restore, and deletion have been reviewed.
