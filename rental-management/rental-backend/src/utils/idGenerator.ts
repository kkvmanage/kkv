export class IdGenerator {
  static formatId(prefix: string, sequence: number, padLength: number = 4): string {
    return `${prefix}-${String(sequence).padStart(padLength, '0')}`;
  }

  static parseSequence(id: string): number {
    const parts = id.split('-');
    if (parts.length >= 2) {
      const num = parseInt(parts[1], 10);
      return isNaN(num) ? 0 : num;
    }
    return 0;
  }
}
