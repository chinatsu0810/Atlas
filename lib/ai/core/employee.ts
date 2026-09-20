// 「誰が仕事をするか」を定義するEmployee層。
//
// Employeeが持つのは名前・役割・口調・目的・禁止事項のみで、分析ロジックや
// 具体的な処理ロジックは持たせない。「何ができるか」は Skill（./skill.ts）が、
// 「どの順で動くか」は Workflow（各チームのactions.ts等）が担う。

export type Employee = {
  id: string;
  name: string;
  role: string;
  tone: string;
  purpose: string;
  prohibitions: string[];
};

// EmployeeをAIへのシステムプロンプトの「人格部分」として文章化する。
// Skill側は、この人格説明に続けて具体的な作業指示（buildTaskInstructions）を追加する。
export function buildEmployeePersona(employee: Employee): string {
  return `あなたは${employee.name}、Atlasの「${employee.role}」です。

# 目的
${employee.purpose}

# 口調
${employee.tone}

# 禁止事項
${employee.prohibitions.map((item) => `- ${item}`).join('\n')}`;
}
