import { Injectable, signal } from '@angular/core';
import { IDowntimeRecord } from '../../../core/domain/interfaces/downtime-record.interface';

@Injectable({
  providedIn: 'root',
})
export class HistorialState {
  records = signal<IDowntimeRecord[]>([]);
  total = signal<number>(0);
  loading = signal<boolean>(false);

  // Active filters
  filterWeek = signal<number | null>(null);
  filterLine = signal<string | null>(null);
  filterShift = signal<string | null>(null);
}
