<?php

declare(strict_types=1);

// SPDX-FileCopyrightText: 2026 IAMPMPKSAMY
// SPDX-License-Identifier: AGPL-3.0-or-later
namespace OCA\SixdMailPro\Service;

use OCP\App\IAppManager;
use Throwable;

final class MailCompatibility {
    // Source inspected; this is not a runtime compatibility certification.
    public const INSPECTED_VERSION = '5.11.5';

    public function __construct(private IAppManager $appManager) {
    }

    /** @return array{status: string, available: bool} */
    public function inspect(): array {
        try {
            if (!$this->appManager->isEnabledForUser('mail')) {
                return ['status' => 'unavailable', 'available' => false];
            }

            return [
                'status' => $this->appManager->getAppVersion('mail') === self::INSPECTED_VERSION
                    ? 'inspected' : 'unverified',
                'available' => true,
            ];
        } catch (Throwable) {
            // Fail closed without collecting sensitive exception context.
            return ['status' => 'unknown', 'available' => false];
        }
    }
}
