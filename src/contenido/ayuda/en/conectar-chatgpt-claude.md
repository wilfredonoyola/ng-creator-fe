---
titulo: Connect Clipfine to ChatGPT or Claude
descripcion: Add Clipfine as a connector in ChatGPT or Claude and ask how each client's clips are performing, what's scheduled or how to use Clipfine.
categoria: app
orden: 3
funciones:
---
With the Clipfine connector, ChatGPT or Claude can look up your brands, their metrics and what they have scheduled, and answer with Clipfine's help center. They see the same as you do in the dashboard, with your permissions.

## What you need

- Your Clipfine account.
- The connector URL: **{{mcp}}**. You'll also find it in **Profile → Connect to ChatGPT or Claude**, with a button to copy it.
- A ChatGPT or Claude account that allows custom connectors. It depends on your plan with them.

## In Claude

1. Go to **Settings → Connectors** and choose **Add custom connector**.
2. Give it a name (for example, Clipfine) and paste the connector URL.
3. Click **Connect**. Clipfine opens: sign in with your account and click **Allow**.

## In ChatGPT

1. Go to **Settings → Apps & Connectors**. If you don't see the option to create one, turn on **developer mode** in the advanced settings.
2. Create a new connector, paste the URL and choose **OAuth** authentication.
3. Clipfine opens: sign in with your account and click **Allow**.

Menu names may change depending on each app's version.

## What you can ask

- "Which Café Luna clips did best this month?"
- "Put together the last 30 days report so I can send it to the client."
- "What does each client have scheduled this week? Is anything waiting for review?"
- "How do I invite a client so they can only approve?"

## What it can't do

It's **read only**: it doesn't schedule, approve, edit or delete anything. To disconnect it, go to **Profile → Connect to ChatGPT or Claude** and click **Disconnect**.

> **Tip:** if you work with several clients, name the brand in your question. If it doesn't know which one, it'll show you the list of your brands.
