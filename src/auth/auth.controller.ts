import { Body, Controller, Get, Post, Request, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { SignupDto } from "./dto/signup.dto";
import { LoginDto } from "./dto/login.dto";
import { GoogleAuthDto } from "./dto/google-auth.dto";
import { JwtAuthGuard } from "./jwt-auth.guard";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("signup")
  async signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  @Post("login")
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post("google")
  async googleLogin(@Body() dto: GoogleAuthDto) {
    return this.authService.googleLogin(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  getProfile(@Request() req: any) {
    return {
      user: req.user,
    };
  }
}
