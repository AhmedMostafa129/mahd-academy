export interface InstructorDto {
  instructorId: string;
  userId: string;
  fullName: string;
  email: string;
  photoUrl?: string | null;
  bio?: string | null;
  city?: string | null;
  country?: string | null;
  birthDate?: string | null;
  coursesCount: number;
  averageRating: number;
}

export interface InstructorApiResponse {
  data: {
    user: {
      userId: string;
      fullName: string;
      email: string;
      photoUrl?: string;
      role: string;
      [key: string]: any;
    };
    instructor?: {
      bio?: string;
      coursesCount: number;
      averageRating: number;
      [key: string]: any;
    };
    [key: string]: any;
  }[];
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}
