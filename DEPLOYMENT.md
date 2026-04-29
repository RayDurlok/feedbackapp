# Feedback App Deployment

Manual deployment is only the built app folder. Do not upload `node_modules`, `src`, or local development files.

## Folder Layout

The app must end up here on the server:

```bash
/path/to/nextcloud/custom_apps/feedbackapp
```

If your uploaded folder contains a version suffix, rename it:

```bash
mv feedbackapp-0.2.0 feedbackapp
```

## Fresh Install

1. Upload or copy the built `feedbackapp` folder into `custom_apps`.

2. Set owner and permissions:

```bash
sudo chown -R 33:33 /path/to/nextcloud/custom_apps/feedbackapp
sudo chmod -R 755 /path/to/nextcloud/custom_apps/feedbackapp
```

3. Enable the app:

```bash
php /path/to/nextcloud/occ app:enable feedbackapp
```

For Docker-based installs:

```bash
sudo docker exec -u www-data <nextcloud-container> php /var/www/html/occ app:enable feedbackapp
```

## Manual Update

Disable the app before replacing files:

```bash
php /path/to/nextcloud/occ app:disable feedbackapp
```

For Docker-based installs:

```bash
sudo docker exec -u www-data <nextcloud-container> php /var/www/html/occ app:disable feedbackapp
```

Keep a backup of the old app folder:

```bash
sudo rm -rf /path/to/nextcloud/custom_apps/feedbackapp_old
sudo mv /path/to/nextcloud/custom_apps/feedbackapp /path/to/nextcloud/custom_apps/feedbackapp_old
```

Move the new folder into place:

```bash
sudo mv ~/feedbackapp /path/to/nextcloud/custom_apps/
```

Set owner and permissions again:

```bash
sudo chown -R 33:33 /path/to/nextcloud/custom_apps/feedbackapp
sudo chmod -R 755 /path/to/nextcloud/custom_apps/feedbackapp
```

Enable the app:

```bash
php /path/to/nextcloud/occ app:enable feedbackapp
```

For Docker-based installs:

```bash
sudo docker exec -u www-data <nextcloud-container> php /var/www/html/occ app:enable feedbackapp
```

## SSH Upload Example

Use placeholders for your own server, SSH key, user, container name, and Nextcloud app path:

```powershell
ssh -i C:\path\to\ssh-key <server-user>@<server-host>
```

Disable the app on the server:

```bash
sudo docker exec -u www-data <nextcloud-container> php /var/www/html/occ app:disable feedbackapp
```

Back up the old app folder:

```bash
sudo rm -rf /path/to/nextcloud/custom_apps/feedbackapp_old
sudo mv /path/to/nextcloud/custom_apps/feedbackapp /path/to/nextcloud/custom_apps/feedbackapp_old
```

Upload the built app folder from your local machine:

```powershell
scp -r -i C:\path\to\ssh-key "C:\path\to\project\dist\feedbackapp-0.2.0" <server-user>@<server-host>:~/feedbackapp
```

Move it into `custom_apps`:

```bash
sudo mv ~/feedbackapp /path/to/nextcloud/custom_apps/
```

Set owner and permissions:

```bash
sudo chown -R 33:33 /path/to/nextcloud/custom_apps/feedbackapp
sudo chmod -R 755 /path/to/nextcloud/custom_apps/feedbackapp
```

Enable the app again:

```bash
sudo docker exec -u www-data <nextcloud-container> php /var/www/html/occ app:enable feedbackapp
```

## Notes

- The final folder name must be `feedbackapp`.
- For manual updates, always disable the app before replacing files.
- Keep one `feedbackapp_old` backup until the new version is verified.
- If permissions differ on your system, adapt `33:33` to the user/group used by your web server container.
