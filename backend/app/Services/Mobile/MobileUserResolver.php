<?php

namespace App\Services\Mobile;

use App\Models\User;

class MobileUserResolver
{
    /**
     * Resolve the authenticated donor.
     *
     * The optional argument is intentionally ignored so deployed clients that
     * still send legacy identity hints remain wire-compatible.
     */
    public function resolve(mixed $legacyIdentityHint = null): User
    {
        $authenticatedUser = request()->user();

        abort_unless($authenticatedUser, 401, 'Unauthenticated.');
        abort_unless($authenticatedUser->role === 'donor', 403, 'Quyền truy cập bị từ chối.');

        return $authenticatedUser;
    }
}
