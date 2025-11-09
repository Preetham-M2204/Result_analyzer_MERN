# Development Rules & Guidelines

## CRITICAL RULES - MUST FOLLOW ALWAYS
##### RULE 0 : THE MAIN RULE IS WHEN DEVELOPING NEVER TRY CREATING ANYTHING NEW IF SOMETHING EXISTS JUST UPDATE IT OR TELL WHAT YOU ARE DOING
### 1. NO EMOJIS POLICY
**RULE:** NEVER use emojis in ANY file - Python, TypeScript, JavaScript, JSX, TSX, CSS, or documentation.

**Reason:** Emojis make the project look unprofessional and childish. This is an enterprise-grade application.

**Examples:**
- ❌ BAD: `alert('✅ Success!')`
- ✅ GOOD: `alert('Success!')`
- ❌ BAD: `console.log('📊 Data loaded')`
- ✅ GOOD: `console.log('Data loaded')`
- ❌ BAD: `<button>🚀 Start</button>`
- ✅ GOOD: `<button>Start</button>`

**Applies to:**
- UI text and labels
- Alert messages
- Console logs
- Comments
- Documentation
- Error messages
- Button text
- Headers and titles

---

### 2. TYPOGRAPHY & FONTS

**Primary Font:** Roboto (Google Fonts)
- Use `font-family: 'Roboto', sans-serif;` throughout the application
- Load from Google Fonts CDN
- Fallback to system sans-serif fonts

**Font Weights:**
- Light (300): Subtle text, captions
- Regular (400): Body text, descriptions
- Medium (500): Labels, input text
- Bold (700): Headings, emphasis

**Font Sizes:**
```css
/* Headings */
h1: 32px (2rem)
h2: 24px (1.5rem)
h3: 20px (1.25rem)
h4: 18px (1.125rem)

/* Body */
body: 16px (1rem)
small: 14px (0.875rem)
caption: 12px (0.75rem)
```

---

### 3. PROFESSIONAL UI DESIGN STANDARDS

#### Design Philosophy
- **Clean**: No clutter, ample white space
- **Elegant**: Sophisticated color palette, refined typography
- **Minimal**: Only essential elements, no unnecessary decorations
- **Modern**: Contemporary design patterns, smooth interactions
- **High-end**: Premium feel like world-class SaaS dashboards

#### Visual Hierarchy
- Use font sizes, weights, and colors to establish hierarchy
- Important actions use primary colors
- Secondary actions use neutral colors
- Destructive actions use red/error colors

#### Spacing & Layout
```css
/* Consistent spacing scale (8px base) */
xs: 4px
sm: 8px
md: 16px
lg: 24px
xl: 32px
xxl: 48px
```

- Use consistent padding and margins
- Align elements properly (left, center, right)
- Group related items together
- Separate unrelated sections with whitespace
-- let the website be responsive (ie fit any mobile or device)
---

### 4. COLOR PALETTE

#### Primary Colors
```css
Primary Blue: #1976d2
Primary Dark: #115293
Primary Light: #42a5f5
```

#### Secondary Colors
```css
Success Green: #4caf50
Warning Orange: #ff9800
Error Red: #f44336
Info Blue: #2196f3
```

#### Neutral Colors
```css
Gray 50: #fafafa
Gray 100: #f5f5f5
Gray 200: #eeeeee
Gray 300: #e0e0e0
Gray 400: #bdbdbd
Gray 500: #9e9e9e
Gray 600: #757575
Gray 700: #616161
Gray 800: #424242
Gray 900: #212121
```

#### Background Colors
```css
Main Background: #f5f5f5
Card Background: #ffffff
Hover Background: #f9f9f9
Active Background: #e8f5e9
```

---

### 5. COMPONENT STYLING STANDARDS

#### Buttons
```css
/* Primary Button */
background: #1976d2
color: white
padding: 12px 24px
border-radius: 6px
font-weight: 500
box-shadow: 0 2px 4px rgba(0,0,0,0.1)
transition: all 0.3s ease

/* Hover */
background: #115293
box-shadow: 0 4px 8px rgba(0,0,0,0.15)
```

#### Cards
```css
background: white
border-radius: 8px
box-shadow: 0 2px 8px rgba(0,0,0,0.08)
padding: 24px
margin-bottom: 24px
```

#### Input Fields
```css
border: 2px solid #e0e0e0
border-radius: 6px
padding: 12px 16px
font-size: 16px
transition: border 0.3s ease

/* Focus */
border-color: #1976d2
outline: none
box-shadow: 0 0 0 3px rgba(25,118,210,0.1)
```

#### Tables
```css
/* Modern table styling */
border-collapse: separate
border-spacing: 0
border-radius: 8px
overflow: hidden

/* Headers */
th: background #f5f5f5, font-weight 600, text-align left

/* Rows */
tr: border-bottom 1px solid #eeeeee
tr:hover: background #f9f9f9
```

---

### 6. ANIMATIONS & TRANSITIONS

**Use Subtle, Professional Animations:**
```css
/* Standard transition */
transition: all 0.3s ease

/* Hover effects */
transform: translateY(-2px)
box-shadow: 0 4px 12px rgba(0,0,0,0.15)

/* Loading states */
@keyframes pulse {
  0%, 100% { opacity: 1 }
  50% { opacity: 0.6 }
}
```

**Avoid:**
- Flashy animations
- Bouncing effects
- Excessive motion
- Distracting transitions

---

### 7. RESPONSIVE DESIGN

**Breakpoints:**
```css
Mobile: < 768px
Tablet: 768px - 1024px
Desktop: > 1024px
Wide: > 1440px
```

**Mobile-First Approach:**
- Design for mobile first
- Progressive enhancement for larger screens
- Touch-friendly buttons (min 44px height)
- Readable font sizes (min 16px)

**Grid System:**
- Use CSS Grid or Flexbox
- 12-column grid for layouts
- Responsive columns that stack on mobile

---

### 8. CONSISTENCY RULES

#### Icons
- Use Material Icons or Feather Icons only
- Consistent icon size (20px-24px)
- Match icon style across the application

#### Borders & Shadows
```css
/* Standard border */
border: 1px solid #e0e0e0
border-radius: 6px

/* Card shadow */
box-shadow: 0 2px 8px rgba(0,0,0,0.08)

/* Elevated shadow */
box-shadow: 0 4px 16px rgba(0,0,0,0.12)
```

#### States
- **Default**: Normal appearance
- **Hover**: Slight elevation, color shift
- **Active**: Pressed appearance
- **Disabled**: Reduced opacity (0.6), no pointer events
- **Focus**: Blue outline, accessibility-friendly

---

### 9. ACCESSIBILITY STANDARDS

**WCAG 2.1 AA Compliance:**
- Color contrast ratio: 4.5:1 for text
- Focus indicators visible
- Keyboard navigation supported
- ARIA labels where needed

**Best Practices:**
- Use semantic HTML (`<button>`, `<nav>`, `<main>`)
- Alt text for images
- Label all form inputs
- Proper heading hierarchy (h1 → h2 → h3)

---

### 10. CODE QUALITY STANDARDS

#### File Organization
```
src/
├── components/       # Reusable UI components
├── pages/           # Page components
├── api/             # API client functions
├── styles/          # CSS/SCSS files
├── utils/           # Helper functions
├── types/           # TypeScript types
└── assets/          # Images, fonts, icons
```

#### Naming Conventions
- **Components**: PascalCase (`UserProfile.tsx`)
- **Files**: camelCase (`apiClient.ts`)
- **CSS Classes**: kebab-case (`user-profile-card`)
- **Functions**: camelCase (`getUserData`)
- **Constants**: UPPER_SNAKE_CASE (`API_BASE_URL`)

#### Comments
```typescript
// Single-line comments for brief explanations

/**
 * Multi-line JSDoc comments for functions
 * @param userId - The user's unique identifier
 * @returns User profile data
 */
```

---

### 11. PERFORMANCE OPTIMIZATION

**Frontend:**
- Lazy load components with `React.lazy()`
- Optimize images (WebP format, proper sizing)
- Minimize bundle size
- Use production builds for deployment
- Implement code splitting

**Backend:**
- Use connection pooling for databases
- Cache frequently accessed data
- Optimize database queries (indexes, LIMIT)
- Use async/await for I/O operations
- Implement rate limiting

---

### 12. ERROR HANDLING

**User-Facing Errors:**
```typescript
// Professional error messages
❌ BAD: "Oops! Something went wrong 😅"
✅ GOOD: "Unable to load data. Please try again."

❌ BAD: "Error 500 💥"
✅ GOOD: "Server error. Please contact support if this persists."
```

**Console Logging:**
```typescript
// Development
console.log('Data loaded:', data)

// Production
// Remove console.logs or use proper logging library
```

---

### 13. SECURITY PRACTICES

**Frontend:**
- Validate all user inputs
- Sanitize HTML content
- Use HTTPS only
- Store tokens securely (httpOnly cookies)
- Implement CORS properly

**Backend:**
- Hash passwords (bcrypt)
- Use parameterized queries (prevent SQL injection)
- Validate JWT tokens
- Implement rate limiting
- Sanitize database inputs

---

### 14. TESTING STANDARDS

**Required Tests:**
- Unit tests for utility functions
- Integration tests for API endpoints
- Component tests for UI
- E2E tests for critical flows

**Test Naming:**
```typescript
describe('UserService', () => {
  it('should fetch user by ID', async () => {
    // Test implementation
  })
})
```

---

### 15. VERSION CONTROL

**Git Commit Messages:**
```
feat: Add teacher assignment functionality
fix: Resolve SGPA calculation bug
refactor: Improve subject list UI styling
docs: Update API documentation
style: Remove emojis from admin dashboard
```

**Branch Naming:**
- `feature/teacher-assignment`
- `fix/sgpa-calculation`
- `refactor/ui-cleanup`

---

## UI ENHANCEMENT CHECKLIST

When enhancing UI, ensure:
- [ ] No emojis anywhere
- [ ] Roboto font applied consistently
- [ ] Smooth spacing (8px scale)
- [ ] Subtle shadows on cards
- [ ] Refined color palette used
- [ ] Professional animations (0.3s ease)
- [ ] All features intact (no logic changes)
- [ ] Better alignment and balance
- [ ] Modern button styles
- [ ] Refined table design
- [ ] Beautiful card layouts
- [ ] Consistent component styling
- [ ] Responsive across all screen sizes
- [ ] Cohesive visual design
- [ ] Production-ready polish

---

## DESIGN INSPIRATION

**Reference SaaS Dashboards:**
- Linear (linear.app)
- Vercel Dashboard
- Stripe Dashboard
- Notion
- Figma
- GitHub UI

**Key Characteristics:**
- Minimalist design
- Excellent typography
- Thoughtful spacing
- Subtle interactions
- Professional color usage
- Clean data visualization
- Intuitive navigation

---

## FINAL NOTES

**Remember:**
1. **Quality over speed** - Take time to do it right
2. **Consistency is key** - Follow patterns throughout
3. **User experience first** - Design for the user, not the developer
4. **Professional appearance** - Every pixel matters
5. **No shortcuts** - Proper implementation always

**When in doubt:**
- Look at professional SaaS applications
- Follow Material Design guidelines
- Ask: "Would I use this in a corporate environment?"
- If it looks amateur, it IS amateur - fix it

---

**Last Updated:** November 4, 2025
**Version:** 1.0
**Maintained by:** Development Team
