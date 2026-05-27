---
description: "Use when making code changes, implementing features, fixing bugs, or modifying infrastructure, workflow YAML, or configuration in this repository."
applyTo: "**/*.{js,json,bicep,yml,yaml,css,html,sh,ps1}"
---

# Code Change Guidelines

## Documentation Policy

Documentation in this repository is maintained exclusively by the `aw-document-updater` agentic workflow, which runs automatically after every push to main. **Do not create, modify, or delete any `.md` files** as part of a code change — this includes root-level docs, directory-level READMEs, and any other Markdown content.

If a code change requires a documentation update, make the code change only. The automated documentation workflow will detect the change and update the relevant docs.

## Security

- Follow Managed Identity + RBAC patterns for all Azure service access — do not introduce connection strings or credentials in source files
- Never commit secrets; use `function-app/local.settings.json.example` as the template for local settings
- Use Key Vault references (`@Microsoft.KeyVault(...)`) in Function App settings for any sensitive values

## Azure Functions

- Use the Azure Functions v4 Node.js programming model (`@azure/functions`, `app.*` registration)
- Shared helpers for auth, Key Vault, and Storage live in `function-app/src/` — use them rather than reimplementing

## Infrastructure

- Bicep only — no Terraform, no ARM JSON
- All Azure resource provisioning goes in `infrastructure/main.bicep`

## Frontend

- No build step — plain HTML/CSS/JavaScript in `pages/`
- All Function App calls must go through `pages/api.js` (the canonical API layer)
- Environment-specific config (e.g., Function App base URL) belongs in `pages/config.js`
