<?php

declare(strict_types=1);

namespace OCA\FeedbackApp\Settings;

use OCA\FeedbackApp\AppInfo\Application;
use OCA\FeedbackApp\Service\SettingsService;
use OCP\AppFramework\Http\TemplateResponse;
use OCP\IUserSession;
use OCP\Settings\ISettings;

class Personal implements ISettings {
	public function __construct(
		private IUserSession $userSession,
		private SettingsService $settingsService,
	) {
	}

	public function getForm(): TemplateResponse {
		$user = $this->userSession->getUser();
		$uid = $user?->getUID() ?? '';

		return new TemplateResponse(Application::APP_ID, 'settings/personal', [
			'autoOpenPublicShareSidebar' => $this->settingsService->getUserPublicShareAutoOpen($uid),
		]);
	}

	public function getSection(): string {
		return Application::APP_ID;
	}

	public function getPriority(): int {
		return 50;
	}
}
