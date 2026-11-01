// 创始人交给沙盘的立项草案
export interface FounderInput {
  projectName: string;
  oneLiner: string;
  targetUser: string;
  solution: string;
  businessModel: string;
  excerpt: string;
}

// 六个固定席位
export type RoleId =
  | "orchestrator"
  | "investor"
  | "target_user"
  | "competitor"
  | "finance"
  | "synthesis";

// 契约被破坏时抛出，code 只读
export class ContractError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ContractError";
    this.code = code;
  }
}
