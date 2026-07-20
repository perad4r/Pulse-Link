<?php

namespace App\Services\Admin;

use App\Models\User;
use Illuminate\Http\Request;

class AdminUserResolver
{
    public function resolve(Request $request): User
    {
        $authenticatedUser = $request->user();

        abort_unless($authenticatedUser, 401, 'Unauthenticated.');
        abort_unless(
            in_array($authenticatedUser->role, ['system_admin', 'hospital_staff'], true),
            403,
            'Quyền truy cập bị từ chối.'
        );

        return $authenticatedUser;
    }

    public function canAccessHospital(User $admin, ?int $hospitalId): bool
    {
        if ($admin->role === 'system_admin') {
            return true;
        }

        return $hospitalId !== null && (int) $admin->hospital_id === (int) $hospitalId;
    }

    public function hasPermission(User $admin, string $permission): bool
    {
        if ($admin->role === 'system_admin') {
            return true;
        }

        return in_array($permission, $admin->permissions ?? [], true);
    }
}
