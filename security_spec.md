# Security Specification for PromptHero

## 1. Data Invariants
- A prompt must have a title (max 20 chars), content, an authorId, a scene (SRT or Custom), and a createdAt timestamp.
- User profiles can only be modified by the user themselves, except for the `isAdmin` field which is read-only for users.
- Favorites are stored in a subcollection under the user and can only be managed by that user.
- Official prompts (`isOfficial: true`) can only be created or modified by admins.
- Public prompts can be read by anyone signed in, but private ones only by the author.

## 2. The "Dirty Dozen" Payloads (Denial Tests)
1. **Unauthorized Create**: Create a prompt without being signed in.
2. **Spoof Author**: Create a prompt where `authorId` does not match `request.auth.uid`.
3. **Ghost Field Update**: Update a prompt and try to inject an `isVerified` field.
4. **Official Prompt Hijack**: A non-admin user tries to create or update a prompt with `isOfficial: true`.
5. **Prompt Title Overflow**: Create a prompt with a title > 20 characters.
6. **Description Overflow**: Create a prompt with a description > 100 characters.
7. **Favorite Poisoning**: A user tries to add a favorite document to another user's subcollection.
8. **Admin Field Escalation**: A user tries to set `isAdmin: true` on their own profile.
9. **Identity Spoofing in Update**: ownerId (authorId) change attempt during update.
10. **Terminal State Lock (Optional Future)**: If we had a terminal state, testing it here.
11. **PII Leak**: A non-owner tries to read another user's private data (if any).
12. **Recursive Cost Attack**: Attempting a list query without a proper filter, relying on client filtering.

## 3. Test Runner (Draft)
I will implement `firestore.rules.test.ts` after drafting the rules.
