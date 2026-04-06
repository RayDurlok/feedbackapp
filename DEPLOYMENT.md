# Feedback App Deployment

This project can be deployed manually to another Nextcloud instance without publishing it to the App Store.

## What belongs in the deployed app

The deployed `feedbackapp` folder should include:

- `appinfo/`
- `css/`
- `js/`
- `lib/`
- `templates/`
- `package.json` is not required at runtime
- `node_modules/` must not be deployed
- `src/` is not required at runtime

## Manual deploy flow

1. Build the frontend assets locally.
2. Copy `custom_apps/feedbackapp` to the target Nextcloud's `custom_apps` directory.
3. Remove dev-only folders before copying or package a clean release folder.
4. Enable the app in the target instance:

```powershell
php occ app:enable feedbackapp
```

If the target Nextcloud runs in Docker:

```powershell
docker exec -u www-data <container-name> php occ app:enable feedbackapp
```

## Recommended first production-like test

Before deploying to your real daily-use Nextcloud, test on a second non-dev instance with:

- another user account
- a shared video
- notification flow
- comment create/edit/delete
- open/done switching
- marker rendering
- one problematic `.mov` file

## Notes

- This is a manual deployment path, not an App Store release yet.
- App Store publishing later will additionally need signing and release metadata cleanup.
