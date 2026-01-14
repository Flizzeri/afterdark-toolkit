# Changesets

This folder contains "changeset" files - simple markdown files that describe the changes in a PR.

## Adding a changeset

```bash
pnpm changeset
```

Select the packages that changed, the type of change (major/minor/patch), and write a brief description.

Commit the generated `.md` file with your PR.

## Release process

When PRs with changesets merge, a "Version Packages" PR is automatically created.
Merging that PR publishes the packages to npm.
