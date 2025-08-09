# Changelog Management Guide

## Overview
This project uses automated changelog generation following the [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Commit Convention
Use conventional commits for automatic changelog generation:

- `feat:` New features (Added section)
- `fix:` Bug fixes (Fixed section)
- `docs:` Documentation changes
- `style:` Code formatting (not included in changelog)
- `refactor:` Code restructuring (Changed section)
- `test:` Test additions/changes (not included in changelog)
- `chore:` Maintenance tasks (not included in changelog)
- `perf:` Performance improvements

### Examples
```bash
git commit -m "feat: add user authentication"
git commit -m "fix: resolve memory leak in dashboard"
git commit -m "docs: update API documentation"
git commit -m "refactor: reorganize notification service"
```

## Generating Changelog

### Manual Update
Edit `CHANGELOG.md` directly following the Keep a Changelog format.

### Automatic Generation

#### From Git Commits (Conventional Changelog)
```bash
npm run changelog
```
This appends new entries based on conventional commits since the last version tag.

#### Full Regeneration (Auto-changelog)
```bash
npm run changelog:auto
```
This regenerates the entire changelog from git history.

## Release Process

1. **Update Version**
   ```bash
   npm version patch  # or minor/major
   ```
   This automatically:
   - Updates version in package.json
   - Generates changelog entries
   - Creates a git commit and tag

2. **Manual Release**
   ```bash
   # Update changelog
   npm run changelog
   
   # Commit changes
   git add CHANGELOG.md
   git commit -m "chore: update changelog for v0.2.0"
   
   # Create tag
   git tag -a v0.2.0 -m "Release version 0.2.0"
   
   # Push to repository
   git push origin main --tags
   ```

## Changelog Sections

- **Added** - New features
- **Changed** - Changes in existing functionality
- **Deprecated** - Soon-to-be removed features
- **Removed** - Removed features
- **Fixed** - Bug fixes
- **Security** - Security improvements

## Best Practices

1. **Write Clear Commit Messages**
   - Focus on what changed and why
   - Keep first line under 50 characters
   - Add detailed description if needed

2. **Group Related Changes**
   - Combine related commits in changelog
   - Use bullet points for multiple changes

3. **User-Focused Entries**
   - Write from user perspective
   - Avoid technical jargon
   - Include breaking changes prominently

4. **Link to Issues/PRs**
   ```markdown
   ### Fixed
   - Memory leak in dashboard ([#123](https://github.com/...))
   ```

5. **Version Comparison Links**
   Always include comparison links at the bottom:
   ```markdown
   [0.2.0]: https://github.com/user/repo/compare/v0.1.0...v0.2.0
   ```

## Configuration Files

- `.auto-changelog` - Auto-changelog configuration
- `.versionrc.json` - Conventional-changelog configuration
- `CHANGELOG.md` - The actual changelog file

## Troubleshooting

### Changelog not updating
- Ensure commits follow conventional format
- Check if version tags exist: `git tag -l`
- Verify remote URL in `.versionrc.json`

### Missing entries
- Only conventional commits are included
- Check commit format: `git log --oneline`
- Manually add important changes if needed

### Duplicate entries
- Remove duplicates manually
- Use either `changelog` or `changelog:auto`, not both

## Integration with CI/CD

Add to GitHub Actions workflow:
```yaml
- name: Generate Changelog
  run: npm run changelog
  
- name: Commit Changelog
  run: |
    git add CHANGELOG.md
    git commit -m "chore: update changelog" || true
```