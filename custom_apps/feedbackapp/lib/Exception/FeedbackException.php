<?php

declare(strict_types=1);

namespace OCA\FeedbackApp\Exception;

class FeedbackException extends \RuntimeException {
	public function __construct(
		string $message,
		private int $statusCode,
	) {
		parent::__construct($message);
	}

	public function getStatusCode(): int {
		return $this->statusCode;
	}
}
