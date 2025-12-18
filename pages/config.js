// Configuration for GitHub Actions Dashboard
// This file contains the Azure Function endpoint and settings

const DASHBOARD_CONFIG = {
    // Azure Function Configuration
    azureFunction: {
        // Azure Function URL that will be injected at build time
        // This function handles authentication with GitHub App and returns workflow statuses
        url: 'https://ghactionsdash-func-dev.azurewebsites.net',
        debug: false // Set to true to enable debug logging in browser console
    },

    // Legacy configuration (deprecated - workflows now stored in Azure Storage)
    // Kept for backward compatibility during migration
    workflows: [
        {
            owner: 'djredman99-org',
            repo: 'pages-actions-dashboard',
            workflow: 'ci-build.yml',
            label: 'CI Build'
        },
        {
            owner: 'djredman99-org',
            repo: 'pages-actions-dashboard',
            workflow: 'unit-tests.yml',
            label: 'Unit Tests'
        },
        {
            owner: 'djredman99-org',
            repo: 'pages-actions-dashboard',
            workflow: 'deploy-production.yml',
            label: 'Deploy Production'
        },
        {
            owner: 'djredman99-org',
            repo: 'pages-actions-dashboard',
            workflow: 'code-quality.yml',
            label: 'Code Quality'
        },
        {
            owner: 'djredman99-org',
            repo: 'pages-actions-dashboard',
            workflow: 'security-scan.yml',
            label: 'Security Scan'
        },
        {
            owner: 'djredman99-org',
            repo: 'pages-actions-dashboard',
            workflow: 'documentation.yml',
            label: 'Documentation'
        },
        {
            owner: 'djredman99-org',
            repo: 'pages-actions-dashboard',
            workflow: 'release.yml',
            label: 'Release Process'
        },
        {
            owner: 'djredman99-org',
            repo: 'pages-actions-dashboard',
            workflow: 'lint.yml',
            label: 'Lint Check'
        },
        {
            owner: 'djredman99-org',
            repo: 'pages-actions-dashboard',
            workflow: 'integration-tests.yml',
            label: 'Integration Tests'
        },
        {
            owner: 'djredman99-org',
            repo: 'pages-actions-dashboard',
            workflow: 'performance-tests.yml',
            label: 'Performance Tests'
        },
        {
            owner: 'djredman99-org',
            repo: 'pages-actions-dashboard',
            workflow: 'e2e-tests.yml',
            label: 'E2E Tests'
        },
        {
            owner: 'djredman99-org',
            repo: 'pages-actions-dashboard',
            workflow: 'code-coverage.yml',
            label: 'Code Coverage'
        },
        {
            owner: 'djredman99-org',
            repo: 'pages-actions-dashboard',
            workflow: 'dependency-check.yml',
            label: 'Dependency Check'
        },
        {
            owner: 'djredman99-org',
            repo: 'pages-actions-dashboard',
            workflow: 'docker-build.yml',
            label: 'Docker Build'
        },
        {
            owner: 'djredman99-org',
            repo: 'pages-actions-dashboard',
            workflow: 'database-migration.yml',
            label: 'Database Migration'
        },
        {
            owner: 'djredman99-org',
            repo: 'pages-actions-dashboard',
            workflow: 'api-tests.yml',
            label: 'API Tests'
        },
        {
            owner: 'djredman99-org',
            repo: 'pages-actions-dashboard',
            workflow: 'build-artifacts.yml',
            label: 'Build Artifacts'
        },
        {
            owner: 'djredman99-org',
            repo: 'pages-actions-dashboard',
            workflow: 'smoke-tests.yml',
            label: 'Smoke Tests'
        },
        {
            owner: 'djredman99-org',
            repo: 'pages-actions-dashboard',
            workflow: 'accessibility-tests.yml',
            label: 'Accessibility Tests'
        },
        {
            owner: 'djredman99-org',
            repo: 'pages-actions-dashboard',
            workflow: 'load-tests.yml',
            label: 'Load Tests'
        }
    ]
};
