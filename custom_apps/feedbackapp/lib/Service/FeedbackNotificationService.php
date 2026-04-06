<?php

declare(strict_types=1);

namespace OCA\FeedbackApp\Service;

use OCA\FeedbackApp\AppInfo\Application;
use DateTime;
use OCP\IURLGenerator;
use OCP\Notification\IManager;

class FeedbackNotificationService {
	private const OBJECT_TYPE = 'feedback_file';
	private const SUBJECT_NEW_FEEDBACK = 'new_feedback';

	public function __construct(
		private IManager $notificationManager,
		private IURLGenerator $urlGenerator,
	) {
	}

	public function notifyFileOwner(int $fileId, string $fileName, string $ownerUid, string $actorUid, string $actorDisplayName = ''): void {
		if ($ownerUid === '' || $ownerUid === $actorUid) {
			return;
		}

		$probe = $this->createBaseNotification($fileId, $ownerUid);
		if ($this->notificationManager->getCount($probe) > 0) {
			return;
		}

		$link = $this->urlGenerator->getAbsoluteURL(sprintf('/f/%d?openfile=true', $fileId));

		$notification = $this->createBaseNotification($fileId, $ownerUid)
			->setDateTime(new DateTime())
			->setSubject(self::SUBJECT_NEW_FEEDBACK, [
				'fileId' => $fileId,
				'fileName' => $fileName,
				'actorUid' => $actorUid,
				'actorDisplayName' => $actorDisplayName,
				'link' => $link,
			]);

		$this->notificationManager->notify($notification);
	}

	public function clearForUser(int $fileId, string $userUid): void {
		if ($userUid === '') {
			return;
		}

		$probe = $this->createBaseNotification($fileId, $userUid);
		if ($this->notificationManager->getCount($probe) === 0) {
			return;
		}

		$this->notificationManager->markProcessed($probe);
	}

	private function createBaseNotification(int $fileId, string $userUid) {
		return $this->notificationManager->createNotification()
			->setApp(Application::APP_ID)
			->setUser($userUid)
			->setObject(self::OBJECT_TYPE, (string)$fileId)
			->setSubject(self::SUBJECT_NEW_FEEDBACK);
	}
}
