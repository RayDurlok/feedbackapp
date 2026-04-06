<?php

declare(strict_types=1);

namespace OCA\FeedbackApp\Service;

use OCA\FeedbackApp\Exception\FeedbackException;
use OCP\Files\IRootFolder;
use OCP\Files\NotFoundException;
use OCP\Files\Node;
use OCP\IConfig;
use OCP\IDBConnection;
use OCP\IUserSession;

class SettingsService {
	public const APP_PUBLIC_SHARE_ENABLED = 'enable_public_share_feedback';
	public const USER_PUBLIC_SHARE_AUTO_OPEN = 'auto_open_public_share_sidebar';

	public function __construct(
		private IConfig $config,
		private IDBConnection $db,
		private IRootFolder $rootFolder,
		private IUserSession $userSession,
	) {
	}

	public function isPublicShareFeedbackEnabled(): bool {
		return $this->config->getAppValue('feedbackapp', self::APP_PUBLIC_SHARE_ENABLED, 'yes') === 'yes';
	}

	public function setPublicShareFeedbackEnabled(bool $enabled): void {
		$this->config->setAppValue('feedbackapp', self::APP_PUBLIC_SHARE_ENABLED, $enabled ? 'yes' : 'no');
	}

	public function getUserPublicShareAutoOpen(string $uid): bool {
		if ($uid === '') {
			return false;
		}

		return $this->config->getUserValue($uid, 'feedbackapp', self::USER_PUBLIC_SHARE_AUTO_OPEN, 'no') === 'yes';
	}

	public function setUserPublicShareAutoOpen(string $uid, bool $enabled): void {
		if ($uid === '') {
			return;
		}

		$this->config->setUserValue($uid, 'feedbackapp', self::USER_PUBLIC_SHARE_AUTO_OPEN, $enabled ? 'yes' : 'no');
	}

	public function getEffectivePublicShareAutoOpenForCurrentUser(int $fileId): bool {
		$user = $this->userSession->getUser();
		if ($user === null) {
			throw new FeedbackException('User not logged in', 401);
		}

		$this->assertVideoFileAccess($fileId, $user->getUID());

		return $this->getEffectivePublicShareAutoOpenForUserAndFile($user->getUID(), $fileId);
	}

	public function updatePublicShareAutoOpenForCurrentUser(int $fileId, bool $enabled): bool {
		$user = $this->userSession->getUser();
		if ($user === null) {
			throw new FeedbackException('User not logged in', 401);
		}

		$this->assertVideoFileAccess($fileId, $user->getUID());

		$existing = $this->getExplicitPublicShareAutoOpenForUserAndFile($user->getUID(), $fileId);
		$now = time();
		$query = $this->db->getQueryBuilder();

		if ($existing === null) {
			$query->insert('feedback_public_share_settings')
				->values([
					'file_id' => $query->createNamedParameter($fileId),
					'user_uid' => $query->createNamedParameter($user->getUID()),
					'auto_open' => $query->createNamedParameter($enabled ? 1 : 0),
					'updated_at' => $query->createNamedParameter($now),
				]);
		} else {
			$query->update('feedback_public_share_settings')
				->set('auto_open', $query->createNamedParameter($enabled ? 1 : 0))
				->set('updated_at', $query->createNamedParameter($now))
				->where($query->expr()->eq('file_id', $query->createNamedParameter($fileId)))
				->andWhere($query->expr()->eq('user_uid', $query->createNamedParameter($user->getUID())));
		}

		$query->executeStatement();

		return $enabled;
	}

	public function getEffectivePublicShareAutoOpenForUserAndFile(string $uid, int $fileId): bool {
		$explicit = $this->getExplicitPublicShareAutoOpenForUserAndFile($uid, $fileId);
		if ($explicit !== null) {
			return $explicit;
		}

		return $this->getUserPublicShareAutoOpen($uid);
	}

	private function getExplicitPublicShareAutoOpenForUserAndFile(string $uid, int $fileId): ?bool {
		if ($uid === '' || $fileId <= 0) {
			return null;
		}

		$query = $this->db->getQueryBuilder();
		$query->select('auto_open')
			->from('feedback_public_share_settings')
			->where($query->expr()->eq('file_id', $query->createNamedParameter($fileId)))
			->andWhere($query->expr()->eq('user_uid', $query->createNamedParameter($uid)))
			->setMaxResults(1);

		$result = $query->executeQuery();
		$row = $result->fetchAssociative();
		$result->closeCursor();

		if ($row === false) {
			return null;
		}

		return (bool)(int)$row['auto_open'];
	}

	private function assertVideoFileAccess(int $fileId, string $uid): Node {
		try {
			$node = $this->rootFolder->getUserFolder($uid)->getFirstNodeById($fileId);
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
}
