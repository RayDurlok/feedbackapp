<?php

declare(strict_types=1);

namespace OCA\FeedbackApp\Notification;

use OCA\FeedbackApp\AppInfo\Application;
use OCP\IURLGenerator;
use OCP\IUser;
use OCP\IUserManager;
use OCP\L10N\IFactory;
use OCP\Notification\INotification;
use OCP\Notification\INotifier;
use OCP\Notification\UnknownNotificationException;

class Notifier implements INotifier {
	public function __construct(
		private IFactory $factory,
		private IUserManager $userManager,
		private IURLGenerator $urlGenerator,
	) {
	}

	public function getID(): string {
		return Application::APP_ID;
	}

	public function getName(): string {
		return $this->factory->get(Application::APP_ID)->t('Feedback');
	}

	public function prepare(INotification $notification, string $languageCode): INotification {
		if ($notification->getApp() !== Application::APP_ID) {
			throw new UnknownNotificationException();
		}

		$l = $this->factory->get(Application::APP_ID, $languageCode);

		switch ($notification->getSubject()) {
			case 'new_feedback':
				$params = $notification->getSubjectParameters();
				$fileId = (int)($params['fileId'] ?? 0);
				$fileName = (string)($params['fileName'] ?? 'video');
				$actorUid = (string)($params['actorUid'] ?? '');
				$actorDisplayName = trim((string)($params['actorDisplayName'] ?? ''));
				$link = (string)($params['link'] ?? '');

				$actor = $this->userManager->get($actorUid);
				$actorName = $actorDisplayName !== ''
					? $actorDisplayName
					: ($actor instanceof IUser ? $actor->getDisplayName() : $actorUid);

				$notification
					->setParsedSubject($l->t('New feedback on %s', [$fileName]))
					->setParsedMessage($l->t('%1$s added feedback to %2$s', [$actorName, $fileName]))
					->setLink($link)
					->setIcon(
						$this->urlGenerator->getAbsoluteURL(
							$this->urlGenerator->imagePath('core', 'actions/comment.svg')
						)
					);

				return $notification;

			default:
				throw new UnknownNotificationException();
		}
	}
}
