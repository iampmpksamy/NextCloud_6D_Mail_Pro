<?php

declare(strict_types=1);

// Minimal test doubles, not a replacement for a Nextcloud integration test.
namespace OCP\App {
    interface IAppManager {
        public function isEnabledForUser($appId, $user = null);
        public function getAppVersion(string $appId, bool $useCache = true): string;
    }
}

namespace {
    require __DIR__ . '/../lib/Service/MailCompatibility.php';
    final class FakeApps implements \OCP\App\IAppManager {
        public int $versionReads = 0;
        public function __construct(public bool $enabled, public string $version, public bool $fail = false) {}
        public function isEnabledForUser($appId, $user = null) {
            if ($this->fail) {
                throw new \RuntimeException('Synthetic failure');
            }
            return $this->enabled;
        }
        public function getAppVersion(string $appId, bool $useCache = true): string {
            $this->versionReads++;
            return $this->version;
        }
    }
    foreach ([
        [false, '', false, 'unavailable', false],
        [false, '5.11.5', false, 'unavailable', false],
        [true, '5.11.5', false, 'inspected', true],
        [true, '5.11.6', false, 'unverified', true],
        [true, '6.0.0', false, 'unverified', true],
        [true, '5.11.5-dev', false, 'unverified', true],
        [true, '', false, 'unverified', true],
        [true, '5.11.5', true, 'unknown', false],
    ] as [$enabled, $version, $fail, $status, $available]) {
        $apps = new FakeApps($enabled, $version, $fail);
        $actual = (new \OCA\SixdMailPro\Service\MailCompatibility($apps))->inspect();
        if ($actual !== ['status' => $status, 'available' => $available]) {
            throw new \RuntimeException('Incorrect fallback for ' . $version);
        }
        if ((!$enabled || $fail) && $apps->versionReads !== 0) {
            throw new \RuntimeException('Unavailable Mail must not trigger version inspection');
        }
    }
    echo "8 availability and version fallback cases passed\n";
}
