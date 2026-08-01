# Abstraccount™

**Abstraccount™** is modern double-entry bookkeeping for professionals — fast, lightweight, and ready for use in Switzerland, the EU, the UK, EFTA, and anywhere else that uses double-entry accounting. Record transactions, manage a hierarchical chart of accounts, automate recurring entries with macros, and generate trial balances, income statements, and balance sheets in seconds. It ships with built-in report templates aligned to the Swiss KMU-Kontenplan, which you can use as-is or adapt to your local chart of accounts.

## ✨ Key Features

- **Double-entry bookkeeping** — record transactions with balanced debits and credits, split lines, and tags
- **Hierarchical chart of accounts** — organise assets, liabilities, equity, revenue, and expenses into a tree with rolled-up balances
- **Macros & automation** — reusable templates for recurring entries such as invoices, payments, depreciation, and salaries
- **Financial reports** — trial balance, income statement, and balance sheet over any date range (cash flow report coming soon)
- **Partner management** — track customers, vendors, and employees with per-partner ledgers and history
- **Multi-currency** — configure a currency per journal and record transactions in your chosen currency
- **Fiscal years** — define year boundaries, close the books at year end, and roll opening balances into a new year
- **Journal history** — a complete audit trail and a chain of linked journals across financial years
- **Swiss report templates** — built-in balance sheet, income statement, and tax declaration layouts aligned to the Swiss KMU-Kontenplan (adaptable to other jurisdictions)
- **AI assistant** (coming soon) — guided chart-of-accounts setup and help with day-to-day bookkeeping
- **VAT & compliance** (coming soon) — tax codes, VAT reports, and period locking

## 📦 Tech Stack

Runtime: Quarkus (Java)

Frontend UI: Angular (via Quinoa)

API Layer: REST

Auth: Integrated with Abstrauth

Data: Designed for MySql compatibility

## 🛠️ Getting Started

This project is based on the Abstracore template. To sync with baseline updates from Abstracore:

```bash
# From the project root, run the sync script
bash scripts/sync-base.sh
```

⚠️ **IMPORTANT**: Avoid modifying the `/core` directory in your project forks. Keep your custom logic in `/app` or specific feature packages to minimize merge conflicts during updates.

## 🏗️ Project Structure

src/main/java/...: Core logic, security filters, and Abstrauth integration.

src/main/webui: The Angular application (managed by Quinoa).

docker/: Standardized deployment configurations.

scripts/: Automation for syncing with Abstracore.

## 🚀 Development Mode

Run the following command to start Quarkus in Dev Mode with the Angular live-reload server:

```bash
./mvnw quarkus:dev
```
Backend: http://localhost:8083

Frontend: Automatically proxied by Quinoa

Dev UI: http://localhost:8083/q/dev

## 📝 Governance

This project is based on Abstracore. If you develop a feature here (like a new logging service or UI utility) that would benefit all Abstratium apps, please consider back-porting it to Abstracore via a Pull Request.

------------------------


## Things to remember

- **Backend For Frontend (BFF) Architecture** - This service must act as a BFF if it has a UI. It is the BFF for that UI.
- **Native Builds** - This service must be built as a native image (GraalVM) for optimal performance and low footprint.
- **Low footprint** - uses as little as 64MB RAM and a small amount of CPU for typical workloads, idles at near zero CPU, achieved by being built as a native image (GraalVM)
- **Based on Quarkus and Angular** - industry standard frameworks

## Security

🔒 **Found a security vulnerability?** Please read our [Security Policy](SECURITY.md) for responsible disclosure guidelines.

For information about the security implementation and features, see [SECURITY_DESIGN.md](docs/security/SECURITY_DESIGN.md).

## Documentation

- [User Guide](USER_GUIDE.md)
- [Database](docs/DATABASE.md)
- [Native Image Build](docs/NATIVE_IMAGE_BUILD.md)
- [Other documentation](docs)

## Running the Application

See [User Guide](USER_GUIDE.md)

## Development and Testing

See [Development and Testing](docs/DEVELOPMENT_AND_TESTING.md)

## TODO

See [TODO.md](TODO.md)


## Aesthetics

### favicon

https://favicon.io/favicon-generator/ - text based

Text: a
Background: rounded
Font Family: Leckerli One
Font Variant: Regular 400 Normal
Font Size: 110
Font Color: #FFFFFF
Background Color: #5c6bc0
