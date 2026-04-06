<?php

declare(strict_types=1);

namespace OCA\FeedbackApp\Migration;

use Closure;
use OCP\DB\ISchemaWrapper;
use OCP\Migration\IOutput;
use OCP\Migration\SimpleMigrationStep;

class Version000006Date20260406170000 extends SimpleMigrationStep {
	public function changeSchema(IOutput $output, Closure $schemaClosure, array $options): ?ISchemaWrapper {
		$schema = $schemaClosure();

		if ($schema->hasTable('feedback_public_share_settings')) {
			return $schema;
		}

		$table = $schema->createTable('feedback_public_share_settings');
		$table->addColumn('id', 'bigint', [
			'autoincrement' => true,
			'notnull' => true,
			'unsigned' => true,
		]);
		$table->addColumn('file_id', 'bigint', [
			'notnull' => true,
			'unsigned' => true,
		]);
		$table->addColumn('user_uid', 'string', [
			'length' => 64,
			'notnull' => true,
		]);
		$table->addColumn('auto_open', 'boolean', [
			'notnull' => true,
			'default' => false,
		]);
		$table->addColumn('updated_at', 'integer', [
			'notnull' => true,
			'unsigned' => true,
		]);
		$table->setPrimaryKey(['id']);
		$table->addUniqueIndex(['file_id', 'user_uid'], 'feedback_pub_share_file_user_uidx');

		return $schema;
	}
}
