UUID := sid-delete@josasidyr
DOMAIN := sid-delete
DIST_DIR := dist
PACKAGE_STAGE := .package
PACKAGE := $(DIST_DIR)/$(UUID).shell-extension.zip

.PHONY: all check translations package install uninstall clean

all: check package

translations:
	@command -v msgfmt >/dev/null || { echo "msgfmt is required" >&2; exit 1; }
	msgfmt --check -o locale/pt_BR/LC_MESSAGES/$(DOMAIN).mo \
		locale/pt_BR/LC_MESSAGES/$(DOMAIN).po

check: translations
	@command -v node >/dev/null || { echo "node is required" >&2; exit 1; }
	node --check extension.js
	python3 -m json.tool metadata.json >/dev/null

package: check
	@command -v gnome-extensions >/dev/null || { echo "gnome-extensions is required" >&2; exit 1; }
	rm -rf $(PACKAGE_STAGE)
	mkdir -p $(DIST_DIR) $(PACKAGE_STAGE)/locale/pt_BR/LC_MESSAGES
	cp metadata.json extension.js $(PACKAGE_STAGE)/
	cp locale/pt_BR/LC_MESSAGES/$(DOMAIN).mo \
		$(PACKAGE_STAGE)/locale/pt_BR/LC_MESSAGES/
	cd $(PACKAGE_STAGE) && gnome-extensions pack --force \
		--gettext-domain $(DOMAIN) --extra-source=locale -o ../$(DIST_DIR) .
	@test -f "$(PACKAGE)"

install: package
	gnome-extensions install --force "$(PACKAGE)"
	@if ! gnome-extensions enable "$(UUID)"; then \
		echo "GNOME Shell will enable the extension after the next session restart." >&2; \
	fi

uninstall:
	gnome-extensions disable "$(UUID)" 2>/dev/null || true
	gnome-extensions uninstall "$(UUID)" 2>/dev/null || true

clean:
	rm -rf $(DIST_DIR) $(PACKAGE_STAGE)
	rm -f locale/pt_BR/LC_MESSAGES/*.mo
