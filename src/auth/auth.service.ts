import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import { SignupDto } from "./dto/signup.dto";
import { LoginDto } from "./dto/login.dto";
import { GoogleAuthDto } from "./dto/google-auth.dto";

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async signup(dto: SignupDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException("Email is already registered");
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email.toLowerCase(),
        password: hashedPassword,
        avatar: dto.avatar || null,
      },
    });

    const token = this.generateToken(user.id, user.email);

    const { password, ...result } = user;
    return {
      message: "User registered successfully",
      user: result,
      accessToken: token,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const token = this.generateToken(user.id, user.email);

    const { password, ...result } = user;
    return {
      message: "Logged in successfully",
      user: result,
      accessToken: token,
    };
  }

  async googleLogin(dto: GoogleAuthDto) {
    const userEmail = dto.email.toLowerCase();
    let user = await this.prisma.user.findUnique({
      where: { email: userEmail },
    });

    if (user) {
      if (dto.avatar && !user.avatar) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { avatar: dto.avatar },
        });
      }
    } else {
      const randomPassword = await bcrypt.hash(`google_${Date.now()}_${Math.random()}`, 10);
      user = await this.prisma.user.create({
        data: {
          name: dto.name || "Google User",
          email: userEmail,
          password: randomPassword,
          avatar: dto.avatar || null,
        },
      });
    }

    const token = this.generateToken(user.id, user.email);
    const { password, ...result } = user;

    return {
      message: "Google authentication successful",
      user: result,
      accessToken: token,
    };
  }

  private generateToken(userId: string, email: string): string {
    const payload = { sub: userId, email };
    return this.jwtService.sign(payload);
  }
}
