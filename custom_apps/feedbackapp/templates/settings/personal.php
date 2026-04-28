<?php
declare(strict_types=1);

/** @var array<string, mixed> $_ */

$requestToken = (string) ($_['requesttoken'] ?? \OC::$server->getCsrfTokenManager()->getToken()->getEncryptedValue());
?>

<div class="section">
	<h2>Feedback App</h2>
	<p>Configure your default behavior for public-share reviews.</p>

	<form method="post" action="<?php p(\OC::$server->getURLGenerator()->linkToRoute('feedbackapp.settings.updatePersonal')); ?>">
		<input type="hidden" name="requesttoken" value="<?php p($requestToken); ?>">
		<p>
			<label>
				<input type="checkbox" name="autoOpenPublicShareSidebar" value="1" <?php if (!empty($_['autoOpenPublicShareSidebar'])) { print_unescaped('checked'); } ?>>
				Open feedbackpanel in public shares
			</label>
		</p>
		<p>
			<button class="button-primary" type="submit">Save</button>
		</p>
	</form>
</div>
