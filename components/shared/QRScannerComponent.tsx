import React from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';

export const QRScannerComponent = ({ onScanSuccess }: { onScanSuccess: (decodedText: string) => void }) => {
  return (
    <div className="w-full max-w-sm rounded-2xl overflow-hidden relative min-h-[300px]">
      <Scanner
        onScan={(detectedCodes) => {
          if (detectedCodes.length > 0) {
            onScanSuccess(detectedCodes[0].rawValue);
          }
        }}
        onError={(error) => {
          console.error("Scanner Error:", error);
        }}
        styles={{
          container: {
            width: '100%',
            height: '100%',
            minHeight: '300px'
          }
        }}
        components={{
          torch: true,
        }}
        allowMultiple={false}
        scanDelay={500}
      />
    </div>
  );
};
