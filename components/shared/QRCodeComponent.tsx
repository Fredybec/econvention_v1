import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

export const QRCodeComponent = ({ value }: { value: string }) => {
  return (
    <div className="w-[60px] h-[60px] flex items-center justify-center">
      <QRCodeSVG 
        value={value} 
        size={256} 
        level="H"
        includeMargin={false}
        className="w-full h-full"
      />
    </div>
  );
};
