# Contributing to WiFi Pulse

Thanks for your interest in improving WiFi Pulse.

This project uses a lightweight issue-first workflow so changes are easy to understand, test, and review.

## Workflow

1. **Open or choose an issue**
   - Describe the problem, feature, or documentation change.
   - Keep each issue focused on one clear outcome.

2. **Create a branch from `main`**
   - Features: `feature/short-description`
   - Fixes: `fix/short-description`
   - Documentation: `docs/short-description`

3. **Make focused commits**
   - Keep unrelated changes separate.
   - Use clear commit messages such as:
     - `feat: add connection-quality indicator`
     - `fix: handle failed speed-test request`
     - `docs: clarify local setup`

4. **Test before opening a pull request**
   - Confirm the app loads without console errors.
   - Test the affected flow on desktop and mobile-sized layouts when relevant.
   - Run any repository checks that apply to the change.
   - Verify no secrets, private credentials, or generated junk files are included.

5. **Open a pull request**
   - Explain what changed and why.
   - Link the related issue with `Fixes #<issue-number>` when the PR fully resolves it.
   - Include screenshots for visible UI changes when useful.
   - Complete the PR checklist.

6. **Review, merge, and clean up**
   - Address review feedback before merging.
   - Merge only when the change is ready.
   - Delete the feature branch after merge.

## Quality expectations

Changes should aim to preserve:

- Responsive and accessible UI behavior
- Clear error handling
- Privacy-conscious client-side behavior
- No exposed secrets or private credentials
- Compatibility with static deployment
- Clear documentation for user-facing changes

## Security

Never commit passwords, database credentials, service-role keys, private API tokens, or other secrets. Public client-side configuration should be limited to values intended to be exposed in the browser.

## Scope

WiFi Pulse is an independent project. Contributions should use original code, names, visuals, and assets and should not copy proprietary material from third-party products.
