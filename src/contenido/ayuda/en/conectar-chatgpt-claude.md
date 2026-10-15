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

1. On chatgpt.com, go to **Plugins** (in the left menu), click **+** and choose **Add custom MCP server**.
2. Fill in the form:
   - **Icon** (optional): you can upload the [Clipfine icon](https://www.clipfine.io/icons/clipfine-256.png). It needs a PNG up to 10 KB.
   - **Name**: Clipfine.
   - **Description** (optional): for example, "My clients' analytics, clips and posts in Clipfine".
   - **Connection**: keep **Server URL** selected and paste the connector URL, **{{mcp}}**.
   - **Authentication**: **OAuth**. You don't need to touch **Advanced OAuth settings**: ChatGPT finds what it needs on its own.
3. Check **I understand and want to continue** (the warning ChatGPT shows for any custom server) and click **Create as a plugin**.
4. ChatGPT shows **Connect Clipfine**, with what it shares with the app (relevant memories and chats, depending on your ChatGPT settings). Click **Continue to Clipfine**.
5. Clipfine opens (if you weren't signed in, sign in with your account). The **"ChatGPT wants to connect to your Clipfine"** screen shows what it will be able to see: your brands, their analytics and what's scheduled, and Clipfine's help center, always **read only**. Click **Allow**.
6. You're back in ChatGPT and Clipfine shows up under **Plugins → Installed**. In a new chat, pick the Clipfine plugin and ask away.

If you don't see that option in Plugins:

- Turn on **developer mode** in **Settings → Security and login** (in earlier versions it was under **Settings → Connectors → Advanced**). Then **Create MCP App** shows up in Plugins.
- Check your plan: adding your own servers needs a paid ChatGPT plan.
- If your ChatGPT belongs to a company (Business or Enterprise), its admin has to give you permission to create connections.

Menu names may change depending on each app's version.

## What you can ask

- "Which Café Luna clips did best this month?"
- "Put together the last 30 days report so I can send it to the client."
- "What does each client have scheduled this week? Is anything waiting for review?"
- "How do I invite a client so they can only approve?"

## What it can't do

It's **read only**: it doesn't schedule, approve, edit or delete anything. To disconnect it, go to **Profile → Connect to ChatGPT or Claude** and click **Disconnect**.

## See what's connected

In **Profile → Connect to ChatGPT or Claude** you see each connected app with its status:

- **Active**: used (or connected) in the last week.
- **Not in use**: nobody has asked it anything in over a week. If you removed it in ChatGPT or Claude, disconnect it here too: they don't let us know.
- **Expired**: 60 days went by without use. To use it again, connect it again.

If you're the **owner** of a brand, **Team** shows who on the team has ChatGPT or Claude connected and can ask about that brand. Each person disconnects their own; if someone shouldn't see the brand anymore, remove them from the team.

> **Tip:** if you work with several clients, name the brand in your question. If it doesn't know which one, it'll show you the list of your brands.
