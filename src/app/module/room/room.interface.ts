import { RoomType } from "../../../generated/prisma/enums";

export interface ICreateRoom {
  roomNumber: string;
  roomType: RoomType;
  rentAmount: number;
  capacity: number;
  availableFrom?: Date;
}

export interface IUpdateRoom {
  roomNumber?: string;
  roomType?: RoomType;
  rentAmount?: number;
  capacity?: number;
  availableFrom?: Date;
}
