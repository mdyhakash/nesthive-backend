export interface ICreateManagerPayload {
  name: string;
  email: string;
  password?: string;
}

export interface IUpdateManagerPayload {
  name?: string;
}
