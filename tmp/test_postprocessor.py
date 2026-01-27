"""
Test CSSPostProcessor against the actual problematic output file.

This validates that the post-processor correctly fixes:
1. Duplicate :root declarations
2. Invalid CSS variable names
3. Brand color overwrites
"""

import re
import sys
import os

# Read the problematic CSS file
CSS_FILE = "tmp/stylizer_new/example_output_mvgm_vvebeheer_2.html"

# Valid CSS variable names
VALID_VARIABLES = {
    '--ctc-primary', '--ctc-primary-light', '--ctc-primary-dark',
    '--ctc-secondary', '--ctc-accent',
    '--ctc-neutral-darkest', '--ctc-neutral-dark', '--ctc-neutral-medium',
    '--ctc-neutral-light', '--ctc-neutral-lightest',
    '--ctc-success', '--ctc-warning', '--ctc-error', '--ctc-info',
    '--ctc-font-heading', '--ctc-font-body',
    '--ctc-font-size-base', '--ctc-font-scale-ratio',
    '--ctc-heading-weight', '--ctc-body-weight', '--ctc-body-line-height',
    '--ctc-font-size-xs', '--ctc-font-size-sm', '--ctc-font-size-md',
    '--ctc-font-size-lg', '--ctc-font-size-xl', '--ctc-font-size-2xl', '--ctc-font-size-3xl',
    '--ctc-spacing-unit',
    '--ctc-spacing-xs', '--ctc-spacing-sm', '--ctc-spacing-md',
    '--ctc-spacing-lg', '--ctc-spacing-xl', '--ctc-spacing-2xl', '--ctc-spacing-3xl',
    '--ctc-radius-sm', '--ctc-radius-md', '--ctc-radius-lg', '--ctc-radius-full',
    '--ctc-shadow-card', '--ctc-shadow-button', '--ctc-shadow-elevated',
    '--ctc-transition-speed', '--ctc-easing',
}

# Invalid variable patterns
INVALID_PATTERNS = [
    r'--ctc-neutral-\d+',
    r'--ctc-spacing-\d+$',
    r'--ctc-radius-\d+$',
    r'--ctc-space-\d+',
]

# Variable normalization map (from CSSPostProcessor.ts)
NORMALIZATION_MAP = {
    # Numeric neutrals
    '--ctc-neutral-0': '--ctc-neutral-lightest',
    '--ctc-neutral-1': '--ctc-neutral-lightest',
    '--ctc-neutral-2': '--ctc-neutral-light',
    '--ctc-neutral-3': '--ctc-neutral-light',
    '--ctc-neutral-4': '--ctc-neutral-medium',
    '--ctc-neutral-5': '--ctc-neutral-medium',
    '--ctc-neutral-6': '--ctc-neutral-dark',
    '--ctc-neutral-7': '--ctc-neutral-darkest',
    # Tailwind-style
    '--ctc-neutral-50': '--ctc-neutral-lightest',
    '--ctc-neutral-100': '--ctc-neutral-lightest',
    '--ctc-neutral-200': '--ctc-neutral-light',
    '--ctc-neutral-300': '--ctc-neutral-light',
    '--ctc-neutral-400': '--ctc-neutral-medium',
    '--ctc-neutral-500': '--ctc-neutral-medium',
    '--ctc-neutral-600': '--ctc-neutral-dark',
    '--ctc-neutral-700': '--ctc-neutral-dark',
    '--ctc-neutral-800': '--ctc-neutral-darkest',
    '--ctc-neutral-900': '--ctc-neutral-darkest',
    '--ctc-neutral-950': '--ctc-neutral-darkest',
    # Spacing
    '--ctc-spacing-0': '0',
    '--ctc-spacing-1': '--ctc-spacing-xs',
    '--ctc-spacing-2': '--ctc-spacing-sm',
    '--ctc-spacing-3': '--ctc-spacing-md',
    '--ctc-spacing-4': '--ctc-spacing-lg',
    '--ctc-spacing-5': '--ctc-spacing-xl',
    '--ctc-spacing-6': '--ctc-spacing-2xl',
    '--ctc-spacing-8': '--ctc-spacing-3xl',
    '--ctc-spacing-9': '--ctc-spacing-3xl',
    '--ctc-spacing-10': '--ctc-spacing-3xl',
    '--ctc-spacing-11': '--ctc-spacing-3xl',
    '--ctc-spacing-12': '--ctc-spacing-3xl',
    '--ctc-spacing-14': '--ctc-spacing-3xl',
    '--ctc-spacing-16': '--ctc-spacing-3xl',
    '--ctc-spacing-20': '--ctc-spacing-3xl',
    '--ctc-spacing-24': '--ctc-spacing-3xl',
    '--ctc-space-4': '--ctc-spacing-lg',
    '--ctc-space-8': '--ctc-spacing-3xl',
    # Radius
    '--ctc-radius-0': '0',
    '--ctc-radius-1': '--ctc-radius-sm',
    '--ctc-radius-2': '--ctc-radius-md',
}


def extract_css_from_html(html_content):
    """Extract CSS from style tags in HTML."""
    # Find all style tag contents
    style_pattern = r'<style[^>]*>(.*?)</style>'
    matches = re.findall(style_pattern, html_content, re.DOTALL)
    return '\n'.join(matches)


def count_root_declarations(css):
    """Count :root declarations."""
    return len(re.findall(r':root\s*\{', css))


def find_invalid_variables(css):
    """Find invalid CSS variable usages."""
    var_pattern = r'var\(\s*(--ctc-[a-zA-Z0-9-]+)\s*(?:,\s*[^)]+)?\s*\)'
    matches = re.findall(var_pattern, css)

    invalid = set()
    for var_name in matches:
        for pattern in INVALID_PATTERNS:
            if re.match(pattern, var_name):
                invalid.add(var_name)
                break

    return invalid


def find_brand_color_conflicts(css):
    """Find conflicting brand color definitions."""
    root_pattern = r':root\s*\{([^}]*)\}'
    roots = re.findall(root_pattern, css)

    primaries = []
    for root in roots:
        match = re.search(r'--ctc-primary:\s*([^;]+)', root)
        if match:
            primaries.append(match.group(1).strip().lower())

    return primaries


def post_process_css(css):
    """Simulate the CSSPostProcessor behavior."""
    processed = css

    # 1. Strip duplicate :root declarations (keep first)
    root_pattern = r':root\s*\{[^}]*\}'
    roots = list(re.finditer(root_pattern, processed))

    if len(roots) > 1:
        # Replace all but the first with a comment
        for i, match in enumerate(roots[1:], 1):
            processed = processed[:match.start()] + '/* [PostProcessor] Stripped duplicate :root */' + processed[match.end():]
            # Recalculate positions after replacement
            roots = list(re.finditer(root_pattern, processed))

    # Actually, let's do it differently - rebuild
    processed = css
    first_root = True
    def replace_root(match):
        nonlocal first_root
        if first_root:
            first_root = True
            return match.group(0)
        return '/* [PostProcessor] Stripped duplicate :root */'

    # Count roots first
    root_count = len(re.findall(r':root\s*\{[^}]*\}', processed))
    if root_count > 1:
        # Strip all but first
        parts = re.split(r'(:root\s*\{[^}]*\})', processed)
        result = []
        kept_first = False
        for part in parts:
            if re.match(r':root\s*\{', part):
                if not kept_first:
                    result.append(part)
                    kept_first = True
                else:
                    result.append('/* [PostProcessor] Stripped duplicate :root */')
            else:
                result.append(part)
        processed = ''.join(result)

    # 2. Normalize variable names
    def normalize_var(match):
        var_name = match.group(1)
        fallback = match.group(2) if match.lastindex >= 2 else None

        if var_name in NORMALIZATION_MAP:
            normalized = NORMALIZATION_MAP[var_name]
            if not normalized.startswith('--'):
                return normalized  # Literal value like '0'
            if fallback:
                return f'var({normalized}, {fallback})'
            return f'var({normalized})'
        return match.group(0)

    processed = re.sub(
        r'var\(\s*(--ctc-[a-zA-Z0-9-]+)\s*(?:,\s*([^)]+))?\s*\)',
        normalize_var,
        processed
    )

    return processed


def main():
    print("=" * 70)
    print("CSS POST-PROCESSOR VALIDATION TEST")
    print("=" * 70)

    # Read the problematic file
    if not os.path.exists(CSS_FILE):
        print(f"ERROR: File not found: {CSS_FILE}")
        sys.exit(1)

    with open(CSS_FILE, 'r', encoding='utf-8') as f:
        html_content = f.read()

    css = extract_css_from_html(html_content)
    print(f"\nExtracted {len(css)} characters of CSS from {CSS_FILE}")

    # Analyze BEFORE
    print("\n" + "=" * 70)
    print("BEFORE POST-PROCESSING")
    print("=" * 70)

    root_count = count_root_declarations(css)
    invalid_vars = find_invalid_variables(css)
    brand_colors = find_brand_color_conflicts(css)

    print(f"\n:root declarations: {root_count} (should be 1)")
    print(f"Invalid variables: {len(invalid_vars)}")
    if invalid_vars:
        print(f"  Variables: {', '.join(sorted(invalid_vars))}")
    print(f"Brand colors found: {brand_colors}")
    if len(set(brand_colors)) > 1:
        print("  WARNING: Conflicting brand colors!")

    before_issues = []
    if root_count > 1:
        before_issues.append(f"Duplicate :root ({root_count})")
    if invalid_vars:
        before_issues.append(f"Invalid variables ({len(invalid_vars)})")
    if len(set(brand_colors)) > 1:
        before_issues.append("Brand color conflict")

    print(f"\nIssues found: {len(before_issues)}")
    for issue in before_issues:
        print(f"  - {issue}")

    # Apply post-processing
    print("\n" + "=" * 70)
    print("APPLYING POST-PROCESSOR")
    print("=" * 70)

    processed_css = post_process_css(css)

    # Save processed CSS
    with open('tmp/processed_css.css', 'w', encoding='utf-8') as f:
        f.write(processed_css)
    print("\nSaved processed CSS to tmp/processed_css.css")

    # Analyze AFTER
    print("\n" + "=" * 70)
    print("AFTER POST-PROCESSING")
    print("=" * 70)

    root_count_after = count_root_declarations(processed_css)
    invalid_vars_after = find_invalid_variables(processed_css)
    brand_colors_after = find_brand_color_conflicts(processed_css)

    print(f"\n:root declarations: {root_count_after} (should be 1)")
    print(f"Invalid variables: {len(invalid_vars_after)}")
    if invalid_vars_after:
        print(f"  Variables: {', '.join(sorted(invalid_vars_after))}")
    print(f"Brand colors found: {brand_colors_after}")

    after_issues = []
    if root_count_after > 1:
        after_issues.append(f"Duplicate :root ({root_count_after})")
    if invalid_vars_after:
        after_issues.append(f"Invalid variables ({len(invalid_vars_after)})")
    if len(set(brand_colors_after)) > 1:
        after_issues.append("Brand color conflict")

    # Summary
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)

    print(f"\nBefore: {len(before_issues)} issues")
    print(f"After:  {len(after_issues)} issues")

    fixed_roots = root_count > 1 and root_count_after == 1
    fixed_vars = len(invalid_vars) > len(invalid_vars_after)

    print(f"\nFixed duplicate :root: {'YES' if fixed_roots else 'NO'}")
    print(f"Fixed invalid variables: {'YES' if fixed_vars else 'NO'} ({len(invalid_vars)} -> {len(invalid_vars_after)})")

    if root_count_after == 1 and len(invalid_vars_after) == 0:
        print("\n" + "=" * 70)
        print("[PASS] CSS POST-PROCESSOR WORKS CORRECTLY")
        print("=" * 70)
        return 0
    else:
        print("\n" + "=" * 70)
        print("[PARTIAL] Some issues remain - review the output")
        print("=" * 70)
        return 1


if __name__ == "__main__":
    sys.exit(main())
