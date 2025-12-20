# Theme System Documentation

## Overview

The dashboard now uses a modular CSS architecture that separates styling from HTML structure. This makes it easy to:
- Maintain consistent styling across all pages
- Support multiple color themes without duplicating HTML
- Create new themes by simply adding new CSS files

## File Structure

```
pages/
├── index.html              # Main dashboard with theme switcher
├── styles-base.css         # Common styles shared across all themes
├── theme-default.css       # Default purple gradient theme
├── theme-light.css         # GitHub Primer light theme colors
├── theme-dark.css          # GitHub Primer dark theme colors
└── theme-switcher.js       # Dynamic theme switching logic
```

## Available Themes

### 1. Default Theme (Purple Gradient)
- **File**: `theme-default.css`
- **Description**: Professional purple gradient background with bright, modern colors
- **Best for**: Modern, eye-catching dashboards

### 2. Light Theme (GitHub Primer)
- **File**: `theme-light.css`
- **Description**: Clean white background with GitHub's official Primer design system colors
- **Best for**: Daytime use, maximum readability, professional settings

### 3. Dark Theme (GitHub Primer)
- **File**: `theme-dark.css`
- **Description**: Dark background with muted colors based on GitHub's dark mode
- **Best for**: Nighttime use, reduced eye strain, low-light environments

## How to Use Themes

### Using the Theme Switcher

The main dashboard (`index.html`) includes a dynamic theme switcher:

1. Open the dashboard at `index.html`
2. Click the settings button (⚙️) in the top-right corner
3. Select your preferred theme (Default, Light, or Dark)
4. Your choice is saved in browser localStorage and persists across sessions

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

4. Add your custom theme to `theme-switcher.js`:

```javascript
this.themes = {
    default: 'theme-default.css',
    light: 'theme-light.css',
    dark: 'theme-dark.css',
    custom: 'theme-custom.css'  // Add your theme here
};
```

5. Update the settings modal in `index.html` to include your theme option:

```html
<label class="theme-option">
    <input type="radio" name="theme" value="custom">
    <span class="theme-label">Custom</span>
</label>
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

