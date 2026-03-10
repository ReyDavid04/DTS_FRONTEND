import { Injectable, signal } from '@angular/core';
import { IDowntimeRecord } from '../../../core/domain/interfaces/downtime-record.interface';

@Injectable({ providedIn: 'root' })
export class TrendsState {
  records = signal<IDowntimeRecord[]>([]);
  loading = signal<boolean>(false);
}
