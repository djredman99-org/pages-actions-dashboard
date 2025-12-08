# GitHub Actions Dashboard

A GitHub Pages site that serves as a centralized dashboard for monitoring GitHub Actions workflow statuses across multiple repositories.

## Features

- **5-Column Grid Layout**: Displays workflow badges in a clean, organized grid (5 across, responsive)
- **Multi-Repository Support**: Monitor workflows from any GitHub repository
- **Customizable Labels**: Clear labeling for each workflow
- **Responsive Design**: Adapts to different screen sizes (desktop, tablet, mobile)
- **Easy Customization**: Simple HTML structure for adding/removing workflows
- **Professional Styling**: Modern, clean interface with hover effects
- **Fully Clickable Workflow Cards**: Click anywhere on a workflow card to navigate to its workflow runs page
- **Accessible Keyboard Navigation**: Navigate and activate workflow cards using Tab and Enter keys with visible focus indicators

## Usage

### Viewing the Dashboard

Once GitHub Pages is enabled, visit: `https://{your-username}.github.io/pages-actions-dashboard/`

### Customizing Workflows

Edit the `index.html` file to add your own workflows:

1. Locate the workflow items in the `<div class="workflow-grid">` section
2. Copy the workflow-item template:

```html
<div class="workflow-item">
    <a href="https://github.com/owner/repo/actions/workflows/workflow-file.yml" class="workflow-card-link" aria-label="View Your Workflow Name workflow runs">
        <div class="workflow-label">Your Workflow Name</div>
        <span class="workflow-badge">
            <img src="https://github.com/owner/repo/actions/workflows/workflow-file.yml/badge.svg" alt="Workflow Status">
        </span>
    </a>
</div>
```

3. Update the following:
   - **href**: Link to the workflow's actions page (e.g., `https://github.com/owner/repo/actions/workflows/workflow-file.yml`)
   - **aria-label**: Descriptive label for accessibility (e.g., "View CI Build workflow runs")
   - **workflow-label**: Display name for your workflow
   - **img src**: Badge URL for the workflow
   - **alt**: Alternative text for the badge

### Badge URL Format

GitHub Actions badges follow this format:
```
https://github.com/{owner}/{repo}/actions/workflows/{workflow-file}/badge.svg
```

**Example:**
```
https://github.com/microsoft/vscode/actions/workflows/ci.yml/badge.svg
```

### Adding Workflows from Different Repositories

You can mix workflows from multiple repositories:

```html
<!-- From repository A -->
<div class="workflow-item">
    <a href="https://github.com/owner-a/repo-a/actions/workflows/ci.yml" class="workflow-card-link" aria-label="View Repo A CI workflow runs">
        <div class="workflow-label">Repo A - CI</div>
        <span class="workflow-badge">
            <img src="https://github.com/owner-a/repo-a/actions/workflows/ci.yml/badge.svg" alt="CI Status">
        </span>
    </a>
</div>

<!-- From repository B -->
<div class="workflow-item">
    <a href="https://github.com/owner-b/repo-b/actions/workflows/deploy.yml" class="workflow-card-link" aria-label="View Repo B Deploy workflow runs">
        <div class="workflow-label">Repo B - Deploy</div>
        <span class="workflow-badge">
            <img src="https://github.com/owner-b/repo-b/actions/workflows/deploy.yml/badge.svg" alt="Deploy Status">
        </span>
    </a>
</div>
```

## Enabling GitHub Pages

1. Go to your repository settings
2. Navigate to "Pages" in the left sidebar
3. Under "Source", select the branch (usually `main` or `copilot/create-dashboard-site`)
4. Click "Save"
5. Your dashboard will be available at `https://{your-username}.github.io/pages-actions-dashboard/`

## Customization

### Adjusting Badge Size

Modify the CSS in `index.html` to change badge sizes:

```css
.workflow-badge img {
    max-width: 100%;
    height: auto;
    /* Add custom sizing */
    width: 150px;  /* Set specific width */
}
```

### Changing Grid Columns

Modify the grid layout in the CSS:

```css
.workflow-grid {
    grid-template-columns: repeat(5, 1fr); /* Change 5 to your desired number */
    gap: 25px;
}
```

### Color Scheme

Update the gradient background and colors in the `<style>` section to match your preferences.

## Example Preview

The dashboard displays:
- Clear labels for each workflow
- Clickable badges that link to the workflow's actions page
- Responsive grid that adapts to screen size
- Hover effects for better interactivity
- Instructions for easy customization

## License

MIT