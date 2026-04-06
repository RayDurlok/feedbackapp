<?php

declare(strict_types=1);

namespace OCA\FeedbackApp\Settings;

use OCA\FeedbackApp\AppInfo\Application;
use OCA\FeedbackApp\Service\SettingsService;
use OCP\AppFramework\Http\TemplateResponse;
use OCP\Settings\ISettings;

class Admin implements ISettings {
	public function __construct(
		private SettingsService $settingsService,
	) {
	}

	public function getForm(): TemplateResponse {
		return new TemplateResponse(Application::APP_ID, 'settings/admin', [
			'publicShareFeedbackEnabled' => $this->settingsService->isPublicShareFeedbackEnabled(),
		]);
	}

	public function getSection(): string {
		return Application::APP_ID;
	}

	public function getPriority(): int {
		return 50;
	}
}
