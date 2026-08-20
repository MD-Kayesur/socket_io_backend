import { IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class GoogleAuthDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsOptional()
  avatar?: string;

  @IsString()
  @IsOptional()
  googleUid?: string;
}
