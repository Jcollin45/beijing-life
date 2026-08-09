# Cloud game testing

The game test suite is configured to run on four temporary GitHub-hosted computers. The tests do
not launch Chrome, render the game, or consume CPU/GPU on your Mac. Your Mac only uploads changed
files when you push them to GitHub and downloads the result page when you view it.

## One-time connection

This folder is not a Git repository yet, so GitHub cannot see the workflow until it is connected.

1. On GitHub, create an empty **private** repository. Do not add a README or `.gitignore` there.
2. In Terminal, run the following commands, replacing the example URL with the URL GitHub shows:

   ```bash
   cd /Users/jonahcollins/Desktop/Chinesegame
   git init
   git branch -M main
   git add .
   git commit -m "Set up cloud game testing"
   git remote add origin https://github.com/YOUR-NAME/YOUR-REPOSITORY.git
   git push -u origin main
   ```

The first upload includes the runtime game models and audio, so it can take a while. Local caches,
screenshots, Blender working files, virtual environments, and generated reports are excluded by
`.gitignore`; they are not needed to test the browser game.

## Running tests

- Tests never start automatically, on a timer, or when you push. This prevents accidental usage.
- Open the repository on GitHub, choose **Actions**, choose **Cloud game tests**, select
  **Run workflow**, and choose `fast`, `full`, `mall`, or `apartment`. `fast` is the default.
- GitHub shows four independent shard jobs. A run passes only when all four pass.
- Each shard saves its complete console log for one day under the run's **Artifacts** section.

The `full` choice runs every registered harness. The other choices are useful for a quicker check.
Starting a workflow from the GitHub page does not start any test process on this computer.

The hosted machines use software WebGL for repeatable correctness checks. The separate
`mall:perf:accept` command measures this Mac's real GPU and is intentionally not run here; a true
remote frame-rate benchmark would need a paid GPU runner. Also note that private repositories use
the GitHub Actions minutes included with the repository owner's plan.

## Guarantee that GitHub cannot charge you

Use a GitHub Free account with **no payment method attached**. GitHub provides included Actions
minutes for private repositories; when those minutes are gone and there is no valid payment method,
GitHub blocks further hosted-runner usage instead of billing it. Do not add a card later unless you
intend to enable paid overages.

If the account already has a payment method, open **Settings → Billing and licensing → Budgets
and alerts** before the first run. Create a product-level GitHub Actions budget and enable
**Stop usage when budget limit is reached**. The workflow itself cannot change this account-level
billing safety setting.

## Local planning without running tests

These commands only print what a cloud shard will contain; they do not open Chrome:

```bash
node .verify.js --fast --shard=1/4 --plan
node .verify.js --shard=1/4 --plan
```
