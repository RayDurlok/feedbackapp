<?php

declare(strict_types=1);

namespace OCA\FeedbackApp\Migration;

use OCP\DB\ISchemaWrapper;
use OCP\DB\Types;
use OCP\IDBConnection;
use OCP\Migration\IOutput;
use OCP\Migration\SimpleMigrationStep;

class Version000002Date20260404120000 extends SimpleMigrationStep {
	public function __construct(
		private IDBConnection $db,
	) {
	}

	public function changeSchema(IOutput $output, \Closure $schemaClosure, array $options) {
		/** @var ISchemaWrapper $schema */
		$schema = $schemaClosure();

		if (!$schema->hasTable('feedback_comments')) {
			return null;
		}

		$table = $schema->getTable('feedback_comments');
		if (!$table->hasColumn('timestamp_milliseconds')) {
			$table->addColumn('timestamp_milliseconds', Types::BIGINT, [
				'notnull' => true,
				'length' => 20,
				'unsigned' => true,
				'default' => 0,
			]);
			$table->addIndex(['timestamp_milliseconds'], 'feedback_comments_timestamp_ms_idx');
		}

		return $schema;
	}

	public function postSchemaChange(IOutput $output, \Closure $schemaClosure, array $options): void {
		$selectQuery = $this->db->getQueryBuilder();
		$selectQuery->select('id', 'timestamp_seconds')
			->from('feedback_comments')
			->where($selectQuery->expr()->eq('timestamp_milliseconds', $selectQuery->createNamedParameter(0, Types::BIGINT)));

		$result = $selectQuery->executeQuery();
		$rows = $result->fetchAllAssociative();
		$result->closeCursor();

		foreach ($rows as $row) {
			$updateQuery = $this->db->getQueryBuilder();
			$updateQuery->update('feedback_comments')
				->set('timestamp_milliseconds', $updateQuery->createNamedParameter((int)$row['timestamp_seconds'] * 1000, Types::BIGINT))
				->where($updateQuery->expr()->eq('id', $updateQuery->createNamedParameter((int)$row['id'], Types::BIGINT)));

			$updateQuery->executeStatement();
		}
	}
}
