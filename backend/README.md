/**
 * backend/README.md
 * Documentation for the emulamadro backend helpers
 */

# emulamadro — Backend

This folder contains the client-side "backend" logic that abstracts all storage operations away from UI components.

## Files

### `saveManager.js`

Central module for all save/load operations.

#### Storage Layout (Supabase Bucket: `emulamadro`)

```
saves/
  {sanitized_rom_name}/
    sram.srm      ← Battery RAM (auto-saved silently every 5s)
    state.bin     ← Manual Save State snapshot
```

Keys are sanitized: spaces, parentheses, and special characters are replaced with underscores, then lowercased. This fixes the `400 Bad Request` errors that occurred when ROM names had spaces.

#### API

| Function | Description |
|---|---|
| `saveState(romName, data)` | Saves a full emulator state snapshot (local + cloud) |
| `loadState(romName)` | Loads a state snapshot (cloud first, local fallback) |
| `saveSram(romName, data)` | Saves battery RAM (local + cloud) |
| `loadSram(romName)` | Loads battery RAM (cloud first, local fallback) |
| `sanitizeKey(romName)` | Converts a ROM filename to a safe storage key |

#### Return Values

All save functions return:
```js
{ local: boolean, cloud: boolean, cloudError?: string }
```

#### Error Handling

- Local saves **always succeed** (unless browser is full).
- Cloud saves are **best-effort**: failures are logged but do not throw to the user.
- `400` / "Object not found" responses on download are silently swallowed (means no save exists yet).
