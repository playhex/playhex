<?php

/**
 * Dev only: prefills the login form with the docker compose mysql credentials.
 */
return new class extends \Adminer\Plugin {
	public function loginFormField($name, $heading, $value) {
		$prefill = [
			'server' => getenv('ADMINER_PREFILL_SERVER'),
			'username' => getenv('ADMINER_PREFILL_USERNAME'),
			'password' => getenv('ADMINER_PREFILL_PASSWORD'),
			'db' => getenv('ADMINER_PREFILL_DB'),
		];

		if (!isset($prefill[$name])) {
			return null;
		}

		$value = preg_replace('/ value=(["\'])[^"\']*\1/', '', $value);

		return $heading . str_replace("name=", "value='" . \Adminer\h($prefill[$name]) . "' name=", $value) . "\n";
	}
};
