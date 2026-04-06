<?php

declare(strict_types=1);

return [
	'routes' => [
		[
			'name' => 'page#index',
			'url' => '/',
			'verb' => 'GET',
		],
		[
			'name' => 'comments#list',
			'url' => '/api/comments/{fileId}',
			'verb' => 'GET',
		],
		[
			'name' => 'comments#create',
			'url' => '/api/comments',
			'verb' => 'POST',
		],
		[
			'name' => 'comments#updateStatus',
			'url' => '/api/comments/{commentId}/status',
			'verb' => 'PUT',
		],
		[
			'name' => 'comments#update',
			'url' => '/api/comments/{commentId}',
			'verb' => 'PUT',
		],
		[
			'name' => 'comments#delete',
			'url' => '/api/comments/{commentId}',
			'verb' => 'DELETE',
		],
		[
			'name' => 'comments#updatePublicShareAutoOpen',
			'url' => '/api/files/{fileId}/public-share-auto-open',
			'verb' => 'PUT',
		],
		[
			'name' => 'publicComments#list',
			'url' => '/public/comments/{token}',
			'verb' => 'GET',
		],
		[
			'name' => 'publicComments#create',
			'url' => '/public/comments/{token}',
			'verb' => 'POST',
		],
		[
			'name' => 'publicComments#updateStatus',
			'url' => '/public/comments/{token}/{commentId}/status',
			'verb' => 'PUT',
		],
		[
			'name' => 'publicComments#update',
			'url' => '/public/comments/{token}/{commentId}',
			'verb' => 'PUT',
		],
		[
			'name' => 'publicComments#delete',
			'url' => '/public/comments/{token}/{commentId}',
			'verb' => 'DELETE',
		],
		[
			'name' => 'publicConfig#show',
			'url' => '/public/config/{token}',
			'verb' => 'GET',
		],
		[
			'name' => 'settings#updatePersonal',
			'url' => '/settings/personal',
			'verb' => 'POST',
		],
		[
			'name' => 'settings#updateAdmin',
			'url' => '/settings/admin',
			'verb' => 'POST',
		],
	],
];
