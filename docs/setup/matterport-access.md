# Matterport Access Checklist

This repository is being set up as a Matterport-centered immersive application. To continue implementation, provide the following access in local environment variables rather than in tracked source files.

## 1. Minimum data needed to start

For a public-model MVP, these two values are enough to wire the first full-screen explorer:

- `NEXT_PUBLIC_MATTERPORT_MODEL_SID`
- `NEXT_PUBLIC_MATTERPORT_SDK_KEY`

The SDK key is created in Matterport `Account Settings -> Developer Tools -> SDK Key Management`. Add at least:

- `localhost`
- `localhost:3000`
- your future preview/production domains when available

The model SID is the `m=` value from a Matterport showcase URL.

## 2. Server-side access for metadata sync and workflow automation

If you want us to sync rooms, tags, model metadata, or use GraphQL APIs from the backend, also provide:

- `MATTERPORT_API_TOKEN_ID`
- `MATTERPORT_API_TOKEN_SECRET`

Matterport documents these as account-level API credentials generated from `Developer Tools -> API Token Management`. They are server-side only and must never be exposed to the browser.

## 3. Private model embedding

If your spaces are private and you need authenticated embedding, confirm whether your Matterport account has OAuth enabled. If yes, also provide:

- `MATTERPORT_OAUTH_CLIENT_ID`
- `MATTERPORT_OAUTH_CLIENT_SECRET`
- `MATTERPORT_OAUTH_REDIRECT_URI`

If OAuth is not enabled on your account, we can still build against public or temporarily shared models first.

## 4. Sample business data to unblock realistic implementation

Alongside credentials, provide at least one or two real examples:

- 1 to 3 Matterport model URLs
- whether each model is `public` or `private`
- the primary use case for each model: `estate`, `museum`, `inventory`, or `story`
- a short list of expected workflows, for example:
  - `identify objects in living room`
  - `mark items as keep/sell/donate/archive`
  - `generate a room summary`

## 5. Recommended way to hand over credentials

Use one of these two approaches:

1. Copy `.env.example` to `.env.local` and fill in the values.
2. If you prefer separation, create `.env.matterport.local` with the same keys.

Both are already ignored by git because `.gitignore` excludes `.env*` while preserving `.env.example`.

## 6. What I will use each credential for

- `NEXT_PUBLIC_MATTERPORT_MODEL_SID`: default space loaded into the immersive shell
- `NEXT_PUBLIC_MATTERPORT_SDK_KEY`: browser-side SDK bootstrap for the Matterport embed
- `MATTERPORT_API_TOKEN_ID` / `MATTERPORT_API_TOKEN_SECRET`: backend sync, tags, metadata, automation, and audit-safe server workflows
- `MATTERPORT_OAUTH_*`: authenticated embed flow for private models
- `MATTERPORT_WEBHOOK_SECRET`: validating Matterport webhook callbacks if we subscribe to asynchronous events later

## 7. Official integration notes used for this setup

- Matterport SDK for Embeds requires an `applicationKey`-backed SDK key and model SID for browser embeds.
- Matterport API tokens are generated in Developer Tools and are documented as server-side credentials using Basic authentication.
- Matterport OAuth for private model embeds is a separate capability and is not available on every account by default.

Once `.env.local` exists, the next implementation step is to scaffold the frontend shell, backend API boundary, and a secure provider config flow with git commits per phase.

