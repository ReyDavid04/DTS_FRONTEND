import { inject, Injectable } from '@angular/core';
import { HttpService } from '../../../core/application/services/http';
import { environment } from '../../../../environments/environment';
import { finalize } from 'rxjs';
import { AlertService } from '../../../shared';
import { DowntimeState } from '../state/downtime-state';
import { IDepartment } from '../interfaces/department.interface';
import { ILine } from '../interfaces/line.interface';
import { IShift } from '../interfaces/shift.interface';
import { IDowntimeRecord } from '../../../core/domain/interfaces/downtime-record.interface';

export interface ICreateDowntimeDto {
  startTime: Date;
  endTime: Date;
  week?: number;
  shift?: string;
  line?: string;
  stage?: string;
  supervisor?: string;
  registeredBy?: string;
  standardOutput?: number;
  currentOutput?: number;
  efficiency?: number;
  downTimeGenerated?: number;
  downTimeUnreported?: number;
  downTimeReported?: number;
  classification?: { downTimeGenerated: number; department: string; reason: string }[];
}

@Injectable({
  providedIn: 'root',
})
export class DowntimeRequestService {
  private readonly http = inject(HttpService);
  private readonly alert = inject(AlertService);
  private downtimeState = inject(DowntimeState);

  private readonly dtsURL = environment.dtsURL;
  private readonly userURL = environment.userURL;

  async getDepartments(loading = true) {
    if (loading) this.downtimeState.loadingDepartments.set(true);
    this.http
      .get<IDepartment[]>(`${this.dtsURL}/v1/department`)
      .pipe(
        finalize(() => {
          if (loading) this.downtimeState.loadingDepartments.set(false);
        }),
      )
      .subscribe({
        next: (res) => {
          console.log('[getDepartments] res:', res);
          this.downtimeState.departments.set(res);
        },
        error: () => this.alert.error('Error al obtener los departamentos'),
      });
  }

  async getLines(loading = true) {
    if (loading) this.downtimeState.loadingLines.set(true);
    this.http
      .get<ILine[]>(`${this.dtsURL}/v1/line`)
      .pipe(
        finalize(() => {
          if (loading) this.downtimeState.loadingLines.set(false);
        }),
      )
      .subscribe({
        next: (res) => {
          console.log('[getLines] res:', res);
          this.downtimeState.lines.set(res);
        },
        error: () => this.alert.error('Error al obtener las líneas'),
      });
  }

  async getShift(loading = true) {
    if (loading) {
      this.downtimeState.loadingShifts.set(true);
    }
    this.http
      .get<IShift[]>(`${this.userURL}/v1/shifts`)
      .pipe(
        finalize(() => {
          if (loading) {
            this.downtimeState.loadingShifts.set(false);
          }
        }),
      )
      .subscribe({
        next: (res) => {
          console.log('[getShift] res:', res);
          this.downtimeState.shifts.set(res);
        },
        error: (err) => {
          this.alert.error('Error al obtener los turnos');
        },
      });
  }

  createDowntime(dto: ICreateDowntimeDto): Promise<boolean> {
    this.downtimeState.loadingSave.set(true);
    return new Promise((resolve) => {
      this.http
        .post<IDowntimeRecord>(`${this.dtsURL}/v1/down-time`, dto)
        .pipe(finalize(() => this.downtimeState.loadingSave.set(false)))
        .subscribe({
          next: () => resolve(true),
          // HttpErrorHandlerService already shows an alert dialog before rethrowing;
          // resolve(false) so the component knows it failed without a second dialog.
          error: () => resolve(false),
        });
    });
  }

}
