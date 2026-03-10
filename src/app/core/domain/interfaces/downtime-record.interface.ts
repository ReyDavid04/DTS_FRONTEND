export interface IDowntimeClassification {
  downTimeGenerated: number;
  department: string;
  reason: string;
}

export interface IDowntimeRecord {
  _id: string;
  startTime: string;
  endTime: string;
  week: number;
  shift: string;
  line: string;
  stage: string;
  supervisor: string;
  registeredBy: string;
  standardOutput: number;
  currentOutput: number;
  efficiency: number;
  downTimeGenerated: number;
  downTimeUnreported: number;
  downTimeReported: number;
  classification: IDowntimeClassification[];
  createdAt: string;
  updatedAt: string;
}

export interface IDowntimeResponse {
  data: IDowntimeRecord[];
  total: number;
}
