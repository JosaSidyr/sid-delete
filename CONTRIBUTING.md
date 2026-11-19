# Contributing

## Scope

Keep the extension focused on safe package removal from GNOME application
menus. Do not add support for arbitrary shell commands or unverified launcher
paths.

## Code Changes

- Preserve GNOME Shell's ES module style.
- Use explicit `Gio.Subprocess` argument arrays; never invoke a shell.
- Revalidate package ownership immediately before destructive operations.
- Keep user-facing strings wrapped in gettext.
- Add or update the `pt_BR` catalog when adding user-facing strings.
- Do not remove package-manager confirmation or Polkit authentication.

## Validation

Run:

```sh
make check
make package
```

Test the menu with applications installed by each available source. Do not
test by removing a critical system package. Use a disposable package or a
virtual machine for destructive tests.
