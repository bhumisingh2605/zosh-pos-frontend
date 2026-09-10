import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { CameraOff } from 'lucide-react';
import Modal from '../../components/Modal';

const SCANNER_ELEMENT_ID = 'pos-barcode-scanner-viewport';

// Every 1D/2D format we reasonably expect on retail packaging. Restricting the
// format list (rather than leaving it default/unset) makes detection noticeably
// faster and less prone to misreads on a phone camera.
const FORMATS = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.QR_CODE,
];

/**
 * Camera-based barcode scanner for devices without a physical USB/BT scanner
 * (tablets, phones, laptops with a webcam). Complements the keyboard-wedge
 * listener in POS.jsx, which already handles hardware scanners.
 *
 * onDetected(code) is called once per successful decode; the caller is
 * responsible for closing the modal (typically right after adding to cart).
 */
export default function BarcodeScannerModal({ open, onClose, onDetected }) {
  const scannerRef = useRef(null);
  const startedRef = useRef(false);
  const [status, setStatus] = useState('starting'); // 'starting' | 'running' | 'error'
  const [errorMessage, setErrorMessage] = useState('');

  // The parent passes a fresh onDetected function on every render (it closes
  // over cart/products state). Keeping it in a ref — rather than the effect's
  // dependency array — means the camera only starts/stops when the modal
  // actually opens or closes, not on every keystroke elsewhere in the POS.
  const onDetectedRef = useRef(onDetected);
  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setStatus('starting');
    setErrorMessage('');

    const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID, {
      formatsToSupport: FORMATS,
      verbose: false,
    });
    scannerRef.current = scanner;

    const lastCodeRef = { current: '', at: 0 };

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 260, height: 160 } },
        (decodedText) => {
          // Debounce: a held-steady barcode fires the callback many times a
          // second otherwise, which would add the item to the cart repeatedly.
          const now = Date.now();
          if (decodedText === lastCodeRef.current && now - lastCodeRef.at < 2000) return;
          lastCodeRef.current = decodedText;
          lastCodeRef.at = now;
          onDetectedRef.current(decodedText.trim());
        },
        () => {
          // Per-frame "nothing decoded this frame" callback — expected constantly
          // while the camera is pointed at anything that isn't a code. Ignore.
        }
      )
      .then(() => {
        if (!cancelled) {
          startedRef.current = true;
          setStatus('running');
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus('error');
        setErrorMessage(
          err?.name === 'NotAllowedError'
            ? 'Camera access was denied. Allow camera access in your browser settings and try again.'
            : 'Could not start the camera. Make sure no other app is using it.'
        );
      });

    return () => {
      cancelled = true;
      if (startedRef.current) {
        scanner.stop().then(() => scanner.clear()).catch(() => {});
      } else {
        scanner.clear().catch(() => {});
      }
      startedRef.current = false;
      scannerRef.current = null;
    };
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} title="Scan a barcode" width="max-w-sm">
      <div className="space-y-3">
        <div className="relative overflow-hidden rounded-sm border border-hairline bg-ink">
          <div id={SCANNER_ELEMENT_ID} className="w-full [&_video]:w-full [&_video]:rounded-sm" />
          {status === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-ink/95 p-4 text-center">
              <CameraOff size={22} className="text-paper/40" />
              <p className="text-xs text-paper/70">{errorMessage}</p>
            </div>
          )}
        </div>
        <p className="text-center text-xs text-ink-text-muted">
          {status === 'starting' && 'Starting camera…'}
          {status === 'running' && 'Point the camera at a barcode or QR code.'}
          {status === 'error' && 'You can still search or use a USB scanner instead.'}
        </p>
      </div>
    </Modal>
  );
}