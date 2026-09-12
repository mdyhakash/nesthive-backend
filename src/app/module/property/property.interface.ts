import { PropertyType } from "../../../generated/prisma/enums";

export interface ICreateProperty {
  title: string;
  description?: string;
  address: string;
  city: string;
  area: string;
  type: PropertyType;
  amenities?: string[];
}

export interface IUpdateProperty {
  title?: string;
  description?: string;
  address?: string;
  city?: string;
  area?: string;
  type?: PropertyType;
  amenities?: string[];
}

export interface IPropertyFilters {
  searchTerm?: string;
  city?: string;
  area?: string;
  type?: PropertyType;
  minRent?: number;
  maxRent?: number;
}

export interface IPaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
