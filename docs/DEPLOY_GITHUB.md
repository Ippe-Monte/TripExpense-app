# Deploy TripExpense V11.1 to GitHub Pages

## A. Upload files

Commit the project to the repository root. `index.html` must be at the repository root.

## B. Configure the app

Edit `assets/js/config.js`:

```js
window.TRIP_EXPENSE_CONFIG = {
  SUPABASE_URL: 'https://YOUR-PROJECT.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_...'
};
```

A browser-visible Publishable/anon key is expected. Do not commit secret/service_role keys.

## C. Enable Pages

GitHub → Repository → Settings → Pages → Deploy from a branch → `main` → `/ (root)` → Save.

## D. Configure Supabase Auth

Set Site URL to the published GitHub Pages URL, for example:

`https://YOUR-USERNAME.github.io/TripExpense/`

Add the same URL to Redirect URLs if required by your Auth flow.

## E. Verify

1. Open the GitHub Pages URL.
2. Register a test account.
3. Create a Group.
4. Create a Trip.
5. Add Schedule and Expense.
6. Upload a receipt.
7. Check Settlement and Reports.
8. Test a second account to verify RLS and membership isolation.
