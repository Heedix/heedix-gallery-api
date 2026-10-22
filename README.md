# Heedix Gallery API

## Admin-Panel

Das Frontend stellt unter `/admin` das Admin-Panel und unter `/admin/login` einen separaten Admin-Login bereit. Administratoren verwenden ihr bestehendes Konto. Wie bei den vorhandenen erweiterten Galerierechten ist ein `permissionlevel > 5` in der Tabelle `users` erforderlich. Normale Konten können weder Einstellungen lesen/ändern noch den Admin-Login verwenden.

Falls dein bestehendes Konto noch keine Admin-Rechte hat, kann ein Datenbankadministrator es gezielt freischalten (Benutzernamen ersetzen):

```sql
UPDATE users SET permissionlevel = 6 WHERE LOWER(username) = LOWER('DEIN_BENUTZERNAME');
```

Beim Start erstellt die API die Tabelle `site_settings`, sofern sie fehlt, mit genau einem Einstellungsdatensatz. Der Datenbanknutzer benötigt dafür `CREATE TABLE` sowie Lese- und Schreibrechte. Standard: Login aktiv, Wartungsmodus aus. Bestehende Einstellungen werden bei Neustarts und Deployments beibehalten; mehrere API-Instanzen nutzen denselben Datenbankstand. Es gibt keinen lokalen Einstellungs-Cache.

- **Login erlauben aus:** Neue Anmeldungen und Registrierungen sind gesperrt (`503`, `LOGIN_DISABLED`). Bestehende Sitzungen, E-Mail-Verifizierung und die öffentliche Galerie funktionieren weiter.
- **Wartungsmodus an:** Besucher sehen den gespeicherten Wartungstext. Galerie-API, Uploads, Profilbilder und bereits ausgestellte signierte Bild-URLs liefern `503`, `MAINTENANCE_MODE`. Bereits heruntergeladene Bilder lassen sich nicht zurückrufen.
- **Admin-Zugang:** `/v1/admin/login`, `/v1/admin/settings`, `/v1/auth/authorize` und `/v1/health` bleiben während der Wartung erreichbar. Rollen werden bei jedem Admin-Zugriff aus der Datenbank geprüft.
- **Ausfall:** Kann der Seitenstatus nicht gelesen werden, werden Galerieanfragen gesperrt (`503`, `SITE_STATUS_UNAVAILABLE`), bis die Datenbank wieder verfügbar ist. Der Admin-Login bleibt erreichbar, benötigt aber ebenfalls die Benutzerdatenbank.

`GET /v1/site-status` liefert den öffentlichen Status. `GET` und `PUT /v1/admin/settings` benötigen `Authorization: Bearer <token>`. `PUT` erwartet ausschließlich:

```json
{
  "loginEnabled": true,
  "maintenanceMode": false,
  "maintenanceMessage": "Wir sind bald wieder da."
}
```

Der Wartungstext muss 1 bis 500 Zeichen enthalten. Änderungen werden gemeinsam mit einem Datenbank-Update gespeichert. Die API setzt sie ab der nächsten Anfrage durch; geöffnete Frontends prüfen den Status alle 15 Sekunden. Das Admin-Panel bleibt unabhängig vom öffentlichen Seitenstatus bedienbar.

## Prüfung

`npm test` führt die HTTP- und Persistenztests mit dem Node-Test-Runner aus. Die Tests verwenden eine isolierte Testdatenhaltung und benötigen keine laufende Datenbank. Sie verändern keine echten Einstellungen oder Nutzer.
