# Casa a Dois

As finanças da casa, a dois. A web app for a couple's shared finances: forecast balance, bills to pay, how the joint account is split, accounts and cards, housing cost, emergency fund, investments and annual bills. Portuguese (PT-PT) interface, EUR, installable on phones.

> **This repository is public.** Personal figures (names, salaries, banks, bills) are never stored in the code. They come from the in-app setup wizard or from a private setup file you import once.

## Screens

| Menu | What it shows |
|---|---|
| Visão geral | Saldo previsto (per person or couple), contas a pagar, divisão da casa, contas e cartões, moradia, reserva |
| Fluxo de caixa | Every transaction in the month, with search and filters; tap to edit |
| Contas e cartões | Each bank account as a card, balance and month's movements |
| Nossa casa | Bills for the month (tick to mark paid), joint-account split, housing cost |
| Nossa reserva | Emergency fund, savings goals, investments (PPR, ETF, Certificados), annual-bills fund |
| Orçamento | Budget per category vs actual |
| Revisão do mês | Highlights, vs last month, by category, by person, top 5 expenses |
| Relatório anual | 12 months of income, spending and savings rate |
| **Ajustes** | Everything is editable: income and joint contributions, house bills, banks and cards, annual bills, categories and import rules, preferences, backup |

## How the numbers work

- **Saldo previsto (person)** = salary (+ holiday/Christmas pay in their months) − what you put in the joint account − personal bills − day-to-day spending − monthly share of annual bills.
- **Saldo previsto (couple)** = both incomes − all bills − all day-to-day spending − annual bills.
- **Divisão da casa** splits by what each person puts in the joint account; a marker shows what a split proportional to salaries would be.
- Once the real salary is imported (category in the "Salário" group), it replaces the planned one for that month.
- Imported transactions in a bill's category count through the bill, not as day-to-day spending, so nothing is counted twice. Internal transfers and savings never count as spending.

The logic lives in `src/lib/calc.ts` and is covered by `src/lib/calc.test.ts`.

## Run it

```bash
npm install
```

```bash
npm run dev
```

With no Supabase keys the app runs in **local mode**: data stays in that browser only. On first open choose "Usar um ficheiro de configuração" (your private setup `.json`), "Começar do zero", or the demo data.

```bash
npm test
```

## Import bank statements

**+ Adicionar → Importar extrato**, pick the account and a CSV export from the bank's homebanking. Columns are detected automatically (Revolut is recognised; for others confirm the date, description and amount or debit/credit columns once and it's remembered per account). Re-importing the same period skips duplicates. Categories are suggested from your rules (Ajustes → Categorias e regras) and common Portuguese merchants. When editing a transaction you can tick "use this category for similar transactions" to create a rule.

## Share between two phones (Supabase, free)

1. Create a project at supabase.com (choose the Frankfurt / EU region).
2. In **SQL Editor**, run `supabase/schema.sql`.
3. In **Authentication → URL Configuration**, set the Site URL to your app's address (for example the Vercel URL).
4. Copy **Project URL** and **anon public key** from Project Settings → API into `.env` (see `.env.example`), or into the Vercel environment variables:
   ```
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```
5. Open the app, log in with your e-mail (magic link). The first login creates the household; you can bring the data from local mode or import the setup file.
6. In **Ajustes → Preferências → Quem tem acesso**, invite your partner's e-mail. In **Ajustes → Nossa renda**, put each person's login e-mail on their row.

Row-level security limits every row to members of the household. Changes sync live between both phones.

## Deploy (Vercel, free)

Import the repository in Vercel (framework: Vite), add the two `VITE_SUPABASE_*` variables, deploy. `vercel.json` handles page routes. On the phone, open the site and use "Add to Home Screen".

## Stack

Vite, React 18, TypeScript, Tailwind CSS, Supabase (Postgres, auth, realtime), PapaParse. Illustrations are original SVGs in `src/components/art.tsx`.

## Also in this repo

`Household_Finances.xlsx`: the earlier Excel workbook (budget, savings, annual bills, monthly review). The app replaces it; it is kept for reference.
