<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next, string $role): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        if ($role === 'donor' && $user->role !== 'donor') {
            return response()->json(['message' => 'Quyền truy cập bị từ chối.'], 403);
        }

        if ($role === 'admin' && ! in_array($user->role, ['system_admin', 'hospital_staff'], true)) {
            return response()->json(['message' => 'Quyền truy cập bị từ chối.'], 403);
        }

        $legacyHints = match ($role) {
            'donor' => array_values(array_filter([
                $request->has('user_id') ? 'user_id' : null,
                $request->has('donor_id') ? 'donor_id' : null,
            ])),
            'admin' => array_values(array_filter([
                $request->has('admin_user_id') ? 'admin_user_id' : null,
                $request->hasHeader('X-Admin-User-Id') ? 'X-Admin-User-Id' : null,
            ])),
            default => [],
        };

        if ($legacyHints !== []) {
            Log::notice('Deprecated identity hints were ignored.', [
                'path' => $request->path(),
                'method' => $request->method(),
                'hints' => $legacyHints,
            ]);
        }

        return $next($request);
    }
}
