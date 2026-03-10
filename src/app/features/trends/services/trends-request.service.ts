import { inject, Injectable } from '@angular/core';
import { HttpService } from '../../../core/application/services/http';
import { environment } from '../../../../environments/environment';
import { finalize } from 'rxjs';
import { AlertService } from '../../../shared';
import { TrendsState } from '../state/trends-state';
import { DowntimeRequestService } from '../../downtime-register/services/downtime-request.service';
import { IDowntimeResponse } from '../../../core/domain/interfaces/downtime-record.interface';

@Injectable({ providedIn: 'root' })
export class TrendsRequestService {
  private readonly http        = inject(HttpService);
  private readonly alert       = inject(AlertService);
  private readonly trendsState = inject(TrendsState);
  private readonly downtimeReq = inject(DowntimeRequestService);
  private readonly dtsURL      = environment.dtsURL;

  loadAll(): void {
    this.trendsState.loading.set(true);
    this.http
      .get(`${this.dtsURL}/v1/down-time?limit=2000`)
      .pipe(finalize(() => this.trendsState.loading.set(false)))
      .subscribe({
        next: (res: any) => {
          const r = res as IDowntimeResponse;
          this.trendsState.records.set(r.data ?? []);
        },
        error: () => this.alert.error('Error al cargar datos de tendencias'),
      });
    this.downtimeReq.getDepartments(false);
    this.downtimeReq.getLines(false);
  }
}
