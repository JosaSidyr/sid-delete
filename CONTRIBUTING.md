# Contributing

Thanks for helping make package removal safer and more discoverable on GNOME.

## Scope

Keep SidDelete focused on safe package removal from GNOME application menus.
Do not add arbitrary shell execution, heuristic deletion of launcher files, or
silent package-manager actions.

## Repository Structure

- `extension.js`: GNOME Shell runtime and package-manager integration.
- `metadata.json`: GNOME Extensions metadata and supported Shell versions.
- `locale/`: gettext source catalogs.
- `docs/`: architecture and testing notes.
- `screenshots/`: project documentation images.
- `Makefile`: validation and release-package commands.

## Code Rules

- Use GNOME Shell ES modules and explicit `gi://`/`resource://` imports.
- Keep all dynamically-created objects, injections, and signals owned by the
  extension and cleaned up in `disable()`.
- Use explicit `Gio.Subprocess` argument arrays; never invoke a shell.
- Revalidate package ownership immediately before destructive operations.
- Keep user-facing strings wrapped in gettext.
- Add or update the `pt_BR` catalog when adding user-facing strings.
- Keep Polkit authentication and the confirmation dialog for system removal.
- Do not expand support for a package manager without a safe ownership lookup.

## Local Setup

Install the development tools provided by your distribution:

- GNOME Shell and GJS.
- `gnome-extensions`.
- Node.js for syntax validation.
- GNU gettext for `msgfmt`.

Then run:

```sh
make check
make package
```

## Testing Changes

Test at least one application from every available source: RPM, Debian,
Pacman, Flatpak, and Snap. Use a disposable package or a virtual machine for
destructive tests. Never test by removing a critical desktop package.

For the full validation matrix, see [`docs/testing.md`](docs/testing.md).

## Pull Requests

Pull requests should include:

- A concise explanation of the user-visible change.
- The distributions and GNOME Shell versions tested.
- The output of `make check` and `make package`.
- Any changes to package-manager detection or security behavior.
- Updated documentation and translations for new user-facing strings.

Keep pull requests focused. Do not commit generated ZIP archives or compiled
`.mo` files; the release package generates them during `make package`.
