# Releasing

## Before the First Upload

1. Push this directory as its own GitHub repository, or keep its path stable
   in the parent repository.
2. Add the final public repository URL to `metadata.json`.
3. Confirm that the UUID directory and `metadata.json` use the same UUID:
   `sid-delete@josasidyr`.
4. Test the extension on every GNOME Shell version declared in metadata.
5. Test at least one package from each supported source without removing a
   critical system package.

## Build the Upload Archive

Run:

```sh
make clean
make package
```

Upload:

```text
   dist/sid-delete@josasidyr.shell-extension.zip
```

The archive must contain `metadata.json`, `extension.js`, and the compiled
gettext catalogs under `locale/`. Do not upload the repository checkout as the
extension archive.

## Versioning

Increment the integer `version` in `metadata.json` for every uploaded release.
Keep the UUID stable after the first public release. Use Git tags matching the
extension version where possible.

## Review Checklist

- `make check` passes.
- `make package` produces the expected UUID.
- The archive contains no credentials, local paths, build logs, or test data.
- Polkit prompts appear for system package removal.
- Unsupported launchers remain unavailable rather than being deleted.
- The confirmation dialog appears before every destructive operation.
