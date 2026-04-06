<?php

declare(strict_types=1);

namespace OCA\FeedbackApp\Listener;

use OCA\FeedbackApp\AppInfo\Application;
use OCA\Files\Event\LoadSidebar;
use OCP\EventDispatcher\Event;
use OCP\EventDispatcher\IEventListener;
use OCP\Util;

/** @template-implements IEventListener<LoadSidebar> */
class LoadSidebarScripts implements IEventListener {
	public function handle(Event $event): void {
		if (!($event instanceof LoadSidebar)) {
			return;
		}

		Util::addScript(Application::APP_ID, Application::APP_ID . '-timestampCommentsTab', 'files');
	}
}
