// Configuration for GitHub Actions Dashboard
// This file contains the workflow definitions and GitHub App settings

const DASHBOARD_CONFIG = {
    // GitHub App Configuration
    github: {
        // Replace 'YOUR_TOKEN_HERE' with your Personal Access Token
        // The token needs 'actions:read' permission to fetch workflow statuses
        // For private/internal repos, create a fine-grained PAT with access to those repos
        token: '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',
        apiBaseUrl: 'https://api.github.com',
        debug: false // Set to true to enable debug logging in browser console
    },

    // Workflow definitions
    // Each workflow should specify the owner, repo, and workflow file name
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
