import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, X, RefreshCw, VideoOff } from 'lucide-react';

export interface WebcamCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File, dataUrl: string) => void;
}

export const WebcamCapture: React.FC<WebcamCaptureProps> = ({
  isOpen,
  onClose,
  onCapture
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // Helper to stop all active video tracks
  const stopTracks = useCallback((mediaStream: MediaStream | null) => {
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore cleanup errors
        }
      });
    }
  }, []);

  // Enumerate available cameras
  const getCameraDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter((d) => d.kind === 'videoinput');
      setDevices(videoDevices);
    } catch {
      // ignore device enumeration errors
    }
  }, []);

  // Start webcam stream
  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Webcam access is not supported by your browser.');
      return;
    }

    setLoading(true);
    setError('');

    // Stop current stream before starting new one
    if (stream) {
      stopTracks(stream);
      setStream(null);
    }

    const constraints: MediaStreamConstraints = {
      video: selectedDeviceId
        ? { deviceId: { exact: selectedDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
        : { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    };

    try {
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }

      await getCameraDevices();
    } catch (err: any) {
      console.error('[WebcamCapture] Camera access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera permission denied. Please allow camera access in your browser settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('No camera device found on your computer or mobile device.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setError('Camera is currently in use by another application.');
      } else {
        setError(err.message || 'Unable to access camera.');
      }
    } finally {
      setLoading(false);
    }
  }, [selectedDeviceId, facingMode, stopTracks, getCameraDevices, stream]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      if (stream) {
        stopTracks(stream);
        setStream(null);
      }
      setError('');
    }

    return () => {
      if (stream) {
        stopTracks(stream);
      }
    };
  }, [isOpen]);

  // Handle Switch Camera
  const handleSwitchCamera = () => {
    if (devices.length > 1) {
      const currentIndex = devices.findIndex((d) => d.deviceId === selectedDeviceId);
      const nextIndex = (currentIndex + 1) % devices.length;
      setSelectedDeviceId(devices[nextIndex].deviceId);
    } else {
      setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
    }
  };

  // Capture Photo Frame
  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Flip horizontally if facing user for natural mirror image
    if (facingMode === 'user' && !selectedDeviceId) {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, width, height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `customer-photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
        // Stop stream
        if (stream) {
          stopTracks(stream);
          setStream(null);
        }
        onCapture(file, dataUrl);
        onClose();
      }
    }, 'image/jpeg', 0.92);
  };

  const handleClose = () => {
    if (stream) {
      stopTracks(stream);
      setStream(null);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          backgroundColor: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg, 12px)',
          boxShadow: 'var(--shadow-lg, 0 10px 25px rgba(0,0,0,0.3))',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid var(--border-light)'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--bg-surface-secondary)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Camera size={20} color="var(--color-primary-dark)" />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-dark)' }}>
              Webcam Photo Capture
            </h3>
          </div>

          <button
            type="button"
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: '4px',
              borderRadius: 'var(--radius-sm)'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Video Viewfinder */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '360px',
            backgroundColor: '#000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: facingMode === 'user' && !selectedDeviceId ? 'scaleX(-1)' : 'none'
            }}
          />

          {/* Hidden Canvas for Frame Capture */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {/* Loading Overlay */}
          {loading && (
            <div
              style={{
                position: 'absolute',
                color: '#fff',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <RefreshCw className="animate-spin" size={32} />
              <span style={{ fontSize: '13px', fontWeight: 600 }}>Starting Camera...</span>
            </div>
          )}

          {/* Error Message Display */}
          {error && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                color: '#f87171',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                gap: '12px'
              }}
            >
              <VideoOff size={44} color="#ef4444" />
              <div style={{ fontSize: '14px', fontWeight: 600 }}>{error}</div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={startCamera}
                style={{ marginTop: '8px', gap: '6px' }}
              >
                <RefreshCw size={14} />
                <span>Try Again</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            backgroundColor: 'var(--bg-card)'
          }}
        >
          <div style={{ display: 'flex', gap: '8px' }}>
            {(devices.length > 1 || true) && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleSwitchCamera}
                disabled={loading || !!error}
                style={{ gap: '6px', fontSize: '12px' }}
                title="Switch camera"
              >
                <RefreshCw size={14} />
                <span>Switch Camera</span>
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleClose}
              style={{ padding: '8px 16px', fontSize: '13px' }}
            >
              Cancel
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={handleCapture}
              disabled={loading || !!error || !stream}
              style={{
                padding: '8px 20px',
                fontSize: '13px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: 'var(--color-primary-accent)',
                color: '#fff'
              }}
            >
              <Camera size={16} />
              <span>Capture Photo</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
