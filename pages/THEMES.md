# Theme System Documentation

## Overview

The dashboard now uses a modular CSS architecture that separates styling from HTML structure. This makes it easy to:
- Maintain consistent styling across all pages
- Support multiple color themes without duplicating HTML
- Create new themes by simply adding new CSS files

## File Structure

```
pages/
├── index.html              # Main dashboard (uses default purple gradient theme)
├── index-light.html        # Dashboard with GitHub Primer light theme
├── index-dark.html         # Dashboard with GitHub Primer dark theme
├── styles-base.css         # Common styles shared across all themes
├── theme-default.css       # Default purple gradient theme
├── theme-light.css         # GitHub Primer light theme colors
└── theme-dark.css          # GitHub Primer dark theme colors
```

## Available Themes

### 1. Default Theme (Purple Gradient)
- **File**: `theme-default.css`
- **Used by**: `index.html`
- **Description**: Professional purple gradient background with bright, modern colors
- **Best for**: Modern, eye-catching dashboards

### 2. Light Theme (GitHub Primer)
- **File**: `theme-light.css`
- **Used by**: `index-light.html`
- **Description**: Clean white background with GitHub's official Primer design system colors
- **Best for**: Daytime use, maximum readability, professional settings

### 3. Dark Theme (GitHub Primer)
- **File**: `theme-dark.css`
- **Used by**: `index-dark.html`
- **Description**: Dark background with muted colors based on GitHub's dark mode
- **Best for**: Nighttime use, reduced eye strain, low-light environments

## How to Use Themes

### Using an Existing Theme

Simply open the HTML file for the theme you want:
- `index.html` - Default purple gradient theme
- `index-light.html` - Light theme
- `index-dark.html` - Dark theme

### Changing the Default Theme

To change which theme is used by `index.html`, edit the `<head>` section:

```html
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GitHub Actions Dashboard</title>
    <link rel="stylesheet" href="styles-base.css">
    <link rel="stylesheet" href="theme-default.css">  <!-- Change this line -->
</head>
```

Replace `theme-default.css` with:
- `theme-light.css` for light theme
- `theme-dark.css` for dark theme

## Creating a New Theme

To create a new theme:

1. Create a new CSS file in the `pages` directory (e.g., `theme-custom.css`)
2. Use `theme-default.css` as a template
3. Override the color properties:
   - `body` background
   - `.container` background, border, and shadow
   - Text colors (`h1`, `.subtitle`, `.workflow-label`, etc.)
   - Button colors (`.refresh-button`)
   - Status indicators (`.instructions`, `.config-error`, `.footer`)

### Example Custom Theme

```css
/* theme-custom.css */

body {
    background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
}

.container {
    background: white;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

h1 {
    color: #1e3c72;
}

/* ... customize other elements ... */
```

4. Create a new HTML file (e.g., `index-custom.html`) or update an existing one:

```html
<link rel="stylesheet" href="styles-base.css">
<link rel="stylesheet" href="theme-custom.css">
```

## Theme CSS Properties

Each theme CSS file should define colors for these key elements:

### Background and Container
- `body` - Page background
- `.container` - Main container background, border, and shadow

### Typography
- `h1` - Main heading color
- `.subtitle` - Subtitle text color
- `.workflow-label` - Workflow card label color

### Interactive Elements
- `.refresh-button` - Refresh button background and hover states
- `.refresh-button:hover` - Hover state
- `.refresh-button:disabled` - Disabled state
- `.refresh-button:focus-visible` - Focus outline color

### Status Indicators
- `.refresh-status` - Status bar background and border
- `.refresh-status.refreshing` - Refreshing state colors

### Workflow Cards
- `.workflow-item` - Card background and border
- `.workflow-item:hover` - Hover state
- `.workflow-card-link:focus-visible` - Focus outline color

### Information Boxes
- `.instructions` - Instructions box background, border, and text colors
- `.config-error` - Error box background, border, and text colors
- `.footer` - Footer border and text color

### Status Colors (Optional)
Dark theme can override status badge colors:
- `.status-success` - Success status background
- `.status-failure` - Failure status background
- `.status-running` - Running status background
- `.status-cancelled`, `.status-skipped`, etc.

## Best Practices

1. **Don't modify `styles-base.css`** - It contains layout and structural styles that should remain consistent across all themes
2. **Only override colors and visual styles** - Keep the structure and layout the same
3. **Test accessibility** - Ensure sufficient color contrast for readability
4. **Use semantic colors** - Success should look successful, errors should look like errors
5. **Consider dark mode** - If creating a dark theme, use muted colors to reduce eye strain

## Benefits of This Architecture

1. **Single Source of Truth**: HTML structure is defined once, not repeated
2. **Easy Theme Switching**: Change themes by swapping a single CSS file
3. **Maintainable**: Bug fixes and layout changes only need to be made in one place
4. **Extensible**: New themes can be added without touching existing code
5. **Smaller Files**: HTML files are ~85% smaller (from 410 lines to 58 lines)
6. **Better Performance**: Browsers can cache CSS files separately from HTML

## Migration Notes

The CSS was extracted from the original inline `<style>` tags in the HTML files. All functionality remains the same, including:
- Responsive grid layout
- Hover effects
- Focus indicators for accessibility
- Animations (spin, pulse)
- Media queries for mobile devices

No JavaScript changes were required.
