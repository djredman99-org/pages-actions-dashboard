// Configuration for GitHub Actions Dashboard
// This file contains the Azure Function endpoint and settings

const DASHBOARD_CONFIG = {
    // Azure Function Configuration
    azureFunction: {
        // Azure Function URL that will be injected at build time
        // This function handles authentication with GitHub App and returns workflow statuses
        url: '__AZURE_FUNCTION_URL__',
        debug: false // Set to true to enable debug logging in browser console
    }
};
