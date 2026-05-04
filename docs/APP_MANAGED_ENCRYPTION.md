# App-Managed Encryption

Memory Vault uses app-managed encryption at rest for memories.

This is intentionally not zero-knowledge end-to-end encryption. Users do not manage recovery phrases, browser vaults, or URL fragment keys. They can sign in from another browser and their memories still work normally.

## Storage

- Notes are encrypted by the API before they are stored in Payload.
- Uploaded media files are encrypted by the API before they are stored in blob storage.
- The blob MIME type is stored as `application/octet-stream`; the original content type is kept inside encryption metadata.
- AES-256-GCM is used by `src/lib/serverEncryption.ts`.
- Set `APP_ENCRYPTION_KEY` in production. If it is missing, the app falls back to `PAYLOAD_SECRET`.

## Reading

- Owners access media through authenticated API routes.
- Delivery recipients unlock their page with the delivery password.
- After a successful delivery unlock, the app sets a short-lived HTTP-only cookie that allows only the shared media ids to be read.
- The API decrypts notes and media only after access checks pass.

## Admin Access

Database rows and blobs contain ciphertext for encrypted notes and files. Admin UI policy should avoid exposing decrypted user content. Because this is app-managed encryption, anyone with production server runtime access and the encryption key can technically decrypt data.

## Key Rotation

Rotating `APP_ENCRYPTION_KEY` requires a migration that decrypts each encrypted note/file with the old key and writes it again with the new key.
