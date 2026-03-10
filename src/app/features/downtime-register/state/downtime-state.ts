import { Injectable, signal } from '@angular/core';
import { IDepartment } from '../interfaces/department.interface';
import { ILine } from '../interfaces/line.interface';
import { IShift } from '../interfaces/shift.interface';

@Injectable({
  providedIn: 'root'
})
export class DowntimeState {

  departments = signal<IDepartment[]>([]);
  loadingDepartments = signal<boolean>(false);

  lines = signal<ILine[]>([]);
  loadingLines = signal<boolean>(false);

  shifts = signal<IShift[]>([]);
  loadingShifts = signal<boolean>(false);

  loadingSave = signal<boolean>(false);

}
