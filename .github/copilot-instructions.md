# GitHub Actions Dashboard — Copilot Instructions

## Documentation Policy

Documentation in this repository is maintained exclusively by the `aw-document-updater` agentic workflow, which runs automatically after every push to `main`. **Do not create, modify, or delete any `.md` files** as part of code changes — this includes root-level docs, directory READMEs, and any other Markdown content. Leave all documentation work to the automated workflow.

## Project Overview

A GitHub Pages static site with an Azure Function App backend for monitoring GitHub Actions workflow statuses across multiple repositories (including private and internal repos). See [README.md](../README.md) for a full feature summary.

## Architecture

| Layer | Technology | Location |
|---|---|---|
| Frontend | HTML/CSS/JavaScript (no build step) | `pages/` |
| Backend | Azure Functions v4 (Node.js) | `function-app/src/` |
| Infrastructure | Bicep | `infrastructure/` |
| Auth | GitHub App + Azure Key Vault | `function-app/src/github-auth.js`, `function-app/src/keyvault-client.js` |
| Storage | Azure Storage | `function-app/src/storage-client.js` |

## Tech Stack

- **IaC**: Bicep only — no Terraform, no ARM JSON
- **Functions**: Azure Functions v4 Node.js model (`@azure/functions` package, `app.*` registration)
- **Auth**: OIDC / Workload Identity Federation for GitHub Actions → Azure (no stored service principal secrets)
- **Secrets**: Azure Key Vault with Managed Identity (`@Microsoft.KeyVault(...)` references in Function App settings)
- **Pages**: Static files in `pages/` deployed via `deploy-dashboard.yml`; no build step or bundler

## Key Files

| File | Purpose |
|---|---|
| `pages/api.js` | All Function App API calls from the frontend — the canonical integration layer |
| `pages/config.js` | Environment-specific configuration (Function App base URL, etc.) |
| `pages/dashboard.js` | Dashboard rendering and core logic |
| `pages/workflow-manager.js` | Workflow management UI |
| `function-app/src/functions/` | Individual Azure Function definitions |
| `function-app/host.json` | Azure Functions host configuration |
| `function-app/local.settings.json.example` | Local dev settings template (never commit actual secrets) |
| `infrastructure/main.bicep` | Main Bicep template |
| `infrastructure/deploy.sh` | Manual deployment script |

## Build & Run

```bash
# Function App — local development
cd function-app
npm install
func start   # requires Azurite for local Storage

# Pages — local development (zero-install)
npx serve pages
# or: python -m http.server 8080 --directory pages
```

## Conventions

- Managed Identity + RBAC is the preferred secure access pattern for all Azure services (Storage, Key Vault, Cosmos DB)
- Never commit actual secrets; use `local.settings.json.example` as the template
- Workflow configurations are stored in Azure Storage (`workflows.json`); each dashboard has a GUID identifier
- CORS on the Function App must be configured to allow the GitHub Pages domain

## Automated Workflows

| Workflow | Trigger | Purpose |
|---|---|---|
| `deploy-azure-infrastructure.yml` | Manual / on demand | Bicep infrastructure deployment |
| `deploy-azure-function.yml` | Push to main | Function App deployment |
| `deploy-dashboard.yml` | Push to main | GitHub Pages deployment |
| `aw-document-updater` | Push to main | Automated documentation maintenance |

> The `aw-document-updater` agentic workflow runs after every push to main and is solely responsible for keeping documentation current. See [WORKFLOW_MANAGEMENT_API.md](../WORKFLOW_MANAGEMENT_API.md) for API reference.
