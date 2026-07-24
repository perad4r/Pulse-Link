import 'dart:async';

import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';

class LaunchIntroScreen extends StatefulWidget {
  const LaunchIntroScreen({
    super.key,
    required this.onFinished,
  });

  final VoidCallback onFinished;

  @override
  State<LaunchIntroScreen> createState() => _LaunchIntroScreenState();
}

class _LaunchIntroScreenState extends State<LaunchIntroScreen> {
  static const _assetPath = 'assets/video/pulse_link_launch_intro.mp4';
  static const _playbackDuration = Duration(seconds: 2);
  static const _fallbackDuration = Duration(milliseconds: 1200);

  late final VideoPlayerController _videoController;
  Timer? _finishTimer;
  bool _videoReady = false;
  bool _finished = false;

  @override
  void initState() {
    super.initState();
    _videoController = VideoPlayerController.asset(
      _assetPath,
      videoPlayerOptions: VideoPlayerOptions(mixWithOthers: true),
    );
    unawaited(_prepareVideo());
  }

  Future<void> _prepareVideo() async {
    try {
      await _videoController.initialize();
      await _videoController.setVolume(0);
      await _videoController.setLooping(false);
      await _videoController.seekTo(Duration.zero);
      if (!mounted) return;

      setState(() => _videoReady = true);
      await _videoController.play();
      _finishTimer = Timer(_playbackDuration, _finish);
    } catch (_) {
      if (!mounted) return;
      _finishTimer = Timer(_fallbackDuration, _finish);
    }
  }

  void _finish() {
    if (_finished || !mounted) return;
    _finished = true;
    widget.onFinished();
  }

  @override
  void dispose() {
    _finishTimer?.cancel();
    _videoController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF4F3F1),
      body: Stack(
        fit: StackFit.expand,
        children: [
          if (_videoReady)
            FittedBox(
              fit: BoxFit.cover,
              child: SizedBox(
                width: _videoController.value.size.width,
                height: _videoController.value.size.height,
                child: VideoPlayer(_videoController),
              ),
            )
          else
            Center(
              child: Image.asset(
                'assets/images/pulse_link_logo.png',
                width: 220,
                fit: BoxFit.contain,
              ),
            ),
        ],
      ),
    );
  }
}
