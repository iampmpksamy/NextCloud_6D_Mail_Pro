<?php
// SPDX-FileCopyrightText: 2026 IAMPMPKSAMY
// SPDX-License-Identifier: AGPL-3.0-or-later
/** @var array $_ */
/** @var \OCP\IL10N $l */
style('sixd_mail_pro', 'workspace');
script('sixd_mail_pro', ['mail-provider', 'ocs-provider', 'workspace']);
?>
<div id="sixd-mail-pro" data-provider="<?php p($_['provider'] ?? 'synthetic'); ?>"
    data-ocs-accounts="<?php p($_['ocsAccounts'] ?? ''); ?>"
    data-ocs-mailboxes="<?php p($_['ocsMailboxes'] ?? ''); ?>"
    data-ocs-messages="<?php p($_['ocsMessages'] ?? ''); ?>"
    data-native-message-url="<?php p($_['nativeMessageUrl'] ?? ''); ?>"
    data-native-folder-url="<?php p($_['nativeFolderUrl'] ?? ''); ?>">
    <header class="sixd-header">
        <div><p class="sixd-eyebrow" data-ui="mode-label"><?php p($l->t('SYNTHETIC WORKSPACE · READ ONLY')); ?></p><h2>6D Mail Pro</h2></div>
        <p><?php p($l->t('A little clarity for everything in your inbox.')); ?></p>
    </header>
    <button type="button" class="sixd-nav-toggle" data-ui="nav-toggle" aria-controls="sixd-folders" aria-expanded="false" hidden><?php p($l->t('Accounts and folders')); ?></button>
    <div class="sixd-workspace">
        <nav id="sixd-folders" data-ui="sidebar" class="sixd-sidebar" aria-label="<?php p($l->t('Sample accounts and folders')); ?>">
            <h2><?php p($l->t('Your accounts')); ?></h2>
            <div data-ui="accounts"></div>
            <p data-ui="count-note" class="sixd-sidebar__note"><?php p($l->t('Demo data only. Counts describe synthetic folders, not your real mailbox.')); ?></p>
        </nav>
        <section class="sixd-list" aria-labelledby="sixd-folder-title">
            <header class="sixd-list__header">
                <h2 id="sixd-folder-title" data-ui="folder-title" tabindex="-1"><?php p($l->t('Inbox')); ?></h2>
                <div class="sixd-filters" role="group" aria-label="<?php p($l->t('Filter sample messages')); ?>">
                    <?php foreach (['all' => 'All', 'unread' => 'Unread', 'important' => 'Important', 'favorite' => 'Favorite'] as $key => $label): ?>
                        <button type="button" data-filter="<?php p($key); ?>" aria-pressed="<?php p($key === 'all' ? 'true' : 'false'); ?>"><?php p($l->t($label)); ?></button>
                    <?php endforeach; ?>
                </div>
                <p data-ui="list-caption" class="sixd-list__caption"><?php p($l->t('Newest first · Sample timestamps in UTC')); ?></p>
            </header>
            <div class="sixd-feedback">
                <p id="sixd-load-status" data-ui="status" role="status" aria-live="polite"><?php p($l->t('Loading sample messages…')); ?></p>
                <a data-ui="folder-handoff" class="sixd-folder-link" hidden target="_blank" rel="noopener noreferrer"><?php p($l->t('Open folder in Nextcloud Mail')); ?></a>
                <button type="button" data-ui="retry" hidden><?php p($l->t('Retry')); ?></button>
            </div>
            <ul class="sixd-messages" data-ui="messages" aria-describedby="sixd-load-status" aria-label="<?php p($l->t('Sample messages')); ?>" aria-busy="true"></ul>
            <nav class="sixd-pagination" aria-label="<?php p($l->t('Message pages')); ?>">
                <button type="button" data-ui="previous" disabled><?php p($l->t('Previous')); ?></button>
                <span data-ui="page" role="status" aria-live="polite">—</span>
                <button type="button" data-ui="next" disabled><?php p($l->t('Next')); ?></button>
            </nav>
        </section>
        <aside class="sixd-reading" aria-label="<?php p($l->t('Reading placeholder')); ?>">
            <div class="sixd-reading__content">
                <span class="sixd-reading__icon" aria-hidden="true">✉</span>
                <div aria-live="polite">
                    <p data-ui="selection-sender" class="sixd-eyebrow"></p>
                    <h2 data-ui="selection-title"><?php p($l->t('Select a message for its summary')); ?></h2>
                    <p data-ui="selection-note"><?php p($l->t('Choose a sample to preview its details. Message bodies stay private in Nextcloud Mail.')); ?></p>
                </div>
                <?php if ($_['mailUrl'] !== null): ?>
                    <a class="sixd-mail-link" href="<?php p($_['mailUrl']); ?>"><?php p($l->t('Open in Nextcloud Mail')); ?></a>
                    <p data-ui="handoff-note" class="sixd-hint"><?php p($l->t('Opens native Mail. Synthetic messages do not exist there.')); ?></p>
                <?php else: ?>
                    <p><?php p($l->t(($_['provider'] ?? 'synthetic') === 'unavailable' ? 'Native Mail is currently unavailable.' : 'Native Mail is currently unavailable. You can still explore this synthetic workspace.')); ?></p>
                <?php endif; ?>
                <?php if ($_['status'] === 'unverified'): ?>
                    <p class="sixd-hint"><?php p($l->t('Your Mail version has not been verified for integration.')); ?></p>
                <?php endif; ?>
            </div>
        </aside>
    </div>
    <noscript><p><?php p($l->t('Enable JavaScript to use the mail workspace.')); ?></p></noscript>
</div>
