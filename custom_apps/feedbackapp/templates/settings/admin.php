<?php
declare(strict_types=1);

/** @var array<string, mixed> $_ */

$requestToken = (string) ($_['requesttoken'] ?? \OC::$server->getCsrfTokenManager()->getToken()->getEncryptedValue());
?>

<div class="section">
	<h2>Feedback App</h2>
	<p>Control whether Feedback App is available in public video shares at all.</p>

	<form method="post" action="<?php p(\OC::$server->getURLGenerator()->linkToRoute('feedbackapp.settings.updateAdmin')); ?>">
		<input type="hidden" name="requesttoken" value="<?php p($requestToken); ?>">
		<p>
			<label>
				<input type="checkbox" name="publicShareFeedbackEnabled" value="1" <?php if (!empty($_['publicShareFeedbackEnabled'])) { print_unescaped('checked'); } ?>>
				Enable feedback in public shares
			</label>
		</p>
		<p>
			<button class="button-primary" type="submit">Save</button>
		</p>
	</form>
</div>
