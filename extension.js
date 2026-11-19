import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Shell from 'gi://Shell';

import * as AppDisplay from 'resource:///org/gnome/shell/ui/appDisplay.js';
import {AppMenu} from 'resource:///org/gnome/shell/ui/appMenu.js';
import * as Dialog from 'resource:///org/gnome/shell/ui/dialog.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as ModalDialog from 'resource:///org/gnome/shell/ui/modalDialog.js';
import {
    Extension,
    InjectionManager,
    gettext as _,
} from 'resource:///org/gnome/shell/extensions/extension.js';

const SYSTEM_FLATPAK_DIR = '/var/lib/flatpak/exports/share/applications';
const RPM_APPLICATIONS_DIR = '/usr/share/applications';
const SNAP_APPLICATIONS_DIR = '/var/lib/snapd/desktop/applications';
const PACKAGE_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9+._-]*$/;
const FLATPAK_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const SNAP_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9-]*$/;

function isBelow(path, directory) {
    return path.startsWith(`${directory}/`);
}

function run(argv, callback) {
    let process;
    try {
        process = Gio.Subprocess.new(argv,
            Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE);
    } catch (error) {
        callback(false, '', String(error));
        return;
    }

    process.communicate_utf8_async(null, null, (source, result) => {
        try {
            const [, stdout, stderr] = source.communicate_utf8_finish(result);
            callback(source.get_successful(), stdout || '', stderr || '');
        } catch (error) {
            callback(false, '', String(error));
        }
    });
}

function notifyError(title, message) {
    if (typeof Main.notifyError === 'function')
        Main.notifyError(title, message);
    else
        Main.notify(`${title}: ${message}`);
}

function appDesktopPath(app) {
    try {
        return app?.get_app_info()?.get_filename() || '';
    } catch (error) {
        return '';
    }
}

function appDesktopId(app) {
    try {
        return app?.get_id() || '';
    } catch (error) {
        return '';
    }
}

function packageNameFromOutput(source, output) {
    const text = output.trim();
    if (source === 'dpkg')
        return text.split(':', 1)[0].trim();
    return text.split(/\s+/, 1)[0].trim();
}

function querySystemPackage(entryPath, callback) {
    const queries = [
        {
            source: 'rpm',
            argv: ['rpm', '-qf', '--qf', '%{NAME}\\n', entryPath],
        },
        {
            source: 'dpkg',
            argv: ['dpkg-query', '-S', entryPath],
        },
        {
            source: 'pacman',
            argv: ['pacman', '--query', '--owns', '--print-format', '%n', entryPath],
        },
    ];

    const next = index => {
        if (index >= queries.length) {
            callback(null, _('The desktop file is not owned by a supported package.'));
            return;
        }
        const query = queries[index];
        run(query.argv, (ok, stdout) => {
            const packageName = packageNameFromOutput(query.source, stdout);
            if (!ok || !PACKAGE_NAME_RE.test(packageName)) {
                next(index + 1);
                return;
            }
            callback({
                source: query.source,
                packageId: packageName,
                packageName,
                entryPath,
                requiresAuth: true,
            }, null);
        });
    };

    next(0);
}

function classifyPath(app, callback) {
    const entryPath = appDesktopPath(app);
    const desktopId = appDesktopId(app);
    if (!entryPath || !desktopId) {
        callback(null, _('The application launcher could not be identified.'));
        return;
    }

    const userFlatpakDir = GLib.build_filenamev([
        GLib.get_user_data_dir(), 'flatpak', 'exports', 'share', 'applications']);
    const baseName = GLib.path_get_basename(entryPath).replace(/\.desktop$/i, '');
    const requestedId = desktopId.replace(/\.desktop$/i, '');

    if (isBelow(entryPath, SYSTEM_FLATPAK_DIR) || isBelow(entryPath, userFlatpakDir)) {
        if (baseName !== requestedId || !FLATPAK_ID_RE.test(baseName)) {
            callback(null, _('The Flatpak application id could not be verified.'));
            return;
        }

        const scope = isBelow(entryPath, SYSTEM_FLATPAK_DIR) ? '--system' : '--user';
        run(['flatpak', scope, 'info', baseName], (ok, stdout, stderr) => {
            if (!ok) {
                callback(null, _('This Flatpak is no longer installed.'));
                return;
            }
            callback({
                source: 'flatpak',
                packageId: baseName,
                packageName: baseName,
                entryPath,
                scope,
                requiresAuth: scope === '--system',
            }, null);
        });
        return;
    }

    if (isBelow(entryPath, SNAP_APPLICATIONS_DIR)) {
        const snapName = baseName.split('_', 1)[0];
        if (!SNAP_NAME_RE.test(snapName)) {
            callback(null, _('The Snap application name could not be verified.'));
            return;
        }
        run(['snap', 'list', snapName], (ok) => {
            if (!ok) {
                callback(null, _('This Snap is no longer installed.'));
                return;
            }
            callback({
                source: 'snap',
                packageId: snapName,
                packageName: snapName,
                entryPath,
                requiresAuth: true,
            }, null);
        });
        return;
    }

    if (!isBelow(entryPath, RPM_APPLICATIONS_DIR)) {
        callback(null, _('This application is not owned by a supported package.'));
        return;
    }

    querySystemPackage(entryPath, callback);
}

function confirmUninstall(app, target, onConfirm) {
    const dialog = new ModalDialog.ModalDialog();
    const sourceLabels = {
        rpm: _('RPM/Fedora'),
        dpkg: _('APT/Debian'),
        pacman: _('Pacman/Arch'),
        snap: _('Snap'),
        flatpak: _('Flatpak'),
    };
    const source = sourceLabels[target.source] || target.source;
    const content = new Dialog.MessageDialogContent({
        title: _('Uninstall Application?'),
        description: `${_('Application')}: ${app.get_name()}\n` +
            `${_('Package')}: ${target.packageName}\n` +
            `${_('Source')}: ${source}\n\n` +
            _('This action cannot be undone.'),
    });
    dialog.contentLayout.add_child(content);
    dialog.addButton({
        label: _('Cancel'),
        action: () => dialog.close(),
        key: Clutter.KEY_Escape,
    });
    const removeButton = dialog.addButton({
        label: _('Uninstall'),
        action: () => {
            dialog.close();
            onConfirm();
        },
        default: true,
    });
    removeButton?.add_style_class_name('destructive-action');
    dialog.open();
}

function uninstallApplication(app, target) {
    classifyPath(app, (freshTarget, reason) => {
        if (!freshTarget || freshTarget.source !== target.source ||
            freshTarget.packageId !== target.packageId ||
            freshTarget.entryPath !== target.entryPath) {
            notifyError(_('Uninstallation cancelled'),
                reason || _('The application changed before removal.'));
            return;
        }

        let argv;
        if (freshTarget.source === 'flatpak') {
            argv = ['flatpak', freshTarget.scope, 'uninstall',
                '--noninteractive', freshTarget.packageId];
        } else if (freshTarget.source === 'snap') {
            argv = ['pkexec', 'snap', 'remove', freshTarget.packageId];
        } else if (freshTarget.source === 'dpkg') {
            argv = ['pkexec', 'apt-get', '-y', 'remove', freshTarget.packageId];
        } else if (freshTarget.source === 'pacman') {
            argv = ['pkexec', 'pacman', '--noconfirm', '--remove',
                freshTarget.packageId];
        } else {
            argv = ['pkexec', 'dnf', '-y', 'remove',
                '--setopt=clean_requirements_on_remove=False',
                freshTarget.packageId];
        }

        run(argv, (ok, stdout, stderr) => {
            if (!ok) {
                const detail = (stderr || stdout).trim().slice(0, 240);
                const manager = freshTarget.source === 'flatpak'
                    ? _('Flatpak') : freshTarget.source === 'snap'
                        ? _('Snap') : freshTarget.source === 'dpkg'
                            ? _('APT') : freshTarget.source === 'pacman'
                                ? _('Pacman') : _('DNF');
                notifyError(_('Uninstallation failed'),
                    detail || _('The package manager refused the operation.')
                        + ` (${manager})`);
                return;
            }
            Shell.AppSystem.get_default().reload();
            Main.notify(_('Application uninstalled'), app.get_name());
        });
    });
}

function isDrawerAppIcon(icon) {
    const drawerViews = [AppDisplay.AppDisplay, AppDisplay.FolderView]
        .filter(viewType => viewType);
    for (let parent = icon; parent; parent = parent.get_parent()) {
        if (drawerViews.some(viewType => parent instanceof viewType))
            return true;
    }
    return false;
}

export default class NextKdeUninstallExtension extends Extension {
    enable() {
        this._injectionManager = new InjectionManager();
        this._menus = new Set();
        const menus = this._menus;
        this._injectionManager.overrideMethod(
            AppMenu.prototype,
            'setApp',
            originalMethod => function (app) {
                originalMethod.call(this, app);

                const icon = this.sourceActor;
                if (!(icon instanceof AppDisplay.AppIcon) ||
                    !isDrawerAppIcon(icon) || this._nextKdeUninstallItem)
                    return;

                const menu = this;
                this._nextKdeUninstallItem = menu.addAction(
                    _('Uninstall Application'), () => {
                        const currentApp = menu.sourceActor?.app;
                        menu.close();
                        if (!currentApp)
                            return;
                        classifyPath(currentApp, (target, reason) => {
                            if (!target) {
                                notifyError(_('Uninstallation unavailable'), reason);
                                return;
                            }
                            confirmUninstall(currentApp, target,
                                () => uninstallApplication(currentApp, target));
                        });
                    });
                menus.add(menu);
            });
    }

    disable() {
        for (const menu of this._menus) {
            menu._nextKdeUninstallItem?.destroy();
            menu._nextKdeUninstallItem = null;
        }
        this._menus.clear();
        this._injectionManager?.clear();
        this._injectionManager = null;
    }
}
