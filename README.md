# Feedback App

`feedbackapp` is a custom Nextcloud app for video review workflows.

It adds a **Feedback** sidebar for video files with timestamped comments, timeline markers, comment status handling, and public-share review support.

## Support

If the project helps you, you can support it here:

- [Buy Me a Coffee](https://buymeacoffee.com/hesoyammw3k)

```html
<script type="text/javascript" src="https://cdnjs.buymeacoffee.com/1.0.0/button.prod.min.js" data-name="bmc-button" data-slug="hesoyammw3k" data-color="#FFDD00" data-emoji="☕" data-font="Poppins" data-text="Buy me a coffee" data-outline-color="#000000" data-font-color="#000000" data-coffee-color="#ffffff"></script>
```

## Status

This project is in active development, but already usable for real testing and manual deployment.

Current tested baseline:

- Nextcloud `33`
- local test instance
- manual deployment through `custom_apps/feedbackapp`

## Features

- Timestamped feedback for video files
- Millisecond-precision comment storage
- Jump-to-timestamp by clicking a comment
- Timeline markers for open/done feedback
- Open / Done workflow
- Edit and delete for comment authors
- Notifications for file owners
- Public-share feedback panel for guest reviewers
- Guest comment edit/delete for the same browser identity

## Project Structure

```text
custom_apps/feedbackapp/
  appinfo/        Nextcloud app metadata and routes
  css/            Runtime styles
  js/             Built frontend assets used by Nextcloud
  lib/            PHP controllers, services, notifications, migrations
  src/            Frontend source files
  templates/      Server-rendered template entrypoints
```

Repository-level folders:

- `custom_apps/feedbackapp`: actual app source
- `DEPLOYMENT.md`: manual deployment notes

## Local Development

### Requirements

- Node.js / npm
- Nextcloud `33`

### Frontend build

From `custom_apps/feedbackapp`:

```powershell
npm.cmd install
npm.cmd run build
```

### Enable the app

Enable the app in your local Nextcloud test instance:

```powershell
php occ app:enable feedbackapp
```

## Manual Deployment

For manual deployments, only the runtime-relevant app files should be copied:

- `appinfo/`
- `css/`
- `js/`
- `lib/`
- `templates/`

Do **not** deploy:

- `node_modules/`
- `src/`
- local dev-only folders

See `DEPLOYMENT.md` for the current deploy workflow.

## Recommended Test Scenarios

- Logged-in user comments on a video
- Comment click jumps to the correct timestamp
- Timeline markers match comment state
- Shared video between two users
- Notification flow for file owner
- Public share with guest feedback
- Public guest edit/delete of own comments
- One problematic `.mov` file

## Current Limitations

- The app is not packaged for the Nextcloud App Store yet
- Public-share support is currently focused on directly shared video files
- Automated tests are not set up yet
- The app still needs hardening and cleanup before a store release

## Roadmap

- Backend tests
- Frontend cleanup / refactor
- Packaging and release hardening
- App Store preparation

## License

This project is licensed under the GNU Affero General Public License v3.0 or later.
