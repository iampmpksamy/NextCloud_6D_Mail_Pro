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
use OCP\IConfig;
use OCP\IURLGenerator;

final class PageController extends Controller {
    public function __construct(
        IRequest $request,
        private IURLGenerator $urlGenerator,
        private MailCompatibility $compatibility,
        private IConfig $config,
    ) {
        parent::__construct(Application::APP_ID, $request);
    }

    // This authenticated GET renders no mailbox data and performs no writes.
    #[NoAdminRequired]
    #[NoCSRFRequired]
    public function index(): TemplateResponse {
        $state = $this->compatibility->inspect();
        $requested = $this->config->getAppValue(Application::APP_ID, 'data_provider', 'synthetic');
        $provider = $requested === 'ocs' ? ($state['status'] === 'inspected' ? 'ocs' : 'unavailable') : 'synthetic';
        return new TemplateResponse(Application::APP_ID, 'index', [
            'status' => $state['status'],
            'provider' => $provider,
            'ocsAccounts' => $provider === 'ocs' ? $this->ocsPath('mail.accountApi.list') : '',
            'ocsMailboxes' => $provider === 'ocs' ? $this->ocsPath('mail.mailboxesApi.list') : '',
            'ocsMessages' => $provider === 'ocs' ? $this->ocsPath('mail.mailboxesApi.listMessages', ['mailboxId' => '__mailbox__']) : '',
            'nativeMessageUrl' => $provider === 'ocs' ? $this->urlGenerator->linkToRoute('mail.page.thread', ['mailboxId' => '__mailbox__', 'id' => '__message__']) : '',
            'nativeFolderUrl' => $provider === 'ocs' ? $this->urlGenerator->linkToRoute('mail.page.mailbox', ['id' => '__mailbox__']) : '',
            'mailUrl' => $state['available'] ? $this->urlGenerator->linkToRoute('mail.page.index') : null,
        ]);
    }

    private function ocsPath(string $route, array $arguments = []): string {
        // OCP exposes an absolute OCS helper. Keep its generated deployment path
        // while resolving requests against the user's current browser origin.
        $parts = parse_url($this->urlGenerator->linkToOCSRouteAbsolute($route, $arguments));
        $path = $parts['path'] ?? '';
        if (!str_starts_with($path, '/') || str_starts_with($path, '//')) {
            throw new \UnexpectedValueException('Mail route is unavailable.');
        }
        return $path . (isset($parts['query']) ? '?' . $parts['query'] : '');
    }
}
