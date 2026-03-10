import { inject, Injectable } from '@angular/core';
import { HttpService } from '../../../core/application/services/http';
import { environment } from '../../../../environments/environment';
import { finalize } from 'rxjs';
import { AlertService } from '../../../shared';
import { HomeState } from '../state/home-state';
import { DowntimeRequestService } from '../../downtime-register/services/downtime-request.service';
import { IDowntimeResponse } from '../../../core/domain/interfaces/downtime-record.interface';

@Injectable({ providedIn: 'root' })
export class HomeRequestService {
  private readonly http = inject(HttpService);
  private readonly alert = inject(AlertService);
  private readonly homeState = inject(HomeState);
  private readonly downtimeReq = inject(DowntimeRequestService);
  private readonly dtsURL = environment.dtsURL;

  private getWeekNumber(date: Date = new Date()): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  }

  loadAll(): void {
    const week = this.getWeekNumber();
    this.homeState.loading.set(true);
    this.http
      .get(`${this.dtsURL}/v1/down-time?week=${week}&limit=500`)
      .pipe(finalize(() => this.homeState.loading.set(false)))
      .subscribe({
        next: (res: any) => {
          const r = res as IDowntimeResponse;
          this.homeState.records.set(r.data ?? []);
        },
        error: () => this.alert.error('Error al cargar datos del dashboard'),
      });
    this.downtimeReq.getDepartments(false);
    this.downtimeReq.getLines(false);
  }
}
