# Daadvracht - Elementor Setup Guide

## Quick Setup Steps

### Step 1: Global Colors (Site Settings > Global Colors)

Add these colors:

| Name | HEX |
|------|-----|
| Primary | `#EA580C` |
| Secondary | `#F97316` |
| Text | `#52525B` |
| Text Secondary | `#71717A` |
| Heading | `#18181B` |
| Background | `#FAFAFA` |
| Background Alt | `#FFFFFF` |
| Accent Light | `#FFF7ED` |
| Accent Medium | `#FFEDD5` |
| Dark | `#18181B` |
| Border | `#E4E4E7` |
| Border Light | `#F4F4F5` |
| Orange Hover | `#C2410C` |
| Orange Light | `#FB923C` |

---

### Step 2: Global Fonts (Site Settings > Global Fonts)

**Primary Font:** Inter
- Google Fonts URL: `https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap`

| Style | Weight |
|-------|--------|
| Primary | 400 (Regular) |
| Secondary | 600 (Semi-bold) |
| Heading | 800 (Extra-bold) |
| Label | 700 (Bold) |

---

### Step 3: Typography (Site Settings > Typography)

#### Body
- Font: Inter
- Size: 16px
- Weight: 400
- Line Height: 1.6
- Color: `#52525B`

#### H1
- Font: Inter
- Size: 60px (Desktop) / 48px (Tablet) / 40px (Mobile)
- Weight: 800
- Line Height: 1.1
- Color: `#18181B`

#### H2
- Font: Inter
- Size: 40px (Desktop) / 36px (Tablet) / 32px (Mobile)
- Weight: 800
- Line Height: 1.2
- Color: `#18181B`

#### H3
- Font: Inter
- Size: 30px (Desktop) / 26px (Tablet) / 24px (Mobile)
- Weight: 700
- Line Height: 1.3
- Color: `#18181B`

#### H4
- Font: Inter
- Size: 20px (Desktop) / 18px (Mobile)
- Weight: 700
- Line Height: 1.3
- Color: `#18181B`

#### H5
- Font: Inter
- Size: 18px
- Weight: 700
- Line Height: 1.4
- Color: `#18181B`

#### H6
- Font: Inter
- Size: 16px
- Weight: 700
- Line Height: 1.4
- Color: `#18181B`

#### Links
- Color: `#EA580C`
- Hover Color: `#C2410C`

---

### Step 4: Layout (Site Settings > Layout)

| Setting | Value |
|---------|-------|
| Content Width | 1280px |
| Widgets Space | 20px |
| Stretched Section Fit To | Full Width |

#### Container Padding
- Desktop: 0px 32px 0px 32px
- Tablet: 0px 24px 0px 24px
- Mobile: 0px 16px 0px 16px

---

### Step 5: Buttons (Site Settings > Buttons)

#### Typography
- Font: Inter
- Size: 18px
- Weight: 700

#### Normal State
- Text Color: `#FFFFFF`
- Background: `#EA580C`

#### Hover State
- Text Color: `#FFFFFF`
- Background: `#C2410C`

#### Border
- Radius: 12px

#### Padding
- 16px 32px 16px 32px

#### Box Shadow (Normal)
- Horizontal: 0
- Vertical: 10
- Blur: 25
- Spread: 0
- Color: `rgba(249, 115, 22, 0.2)`

#### Box Shadow (Hover)
- Horizontal: 0
- Vertical: 15
- Blur: 35
- Spread: 0
- Color: `rgba(249, 115, 22, 0.3)`

---

### Step 6: Form Fields (Site Settings > Form Fields)

#### Typography
- Font: Inter
- Size: 18px
- Weight: 400

#### Colors
- Text: `#27272A`
- Background: `#FAFAFA`
- Border: `#F4F4F5`
- Focus Border: `#F97316`

#### Border
- Width: 2px
- Radius: 12px

#### Padding
- 20px (all sides)

#### Focus Box Shadow
- Color: `#FFEDD5`
- Spread: 4px

#### Labels
- Font: Inter
- Size: 12px
- Weight: 700
- Transform: Uppercase
- Letter Spacing: 0.05em
- Color: `#A1A1AA`

---

### Step 7: Images (Site Settings > Images)

| Setting | Value |
|---------|-------|
| Border Radius | 16px |
| Lightbox | Enable |

---

### Step 8: Custom CSS

Go to **Site Settings > Custom CSS** and paste the contents of:
`elementor-custom-css.css`

---

## Section Templates

### Hero Section
- Background: `#FAFAFA`
- Padding: 80px top (after header), 80px bottom
- Content Width: Boxed (1280px)

### Services Section
- Background: `#FFFFFF`
- Padding: 80px top and bottom
- Content Width: Boxed (1280px)

### Dark Section (Werkwijze/Contact)
- Background: `#18181B`
- Padding: 80px top and bottom
- Text Color: `#FFFFFF` (headings), `#A1A1AA` (body)
- Content Width: Boxed (1280px)

### Testimonials Section
- Background: `#FFF7ED`
- Padding: 80px top and bottom
- Content Width: Boxed (1280px)

### CTA Banner (Region)
- Background: `#EA580C`
- Padding: 48px top and bottom
- Text Color: `#FFFFFF` (headings), `#FFEDD5` (body)
- Content Width: Boxed (1280px)

### Footer
- Background: `#FFFFFF`
- Border Top: 1px solid `#F4F4F5`
- Padding: 48px top, 24px bottom
- Content Width: Boxed (1280px)

---

## Widget Classes (Add to Advanced > CSS Classes)

Use these CSS classes on widgets to apply pre-defined styles:

| Class | Description |
|-------|-------------|
| `btn-primary` | Primary orange button |
| `btn-secondary` | White button with border |
| `btn-cta` | Pill-shaped CTA button |
| `card-service` | Service card styling |
| `card-testimonial` | Testimonial card styling |
| `icon-box-orange` | Orange icon box |
| `section-label` | Orange uppercase label |
| `badge-orange` | Orange badge/pill |
| `region-tag` | White tag on orange bg |
| `gradient-text` | Orange gradient text |
| `image-rounded` | 16px border radius |
| `image-rounded-xl` | 24px radius + shadow |
| `hover-lift` | Lift on hover |
| `hover-shadow` | Shadow on hover |
| `section-light` | Light gray background |
| `section-white` | White background |
| `section-dark` | Dark background |
| `section-accent` | Orange-50 background |
| `section-cta` | Orange-600 background |

---

## Quick Copy Values

### Shadows
```
Subtle: 0 1px 3px rgba(0, 0, 0, 0.05)
Card Hover: 0 25px 50px rgba(255, 237, 213, 0.5)
Button: 0 10px 25px rgba(249, 115, 22, 0.2)
Button Hover: 0 15px 35px rgba(249, 115, 22, 0.3)
Image: 0 25px 50px rgba(0, 0, 0, 0.15)
```

### Border Radius
```
Small: 8px
Medium: 12px
Large: 16px
XL: 24px
Pill: 9999px
```

### Spacing
```
Section Padding: 80px
Card Padding: 32px
Button Padding: 16px 32px
Input Padding: 20px
Gap Small: 8px
Gap Medium: 16px
Gap Large: 24px
Gap XL: 32px
```

### Transitions
```
Default: all 0.3s ease
Slow: all 0.6s ease
```

---

## Files Included

1. `elementor-kit-daadvracht.json` - Kit settings (manual import)
2. `elementor-custom-css.css` - Custom CSS to paste
3. `ELEMENTOR-SETUP-GUIDE.md` - This guide

---

## Notes

- Always use "Boxed" layout with 1280px width for sections
- Use "Full Width" only for background colors/images
- Header height is 80px - account for this with top padding on first section
- All sections should have 0 margin to stack flush
