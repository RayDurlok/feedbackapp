# Feedback App Deployment

Install the app manually like this:

1. Upload the app folder to your Nextcloud `custom_apps` directory.
   The folder on the server must be named `feedbackapp`.

2. If your uploaded folder includes a version in the name, rename it first:

```bash
mv feedbackapp-0.1.5 feedbackapp
```

3. Set the correct owner and permissions:

```bash
sudo chown -R 33:33 /path/to/nextcloud/custom_apps/feedbackapp
sudo chmod -R 755 /path/to/nextcloud/custom_apps/feedbackapp
```

4. Enable the app:

```bash
php occ app:enable feedbackapp
```

If your Nextcloud runs in Docker:

```bash
docker exec -u www-data <container-name> php occ app:enable feedbackapp
```

Notes:

- The server folder must end up as `custom_apps/feedbackapp`
- Only deploy the built app, not `node_modules` or other local dev files
- For manual updates, disable the app before replacing files:

```bash
php occ app:disable feedbackapp
```

If your Nextcloud runs in Docker:

```bash
docker exec -u www-data <container-name> php occ app:disable feedbackapp
```
