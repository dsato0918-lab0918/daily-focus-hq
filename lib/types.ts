export type DomainKey = string;

export type ProjectStatus = "g" | "a" | "r";

export interface Domain {
  id: DomainKey;
  label: string;
  icon: string;
  bgColor: string;
  textColor: string;
}

export interface Project {
  id: string;
  domain: DomainKey;
  name: string;
  status: ProjectStatus;
  archived?: boolean;
}

export interface Task {
  id: string;
  projId: string;
  title: string;
  due: string;
  urgent: boolean;
  done: boolean;
  memo: string;
  staffRequested?: boolean;
  vendorRequested?: boolean;
}

export type View = "list" | "focus";
