# NextKDE Application Uninstaller

A GNOME Shell extension that adds **Uninstall Application** to the context
menu of applications in the GNOME application drawer, including applications
inside folders.

The extension identifies the package that owns the application's `.desktop`
file, asks for confirmation, revalidates the package, and then invokes the
appropriate package manager. It never constructs or executes a shell command.

## Supported Sources

| Source | Detection | Removal command |
| --- | --- | --- |
| Fedora/RPM | `rpm -qf` | `pkexec dnf remove` |
| Debian/Ubuntu/Pop!_OS | `dpkg-query -S` | `pkexec apt-get remove` |
| Arch/CachyOS/Manjaro | `pacman --query --owns` | `pkexec pacman --remove` |
| Flatpak | Flatpak export directories and `flatpak info` | `flatpak uninstall` |
| Snap | Snap desktop export directory and `snap list` | `pkexec snap remove` |

Package manager commands are selected by the verified owner of the desktop
file. An unavailable package manager, AppImage, manually installed launcher,
or unknown package is rejected instead of being deleted heuristically.

## Requirements

- GNOME Shell 45 or newer.
- GJS and the GNOME Shell extension runtime.
- `gettext`/`msgfmt` for building translations.
- `pkexec` and an active Polkit authentication agent for system packages.
- At least one supported package manager for the applications being removed.

The code is currently validated on GNOME Shell 51. The declared GNOME Shell
versions are the compatibility target and should be tested before publishing
packages for older Shell releases.

## Development

From this directory:

```sh
make check
make package
make install
```

`make package` creates a GNOME extension archive in `dist/`. The archive is
the file to upload to extensions.gnome.org after the project has been reviewed
and the repository URL has been added to `metadata.json`.

To remove the local development installation:

```sh
make uninstall
```

After installing or updating an extension on Wayland, reload GNOME Shell by
logging out and logging in again if the extension manager does not reload it
immediately.

## Security Model

- The desktop file path is restricted to trusted system, Flatpak, or Snap
  export locations.
- Package ownership is resolved with the native package database.
- The package is resolved again after confirmation, immediately before
  removal.
- Package identifiers are validated before they are passed as arguments.
- System removal is delegated to Polkit through `pkexec`.
- No shell interpolation, wildcard expansion, or arbitrary user command is
  used.
- Package dependency cleanup is not requested automatically.

## Reporting Issues

Include the GNOME Shell version, distribution, package source, and the output
of:

```sh
gnome-extensions show nextkde-uninstaller@nextkde.org
journalctl --user -b -u gnome-shell --no-pager
```

Do not include authentication credentials or private package-manager logs.

## License

GPL-3.0-or-later. See the repository `LICENSE` file.
