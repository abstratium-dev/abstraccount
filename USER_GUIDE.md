# User Manual

## Using Abstraccount™


### Overview

Abstraccount™ is a double-entry bookkeeping application designed for Swiss SME bookkeeping. It manages journals, a hierarchical chart of accounts, transactions, partners, macros, and reports, with support for per-journal currencies, fiscal-year closing, and an AI assistant (coming soon).

> **Looking for step-by-step instructions?** The complete, illustrated walkthrough is available in the in-app **Online Help** at `/user-guide` (sign in and open **User Guide** from the navigation). The sections below are a concise summary only.

#### Key Features

- **Double-entry bookkeeping** — record transactions with balanced debits and credits, split lines, and tags.
- **Transaction attachments** — attach, view, and delete PDF receipts and other supporting documents from any transaction, or download every attachment in a journal as a single ZIP file. Attachments are private to your organisation and, once a journal is locked, remain viewable but not modifiable.
- **Swiss chart of accounts** — hierarchical accounts compatible with the Swiss KMU-Kontenplan, organised into assets, liabilities, equity, revenue, and expenses with rolled-up balances.
- **Macros & automation** — reusable templates for recurring entries such as invoices, payments, depreciation, and salaries.
- **Financial reports** — trial balance, profit and loss, balance sheet, and cash flow statement over any date range.
- **Partner management** — track customers, vendors, and employees with per-partner ledgers and history.
- **VAT & compliance** — tax codes and VAT reports are coming soon. Audit trails and year-end closing are already available.
- **Multi-currency** — configure a currency per journal and record transactions in your chosen currency, with manual conversion to your main currency noted in each transaction.
- **Fiscal years** — define year boundaries, lock closed periods (coming soon), and roll opening balances into a new year.
- **Journal history** — a complete audit trail and a chain of linked journals across financial years.
- **AI assistant** (coming soon) — guided chart-of-accounts setup and help with day-to-day bookkeeping.

#### Core concepts

- **Journal** — the container for a single financial year's books: its title, currency, chart of accounts, and transactions. Journals are chained across years.
- **Account** — a node in the hierarchical chart of accounts. Each has a numeric code, a name, a type (asset, cash, liability, equity, revenue, expense), and an optional parent. Parent balances roll up their descendants.
- **Transaction** — a dated, balanced set of entries (debit/credit lines) with a description, status (`CLEARED`, `PENDING`, `RECONCILED`), optional partner, and tags. Once saved, a transaction can have one or more PDF attachments (e.g. receipts).
- **Partner** — a customer, vendor, or employee that can be linked to transactions for tracking and per-partner reporting.
- **Macro** — a parameterised template that generates a complete transaction from a few inputs.
- **Closing the books** — at year end, revenue and expense accounts are zeroed and the net result is transferred to an equity account.
- **New year** — creates the next journal in the chain, copying the chart of accounts and carrying forward non-zero opening balances.

#### Typical workflow

1. **Create a journal** — give it a title, currency, and optional logo.
2. **Build the chart of accounts** — add top-level and child accounts following Swiss KMU-Kontenplan conventions (or your own scheme).
3. **Record transactions** — enter balanced debits and credits, optionally with partners and tags, or use a macro for recurring entries. Attach a receipt (PDF) via the transaction's context menu if you have one.
4. **Run reports** — generate trial balances, profit and loss, balance sheets, cash flow statements, and other reports over the desired date range.
5. **Close the books at year end** — transfer revenue and expense balances to an equity account.
6. **Open a new year** — create the next journal with carried-forward opening balances and continue recording.

---

## Installation

It is intended that this component be run using docker.
It supports MySql and will soon also support postgresql and MS SQL Server.

You need to add a database/schema and a user to the database manually.

### Prerequisites

Before installation, ensure you have:

- **Docker** installed and running
- **MySQL 8.0+** database server
- **Network connectivity** between Docker container and MySQL
- **OpenSSL** for generating JWT keys
- **GitHub account** (if pulling from GitHub Container Registry)
- **nginx** or similar for reverse proxying and terminating TLS

### Create the Database, User and Grant Permissions

#### MySQL

This component requires a MySQL database. Create a database and user with the following steps:

1. **Connect to MySQL** as root or admin user:

(change `<password>` to your password)
(change `<abstraccount>` to the project name)

```bash
docker run -it --rm --network abstratium mysql mysql -h abstratium-mysql --port 3306 -u root -p<password>

DROP USER IF EXISTS 'abstraccount'@'%';

CREATE USER 'abstraccount'@'%' IDENTIFIED BY '<password>';

DROP DATABASE IF EXISTS abstraccount;

CREATE DATABASE abstraccount CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON abstraccount.* TO abstraccount@'%'; -- on own database

FLUSH PRIVILEGES;

EXIT;
```

This project will automatically create all necessary tables and any initial data when it first connects to the database.

New versions will update the database as needed.

### Generate Environment Variables

Several environment variables hold secrets that must be generated before deployment. Generate them as follows:

1. **`COOKIE_ENCRYPTION_SECRET`** (min 32 characters — used to encrypt OIDC session cookies):
   ```bash
   openssl rand -base64 32
   ```

2. **`CSRF_TOKEN_SIGNATURE_KEY`** (min 32 characters — HMAC key used to sign CSRF tokens):
   ```bash
   openssl rand -base64 64 | tr -d '\n'
   ```

3. **`DEFAULT_ORG_UUID`** (UUID v4 — identifies the default organisation that existing data is migrated into):
   ```bash
   uuidgen
   ```

### Pull and Run the Docker Container

1. **Pull the latest image** from GitHub Container Registry:
   ```bash
   docker pull ghcr.io/abstratium-dev/abstraccount:latest
   ```

2. **Run the container**:

   ```bash
   docker run -d \
     --name abstraccount \
     --network abstratium \
     -p 127.0.0.1:41083:8083 \
     -p 127.0.0.1:9005:9005 \
     -e QUARKUS_DATASOURCE_JDBC_URL="jdbc:mysql://abstratium-mysql:3306/abstraccount" \
     -e QUARKUS_DATASOURCE_USERNAME="abstraccount" \
     -e QUARKUS_DATASOURCE_PASSWORD="TODO_YOUR_SECURE_PASSWORD" \
     -e ABSTRATIUM_CLIENT_ID="abstratium-abstraccount" \
     -e ABSTRATIUM_CLIENT_SECRET="TODO_YOUR_OIDC_CLIENT_SECRET" \
     -e QUARKUS_OIDC_AUTH_SERVER_URL="https://auth.abstratium.dev" \
     -e COOKIE_ENCRYPTION_SECRET="TODO_YOUR_COOKIE_ENCRYPTION_SECRET" \
     -e CSRF_TOKEN_SIGNATURE_KEY="TODO_YOUR_CSRF_TOKEN_SIGNATURE_KEY" \
     -e DEFAULT_ORG_UUID="TODO_YOUR_GENERATED_DEFAULT_ORG_UUID" \
     -e ABSTRATIUM_TOGGLES_API_URL="https://toggles.abstratium.dev" \
     -e ABSTRATIUM_TOGGLES_CONTEXT="abstratium-public-abstraccount" \
     -e STAGE="prod" \
     -e DEPLOYMENT_ENV="prod" \
     -e ABSTRA_LEGAL_CONTENT_FILE="/config/legal.html" \
     -e PARTNER_DATA_DIR="data/partners" \
     ghcr.io/abstratium-dev/abstraccount:latest
   ```

   **Required Environment Variables:**
   - `QUARKUS_DATASOURCE_JDBC_URL`: Database connection URL (format: `jdbc:mysql://<host>:<port>/<database>`)
   - `QUARKUS_DATASOURCE_USERNAME`: Database username
   - `QUARKUS_DATASOURCE_PASSWORD`: Database password (use strong, unique password)
   - `ABSTRATIUM_CLIENT_SECRET`: OIDC client secret issued by the abstrauth authentication server. The default `dev-secret-CHANGE-IN-PROD` must never be used in production.
   - `COOKIE_ENCRYPTION_SECRET`: Secret used to encrypt OIDC session cookies (min 32 chars, generate with `openssl rand -base64 32`)
   - `CSRF_TOKEN_SIGNATURE_KEY`: HMAC key used to sign CSRF tokens (min 32 chars, generate with `openssl rand -base64 64 | tr -d '\n'`)
   - `DEFAULT_ORG_UUID`: UUID for the default organisation that existing data is migrated into (generate with `uuidgen`)
   - `ABSTRATIUM_TOGGLES_API_URL`: URL of the Abstoggle public API (e.g., `https://toggles.abstratium.dev`, required in production only — dev/test use a hardcoded default)
   - `ABSTRATIUM_TOGGLES_CONTEXT`: Context string for the Abstoggle public API (e.g., `abstratium-public-abstraccount`). Has no default and must always be set.

   **Optional Environment Variables:**
   - `ABSTRATIUM_CLIENT_ID`: OIDC client ID registered with the abstrauth server. Defaults to `abstratium-abstraccount`. Override this for non-abstratium deployments.
   - `QUARKUS_OIDC_AUTH_SERVER_URL`: Base URL of the OIDC authentication server. Defaults to `https://auth-t.abstratium.dev` (dev/test) or `https://auth.abstratium.dev` (prod). Override this for non-abstratium deployments.
   - `QUARKUS_OIDC_AUTHENTICATION_FORCE_REDIRECT_HTTPS_SCHEME`: Forces the `https://` scheme in the OAuth `redirect_uri` when behind an SSL-terminating reverse proxy. Defaults to `true` in production and `false` in dev/test/e2e. Set to `false` when testing locally over HTTP.
   - `QUARKUS_MANAGEMENT_HOST`: Bind address for the management interface (health/info endpoints). Defaults to `localhost`. Set to `0.0.0.0` to expose it on all interfaces.
   - `STAGE`: Deployment stage identifier exposed to the frontend (e.g., "dev", "test", "prod"). Defaults to `dev`.
   - `DEPLOYMENT_ENV`: Deployment environment name attached to OpenTelemetry resource attributes (`deployment.environment`). Defaults to `dev`.
   - `OTEL_EXPORTER_OTLP_ENDPOINT`: OTLP collector endpoint for exporting traces and logs (gRPC). Defaults to `http://localhost:4317`. Only used in the `prod` profile.
   - `PARTNER_DATA_DIR`: Directory containing per-organisation partner CSV files (one file per org: `<orgId>.csv`). Defaults to `data/partners`.
   - `ABSTRA_WARNING_MESSAGE`: Warning banner message displayed at the top of the UI (e.g., "You are in the TEST environment!"). Set to "-" or omit to hide the banner.
   - `ABSTRA_WARNING_BG_COLOR`: Warning banner background colour (CSS colour value, e.g., `#ff4444` for red). Defaults to `#fff3cd` (amber yellow). Useful for differentiating environments at a glance.
   - `ABSTRA_BRAND_LOGO_URL`: URL of the logo image shown in the header. Defaults to `https://abstratium.dev/abstratium-logo-small.png`.
   - `ABSTRA_BRAND_LOGO_ALT`: Alt text for the header logo image. Defaults to `Abstratium Logo`.
   - `ABSTRA_BRAND_NAME`: Brand name text shown next to the logo in the header. Defaults to `ABSTRATIUM`.
   - `ABSTRA_LEGAL_CONTENT_FILE`: **Required for non-abstratium deployments.** Absolute path inside the container to an HTML file containing your organisation's legal page content. When set, this file's contents are served to the frontend and displayed instead of the built-in abstratium legal text — with no misconfiguration warnings. If this variable is not set and the deployment is not on `abstratium.dev`, the legal page will display a prominent error warning to users, and the home page will display a disclaimer stating that abstratium is not responsible for this deployment. Example: `-e ABSTRA_LEGAL_CONTENT_FILE=/config/legal.html -v /host/legal.html:/config/legal.html`.


----

> **⚠ LEGAL NOTICE FOR OPERATORS AND DEPLOYERS**
>
> This software ships with a legal page (`src/main/webui/src/app/core/legal/legal.component.html`)
> that is **specific to abstratium informatique sàrl** and applies **only** to the official deployment
> at **abstratium.dev**.
>
> If you deploy this software on **any other domain**, the legal page will automatically display a
> prominent misconfiguration warning to users, and the abstratium legal text will be visually
> invalidated. However, **you are still legally required** to:
>
> 1. Replace the legal page with one that correctly names **your** organisation as data controller.
> 2. Ensure the page accurately reflects **your** data processing practices, applicable law, and contact details.
> 3. Comply with the GDPR, Swiss revDSG, and any other applicable data protection law in your jurisdiction.
>
> Failure to do so may expose **you** (the operator) to regulatory action. abstratium informatique sàrl
> accepts no liability whatsoever for deployments made by third parties.
>
> See the checklist below for full configuration steps.




3. **Verify the container is running**:
   ```bash
   docker ps
   docker logs abstratium-abstraccount
   curl http://localhost:41083/m/health
   curl http://localhost:41083/m/info
   ```

4. **Access the application**:
   - Main application: http://localhost:41083
   - Management interface: http://localhost:9005/m/info

## Monitoring and Health Checks

This project provides several endpoints for monitoring:

- **Health Check**: `http://localhost:9005/m/health`
  - Returns application health status
  - Includes database connectivity check

- **Info Endpoint**: `http://localhost:9005/m/info`
  - Returns build information, version, and configuration
  - Useful for verifying deployment

## Troubleshooting

### Container won't start

1. Check Docker logs: `docker logs abstratium-abstraccount`
2. Verify environment variables are set correctly
3. Ensure database is accessible from container
4. Check network connectivity: `docker network inspect abstratium`

### Database connection errors

1. Verify MySQL is running: `mysql -u abstraccount -p -h your-mysql-host`
2. Check firewall rules allow connection on port 3306
3. Verify database user has correct permissions
4. Check JDBC URL format is correct

### JWT token errors

1. Verify keys are correctly base64-encoded
2. Ensure public key matches private key
3. Check key length is at least 2048 bits
4. Verify no extra whitespace in environment variables

## Security Best Practices

1. **Never use default/test keys in production**
2. **Store secrets in secure secret management systems** (e.g., HashiCorp Vault, AWS Secrets Manager)
3. **Use strong, unique passwords** for database and admin accounts
4. **Enable HTTPS** in production (configure reverse proxy)
5. **Regularly update** the Docker image to get security patches
6. **Monitor logs** for suspicious activity
7. **Backup database regularly**
8. **Limit network access** to database and management interface
9. **Rotate JWT keys periodically** (requires user re-authentication)

### Additional Resources

- TODO

