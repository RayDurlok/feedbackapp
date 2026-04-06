<?php

declare(strict_types=1);

namespace OCA\FeedbackApp\Controller;

use OCA\FeedbackApp\Exception\FeedbackException;
use OCA\FeedbackApp\Service\CommentService;
use OCP\AppFramework\Http\Attribute\NoCSRFRequired;
use OCP\AppFramework\Http\Attribute\PublicPage;
use OCP\AppFramework\Http\DataResponse;
use OCP\AppFramework\PublicShareController;
use OCP\IRequest;
use OCP\ISession;
use OCP\Share\Exceptions\ShareNotFound;
use OCP\Share\IManager as ShareManager;
use OCP\Share\IShare;

class PublicCommentsController extends PublicShareController {
	private ?IShare $share = null;

	public function __construct(
		private IRequest $currentRequest,
		ISession $session,
		private ShareManager $shareManager,
		private CommentService $commentService,
	) {
		parent::__construct('feedbackapp', $currentRequest, $session);
	}

	protected function getPasswordHash(): ?string {
		return $this->share?->getPassword();
	}

	public function isValidToken(): bool {
		try {
			$this->share = $this->shareManager->getShareByToken($this->getToken());
			return true;
		} catch (ShareNotFound) {
			return false;
		}
	}

	protected function isPasswordProtected(): bool {
		return $this->share?->getPassword() !== null;
	}

	#[PublicPage]
	#[NoCSRFRequired]
	public function list(string $token): DataResponse {
		try {
			return new DataResponse([
				'comments' => $this->commentService->listForPublicShare($token, $this->getGuestId()),
			]);
		} catch (FeedbackException $exception) {
			return new DataResponse([
				'message' => $exception->getMessage(),
			], $exception->getStatusCode());
		}
	}

	#[PublicPage]
	#[NoCSRFRequired]
	public function create(string $token, int $timestampMilliseconds, string $message): DataResponse {
		try {
			return new DataResponse([
				'comment' => $this->commentService->createForPublicShare($token, $this->getGuestId(), $timestampMilliseconds, $message),
			], 201);
		} catch (FeedbackException $exception) {
			return new DataResponse([
				'message' => $exception->getMessage(),
			], $exception->getStatusCode());
		}
	}

	#[PublicPage]
	#[NoCSRFRequired]
	public function updateStatus(string $token, int $commentId, string $status): DataResponse {
		try {
			return new DataResponse([
				'comment' => $this->commentService->updateStatusForPublicShare($token, $this->getGuestId(), $commentId, $status),
			]);
		} catch (FeedbackException $exception) {
			return new DataResponse([
				'message' => $exception->getMessage(),
			], $exception->getStatusCode());
		}
	}

	#[PublicPage]
	#[NoCSRFRequired]
	public function update(string $token, int $commentId, string $message): DataResponse {
		try {
			return new DataResponse([
				'comment' => $this->commentService->updateMessageForPublicShare($token, $this->getGuestId(), $commentId, $message),
			]);
		} catch (FeedbackException $exception) {
			return new DataResponse([
				'message' => $exception->getMessage(),
			], $exception->getStatusCode());
		}
	}

	#[PublicPage]
	#[NoCSRFRequired]
	public function delete(string $token, int $commentId): DataResponse {
		try {
			$this->commentService->deleteCommentForPublicShare($token, $this->getGuestId(), $commentId);
			return new DataResponse([], 204);
		} catch (FeedbackException $exception) {
			return new DataResponse([
				'message' => $exception->getMessage(),
			], $exception->getStatusCode());
		}
	}

	private function getGuestId(): string {
		$guestId = trim((string)$this->currentRequest->getHeader('X-Feedback-Guest-Id'));
		if ($guestId === '') {
			throw new FeedbackException('Missing guest identifier', 400);
		}

		return substr($guestId, 0, 128);
	}
}
