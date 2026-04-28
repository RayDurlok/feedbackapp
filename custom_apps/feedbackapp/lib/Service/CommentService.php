<?php

declare(strict_types=1);

namespace OCA\FeedbackApp\Service;

use OCA\FeedbackApp\BackgroundJob\SendFeedbackNotificationJob;
use OCA\FeedbackApp\Exception\FeedbackException;
use OCP\Constants;
use OCP\BackgroundJob\IJobList;
use OCP\Files\File;
use OCP\Files\Folder;
use OCP\Files\IRootFolder;
use OCP\Files\NotFoundException;
use OCP\IDBConnection;
use OCP\IUserManager;
use OCP\IUserSession;
use OCP\Files\Node;
use OCP\Share\Exceptions\ShareNotFound;
use OCP\Share\IManager as ShareManager;

class CommentService {
	private const PUBLIC_AUTHOR_UID = 'public-share';
	private const PUBLIC_AUTHOR_DISPLAY_NAME = 'Guest';

	public function __construct(
		private IDBConnection $db,
		private IRootFolder $rootFolder,
		private IUserSession $userSession,
		private IUserManager $userManager,
		private ShareManager $shareManager,
		private FeedbackNotificationService $feedbackNotificationService,
		private IJobList $jobList,
	) {
	}

	public function listForFile(int $fileId): array {
		$node = $this->assertVideoFileAccess($fileId);
		$currentUser = $this->userSession->getUser();
		$currentUid = $currentUser?->getUID() ?? '';
		$ownerUid = $this->getOwnerUid($node);
		if ($currentUid !== '' && $currentUid === $ownerUid) {
			$this->feedbackNotificationService->clearForUser($fileId, $currentUid);
		}

		return $this->fetchCommentsForFile($fileId, $currentUid, null);
	}

	public function getVideoFileInfoForCurrentUserPath(string $path): array {
		$user = $this->userSession->getUser();
		if ($user === null) {
			throw new FeedbackException('User not logged in', 401);
		}

		$relativePath = trim($path, '/');
		if ($relativePath === '') {
			throw new FeedbackException('No file selected', 400);
		}

		try {
			$node = $this->rootFolder->getUserFolder($user->getUID())->get($relativePath);
		} catch (NotFoundException) {
			throw new FeedbackException('File not accessible', 404);
		}

		if (!$node instanceof File || !str_starts_with($node->getMimetype(), 'video/')) {
			throw new FeedbackException('Feedback is only available for video files', 400);
		}

		return [
			'id' => $node->getId(),
			'fileid' => $node->getId(),
			'basename' => $node->getName(),
			'mime' => $node->getMimetype(),
			'mimetype' => $node->getMimetype(),
			'path' => '/' . $relativePath,
			'root' => '/files/' . $user->getUID(),
			'owner' => $user->getUID(),
			'permissions' => $node->getPermissions(),
			'size' => $node->getSize(),
		];
	}

	public function createForFile(int $fileId, int $timestampMilliseconds, string $message): array {
		$user = $this->userSession->getUser();
		if ($user === null) {
			throw new FeedbackException('User not logged in', 401);
		}

		$node = $this->assertVideoFileAccess($fileId);
		$message = trim($message);
		if ($message === '') {
			throw new FeedbackException('Message is required', 400);
		}

		$timestampMilliseconds = max(0, $timestampMilliseconds);
		$now = time();

		$query = $this->db->getQueryBuilder();
		$query->insert('feedback_comments')
			->values([
				'file_id' => $query->createNamedParameter($fileId),
				'timestamp_seconds' => $query->createNamedParameter((int)floor($timestampMilliseconds / 1000)),
				'timestamp_milliseconds' => $query->createNamedParameter($timestampMilliseconds),
				'message' => $query->createNamedParameter($message),
				'author_uid' => $query->createNamedParameter($user->getUID()),
				'status' => $query->createNamedParameter('open'),
				'created_at' => $query->createNamedParameter($now),
				'updated_at' => $query->createNamedParameter($now),
			]);
		$query->executeStatement();

		$this->queueOwnerNotification(
			$fileId,
			$node->getName(),
			$this->getOwnerUid($node),
			$user->getUID(),
			$this->resolveDisplayName($user->getUID()),
		);

		return [
			'id' => (int)$this->db->lastInsertId('*PREFIX*feedback_comments'),
			'fileId' => $fileId,
			'timestampMilliseconds' => $timestampMilliseconds,
			'message' => $message,
			'authorUid' => $user->getUID(),
			'authorDisplayName' => $this->resolveDisplayName($user->getUID()),
			'status' => 'open',
			'createdAt' => $now,
			'updatedAt' => $now,
			'canManage' => true,
		];
	}

	public function updateStatus(int $commentId, string $status): array {
		$status = strtolower(trim($status));
		if (!in_array($status, ['open', 'done'], true)) {
			throw new FeedbackException('Invalid status', 400);
		}

		$currentUid = $this->userSession->getUser()?->getUID() ?? null;
		$comment = $this->getCommentById($commentId, $currentUid, null);
		$this->assertVideoFileAccess($comment['fileId']);

		$now = time();
		$query = $this->db->getQueryBuilder();
		$query->update('feedback_comments')
			->set('status', $query->createNamedParameter($status))
			->set('updated_at', $query->createNamedParameter($now))
			->where($query->expr()->eq('id', $query->createNamedParameter($commentId)));
		$query->executeStatement();

		$comment['status'] = $status;
		$comment['updatedAt'] = $now;

		return $comment;
	}

	public function listForPublicShare(string $token, string $guestId, ?string $path = null): array {
		$file = $this->assertPublicVideoShareAccess($token, $path);
		return $this->fetchCommentsForFile($file->getId(), null, $guestId);
	}

	public function createForPublicShare(string $token, string $guestId, int $timestampMilliseconds, string $message, ?string $path = null): array {
		$file = $this->assertPublicVideoShareAccess($token, $path);
		$message = trim($message);
		if ($message === '') {
			throw new FeedbackException('Message is required', 400);
		}

		$timestampMilliseconds = max(0, $timestampMilliseconds);
		$now = time();
		$fileId = $file->getId();

		$query = $this->db->getQueryBuilder();
		$query->insert('feedback_comments')
			->values([
				'file_id' => $query->createNamedParameter($fileId),
				'timestamp_seconds' => $query->createNamedParameter((int)floor($timestampMilliseconds / 1000)),
				'timestamp_milliseconds' => $query->createNamedParameter($timestampMilliseconds),
				'message' => $query->createNamedParameter($message),
				'author_uid' => $query->createNamedParameter(self::PUBLIC_AUTHOR_UID),
				'public_author_token' => $query->createNamedParameter($guestId),
				'status' => $query->createNamedParameter('open'),
				'created_at' => $query->createNamedParameter($now),
				'updated_at' => $query->createNamedParameter($now),
			]);
		$query->executeStatement();

		$this->queueOwnerNotification(
			$fileId,
			$file->getName(),
			$this->getOwnerUid($file),
			self::PUBLIC_AUTHOR_UID,
			self::PUBLIC_AUTHOR_DISPLAY_NAME,
		);

		return [
			'id' => (int)$this->db->lastInsertId('*PREFIX*feedback_comments'),
			'fileId' => $fileId,
			'timestampMilliseconds' => $timestampMilliseconds,
			'message' => $message,
			'authorUid' => self::PUBLIC_AUTHOR_UID,
			'authorDisplayName' => self::PUBLIC_AUTHOR_DISPLAY_NAME,
			'status' => 'open',
			'createdAt' => $now,
			'updatedAt' => $now,
			'canManage' => true,
		];
	}

	public function updateStatusForPublicShare(string $token, string $guestId, int $commentId, string $status, ?string $path = null): array {
		$status = strtolower(trim($status));
		if (!in_array($status, ['open', 'done'], true)) {
			throw new FeedbackException('Invalid status', 400);
		}

		$file = $this->assertPublicVideoShareAccess($token, $path);
		$comment = $this->getCommentById($commentId, null, $guestId);
		if ($comment['fileId'] !== $file->getId()) {
			throw new FeedbackException('Feedback not accessible', 403);
		}

		$now = time();
		$query = $this->db->getQueryBuilder();
		$query->update('feedback_comments')
			->set('status', $query->createNamedParameter($status))
			->set('updated_at', $query->createNamedParameter($now))
			->where($query->expr()->eq('id', $query->createNamedParameter($commentId)));
		$query->executeStatement();

		$comment['status'] = $status;
		$comment['updatedAt'] = $now;

		return $this->getCommentById($commentId, null, $guestId);
	}

	public function updateMessageForPublicShare(string $token, string $guestId, int $commentId, string $message, ?string $path = null): array {
		$message = trim($message);
		if ($message === '') {
			throw new FeedbackException('Message is required', 400);
		}

		$file = $this->assertPublicVideoShareAccess($token, $path);
		$comment = $this->getCommentById($commentId, null, $guestId);
		if ($comment['fileId'] !== $file->getId()) {
			throw new FeedbackException('Feedback not accessible', 403);
		}

		$this->assertPublicCommentOwner($comment, $guestId);

		$now = time();
		$query = $this->db->getQueryBuilder();
		$query->update('feedback_comments')
			->set('message', $query->createNamedParameter($message))
			->set('updated_at', $query->createNamedParameter($now))
			->where($query->expr()->eq('id', $query->createNamedParameter($commentId)));
		$query->executeStatement();

		return $this->getCommentById($commentId, null, $guestId);
	}

	public function deleteCommentForPublicShare(string $token, string $guestId, int $commentId, ?string $path = null): void {
		$file = $this->assertPublicVideoShareAccess($token, $path);
		$comment = $this->getCommentById($commentId, null, $guestId);
		if ($comment['fileId'] !== $file->getId()) {
			throw new FeedbackException('Feedback not accessible', 403);
		}

		$this->assertPublicCommentOwner($comment, $guestId);

		$query = $this->db->getQueryBuilder();
		$query->delete('feedback_comments')
			->where($query->expr()->eq('id', $query->createNamedParameter($commentId)));
		$query->executeStatement();
	}

	public function updateMessage(int $commentId, string $message): array {
		$message = trim($message);
		if ($message === '') {
			throw new FeedbackException('Message is required', 400);
		}

		$currentUid = $this->userSession->getUser()?->getUID() ?? null;
		$comment = $this->getCommentById($commentId, $currentUid, null);
		$this->assertVideoFileAccess($comment['fileId']);
		$this->assertCommentOwner($comment);

		$now = time();
		$query = $this->db->getQueryBuilder();
		$query->update('feedback_comments')
			->set('message', $query->createNamedParameter($message))
			->set('updated_at', $query->createNamedParameter($now))
			->where($query->expr()->eq('id', $query->createNamedParameter($commentId)));
		$query->executeStatement();

		$comment['message'] = $message;
		$comment['updatedAt'] = $now;

		return $comment;
	}

	public function deleteComment(int $commentId): void {
		$comment = $this->getCommentById($commentId);
		$this->assertVideoFileAccess($comment['fileId']);
		$this->assertCommentOwner($comment);

		$query = $this->db->getQueryBuilder();
		$query->delete('feedback_comments')
			->where($query->expr()->eq('id', $query->createNamedParameter($commentId)));
		$query->executeStatement();
	}

	private function getCommentById(int $commentId, ?string $currentUid = null, ?string $guestId = null): array {
		$query = $this->db->getQueryBuilder();
		$query->select('id', 'file_id', 'timestamp_milliseconds', 'message', 'author_uid', 'public_author_token', 'status', 'created_at', 'updated_at')
			->from('feedback_comments')
			->where($query->expr()->eq('id', $query->createNamedParameter($commentId)));

		$result = $query->executeQuery();
		$row = $result->fetchAssociative();
		$result->closeCursor();

		if ($row === false) {
			throw new FeedbackException('Feedback not found', 404);
		}

		return $this->mapCommentRow($row, $currentUid, $guestId);
	}

	private function resolveDisplayName(string $uid): string {
		if ($uid === self::PUBLIC_AUTHOR_UID) {
			return self::PUBLIC_AUTHOR_DISPLAY_NAME;
		}

		$user = $this->userManager->get($uid);
		if ($user === null) {
			return $uid;
		}

		return $user->getDisplayName();
	}

	private function assertCommentOwner(array $comment): void {
		$user = $this->userSession->getUser();
		if ($user === null) {
			throw new FeedbackException('User not logged in', 401);
		}

		if ($comment['authorUid'] !== $user->getUID()) {
			throw new FeedbackException('Only the author can edit or delete this feedback', 403);
		}
	}

	private function assertPublicCommentOwner(array $comment, string $guestId): void {
		if ($comment['authorUid'] !== self::PUBLIC_AUTHOR_UID || ($comment['publicAuthorToken'] ?? null) !== $guestId) {
			throw new FeedbackException('Only the author can edit or delete this feedback', 403);
		}
	}

	private function assertVideoFileAccess(int $fileId): Node {
		$user = $this->userSession->getUser();
		if ($user === null) {
			throw new FeedbackException('User not logged in', 401);
		}

		try {
			$node = $this->rootFolder->getUserFolder($user->getUID())->getFirstNodeById($fileId);
		} catch (NotFoundException) {
			$node = null;
		}

		if ($node === null) {
			throw new FeedbackException('File not accessible', 403);
		}

		if (!str_starts_with($node->getMimetype(), 'video/')) {
			throw new FeedbackException('Feedback is only available for video files', 400);
		}

		return $node;
	}

	private function assertPublicVideoShareAccess(string $token, ?string $path = null): File {
		try {
			$share = $this->shareManager->getShareByToken($token);
		} catch (ShareNotFound) {
			throw new FeedbackException('Share not found', 404);
		}

		if (($share->getPermissions() & Constants::PERMISSION_READ) === 0 || !$share->canSeeContent()) {
			throw new FeedbackException('Share not accessible', 403);
		}

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
		} catch (NotFoundException) {
			throw new FeedbackException('Shared video not found', 404);
		}

		if (!$resolvedNode instanceof File || !str_starts_with($resolvedNode->getMimetype(), 'video/')) {
			throw new FeedbackException('Feedback is only available for video files', 400);
		}

		return $resolvedNode;
	}

	private function fetchCommentsForFile(int $fileId, ?string $currentUid = null, ?string $guestId = null): array {
		$query = $this->db->getQueryBuilder();
		$query->select('id', 'file_id', 'timestamp_milliseconds', 'message', 'author_uid', 'public_author_token', 'status', 'created_at', 'updated_at')
			->from('feedback_comments')
			->where($query->expr()->eq('file_id', $query->createNamedParameter($fileId)))
			->orderBy('timestamp_milliseconds', 'ASC')
			->addOrderBy('created_at', 'ASC');

		$result = $query->executeQuery();
		$rows = $result->fetchAllAssociative();
		$result->closeCursor();

		return array_map(fn (array $row): array => $this->mapCommentRow($row, $currentUid, $guestId), $rows);
	}

	private function mapCommentRow(array $row, ?string $currentUid = null, ?string $guestId = null): array {
		$authorUid = $row['author_uid'];
		$publicAuthorToken = $row['public_author_token'] ?? null;
		$canManage = false;

		if ($currentUid !== null && $currentUid !== '') {
			$canManage = $authorUid === $currentUid;
		} elseif ($guestId !== null && $guestId !== '') {
			$canManage = $authorUid === self::PUBLIC_AUTHOR_UID && $publicAuthorToken === $guestId;
		}

		return [
			'id' => (int)$row['id'],
			'fileId' => (int)$row['file_id'],
			'timestampMilliseconds' => (int)$row['timestamp_milliseconds'],
			'message' => $row['message'],
			'authorUid' => $authorUid,
			'authorDisplayName' => $this->resolveDisplayName($authorUid),
			'publicAuthorToken' => $publicAuthorToken,
			'status' => $row['status'],
			'createdAt' => (int)$row['created_at'],
			'updatedAt' => (int)$row['updated_at'],
			'canManage' => $canManage,
		];
	}

	private function getOwnerUid(Node $node): string {
		$owner = $node->getOwner();
		if ($owner === null) {
			return '';
		}

		return $owner->getUID();
	}

	private function queueOwnerNotification(int $fileId, string $fileName, string $ownerUid, string $actorUid, string $actorDisplayName): void {
		if ($ownerUid === '' || $ownerUid === $actorUid) {
			return;
		}

		$this->jobList->add(SendFeedbackNotificationJob::class, [
			'fileId' => $fileId,
			'fileName' => $fileName,
			'ownerUid' => $ownerUid,
			'actorUid' => $actorUid,
			'actorDisplayName' => $actorDisplayName,
		]);
	}
}
