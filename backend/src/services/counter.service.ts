import fs from 'fs';
import path from 'path';
import { googleDriveRepository } from '../repositories/googleDrive.repository.js';

const FILE_NAME = 'counters.json';

export class CounterService {
  private getCounters(): Record<string, number> {
    return googleDriveRepository.readJson<Record<string, number>>(FILE_NAME, { customerId: 4 });
  }

  public getNextSequence(name: string): number {
    const counters = this.getCounters();
    const nextVal = (counters[name] || 0) + 1;
    counters[name] = nextVal;
    googleDriveRepository.writeJson(FILE_NAME, counters);
    return nextVal;
  }

  public setSequenceIfHigher(name: string, value: number): void {
    const counters = this.getCounters();
    if ((counters[name] || 0) < value) {
      counters[name] = value;
      googleDriveRepository.writeJson(FILE_NAME, counters);
    }
  }
}

export const counterService = new CounterService();
