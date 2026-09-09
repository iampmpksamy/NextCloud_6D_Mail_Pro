<?php

declare(strict_types=1);

// SPDX-FileCopyrightText: 2026 IAMPMPKSAMY
// SPDX-License-Identifier: AGPL-3.0-or-later
namespace OCA\SixdMailPro\Controller;

use OCA\SixdMailPro\AppInfo\Application;
use OCA\SixdMailPro\Service\MailCompatibility;
use OCP\AppFramework\Controller;
use OCP\AppFramework\Http\Attribute\NoAdminRequired;
use OCP\AppFramework\Http\Attribute\NoCSRFRequired;
use OCP\AppFramework\Http\TemplateResponse;
use OCP\IRequest;
use OCP\IURLGenerator;

final class PageController extends Controller {
    public function __construct(
        IRequest $request,
        private IURLGenerator $urlGenerator,
        private MailCompatibility $compatibility,
    ) {
        parent::__construct(Application::APP_ID, $request);
    }

    // This authenticated GET renders no mailbox data and performs no writes.
    #[NoAdminRequired]
    #[NoCSRFRequired]
    public function index(): TemplateResponse {
        $state = $this->compatibility->inspect();
        return new TemplateResponse(Application::APP_ID, 'index', [
            'status' => $state['status'],
            'mailUrl' => $state['available'] ? $this->urlGenerator->linkToRoute('mail.page.index') : null,
        ]);
    }
}
