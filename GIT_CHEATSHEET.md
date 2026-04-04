# GitHub Cheat Sheet

This Mac is now set up to use GitHub over SSH, which means you can work across multiple local projects and multiple GitHub repos without redoing auth each time.

## One-Time Setup Already Done

- Git name: `Mark Whitley`
- Git email: `whitley40@gmail.com`
- Default branch for new repos: `main`
- GitHub auth: SSH key connected to your GitHub account

## Starting a Brand New Local Project

```bash
mkdir my-project
cd my-project
git init
```

Then create a new empty repo on GitHub and connect it:

```bash
git remote add origin git@github.com:mwhit82/my-project.git
```

Make your first commit and push it:

```bash
git add .
git commit -m "Initial commit"
git push -u origin main
```

## Connecting an Existing Local Folder to a New GitHub Repo

If the folder is not already a git repo:

```bash
git init
git remote add origin git@github.com:mwhit82/repo-name.git
git add .
git commit -m "Initial commit"
git push -u origin main
```

If GitHub already created a `README.md`, and push is rejected, run:

```bash
git fetch origin
git pull origin main --allow-unrelated-histories --no-rebase
git push -u origin main
```

## Everyday Commands

Check what changed:

```bash
git status
```

Save work locally:

```bash
git add .
git commit -m "Describe what changed"
```

Send work to GitHub:

```bash
git push
```

Bring down the latest remote changes:

```bash
git pull
```

## Simple Branch Workflow

Create a feature branch:

```bash
git checkout -b feature/homepage-update
```

Push that branch:

```bash
git push -u origin feature/homepage-update
```

Switch back to main:

```bash
git checkout main
```

## Handy Checks

See which remote repo a project is connected to:

```bash
git remote -v
```

See which branch you are on:

```bash
git branch --show-current
```

Test GitHub SSH auth:

```bash
ssh -T git@github.com
```

Expected result:

```text
Hi mwhit82! You've successfully authenticated, but GitHub does not provide shell access.
```

## Good Habits

- Use `main` for your stable base branch.
- Create a feature branch when making a meaningful change.
- Run `git status` often.
- Push regularly so GitHub has a backup of your work.
- If a repo already exists on GitHub, check whether it was created with a README before your first push.

## When in Doubt

These three commands solve a lot of confusion:

```bash
git status
git remote -v
git branch --show-current
```
