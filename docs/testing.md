# Testing

## Automated Checks

Run from the repository root:

```sh
make check
make package
```

The checks validate:

- gettext syntax and compilation;
- JavaScript syntax with `node --check`;
- JSON syntax in `metadata.json`;
- the minimal review archive layout.

## Manual Matrix

Test the context menu in both locations:

- an application in the main application grid;
- an application inside a GNOME application folder.

Then test package sources available on the machine:

| Source | Verify | Removal test |
| --- | --- | --- |
| RPM/DNF | `rpm -qf <desktop-file>` | disposable RPM package |
| Debian/APT | `dpkg-query -S <desktop-file>` | disposable `.deb` package |
| Pacman | `pacman -Qo <desktop-file>` | disposable Arch package |
| Flatpak | `flatpak info <app-id>` | disposable Flatpak app |
| Snap | `snap list <snap>` | disposable Snap |

Do not remove a core desktop package. Prefer a virtual machine, disposable
test package, or a package that can be safely reinstalled.

## Logs

Use the GNOME Shell journal while testing:

```sh
journalctl --user -f -o cat /usr/bin/gnome-shell
```

Useful state information:

```sh
gnome-extensions show sid-delete@josasidyr
```

## Review Package Check

The archive uploaded to GNOME Extensions should contain only:

```text
metadata.json
extension.js
locale/pt_BR/LC_MESSAGES/sid-delete.mo
```

Generate it with `make package` and inspect it with:

```sh
unzip -l dist/sid-delete@josasidyr.shell-extension.zip
```
