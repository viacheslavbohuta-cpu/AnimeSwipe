# Before pushing to GitHub

- [ ] Check `git status` and staged files.
- [ ] Confirm no `.env` files are staged.
- [ ] Confirm no `.venv`, `node_modules`, build folders, tokens, DB dumps, or private keys are staged.
- [ ] Review all source files for credentials.
- [ ] Create a private repository first if you want an extra review step.
- [ ] Commit and push only after reviewing the staged file list.

Commands from the project root:

```powershell
git init
git status
git add .
git status
```

Inspect the staged list. If `.env` or other secrets appear, stop and remove them from the staging area before committing.

```powershell
git commit -m "Prepare AnimeSwipe for GitHub"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/AnimeSwipe.git
git push -u origin main
```
