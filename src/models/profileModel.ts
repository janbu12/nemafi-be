import { User } from "./userModel";

export interface Profile {
  id: number;
  user_id: number;
  user?: User;
  phone_number: string;
  image_url?: string | null;
  full_address: string;
  province: string;
  city: string;
  district: string;
  subdistrict: string;
}