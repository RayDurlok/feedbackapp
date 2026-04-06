<?php

declare(strict_types=1);

namespace OCA\FeedbackApp\Controller;

use OCA\FeedbackApp\AppInfo\Application;
use OCA\FeedbackApp\Exception\FeedbackException;
use OCA\FeedbackApp\Service\SettingsService;
use OCP\AppFramework\Controller;
use OCP\AppFramework\Http\RedirectResponse;
use OCP\IGroupManager;
use OCP\IRequest;
use OCP\IURLGenerator;
use OCP\IUserSession;

class SettingsController extends Controller {
	public function __construct(
		string $appName,
		IRequest $request,
		private IUserSession $userSession,
		private IGroupManager $groupManager,
		private IURLGenerator $urlGenerator,
		private SettingsService $settingsService,
	) {
		parent::__construct($appName, $request);
	}

	public function updatePersonal(bool $autoOpenPublicShareSidebar = false): RedirectResponse {
		$user = $this->userSession->getUser();
		if ($user === null) {
			throw new FeedbackException('User not logged in', 401);
		}

		$this->settingsService->setUserPublicShareAutoOpen($user->getUID(), $autoOpenPublicShareSidebar);

		return new RedirectResponse($this->getSettingsReferer('settings.PersonalSettings.index'));
	}

	public function updateAdmin(bool $publicShareFeedbackEnabled = false): RedirectResponse {
		$user = $this->userSession->getUser();
		if ($user === null) {
			throw new FeedbackException('User not logged in', 401);
		}

		if (!$this->groupManager->isAdmin($user->getUID())) {
			throw new FeedbackException('Admin privileges required', 403);
		}

		$this->settingsService->setPublicShareFeedbackEnabled($publicShareFeedbackEnabled);

		return new RedirectResponse($this->getSettingsReferer('settings.AdminSettings.index'));
	}

	private function getSettingsReferer(string $fallbackRoute): string {
		$referer = trim((string)$this->request->getHeader('referer'));
		if ($referer !== '') {
			return $referer;
		}

		return $this->urlGenerator->linkToRoute($fallbackRoute, [
			'section' => Application::APP_ID,
		]);
	}
}
