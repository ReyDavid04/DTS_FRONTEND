import { inject, Injectable } from '@angular/core';
import { HttpService } from '../../../core/application/services/http';
import { environment } from '../../../../environments/environment';
import { finalize } from 'rxjs';
import { AlertService } from '../../../shared';
import { HistorialState } from '../state/historial-state';
import { IDowntimeResponse } from '../../../core/domain/interfaces/downtime-record.interface';

export interface IHistorialFilters {
  page?: number;
  limit?: number;
  week?: number;
  line?: string;
  shift?: string;
  stage?: string;
}

@Injectable({
  providedIn: 'root',
})
export class HistorialRequestService {
  private readonly http = inject(HttpService);
  private readonly alert = inject(AlertService);
  private readonly historialState = inject(HistorialState);

  private readonly dtsURL = environment.dtsURL;

  getRecords(filters: IHistorialFilters = {}): void {
    this.historialState.loading.set(true);

    const params = new URLSearchParams();
    if (filters.page !== undefined) params.set('page', filters.page.toString());
    if (filters.limit !== undefined) params.set('limit', filters.limit.toString());
    if (filters.week) params.set('week', filters.week.toString());
    if (filters.line) params.set('line', filters.line);
    if (filters.shift) params.set('shift', filters.shift);
    if (filters.stage) params.set('stage', filters.stage);

    const query = params.toString();
    const url = `${this.dtsURL}/v1/down-time${query ? '?' + query : ''}`;

    this.http
      .get<IDowntimeResponse>(url)
      .pipe(finalize(() => this.historialState.loading.set(false)))
      .subscribe({
        next: (res) => {
          this.historialState.records.set(res.data);
          this.historialState.total.set(res.total);
        },
        error: () => this.alert.error('Error al obtener el historial de registros'),
      });
  }
}
