<?php

declare(strict_types=1);

namespace OCA\FeedbackApp\Controller;

use OCA\FeedbackApp\Exception\FeedbackException;
use OCA\FeedbackApp\Service\SettingsService;
use OCP\AppFramework\Controller;
use OCP\AppFramework\Http\Attribute\NoCSRFRequired;
use OCP\AppFramework\Http\Attribute\PublicPage;
use OCP\AppFramework\Http\DataResponse;
use OCP\Constants;
use OCP\Files\File;
use OCP\Files\Folder;
use OCP\IRequest;
use OCP\Share\Exceptions\ShareNotFound;
use OCP\Share\IManager as ShareManager;
use OCP\Share\IShare;

class PublicConfigController extends Controller {
	public function __construct(
		string $appName,
		IRequest $request,
		private ShareManager $shareManager,
		private SettingsService $settingsService,
	) {
		parent::__construct($appName, $request);
	}

	#[PublicPage]
	#[NoCSRFRequired]
	public function show(string $token, ?string $path = null): DataResponse {
		try {
			$share = $this->shareManager->getShareByToken($token);
			if (($share->getPermissions() & Constants::PERMISSION_READ) === 0 || !$share->canSeeContent()) {
				throw new FeedbackException('Share not accessible', 403);
			}

			$node = $this->resolveSharedVideo($share, $path);

			$ownerUid = $this->resolveSettingsOwnerUid($share, $node);

			return new DataResponse([
				'enabled' => $this->settingsService->isPublicShareFeedbackEnabled(),
				'autoOpenSidebar' => $this->settingsService->getEffectivePublicShareAutoOpenForUserAndFile($ownerUid, $node->getId()),
			]);
		} catch (ShareNotFound) {
			return new DataResponse([
				'message' => 'Share not found',
			], 404);
		} catch (FeedbackException $exception) {
			return new DataResponse([
				'message' => $exception->getMessage(),
			], $exception->getStatusCode());
		} catch (\Throwable) {
			return new DataResponse([
				'message' => 'Failed to load public-share settings.',
			], 500);
		}
	}

	private function resolveSettingsOwnerUid(IShare $share, File $node): string {
		$sharedBy = trim((string)$share->getSharedBy());
		if ($sharedBy !== '') {
			return $sharedBy;
		}

		$shareOwner = trim((string)$share->getShareOwner());
		if ($shareOwner !== '') {
			return $shareOwner;
		}

		return $node->getOwner()?->getUID() ?? '';
	}

	private function resolveSharedVideo(IShare $share, ?string $path): File {
		$node = $share->getNode();
		if ($node instanceof File) {
			if (!str_starts_with($node->getMimetype(), 'video/')) {
				throw new FeedbackException('Feedback is only available for video files', 400);
			}

			return $node;
		}

		if (!$node instanceof Folder) {
			throw new FeedbackException('Feedback is only available for shared video files', 400);
		}

		$relativePath = trim((string)$path, '/');
		if ($relativePath === '') {
			throw new FeedbackException('No shared video selected', 400);
		}

		try {
			$resolvedNode = $node->get($relativePath);
		} catch (\Throwable) {
			throw new FeedbackException('Shared video not found', 404);
		}

		if (!$resolvedNode instanceof File || !str_starts_with($resolvedNode->getMimetype(), 'video/')) {
			throw new FeedbackException('Feedback is only available for video files', 400);
		}

		return $resolvedNode;
	}
}
