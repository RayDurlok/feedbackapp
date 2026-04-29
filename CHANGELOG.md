# Changelog

All notable changes to this project will be documented in this file.

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
