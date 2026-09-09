<?php

declare(strict_types=1);

function p(string $value): void { echo htmlspecialchars($value, ENT_QUOTES, 'UTF-8'); }
function style(string $app, string $name): void {}
function script(string $app, array $names): void {}
$l = new class { public function t(string $value): string { return $value; } };
foreach (['inspected', 'unverified', 'unavailable', 'unknown'] as $status) {
    $_ = ['status' => $status, 'mailUrl' => in_array($status, ['inspected', 'unverified'], true)
        ? '/index.php/apps/mail/?test="<script>bad</script>' : null];
    ob_start();
    require __DIR__ . '/../templates/index.php';
    $html = ob_get_clean();
    if (str_contains($html, '<script>')) {
        throw new RuntimeException('URL was not escaped');
    }
    if (str_contains($html, 'href=') !== ($_['mailUrl'] !== null)) {
        throw new RuntimeException('Incorrect fallback link visibility');
    }
}
echo "4 template fallback and escaping cases passed\n";
