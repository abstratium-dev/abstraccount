# abstracore

**abstracore** is the master blueprint for abstratium applications. Built on the Quarkus subatomic Java stack, Quinoa for seamless integration, and Angular for the frontend, it serves as the upstream source for all specific project forks.

## 📦 Tech Stack

Runtime: Quarkus (Java)

Frontend UI: Angular (via Quinoa)

API Layer: REST / GraphQL

Auth: Integrated with Abstrauth

Data: Designed for MySql compatibility

## 🛠️ Getting Started

1. Creating a New Project from Abstracore

To start a new project (e.g., abstradex) using this core:

Create a new empty repository on your Git server.

Clone Abstracore and point it to your new origin:

```bash
git clone https://github.com/your-org/abstracore.git your-new-project
cd your-new-project
git remote rename origin upstream
git remote add origin https://github.com/your-org/your-new-project.git
git push -u origin main
```

2. Pulling Baseline Updates
When Abstracore is updated with new features or security patches, pull those changes into your project fork:

```bash
# Ensure you are on your main branch
git checkout main

# Fetch the latest baseline code
git fetch upstream

# Merge baseline changes into your project
git merge upstream/main --allow-unrelated-histories
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

Backend: http://localhost:8080

Frontend: Automatically proxied by Quinoa

Dev UI: http://localhost:8080/q/dev

## 📝 Governance

This is a Living Blueprint. If you develop a feature in a specific project (like a new logging service or UI utility) that would benefit all Abstratium apps, please back-port it to Abstracore via a Pull Request.


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

----

# Things to do when creating a new project

[ ] - Search for TODO and fix
[ ] - Search for core and fix, e.g. in `pom.xml`
[ ] - Update README.md with project-specific information
[ ] - Update USER_GUIDE.md with project-specific information
[ ] - Update DATABASE.md with project-specific information
[ ] - Update NATIVE_IMAGE_BUILD.md with project-specific information
[ ] - Update SECURITY_DESIGN.md with project-specific information
[ ] - Update TODO.md with project-specific information
[ ] - Update SECURITY.md with project-specific information
[ ] - Update CONTRIBUTING.md with project-specific information
[ ] - Create favicon, store it in root as zip and put it in `src/main/webui/public`
[ ] - Update `.windsurf` configuration
[ ] - Replace `src/main/webui/src/app/demo` with project-specific components
[ ] - 
[ ] - 
[ ] - 
[ ] - 
[ ] - 
[ ] - 
[ ] - 
[ ] - 
[ ] - 
[ ] - 