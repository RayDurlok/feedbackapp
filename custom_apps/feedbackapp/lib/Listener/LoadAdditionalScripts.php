<?php

declare(strict_types=1);

namespace OCA\FeedbackApp\Listener;

use OCA\FeedbackApp\AppInfo\Application;
use OCA\Files\Event\LoadAdditionalScriptsEvent;
use OCP\EventDispatcher\Event;
use OCP\EventDispatcher\IEventListener;
use OCP\Util;

/** @template-implements IEventListener<LoadAdditionalScriptsEvent> */
class LoadAdditionalScripts implements IEventListener {
	public function handle(Event $event): void {
		if (!($event instanceof LoadAdditionalScriptsEvent)) {
			return;
		}

		Util::addInitScript(Application::APP_ID, Application::APP_ID . '-init');
		Util::addScript(Application::APP_ID, Application::APP_ID . '-filesPlugin');
	}
}
