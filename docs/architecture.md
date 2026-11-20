# Architecture

## Runtime Flow

1. GNOME Shell creates an `AppMenu` for an application icon.
2. SidDelete injects one action into menus belonging to the main application
   grid or a GNOME application folder.
3. The action resolves the live `Gio.DesktopAppInfo` and its `.desktop` path.
4. The extension classifies the path as Flatpak, Snap, or a system package.
5. The native package database verifies the owning package.
6. A confirmation dialog displays the application, package, and source.
7. The extension repeats the ownership lookup after confirmation.
8. The selected package manager performs the removal through Polkit when
   system privileges are required.
9. GNOME's application system is reloaded after a successful operation.

## GNOME Shell Integration

The extension uses GNOME Shell ES modules and `InjectionManager` to wrap
`AppMenu.setApp()`. The wrapper calls the original implementation first, then
adds the SidDelete action only when the menu source belongs to `AppDisplay` or
`FolderView`.

The UUID is `sid-delete@josasidyr`. The implementation targets GNOME Shell
45 through 51 and uses the GNOME 45+ ES module API.

## Package Classification

### RPM and DNF

System desktop files under `/usr/share/applications` are queried with:

```text
rpm -qf --qf %{NAME}\n <desktop-file>
```

Removal is performed with `pkexec dnf -y remove` and disables automatic
dependency cleanup.

### Debian Packages

The same system desktop directory is queried with `dpkg-query -S`. Removal is
performed with `pkexec apt-get -y remove`.

### Pacman Packages

Arch-family systems use `pacman --query --owns --print-format %n`. Removal is
performed with `pkexec pacman --noconfirm --remove`.

### Flatpak

The extension recognizes system and per-user Flatpak export directories,
validates the application with `flatpak info`, and removes it with the matching
`--system` or `--user` scope.

### Snap

Snap desktop files are recognized under `/var/lib/snapd/desktop/applications`.
The snap name is checked with `snap list`, then removed with `pkexec snap
remove`.

## Security Boundaries

- Only fixed, known desktop-file directories are eligible.
- Package names must match strict package-name patterns.
- The package is looked up again immediately before removal.
- The extension never interpolates a command into a shell.
- The user confirms the exact package and source before a destructive action.
- Unknown ownership is an explicit refusal, not a fallback to file deletion.
