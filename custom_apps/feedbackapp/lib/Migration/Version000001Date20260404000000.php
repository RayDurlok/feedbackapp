<?php

declare(strict_types=1);

namespace OCA\FeedbackApp\Migration;

use OCP\DB\ISchemaWrapper;
use OCP\DB\Types;
use OCP\Migration\IOutput;
use OCP\Migration\SimpleMigrationStep;

class Version000001Date20260404000000 extends SimpleMigrationStep {
	public function changeSchema(IOutput $output, \Closure $schemaClosure, array $options) {
		/** @var ISchemaWrapper $schema */
		$schema = $schemaClosure();

		if ($schema->hasTable('feedback_comments')) {
			return null;
		}

		$table = $schema->createTable('feedback_comments');
		$table->addColumn('id', Types::BIGINT, [
			'autoincrement' => true,
			'notnull' => true,
			'length' => 20,
			'unsigned' => true,
		]);
		$table->addColumn('file_id', Types::INTEGER, [
			'notnull' => true,
			'length' => 11,
			'unsigned' => true,
		]);
		$table->addColumn('timestamp_seconds', Types::INTEGER, [
			'notnull' => true,
			'length' => 11,
			'unsigned' => true,
		]);
		$table->addColumn('message', Types::TEXT, [
			'notnull' => true,
		]);
		$table->addColumn('author_uid', Types::STRING, [
			'notnull' => true,
			'length' => 255,
		]);
		$table->addColumn('created_at', Types::INTEGER, [
			'notnull' => true,
			'length' => 11,
			'unsigned' => true,
		]);
		$table->addColumn('updated_at', Types::INTEGER, [
			'notnull' => true,
			'length' => 11,
			'unsigned' => true,
		]);

		$table->setPrimaryKey(['id']);
		$table->addIndex(['file_id'], 'feedback_comments_file_id_idx');
		$table->addIndex(['author_uid'], 'feedback_comments_author_uid_idx');

		return $schema;
	}
}
