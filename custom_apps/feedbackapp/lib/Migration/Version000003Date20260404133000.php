<?php

declare(strict_types=1);

namespace OCA\FeedbackApp\Migration;

use OCP\DB\ISchemaWrapper;
use OCP\DB\Types;
use OCP\IConfig;
use OCP\Migration\IOutput;
use OCP\Migration\SimpleMigrationStep;

class Version000003Date20260404133000 extends SimpleMigrationStep {
	public function __construct(
		private IConfig $config,
	) {
	}

	public function changeSchema(IOutput $output, \Closure $schemaClosure, array $options) {
		/** @var ISchemaWrapper $schema */
		$schema = $schemaClosure();

		if (!$schema->hasTable('feedback_comments')) {
			return null;
		}

		$table = $schema->getTable('feedback_comments');
		if (!$table->hasColumn('status')) {
			$table->addColumn('status', Types::STRING, [
				'notnull' => true,
				'length' => 16,
				'default' => 'open',
			]);
			$table->addIndex(['status'], 'feedback_comments_status_idx');
		}

		return $schema;
	}

	public function postSchemaChange(IOutput $output, \Closure $schemaClosure, array $options): void {
		if ($this->config->getAppValue('feedbackapp', 'status_backfill_done', '0') === '1') {
			return;
		}

		$this->config->setAppValue('feedbackapp', 'status_backfill_done', '1');
	}
}
