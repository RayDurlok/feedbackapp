<?php

declare(strict_types=1);

namespace OCA\FeedbackApp\Migration;

use Closure;
use OCP\DB\ISchemaWrapper;
use OCP\Migration\IOutput;
use OCP\Migration\SimpleMigrationStep;

class Version000005Date20260406090000 extends SimpleMigrationStep {
	public function changeSchema(IOutput $output, Closure $schemaClosure, array $options): ?ISchemaWrapper {
		$schema = $schemaClosure();

		if (!$schema->hasTable('feedback_comments')) {
			return $schema;
		}

		$table = $schema->getTable('feedback_comments');
		if ($table->hasColumn('timestamp_seconds')) {
			$table->getColumn('timestamp_seconds')->setDefault(0);
		}

		return $schema;
	}
}
