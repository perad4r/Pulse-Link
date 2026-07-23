import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:pulse_link/app/pulse_link_controller.dart';
import 'package:pulse_link/core/location/geo_point.dart';
import 'package:pulse_link/features/daily/domain/blood_journey.dart';
import 'package:pulse_link/features/daily/domain/past_donation.dart';
import 'package:pulse_link/features/emergency/domain/emergency_alert.dart';
import 'package:pulse_link/features/emergency/domain/emergency_commitment.dart';
import 'package:pulse_link/features/emergency/domain/emergency_mission_resume.dart';
import 'package:pulse_link/features/gratitude/domain/gratitude_letter.dart';
import 'package:pulse_link/features/notifications/domain/mobile_notification.dart';
import 'package:pulse_link/features/profile/domain/donor_profile.dart';
import 'package:pulse_link/infrastructure/mock/mock_data.dart';
import 'package:pulse_link/infrastructure/mock/mock_emergency_services.dart';
import 'package:pulse_link/infrastructure/mock/mock_repositories.dart';
import 'package:pulse_link/services/donation_history_repository.dart';
import 'package:pulse_link/services/emergency_signal_service.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  test(
    'realtime journey updates history without repeating the donation letter',
    () async {
      SharedPreferences.setMockInitialValues({'auth_token': 'test-token'});
      final initialJourney = _journey('received');
      final historyRepository = _HistoryRepository([
        PastDonation(
          id: 'history-1',
          donatedAt: DateTime(2026, 7, 20),
          locationName: 'Bệnh viện Chợ Rẫy',
          volumeMl: 350,
          bloodType: 'O+',
          certificateId: 'SOS-TEST-1',
          status: DonationVerificationStatus.verified,
          donationType: DonationType.sos,
          bloodJourney: initialJourney,
        ),
      ]);
      final signalService = _RealtimeEmergencySignalService();
      final controller = PulseLinkController(
        donorRepository: MockDonorRepository(),
        eventRepository: MockDonationEventRepository(),
        historyRepository: historyRepository,
        communityPostRepository: MockCommunityPostRepository(),
        emergencySignalService: signalService,
        locationService: MockLocationService(),
        routePlannerService: MockRoutePlannerService(),
        audioService: MockEmergencyAudioService(),
        chatService: MockChatService(),
        donationFundService: MockDonationFundService(),
        communityImpactService: MockCommunityImpactService(),
      );
      addTearDown(() async {
        controller.dispose();
        await signalService.dispose();
      });

      await controller.initialize();
      final alert = MockData.emergencyAlert();
      signalService.emitAlert(alert);
      await _waitUntil(() => controller.state.activeAlert?.id == alert.id);
      await controller.commitToEmergency();

      signalService.emitCommitment(
        _commitment(initialJourney, alertId: alert.id),
      );
      await _waitUntil(() => controller.state.activeGratitudeLetter != null);
      expect(
        controller.state.activeGratitudeLetter!.source,
        GratitudeLetterSource.sosPulseLink,
      );

      controller.clearActiveGratitudeLetter();
      final qualityCheckJourney = _journey('quality_check');
      signalService.emitCommitment(
        _commitment(qualityCheckJourney, alertId: alert.id),
      );
      await _waitUntil(
        () =>
            controller.state.donationHistory.first.bloodJourney?.currentStep ==
            'quality_check',
      );
      expect(controller.state.activeGratitudeLetter, isNull);

      final completedJourney = _journey(
        'transfused',
        completedAt: DateTime(2026, 7, 20, 16, 30),
      );
      signalService.emitCommitment(
        _commitment(completedJourney, alertId: alert.id),
      );
      await _waitUntil(() => controller.state.activeGratitudeLetter != null);
      expect(
        controller.state.activeGratitudeLetter!.source,
        GratitudeLetterSource.sosPatient,
      );
      expect(
        controller.state.donationHistory.first.bloodJourney?.currentStep,
        'transfused',
      );

      controller.clearActiveGratitudeLetter();
      signalService.emitCommitment(
        _commitment(completedJourney, alertId: alert.id),
      );
      await Future<void>.delayed(const Duration(milliseconds: 50));
      expect(controller.state.activeGratitudeLetter, isNull);

      signalService.emitNotification(
        MobileNotification(
          id: 'journey-completed-1',
          type: 'blood_journey_completed',
          title: 'Hành trình giọt máu đã hoàn tất',
          body: completedJourney.finalMessage!,
          payload: {
            'blood_journey_id': completedJourney.id,
            'destination_type': 'patient',
          },
          createdAt: DateTime(2026, 7, 20, 16, 30),
        ),
      );
      await Future<void>.delayed(const Duration(milliseconds: 50));
      expect(controller.state.activeGratitudeLetter, isNull);
    },
  );
}

EmergencyCommitment _commitment(
  BloodJourney journey, {
  required String alertId,
}) {
  return EmergencyCommitment(
    id: 'commitment-1',
    alertId: alertId,
    status: EmergencyCommitmentStatus.donated,
    donationVolumeMl: 350,
    donatedAt: DateTime(2026, 7, 20, 14),
    donationHistoryId: 'history-1',
    bloodJourney: journey,
  );
}

BloodJourney _journey(String currentStep, {DateTime? completedAt}) {
  const stepDefinitions = [
    ('received', 'Đã tiếp nhận'),
    ('quality_check', 'Đang kiểm tra chất lượng'),
    ('emergency_transport', 'Đang vận chuyển cấp cứu'),
    ('transfused', 'Đã truyền cho bệnh nhân thành công'),
  ];
  final currentIndex = stepDefinitions.indexWhere(
    (step) => step.$1 == currentStep,
  );

  return BloodJourney(
    id: 'journey-1',
    destinationType: 'patient',
    currentStep: currentStep,
    publishedAt: DateTime(2026, 7, 20, 14, 5),
    completedAt: completedAt,
    pulseLinkMessage:
        'PulseLink cảm ơn bạn đã có mặt đúng lúc cho một ca cấp cứu.',
    finalMessage:
        'Gia đình chúng tôi xin gửi lời cảm ơn chân thành đến bạn. Nghĩa cử của bạn đã trao thêm hy vọng và thời gian quý giá cho người thân của chúng tôi trong lúc cấp bách nhất.',
    steps: [
      for (var index = 0; index < stepDefinitions.length; index++)
        BloodJourneyStep(
          key: stepDefinitions[index].$1,
          label: stepDefinitions[index].$2,
          completed: index <= currentIndex,
          occurredAt: index <= currentIndex
              ? DateTime(2026, 7, 20, 14).add(Duration(minutes: index * 20))
              : null,
        ),
    ],
  );
}

class _HistoryRepository implements DonationHistoryRepository {
  _HistoryRepository(this.history);

  final List<PastDonation> history;

  @override
  Future<List<PastDonation>> getDonationHistory() async =>
      List<PastDonation>.unmodifiable(history);

  @override
  Future<PastDonation> addDonation(PastDonationDraft draft) {
    throw UnimplementedError();
  }
}

class _RealtimeEmergencySignalService implements EmergencySignalService {
  final _alerts = StreamController<EmergencyAlert>.broadcast();
  final _commitments = StreamController<EmergencyCommitment>.broadcast();
  final _notifications = StreamController<MobileNotification>.broadcast();

  void emitAlert(EmergencyAlert alert) => _alerts.add(alert);

  void emitCommitment(EmergencyCommitment commitment) =>
      _commitments.add(commitment);

  void emitNotification(MobileNotification notification) =>
      _notifications.add(notification);

  Future<void> dispose() async {
    await _alerts.close();
    await _commitments.close();
    await _notifications.close();
  }

  @override
  Stream<EmergencyAlert> watchAlerts({required DonorProfile profile}) =>
      _alerts.stream;

  @override
  Stream<EmergencyCommitment> watchCommitments({
    required DonorProfile profile,
  }) =>
      _commitments.stream;

  @override
  Stream<MobileNotification> watchNotifications({
    required DonorProfile profile,
  }) =>
      _notifications.stream;

  @override
  Future<EmergencyMissionResume?> fetchActiveCommitment({
    required DonorProfile profile,
  }) async =>
      null;

  @override
  Future<List<MobileNotification>> fetchNotifications({
    required DonorProfile profile,
  }) async =>
      const [];

  @override
  Future<void> markNotificationRead({
    required DonorProfile profile,
    required String notificationId,
  }) async {}

  @override
  Future<EmergencyCommitment> confirmCommitment({
    required String alertId,
    required String donorId,
    GeoPoint? location,
    int? etaMinutes,
  }) async {
    return EmergencyCommitment(
      id: 'commitment-1',
      alertId: alertId,
      status: EmergencyCommitmentStatus.committed,
      location: location,
      etaMinutes: etaMinutes,
      committedAt: DateTime(2026, 7, 20, 13, 55),
    );
  }

  @override
  Future<void> updateCommitmentLocation({
    required String alertId,
    required String donorId,
    required GeoPoint location,
    int? etaMinutes,
    EmergencyCommitmentStatus status = EmergencyCommitmentStatus.enRoute,
  }) async {}

  @override
  Future<EmergencyCommitment> cancelCommitment({
    required String alertId,
    required String donorId,
    required String reason,
  }) {
    throw UnimplementedError();
  }

  @override
  Future<void> emitDebugAlert() async {}
}

Future<void> _waitUntil(bool Function() condition) async {
  for (var attempt = 0; attempt < 100; attempt++) {
    if (condition()) return;
    await Future<void>.delayed(const Duration(milliseconds: 20));
  }
  fail('Timed out waiting for realtime state update.');
}
