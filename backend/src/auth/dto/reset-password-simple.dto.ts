import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordSimpleDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @MinLength(6)
  newPassword: string;
}
