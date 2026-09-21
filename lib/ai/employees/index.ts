// 全Employeeのレジストリ。IDから人格情報（表示名・役割）を引けるようにする。
// UI（オフィス表示・会議画面）やWorkflowから、DBに保存されたemployeeIdを
// 人間が読める表示情報に変換する際に使う。

import type { Employee } from '@/lib/ai/core/employee';

import { socialResearcherEmployee } from './social-researcher';
import { socialPlannerEmployee } from './social-planner';
import { socialWriterEmployee } from './social-writer';
import { socialEditorEmployee } from './social-editor';
import { socialAnalystEmployee } from './social-analyst';

import { presidentEmployee } from './president';
import { whyAnalystEmployee } from './why-analyst';
import { decisionMakerEmployee } from './decision-maker';
import { contrarianEmployee } from './contrarian';
import { userAdvocateEmployee } from './user-advocate';
import { exitPlannerEmployee } from './exit-planner';
import { experimentDriverEmployee } from './experiment-driver';
import { managementAuditorEmployee } from './management-auditor';

export const ALL_EMPLOYEES: Employee[] = [
  socialResearcherEmployee,
  socialPlannerEmployee,
  socialWriterEmployee,
  socialEditorEmployee,
  socialAnalystEmployee,

  presidentEmployee,
  whyAnalystEmployee,
  decisionMakerEmployee,
  contrarianEmployee,
  userAdvocateEmployee,
  exitPlannerEmployee,
  experimentDriverEmployee,
  managementAuditorEmployee,
];

export const EMPLOYEES_BY_ID: Record<string, Employee> = Object.fromEntries(
  ALL_EMPLOYEES.map((employee) => [employee.id, employee])
);

export function getEmployeeById(id: string): Employee | null {
  return EMPLOYEES_BY_ID[id] ?? null;
}
