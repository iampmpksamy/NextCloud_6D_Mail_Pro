<?php
// Local synthetic browser fixture only. Not included in the runtime package.
declare(strict_types=1);
function p(string $value): void { echo htmlspecialchars($value, ENT_QUOTES, 'UTF-8'); }
function style(string $app, string $name): void { echo '<link rel="stylesheet" href="../css/workspace.css">'; }
function script(string $app, array $names): void {
    foreach ($names as $name) echo '<script defer src="../js/' . htmlspecialchars($name, ENT_QUOTES) . '.js"></script>';
}
$l = new class { public function t(string $value): string { return $value; } };
$_ = ['status' => 'inspected', 'mailUrl' => '/index.php/apps/mail/'];
?>
<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>6D Mail Pro · synthetic preview</title>
<style>
body { margin:0; font-family:system-ui,sans-serif; }
:root { --color-main-text:#202b3c; --color-main-background:#fff; --color-background-hover:#f1f5f9; --color-border:#d9e0e8; --color-primary-element:#00679e; --color-primary-element-text:#fff; }
<?php if (isset($_GET['dark'])): ?>
:root { color-scheme:dark; --color-main-text:#e6edf5; --color-main-background:#18212d; --color-background-hover:#222e3d; --color-border:#455569; --color-primary-element:#8acbff; --color-primary-element-text:#142335; }
<?php endif; ?>
</style></head><body>
<?php require __DIR__ . '/../templates/index.php'; ?>
<?php if (isset($_GET['test'])): ?><script defer src="browser-checks.js"></script><?php endif; ?>
</body></html>
