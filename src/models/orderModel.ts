import { User } from "./userModel";
import { OrderItem } from "./orderItemModel";

export enum Status {
  PENDING_REVIEW = 'PENDING_REVIEW',
  REVIEW_APPROVED = 'REVIEW_APPROVED',
  REVIEW_REJECTED = 'REVIEW_REJECTED',
  SURVEY_SCHEDULED = 'SURVEY_SCHEDULED',
  SURVEY_COMPLETED = 'SURVEY_COMPLETED',
  WAITING_FOR_ASSIGNMENT = 'WAITING_FOR_ASSIGNMENT',
  TECHNICIAN_ASSIGNED = 'TECHNICIAN_ASSIGNED',
  INSTALLATION_IN_PROGRESS = 'INSTALLATION_IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export interface Order {
  id: number;
  user?: User;
  userId: number;
  status: Status;
  total: number;
  items?: OrderItem[];
  createdAt: Date;
  updatedAt: Date;
}