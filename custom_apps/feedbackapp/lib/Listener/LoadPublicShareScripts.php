<?php

declare(strict_types=1);

namespace OCA\FeedbackApp\Listener;

use OCA\FeedbackApp\AppInfo\Application;
use OCA\FeedbackApp\Service\SettingsService;
use OCA\Files_Sharing\Event\BeforeTemplateRenderedEvent;
use OCP\EventDispatcher\Event;
use OCP\EventDispatcher\IEventListener;
use OCP\Files\File;
use OCP\Files\Folder;
use OCP\Util;

/** @template-implements IEventListener<BeforeTemplateRenderedEvent> */
class LoadPublicShareScripts implements IEventListener {
	public function __construct(
		private SettingsService $settingsService,
	) {
	}

	public function handle(Event $event): void {
		if (!($event instanceof BeforeTemplateRenderedEvent)) {
			return;
		}

		if (!$this->settingsService->isPublicShareFeedbackEnabled()) {
			return;
		}

		if ($event->getScope() === BeforeTemplateRenderedEvent::SCOPE_PUBLIC_SHARE_AUTH) {
			return;
		}

		$node = $event->getShare()->getNode();
		if ($node instanceof File && !str_starts_with($node->getMimetype(), 'video/')) {
			return;
		}

		if (!$node instanceof File && !$node instanceof Folder) {
			return;
		}

		Util::addScript(Application::APP_ID, Application::APP_ID . '-timestampCommentsTab');
		Util::addScript(Application::APP_ID, Application::APP_ID . '-publicShare');
	}
}
