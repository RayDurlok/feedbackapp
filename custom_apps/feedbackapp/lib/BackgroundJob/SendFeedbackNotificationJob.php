<?php

declare(strict_types=1);

namespace OCA\FeedbackApp\BackgroundJob;

use OCA\FeedbackApp\Service\FeedbackNotificationService;
use OCP\AppFramework\Utility\ITimeFactory;
use OCP\BackgroundJob\QueuedJob;
use Override;

class SendFeedbackNotificationJob extends QueuedJob {
	public function __construct(
		ITimeFactory $time,
		private FeedbackNotificationService $feedbackNotificationService,
	) {
		parent::__construct($time);
	}

	/**
	 * @param array{
	 *   fileId: int,
	 *   fileName: string,
	 *   ownerUid: string,
	 *   actorUid: string,
	 *   actorDisplayName: string
	 * } $argument
	 */
	#[Override]
	protected function run($argument): void {
		$this->feedbackNotificationService->notifyFileOwner(
			(int)($argument['fileId'] ?? 0),
			(string)($argument['fileName'] ?? ''),
			(string)($argument['ownerUid'] ?? ''),
			(string)($argument['actorUid'] ?? ''),
			(string)($argument['actorDisplayName'] ?? ''),
		);
	}
}
