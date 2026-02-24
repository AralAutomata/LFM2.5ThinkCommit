┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   USER      │     │   DENO      │     │  LFM2.5     │
│             │     │             │     │  THINKING   │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       │  1. Ask question  │                   │
       │──────────────────>│                   │
       │                   │                   │
       │                   │  2. Get thinking  │
       │                   │     + response    │
       │                   │──────────────────>│
       │                   │                   │
       │                   │  3. Return both   │
       │                   │<──────────────────│
       │                   │                   │
       │                   │  4. Hash thinking │
       │                   │     (BLAKE3)      │
       │                   │                   │
       │                   │  5. Encrypt       │
       │                   │     response      │
       │                   │     (XChaCha20)   │
       │                   │                   │
       │                   │  6. Store:        │
       │                   │     thinking +    │
       │                   │     encrypted     │
       │                   │                   │
       │  7. Done!         │                   │
       │<──────────────────│                   │
       │                   │                   │
       │  [LATER]          │                   │
       │                   │                   │
       │  8. Read entry    │                   │
       │──────────────────>│                   │
       │                   │                   │
       │                   │  9. Hash thinking │
       │                   │     (same key)    │
       │                   │                   │
       │                   │  10. Decrypt      │
       │                   │      response     │
       │                   │                   │
       │  11. See answer   │                   │
       │<──────────────────│                   │
