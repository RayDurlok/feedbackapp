<?php

declare(strict_types=1);

namespace OCA\FeedbackApp\AppInfo;

use OCA\FeedbackApp\Listener\LoadAdditionalScripts;
use OCA\FeedbackApp\Listener\LoadPublicShareScripts;
use OCA\FeedbackApp\Listener\LoadSidebarScripts;
use OCA\FeedbackApp\Notification\Notifier;
use OCA\Files\Event\LoadAdditionalScriptsEvent;
use OCA\Files\Event\LoadSidebar;
use OCA\Files_Sharing\Event\BeforeTemplateRenderedEvent;
use OCP\AppFramework\App;
use OCP\AppFramework\Bootstrap\IBootContext;
use OCP\AppFramework\Bootstrap\IBootstrap;
use OCP\AppFramework\Bootstrap\IRegistrationContext;

class Application extends App implements IBootstrap {
	public const APP_ID = 'feedbackapp';

	public function __construct(array $urlParams = []) {
		parent::__construct(self::APP_ID, $urlParams);
	}

	public function register(IRegistrationContext $context): void {
		$context->registerEventListener(
			LoadAdditionalScriptsEvent::class,
			LoadAdditionalScripts::class,
		);

		$context->registerEventListener(
			LoadSidebar::class,
			LoadSidebarScripts::class,
		);

		$context->registerEventListener(
			BeforeTemplateRenderedEvent::class,
			LoadPublicShareScripts::class,
		);

		$context->registerNotifierService(Notifier::class);
	}

	public function boot(IBootContext $context): void {
	}
}
