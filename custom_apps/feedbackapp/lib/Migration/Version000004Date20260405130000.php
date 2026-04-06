<?php

declare(strict_types=1);

namespace OCA\FeedbackApp\Migration;

use Closure;
use OCP\DB\ISchemaWrapper;
use OCP\Migration\IOutput;
use OCP\Migration\SimpleMigrationStep;

class Version000004Date20260405130000 extends SimpleMigrationStep {
	public function changeSchema(IOutput $output, Closure $schemaClosure, array $options): ?ISchemaWrapper {
		$schema = $schemaClosure();

		if (!$schema->hasTable('feedback_comments')) {
			return $schema;
		}

		$table = $schema->getTable('feedback_comments');
		if (!$table->hasColumn('public_author_token')) {
			$table->addColumn('public_author_token', 'string', [
				'notnull' => false,
				'length' => 128,
				'default' => null,
			]);
			$table->addIndex(['public_author_token'], 'feedback_public_author_token_idx');
		}

		return $schema;
	}
}
