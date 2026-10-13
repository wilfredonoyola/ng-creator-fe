---
titulo: What to do if a post fails
descripcion: Why a post can end up as Failed, how to see the reason and how to fix and retry it on the network that rejected it, without scheduling another one.
categoria: publicar
orden: 3
funciones: publicar
---
Sometimes a network doesn't accept a video. This guide helps you see why and send it again.

## What Clipfine does on its own

If the problem looks temporary (the network isn't responding, a connection drop), Clipfine retries on its own, waiting a bit longer each time. Meanwhile the calendar shows **Retrying:** with the reason. If it still doesn't go out after several attempts, the post is marked **Failed**.

## Find what failed

- In the **Calendar**, at the top, you see how many posts failed that week.
- In the editor, the clip shows **Failed on networks**.

## See the reason and retry

1. Open the clip and click **Schedule** (or, in the **Calendar**, open the post and click **Edit and retry**).
2. Under **Posts for this clip**, find the one marked **Failed**: below it, in red, is the reason the network gave.
3. Click **Edit and retry**: the page focuses on that post alone, with everything as it was (text, tags, collaborators, cover).
4. Fix what you need and click **Retry on** that network. The same post is sent again: no new one is scheduled and the networks that already went out aren't touched.

If there's nothing to change, **Retry as is** sends it again right away.

If Clipfine warns that **it may have gone out anyway**, check the account first: retrying could post it twice. If it didn't go out, click **Retry anyway**.

## Common causes

- **The account got disconnected or the network revoked access.** The brand owner needs to disconnect it and connect it again in **Connected networks**. See [Connect a brand's networks](/ayuda/conectar-redes).
- **Someone disconnected the account** after scheduling. Anything scheduled on that network fails when it's due.
- **The video couldn't be exported.** If the clip was waiting for the final video and the export failed, open it in the editor, export it and schedule again. See [Export](/ayuda/exportar).
- **Instagram rejected a tag or a collaborator.** It happens when an account is private, doesn't exist or doesn't accept collaboration invites. Clipfine retries it on its own **without tags** so the video still goes out, and lets you know. To tag them again, keep those people as tags, not as collaborators. See [Tag people](/ayuda/etiquetar-personas).
- **The network rejected the content.** Read the reason: it's usually something in the video or text you need to fix in the clip.

If the reason isn't clear, or it fails again after reconnecting, contact us with the brand name, the clip and the network.

> **Tip:** check the calendar once a day with the failed counter in view. Rescheduling in time keeps clients from noticing a clip didn't go out.
