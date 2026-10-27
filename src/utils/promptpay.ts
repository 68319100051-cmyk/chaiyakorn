import QRCode from 'qrcode';

/**
 * Standard EMVCo Tag-Length-Value formatter
 */
function formatTag(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

/**
 * Standard CRC16-CCITT (False) checksum generator for EMVCo QR code
 * Polynomial: 0x1021, Initial value: 0xFFFF
 */
export function crc16(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= (data.charCodeAt(i) << 8);
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Generates official Thai PromptPay EMVCo QR Payload string
 * Compatible with all Thai Mobile Banking apps (K PLUS, SCB EASY, Krungthai NEXT, Bangkok Bank, etc.)
 *
 * @param target Mobile number (e.g. "083-426-8058") or Tax/National ID (13 digits)
 * @param amount Optional payment amount in THB (e.g. 450.00)
 */
export function generatePromptPayPayload(target: string, amount?: number): string {
  const cleanTarget = (target || '').replace(/[^0-9]/g, '');

  let targetType = '01'; // '01' = mobile, '02' = tax/citizen ID, '03' = e-wallet
  let formattedTarget = cleanTarget;

  if (cleanTarget.length === 10) {
    targetType = '01';
    // Mobile phone number: replace leading 0 with 0066
    formattedTarget = `0066${cleanTarget.substring(1)}`;
  } else if (cleanTarget.length === 9) {
    targetType = '01';
    formattedTarget = `0066${cleanTarget}`;
  } else if (cleanTarget.length === 13) {
    targetType = '02';
    formattedTarget = cleanTarget;
  } else if (cleanTarget.length === 15) {
    targetType = '03';
    formattedTarget = cleanTarget;
  } else {
    // Fallback if none matched
    targetType = '01';
    formattedTarget = `0066${cleanTarget.replace(/^0+/, '')}`;
  }

  // Tag 29: Merchant Account Information (PromptPay)
  // Sub-tag 00: AID = A000000677010111
  // Sub-tag 01 (mobile) or 02 (tax id): formatted Target
  const aid = formatTag('00', 'A000000677010111');
  const merchantTarget = formatTag(targetType, formattedTarget);
  const tag29 = formatTag('29', aid + merchantTarget);

  // Tag 00: Payload Format Indicator (01)
  const tag00 = formatTag('00', '01');

  // Tag 01: Point of Initiation Method: 11 = static, 12 = dynamic (with amount)
  const hasAmount = typeof amount === 'number' && amount > 0;
  const tag01 = formatTag('01', hasAmount ? '12' : '11');

  // Tag 53: Transaction Currency (764 = THB)
  const tag53 = formatTag('53', '764');

  // Tag 54: Transaction Amount (formatted to 2 decimal places)
  const tag54 = hasAmount ? formatTag('54', amount.toFixed(2)) : '';

  // Tag 58: Country Code (TH)
  const tag58 = formatTag('58', 'TH');

  // Tag 63: CRC Checksum prefix
  const rawPayload = `${tag00}${tag01}${tag29}${tag53}${tag54}${tag58}6304`;
  const checksum = crc16(rawPayload);

  return `${rawPayload}${checksum}`;
}

/**
 * Generates Data URL image (PNG) for PromptPay QR code
 */
export async function generatePromptPayQRDataUrl(
  target: string,
  amount?: number,
  options?: { width?: number; margin?: number }
): Promise<string> {
  const payload = generatePromptPayPayload(target, amount);
  return QRCode.toDataURL(payload, {
    width: options?.width || 220,
    margin: options?.margin ?? 1,
    color: {
      dark: '#002d62', // Classic PromptPay dark navy blue
      light: '#ffffff'
    },
    errorCorrectionLevel: 'M'
  });
}
