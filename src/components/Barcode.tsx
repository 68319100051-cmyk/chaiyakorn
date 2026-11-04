import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeProps {
  value: string;
  format?: 'CODE128' | 'CODE39' | 'EAN13';
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  margin?: number;
  className?: string;
}

export const Barcode: React.FC<BarcodeProps> = ({
  value,
  format = 'CODE128',
  width = 1.2,
  height = 26,
  displayValue = true,
  fontSize = 9,
  margin = 0,
  className = ''
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        // Strip non-alphanumeric chars if needed or use CODE128 auto
        const cleanValue = value.trim();
        JsBarcode(svgRef.current, cleanValue, {
          format,
          width,
          height,
          displayValue,
          fontSize,
          font: 'monospace',
          textMargin: 1,
          margin,
          background: 'transparent',
          lineColor: '#000000'
        });
      } catch (err) {
        console.warn('JsBarcode error rendering value:', value, err);
      }
    }
  }, [value, format, width, height, displayValue, fontSize, margin]);

  if (!value) return null;

  return <svg ref={svgRef} className={className} />;
};
