<?php

declare(strict_types=1);

namespace OCA\FeedbackApp\Settings;

use OCA\FeedbackApp\AppInfo\Application;
use OCP\IL10N;
use OCP\IURLGenerator;
use OCP\Settings\IIconSection;

class Section implements IIconSection {
	public function __construct(
		private IL10N $l10n,
		private IURLGenerator $urlGenerator,
	) {
	}

	public function getID(): string {
		return Application::APP_ID;
	}

	public function getName(): string {
		return $this->l10n->t('Feedback App');
	}

	public function getPriority(): int {
		return 45;
	}

	public function getIcon(): string {
		return $this->urlGenerator->imagePath(Application::APP_ID, 'section-white.svg');
	}
}
