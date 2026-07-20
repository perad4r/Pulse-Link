<?php

namespace Tests\Feature;

use App\Models\EmergencyAlert;
use App\Models\Hospital;
use App\Models\NotificationPreference;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class IdentityImpersonationProtectionTest extends TestCase
{
    use RefreshDatabase;

    public function test_legacy_identity_hints_cannot_authenticate_anonymous_requests(): void
    {
        $donor = User::factory()->create(['role' => 'donor']);
        $admin = User::factory()->create(['role' => 'system_admin']);

        $this->getJson("/api/mobile/me/hero-pass?user_id={$donor->id}")
            ->assertUnauthorized();

        $this->withHeader('X-Admin-User-Id', (string) $admin->id)
            ->getJson('/api/admin/dashboard')
            ->assertUnauthorized();

        $this->getJson("/api/admin/dashboard?admin_user_id={$admin->id}")
            ->assertUnauthorized();
    }

    public function test_donor_token_cannot_read_or_write_as_another_donor(): void
    {
        $donorA = User::factory()->create(['role' => 'donor']);
        $donorB = User::factory()->create(['role' => 'donor']);
        Sanctum::actingAs($donorA);

        $this->putJson("/api/mobile/me/notification-preferences?user_id={$donorB->id}", [
            'care_enabled' => false,
        ])
            ->assertOk()
            ->assertJsonPath('data.care_enabled', false);

        $this->assertDatabaseHas('notification_preferences', [
            'user_id' => $donorA->id,
            'care_enabled' => false,
        ]);
        $this->assertFalse(NotificationPreference::query()->where('user_id', $donorB->id)->exists());
    }

    public function test_sos_donor_id_hint_is_ignored_in_favor_of_token_owner(): void
    {
        $hospital = Hospital::query()->create([
            'name' => 'Bệnh viện kiểm thử',
            'code' => 'SECURITY-01',
            'address' => 'Hà Nội',
            'province_code' => '79',
            'ward_code' => '27301',
            'latitude' => 21.0285,
            'longitude' => 105.8542,
            'is_active' => true,
        ]);
        $donorA = User::factory()->create(['role' => 'donor', 'blood_type' => 'O+']);
        $donorB = User::factory()->create(['role' => 'donor', 'blood_type' => 'O+']);
        $alert = EmergencyAlert::query()->create([
            'public_id' => (string) Str::uuid(),
            'hospital_id' => $hospital->id,
            'required_blood_type' => 'O+',
            'compatibility_mode' => 'exact',
            'level' => 'level1',
            'units_needed' => 2,
            'status' => 'active',
            'message' => 'Kiểm thử bảo vệ danh tính SOS.',
            'expires_at' => now()->addHour(),
        ]);
        Sanctum::actingAs($donorA);

        $this->postJson("/api/mobile/sos-alerts/{$alert->public_id}/commit", [
            'donor_id' => $donorB->id,
            'eta_minutes' => 10,
        ])->assertOk();

        $this->assertDatabaseHas('emergency_commitments', [
            'emergency_alert_id' => $alert->id,
            'donor_id' => $donorA->id,
        ]);
        $this->assertDatabaseMissing('emergency_commitments', [
            'emergency_alert_id' => $alert->id,
            'donor_id' => $donorB->id,
        ]);
    }

    public function test_admin_identity_header_cannot_escalate_hospital_staff(): void
    {
        $systemAdmin = User::factory()->create(['role' => 'system_admin']);
        $staff = User::factory()->create(['role' => 'hospital_staff']);
        Sanctum::actingAs($staff);

        $this->withHeader('X-Admin-User-Id', (string) $systemAdmin->id)
            ->getJson("/api/admin/settings?admin_user_id={$systemAdmin->id}")
            ->assertForbidden();
    }

    public function test_authenticated_users_cannot_cross_mobile_and_admin_role_boundaries(): void
    {
        $donor = User::factory()->create(['role' => 'donor']);
        $admin = User::factory()->create(['role' => 'system_admin']);

        Sanctum::actingAs($donor);
        $this->getJson('/api/admin/dashboard')->assertForbidden();

        Sanctum::actingAs($admin);
        $this->getJson('/api/mobile/me/hero-pass')->assertForbidden();
        $this->deleteJson('/api/mobile/me/account', [
            'password' => 'password',
        ])->assertForbidden();
    }
}
