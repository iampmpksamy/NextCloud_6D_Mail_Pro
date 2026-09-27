<?php

declare(strict_types=1);
// Controller contracts for generated prefixes and fail-closed version gating.
namespace OCP {
    interface IRequest {}
    interface IConfig { public function getAppValue($app, $key, $default = ''); }
    interface IURLGenerator {
        public function linkToRoute(string $route, array $args = []): string;
        public function linkToOCSRouteAbsolute(string $route, array $args = []): string;
    }
}
namespace OCP\AppFramework {
    class Controller { public function __construct($id, $request) {} }
}
namespace OCP\AppFramework\Http {
    class TemplateResponse { public function __construct(public string $app, public string $template, public array $params) {} }
}
namespace OCA\SixdMailPro\AppInfo { class Application { public const APP_ID = 'sixd_mail_pro'; } }
namespace {
    require __DIR__ . '/compatibility.php';
    require __DIR__ . '/../lib/Controller/PageController.php';
    $config = new class implements \OCP\IConfig {
        public function getAppValue($app, $key, $default = '') { return 'ocs'; }
    };
    foreach (['', '/subdirectory'] as $base) {
        foreach (['', '/index.php'] as $front) {
            $urls = new class($base, $front) implements \OCP\IURLGenerator {
                public int $ocsCalls = 0;
                public function __construct(private string $base, private string $front) {}
                public function linkToRoute(string $route, array $args = []): string {
                    $suffix = match ($route) {
                        'mail.page.index' => '/',
                        'mail.page.mailbox' => '/box/' . $args['id'],
                        'mail.page.thread' => '/box/' . $args['mailboxId'] . '/thread/' . $args['id'],
                        default => throw new \RuntimeException('Unexpected route'),
                    };
                    return $this->base . $this->front . '/apps/mail' . $suffix;
                }
                public function linkToOCSRouteAbsolute(string $route, array $args = []): string {
                    $this->ocsCalls++;
                    $suffix = match ($route) {
                        'mail.accountApi.list' => 'account/list',
                        'mail.mailboxesApi.list' => 'ocs/mailboxes',
                        'mail.mailboxesApi.listMessages' => 'ocs/mailboxes/' . $args['mailboxId'] . '/messages',
                        default => throw new \RuntimeException('Unexpected OCS route'),
                    };
                    return 'https://configured.invalid' . $this->base . '/ocs/v2.php/apps/mail/' . $suffix . '?fixture=1';
                }
            };
            foreach ([[true, '5.11.5', 'ocs'], [true, '5.11.6', 'unavailable'], [false, '5.11.5', 'unavailable']] as [$enabled, $version, $mode]) {
                $urls->ocsCalls = 0;
                $controller = new \OCA\SixdMailPro\Controller\PageController(new class implements \OCP\IRequest {}, $urls, new \OCA\SixdMailPro\Service\MailCompatibility(new FakeApps($enabled, $version)), $config);
                $data = $controller->index()->params;
                if ($data['provider'] !== $mode || $urls->ocsCalls !== ($mode === 'ocs' ? 3 : 0)) throw new \RuntimeException('Version gate failed');
                if ($mode === 'ocs') {
                    if ($data['ocsAccounts'] !== $base . '/ocs/v2.php/apps/mail/account/list?fixture=1') throw new \RuntimeException('OCS path/query lost');
                    if ($data['nativeFolderUrl'] !== $base . $front . '/apps/mail/box/__mailbox__') throw new \RuntimeException('Folder prefix lost');
                    if ($data['nativeMessageUrl'] !== $base . $front . '/apps/mail/box/__mailbox__/thread/__message__') throw new \RuntimeException('Message prefix lost');
                }
            }
        }
    }
    echo "Controller: relative OCS path/query, subdirectory/index.php and unsupported/disabled version gates passed\n";
}
