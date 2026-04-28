<?php

declare(strict_types=1);

namespace OCA\FeedbackApp\Controller;

use OCA\FeedbackApp\Exception\FeedbackException;
use OCA\FeedbackApp\Service\CommentService;
use OCA\FeedbackApp\Service\SettingsService;
use OCP\AppFramework\Controller;
use OCP\AppFramework\Http\DataResponse;
use OCP\IRequest;

class CommentsController extends Controller {
	public function __construct(
		IRequest $request,
		private CommentService $commentService,
		private SettingsService $settingsService,
	) {
		parent::__construct('feedbackapp', $request);
	}

	/**
	 * @NoAdminRequired
	 */
	public function list(int $fileId): DataResponse {
		try {
			return new DataResponse([
				'comments' => $this->commentService->listForFile($fileId),
				'publicShareAutoOpen' => $this->settingsService->getEffectivePublicShareAutoOpenForCurrentUser($fileId),
				'canManagePublicShareAutoOpen' => true,
			]);
		} catch (FeedbackException $exception) {
			return new DataResponse([
				'message' => $exception->getMessage(),
			], $exception->getStatusCode());
		}
	}

	/**
	 * @NoAdminRequired
	 */
	public function fileInfoByPath(string $path): DataResponse {
		try {
			return new DataResponse([
				'file' => $this->commentService->getVideoFileInfoForCurrentUserPath($path),
			]);
		} catch (FeedbackException $exception) {
			return new DataResponse([
				'message' => $exception->getMessage(),
			], $exception->getStatusCode());
		}
	}

	/**
	 * @NoAdminRequired
	 */
	public function create(int $fileId, int $timestampMilliseconds, string $message): DataResponse {
		try {
			return new DataResponse([
				'comment' => $this->commentService->createForFile($fileId, $timestampMilliseconds, $message),
			], 201);
		} catch (FeedbackException $exception) {
			return new DataResponse([
				'message' => $exception->getMessage(),
			], $exception->getStatusCode());
		}
	}

	/**
	 * @NoAdminRequired
	 */
	public function updateStatus(int $commentId, string $status): DataResponse {
		try {
			return new DataResponse([
				'comment' => $this->commentService->updateStatus($commentId, $status),
			]);
		} catch (FeedbackException $exception) {
			return new DataResponse([
				'message' => $exception->getMessage(),
			], $exception->getStatusCode());
		}
	}

	/**
	 * @NoAdminRequired
	 */
	public function update(int $commentId, string $message): DataResponse {
		try {
			return new DataResponse([
				'comment' => $this->commentService->updateMessage($commentId, $message),
			]);
		} catch (FeedbackException $exception) {
			return new DataResponse([
				'message' => $exception->getMessage(),
			], $exception->getStatusCode());
		}
	}

	/**
	 * @NoAdminRequired
	 */
	public function delete(int $commentId): DataResponse {
		try {
			$this->commentService->deleteComment($commentId);

			return new DataResponse([], 204);
		} catch (FeedbackException $exception) {
			return new DataResponse([
				'message' => $exception->getMessage(),
			], $exception->getStatusCode());
		}
	}

	/**
	 * @NoAdminRequired
	 */
	public function updatePublicShareAutoOpen(int $fileId, bool $enabled): DataResponse {
		try {
			return new DataResponse([
				'publicShareAutoOpen' => $this->settingsService->updatePublicShareAutoOpenForCurrentUser($fileId, $enabled),
				'canManagePublicShareAutoOpen' => true,
			]);
		} catch (FeedbackException $exception) {
			return new DataResponse([
				'message' => $exception->getMessage(),
			], $exception->getStatusCode());
		}
	}
}
