import { inject, Injectable } from '@angular/core';
import { HttpService } from '../../../core/application/services/http';
import { environment } from '../../../../environments/environment';
import { finalize } from 'rxjs';
import { AlertService } from '../../../shared';
import { ReportsState } from '../state/reports-state';
import { DowntimeRequestService } from '../../downtime-register/services/downtime-request.service';
import { IDowntimeResponse } from '../../../core/domain/interfaces/downtime-record.interface';

@Injectable({ providedIn: 'root' })
export class ReportsRequestService {
  private readonly http         = inject(HttpService);
  private readonly alert        = inject(AlertService);
  private readonly reportsState = inject(ReportsState);
  private readonly downtimeReq  = inject(DowntimeRequestService);
  private readonly dtsURL       = environment.dtsURL;

  loadRecords(params: { line?: string; shift?: string; week?: number; date?: Date } = {}): void {
    const targetDate = params.date ?? new Date();
    const week       = params.week ?? this.getWeekNumber(targetDate);

    const query = new URLSearchParams({ limit: '500' });
    query.set('week', String(week));
    if (params.line  && params.line  !== 'Todas') query.set('line',  params.line);
    if (params.shift && params.shift !== 'Todos') query.set('shift', params.shift);

    this.reportsState.loading.set(true);
    this.http
      .get(`${this.dtsURL}/v1/down-time?${query.toString()}`)
      .pipe(finalize(() => this.reportsState.loading.set(false)))
      .subscribe({
        next: (res: any) => {
          const r = res as IDowntimeResponse;
          this.reportsState.records.set(r.data ?? []);
        },
        error: () => this.alert.error('Error al cargar datos del reporte'),
      });
    this.downtimeReq.getDepartments(false);
    this.downtimeReq.getLines(false);
  }

  /** ISO 8601 week number */
  private getWeekNumber(date: Date): number {
    const d      = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  }
}
