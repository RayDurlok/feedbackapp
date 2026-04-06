# Changelog

All notable changes to this project will be documented in this file.

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
