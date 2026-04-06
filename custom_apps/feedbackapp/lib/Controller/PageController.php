<?php

declare(strict_types=1);

namespace OCA\FeedbackApp\Controller;

use OCP\AppFramework\Controller;
use OCP\AppFramework\Http\TemplateResponse;
use OCP\IRequest;

class PageController extends Controller {
	public function __construct(IRequest $request) {
		parent::__construct('feedbackapp', $request);
	}

	/**
	 * @NoAdminRequired
	 * @NoCSRFRequired
	 */
	public function index(): TemplateResponse {
		return new TemplateResponse('feedbackapp', 'index');
	}
}
