# GitHub Actions Dashboard Color Schemes

This document describes the color schemes available for the dashboard.

## Overview

The dashboard includes three themes based on GitHub's official Primer design system:
1. **Default Theme** - Professional purple gradient background with modern colors
2. **Light Theme** - Clean, professional light mode
3. **Dark Theme** - Modern dark mode with reduced eye strain

The Light and Dark themes use authentic GitHub Primer colors to provide a familiar, GitHub-native experience. Users can switch between themes using the settings button in the dashboard.

## Light Theme

**File:** `pages/theme-light.css`

### Color Palette

| Element | Color | Hex Code | Description |
|---------|-------|----------|-------------|
| Background | White | `#ffffff` | Clean white background |
| Container Border | Black | `#000000` | Strong black border for main container |
| Text (Primary) | Dark Gray | `#1b1f23` | Main text color |
| Text (Secondary) | Gray | `#57606a` | Subtitles and secondary text |
| Shaded Boxes | Light Gray | `#f6f8fa` | Workflow cards and info boxes |
| Borders | Gray | `#d0d7de` | Default borders |
| Refresh Button | GitHub Green | `#2ea44f` | Primary action button |
| Button Text | White | `#ffffff` | Text on buttons |
| Links | Blue | `#0969da` | Interactive links |
| Success Status | Green | `#2ea043` | Passing workflows |
| Failure Status | Red | `#d73a49` | Failed workflows |
| Running Status | Yellow | `#dbab09` | In-progress workflows |

## Dark Theme

**File:** `pages/theme-dark.css`

### Color Palette

| Element | Color | Hex Code | Description |
|---------|-------|----------|-------------|
| Background | Very Dark Gray | `#010409` | Deep background color |
| Container Border | Light Gray | `#7d8590` | Visible border in dark mode |
| Text (Primary) | Light Gray | `#e6edf3` | Main text color |
| Text (Secondary) | Gray | `#7d8590` | Subtitles and secondary text |
| Shaded Boxes | Dark | `#0d1117` | Workflow cards and info boxes |
| Borders | Dark Gray | `#30363d` | Default borders |
| Refresh Button | Dark Green | `#238636` | Primary action button |
| Button Text | White | `#ffffff` | Text on buttons |
| Links | Light Blue | `#58a6ff` | Interactive links |
| Success Status | Dark Green | `#238636` | Passing workflows |
| Failure Status | Red | `#da3633` | Failed workflows |
| Running Status | Yellow | `#bf8700` | In-progress workflows |

## Implementation Details

### GitHub Primer Colors

Both themes are based on GitHub's official Primer design system colors. The color values were sourced from:
- [GitHub Primer Design System](https://primer.style/)
- [Primer Primitives](https://github.com/primer/primitives)
- GitHub.com's actual light and dark themes

### Status Colors

Both themes use GitHub's semantic status colors:
- **Success (Green)**: Light `#2ea043` / Dark `#238636`
- **Failure (Red)**: Light `#d73a49` / Dark `#da3633`
- **Running (Yellow)**: Light `#dbab09` / Dark `#bf8700`
- **Neutral (Gray)**: Light `#6c757d` / Dark `#6e7681`

### Accessibility

- High contrast ratios meet WCAG AA standards
- Color combinations tested for readability
- Focus indicators use GitHub's blue (`#0969da` light / `#1f6feb` dark)
- Colors maintain meaning for colorblind users

## Usage

The dashboard includes a theme switcher that allows you to dynamically change between themes:

1. **Open Settings**: Click the settings button (⚙️) in the top-right corner of the dashboard
2. **Select Theme**: Choose from Default, Light, or Dark theme options
3. **Theme Persists**: Your theme choice is saved in browser localStorage and persists across sessions

### Technical Details

- Main dashboard: `pages/index.html`
- Theme CSS files: `pages/theme-default.css`, `pages/theme-light.css`, `pages/theme-dark.css`
- Theme switcher logic: `pages/theme-switcher.js`
- Base styles: `pages/styles-base.css`

The theme system uses a modular CSS architecture where the HTML structure is defined once in `index.html`, and themes are applied by loading different CSS files. This makes it easy to maintain consistent styling and add new themes without duplicating HTML.

## Screenshots

### Light Theme
![Light Theme Screenshot](https://github.com/user-attachments/assets/0f2094f5-dde6-4b15-8de3-142759949bff)

### Dark Theme
![Dark Theme Screenshot](https://github.com/user-attachments/assets/7d8bcc72-03dd-45ee-971c-ba15e7f2d305)

## References

- [GitHub Primer Design System](https://primer.style/)
- [Primer Color Usage Documentation](https://primer.style/product/getting-started/foundations/color-usage/)
- [GitHub Primer Primitives Repository](https://github.com/primer/primitives)
