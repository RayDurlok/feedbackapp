# Changelog

All notable changes to this project will be documented in this file.

## 0.2.27 - 2026-05-14

### Fixed

- Detect the final Nextcloud notification file route when redirect strips custom Feedback Panel markers

## 0.2.26 - 2026-05-14

### Fixed

- Preserve Feedback Panel notification intent through Nextcloud file-link redirects using a URL hash marker

## 0.2.25 - 2026-05-14

### Fixed

- Use the same Feedback Panel opening path for notification links as the viewer quick-access button

## 0.2.24 - 2026-05-14

### Fixed

- Focus the Feedback sidebar tab by visible tab label when Nextcloud does not expose stable tab IDs

## 0.2.23 - 2026-05-14

### Fixed

- Keep trying to focus the Feedback Panel after opening a video from a notification until the sidebar tab is mounted

## 0.2.22 - 2026-05-14

### Added

- Personal setting to keep feedback notification spam protection on or receive every comment notification

### Changed

- Notification clicks open the video and focus the Feedback Panel
- Feedback notifications show a preview of the submitted comment

## 0.2.21 - 2026-05-14

### Changed

- Notification clicks open the video and focus the Feedback Panel
- Feedback notifications show a preview of the submitted comment

## 0.2.20 - 2026-05-14

### Fixed

- Deliver owner notifications immediately after feedback is saved instead of waiting for Nextcloud cron

## 0.2.19 - 2026-05-14

### Fixed

- Use the active visible public-share video when resolving folder-share feedback targets
- Ignore hidden/stale Nextcloud viewer video elements when detecting the current playback context

## 0.2.18 - 2026-05-08

### Fixed

- Decode logged-in viewer file names before showing them in the Feedback sidebar
- Keep the Feedback sidebar bound to the active file after reopening from the viewer quick-access button

## 0.2.17 - 2026-05-08

### Changed

- Hardened the logged-in video viewer Feedback Panel button against viewer overlay click interception

## 0.2.16 - 2026-05-07

### Added

- Mobile-friendly public-share feedback panel using a compact bottom-sheet layout
- Drag handle for resizing the mobile feedback panel
- Tap-to-play/pause behavior for video playback on mobile and desktop viewer pages

### Changed

- Public-share feedback panel avoids shifting the video on narrow and touch viewports
- Public-share mobile panel uses a compact comment form with reduced vertical spacing
- Public-share browser theme color is darkened to avoid Nextcloud blue around the mobile keyboard
- Public-share config is cached client-side instead of being fetched repeatedly while the panel is mounted

## 0.2.0 - 2026-04-29

### Added

- Feedback Panel quick-access button in the logged-in Nextcloud video viewer
- Feedback Panel quick-access button for public-share video viewer pages
- Support for shared folders containing multiple video files in public shares
- One-click view-only public share link creation from the Feedback sidebar
- Clickable URLs in feedback comments, including links inside normal text

### Changed

- Public-share panel placement is more robust across Chrome and Firefox
- Public-share panel starts closed unless auto-open is explicitly enabled
- Share shortcut shows an inline `Copied` state after copying the public link
- Release version bumped to `0.2.0`

### Fixed

- Feedback button visibility in Firefox public shares
- Public-share folder video switching no longer drops the Feedback button
- Logged-in viewer quick-access now opens the existing Nextcloud sidebar with the Feedback tab focused

## 0.1.5 - 2026-04-06

### Added

- Admin and personal settings for public-share feedback behavior
- Per-video toggle to control whether the feedback panel should auto-open in public shares
- Dedicated public-share config endpoint for server-side public review defaults

### Changed

- Public-share feedback auto-open now respects server-side settings instead of browser-local preferences
- Refined sidebar wording for the public-share auto-open toggle and current playhead helper text
- Added Feedback App settings section assets and forms for Nextcloud settings pages

## 0.1.3 - 2026-04-06

### Added

- Timestamped video feedback sidebar for Nextcloud video files
- Public-share feedback panel for guest reviewers
- Timeline markers with open/done filtering
- File owner notifications for new feedback
- Guest author edit/delete support in public shares
- GitHub repository metadata, support link, and AGPL license file

### Changed

- Improved app metadata for GitHub and App Store preparation
- Improved player time detection for more reliable timestamp capture
- Moved notifications out of the critical save path into a queued background job

### Fixed

- Millisecond precision for saved timestamps
- Public-share save flow and guest interaction issues
- Timestamp drift and marker alignment in the video timeline
- Local schema default for `timestamp_seconds`
