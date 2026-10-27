/**
 * Convert number to Thai Baht Text format
 * Example: 12500 -> "หนึ่งหมื่นสองพันห้าร้อยบาทถ้วน"
 * Example: 450.50 -> "สี่ร้อยห้าสิบบาทห้าสิบสตางค์"
 */

const THAI_NUMBERS = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
const THAI_UNITS = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

function convertUnderMillion(numStr: string): string {
  let result = '';
  const len = numStr.length;

  for (let i = 0; i < len; i++) {
    const digit = parseInt(numStr.charAt(i), 10);
    const pos = len - i - 1;

    if (digit !== 0) {
      if (pos === 0 && digit === 1 && len > 1) {
        result += 'เอ็ด';
      } else if (pos === 1 && digit === 1) {
        result += 'สิบ';
      } else if (pos === 1 && digit === 2) {
        result += 'ยี่สิบ';
      } else {
        result += THAI_NUMBERS[digit] + THAI_UNITS[pos];
      }
    }
  }

  return result;
}

export function bahtText(amount: number): string {
  if (isNaN(amount) || amount === 0) {
    return 'ศูนย์บาทถ้วน';
  }

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const fixed = absAmount.toFixed(2);
  const [bahtPart, satangPart] = fixed.split('.');

  let bahtStr = '';
  const millions = Math.floor(parseInt(bahtPart, 10) / 1000000);
  const remainder = parseInt(bahtPart, 10) % 1000000;

  if (millions > 0) {
    bahtStr += convertUnderMillion(millions.toString()) + 'ล้าน';
  }

  if (remainder > 0 || millions === 0) {
    bahtStr += convertUnderMillion(remainder.toString());
  }

  let satangStr = '';
  const satangVal = parseInt(satangPart, 10);
  if (satangVal > 0) {
    satangStr = convertUnderMillion(satangPart) + 'สตางค์';
  }

  const prefix = isNegative ? 'ลบ' : '';
  const suffix = satangVal === 0 ? 'บาทถ้วน' : 'บาท';

  return `${prefix}${bahtStr}${suffix}${satangStr}`;
}
